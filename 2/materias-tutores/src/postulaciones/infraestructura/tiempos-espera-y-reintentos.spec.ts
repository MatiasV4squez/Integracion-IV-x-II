import { ConfigService } from '@nestjs/config';
import type { Postulacion } from '../dominio/postulacion.js';
import type { PostulacionesRepository } from '../aplicacion/puertos/postulaciones.repository.js';
import { AprobarPostulacionUseCase } from '../aplicacion/aprobar-postulacion.use-case.js';
import { ReintentarAsignacionRolUseCase } from '../aplicacion/reintentar-asignacion-rol.use-case.js';
import { HttpAsignarRolTutorAdapter } from './http-asignar-rol-tutor.adapter.js';

const pendiente: Postulacion = {
  idPostulacion: 1n, idUsuario: 10n, idMateria: 2n, idAdministradorRevision: null,
  certificadoRef: 'archivo.pdf', certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf',
  notaAcreditada: null, estado: 'PENDIENTE', fechaPostulacion: new Date(), fechaRevision: null, motivoRechazo: null,
};

// Repositorio en memoria para conservar el estado entre la aprobación y los reintentos.
function escenario() {
  let actual: Postulacion = { ...pendiente };
  const repo = {
    prepararAprobacion: vi.fn(async (_id: bigint, idAdministrador: bigint, nota: number) => {
      if (actual.estado !== 'PENDIENTE') return null;
      actual = { ...actual, estado: 'PENDIENTE_ROL', idAdministradorRevision: idAdministrador, notaAcreditada: nota };
      return actual;
    }),
    obtener: vi.fn(async () => actual),
    habilitar: vi.fn(async () => (actual = { ...actual, estado: 'APROBADA' })),
  };
  const config = new ConfigService({
    USUARIOS_AUTH_ASIGNAR_TUTOR_URL: 'http://localhost:3002/internal/usuarios/roles', INTEGRACION_SECRET: 'secreto-de-prueba',
  });
  const roles = new HttpAsignarRolTutorAdapter(config);
  const postulaciones = repo as unknown as PostulacionesRepository;
  return {
    repo, estado: () => actual.estado,
    aprobar: new AprobarPostulacionUseCase(postulaciones, roles),
    reintentar: new ReintentarAsignacionRolUseCase(postulaciones, roles),
  };
}

// Simula usuarios-auth sin responder: la petición solo termina cuando vence el timeout.
const fetchSinRespuesta = vi.fn((_url: string, opciones: RequestInit) => new Promise((_resolve, reject) => {
  opciones.signal?.addEventListener('abort', () => reject(opciones.signal?.reason));
}));

describe('Tiempos de espera, compensación y reintentos entre materias-tutores y usuarios-auth', () => {
  beforeEach(() => {
    const timeoutOriginal = AbortSignal.timeout.bind(AbortSignal);
    // Se acorta el timeout real de 5 s para que la prueba sea rápida.
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => timeoutOriginal(10));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); fetchSinRespuesta.mockClear(); });

  it('ante un timeout responde con un error controlado y deja la postulación en PENDIENTE_ROL', async () => {
    const { aprobar, repo, estado } = escenario();
    vi.stubGlobal('fetch', fetchSinRespuesta);

    await expect(aprobar.ejecutar(1n, 99n, 6)).rejects.toMatchObject({
      codigo: 'NO_DISPONIBLE', message: 'No se pudo asignar el rol TUTOR; la postulación queda pendiente de reintento',
    });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(5000);
    expect(fetchSinRespuesta).toHaveBeenCalledTimes(1);
    expect(repo.habilitar).not.toHaveBeenCalled();
    expect(estado()).toBe('PENDIENTE_ROL');
  });

  it('el reintento completa la aprobación una sola vez y no duplica la revisión ni la asignación del rol', async () => {
    const { aprobar, reintentar, repo, estado } = escenario();
    vi.stubGlobal('fetch', fetchSinRespuesta);
    await expect(aprobar.ejecutar(1n, 99n, 6)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });

    const fetchExitoso = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchExitoso);
    await expect(reintentar.ejecutar(1n)).resolves.toMatchObject({ estado: 'APROBADA', notaAcreditada: 6 });

    // Repetir la aprobación o el reintento ya no vuelve a llamar a usuarios-auth.
    await expect(reintentar.ejecutar(1n)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    await expect(aprobar.ejecutar(1n, 99n, 6)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect(fetchExitoso).toHaveBeenCalledTimes(1);
    expect(repo.habilitar).toHaveBeenCalledTimes(1);
    expect(estado()).toBe('APROBADA');
  });
});
