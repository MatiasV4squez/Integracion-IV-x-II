import { ConfigService } from '@nestjs/config';
import type { Calificacion } from '../../dominio/entidades/calificacion';
import { ReputacionHttp } from './reputacion-http';

describe('Comunicación HTTP de reputación', () => {
  const secreto = 's'.repeat(32);

  const adaptador = new ReputacionHttp(
    new ConfigService({
      MATERIAS_TUTORES_URL: 'http://materias.test:3002',
      INTEGRACION_SECRET: secreto,
    }),
  );

  const calificacion: Calificacion = {
    id_calificacion: 9007199254740993n,
    id_sesion: 1n,
    id_evaluador: 1n,
    id_evaluado: 2n,
    puntuacion: 5,
    fecha_calificacion: new Date('2026-10-27T12:00:00Z'),
  };

  afterEach(() => jest.restoreAllMocks());

  it('envía la calificación al tutor correcto y confirma una respuesta exitosa', async () => {
    const envio = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }));

    const resultado = await adaptador.publicar(calificacion);

    expect(envio).toHaveBeenCalledTimes(1);

    const [url, opciones] = envio.mock.calls[0]!;

    expect(String(url)).toBe(
      'http://materias.test:3002/integraciones/tutores/2/calificaciones',
    );

    expect(opciones).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Integracion-Secret': secreto,
      },
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });

    expect(JSON.parse(String(opciones?.body))).toEqual({
      idCalificacion: '9007199254740993',
      puntuacion: 5,
      rolEvaluado: 'TUTOR',
    });

    expect(resultado).toBe(true);
  });

  it.each([400, 401, 500, 503])(
    'devuelve false si Materias responde HTTP %s',
    async (estado) => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(null, { status: estado }));

      expect(await adaptador.publicar(calificacion)).toBe(false);
    },
  );

  it('devuelve false cuando falla la conexión', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new TypeError('Conexión fallida'));

    expect(await adaptador.publicar(calificacion)).toBe(false);
  });

  it('devuelve false cuando la petición vence por tiempo', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(
        new DOMException('Tiempo agotado', 'TimeoutError'),
      );

    expect(await adaptador.publicar(calificacion)).toBe(false);
  });
});
