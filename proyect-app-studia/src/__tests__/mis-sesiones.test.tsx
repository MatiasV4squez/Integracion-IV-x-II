import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import HistorialScreen from '@/screens/historial-screen';
import HistorialTuteeScreen from '@/screens/historial-tutee-screen';

import { mockRouter, Providers } from './test-utils';

describe('Mis sesiones', () => {
  it('Tutee: lista sus tutorías completadas y abre el detalle', async () => {
    const user = userEvent.setup();
    await render(<HistorialTuteeScreen />, { wrapper: Providers });

    expect(screen.getByText('Física General')).toBeOnTheScreen();
    await user.press(screen.getByText('Física General'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/detalle-sesion', params: { id: 's7' } });
  });

  it('Tutee: pull-to-refresh mantiene la lista', async () => {
    await render(<HistorialTuteeScreen />, { wrapper: Providers });
    await fireEvent(screen.getByText('Tutorías completadas'), 'refresh');
    expect(await screen.findByText('Física General')).toBeOnTheScreen();
  });

  it('Tutor: pagina en el cliente al llegar al final de la lista', async () => {
    await render(<HistorialScreen />, { wrapper: Providers });

    expect(screen.getByText('14 sesiones')).toBeOnTheScreen();
    // Página 1 = 10 sesiones; la más antigua (Límites y continuidad, 4 sep) aún no se renderiza.
    expect(screen.queryByText('Inasistencia')).not.toBeOnTheScreen();

    // La FlatList necesita medir su contenedor y su contenido para calcular el final de la lista.
    let list = screen.getByText('Mis tutorías');
    while (!list.props.onContentSizeChange && list.parent) list = list.parent;
    await fireEvent(list, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } } });
    await fireEvent(list, 'contentSizeChange', 400, 2000);
    await fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { x: 0, y: 1900 },
        contentSize: { width: 400, height: 2000 },
        layoutMeasurement: { width: 400, height: 800 },
      },
    });
    expect(await screen.findByText('Inasistencia')).toBeOnTheScreen();
  });

  it('Tutor: sin resultados ofrece limpiar los filtros', async () => {
    const user = userEvent.setup();
    await render(<HistorialScreen />, { wrapper: Providers });

    await user.type(screen.getByPlaceholderText('🔍  Buscar materia, persona o unidad'), 'zzz');
    expect(screen.getByText('No hay sesiones con estos filtros')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('14 sesiones')).toBeOnTheScreen();
  });
});
