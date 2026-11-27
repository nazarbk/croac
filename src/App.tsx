import { lazy, Suspense, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { TaskEditor } from './components/tasks/TaskEditor';
import { Toaster } from './components/ui/Toaster';
import { DailyReview } from './features/DailyReview';
import { Celebrations, useGameFeedback } from './features/GameFeedback';
import { Onboarding } from './features/Onboarding';
import { useReminders } from './features/reminders';
import { useShortcuts } from './features/shortcuts';
import { navigate, useRoute, type RouteName } from './lib/router';
import { ui } from './store/uiStore';
import { FrogPage } from './pages/FrogPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShopPage } from './pages/ShopPage';
import { StatsPage } from './pages/StatsPage';
import { TasksPage } from './pages/TasksPage';
import { TodayPage } from './pages/TodayPage';
import { HistoryPage } from './pages/HistoryPage';
import { PondPage } from './pages/PondPage';
import { FriendsPage } from './pages/FriendsPage';
import { AuthModal, NewPasswordModal, SyncConflictModal } from './features/account';
import { useCloudSync } from './services/sync';
import { account } from './services/account';
import { ErrorBoundary } from './features/ErrorBoundary';
import { ScheduleAgain } from './features/ScheduleAgain';
import { WhatsNew } from './features/WhatsNew';
import { NewsPage } from './pages/NewsPage';
import { PatioPage } from './pages/PatioPage';
import { tickClock, useApp } from './store/appStore';
import { startAdminWatch, useAdminStatus } from './services/admin';
import { loadRemoteFit } from './services/appConfig';
import { startPatio } from './services/patio';

/**
 * Probador de complementos (#/admin/probador; también #/dev/wardrobe). Solo lo abre un
 * administrador (lo decide el servidor, ver services/admin.ts) o cualquiera con
 * `npm run dev`. Se carga aparte: el resto de usuarios nunca lo descarga.
 */
const Wardrobe = lazy(() => import('./dev/wardrobe/WardrobePage'));
const WARDROBE_PATHS = ['admin/probador', 'dev/wardrobe'];

const PAGES: Record<RouteName, { title: string; Component: () => React.ReactElement }> = {
  hoy: { title: 'Hoy', Component: TodayPage },
  // Antes «Próximo»: ahora es la vista Calendario de Tareas (se mantiene por los enlaces antiguos).
  proximo: { title: 'Tareas', Component: TasksPage },
  tareas: { title: 'Tareas', Component: TasksPage },
  historial: { title: 'Historial', Component: HistoryPage },
  charca: { title: 'La charca', Component: PondPage },
  amigos: { title: 'Amigos', Component: FriendsPage },
  rana: { title: 'Mi rana', Component: FrogPage },
  tienda: { title: 'Tienda', Component: ShopPage },
  estadisticas: { title: 'Estadísticas', Component: StatsPage },
  ajustes: { title: 'Ajustes', Component: SettingsPage },
  novedades: { title: 'Novedades', Component: NewsPage },
  patio: { title: 'El patio', Component: PatioPage },
};

function useTheme() {
  const theme = useApp((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1418' : '#eef4ef');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

/** Detecta el cambio de día con la app abierta (medianoche, volver de segundo plano…). */
function useClock() {
  useEffect(() => {
    const id = setInterval(tickClock, 30_000);
    const onVisible = () => document.visibilityState === 'visible' && tickClock();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
}

export default function App() {
  const route = useRoute();
  useTheme();
  useClock();
  useGameFeedback();
  useReminders();
  useShortcuts();
  useCloudSync();
  useEffect(() => {
    void account.restore();
    startAdminWatch();
    startPatio();
    void loadRemoteFit();
  }, []);
  const adminStatus = useAdminStatus();

  // Atajo del icono instalado (PWA): #/hoy?nueva=1 abre el editor.
  useEffect(() => {
    if (route.params.get('nueva')) {
      navigate('hoy');
      ui.openEditor(null);
    }
  }, [route]);

  const page = PAGES[route.name];
  useEffect(() => {
    document.title = `${page.title} · Croac`;
    window.scrollTo(0, 0);
  }, [page]);

  if (WARDROBE_PATHS.includes(route.path) && (import.meta.env.DEV || adminStatus !== 'no')) {
    if (import.meta.env.DEV || adminStatus === 'yes') return <Suspense fallback={null}><Wardrobe /></Suspense>;
    // Comprobando con el servidor (o sin conexión): no se enseña nada de administración.
    return <div className="min-h-dvh grid place-items-center text-muted text-sm">{adminStatus === 'error' ? 'No se ha podido comprobar tu cuenta. Revisa la conexión.' : 'Comprobando…'}</div>;
  }

  return (
    <>
      <AppShell>
        <ErrorBoundary key={route.name}>
          <page.Component />
        </ErrorBoundary>
      </AppShell>
      <TaskEditor />
      <Toaster />
      <Celebrations />
      <Onboarding />
      <DailyReview />
      <AuthModal />
      <NewPasswordModal />
      <SyncConflictModal />
      <ScheduleAgain />
      <WhatsNew />
    </>
  );
}
