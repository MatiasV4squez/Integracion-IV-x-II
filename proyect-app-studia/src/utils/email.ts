import { ALLOWED_EMAIL_DOMAINS } from '@/constants/app-config';

/** Correo en minúsculas y sin espacios en los extremos. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Formato básico de correo (no reemplaza la verificación por enlace). */
export function isValidEmailFormat(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

/** "ana@alu.uct.cl" -> "alu.uct.cl"; null si no tiene formato de correo. */
export function emailDomain(email: string): string | null {
  const value = normalizeEmail(email);
  if (!isValidEmailFormat(value)) return null;
  return value.slice(value.lastIndexOf('@') + 1);
}

/** RF01 / BR11 / NFR06: solo correos del dominio institucional. */
export function isInstitutionalEmail(email: string, allowed: readonly string[] = ALLOWED_EMAIL_DOMAINS): boolean {
  const domain = emailDomain(email);
  return domain !== null && allowed.includes(domain);
}
