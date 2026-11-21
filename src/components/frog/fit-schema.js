// @ts-check
/**
 * Formato y validación de los ajustes de complementos (accessory-fit.json).
 *
 * Está en JavaScript sin dependencias para poder usarlo igual desde la app, desde el
 * probador (/#/dev/wardrobe), desde el servidor de desarrollo de Vite y desde
 * `npm run fit:apply`. Los tipos están en fit-schema.d.ts.
 *
 * Unidades: x, y y spread en unidades de la caja de 240 × 240 de la rana (el viewBox),
 * nunca en píxeles de pantalla; scale es un multiplicador; rotate en grados; pivot en
 * proporción (0-1) del rectángulo visible del complemento.
 */

export const FIT_VERSION = 1;
export const FIT_STAGES = ['tadpole', 'froglet', 'young', 'adult', 'sage'];
export const FIT_LAYERS = ['front', 'back'];
export const FIT_OVERLAYS = ['auto', 'none', 'eyes', 'head'];
export const ITEM_ID = /^(hat|neck|eyes)-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Límites de cada campo: lo que se salga se rechaza (protege de JSON corruptos o absurdos). */
export const FIT_LIMITS = {
  x: [-120, 120],
  y: [-120, 120],
  scale: [0.2, 4],
  rotate: [-180, 180],
  pivot: [-1, 2],
  z: [-50, 50],
  spread: [-40, 40],
};

const ADJUST_KEYS = ['x', 'y', 'scale', 'rotate', 'pivot', 'z', 'layer', 'overlay', 'spread'];
const ITEM_KEYS = ['base', 'stages', 'split'];

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * @param {unknown} adj
 * @param {string} where
 * @param {string[]} errors
 */
function checkAdjust(adj, where, errors) {
  if (!isObj(adj)) { errors.push(`${where}: debe ser un objeto`); return; }
  for (const k of Object.keys(adj)) {
    if (!ADJUST_KEYS.includes(k)) errors.push(`${where}.${k}: campo desconocido`);
  }
  for (const k of ['x', 'y', 'scale', 'rotate', 'z', 'spread']) {
    if (!(k in adj)) continue;
    const v = adj[k];
    const [lo, hi] = FIT_LIMITS[/** @type {keyof typeof FIT_LIMITS} */ (k)];
    if (!num(v)) errors.push(`${where}.${k}: debe ser un número`);
    else if (v < lo || v > hi) errors.push(`${where}.${k}: ${v} fuera de [${lo}, ${hi}]`);
    else if (k === 'z' && !Number.isInteger(v)) errors.push(`${where}.z: debe ser un entero`);
  }
  if ('pivot' in adj) {
    const p = adj.pivot;
    const [lo, hi] = FIT_LIMITS.pivot;
    if (!Array.isArray(p) || p.length !== 2 || !p.every(num)) errors.push(`${where}.pivot: debe ser [x, y]`);
    else if (p.some((v) => v < lo || v > hi)) errors.push(`${where}.pivot: valores fuera de [${lo}, ${hi}]`);
  }
  if ('layer' in adj && !FIT_LAYERS.includes(adj.layer)) errors.push(`${where}.layer: usa ${FIT_LAYERS.join(' o ')}`);
  if ('overlay' in adj && !FIT_OVERLAYS.includes(adj.overlay)) errors.push(`${where}.overlay: usa ${FIT_OVERLAYS.join(', ')}`);
}

/**
 * Comprueba un JSON de ajustes. No modifica la entrada.
 * @param {unknown} input
 * @param {{ knownIds?: Iterable<string> }} [opts] ids del catálogo: los demás se avisan (no se rechazan)
 * @returns {import('./fit-schema').FitValidation}
 */
