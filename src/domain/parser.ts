/**
 * Entrada rápida en lenguaje natural (al estilo Todoist), en español:
 *   "Leer 20 min cada día a las 22:00 #personal p2 @hábitos"
 *   "Pagar el alquiler el 1 de cada mes"
 *   "Llamar a mamá mañana"
 */
import { addDays, dayOfMonth, diffDays, toDateStr, weekday, type DateStr } from './dates';
import type { Recurrence, Weekday } from './recurrence';
import type { Priority } from './types';

export interface ParsedToken {
  text: string;
  kind: 'date' | 'recurrence' | 'time' | 'priority' | 'list' | 'tag';
}

export interface ParsedInput {
  title: string;
  date: DateStr | null;
  time: string | null;
  recurrence: Recurrence | null;
  priority: Priority | null;
  listName: string | null;
  tags: string[];
  tokens: ParsedToken[];
}

const DAY_NAMES: Record<string, Weekday> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};
const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const DAY_RE = '(lunes|martes|miercoles|jueves|viernes|sabado|domingo)';
const MONTH_RE = `(${Object.keys(MONTHS).join('|')})`;

/** Minúsculas y sin tildes, manteniendo la longitud (para poder recortar el original). */
function fold(s: string): string {
  return Array.from(s)
    .map((ch) => ch.normalize('NFD')[0].toLowerCase())
    .join('');
}

const B = '(?<![\\p{L}\\d])'; // inicio de palabra (compatible con Unicode)
const E = '(?![\\p{L}\\d])'; // fin de palabra

interface Rule {
  /** 1: recurrencias explícitas · 2: fechas, hora, prioridad, lista · 3: recurrencias relativas a la fecha */
  phase: 1 | 2 | 3;
  re: RegExp;
  kind: ParsedToken['kind'];
  apply: (m: RegExpExecArray, out: ParsedInput, ctx: { today: DateStr }) => void;
}

function nextWeekday(today: DateStr, wd: number): DateStr {
  const delta = (wd - weekday(today) + 7) % 7 || 7;
  return addDays(today, delta);
}

function dateFromDayMonth(today: DateStr, day: number, month: number, year?: number): DateStr | null {
  const y0 = Number(today.slice(0, 4));
  let y = year ?? y0;
  if (y < 100) y += 2000;
  const d = new Date(y, month - 1, day);
  if (d.getMonth() !== month - 1) return null;
  let s = toDateStr(d);
  if (year === undefined && diffDays(s, today) < 0) s = toDateStr(new Date(y + 1, month - 1, day));
  return s;
}

