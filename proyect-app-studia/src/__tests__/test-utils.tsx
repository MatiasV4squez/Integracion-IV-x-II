import type { ReactNode } from 'react';

import { AuthProvider } from '@/hooks/use-auth';
import { TutorModeProvider } from '@/hooks/use-tutor-mode';
import { SessionsProvider } from '@/state/sessions-context';

/** Mismos providers que src/app/_layout.tsx, para renderizar pantallas aisladas. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TutorModeProvider>
        <SessionsProvider>{children}</SessionsProvider>
      </TutorModeProvider>
    </AuthProvider>
  );
}

/** Router simulado en jest.setup.js. */
export const mockRouter = (jest.requireMock('expo-router') as { __router: Record<string, jest.Mock> }).__router;
