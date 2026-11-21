#!/usr/bin/env node
// Incorpora al proyecto un JSON exportado desde el probador (#/dev/wardrobe):
//
//   npm run fit:apply -- ~/Descargas/accessory-fit.json
//   npm run fit:apply -- ~/Descargas/accessory-fit.json --check   (solo valida)
//
// Valida el archivo, lo normaliza y lo escribe en src/components/frog/accessory-fit.json.
// Después: revisa con `git diff` y haz commit.
import { readFile } from 'node:fs/promises';
import { FIT_FILE_REL, knownItemIds, writeFit } from './fit-file.mjs';
import { validateFit } from '../src/components/frog/fit-schema.js';

const args = process.argv.slice(2);
const check = args.includes('--check');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Uso: npm run fit:apply -- ruta/al/accessory-fit.json [--check]');
  process.exit(2);
}

let data;
try {
  data = JSON.parse(await readFile(file, 'utf8'));
} catch (e) {
  console.error(`✗ No se pudo leer ${file}: ${e.message}`);
  process.exit(1);
}

const result = check ? validateFit(data, { knownIds: await knownItemIds() }) : await writeFit(data);
for (const w of result.warnings) console.warn(`⚠ ${w}`);
if (!result.ok) {
  console.error(`✗ ${file} no es válido; no se ha cambiado nada:`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
if (check) {
  console.log(`✓ ${file} es válido (${Object.keys(data.items).length} complementos).`);
} else {
  console.log(`✓ Escrito ${result.file} (${result.bytes} bytes).`);
  console.log(result.changed.length ? `  Cambian: ${result.changed.join(', ')}` : '  Sin cambios respecto a lo que había.');
  console.log(`  Revisa con: git diff ${FIT_FILE_REL}`);
}
