import { ConfigService } from '@nestjs/config';
import { DisponibilidadTutoresHttp } from './disponibilidad-tutores-http';

describe('Contrato HTTP de disponibilidad de materias-tutores', () => {
  const configuracion = new ConfigService({
    MATERIAS_TUTORES_URL: 'http://127.0.0.1:3001',
    INTEGRACION_SECRET: 's'.repeat(32),
  });
  const adaptador = new DisponibilidadTutoresHttp(configuracion);
  const tutor = {
    idTutor: '2',
    horariosDisponibles: [
      {
        idBloque: '5',
        dia: '2027-07-15',
        horaInicio: '10:00',
        horaFin: '11:00',
      },
    ],
  };

  afterEach(() => jest.restoreAllMocks());

  it('encuentra un tutor fuera de la primera página', async () => {
    const consulta = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        Response.json({ items: [], page: 1, totalPages: 2 }),
      )
      .mockResolvedValueOnce(
        Response.json({ items: [tutor], page: 2, totalPages: 2 }),
      );
    const bloque = await adaptador.consultarBloque(2n, 4n, 5n);
    expect(bloque.inicio.toISOString()).toBe('2027-07-15T14:00:00.000Z');
    expect(String(consulta.mock.calls[1][0])).toBe(
      'http://127.0.0.1:3001/tutores?materiaId=4&page=2&limit=100',
    );
    expect(consulta.mock.calls[0][1]?.signal).toBe(
      consulta.mock.calls[1][1]?.signal,
    );
  });

  it('mantiene compatibilidad con el listado anterior sin paginación', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(Response.json([tutor]));
    expect(await adaptador.consultarBloque(2n, 4n, 5n)).toMatchObject({
      id_tutor: 2n,
      id_bloque: 5n,
    });
  });

  it('envía el contrato de reserva y liberación con el secreto interno', async () => {
    const envio = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(Response.json({}));
    await adaptador.reservar(5n);
    await adaptador.liberar(5n);
    expect(String(envio.mock.calls[0][0])).toBe(
      'http://127.0.0.1:3001/integraciones/bloques/5/estado',
    );
    expect(envio.mock.calls[0][1]).toMatchObject({
      method: 'PATCH',
      headers: { 'X-Integracion-Secret': 's'.repeat(32) },
      body: JSON.stringify({ estado: 'RESERVADO' }),
      redirect: 'error',
    });
    expect(envio.mock.calls[1][1]?.body).toBe(
      JSON.stringify({ estado: 'DISPONIBLE' }),
    );
  });

  it.each([401, 500])(
    'convierte el HTTP %s del proveedor en un error de dependencia',
    async (estado) => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(null, { status: estado }));
      await expect(adaptador.reservar(5n)).rejects.toMatchObject({
        motivo: 'DEPENDENCIA_NO_DISPONIBLE',
      });
    },
  );

  it.each([
    [404, 'NO_ENCONTRADA'],
    [409, 'CONFLICTO'],
  ])(
    'conserva la semántica del HTTP %s al reservar',
    async (estado, motivo) => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(null, { status: Number(estado) }));
      await expect(adaptador.reservar(5n)).rejects.toMatchObject({ motivo });
    },
  );

  it('convierte un timeout en un error controlado', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new DOMException('Timeout', 'TimeoutError'));
    await expect(adaptador.consultarBloque(2n, 4n, 5n)).rejects.toMatchObject({
      motivo: 'DEPENDENCIA_NO_DISPONIBLE',
    });
  });

  it('rechaza una respuesta con formato incompatible', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(Response.json({ items: 'incorrecto' }));
    await expect(adaptador.consultarBloque(2n, 4n, 5n)).rejects.toMatchObject({
      motivo: 'DEPENDENCIA_NO_DISPONIBLE',
    });
  });
});
