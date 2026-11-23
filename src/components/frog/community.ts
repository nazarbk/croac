import { createStore, useStore } from '../../store/createStore';
import type { ItemArt } from './art';

/**
 * Complementos dibujados por los usuarios (ganadores del patio). No están en art.ts: llegan
 * del servidor con su imagen y su proporción, y se colocan con unos valores por hueco
 * (los mismos para los que se dibuja la plantilla del lienzo). Si hace falta, se afinan con
 * el probador como cualquier otro (su id es «hat-patio-12», etc.).
 */
export interface CommunityArt { art: ItemArt; href: string }

export const communityArtStore = createStore<Record<string, CommunityArt>>({});
export const useCommunityArt = () => useStore(communityArtStore, (s) => s);

/** Punto de apoyo y ancho por hueco: sombrero apoyado por abajo, cuello colgando, gafas al centro. */
export const PATIO_ART: Record<'hat' | 'neck' | 'eyes', Pick<ItemArt, 'w' | 'ax' | 'ay'>> = {
  hat: { w: 0.62, ax: 0.5, ay: 0.92 },
  neck: { w: 0.55, ax: 0.5, ay: 0.08 },
  eyes: { w: 1.96, ax: 0.5, ay: 0.5 },
};

export const patioArt = (slot: 'hat' | 'neck' | 'eyes', ratio: number): ItemArt => ({ ratio, ...PATIO_ART[slot] });
