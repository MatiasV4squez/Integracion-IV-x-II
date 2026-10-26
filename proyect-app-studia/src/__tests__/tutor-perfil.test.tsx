import { render, screen, userEvent } from '@testing-library/react-native';

import * as tutoriasApi from '@/api/tutorias';
import TutorPerfilScreen from '@/screens/tutor-perfil-screen';

import { mockRouter, Providers } from './test-utils';

afterEach(() => jest.restoreAllMocks());

describe('Detalle de una tutoría (perfil del tutor)', () => {
  it('carga el detalle y lleva a solicitar con el tutor y la materia', async () => {
    const user = userEvent.setup();
    await render(<TutorPerfilScreen tutorId="t1" subjectCode="MAT1010" />, { wrapper: Providers });

    expect(await screen.findByText('Camila Rojas')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Ver horarios disponibles' }));
    expect(mockRouter.navigate).toHaveBeenCalledWith({ pathname: '/buscar', params: { tutor: 't1', subject: 'MAT1010' } });
  });

  it('muestra "no encontrado" para un tutor inexistente', async () => {
    await render(<TutorPerfilScreen tutorId="no-existe" />, { wrapper: Providers });
    expect(await screen.findByText('No encontramos a este tutor')).toBeOnTheScreen();
  });

  it('muestra error con reintento si falla la red', async () => {
    const user = userEvent.setup();
    jest.spyOn(tutoriasApi, 'fetchTutor').mockRejectedValueOnce(new Error('Sin conexión'));
    await render(<TutorPerfilScreen tutorId="t4" />, { wrapper: Providers });

    expect(await screen.findByText('Sin conexión')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ignacio Vera')).toBeOnTheScreen();
  });
});
