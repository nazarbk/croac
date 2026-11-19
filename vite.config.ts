/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

// URL pública para la vista previa al compartir el enlace (WhatsApp, etc.): las imágenes
// de og:image tienen que ser absolutas. En Vercel se toma sola; en otro sitio, VITE_SITE_URL.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const siteUrl = (
  env.VITE_SITE_URL ||
  (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  '.'
).replace(/\/$/, '');

// `npm run build:single` genera un único index.html autocontenido (demo/artefacto).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    { name: 'site-url', transformIndexHtml: (html: string) => html.replaceAll('__SITE_URL__', siteUrl) },
    ...(mode === 'single' ? [viteSingleFile()] : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
