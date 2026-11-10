import { describe, expect, it } from 'vitest';
import { addDays, diffDays, logicalToday, weekday } from '../dates';
import { describeRecurrence, isScheduledOn, nextOccurrence, occurrencesBetween, prevOccurrence, type Recurrence } from '../recurrence';

describe('fechas', () => {
  it('suma y resta días cruzando meses y cambios de hora', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // cambio de hora en España
    expect(diffDays('2026-11-03', '2026-10-25')).toBe(9);
  });

  it('respeta la hora de inicio del día', () => {
    const lateNight = new Date(2026, 10, 4, 2, 30); // 4 nov, 02:30
    expect(logicalToday(lateNight, 0)).toBe('2026-11-04');
    expect(logicalToday(lateNight, 4)).toBe('2026-11-03');
  });
});

describe('recurrencias', () => {
  it('diaria cada N días', () => {
    const r: Recurrence = { type: 'daily', interval: 2 };
    expect(isScheduledOn(r, '2026-11-01', '2026-11-03')).toBe(true);
    expect(isScheduledOn(r, '2026-11-01', '2026-11-04')).toBe(false);
    expect(nextOccurrence(r, '2026-11-01', '2026-11-03')).toBe('2026-11-05');
  });

  it('semanal en varios días', () => {
    const r: Recurrence = { type: 'weekly', interval: 1, days: [1, 3, 5] }; // L, X, V
    const dates = occurrencesBetween(r, '2026-11-02', '2026-11-02', '2026-11-08');
    expect(dates).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
    expect(dates.map(weekday)).toEqual([1, 3, 5]);
  });

  it('semanal cada 2 semanas', () => {
    const r: Recurrence = { type: 'weekly', interval: 2, days: [2] }; // martes
    expect(nextOccurrence(r, '2026-11-03', '2026-11-03')).toBe('2026-11-17');
  });

  it('mensual ajusta a meses cortos', () => {
    const r: Recurrence = { type: 'monthly', interval: 1, dayOfMonth: 31 };
    expect(nextOccurrence(r, '2026-01-31', '2026-01-31')).toBe('2026-02-28');
    expect(nextOccurrence(r, '2026-01-31', '2026-02-28')).toBe('2026-03-31');
  });

  it('ocurrencia anterior', () => {
    const r: Recurrence = { type: 'weekly', interval: 1, days: [6] }; // sábados
    expect(prevOccurrence(r, '2026-10-03', '2026-11-03')).toBe('2026-10-31');
    expect(prevOccurrence(r, '2026-11-07', '2026-11-03')).toBeNull();
  });

  it('describe en español', () => {
    expect(describeRecurrence({ type: 'daily', interval: 1 })).toBe('Cada día');
    expect(describeRecurrence({ type: 'weekly', interval: 1, days: [1, 2, 3, 4, 5] })).toBe('Días laborables');
    expect(describeRecurrence({ type: 'weekly', interval: 1, days: [0, 1] })).toBe('Cada semana: lun, dom');
  });

  it('no programa nada antes del ancla', () => {
    expect(addDays('2026-11-03', 0)).toBe('2026-11-03');
    expect(isScheduledOn({ type: 'daily', interval: 1 }, '2026-11-05', '2026-11-04')).toBe(false);
  });
});
