import { render, screen, userEvent } from '@testing-library/react-native';

import * as perfilApi from '@/api/perfil';
import TuteeProfileScreen from '@/screens/tutee-profile-screen';
import TutorProfileScreen from '@/screens/tutor-profile';

import { Providers } from './test-utils';

afterEach(() => jest.restoreAllMocks());

describe('Perfil', () => {
  it('Tutee: carga sus datos y sus estadísticas como Tutee', async () => {
    await render(<TuteeProfileScreen />, { wrapper: Providers });

    expect(await screen.findByText('Alumno Demo')).toBeOnTheScreen();
    expect(screen.getByText('Universidad Católica de Temuco')).toBeOnTheScreen();
    expect(screen.getByText('6.1')).toBeOnTheScreen();
  });

  it('Tutee: error con reintento', async () => {
    const user = userEvent.setup();
    jest.spyOn(perfilApi, 'fetchPerfil').mockRejectedValueOnce(new Error('Token expirado'));
    await render(<TuteeProfileScreen />, { wrapper: Providers });

    expect(await screen.findByText('Token expirado')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Alumno Demo')).toBeOnTheScreen();
  });

  it('Tutor: muestra reputación y tutorías dadas', async () => {
    await render(<TutorProfileScreen />, { wrapper: Providers });

    expect(await screen.findByText('Alumno Demo')).toBeOnTheScreen();
    expect(screen.getByText('4.5 de calificación promedio')).toBeOnTheScreen();
    expect(screen.getByText('Tutorías dadas')).toBeOnTheScreen();
  });
});
