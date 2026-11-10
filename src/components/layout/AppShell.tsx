import { useMemo, useState, type ReactNode } from 'react';
import { href, navigate, useRoute, type RouteName } from '../../lib/router';
import { cn } from '../../lib/cn';
import { useApp, useToday } from '../../store/appStore';
import { ui, useUi } from '../../store/uiStore';
import { useFrogInfo, useTodayGroups } from '../../store/selectors';
import { Logo } from '../brand/Logo';
import { QuickAdd } from '../tasks/QuickAdd';
import { Modal } from '../ui/Modal';
import { Menu } from '../ui/controls';
import { FrogBar, FrogPanel } from '../frog/FrogStatus';
import { Coin, Icon, type IconName } from '../ui/Icon';
import { IconButton } from '../ui/Button';
import { ListModal } from './ListModal';
import { NotificationsPanel } from './NotificationsPanel';

function NavLink({ to, icon, label, count, active, params, accent, trailing }: {
  to: RouteName; icon?: IconName; label: string; count?: number; active: boolean;
  params?: Record<string, string>; accent?: ReactNode; trailing?: ReactNode;
}) {
  return (
    <a
      href={href(to, params)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 h-10 px-3 rounded-xl text-[15px] transition-colors',
        active ? 'bg-lily-soft text-lily-strong font-semibold' : 'text-ink/80 hover:text-ink hover:bg-surface-2',
      )}
    >
      {accent ?? (icon && <Icon name={icon} size={18} className={active ? '' : 'text-muted'} />)}
      <span className="flex-1 truncate">{label}</span>
      {!!count && <span className={cn('text-xs tabular-nums font-semibold', active ? '' : 'text-muted')}>{count}</span>}
      {trailing}
    </a>
  );
}

function Sidebar() {
  const route = useRoute();
  const lists = useApp((s) => s.lists);
  const tasks = useApp((s) => s.tasks);
  const coins = useApp((s) => s.frog.coins);
  const { due, overdue } = useTodayGroups();
  const info = useFrogInfo();
  const [listModal, setListModal] = useState(false);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (t.status !== 'done') m.set(t.listId, (m.get(t.listId) ?? 0) + 1);
    return m;
  }, [tasks]);
  const currentList = route.name === 'tareas' ? route.params.get('lista') : null;

  return (
    <aside className="hidden lg:flex flex-col w-[17rem] shrink-0 sticky top-0 h-dvh py-6 pl-5 pr-3 border-r border-line/70 bg-surface/40 backdrop-blur-sm">
      <a href={href('hoy')} className="flex items-center px-2 mb-6 rounded-xl" aria-label="Croac, ir a Hoy">
        <Logo />
      </a>
      <button
        type="button"
        onClick={() => ui.openEditor(null)}
        className="mb-5 h-11 px-4 rounded-xl bg-lily bg-primary-grad text-on-lily font-semibold flex items-center gap-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_1px_2px_rgb(0_0_0/0.15)] hover:brightness-105"
      >
        <Icon name="plus" size={18} strokeWidth={2.5} />Nueva tarea
        <kbd className="ml-auto text-[11px] font-semibold px-1.5 h-5 inline-flex items-center rounded-md bg-on-lily/15">N</kbd>
      </button>
      <nav className="flex flex-col gap-1" aria-label="Principal">
        <NavLink to="hoy" icon="sun" label="Hoy" count={due.length + overdue.length} active={route.name === 'hoy'} />
        <NavLink to="proximo" icon="calendar" label="Próximo" active={route.name === 'proximo'} />
        <NavLink to="tareas" icon="list" label="Todas las tareas" active={route.name === 'tareas' && !currentList} />
      </nav>
      <div className="flex items-center justify-between mt-7 mb-1.5 pl-3">
        <span className="text-[13px] font-semibold text-muted">Listas</span>
        <IconButton icon="plus" label="Nueva lista" size={16} className="w-8 h-8" onClick={() => setListModal(true)} />
      </div>
      <nav className="flex flex-col gap-1 overflow-y-auto scrollbar-none -mr-3 pr-3 pb-2" aria-label="Listas">
        {lists.map((l) => (
          <NavLink
            key={l.id} to="tareas" params={{ lista: l.id }} label={l.name} count={counts.get(l.id)}
            active={currentList === l.id}
            accent={<span className="w-[18px] text-center text-base leading-none">{l.emoji}</span>}
          />
        ))}
      </nav>
      <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-line">
        <NavLink to="rana" icon="leaf" label={`Mi rana · ${info.frog.name}`} active={route.name === 'rana'} />
        <NavLink
          to="tienda" icon="bag" label="Tienda" active={route.name === 'tienda'}
          trailing={<span className="flex items-center gap-1 text-xs font-semibold tabular-nums"><Coin size={14} />{coins}</span>}
        />
        <NavLink to="estadisticas" icon="chart" label="Estadísticas" active={route.name === 'estadisticas'} />
        <NavLink to="ajustes" icon="settings" label="Ajustes" active={route.name === 'ajustes'} />
      </div>
      <ListModal open={listModal} onClose={() => setListModal(false)} />
    </aside>
  );
}

