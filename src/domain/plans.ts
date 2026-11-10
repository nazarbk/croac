import type { Plan } from './types';

/**
 * Capa de "entitlements": toda la app pregunta `can(plan, feature)` en lugar de
 * comprobar el plan directamente. Así añadir planes o mover funciones entre
 * ellos es un cambio de configuración, no de código.
 */
export type Feature =
  | 'premiumItems'
  | 'fullHistoryStats'
  | 'cloudSync'
  | 'unlimitedLists';

export interface PlanInfo {
  id: Plan;
  name: string;
  tagline: string;
  features: Feature[];
  limits: { lists: number; statsDays: number };
  perks: string[];
}

export const PLANS: Record<Plan, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Gratis',
    tagline: 'Todo lo necesario para organizarte y criar a tu rana.',
    features: [],
    limits: { lists: 8, statsDays: 90 },
    perks: ['Tareas y hábitos ilimitados', 'Hasta 8 listas', 'Estadísticas de los últimos 90 días', 'Tienda de complementos'],
  },
  pro: {
    id: 'pro',
    name: 'Croac Pro',
    tagline: 'Para quien quiere ir más allá.',
    features: ['premiumItems', 'fullHistoryStats', 'cloudSync', 'unlimitedLists'],
    limits: { lists: Infinity, statsDays: 3650 },
    perks: [
      'Complementos, pieles y fondos exclusivos',
      'Listas ilimitadas',
      'Historial completo de estadísticas',
      'Sincronización entre dispositivos (próximamente)',
    ],
  },
};

export const can = (plan: Plan, feature: Feature) => PLANS[plan].features.includes(feature);
export const limitsFor = (plan: Plan) => PLANS[plan].limits;
