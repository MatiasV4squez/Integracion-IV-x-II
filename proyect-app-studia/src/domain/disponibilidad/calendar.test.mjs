import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addMonths, compareMonths, duracion, monthGrid, seSolapan, to12h, to24h, validarBloque } from './calendar.ts';

describe('calendario mensual', () => {
  it('noviembre de 2026 empieza en domingo y ocupa 6 semanas (lunes a domingo)', () => {
    const weeks = monthGrid({ year: 2026, month: 11 });
    assert.equal(weeks.length, 6);
    assert.deepEqual(weeks[0], [null, null, null, null, null, null, '2026-11-01']);
    assert.equal(weeks[5][0], '2026-11-30');
    assert.equal(weeks.flat().filter(Boolean).length, 30);
  });

  it('febrero de un año bisiesto tiene 29 días', () => {
    assert.equal(monthGrid({ year: 2028, month: 2 }).flat().filter(Boolean).length, 29);
  });

  it('avanza y retrocede meses cruzando el año', () => {
    assert.deepEqual(addMonths({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
    assert.deepEqual(addMonths({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
    assert.ok(compareMonths({ year: 2027, month: 1 }, { year: 2026, month: 12 }) > 0);
  });

  it('el tutor arma su bloque: término posterior al inicio, no en el pasado y sin cruces', () => {
    const opts = { today: '2026-11-02', nowTime: '14:30', ocupados: [{ start: '16:00', end: '17:30' }] };
    assert.equal(validarBloque('2026-11-03', { start: '09:15', end: '11:45' }, opts), null);
    assert.match(validarBloque('2026-11-03', { start: '10:00', end: '10:00' }, opts), /posterior/);
    assert.match(validarBloque('2026-11-02', { start: '14:00', end: '15:00' }, opts), /ya pasó/);
    assert.equal(validarBloque('2026-11-02', { start: '14:45', end: '16:00' }, opts), null, 'terminar justo cuando empieza otro no es cruce');
    assert.match(validarBloque('2026-11-02', { start: '17:00', end: '18:00' }, opts), /16:00 a 17:30/);
    assert.match(validarBloque('', { start: '', end: '' }, opts), /día/);
  });

  it('detecta cruces y calcula la duración', () => {
    assert.equal(seSolapan({ start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' }), false);
    assert.equal(seSolapan({ start: '10:00', end: '11:30' }, { start: '11:00', end: '12:00' }), true);
    assert.equal(duracion({ start: '09:15', end: '11:45' }), '2 h 30 min');
    assert.equal(duracion({ start: '09:00', end: '10:00' }), '1 h');
    assert.equal(duracion({ start: '09:00', end: '09:45' }), '45 min');
  });

  it('convierte entre 24 h (backend) y 12 h con AM/PM (pantalla)', () => {
    assert.deepEqual(to12h('21:40'), { hour: '9', minute: '40', period: 'PM' });
    assert.deepEqual(to12h('00:05'), { hour: '12', minute: '05', period: 'AM' });
    assert.deepEqual(to12h('12:30'), { hour: '12', minute: '30', period: 'PM' });
    assert.equal(to24h({ hour: '9', minute: '40', period: 'PM' }), '21:40');
    assert.equal(to24h({ hour: '12', minute: '05', period: 'AM' }), '00:05');
    assert.equal(to24h({ hour: '12', minute: '30', period: 'PM' }), '12:30');
    for (const t of ['00:00', '07:15', '11:59', '13:00', '23:59']) assert.equal(to24h(to12h(t)), t);
  });
});
