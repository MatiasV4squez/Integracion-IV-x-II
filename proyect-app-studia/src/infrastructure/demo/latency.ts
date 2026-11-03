/** Latencia simulada de los adaptadores demo (ms), para ver los estados de carga. En pruebas se pone en 0. */
const MOCK_LATENCY_MS = Number(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS ?? 400);

/** Resuelve `value` tras la latencia simulada; respeta la cancelación. */
export function mockResponse<T>(value: T | (() => T), signal?: AbortSignal): Promise<T> {
  const resolve = () => (typeof value === 'function' ? (value as () => T)() : value);
  if (MOCK_LATENCY_MS <= 0) return Promise.resolve().then(resolve);
  return new Promise((ok, fail) => {
    const timer = setTimeout(() => ok(resolve()), MOCK_LATENCY_MS);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      const aborted = new Error('Aborted');
      aborted.name = 'AbortError';
      fail(aborted);
    });
  });
}
