import { useEffect, useState } from 'react';
import { art } from '../components/frog/art';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { isNewer, latestReleased, releasedChangelog, type ChangeKind, type Release } from '../content/changelog';
import { needsRollover } from '../domain/engine';
import { formatLong } from '../domain/dates';
import { cn } from '../lib/cn';
import { navigate } from '../lib/router';
import { appStore, clockStore, useApp, useToday } from '../store/appStore';
import { createStore, useStore } from '../store/createStore';

const SEEN_KEY = 'croac:seen-version';
function readSeen(): string | null {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
}
function writeSeen(v: string) {
  try { localStorage.setItem(SEEN_KEY, v); } catch { /* sin almacenamiento: se volverá a mostrar */ }
}

/** Versión vista por última vez en este dispositivo (reactiva, para el punto de «nuevo» del menú). */
const seenStore = createStore<{ seen: string | null }>({ seen: readSeen() });
export const useHasNews = () => {
  const seen = useStore(seenStore, (s) => s.seen);
  const today = useToday();
  return !seen || isNewer(latestReleased(today).version, seen);
};
/** Marca como vista la última versión publicada HOY (las de fecha futura saldrán en su día). */
export function markNewsSeen() {
  const v = latestReleased(clockStore.get().today).version;
  writeSeen(v);
  seenStore.set({ seen: v });
}

const KIND: Record<ChangeKind, { label: string; className: string }> = {
  nuevo: { label: 'Nuevo', className: 'bg-lily-soft text-lily-strong' },
  mejora: { label: 'Mejora', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  arreglo: { label: 'Arreglo', className: 'bg-coin-soft text-amber-800 dark:text-amber-200' },
};

export function ReleaseCard({ release, compact }: { release: Release; compact?: boolean }) {
  return (
    <article className={cn(!compact && 'rounded-[1.5rem] border border-line bg-surface shadow-card p-5')}>
      <div className="flex items-start gap-4">
        {release.art && !compact && <img src={art(release.art)} alt="" className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 -mt-1" />}
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted">
            Versión {release.version} · {formatLong(release.date)}
          </div>
          <h2 className={cn('font-display font-bold leading-tight mt-0.5', compact ? 'text-base' : 'text-lg')}>{release.title}</h2>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {release.changes.map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug">
            <span className={cn('shrink-0 mt-px text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md', KIND[c.kind].className)}>{KIND[c.kind].label}</span>
            <span className="min-w-0">{c.text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Ventana que sale una vez después de cada actualización. */
export function WhatsNew() {
  const today = useToday();
  const onboarded = useApp((s) => s.meta.onboarded);
  const reviewPending = useApp((s) => s.meta.onboarded && needsRollover(s, today));
  const [open, setOpen] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);

  useEffect(() => {
    const seen = readSeen();
    if (!seen) {
      // Quien instala ahora no necesita leer el historial de cambios.
      if (!appStore.get().meta.onboarded || appStore.get().tasks.length === 0) {
        markNewsSeen();
        return;
      }
    }
    if (!onboarded || reviewPending) return;
    const pending = releasedChangelog(today).filter((r) => !seen || isNewer(r.version, seen)).slice(0, 2);
    if (pending.length) {
      setReleases(pending);
      setOpen(true);
    }
  }, [onboarded, reviewPending, today]);

  const close = () => {
    markNewsSeen();
    setOpen(false);
  };

  return (
    <Modal
      open={open} onClose={close} size="md" title="Novedades en Croac"
      footer={<>
        <Button variant="ghost" onClick={() => { close(); navigate('novedades'); }}>Ver todas</Button>
        <Button variant="primary" onClick={close}>¡A por ello!</Button>
      </>}
    >
      <div className="space-y-6">
        {releases.map((r, i) => (
          <div key={r.version} className={cn(i > 0 && 'pt-5 border-t border-line')}>
            {i === 0 && r.art && <img src={art(r.art)} alt="" className="mx-auto w-28 h-28 object-contain mb-2" />}
            <ReleaseCard release={r} compact />
          </div>
        ))}
      </div>
    </Modal>
  );
}
