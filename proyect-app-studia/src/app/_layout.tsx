import { Stack } from 'expo-router';

import { TutorModeProvider } from '@/hooks/use-tutor-mode';

export default function RootLayout() {
  return (
    <TutorModeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tutor" options={{ headerShown: false }} />
      </Stack>
    </TutorModeProvider>
  );
}
