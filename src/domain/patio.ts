import type { DateStr } from './dates';
import { uid } from './id';
import type { ShopItem } from './shop';
import type { AppState, HistoryEntry } from './types';

/**
 * Patio del complemento: cada semana los usuarios dibujan complementos y los votan; el más
 * votado entra gratis en la tienda y su autor gana monedas.
 *
 * Economía: con tareas a diario se ganan unas 150-200 monedas a la semana. Un lienzo cuesta
 * más o menos eso: una semana de constancia para poder presentar un dibujo. Ganar devuelve
 * el lienzo y algo más.
 */
export const PATIO = {
  canvasPrice: 150,
  winPrize: 200,
  votesPerWeek: 3,
  nameMax: 24,
} as const;

export type PatioSlot = 'hat' | 'neck' | 'eyes';

/** Lienzos comprados y sin usar. */
export const canvasesLeft = (state: AppState) => state.meta.patioCanvases ?? 0;

export function buyCanvas(state: AppState, ctx: { today: DateStr; now: number }): { state: AppState; ok: boolean } {
  if (state.frog.coins < PATIO.canvasPrice) return { state, ok: false };
  const entry: HistoryEntry = {
    id: uid('h'), type: 'purchase', date: ctx.today, at: ctx.now, xp: 0, coins: -PATIO.canvasPrice,
    title: 'Lienzo del patio', ref: 'patio-canvas',
  };
  return {
    ok: true,
    state: {
      ...state,
      history: [...state.history, entry],
      frog: { ...state.frog, coins: state.frog.coins - PATIO.canvasPrice },
      meta: { ...state.meta, patioCanvases: canvasesLeft(state) + 1 },
    },
  };
}

/** Se gasta un lienzo al publicar el dibujo. */
export function spendCanvas(state: AppState): AppState {
  return { ...state, meta: { ...state.meta, patioCanvases: Math.max(0, canvasesLeft(state) - 1) } };
}

/** Id de tienda de un ganador del patio (sirve como cualquier otro complemento). */
export const patioItemId = (slot: PatioSlot, entryId: number) => `${slot}-patio-${entryId}`;

export function patioShopItem(w: { id: number; slot: PatioSlot; name: string; author: string; week_start: string }): ShopItem {
  return {
    id: patioItemId(w.slot, w.id), slot: w.slot, name: w.name, price: 0, minLevel: 1,
    description: `Ganador del patio, dibujado por @${w.author}.`,
    community: { author: w.author, week: w.week_start },
  };
}

/**
 * Premio para el autor del dibujo ganador: monedas (una sola vez por dibujo, aunque abra la
 * app en varios dispositivos) y su complemento, gratis y puesto.
 */
export function claimPatioPrize(
  state: AppState, win: { id: number; slot: PatioSlot; name: string }, ctx: { today: DateStr; now: number },
): { state: AppState; claimed: boolean } {
  const ref = `patio-win:${win.id}`;
  if (state.history.some((h) => h.ref === ref)) return { state, claimed: false };
  const item = patioItemId(win.slot, win.id);
  const entry: HistoryEntry = {
    id: uid('h'), type: 'bonus', date: ctx.today, at: ctx.now, xp: 0, coins: PATIO.winPrize,
    title: `Tu «${win.name}» ganó el patio`, ref,
  };
  return {
    claimed: true,
    state: {
      ...state,
      history: [...state.history, entry],
      frog: {
        ...state.frog,
        coins: state.frog.coins + PATIO.winPrize,
        owned: state.frog.owned.includes(item) ? state.frog.owned : [...state.frog.owned, item],
      },
    },
  };
}
