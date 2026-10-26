// Sin latencia simulada en el modo mock (ver src/api/client.ts) y siempre sin backend.
process.env.EXPO_PUBLIC_MOCK_LATENCY_MS = '0';
delete process.env.EXPO_PUBLIC_API_URL;

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Navegación: las pruebas verifican a dónde se navega sin montar el router completo.
const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  __router: mockRouter,
}));
