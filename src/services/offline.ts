/**
 * Para que la app se vea entera sin conexión: pide al service worker que guarde por adelantado
 * las ilustraciones que usa este usuario (cuerpos y caras de la rana, sus complementos, sus
 * fondos e iconos). El resto ya se guarda solo al verlo por primera vez.
 */
import { art } from '../components/frog/art';
import { backgroundUrl, itemUrl } from '../components/frog/Frog';
import { bodyUrl, faceUrl, MOODS } from '../components/frog/skins';
import { STAGES } from '../domain/progression';
import { appStore } from '../store/appStore';

const UI = ['ui/coin.webp', 'ui/xp.webp', 'ui/celebrate.webp', 'ui/empty-tasks.webp', 'ui/empty-done.webp', 'ui/trophy.webp'];

export function warmOfflineCache() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  const { frog } = appStore.get();
  const urls = [
    ...STAGES.map((s) => bodyUrl(s.id)),
    ...MOODS.map((m) => faceUrl(m)),
    ...UI.map((p) => art(p)),
    ...frog.owned.filter((id) => /^(hat|neck|eyes)-/.test(id) && !id.includes('-patio-')).map(itemUrl),
    ...frog.owned.filter((id) => id.startsWith('bg-')).map((id) => backgroundUrl(id)),
  ].map((u) => new URL(u, location.href).href);
  navigator.serviceWorker.controller.postMessage({ type: 'warm', urls: [...new Set(urls)] });
}
