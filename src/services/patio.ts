import { communityArtStore, patioArt } from '../components/frog/community';
import { PATIO, patioItemId, patioShopItem, type PatioSlot } from '../domain/patio';
import { setCommunityItems } from '../domain/shop';
import { actions } from '../store/actions';
import { createStore, useStore } from '../store/createStore';
import { ui } from '../store/uiStore';
import { accountStore, withSession } from './account';
import { backend } from './backend';
import { friendlyError, type PatioEntry, type PatioWinner } from './types';

/**
 * Patio del complemento (ver domain/patio.ts y supabase/schema.sql).
 * - Ganadores: públicos; se cargan al arrancar para que cualquier rana pueda llevarlos y
 *   para la sección «Del patio» de la tienda. Se guardan en el dispositivo (sin conexión).
 * - Dibujos de la semana y votos: con cuenta, al abrir el patio.
 */
interface PatioState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  entries: PatioEntry[];
  winners: PatioWinner[];
}

export const patioStore = createStore<PatioState>({ status: 'idle', error: null, entries: [], winners: [] });
export const usePatio = () => useStore(patioStore, (s) => s);

const CACHE = 'croac:patio-winners';

function applyWinners(winners: PatioWinner[]) {
  setCommunityItems(winners.map(patioShopItem));
  communityArtStore.set(Object.fromEntries(winners.map((w) => [
    patioItemId(w.slot, w.id), { art: patioArt(w.slot, w.ratio), href: backend.patioImageUrl(w.image_path) },
  ])));
  patioStore.set((s) => ({ ...s, winners }));
}

export async function loadWinners() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE) ?? 'null') as PatioWinner[] | null;
    if (Array.isArray(cached) && !patioStore.get().winners.length) applyWinners(cached.map((w) => ({ ...w, mine: false })));
  } catch { /* nada */ }
  if (!backend.enabled) return;
  try {
    const logged = !!accountStore.get().session;
    const winners = logged ? await withSession((s) => backend.patioWinners(s)) : await backend.patioWinners(null);
    applyWinners(winners);
    try { localStorage.setItem(CACHE, JSON.stringify(winners)); } catch { /* sin almacenamiento */ }
    // ¿He ganado alguna semana? Premio (una sola vez por dibujo).
    const claimed = actions.claimPatioPrizes(winners.filter((w) => w.mine));
    for (const name of claimed) ui.toast({ message: `¡Tu «${name}» ganó el patio! Ya está en la tienda con tu firma.`, tone: 'reward', coins: PATIO.winPrize, duration: 6000 });
  } catch {
    // Sin conexión o sin el esquema del patio todavía: se queda lo guardado.
  }
}

export async function loadWeek() {
  if (!backend.enabled || !accountStore.get().session) return;
  patioStore.set((s) => ({ ...s, status: s.entries.length ? s.status : 'loading', error: null }));
  try {
    const entries = await withSession((s) => backend.patioWeek(s));
    patioStore.set((s) => ({ ...s, entries, status: 'ready' }));
  } catch (e) {
    patioStore.set((s) => ({ ...s, status: 'error', error: friendlyError(e) }));
  }
}

const patchEntry = (id: number, p: Partial<PatioEntry>) =>
  patioStore.set((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...p } : e)) }));

/** Votar o quitar el voto (se ve al momento y se deshace si el servidor dice que no). */
export async function vote(entry: PatioEntry, on: boolean) {
  patchEntry(entry.id, { voted: on, votes: entry.votes + (on ? 1 : -1) });
  try {
    await withSession((s) => backend.patioVote(s, entry.id, on));
  } catch (e) {
    patchEntry(entry.id, { voted: entry.voted, votes: entry.votes });
    ui.toast({ message: friendlyError(e) });
  }
}

export async function report(entry: PatioEntry) {
  try {
    await withSession((s) => backend.patioReport(s, entry.id));
    ui.toast({ message: 'Gracias. Lo revisaremos; con varias denuncias se oculta solo.' });
  } catch (e) {
    ui.toast({ message: friendlyError(e) });
  }
}

export async function submit(slot: PatioSlot, name: string, ratio: number, image: Blob) {
  const entry = await withSession((s) => backend.patioSubmit(s, { slot, name, ratio }, image));
  actions.spendPatioCanvas();
  patioStore.set((s) => ({ ...s, entries: [entry, ...s.entries] }));
  return entry;
}

/** Solo administradores (lo comprueba la base de datos). */
export async function setHidden(entry: PatioEntry, hidden: boolean) {
  try {
    await withSession((s) => backend.patioSetHidden(s, entry.id, hidden));
    patchEntry(entry.id, { hidden });
  } catch (e) {
    ui.toast({ message: friendlyError(e) });
  }
}

/** Borrar el dibujo propio de esta semana (se devuelve el lienzo) o, si eres admin, cualquiera. */
export async function remove(entry: PatioEntry) {
  try {
    await withSession((s) => backend.patioDelete(s, entry.id, entry.mine ? entry.image_path : undefined));
    if (entry.mine) actions.refundPatioCanvas();
    patioStore.set((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entry.id) }));
  } catch (e) {
    ui.toast({ message: friendlyError(e) });
  }
}

let started = false;
/** Al arrancar y al cambiar de sesión. */
export function startPatio() {
  if (started) return;
  started = true;
  void loadWinners();
  let last = accountStore.get().session?.userId ?? null;
  accountStore.subscribe(() => {
    const now = accountStore.get().session?.userId ?? null;
    if (now === last) return;
    last = now;
    patioStore.set((s) => ({ ...s, entries: [], status: 'idle' }));
    void loadWinners();
  });
}
