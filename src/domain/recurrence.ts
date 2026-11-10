import {
  addDays, dayOfMonth, daysInMonth, diffDays, monthIndex, startOfWeek, weekday,
  WEEKDAYS_SHORT, type DateStr,
} from './dates';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Recurrence =
  | { type: 'none' }
  | { type: 'daily'; interval: number }
  | { type: 'weekly'; interval: number; days: Weekday[] }
  | { type: 'monthly'; interval: number; dayOfMonth: number };

export const NO_REPEAT: Recurrence = { type: 'none' };
export const WORKDAYS: Weekday[] = [1, 2, 3, 4, 5];

export const isRecurring = (r: Recurrence) => r.type !== 'none';

/** Garantiza valores válidos (intervalos ≥ 1, días ordenados y únicos…). */
export function normalizeRecurrence(r: Recurrence, anchor: DateStr): Recurrence {
  switch (r.type) {
    case 'none':
      return r;
    case 'daily':
      return { type: 'daily', interval: Math.max(1, Math.floor(r.interval || 1)) };
    case 'weekly': {
      const days = [...new Set(r.days)].sort() as Weekday[];
      return {
        type: 'weekly',
        interval: Math.max(1, Math.floor(r.interval || 1)),
        days: days.length ? days : [weekday(anchor) as Weekday],
      };
    }
    case 'monthly':
      return {
        type: 'monthly',
        interval: Math.max(1, Math.floor(r.interval || 1)),
        dayOfMonth: Math.min(31, Math.max(1, Math.floor(r.dayOfMonth || dayOfMonth(anchor)))),
      };
  }
}

export function isScheduledOn(r: Recurrence, anchor: DateStr, date: DateStr): boolean {
  const diff = diffDays(date, anchor);
  if (diff < 0) return false;
  switch (r.type) {
    case 'none':
      return diff === 0;
    case 'daily':
      return diff % r.interval === 0;
    case 'weekly': {
      if (!r.days.includes(weekday(date) as Weekday)) return false;
      const weeks = Math.floor(diffDays(startOfWeek(date, 1), startOfWeek(anchor, 1)) / 7);
      return weeks % r.interval === 0;
    }
    case 'monthly': {
      const months = monthIndex(date) - monthIndex(anchor);
      if (months % r.interval !== 0) return false;
      const y = Number(date.slice(0, 4));
      const m = Number(date.slice(5, 7));
      return dayOfMonth(date) === Math.min(r.dayOfMonth, daysInMonth(y, m));
    }
  }
}

const SEARCH_LIMIT = 4000; // días (~11 años): suficiente para cualquier intervalo razonable

/** Primera fecha programada estrictamente posterior a `after`. */
export function nextOccurrence(r: Recurrence, anchor: DateStr, after: DateStr): DateStr | null {
  let d = addDays(after, 1);
  if (d < anchor) d = anchor;
  for (let i = 0; i < SEARCH_LIMIT; i++) {
    if (isScheduledOn(r, anchor, d)) return d;
    d = addDays(d, 1);
  }
  return null;
}

/** Primera fecha programada en `from` o después. */
export function occurrenceOnOrAfter(r: Recurrence, anchor: DateStr, from: DateStr): DateStr | null {
  return nextOccurrence(r, anchor, addDays(from, -1));
}

/** Última fecha programada en `onOrBefore` o antes (null si es anterior al ancla). */
export function prevOccurrence(r: Recurrence, anchor: DateStr, onOrBefore: DateStr): DateStr | null {
  let d = onOrBefore;
  for (let i = 0; i < SEARCH_LIMIT && d >= anchor; i++) {
    if (isScheduledOn(r, anchor, d)) return d;
    d = addDays(d, -1);
  }
  return null;
}

export function occurrencesBetween(r: Recurrence, anchor: DateStr, from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  let d = occurrenceOnOrAfter(r, anchor, from);
  while (d && d <= to && out.length < 400) {
    out.push(d);
    d = nextOccurrence(r, anchor, d);
  }
  return out;
}

/* ---------- Texto legible ---------- */

const sameDays = (a: Weekday[], b: Weekday[]) => a.length === b.length && a.every((d) => b.includes(d));

export function describeRecurrence(r: Recurrence): string {
  switch (r.type) {
    case 'none':
      return 'No se repite';
    case 'daily':
      return r.interval === 1 ? 'Cada día' : `Cada ${r.interval} días`;
    case 'weekly': {
      if (r.interval === 1 && sameDays(r.days, WORKDAYS)) return 'Días laborables';
      if (r.interval === 1 && sameDays(r.days, [0, 6])) return 'Fines de semana';
      if (r.interval === 1 && r.days.length === 7) return 'Cada día';
      const ordered = [...r.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      const names = ordered.map((d) => WEEKDAYS_SHORT[d]).join(', ');
      return r.interval === 1 ? `Cada semana: ${names}` : `Cada ${r.interval} semanas: ${names}`;
    }
    case 'monthly':
      return r.interval === 1 ? `Cada mes, el día ${r.dayOfMonth}` : `Cada ${r.interval} meses, el día ${r.dayOfMonth}`;
  }
}
