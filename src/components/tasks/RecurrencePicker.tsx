import { useState } from 'react';
import { dayOfMonth, weekday, WEEKDAYS, WEEKDAYS_LETTER, type DateStr } from '../../domain/dates';
import { describeRecurrence, WORKDAYS, type Recurrence, type Weekday } from '../../domain/recurrence';
import { cn } from '../../lib/cn';
import { inputClass } from '../ui/controls';

/**
 * Modo que ve el usuario. Se guarda aparte del valor para que elegir
 * «Ciertos días» o «Personalizado» no salte a otra opción al cambiar los días.
 */
type Mode = 'none' | 'daily' | 'weekdays' | 'monthly' | 'custom';

function modeOf(r: Recurrence): Mode {
  if (r.type === 'none') return 'none';
  if (r.interval !== 1) return 'custom';
  if (r.type === 'daily') return 'daily';
  if (r.type === 'weekly') return 'weekdays';
  return 'monthly';
}

const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const WEEKEND: Weekday[] = [6, 0];
const ALL: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

const same = (a: Weekday[], b: Weekday[]) => a.length === b.length && a.every((d) => b.includes(d));

/** Botones L M X J V S D para elegir los días. Siempre queda al menos uno. */
function DayToggles({ days, onChange }: { days: Weekday[]; onChange: (d: Weekday[]) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Días de la semana">
      {ORDER.map((d) => {
        const on = days.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            aria-label={WEEKDAYS[d]}
            title={WEEKDAYS[d]}
            onClick={() => {
              const next = on ? days.filter((x) => x !== d) : [...days, d];
              if (next.length) onChange(next);
            }}
            className={cn(
              'aspect-square max-h-11 w-full rounded-full text-sm font-semibold transition-colors',
              on ? 'bg-lily text-on-lily shadow-card' : 'bg-surface border border-line text-muted hover:text-ink hover:border-lily/50',
            )}
          >
            {WEEKDAYS_LETTER[d]}
          </button>
        );
      })}
    </div>
  );
}

function QuickDays({ days, onChange }: { days: Weekday[]; onChange: (d: Weekday[]) => void }) {
  const chips: { label: string; value: Weekday[] }[] = [
    { label: 'Laborables', value: WORKDAYS },
    { label: 'Fin de semana', value: WEEKEND },
    { label: 'Todos', value: ALL },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => onChange([...c.value])}
          className={cn(
            'h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors',
            same(days, c.value) ? 'bg-lily-soft border-lily/40 text-lily-strong' : 'border-line text-muted hover:text-ink',
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function RecurrencePicker({ value, onChange, date }: { value: Recurrence; onChange: (r: Recurrence) => void; date: DateStr }) {
  const [mode, setMode] = useState<Mode>(() => modeOf(value));
  const [intervalText, setIntervalText] = useState(() => String(value.type === 'none' ? 2 : Math.max(2, value.interval)));
  const wd = weekday(date) as Weekday;
  const interval = value.type === 'none' ? 1 : value.interval;
  const days = value.type === 'weekly' ? value.days : [wd];

  const changeMode = (m: Mode) => {
    setMode(m);
    switch (m) {
      case 'none':
        return onChange({ type: 'none' });
      case 'daily':
        return onChange({ type: 'daily', interval: 1 });
      case 'weekdays':
        return onChange({ type: 'weekly', interval: 1, days: value.type === 'weekly' ? value.days : [wd] });
      case 'monthly':
        return onChange({ type: 'monthly', interval: 1, dayOfMonth: value.type === 'monthly' ? value.dayOfMonth : dayOfMonth(date) });
      case 'custom': {
        const n = Math.max(2, Number(intervalText) || 2);
        setIntervalText(String(n));
        if (value.type === 'daily' || value.type === 'monthly') return onChange({ ...value, interval: n });
        return onChange({ type: 'weekly', interval: n, days });
      }
    }
  };

  const setInterval = (text: string) => {
    setIntervalText(text);
    const n = Math.floor(Number(text));
    if (n >= 1 && n <= 99 && value.type !== 'none') onChange({ ...value, interval: n } as Recurrence);
  };

  const unit = value.type === 'none' ? 'weekly' : value.type;

  return (
    <div className="space-y-3">
      <select className={inputClass} value={mode} onChange={(e) => changeMode(e.target.value as Mode)} aria-label="Repetir">
        <option value="none">No se repite</option>
        <option value="daily">Cada día</option>
        <option value="weekdays">Ciertos días de la semana</option>
        <option value="monthly">Cada mes</option>
        <option value="custom">Personalizado</option>
      </select>

      {mode === 'weekdays' && value.type === 'weekly' && (
        <div className="space-y-2.5">
          <DayToggles days={value.days} onChange={(d) => onChange({ ...value, days: d })} />
          <QuickDays days={value.days} onChange={(d) => onChange({ ...value, days: d })} />
        </div>
      )}

      {mode === 'monthly' && value.type === 'monthly' && (
        <MonthDay value={value.dayOfMonth} onChange={(n) => onChange({ ...value, dayOfMonth: n })} />
      )}

      {mode === 'custom' && value.type !== 'none' && (
        <div className="rounded-xl border border-line p-3 space-y-3 bg-surface-2/60">
          <div className="flex items-center gap-2 text-sm">
            <span className="shrink-0">Cada</span>
            <div className="w-18 shrink-0">
              <input
                type="number" inputMode="numeric" min={1} max={99}
                value={intervalText}
                onChange={(e) => setInterval(e.target.value)}
                onBlur={() => setIntervalText(String(interval))}
                className={cn(inputClass, 'h-10 px-2 text-center')} aria-label="Cada cuántos"
              />
            </div>
            <select
              className={cn(inputClass, 'flex-1 min-w-0 h-10')} value={unit} aria-label="Unidad"
              onChange={(e) => {
                const u = e.target.value as 'daily' | 'weekly' | 'monthly';
                if (u === 'daily') onChange({ type: 'daily', interval });
                if (u === 'weekly') onChange({ type: 'weekly', interval, days });
                if (u === 'monthly') onChange({ type: 'monthly', interval, dayOfMonth: dayOfMonth(date) });
              }}
            >
              <option value="daily">{interval === 1 ? 'día' : 'días'}</option>
              <option value="weekly">{interval === 1 ? 'semana' : 'semanas'}</option>
              <option value="monthly">{interval === 1 ? 'mes' : 'meses'}</option>
            </select>
          </div>
          {value.type === 'weekly' && <DayToggles days={value.days} onChange={(d) => onChange({ ...value, days: d })} />}
          {value.type === 'monthly' && <MonthDay value={value.dayOfMonth} onChange={(n) => onChange({ ...value, dayOfMonth: n })} />}
        </div>
      )}

      {value.type !== 'none' && (
        <p className="text-[13px] text-lily-strong font-medium">{describeRecurrence(value)}</p>
      )}
    </div>
  );
}

function MonthDay({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <span>El día</span>
      <div className="w-18 shrink-0">
        <input
          type="number" inputMode="numeric" min={1} max={31} value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = Math.floor(Number(e.target.value));
            if (n >= 1 && n <= 31) onChange(n);
          }}
          onBlur={() => setText(String(value))}
          className={cn(inputClass, 'h-10 px-2 text-center')} aria-label="Día del mes"
        />
      </div>
      <span className="text-muted text-[13px]">de cada mes (si el mes es más corto, el último día)</span>
    </div>
  );
}
