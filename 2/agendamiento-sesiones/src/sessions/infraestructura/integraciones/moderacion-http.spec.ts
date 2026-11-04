import { ConfigService } from '@nestjs/config';
import { ModeracionHttp } from './moderacion-http';
import type { AvisoModeracion } from '../../aplicacion/contratos/avisos-moderacion';

describe('Contrato HTTP provisional con reportes/moderación', () => {
  const configuracion = {
    REPORTES_MODERACION_URL: 'http://127.0.0.1:3002',
    MODERACION_INTEGRACION_SECRET: 's'.repeat(32),
  };
  const adaptador = new ModeracionHttp(new ConfigService(configuracion));
  const aviso: AvisoModeracion = {
    id_aviso: 9007199254740993n,
    id_sesion: 2n,
    fecha_creacion: new Date('2026-10-13T12:00:00Z'),
    fecha_entrega: null,
    contenido: {
      tipo: 'CONFLICTO_DETECTADO',
      id_sesion: '2',
      id_tutor: '3',
      id_tutee: '4',
      id_materia: '5',
      fecha_conflicto: '2026-10-13T12:00:00Z',
      declaraciones: [],
    },
  };

  afterEach(() => jest.restoreAllMocks());

  it('envía IDs de texto, versión, secreto e idempotencia al endpoint de conflictos', async () => {
    const envio = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    expect(await adaptador.publicar(aviso)).toBe(true);
    expect(String(envio.mock.calls[0][0])).toBe(
      'http://127.0.0.1:3002/integraciones/sesiones/conflictos',
    );
    expect(envio.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      redirect: 'error',
      headers: {
        'X-Integracion-Secret': 's'.repeat(32),
        'Idempotency-Key': 'agendamiento-sesiones:moderacion:9007199254740993',
      },
      signal: expect.any(AbortSignal),
    });
    expect(JSON.parse(String(envio.mock.calls[0][1]?.body))).toEqual({
      origen: 'agendamiento-sesiones',
      version: 1,
      id_aviso: '9007199254740993',
      fecha_aviso: '2026-10-13T12:00:00.000Z',
      ...aviso.contenido,
    });
  });

  it('envía las decisiones administrativas al endpoint de resoluciones', async () => {
    const envio = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    await adaptador.publicar({
      ...aviso,
      contenido: {
        tipo: 'CONFLICTO_RESUELTO',
        id_sesion: '2',
        id_resolucion: '6',
        id_administrador: '7',
        estado_final: 'NO_REALIZADA',
        motivo_resolucion: 'Revisión',
        observaciones: null,
        fecha_resolucion: aviso.fecha_creacion.toISOString(),
      },
    });
    expect(String(envio.mock.calls[0][0])).toBe(
      'http://127.0.0.1:3002/integraciones/sesiones/resoluciones',
    );
    expect(JSON.parse(String(envio.mock.calls[0][1]?.body))).toMatchObject({
      id_resolucion: '6',
      id_administrador: '7',
      estado_final: 'NO_REALIZADA',
    });
  });

  it.each([400, 401, 404, 409, 503])(
    'no confirma un aviso rechazado con HTTP %s',
    async (estado) => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(null, { status: estado }));
      expect(await adaptador.publicar(aviso)).toBe(false);
    },
  );

  it('conserva pendiente un aviso cuando falla la conexión o vence el tiempo', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new DOMException('Tiempo agotado', 'TimeoutError'));
    expect(await adaptador.publicar(aviso)).toBe(false);
  });

  it.each([
    { REPORTES_MODERACION_URL: undefined },
    { REPORTES_MODERACION_URL: 'ftp://localhost' },
    { REPORTES_MODERACION_URL: 'http://usuario:clave@localhost' },
    { MODERACION_INTEGRACION_SECRET: 'corto' },
  ])('no envía con configuración inválida %j', async (invalida) => {
    const envio = jest.spyOn(global, 'fetch');
    const adaptadorInvalido = new ModeracionHttp(
      new ConfigService({ ...configuracion, ...invalida }),
    );
    expect(adaptadorInvalido.estaConfigurado()).toBe(false);
    expect(await adaptadorInvalido.publicar(aviso)).toBe(false);
    expect(envio).not.toHaveBeenCalled();
  });
});
