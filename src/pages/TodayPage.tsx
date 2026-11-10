import { useMemo, useState, type ReactNode } from 'react';
import { capitalize, formatLong, type DateStr } from '../domain/dates';
import type { Task, TaskList } from '../domain/types';
import { LilyCheck, TaskItem } from '../components/tasks/TaskItem';
import { QuickAdd } from '../components/tasks/QuickAdd';
import { SortableList } from '../components/tasks/Sortable';
import { SortMenu } from '../components/tasks/SortMenu';
import { Frog } from '../components/frog/Frog';
import { InstallBanner } from '../features/install';
import { EmptyState } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { actions } from '../store/actions';
import { useApp, useToday } from '../store/appStore';
import { useFrogInfo, useListsById, useStreaks, useTodayGroups } from '../store/selectors';
import { cn } from '../lib/cn';

export function Section({ title, count, children, aside, tone }: { title: ReactNode; count?: number; children: ReactNode; aside?: ReactNode; tone?: 'danger' | 'warn' }) {
  return (
    <section className="mt-8 first:mt-6">
      <div className="flex items-center justify-between gap-3 px-1 mb-3 min-h-8">
        <h2 className={cn('font-display text-lg font-bold leading-none', tone === 'danger' && 'text-danger', tone === 'warn' && 'text-warn')}>
          {title}{count !== undefined && <span className="ml-2 text-sm font-semibold text-muted tabular-nums">{count}</span>}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Lista de tareas reordenable arrastrando. */
export function TaskGroup({ tasks, today, lists, streaks, graceDays, showDate = true, showList = true, sortable = true }: {
  tasks: Task[];
  /** false en grupos ordenados por fecha, donde arrastrar no tendría efecto. */
  sortable?: boolean;
  today: DateStr;
  lists: Map<string, TaskList>;
  streaks: Map<string, number>;
  graceDays: number;
  showDate?: boolean;
  showList?: boolean;
}) {
  return (
    <SortableList
      items={tasks}
      getId={(t) => t.id}
      getLabel={(t) => t.title}
      onReorder={actions.reorder}
      disabled={!sortable}
      className="flex flex-col gap-2"
    >
      {(t, handle, { dragging }) => (
        <TaskItem
          task={t} today={today} list={lists.get(t.listId)} streak={streaks.get(t.id)} graceDays={graceDays}
          showDate={showDate} showList={showList} handle={handle} dragging={dragging}
        />
      )}
    </SortableList>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="relative w-14 h-14 shrink-0" title={`${done} de ${total} hechas hoy`} aria-label={`${done} de ${total} tareas hechas hoy`} role="img">
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--lily)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums">{done}/{total}</span>
    </div>
  );
}

export function TodayPage() {
  const today = useToday();
  const { overdue, due, penalized } = useTodayGroups();
  const lists = useListsById();
  const streaks = useStreaks();
  const grace = useApp((s) => s.settings.graceDays);
  const vacation = useApp((s) => s.settings.vacationMode);
  const history = useApp((s) => s.history);
  const info = useFrogInfo();
  const [showDone, setShowDone] = useState(true);

  const completedToday = useMemo(
    () => history.filter((h) => h.type === 'complete' && h.date === today).reverse(),
    [history, today],
  );
  const total = due.length + overdue.length + completedToday.length;
  const group = { today, lists, streaks, graceDays: grace };

  return (
    <div>
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Hoy</h1>
          <p className="text-muted mt-2">{capitalize(formatLong(today))}</p>
        </div>
        <div className="flex items-center gap-2">
          {(due.length + overdue.length > 1) && <SortMenu />}
          {total > 0 && <ProgressRing done={completedToday.length} total={total} />}
        </div>
      </header>

      <div className="mt-6 hidden lg:block">
        <QuickAdd defaultDate={today} />
      </div>

      <InstallBanner />

      {penalized.length > 0 && !vacation && (
        <div className="mt-6 flex gap-3 items-start rounded-2xl bg-danger-soft text-danger border border-danger/20 p-4">
          <Icon name="alert" size={20} className="shrink-0 mt-0.5" />
          <p className="text-[15px] leading-snug">
            <strong>{penalized.length === 1 ? 'Una tarea lleva' : `${penalized.length} tareas llevan`} más de {grace === 1 ? 'un día' : `${grace} días`} sin completarse.</strong>{' '}
            Cada día que pasa, {info.frog.name} pierde experiencia. Complétalas o muévelas a otra fecha.
          </p>
        </div>
      )}

      {overdue.length > 0 && (
        <Section title="Atrasadas" count={overdue.length} tone={penalized.length ? 'danger' : 'warn'}
          aside={penalized.length === 0 && !vacation ? <span className="text-xs text-muted text-right">Hazlas hoy y no perderás XP</span> : undefined}>
          <TaskGroup tasks={overdue} {...group} />
        </Section>
      )}

      {due.length > 0 && (
        <Section title="Para hoy" count={due.length}>
          <TaskGroup tasks={due} {...group} showDate={false} />
        </Section>
      )}

      {due.length === 0 && overdue.length === 0 && (
        <EmptyState
          art={<Frog level={info.level} mood={completedToday.length ? 'happy' : 'neutral'} equipped={info.frog.equipped} className="w-32 h-32" />}
          title={completedToday.length ? 'Todo hecho por hoy' : 'Nada pendiente para hoy'}
        >
          {completedToday.length
            ? `${info.frog.name} está encantada. Mañana más.`
            : 'Pulsa + para añadir una tarea o revisa lo que tienes en Próximo.'}
        </EmptyState>
      )}

      {completedToday.length > 0 && (
        <Section
          title="Completadas hoy"
          count={completedToday.length}
          aside={
            <button type="button" onClick={() => setShowDone((v) => !v)} className="h-8 px-2.5 -mr-2 rounded-lg text-sm text-muted hover:text-ink hover:bg-surface-2 flex items-center gap-1">
              {showDone ? 'Ocultar' : 'Mostrar'}<Icon name="chevronDown" size={15} className={cn('transition-transform', showDone && 'rotate-180')} />
            </button>
          }
        >
          {showDone && (
            <div className="flex flex-col gap-2">
              {completedToday.map((h) => (
                <div key={h.id} className="flex items-center gap-0.5 pl-1.5 pr-4 py-1 rounded-2xl border border-line bg-surface/60">
                  <LilyCheck priority={4} state="done" label={`Deshacer "${h.title}"`} onClick={() => actions.undoCompletion(h.id)} />
                  <span className="flex-1 min-w-0 text-[15px] line-through text-muted leading-snug py-2">{h.title}</span>
                  <span className="text-xs font-semibold text-lily-strong tabular-nums">+{h.xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
