import { dayOfMonth, weekday, WEEKDAYS_LETTER, WEEKDAYS, type DateStr } from '../../domain/dates';
import { WORKDAYS, type Recurrence, type Weekday } from '../../domain/recurrence';
import { cn } from '../../lib/cn';
import { inputClass } from '../ui/controls';

type Preset = 'none' | 'daily' | 'workdays' | 'weekly' | 'monthly' | 'custom';

function presetOf(r: Recurrence): Preset {
  if (r.type === 'none') return 'none';
  if (r.type === 'daily' && r.interval === 1) return 'daily';
  if (r.type === 'weekly' && r.interval === 1 && r.days.length === 5 && WORKDAYS.every((d) => r.days.includes(d))) return 'workdays';
  if (r.type === 'weekly' && r.interval === 1 && r.days.length === 1) return 'weekly';
  if (r.type === 'monthly' && r.interval === 1) return 'monthly';
  return 'custom';
}

const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function RecurrencePicker({ value, onChange, date }: { value: Recurrence; onChange: (r: Recurrence) => void; date: DateStr }) {
  const preset = presetOf(value);
  const wd = weekday(date) as Weekday;

  const setPreset = (p: Preset) => {
    switch (p) {
      case 'none': return onChange({ type: 'none' });
      case 'daily': return onChange({ type: 'daily', interval: 1 });
      case 'workdays': return onChange({ type: 'weekly', interval: 1, days: [...WORKDAYS] });
      case 'weekly': return onChange({ type: 'weekly', interval: 1, days: [wd] });
      case 'monthly': return onChange({ type: 'monthly', interval: 1, dayOfMonth: dayOfMonth(date) });
      case 'custom': return onChange(value.type === 'none' ? { type: 'weekly', interval: 1, days: [wd] } : { ...value, interval: Math.max(1, value.interval) } as Recurrence);
    }
  };

  const unit = value.type === 'none' ? 'weekly' : value.type;
  const interval = value.type === 'none' ? 1 : value.interval;

  return (
    <div className="space-y-3">
      <select className={inputClass} value={preset} onChange={(e) => setPreset(e.target.value as Preset)} aria-label="Repetir">
        <option value="none">No se repite</option>
        <option value="daily">Cada día</option>
        <option value="workdays">Días laborables (L–V)</option>
        <option value="weekly">Cada semana, el {WEEKDAYS[wd]}</option>
        <option value="monthly">Cada mes, el día {dayOfMonth(date)}</option>
        <option value="custom">Personalizado…</option>
      </select>

      {preset === 'custom' && value.type !== 'none' && (
        <div className="rounded-xl border border-line p-3 space-y-3 bg-surface-2/50">
          <div className="flex items-center gap-2 text-sm">
            <span>Cada</span>
            <input
              type="number" min={1} max={99} value={interval}
              onChange={(e) => onChange({ ...value, interval: Math.max(1, Number(e.target.value) || 1) } as Recurrence)}
              className={cn(inputClass, 'w-20 h-9')} aria-label="Intervalo"
            />
            <select
              className={cn(inputClass, 'w-auto h-9')} value={unit} aria-label="Unidad"
              onChange={(e) => {
                const u = e.target.value as 'daily' | 'weekly' | 'monthly';
                if (u === 'daily') onChange({ type: 'daily', interval });
                if (u === 'weekly') onChange({ type: 'weekly', interval, days: [wd] });
                if (u === 'monthly') onChange({ type: 'monthly', interval, dayOfMonth: dayOfMonth(date) });
              }}
            >
              <option value="daily">{interval === 1 ? 'día' : 'días'}</option>
              <option value="weekly">{interval === 1 ? 'semana' : 'semanas'}</option>
              <option value="monthly">{interval === 1 ? 'mes' : 'meses'}</option>
            </select>
          </div>
          {value.type === 'weekly' && (
            <div className="flex gap-1.5" role="group" aria-label="Días de la semana">
              {ORDER.map((d) => {
                const on = value.days.includes(d);
                return (
                  <button
                    key={d} type="button" aria-pressed={on} title={WEEKDAYS[d]}
                    onClick={() => {
                      const days = on ? value.days.filter((x) => x !== d) : [...value.days, d];
                      if (days.length) onChange({ ...value, days });
                    }}
                    className={cn('w-9 h-9 rounded-full text-sm font-semibold transition-colors', on ? 'bg-lily text-on-lily' : 'bg-surface border border-line text-muted hover:text-ink')}
                  >
                    {WEEKDAYS_LETTER[d]}
                  </button>
                );
              })}
            </div>
          )}
          {value.type === 'monthly' && (
            <div className="flex items-center gap-2 text-sm">
              <span>El día</span>
              <input
                type="number" min={1} max={31} value={value.dayOfMonth}
                onChange={(e) => onChange({ ...value, dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                className={cn(inputClass, 'w-20 h-9')} aria-label="Día del mes"
              />
              <span className="text-muted">(en meses más cortos, el último día)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
