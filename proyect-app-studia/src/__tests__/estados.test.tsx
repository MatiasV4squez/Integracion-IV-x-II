import { act, render, renderHook, screen, userEvent } from '@testing-library/react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadMore } from '@/components/load-more';
import { LoadingState } from '@/components/loading-state';
import { useTutorias } from '@/hooks/use-tutorias';

import { Providers } from './test-utils';

describe('Componentes de estado', () => {
  it('LoadingState muestra el mensaje', async () => {
    await render(<LoadingState message="Cargando sesiones…" />);
    expect(screen.getByText('Cargando sesiones…')).toBeOnTheScreen();
  });

  it('ErrorState llama a onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    await render(<ErrorState message="Falló" onRetry={onRetry} />);
    await user.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('EmptyState ofrece la acción sugerida', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<EmptyState title="Vacío" action={{ label: 'Buscar tutorías', onPress }} />);
    await user.press(screen.getByRole('button', { name: 'Buscar tutorías' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('LoadMore se oculta cuando no hay más páginas', async () => {
    await render(<LoadMore hasMore={false} isLoadingMore={false} onLoadMore={jest.fn()} />);
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });
});

describe('useTutorias (paginación)', () => {
  it('acumula páginas con loadMore', async () => {
    const { result } = await renderHook(() => useTutorias('EST1010', 2), { wrapper: Providers });

    await act(async () => {});
    expect(result.current.items?.map((t) => t.id)).toEqual(['t4', 't5']);
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    expect(result.current.items).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
  });
});
