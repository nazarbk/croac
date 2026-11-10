import type { Slot } from './types';

export interface ShopItem {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  /** Nivel mínimo de la rana para poder comprarlo. */
  minLevel: number;
  /** Solo para el plan Pro. */
  premium?: boolean;
  description: string;
}

export const SLOTS: { id: Slot; label: string; plural: string }[] = [
  { id: 'hat', label: 'Sombrero', plural: 'Sombreros' },
  { id: 'neck', label: 'Cuello', plural: 'Cuello' },
  { id: 'eyes', label: 'Gafas', plural: 'Gafas' },
  { id: 'skin', label: 'Piel', plural: 'Pieles' },
  { id: 'background', label: 'Fondo', plural: 'Fondos' },
];

/** Artículos con los que empieza todo el mundo. */
export const DEFAULT_OWNED = ['skin-green', 'bg-pond'];
export const DEFAULT_EQUIPPED = { skin: 'skin-green', background: 'bg-pond' } as const;

export const CATALOG: ShopItem[] = [
  // Sombreros
  { id: 'hat-party', slot: 'hat', name: 'Gorrito de fiesta', price: 40, minLevel: 1, description: 'Para celebrar cada tarea.' },
  { id: 'hat-flower', slot: 'hat', name: 'Flor de charca', price: 30, minLevel: 1, description: 'Recién cogida del nenúfar.' },
  { id: 'hat-cap', slot: 'hat', name: 'Gorra', price: 60, minLevel: 2, description: 'Visera hacia delante, actitud deportiva.' },
  { id: 'hat-beanie', slot: 'hat', name: 'Gorro de lana', price: 80, minLevel: 3, description: 'Calentito para las mañanas de invierno.' },
  { id: 'hat-beret', slot: 'hat', name: 'Boina', price: 70, minLevel: 4, description: 'Muy de artista.' },
  { id: 'hat-tophat', slot: 'hat', name: 'Chistera', price: 150, minLevel: 8, description: 'Elegancia de anfibio.' },
  { id: 'hat-wizard', slot: 'hat', name: 'Sombrero de mago', price: 250, minLevel: 12, description: 'Convierte la procrastinación en hechos.' },
  { id: 'hat-crown', slot: 'hat', name: 'Corona', price: 400, minLevel: 20, description: 'Reina de la charca.' },
  { id: 'hat-astronaut', slot: 'hat', name: 'Casco espacial', price: 350, minLevel: 10, premium: true, description: 'Para ranas que apuntan alto.' },
  // Cuello
  { id: 'neck-bandana', slot: 'neck', name: 'Pañuelo', price: 35, minLevel: 1, description: 'Un toque aventurero.' },
  { id: 'neck-bowtie', slot: 'neck', name: 'Pajarita', price: 45, minLevel: 1, description: 'Formal pero divertida.' },
  { id: 'neck-tie', slot: 'neck', name: 'Corbata', price: 50, minLevel: 2, description: 'Lista para la reunión de las 9.' },
  { id: 'neck-scarf', slot: 'neck', name: 'Bufanda', price: 70, minLevel: 4, description: 'Rayas de invierno.' },
  { id: 'neck-medal', slot: 'neck', name: 'Medalla', price: 120, minLevel: 15, description: 'Por constancia demostrada.' },
  { id: 'neck-pearls', slot: 'neck', name: 'Collar de perlas', price: 220, minLevel: 6, premium: true, description: 'Perlas de río auténticas (más o menos).' },
  // Gafas
  { id: 'eyes-round', slot: 'eyes', name: 'Gafas redondas', price: 60, minLevel: 1, description: 'Para leer la lista de tareas.' },
  { id: 'eyes-sun', slot: 'eyes', name: 'Gafas de sol', price: 90, minLevel: 3, description: 'Demasiado guay para procrastinar.' },
  { id: 'eyes-heart', slot: 'eyes', name: 'Gafas de corazón', price: 110, minLevel: 5, description: 'Amor por las tareas hechas.' },
  { id: 'eyes-monocle', slot: 'eyes', name: 'Monóculo', price: 140, minLevel: 9, description: 'Muy distinguido.' },
  // Pieles
  { id: 'skin-green', slot: 'skin', name: 'Verde charca', price: 0, minLevel: 1, description: 'El clásico.' },
  { id: 'skin-blue', slot: 'skin', name: 'Azul dardo', price: 150, minLevel: 5, description: 'Inspirada en las ranas dardo.' },
  { id: 'skin-pink', slot: 'skin', name: 'Rosa chicle', price: 150, minLevel: 5, description: 'Imposible no verla.' },
  { id: 'skin-gold', slot: 'skin', name: 'Dorada', price: 500, minLevel: 15, description: 'Solo para ranas muy constantes.' },
  { id: 'skin-midnight', slot: 'skin', name: 'Medianoche', price: 300, minLevel: 8, premium: true, description: 'Con pequitas como estrellas.' },
  // Fondos
  { id: 'bg-pond', slot: 'background', name: 'Charca', price: 0, minLevel: 1, description: 'Su hogar de siempre.' },
  { id: 'bg-sunset', slot: 'background', name: 'Atardecer', price: 120, minLevel: 3, description: 'El sol se esconde tras los juncos.' },
  { id: 'bg-night', slot: 'background', name: 'Noche estrellada', price: 180, minLevel: 6, description: 'Luna llena sobre la charca.' },
  { id: 'bg-rain', slot: 'background', name: 'Día de lluvia', price: 150, minLevel: 4, description: 'El tiempo favorito de cualquier rana.' },
  { id: 'bg-space', slot: 'background', name: 'Espacio', price: 400, minLevel: 10, premium: true, description: 'Un pequeño salto para una rana.' },
];

export const itemById = (id: string | undefined) => CATALOG.find((i) => i.id === id);

export type PurchaseCheck =
  | { ok: true }
  | { ok: false; reason: 'owned' | 'level' | 'coins' | 'premium' | 'unknown' };

export function canBuy(
  item: ShopItem | undefined,
  ctx: { coins: number; level: number; owned: string[]; isPro: boolean },
): PurchaseCheck {
  if (!item) return { ok: false, reason: 'unknown' };
  if (ctx.owned.includes(item.id)) return { ok: false, reason: 'owned' };
  if (item.premium && !ctx.isPro) return { ok: false, reason: 'premium' };
  if (ctx.level < item.minLevel) return { ok: false, reason: 'level' };
  if (ctx.coins < item.price) return { ok: false, reason: 'coins' };
  return { ok: true };
}
