import { useMemo, useRef, useState } from 'react';
import { addDays, diffDays } from '../domain/dates';
import type { Task } from '../domain/types';
import { QuickAdd } from '../components/tasks/QuickAdd';
import { SortMenu } from '../components/tasks/SortMenu';
import { ListModal } from '../components/layout/ListModal';
import { Button } from '../components/ui/Button';
import { EmptyState, inputClass, Segmented } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { cn } from '../lib/cn';
import { href, navigate, useRoute } from '../lib/router';
import { useApp, useToday } from '../store/appStore';
import { useListsById, useStreaks, useTaskCompare } from '../store/selectors';
import { Section, TaskGroup } from './TodayPage';

type Filter = 'pendientes' | 'en-proceso' | 'completadas';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function TasksPage() {
  const route = useRoute();
  const listId = route.params.get('lista');
  const filter = (route.params.get('estado') as Filter) || 'pendientes';
  const today = useToday();
  const tasks = useApp((s) => s.tasks);
  const lists = useApp((s) => s.lists);
  const grace = useApp((s) => s.settings.graceDays);
  const byId = useListsById();
  const streaks = useStreaks();
  const list = listId ? byId.get(listId) : undefined;
  const [query, setQuery] = useState('');
  const [editList, setEditList] = useState(false);
  const [newList, setNewList] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const compare = useTaskCompare();

  const setFilter = (f: Filter) => navigate('tareas', { ...(listId ? { lista: listId } : {}), ...(f !== 'pendientes' ? { estado: f } : {}) });

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return tasks.filter((t) => {
      if (listId && t.listId !== listId) return false;
      if (filter === 'pendientes' && t.status === 'done') return false;
      if (filter === 'en-proceso' && t.status !== 'in_progress') return false;
      if (filter === 'completadas' && t.status !== 'done') return false;
      if (q && !fold(`${t.title} ${t.notes} ${t.tags.join(' ')}`).includes(q)) return false;
      return true;
    });
  }, [tasks, listId, filter, query]);

  const groups = useMemo(() => {
    if (filter === 'completadas') {
      return [{ key: 'done', title: 'Completadas', sortable: false, items: [...visible].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)) }];
    }
    const week = addDays(today, 7);
    // En los grupos con varias fechas manda la fecha; ahí no se puede arrastrar.
    const buckets: { key: string; title: string; byDate: boolean; test: (t: Task) => boolean }[] = [
      { key: 'overdue', title: 'Atrasadas', byDate: false, test: (t) => !!t.dueDate && t.dueDate < today },
      { key: 'today', title: 'Hoy', byDate: false, test: (t) => t.dueDate === today },
      { key: 'week', title: 'Próximos 7 días', byDate: true, test: (t) => !!t.dueDate && t.dueDate > today && t.dueDate <= week },
      { key: 'later', title: 'Más adelante', byDate: true, test: (t) => !!t.dueDate && t.dueDate > week },
      { key: 'someday', title: 'Sin fecha', byDate: false, test: (t) => !t.dueDate },
    ];
    return buckets
      .map((b) => ({
        key: b.key,
        title: b.title,
        sortable: !b.byDate,
        items: visible.filter(b.test).sort((a, b2) =>
          b.byDate && a.dueDate && b2.dueDate && a.dueDate !== b2.dueDate ? diffDays(a.dueDate, b2.dueDate) : compare(a, b2)),
      }))
      .filter((g) => g.items.length);
  }, [visible, filter, today, compare]);

  return (
    <div>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight truncate">
            {list ? <><span className="mr-2">{list.emoji}</span>{list.name}</> : 'Todas las tareas'}
          </h1>
          <p className="text-muted mt-1.5">{list ? 'Tareas de esta lista' : 'Todo lo que tienes apuntado, en un mismo sitio.'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <SortMenu />
          {list && <Button size="sm" icon="edit" onClick={() => setEditList(true)}><span className="hidden sm:inline">Editar lista</span><span className="sm:hidden">Editar</span></Button>}
        </div>
      </header>

      {/* Selector de listas en móvil (en escritorio está en la barra lateral) */}
      <div className="lg:hidden -mx-4 px-4 mt-4 flex gap-2 overflow-x-auto scrollbar-none">
        <a href={href('tareas')} className={cn('shrink-0 h-8 px-3 rounded-full text-sm font-medium flex items-center border', !listId ? 'bg-lily text-on-lily border-lily' : 'border-line bg-surface')}>Todas</a>
        {lists.map((l) => (
          <a key={l.id} href={href('tareas', { lista: l.id })}
            className={cn('shrink-0 h-8 px-3 rounded-full text-sm font-medium flex items-center gap-1.5 border', listId === l.id ? 'bg-lily text-on-lily border-lily' : 'border-line bg-surface')}>
            <span>{l.emoji}</span>{l.name}
          </a>
        ))}
        <button type="button" onClick={() => setNewList(true)} className="shrink-0 h-8 px-3 rounded-full text-sm font-medium flex items-center gap-1 border border-dashed border-line text-muted">
          <Icon name="plus" size={14} />Lista
        </button>
      </div>

      <div className="mt-5 hidden lg:block">
        <QuickAdd listId={listId ?? undefined} defaultDate={null} placeholder={list ? `Añadir a ${list.name}` : undefined} />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pendientes', label: 'Pendientes' },
            { value: 'en-proceso', label: 'En proceso' },
            { value: 'completadas', label: 'Completadas' },
          ]}
        />
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            id="task-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className={cn(inputClass, 'pl-9 h-10')}
            aria-label="Buscar tareas"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState title={query ? 'Sin resultados' : filter === 'completadas' ? 'Aún no hay tareas completadas' : filter === 'en-proceso' ? 'Nada en proceso' : 'No hay tareas aquí'}>
          {query ? `No hay tareas que contengan "${query}".` : filter === 'en-proceso' ? 'Marca una tarea "en proceso" desde su menú para verla aquí.' : 'Escribe arriba para añadir la primera.'}
        </EmptyState>
      ) : (
        groups.map((g) => (
          <Section key={g.key} title={g.title} count={g.items.length} tone={g.key === 'overdue' ? 'warn' : undefined}>
            <TaskGroup tasks={g.items} today={today} lists={byId} streaks={streaks} graceDays={grace} showList={!listId} sortable={g.sortable && !query} />
          </Section>
        ))
      )}
      <ListModal open={editList} onClose={() => setEditList(false)} list={list} />
      <ListModal open={newList} onClose={() => setNewList(false)} />
    </div>
  );
}
