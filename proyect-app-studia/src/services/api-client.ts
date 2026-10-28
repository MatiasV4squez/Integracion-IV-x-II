import { NETWORK } from '@/constants/app-config';

export class ApiError extends Error {
  readonly status: number;
  readonly code: 'TIMEOUT' | 'NETWORK' | 'HTTP';
  constructor(code: ApiError['code'], status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export type ApiClientOptions = {
  /** URL del API Gateway: toda llamada de la app pasa por él (NFR25). */
  baseUrl: string;
  /** Entrega el JWT para el encabezado Authorization. */
  getToken?: () => Promise<string | null>;
  /** Por defecto 5 segundos (NFR23). */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * Cliente HTTP base para cuando exista el backend: JSON, JWT en la cabecera Authorization y tiempo
 * máximo de espera. Los servicios "reales" se construyen sobre este cliente.
 */
export function createApiClient(options: ApiClientOptions) {
  const timeoutMs = options.timeoutMs ?? NETWORK.REQUEST_TIMEOUT_MS;
  const doFetch = options.fetchImpl ?? fetch;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = await options.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await doFetch(`${options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) throw new ApiError('HTTP', response.status, `Error ${response.status} en ${method} ${path}`);
      return (response.status === 204 ? undefined : await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) throw new ApiError('TIMEOUT', 0, 'El servidor no respondió a tiempo.');
      throw new ApiError('NETWORK', 0, 'No se pudo conectar con el servidor.');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
