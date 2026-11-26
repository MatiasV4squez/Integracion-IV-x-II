/**
 * Error de la aplicación con estado HTTP y código (si los hay). Lo lanzan los adaptadores y lo
 * leen los casos de uso y la presentación sin depender de cómo se obtuvo el dato.
 */
export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

/** Mensaje legible de cualquier error. */
export const errorMessage = (error: unknown, fallback = 'Ocurrió un error inesperado.') => (error instanceof Error ? error.message : fallback);
