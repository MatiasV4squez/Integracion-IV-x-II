import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createAvailabilitySchema } from './availability-schema.ts';
import { loginSchema, registerSchema } from './auth-schemas.ts';

const messages = (result) => (result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));

describe('formulario de inicio de sesión', () => {
  it('acepta correo institucional y contraseña', () => {
    assert.equal(loginSchema.safeParse({ email: 'ana@alu.uct.cl', password: 'x' }).success, true);
  });

  it('pide los campos vacíos', () => {
    const msgs = messages(loginSchema.safeParse({ email: '', password: '' }));
    assert.ok(msgs.some((m) => m.startsWith('email') && /Ingresa tu correo/.test(m)));
    assert.ok(msgs.some((m) => m.startsWith('password')));
  });

  it('rechaza correos que no son institucionales (NFR06)', () => {
    const msgs = messages(loginSchema.safeParse({ email: 'ana@gmail.com', password: 'x' }));
    assert.ok(msgs.some((m) => /institucional/.test(m)));
  });

  it('rechaza un correo sin formato válido', () => {
    assert.ok(messages(loginSchema.safeParse({ email: 'ana', password: 'x' })).some((m) => /formato/.test(m)));
  });
});

describe('formulario de registro', () => {
  const valid = { name: 'Ana Pérez', email: 'ana@alu.uct.cl', password: 'clave1234', confirmPassword: 'clave1234' };

  it('acepta datos válidos', () => {
    assert.equal(registerSchema.safeParse(valid).success, true);
  });

  it('exige contraseña de 8+ caracteres con letras y números', () => {
    assert.ok(messages(registerSchema.safeParse({ ...valid, password: 'abc1', confirmPassword: 'abc1' })).some((m) => /al menos 8/.test(m)));
    assert.ok(messages(registerSchema.safeParse({ ...valid, password: '12345678', confirmPassword: '12345678' })).some((m) => /letra/.test(m)));
    assert.ok(messages(registerSchema.safeParse({ ...valid, password: 'abcdefgh', confirmPassword: 'abcdefgh' })).some((m) => /número/.test(m)));
  });

  it('las contraseñas deben coincidir', () => {
    const msgs = messages(registerSchema.safeParse({ ...valid, confirmPassword: 'otra1234' }));
    assert.ok(msgs.includes('confirmPassword: Las contraseñas no coinciden.'));
  });

  it('valida el largo del nombre', () => {
    assert.ok(messages(registerSchema.safeParse({ ...valid, name: 'Al' })).some((m) => m.startsWith('name')));
    assert.ok(messages(registerSchema.safeParse({ ...valid, name: 'A'.repeat(61) })).some((m) => m.startsWith('name')));
  });
});

describe('formulario de publicar disponibilidad (RF08)', () => {
  const NOW = '2026-09-28T12:00:00.000Z';
  // Día "MM-DD" + hora local "HH:mm" -> ISO en UTC, para no depender de la zona horaria.
  const toIso = (day, time) => `2026-${day}T${time}:00.000Z`;
  const schema = createAvailabilitySchema({ now: NOW, toIso });
  const valid = { subjectCode: 'MAT1010', day: '09-29', startTime: '10:00', capacity: 2 };

  it('acepta un horario futuro', () => {
    assert.equal(schema.safeParse(valid).success, true);
  });

  it('exige elegir materia, día y hora', () => {
    const msgs = messages(schema.safeParse({ subjectCode: '', day: '', startTime: '', capacity: 1 }));
    assert.ok(msgs.includes('subjectCode: Elige una materia.'));
    assert.ok(msgs.includes('day: Elige un día.'));
    assert.ok(msgs.includes('startTime: Elige una hora de inicio.'));
  });

  it('no permite horarios que ya pasaron', () => {
    const msgs = messages(schema.safeParse({ ...valid, day: '09-28', startTime: '09:00' }));
    assert.ok(msgs.includes('startTime: Ese horario ya pasó. Elige una hora posterior.'));
    assert.equal(schema.safeParse({ ...valid, day: '09-28', startTime: '14:00' }).success, true);
  });

  it('los cupos son un entero entre 1 y 4', () => {
    assert.equal(schema.safeParse({ ...valid, capacity: 0 }).success, false);
    assert.equal(schema.safeParse({ ...valid, capacity: 5 }).success, false);
    assert.equal(schema.safeParse({ ...valid, capacity: 2.5 }).success, false);
    assert.equal(schema.safeParse({ ...valid, capacity: 4 }).success, true);
  });
});
