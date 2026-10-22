import { z } from 'zod';

import { AUTH } from '@/constants/app-config';
import { isInstitutionalEmail, isValidEmailFormat } from '@/utils/email';

/** Correo institucional (RF01, BR11, NFR06). Se valida en el cliente y otra vez en el servicio. */
export const institutionalEmailSchema = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo institucional.')
  .refine(isValidEmailFormat, 'El correo no tiene un formato válido.')
  .refine((value) => !isValidEmailFormat(value) || isInstitutionalEmail(value), 'Usa tu correo institucional (@alu.uct.cl o @uct.cl).');

export const loginSchema = z.object({
  email: institutionalEmailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export const passwordSchema = z
  .string()
  .min(AUTH.PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${AUTH.PASSWORD_MIN_LENGTH} caracteres.`)
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra.')
  .regex(/\d/, 'La contraseña debe incluir al menos un número.');

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(AUTH.NAME_MIN_LENGTH, `Ingresa tu nombre (mínimo ${AUTH.NAME_MIN_LENGTH} letras).`)
      .max(AUTH.NAME_MAX_LENGTH, `El nombre no puede superar ${AUTH.NAME_MAX_LENGTH} caracteres.`),
    email: institutionalEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite tu contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden.' });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
