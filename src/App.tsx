import { useEffect } from 'react';
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
import { UpcomingPage } from './pages/UpcomingPage';
import { tickClock, useApp } from './store/appStore';

const PAGES: Record<RouteName, { title: string; Component: () => React.ReactElement }> = {
  hoy: { title: 'Hoy', Component: TodayPage },
  proximo: { title: 'Próximo', Component: UpcomingPage },
  tareas: { title: 'Tareas', Component: TasksPage },
  rana: { title: 'Mi rana', Component: FrogPage },
  tienda: { title: 'Tienda', Component: ShopPage },
  estadisticas: { title: 'Estadísticas', Component: StatsPage },
  ajustes: { title: 'Ajustes', Component: SettingsPage },
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

  return (
    <>
      <AppShell>
        <page.Component />
      </AppShell>
      <TaskEditor />
      <Toaster />
      <Celebrations />
      <Onboarding />
      <DailyReview />
    </>
  );
}
