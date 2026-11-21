import type { StageId } from '../../domain/progression';
import type { FitAdjust, FitConfig, ItemFit } from '../../components/frog/fit-schema';
import { normalizeFit } from '../../components/frog/fit-schema.js';

/** Ediciones puras de la configuración de ajustes (el probador nunca muta el objeto). */

export type Scope = StageId | 'base';

export const getScope = (cfg: FitConfig, id: string, scope: Scope): FitAdjust | undefined =>
  scope === 'base' ? cfg.items[id]?.base : cfg.items[id]?.stages?.[scope];

function withItem(cfg: FitConfig, id: string, f: (it: ItemFit) => ItemFit): FitConfig {
  const next = f({ ...cfg.items[id], stages: { ...cfg.items[id]?.stages } });
  return normalizeFit({ version: 1, items: { ...cfg.items, [id]: next } });
}

/** Cambia campos de un ajuste. `undefined` borra el campo; `null` como patch borra el ajuste entero. */
export function patchAdjust(cfg: FitConfig, id: string, scope: Scope, patch: Partial<FitAdjust> | null): FitConfig {
  return withItem(cfg, id, (it) => {
    const cur = getScope(cfg, id, scope);
    const next = patch === null ? undefined : { ...cur, ...patch };
    if (next) for (const k of Object.keys(next) as (keyof FitAdjust)[]) if (next[k] === undefined) delete next[k];
    if (scope === 'base') return { ...it, base: next };
    return { ...it, stages: { ...it.stages, [scope]: next } };
  });
}

/** Copia el ajuste de una etapa a otra (solo a esa; las demás no se tocan). */
export function copyStage(cfg: FitConfig, id: string, from: StageId, to: StageId): FitConfig {
  const src = cfg.items[id]?.stages?.[from];
  const cleared = patchAdjust(cfg, id, to, null);
  return src ? patchAdjust(cleared, id, to, { ...src }) : cleared;
}

export function setSplit(cfg: FitConfig, id: string, split: [number, number] | undefined): FitConfig {
  return withItem(cfg, id, (it) => ({ ...it, split }));
}

/** Deja un complemento (o una de sus etapas) como en otra configuración (p. ej. la del proyecto). */
export function restoreFrom(cfg: FitConfig, from: FitConfig, id: string, scope?: Scope): FitConfig {
  if (!scope) {
    const items = { ...cfg.items };
    if (from.items[id]) items[id] = from.items[id];
    else delete items[id];
    return normalizeFit({ version: 1, items });
  }
  const src = getScope(from, id, scope);
  return patchAdjust(patchAdjust(cfg, id, scope, null), id, scope, src ? { ...src } : null);
}

export function renameItem(cfg: FitConfig, from: string, to: string): FitConfig {
  if (from === to || !cfg.items[from]) return cfg;
  const items = { ...cfg.items, [to]: cfg.items[from] };
  delete items[from];
  return normalizeFit({ version: 1, items });
}
