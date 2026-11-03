import { fetch } from 'expo/fetch';

import { AppError } from '@/shared/errors';

/**
 * Cliente HTTP hacia el API Gateway de los microservicios (lo usan los adaptadores de `infrastructure/http`).
 * Si EXPO_PUBLIC_API_URL no está definida, la raíz de composición (`src/di`) usa los adaptadores demo.
 *
 * EXPO_PUBLIC_API_URL es la raíz del Gateway (p. ej. http://192.168.1.10:8080/api); cada
 * micro se alcanza con su prefijo (ver SERVICIOS).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || null;

export const isApiEnabled = () => API_URL !== null;

/** Prefijos del API Gateway para cada microservicio. */
export const SERVICIOS = {
  usuarios: '/usuarios-auth',
  materias: '/materias-tutores',
  sesiones: '/agendamiento-sesiones',
  reportes: '/reportes-moderacion',
} as const;

/** JWT de usuarios-auth; lo fija el almacenamiento del token (src/services/index.ts) al iniciar sesión o al rehidratar. */
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Token actual; lo necesitan las descargas nativas, que no pasan por `request`. */
export const getAuthToken = () => authToken;

/** URL completa de un endpoint del Gateway (para descargas). */
export const apiUrl = (path: string) => `${API_URL}${path}`;

/** ID del usuario autenticado (claim `sub` del JWT), para saber qué rol cumple en cada sesión. */
export function currentUserId(): string | null {
  if (!authToken) return null;
  try {
    const payload = authToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return (JSON.parse(atob(padded)) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

/** Se llama cuando una petición autenticada responde 401 (token vencido o revocado). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | undefined>;

function buildUrl(path: string, query?: Query) {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${API_URL}${path}${params ? `?${params}` : ''}`;
}

type RequestOptions = { query?: Query; body?: unknown; form?: FormData; signal?: AbortSignal; raw?: boolean };

async function send(method: string, path: string, opts: RequestOptions): Promise<Response> {
  if (!API_URL) throw new AppError('API no configurada (EXPO_PUBLIC_API_URL).', 0, 'NO_API');
  let response: Response;
  // Las subidas usan el fetch de React Native: acepta archivos { uri, name, type } en FormData.
  const doFetch = opts.form ? globalThis.fetch : fetch;
  try {
    response = (await doFetch(buildUrl(path, opts.query), {
      method,
      headers: {
        Accept: opts.raw ? '*/*' : 'application/json',
        // Con FormData el límite multipart lo pone fetch: no se fija Content-Type.
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    })) as unknown as Response;
  } catch (error) {
    if (opts.signal?.aborted) throw error;
    throw new AppError('No pudimos conectar con el servidor. Revisa tu conexión.', 0, 'NETWORK_ERROR');
  }
  if (!response.ok) {
    if (response.status === 401 && authToken) onUnauthorized?.();
    // NestJS devuelve `message` como texto o, en errores de validación, como lista.
    const body = (await response.json().catch(() => ({}))) as { message?: string | string[]; code?: string };
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    throw new AppError(message ?? `Error del servidor (${response.status}).`, response.status, body.code);
  }
  return response;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}) {
  const response = await send(method, path, opts);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>('POST', path, { body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>('PATCH', path, { body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>('DELETE', path, { signal }),
  /** POST multipart/form-data (p. ej. subir un certificado). */
  postForm: <T>(path: string, form: FormData, signal?: AbortSignal) => request<T>('POST', path, { form, signal }),
  /** GET de un archivo (respuesta binaria). */
  getBlob: async (path: string, signal?: AbortSignal) => (await send('GET', path, { signal, raw: true })).blob(),
};
