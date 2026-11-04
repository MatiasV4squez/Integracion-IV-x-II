import type { Postulacion } from '../dominio/postulacion.js';
import { PostulacionesError } from '../dominio/postulacion.js';
import { PostularTutorUseCase } from './postular-tutor.use-case.js';
import { AprobarPostulacionUseCase } from './aprobar-postulacion.use-case.js';
import { ReintentarAsignacionRolUseCase } from './reintentar-asignacion-rol.use-case.js';
import { RechazarPostulacionUseCase } from './rechazar-postulacion.use-case.js';
import { ObtenerCertificadoUseCase } from './obtener-certificado.use-case.js';
import { ConsultarPostulacionesPropiasUseCase } from './consultar-postulaciones-propias.use-case.js';
import { ListarPostulacionesPendientesUseCase } from './listar-postulaciones-pendientes.use-case.js';

const postulacion: Postulacion = {
  idPostulacion: 1n, idUsuario: 10n, idMateria: 2n, idAdministradorRevision: null,
  certificadoRef: 'archivo.pdf', certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf',
  notaAcreditada: null, estado: 'PENDIENTE', fechaPostulacion: new Date(), fechaRevision: null, motivoRechazo: null,
};
const archivo = { nombre: 'notas.pdf', tipoDeclarado: 'application/pdf', tamano: 9, contenido: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 10]) };

function escenario() {
  const repo = {
    existeMateria: vi.fn().mockResolvedValue(true), existeActiva: vi.fn().mockResolvedValue(false),
    crear: vi.fn().mockResolvedValue(postulacion), listarPendientes: vi.fn().mockResolvedValue([postulacion]),
    consultarPropias: vi.fn().mockResolvedValue([postulacion]), obtener: vi.fn().mockResolvedValue(postulacion),
    prepararAprobacion: vi.fn().mockResolvedValue({ ...postulacion, estado: 'PENDIENTE_ROL' }),
    rechazarPendiente: vi.fn().mockResolvedValue({ ...postulacion, estado: 'RECHAZADA' }),
    habilitar: vi.fn().mockResolvedValue({ ...postulacion, estado: 'APROBADA' }),
  };
  const certificados = { guardar: vi.fn().mockResolvedValue('archivo.pdf'), leer: vi.fn().mockResolvedValue(archivo.contenido) };
  const roles = { asignar: vi.fn().mockResolvedValue(undefined) };
  return { repo, certificados, roles };
}

