/**
 * Utilidades de fechas "de calendario" (sin hora) en formato YYYY-MM-DD.
 * Trabajar con strings evita los problemas clásicos de zonas horarias y DST.
 */
export type DateStr = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function utcDays(s: DateStr): number {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** a - b, en días. */
export function diffDays(a: DateStr, b: DateStr): number {
  return utcDays(a) - utcDays(b);
}

/** 0 = domingo … 6 = sábado */
export function weekday(s: DateStr): number {
  return parseDate(s).getDay();
}

export function dayOfMonth(s: DateStr): number {
  return Number(s.slice(8, 10));
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

export function monthIndex(s: DateStr): number {
  return Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1;
}

export function startOfWeek(s: DateStr, weekStartsOn: 0 | 1 = 1): DateStr {
  const wd = weekday(s);
  const delta = (wd - weekStartsOn + 7) % 7;
  return addDays(s, -delta);
}

export const minDate = (a: DateStr, b: DateStr) => (a < b ? a : b);
export const maxDate = (a: DateStr, b: DateStr) => (a > b ? a : b);

/**
 * "Hoy lógico": permite que el día empiece a otra hora (p. ej. a las 4:00),
 * para quien completa tareas pasada la medianoche.
 */
export function logicalToday(now: Date = new Date(), dayStartHour = 0): DateStr {
  return toDateStr(new Date(now.getTime() - dayStartHour * 3_600_000));
}

export function rangeDays(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/* ---------- Formato en español ---------- */

export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const WEEKDAYS_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** "martes, 3 de noviembre" */
export function formatLong(s: DateStr): string {
  const d = parseDate(s);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "lun 5 nov" */
export function formatShort(s: DateStr): string {
  const d = parseDate(s);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Hoy / Mañana / Ayer / jueves / lun 5 nov */
export function formatRelative(s: DateStr, today: DateStr): string {
  const diff = diffDays(s, today);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff < 7) return WEEKDAYS[weekday(s)];
  return formatShort(s);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
