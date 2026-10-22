import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addMinutes, addMinutesToTime, formatDuration, formatRelative, isPast, isSameDay, isValidTime, minutesBetween, parseTime } from './date-time.ts';

describe('horas "HH:mm"', () => {
  it('parseTime acepta horas válidas y rechaza el resto', () => {
    assert.deepEqual(parseTime('17:30'), { hours: 17, minutes: 30 });
    assert.deepEqual(parseTime('00:00'), { hours: 0, minutes: 0 });
    for (const bad of ['24:00', '7:30', '17:60', 'abc', '', '17-30']) assert.equal(parseTime(bad), null, bad);
    assert.equal(isValidTime('09:05'), true);
    assert.equal(isValidTime('9:5'), false);
  });

  it('addMinutesToTime suma y da la vuelta a las 24 h', () => {
    assert.equal(addMinutesToTime('17:30', 60), '18:30');
    assert.equal(addMinutesToTime('23:30', 60), '00:30');
    assert.equal(addMinutesToTime('00:15', -30), '23:45');
    assert.equal(addMinutesToTime('basura', 60), 'basura');
  });
});

describe('fechas ISO', () => {
  it('addMinutes y minutesBetween son inversas', () => {
    const start = '2026-09-30T14:00:00.000Z';
    const end = addMinutes(start, 90);
    assert.equal(end, '2026-09-30T15:30:00.000Z');
    assert.equal(minutesBetween(start, end), 90);
  });

  it('isPast: igual a "ahora" cuenta como pasado', () => {
    const now = '2026-09-28T12:00:00.000Z';
    assert.equal(isPast('2026-09-28T11:59:00.000Z', now), true);
    assert.equal(isPast(now, now), true);
    assert.equal(isPast('2026-09-28T12:01:00.000Z', now), false);
  });

  it('isSameDay compara el día local', () => {
    const a = new Date(2026, 8, 28, 9, 0).toISOString();
    const b = new Date(2026, 8, 28, 23, 30).toISOString();
    const c = new Date(2026, 8, 29, 0, 10).toISOString();
    assert.equal(isSameDay(a, b), true);
    assert.equal(isSameDay(a, c), false);
  });
});

describe('texto para mostrar', () => {
  it('formatDuration', () => {
    assert.equal(formatDuration(0), '0 min');
    assert.equal(formatDuration(45), '45 min');
    assert.equal(formatDuration(60), '1 h');
    assert.equal(formatDuration(90), '1 h 30 min');
    assert.equal(formatDuration(-10), '0 min');
  });

  it('formatRelative en futuro y pasado', () => {
    const now = '2026-09-28T12:00:00.000Z';
    assert.equal(formatRelative('2026-09-28T12:00:20.000Z', now), 'ahora');
    assert.equal(formatRelative('2026-09-28T12:45:00.000Z', now), 'en 45 min');
    assert.equal(formatRelative('2026-09-28T09:00:00.000Z', now), 'hace 3 h');
    assert.equal(formatRelative('2026-09-29T12:00:00.000Z', now), 'en 1 día');
    assert.equal(formatRelative('2026-09-25T12:00:00.000Z', now), 'hace 3 días');
  });
});
