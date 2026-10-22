/**
 * Constantes de la aplicación: única fuente de verdad para valores que se repiten.
 * Entre paréntesis se indica de dónde sale cada valor en el SRS.
 */

export const APP_NAME = 'Studia';
export const APP_FULL_NAME = 'Sistema de Tutorías entre Pares (STP)';

/** Roles de una cuenta. Un mismo usuario puede ser Tutee y Tutor a la vez (RF03). */
export const ACCOUNT_ROLES = ['tutee', 'tutor', 'admin'] as const;

/** Dominios de correo permitidos para registrarse e iniciar sesión (RF01, BR11, NFR06). */
export const ALLOWED_EMAIL_DOMAINS = ['alu.uct.cl', 'uct.cl'] as const;

export const AUTH = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 60,
  /** Inactividad máxima antes de cerrar la sesión (NFR04: 30 minutos). */
  SESSION_INACTIVITY_MS: 30 * 60 * 1000,
  /** Vigencia absoluta del token (no depende de la actividad). */
  TOKEN_TTL_MS: 12 * 60 * 60 * 1000,
  /** Cada cuánto como máximo se registra actividad del usuario. */
  ACTIVITY_THROTTLE_MS: 30 * 1000,
} as const;

export const NETWORK = {
  /** Tiempo máximo de espera de una llamada al API Gateway (NFR23: 5 segundos). */
  REQUEST_TIMEOUT_MS: 5000,
} as const;

/** Archivos que se pueden subir, por ejemplo el certificado de notas (NFR05, NFR20). */
export const FILES = {
  MAX_BYTES: 5 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png'],
  ALLOWED_EXTENSIONS: ['pdf', 'png'],
} as const;

/** Escala de calificación: enteros del 1 al 5 (BR19). */
export const RATING = { MIN: 1, MAX: 5 } as const;

/** Bloques de disponibilidad que publica un Tutor (RF08). */
export const AVAILABILITY = { MIN_CAPACITY: 1, MAX_CAPACITY: 4, BLOCK_MINUTES: 60 } as const;

/** Claves de almacenamiento local. Cambiar `PREFIX` invalida todo lo guardado (por ejemplo, al migrar formatos). */
export const STORAGE = {
  PREFIX: 'studia:v1:',
  KEYS: {
    AUTH_USER: 'auth:user',
    AUTH_LAST_ACTIVITY: 'auth:last-activity',
    PREFERENCES: 'preferences',
  },
  /** El token va a SecureStore (NFR16); estas claves solo admiten letras, números, ".", "-" y "_". */
  TOKEN_KEY: 'studia.auth_token',
} as const;

/** Vigencia de los datos en caché (NFR12). */
export const CACHE_TTL_MS = {
  CATALOG: 24 * 60 * 60 * 1000,
} as const;
