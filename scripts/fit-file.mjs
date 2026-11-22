// Lectura y escritura de src/components/frog/accessory-fit.json, compartida por
// `npm run fit:apply` y por el servidor de desarrollo (botón «Incorporar al proyecto»).
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringifyFit, validateFit } from '../src/components/frog/fit-schema.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FIT_FILE = join(ROOT, 'src/components/frog/accessory-fit.json');
export const FIT_FILE_REL = relative(ROOT, FIT_FILE).replaceAll('\\', '/');

/** Ids con dibujo en ITEM_ART (para avisar de ajustes a complementos que no existen). */
export async function knownItemIds() {
  const src = await readFile(join(ROOT, 'src/components/frog/art.ts'), 'utf8');
  return ['face', ...[...src.matchAll(/^\s*'((?:hat|neck|eyes)-[a-z0-9-]+)':\s*\{\s*ratio/gm)].map((m) => m[1])];
}

/**
 * Valida y escribe la configuración (normalizada). Escritura atómica: primero a un
 * temporal y luego se renombra, para no dejar nunca el archivo a medias.
 * @returns {Promise<{ ok: true, file: string, bytes: number, warnings: string[], changed: string[] } | { ok: false, errors: string[], warnings: string[] }>}
 */
export async function writeFit(input) {
  const r = validateFit(input, { knownIds: await knownItemIds() });
  if (!r.ok) return r;
  const text = stringifyFit(r.value);
  let before = { items: {} };
  try { before = JSON.parse(await readFile(FIT_FILE, 'utf8')); } catch { /* no existía */ }
  const after = JSON.parse(text);
  const ids = new Set([...Object.keys(before.items ?? {}), ...Object.keys(after.items)]);
  const changed = [...ids].filter((id) => JSON.stringify(before.items?.[id]) !== JSON.stringify(after.items[id])).sort();
  const tmp = `${FIT_FILE}.tmp`;
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, FIT_FILE);
  return { ok: true, file: FIT_FILE_REL, bytes: Buffer.byteLength(text), warnings: r.warnings, changed };
}