const rules: Rule[] = [
  // --- Recurrencias ---
  { phase: 1, re: new RegExp(`${B}cada (\\d+) dias${E}`, 'u'), kind: 'recurrence', apply: (m, o) => { o.recurrence = { type: 'daily', interval: Number(m[1]) }; } },
  { phase: 1, re: new RegExp(`${B}(cada dia|todos los dias|diariamente|a diario)${E}`, 'u'), kind: 'recurrence', apply: (_m, o) => { o.recurrence = { type: 'daily', interval: 1 }; } },
  { phase: 1, re: new RegExp(`${B}(dias laborables|entre semana|de lunes a viernes)${E}`, 'u'), kind: 'recurrence', apply: (_m, o) => { o.recurrence = { type: 'weekly', interval: 1, days: [1, 2, 3, 4, 5] }; } },
  { phase: 1, re: new RegExp(`${B}(los fines de semana|cada fin de semana|fines de semana)${E}`, 'u'), kind: 'recurrence', apply: (_m, o) => { o.recurrence = { type: 'weekly', interval: 1, days: [0, 6] }; } },
  {
    phase: 1, re: new RegExp(`${B}(?:cada|todos los) ${DAY_RE}s?((?:(?:, ?| y | e )${DAY_RE}s?)*)${E}`, 'u'),
    kind: 'recurrence',
    apply: (m, o) => {
      const names = m[0].match(new RegExp(DAY_RE, 'g')) ?? [];
      o.recurrence = { type: 'weekly', interval: 1, days: names.map((n) => DAY_NAMES[n]) };
    },
  },
  { phase: 3, re: new RegExp(`${B}cada (\\d+) semanas${E}`, 'u'), kind: 'recurrence', apply: (m, o, c) => { o.recurrence = { type: 'weekly', interval: Number(m[1]), days: [weekday(o.date ?? c.today) as Weekday] }; } },
  { phase: 3, re: new RegExp(`${B}(cada semana|semanalmente)${E}`, 'u'), kind: 'recurrence', apply: (_m, o, c) => { o.recurrence = { type: 'weekly', interval: 1, days: [weekday(o.date ?? c.today) as Weekday] }; } },
  { phase: 1, re: new RegExp(`${B}(?:el )?(?:dia )?(\\d{1,2}) de cada mes${E}`, 'u'), kind: 'recurrence', apply: (m, o) => { o.recurrence = { type: 'monthly', interval: 1, dayOfMonth: Number(m[1]) }; } },
  { phase: 3, re: new RegExp(`${B}(cada mes|mensualmente)${E}`, 'u'), kind: 'recurrence', apply: (_m, o, c) => { o.recurrence = { type: 'monthly', interval: 1, dayOfMonth: dayOfMonth(o.date ?? c.today) }; } },
  // --- Fechas ---
  { phase: 2, re: new RegExp(`${B}pasado manana${E}`, 'u'), kind: 'date', apply: (_m, o, c) => { o.date = addDays(c.today, 2); } },
  { phase: 2, re: new RegExp(`${B}(?<!la )manana${E}`, 'u'), kind: 'date', apply: (_m, o, c) => { o.date = addDays(c.today, 1); } },
  { phase: 2, re: new RegExp(`${B}hoy${E}`, 'u'), kind: 'date', apply: (_m, o, c) => { o.date = c.today; } },
  { phase: 2, re: new RegExp(`${B}en (\\d+) dias${E}`, 'u'), kind: 'date', apply: (m, o, c) => { o.date = addDays(c.today, Number(m[1])); } },
  { phase: 2, re: new RegExp(`${B}(?:la )?proxima semana${E}`, 'u'), kind: 'date', apply: (_m, o, c) => { o.date = nextWeekday(c.today, 1); } },
  {
    phase: 2, re: new RegExp(`${B}(?:el )?(\\d{1,2}) de ${MONTH_RE}(?: de (\\d{4}))?${E}`, 'u'),
    kind: 'date',
    apply: (m, o, c) => { o.date = dateFromDayMonth(c.today, Number(m[1]), MONTHS[m[2]], m[3] ? Number(m[3]) : undefined); },
  },
  {
    phase: 2, re: new RegExp(`${B}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?${E}`, 'u'),
    kind: 'date',
    apply: (m, o, c) => { o.date = dateFromDayMonth(c.today, Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : undefined); },
  },
  { phase: 2, re: new RegExp(`${B}(?:el |este |el proximo )?${DAY_RE}${E}`, 'u'), kind: 'date', apply: (m, o, c) => { o.date = nextWeekday(c.today, DAY_NAMES[m[1]]); } },
  // --- Hora ---
  {
    phase: 2, re: new RegExp(`${B}(?:a las |a la )?(\\d{1,2}):(\\d{2})${E}`, 'u'),
    kind: 'time',
    apply: (m, o) => {
      const h = Number(m[1]);
      const min = Number(m[2] ?? 0);
      if (h < 24 && min < 60) o.time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    },
  },
  {
    phase: 2, re: new RegExp(`${B}a las (\\d{1,2})h?${E}`, 'u'),
    kind: 'time',
    apply: (m, o) => { const h = Number(m[1]); if (h < 24) o.time = `${String(h).padStart(2, '0')}:00`; },
  },
  // --- Prioridad, lista, etiquetas ---
  { phase: 2, re: /(?<!\S)p([1-4])(?!\S)/u, kind: 'priority', apply: (m, o) => { o.priority = Number(m[1]) as Priority; } },
  { phase: 2, re: /(?<!\S)#([\p{L}\d_-]+)/u, kind: 'list', apply: (m, o) => { o.listName = m[1]; } },
];

const TAG_RE = /(?<!\S)@([\p{L}\d_-]+)/gu;

export function parseQuickAdd(input: string, today: DateStr): ParsedInput {
  const out: ParsedInput = {
    title: '', date: null, time: null, recurrence: null, priority: null, listName: null, tags: [], tokens: [],
  };
  let original = input;
  let folded = fold(input);

  const cut = (start: number, end: number, kind: ParsedToken['kind']) => {
    out.tokens.push({ text: original.slice(start, end).trim(), kind });
    original = original.slice(0, start) + ' ' + original.slice(end);
    folded = folded.slice(0, start) + ' ' + folded.slice(end);
  };

  // Fase 1: "cada lunes" debe ganar a "lunes". Fase 3: "cada semana"/"cada mes"
  // usan el día de la fecha detectada en la fase 2.
  for (const phase of [1, 2, 3] as const) {
    for (const rule of rules.filter((r) => r.phase === phase)) {
      if (rule.kind === 'recurrence' && out.recurrence) continue;
      if (rule.kind === 'date' && out.date) continue;
      if (rule.kind === 'time' && out.time) continue;
      const m = rule.re.exec(folded);
      if (!m) continue;
      // Para el nombre de lista conservamos mayúsculas y tildes del original.
      const src = rule.kind === 'list' ? (rule.re.exec(original) ?? m) : m;
      rule.apply(src, out, { today });
      cut(m.index, m.index + m[0].length, rule.kind);
    }
  }

  const tags: string[] = [];
  original = original.replace(TAG_RE, (full, tag: string) => {
    tags.push(tag.toLowerCase());
    out.tokens.push({ text: full.trim(), kind: 'tag' });
    return ' ';
  });
  out.tags = tags;
  out.title = original.replace(/\s+/g, ' ').trim();
  return out;
}
