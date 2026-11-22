import { createStore, useStore } from '../../store/createStore';
import type { FitConfig } from './fit-schema';
import { PROJECT_FIT } from './layout';

/**
 * Ajustes de complementos que usa la app ahora mismo:
 * - `project`: los del proyecto (src/components/frog/accessory-fit.json, van en el build).
 * - `remote`: los publicados por un administrador desde el probador (Supabase, tabla
 *   app_config). Si existen y son válidos, mandan sobre los del proyecto.
 * Lo rellena services/appConfig.ts; el componente Frog solo lo lee.
 */
export interface ActiveFit {
  fit: FitConfig;
  source: 'project' | 'remote';
  updatedAt?: string;
}

export const fitStore = createStore<ActiveFit>({ fit: PROJECT_FIT, source: 'project' });

export const useActiveFit = () => useStore(fitStore, (s) => s.fit);
export const useActiveFitInfo = () => useStore(fitStore, (s) => s);
