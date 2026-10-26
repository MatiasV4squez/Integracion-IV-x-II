import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import * as tutoriasApi from '@/api/tutorias';
import TutoriasDisponiblesScreen from '@/screens/tutorias-disponibles-screen';

import { mockRouter, Providers } from './test-utils';

afterEach(() => jest.restoreAllMocks());

describe('Listado de tutorías (Buscar)', () => {
  it('muestra carga y luego los tutores de la materia elegida', async () => {
    const user = userEvent.setup();
    await render(<TutoriasDisponiblesScreen />, { wrapper: Providers });

    await user.press(screen.getByText('Física General'));

    expect(await screen.findByText('Diego Soto')).toBeOnTheScreen();
    expect(screen.getByText('Sofía Araya')).toBeOnTheScreen();
    expect(screen.getByText('Martín Lagos')).toBeOnTheScreen();
    expect(screen.queryByText('Buscando tutores…')).not.toBeOnTheScreen();
  });

  it('solicita (reserva) un horario y permite abrir el detalle', async () => {
    const user = userEvent.setup();
    await render(<TutoriasDisponiblesScreen initialSubject="QUI1001" />, { wrapper: Providers });

    await screen.findByText('Sofía Araya');
    const reservedBefore = screen.queryAllByText('Ya reservado').length;
    await user.press(screen.getAllByRole('button', { name: 'Reservar' })[0]);

    expect(await screen.findByText('Reservado con Sofía Araya. Quedó en estado Pendiente.')).toBeOnTheScreen();
    expect(screen.getAllByText('Ya reservado')).toHaveLength(reservedBefore + 1);

    await user.press(screen.getByRole('button', { name: 'Ver detalle' }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/detalle-sesion', params: { id: expect.any(String) } });
  });

  it('muestra error con reintento si falla la carga', async () => {
    const user = userEvent.setup();
    const spy = jest.spyOn(tutoriasApi, 'fetchTutores').mockRejectedValueOnce(new Error('Servidor caído'));
    await render(<TutoriasDisponiblesScreen initialSubject="MAT1010" />, { wrapper: Providers });

    expect(await screen.findByText('Servidor caído')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Camila Rojas')).toBeOnTheScreen();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('muestra el estado vacío cuando nadie enseña la materia', async () => {
    jest.spyOn(tutoriasApi, 'fetchTutores').mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0, hasMore: false });
    await render(<TutoriasDisponiblesScreen initialSubject="INFO1140" />, { wrapper: Providers });

    expect(await screen.findByText('Sin tutores por ahora')).toBeOnTheScreen();
  });

  it('pagina con "Ver más tutores" y recarga con pull-to-refresh', async () => {
    const user = userEvent.setup();
    const original = tutoriasApi.fetchTutores;
    const spy = jest
      .spyOn(tutoriasApi, 'fetchTutores')
      .mockImplementation((params, signal) => original({ ...params, pageSize: 1 }, signal));
    await render(<TutoriasDisponiblesScreen initialSubject="EST1010" />, { wrapper: Providers });

    expect(await screen.findByText('Ignacio Vera')).toBeOnTheScreen();
    expect(screen.queryByText('Sofía Araya')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Ver más tutores' }));
    expect(await screen.findByText('Sofía Araya')).toBeOnTheScreen();
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), undefined);

    await fireEvent(screen.getByText('Tutorías disponibles'), 'refresh');
    expect(await screen.findByText('Ignacio Vera')).toBeOnTheScreen();
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.anything());
  });
});
