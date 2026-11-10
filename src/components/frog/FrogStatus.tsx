import type { Mood } from '../../domain/engine';
import { href } from '../../lib/router';
import { useFrogInfo, useTodayGroups } from '../../store/selectors';
import { useApp } from '../../store/appStore';
import { useUi } from '../../store/uiStore';
import { Coin, Icon } from '../ui/Icon';
import { ProgressBar } from '../ui/controls';
import { Frog } from './Frog';
import { cn } from '../../lib/cn';

export function moodMessage(mood: Mood, name: string, pending: number): string {
  switch (mood) {
    case 'happy': return `¡Día redondo! ${name} está feliz.`;
    case 'worried': return `${name} está inquieta: hay tareas de ayer sin hacer. Complétalas hoy para no perder XP.`;
    case 'sad': return `${name} está triste: hay tareas atrasadas que le restan XP cada día.`;
    case 'sleeping': return `Modo vacaciones: ${name} descansa y no hay penalizaciones.`;
    default: return pending > 0 ? `${name} te acompaña. ${pending === 1 ? 'Queda 1 tarea' : `Quedan ${pending} tareas`} para hoy.` : `${name} está tranquila. Añade algo para hoy o disfruta del día.`;
  }
}

/** Panel lateral con la rana (escritorio grande). */
export function FrogPanel({ bell }: { bell?: React.ReactNode }) {
  const info = useFrogInfo();
  const hop = useUi((s) => s.hop);
  const { due, overdue } = useTodayGroups();
  const equipped = useApp((s) => s.frog.equipped);
  return (
    <aside className="hidden xl:flex flex-col w-[340px] shrink-0 sticky top-0 h-dvh py-6 pr-6">
      <div className="rounded-[1.75rem] bg-surface border border-line shadow-card overflow-hidden">
        <div className="relative">
          <a href={href('rana')} className="block aspect-square" aria-label={`Ver a ${info.frog.name}`}>
            <Frog level={info.level} mood={info.mood} equipped={equipped} scene hopKey={hop} className="w-full h-full" title={`${info.frog.name}, ${info.stage.name}`} />
          </a>
          {bell && <div className="absolute top-3 right-3 rounded-xl bg-raised/85 backdrop-blur shadow-card">{bell}</div>}
        </div>
        <div className="p-5 pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="font-display text-xl font-bold leading-tight">{info.frog.name}</div>
              <div className="text-sm text-muted">{info.stage.name} · nivel {info.level}</div>
            </div>
            <div className="flex items-center gap-1.5 font-bold tabular-nums text-[15px]" title="Monedas">
              <Coin size={18} />{info.frog.coins}
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={info.progress} tone="xp" className="h-2.5" label="Experiencia" />
            <div className="flex justify-between text-xs text-muted mt-1.5 tabular-nums">
              <span>{info.into} / {info.needed} XP</span>
              <span>{info.next ? `Evoluciona en el nivel ${info.next.minLevel}` : 'Etapa final'}</span>
            </div>
          </div>
          <p className={cn('mt-4 text-sm leading-relaxed', info.mood === 'sad' ? 'text-danger' : info.mood === 'worried' ? 'text-warn' : 'text-muted')}>
            {moodMessage(info.mood, info.frog.name, due.length + overdue.length)}
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-xl bg-warn-soft text-warn font-semibold">
              <Icon name="flame" size={15} />{info.streak.current} {info.streak.current === 1 ? 'día' : 'días'}
            </span>
            <span className="text-muted">de racha · mejor: {info.streak.best}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Barra compacta con la rana para móvil y escritorio mediano. */
export function FrogBar({ right }: { right?: React.ReactNode }) {
  const info = useFrogInfo();
  const hop = useUi((s) => s.hop);
  const equipped = useApp((s) => s.frog.equipped);
  return (
    <div className="flex items-center gap-3">
      <a href={href('rana')} className="shrink-0 w-12 h-12 rounded-2xl bg-lily-soft border border-lily/20 overflow-hidden" aria-label={`Ver a ${info.frog.name}`}>
        <Frog level={info.level} mood={info.mood} equipped={{ ...equipped, background: undefined }} hopKey={hop} className="w-full h-full scale-110 translate-y-0.5" />
      </a>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="font-semibold truncate">{info.frog.name} <span className="text-muted font-normal">· nivel {info.level}</span></span>
          <span className="flex items-center gap-3 shrink-0 font-semibold tabular-nums">
            <span className="flex items-center gap-1 text-warn"><Icon name="flame" size={14} />{info.streak.current}</span>
            <span className="flex items-center gap-1"><Coin size={15} />{info.frog.coins}</span>
          </span>
        </div>
        <ProgressBar value={info.progress} tone="xp" className="mt-2 h-2" label="Experiencia" />
      </div>
      {right}
    </div>
  );
}
