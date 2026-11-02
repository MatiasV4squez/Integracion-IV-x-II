import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDuration, isPast, minutesBetween, parseTime } from './date-time.ts';

describe('horas "HH:mm"', () => {
  it('parseTime acepta horas válidas y rechaza el resto', () => {
    assert.deepEqual(parseTime('17:30'), { hours: 17, minutes: 30 });
    assert.deepEqual(parseTime('00:00'), { hours: 0, minutes: 0 });
    for (const bad of ['24:00', '7:30', '17:60', 'abc', '', '17-30']) assert.equal(parseTime(bad), null, bad);
  });
});

describe('fechas ISO', () => {
  it('minutesBetween cuenta los minutos entre dos fechas', () => {
    assert.equal(minutesBetween('2026-09-30T14:00:00.000Z', '2026-09-30T15:30:00.000Z'), 90);
  });

  it('isPast: igual a "ahora" cuenta como pasado', () => {
    const now = '2026-09-28T12:00:00.000Z';
    assert.equal(isPast('2026-09-28T11:59:00.000Z', now), true);
    assert.equal(isPast(now, now), true);
    assert.equal(isPast('2026-09-28T12:01:00.000Z', now), false);
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
});