export function validateFit(input, opts = {}) {
  /** @type {string[]} */ const errors = [];
  /** @type {string[]} */ const warnings = [];
  if (!isObj(input)) return { ok: false, errors: ['El archivo no es un objeto JSON'], warnings };
  for (const k of Object.keys(input)) {
    if (!['version', 'items', '$comment'].includes(k)) errors.push(`${k}: campo desconocido`);
  }
  if (input.version !== FIT_VERSION) errors.push(`version: se esperaba ${FIT_VERSION}`);
  if (!isObj(input.items)) {
    errors.push('items: debe ser un objeto');
    return { ok: false, errors, warnings };
  }
  const known = opts.knownIds ? new Set(opts.knownIds) : null;
  for (const [id, item] of Object.entries(input.items)) {
    const w = `items["${id}"]`;
    if (!ITEM_ID.test(id)) { errors.push(`${w}: id no válido (hat-…, neck-… o eyes-…)`); continue; }
    if (known && !known.has(id)) warnings.push(`${id}: no está en el catálogo (se guardará, pero no se usará hasta que exista)`);
    if (!isObj(item)) { errors.push(`${w}: debe ser un objeto`); continue; }
    for (const k of Object.keys(item)) if (!ITEM_KEYS.includes(k)) errors.push(`${w}.${k}: campo desconocido`);
    if ('base' in item) checkAdjust(item.base, `${w}.base`, errors);
    if ('stages' in item) {
      if (!isObj(item.stages)) errors.push(`${w}.stages: debe ser un objeto`);
      else for (const [st, adj] of Object.entries(item.stages)) {
        if (!FIT_STAGES.includes(st)) errors.push(`${w}.stages.${st}: etapa desconocida`);
        else checkAdjust(adj, `${w}.stages.${st}`, errors);
      }
    }
    if ('split' in item) {
      const s = item.split;
      if (!id.startsWith('eyes-')) errors.push(`${w}.split: solo para gafas`);
      else if (!Array.isArray(s) || s.length !== 2 || !s.every(num)) errors.push(`${w}.split: debe ser [finLenteIzquierda, inicioLenteDerecha]`);
      else if (!(s[0] > 0 && s[0] <= s[1] && s[1] < 1)) errors.push(`${w}.split: se necesita 0 < izquierda ≤ derecha < 1`);
    }
  }
  return errors.length ? { ok: false, errors, warnings } : { ok: true, value: /** @type {any} */ (input), warnings };
}

const round = (v) => Math.round(v * 1000) / 1000;

/**
 * Deja el JSON limpio para guardarlo: quita valores neutros (x 0, scale 1…), objetos vacíos
 * y redondea a 3 decimales. Ordena las claves para que los cambios se lean bien en git.
 * @param {import('./fit-schema').FitConfig} config
 * @returns {import('./fit-schema').FitConfig}
 */
export function normalizeFit(config) {
  /** @param {import('./fit-schema').FitAdjust | undefined} a */
  const clean = (a) => {
    if (!a) return undefined;
    /** @type {Record<string, unknown>} */ const o = {};
    if (a.x) o.x = round(a.x);
    if (a.y) o.y = round(a.y);
    if (a.scale !== undefined && round(a.scale) !== 1) o.scale = round(a.scale);
    if (a.rotate) o.rotate = round(a.rotate);
    if (a.pivot) o.pivot = [round(a.pivot[0]), round(a.pivot[1])];
    if (a.z !== undefined) o.z = a.z;
    if (a.layer) o.layer = a.layer;
    if (a.overlay && a.overlay !== 'auto') o.overlay = a.overlay;
    if (a.spread) o.spread = round(a.spread);
    return Object.keys(o).length ? o : undefined;
  };
  /** @type {Record<string, any>} */ const items = {};
  for (const id of Object.keys(config.items).sort()) {
    const it = config.items[id];
    /** @type {Record<string, any>} */ const out = {};
    const base = clean(it.base);
    if (base) out.base = base;
    /** @type {Record<string, any>} */ const stages = {};
    for (const st of FIT_STAGES) {
      const a = clean(it.stages?.[/** @type {keyof NonNullable<typeof it.stages>} */ (st)]);
      if (a) stages[st] = a;
    }
    if (Object.keys(stages).length) out.stages = stages;
    if (it.split) out.split = [round(it.split[0]), round(it.split[1])];
    if (Object.keys(out).length) items[id] = out;
  }
  return { version: FIT_VERSION, items };
}

/** @param {import('./fit-schema').FitConfig} config */
export const stringifyFit = (config) => `${JSON.stringify(normalizeFit(config), null, 2)}\n`;