describe('Casos de uso de postulaciones mediante puertos', () => {
  it('valida el certificado antes de consultar o guardar', async () => {
    const { repo, certificados } = escenario();
    await expect(new PostularTutorUseCase(repo, certificados).ejecutar(10n, 2n, undefined)).rejects.toMatchObject({ codigo: 'ENTRADA_INVALIDA' });
    expect(repo.existeMateria).not.toHaveBeenCalled();
    expect(certificados.guardar).not.toHaveBeenCalled();
  });

  it('rechaza una materia inexistente o una postulación activa sin escribir archivos', async () => {
    for (const existe of [false, true]) {
      const { repo, certificados } = escenario();
      repo.existeMateria.mockResolvedValue(existe);
      repo.existeActiva.mockResolvedValue(true);
      await expect(new PostularTutorUseCase(repo, certificados).ejecutar(10n, 2n, archivo)).rejects.toMatchObject({ codigo: existe ? 'CONFLICTO' : 'NO_ENCONTRADO' });
      expect(certificados.guardar).not.toHaveBeenCalled();
      expect(repo.crear).not.toHaveBeenCalled();
    }
  });

  it('guarda el certificado validado y persiste su referencia sin depender del transporte', async () => {
    const { repo, certificados } = escenario();
    await expect(new PostularTutorUseCase(repo, certificados).ejecutar(10n, 2n, archivo)).resolves.toEqual(postulacion);
    expect(certificados.guardar).toHaveBeenCalledWith({ nombre: 'notas.pdf', tipo: 'application/pdf', contenido: archivo.contenido });
    expect(repo.crear).toHaveBeenCalledWith({ idUsuario: 10n, idMateria: 2n, certificadoRef: 'archivo.pdf', certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf' });
  });

  it('propaga los fallos de almacenamiento sin crear una postulación', async () => {
    const { repo, certificados } = escenario();
    certificados.guardar.mockRejectedValue(new Error('disco no disponible'));
    await expect(new PostularTutorUseCase(repo, certificados).ejecutar(10n, 2n, archivo)).rejects.toThrow('disco no disponible');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza notas fuera del mínimo, máximo o precisión antes de escribir', async () => {
    const { repo, roles } = escenario();
    for (const nota of [4.9, 7.1, 5.05, NaN, Infinity]) {
      await expect(new AprobarPostulacionUseCase(repo, roles).ejecutar(1n, 99n, nota)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    }
    expect(repo.prepararAprobacion).not.toHaveBeenCalled();
    expect(roles.asignar).not.toHaveBeenCalled();
  });

  it('impide una segunda revisión antes de pedir el rol', async () => {
    const { repo, roles } = escenario();
    repo.prepararAprobacion.mockResolvedValue(null);
    await expect(new AprobarPostulacionUseCase(repo, roles).ejecutar(1n, 99n, 5)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect(roles.asignar).not.toHaveBeenCalled();
    expect(repo.habilitar).not.toHaveBeenCalled();
  });

  it('no habilita al tutor si la asignación remota falla', async () => {
    const { repo, roles } = escenario();
    roles.asignar.mockRejectedValue(new PostulacionesError('NO_DISPONIBLE', 'Auth no disponible'));
    await expect(new AprobarPostulacionUseCase(repo, roles).ejecutar(1n, 99n, 5)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
    expect(repo.prepararAprobacion).toHaveBeenCalledWith(1n, 99n, 5, expect.any(Date));
    expect(repo.habilitar).not.toHaveBeenCalled();
  });

  it('habilita únicamente después de confirmar el rol remoto', async () => {
    const { repo, roles } = escenario();
    let confirmar!: () => void;
    roles.asignar.mockImplementation(() => new Promise<void>((resolve) => { confirmar = resolve; }));
    const respuesta = new AprobarPostulacionUseCase(repo, roles).ejecutar(1n, 99n, 5);
    await vi.waitFor(() => expect(roles.asignar).toHaveBeenCalledWith(10n));
    expect(repo.habilitar).not.toHaveBeenCalled();
    confirmar();
    await expect(respuesta).resolves.toMatchObject({ estado: 'APROBADA' });
  });

  it('el reintento exige PENDIENTE_ROL y no vuelve a registrar la revisión', async () => {
    const { repo, roles } = escenario();
    const caso = new ReintentarAsignacionRolUseCase(repo, roles);
    for (const estado of [null, postulacion, { ...postulacion, estado: 'APROBADA' }]) {
      repo.obtener.mockResolvedValue(estado);
      await expect(caso.ejecutar(1n)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    }
    expect(roles.asignar).not.toHaveBeenCalled();
    repo.obtener.mockResolvedValue({ ...postulacion, estado: 'PENDIENTE_ROL' });
    await expect(caso.ejecutar(1n)).resolves.toMatchObject({ estado: 'APROBADA' });
    expect(roles.asignar).toHaveBeenCalledWith(10n);
    expect(repo.prepararAprobacion).not.toHaveBeenCalled();
  });

  it('el rechazo conserva administrador y motivo y rechaza estados ya revisados', async () => {
    const { repo } = escenario();
    const caso = new RechazarPostulacionUseCase(repo);
    await expect(caso.ejecutar(1n, 99n, 'No acredita nota')).resolves.toMatchObject({ estado: 'RECHAZADA' });
    expect(repo.rechazarPendiente).toHaveBeenCalledWith(1n, 99n, 'No acredita nota', expect.any(Date));
    repo.rechazarPendiente.mockResolvedValue(null);
    await expect(caso.ejecutar(1n, 99n, 'No acredita nota')).rejects.toMatchObject({ codigo: 'CONFLICTO' });
  });

  it('solo el dueño o el administrador pueden consultar el certificado', async () => {
    const { repo, certificados } = escenario();
    const caso = new ObtenerCertificadoUseCase(repo, certificados);
    await expect(caso.ejecutar(1n, 11n)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
    expect(certificados.leer).not.toHaveBeenCalled();
    for (const usuario of [10n, null]) {
      await expect(caso.ejecutar(1n, usuario)).resolves.toEqual({ contenido: archivo.contenido, tipo: 'application/pdf', nombre: 'notas.pdf' });
    }
    repo.obtener.mockResolvedValue(null);
    await expect(caso.ejecutar(1n, null)).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('delega las consultas con la identidad recibida y conserva los resultados', async () => {
    const { repo } = escenario();
    await expect(new ConsultarPostulacionesPropiasUseCase(repo).ejecutar(10n)).resolves.toEqual([postulacion]);
    expect(repo.consultarPropias).toHaveBeenCalledWith(10n);
    await expect(new ListarPostulacionesPendientesUseCase(repo).ejecutar()).resolves.toEqual([postulacion]);
  });
});
