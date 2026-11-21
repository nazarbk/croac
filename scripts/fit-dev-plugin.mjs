// Plugin de Vite SOLO para `npm run dev` (apply: 'serve'): permite que el probador
// (#/dev/wardrobe) escriba src/components/frog/accessory-fit.json con «Incorporar al
// proyecto». No existe en el build de producción.
import { writeFit } from './fit-file.mjs';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const MAX_BYTES = 512 * 1024;

export function fitDevPlugin() {
  return {
    name: 'croac-fit-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__croac/fit', (req, res) => {
        const send = (status, body) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        // Solo desde este ordenador y desde el propio probador (cabecera propia: un formulario
        // de otra web no puede enviarla sin permiso CORS).
        if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) return send(403, { ok: false, error: 'Solo desde este ordenador' });
        if (req.method !== 'POST') return send(405, { ok: false, error: 'Usa POST' });
        if (req.headers['x-croac-fit'] !== '1') return send(400, { ok: false, error: 'Falta la cabecera X-Croac-Fit' });
        let size = 0;
        const chunks = [];
        req.on('data', (c) => {
          size += c.length;
          if (size > MAX_BYTES) { send(413, { ok: false, error: 'Demasiado grande' }); req.destroy(); return; }
          chunks.push(c);
        });
        req.on('end', async () => {
          if (res.writableEnded) return;
          let data;
          try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { ok: false, errors: ['No es JSON'] }); }
          try {
            const r = await writeFit(data);
            send(r.ok ? 200 : 422, r);
            if (r.ok) server.config.logger.info(`[croac] ${r.file} actualizado desde el probador (${r.changed.join(', ') || 'sin cambios'})`, { timestamp: true });
          } catch (e) {
            send(500, { ok: false, error: String(e?.message ?? e) });
          }
        });
      });
    },
  };
}
