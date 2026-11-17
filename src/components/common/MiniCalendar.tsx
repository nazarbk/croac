import { addDays, MONTHS, startOfWeek, WEEKDAYS, WEEKDAYS_LETTER, type DateStr } from '../../domain/dates';
import { cn } from '../../lib/cn';

/** Calendario compacto de varias semanas con selección múltiple de días. */
export function MiniCalendar({ today, selected, onToggle, weeks = 5 }: {
  today: DateStr;
  selected: DateStr[];
  onToggle: (d: DateStr) => void;
  weeks?: number;
}) {
  const start = startOfWeek(today, 1);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const first = days[0];
  const last = days[days.length - 1];
  const monthLabel = (d: DateStr) => MONTHS[Number(d.slice(5, 7)) - 1];
  const title = monthLabel(first) === monthLabel(last) ? monthLabel(first) : `${monthLabel(first)} – ${monthLabel(last)}`;

  return (
    <div>
      <div className="text-sm font-semibold capitalize mb-2">{title}</div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Elige los días">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d} className="text-[11px] font-semibold text-muted pb-1" aria-hidden="true">{WEEKDAYS_LETTER[d]}</div>
        ))}
        {days.map((d) => {
          const past = d < today;
          const on = selected.includes(d);
          const isToday = d === today;
          const dayNum = Number(d.slice(8, 10));
          return (
            <button
              key={d}
              type="button"
              disabled={past}
              aria-pressed={on}
              aria-label={`${WEEKDAYS[new Date(`${d}T12:00:00`).getDay()]} ${dayNum} de ${monthLabel(d)}`}
              onClick={() => onToggle(d)}
              className={cn(
                'aspect-square max-h-11 rounded-xl text-sm tabular-nums transition-colors',
                past && 'text-muted/40 cursor-not-allowed',
                !past && !on && 'hover:bg-surface-2',
                on && 'bg-lily text-on-lily font-semibold shadow-card',
                isToday && !on && 'ring-2 ring-lily/50 font-semibold text-lily-strong',
              )}
            >
              {dayNum === 1 ? <span className="text-[11px] leading-none">{dayNum}<br />{monthLabel(d).slice(0, 3)}</span> : dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}