const MOBILE_TABS: { to: RouteName; icon: IconName; label: string }[] = [
  { to: 'hoy', icon: 'sun', label: 'Hoy' },
  { to: 'proximo', icon: 'calendar', label: 'Próximo' },
  { to: 'tareas', icon: 'list', label: 'Tareas' },
  { to: 'rana', icon: 'leaf', label: 'Rana' },
  { to: 'tienda', icon: 'bag', label: 'Tienda' },
];

function BottomNav() {
  const route = useRoute();
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)]"
      aria-label="Principal"
    >
      <div className="grid grid-cols-5 h-16">
        {MOBILE_TABS.map((t) => {
          const active = route.name === t.to;
          return (
            <a key={t.to} href={href(t.to)} aria-current={active ? 'page' : undefined}
              className={cn('flex flex-col items-center justify-center gap-1 text-[11px] font-semibold', active ? 'text-lily-strong' : 'text-muted')}>
              <span className={cn('w-14 h-8 rounded-full flex items-center justify-center transition-colors', active && 'bg-lily-soft')}>
                <Icon name={t.icon} size={20} />
              </span>
              {t.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function Bell() {
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  return (
    <div className="relative">
      <IconButton icon="bell" label="Avisos" onClick={() => ui.setNotificationsOpen(true)} />
      {unread > 0 && (
        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white dark:text-[#2a0906] text-[10px] font-bold flex items-center justify-center pointer-events-none ring-2 ring-bg">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  );
}

/** Botón flotante + hoja de entrada rápida (móvil y tablet). */
function MobileQuickAdd() {
  const open = useUi((s) => s.quickAddOpen);
  const route = useRoute();
  const today = useToday();
  const listId = route.name === 'tareas' ? route.params.get('lista') ?? undefined : undefined;
  const defaultDate = route.name === 'tareas' ? null : today;
  return (
    <>
      <button
        type="button"
        onClick={() => ui.setQuickAdd(true)}
        aria-label="Nueva tarea"
        className="lg:hidden fixed z-40 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] w-14 h-14 rounded-2xl bg-lily bg-primary-grad text-on-lily flex items-center justify-center shadow-float active:scale-95 transition-transform"
      >
        <Icon name="plus" size={26} strokeWidth={2.5} />
      </button>
      <Modal open={open} onClose={() => ui.setQuickAdd(false)} title="Nueva tarea" size="md">
        <QuickAdd autoFocus defaultDate={defaultDate} listId={listId} onAdded={() => ui.setQuickAdd(false)} onMore={() => ui.setQuickAdd(false)} />
        <p className="text-[13px] text-muted mt-3 leading-relaxed">
          Puedes escribir la fecha, la hora, la repetición, la prioridad (p1–p4), la lista (#lista) y etiquetas (@etiqueta) en la misma frase.
        </p>
      </Modal>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const notifOpen = useUi((s) => s.notificationsOpen);
  useToday();
  return (
    <div className="min-h-dvh flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Cabecera compacta: móvil y escritorio sin panel lateral */}
        <header className="xl:hidden sticky top-0 z-30 bg-bg/85 backdrop-blur-xl px-4 sm:px-6 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 border-b border-line/70">
          <div className="max-w-2xl mx-auto">
            <FrogBar right={
              <div className="flex items-center -mr-2">
                <Bell />
                <div className="lg:hidden">
                  <Menu
                    title="Más"
                    trigger={(p) => <IconButton icon="menu" label="Más opciones" {...p} />}
                    items={[
                      { label: 'Estadísticas', icon: 'chart', onSelect: () => navigate('estadisticas') },
                      { label: 'Ajustes', icon: 'settings', onSelect: () => navigate('ajustes') },
                    ]}
                  />
                </div>
              </div>
            } />
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-10 pt-6 lg:pt-10 pb-36 lg:pb-14">
          <div className="max-w-2xl mx-auto">{children}</div>
        </main>
      </div>
      <FrogPanel bell={<Bell />} />
      <BottomNav />
      <MobileQuickAdd />
      <NotificationsPanel open={notifOpen} onClose={() => ui.setNotificationsOpen(false)} />
    </div>
  );
}
