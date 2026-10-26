import { fetch } from 'expo/fetch';

/**
 * Cliente HTTP hacia el API Gateway de los microservicios.
 * Si EXPO_PUBLIC_API_URL no está definida, los módulos de src/api responden con los
 * datos de src/mocks, así la app sigue funcionando sin backend.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || null;

export const isApiEnabled = () => API_URL !== null;

/** Latencia simulada del modo mock (ms), para ver los estados de carga. En pruebas se pone en 0. */
const MOCK_LATENCY_MS = Number(process.env.EXPO_PUBLIC_MOCK_LATENCY_MS ?? 400);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Página de resultados que devuelven los endpoints de listado. */
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; hasMore: boolean };

export function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), page, pageSize, total: all.length, hasMore: start + pageSize < all.length };
}

type Query = Record<string, string | number | undefined>;

function buildUrl(path: string, query?: Query) {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${API_URL}${path}${params ? `?${params}` : ''}`;
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; signal?: AbortSignal } = {}) {
  if (!API_URL) throw new ApiError('API no configurada (EXPO_PUBLIC_API_URL).', 0, 'NO_API');
  let response: Response;
  try {
    response = (await fetch(buildUrl(path, opts.query), {
      method,
      headers: { Accept: 'application/json', ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })) as unknown as Response;
  } catch (error) {
    if (opts.signal?.aborted) throw error;
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión.', 0, 'NETWORK_ERROR');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new ApiError(body.message ?? `Error del servidor (${response.status}).`, response.status, body.code);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>('POST', path, { body, signal }),
};

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
