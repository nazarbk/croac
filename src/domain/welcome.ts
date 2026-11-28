/**
 * Regalo de bienvenida: una sola vez por cuenta, a elegir entre un complemento sencillo
 * o unas monedas. Así la rana luce algo desde el primer día (y se nota en la charca).
 */
import { uid } from './id';
import { itemById } from './shop';
import type { AppState, Ctx, HistoryEntry } from './types';

export const WELCOME = {
  items: ['hat-party', 'neck-bowtie', 'eyes-round'],
  coins: 50,
} as const;

export type WelcomeChoice = (typeof WELCOME.items)[number] | 'coins';

const REF = 'welcome';

export const welcomeClaimed = (s: AppState) => !!s.meta.welcome || s.history.some((h) => h.ref === REF);

/** Las opciones que tiene sentido ofrecer (sin los complementos que ya tiene). */
export const welcomeOptions = (s: AppState): WelcomeChoice[] => [...WELCOME.items.filter((id) => !s.frog.owned.includes(id)), 'coins'];

export function claimWelcome(s: AppState, choice: WelcomeChoice, ctx: Ctx): AppState {
  if (welcomeClaimed(s)) return s;
  const item = choice === 'coins' ? undefined : itemById(choice);
  if (choice !== 'coins' && (!item || s.frog.owned.includes(choice))) return s;
  const coins = choice === 'coins' ? WELCOME.coins : 0;
  const entry: HistoryEntry = {
    id: uid('h'), type: 'bonus', date: ctx.today, at: ctx.now, xp: 0, coins,
    title: item ? `Regalo de bienvenida: ${item.name}` : 'Regalo de bienvenida', ref: REF,
  };
  return {
    ...s,
    history: [...s.history, entry],
    frog: {
      ...s.frog,
      coins: s.frog.coins + coins,
      owned: item ? [...s.frog.owned, item.id] : s.frog.owned,
      equipped: item ? { ...s.frog.equipped, [item.slot]: item.id } : s.frog.equipped,
    },
    meta: { ...s.meta, welcome: choice },
  };
}
