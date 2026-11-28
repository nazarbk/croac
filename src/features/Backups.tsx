import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { levelInfo } from '../domain/progression';
import { listLocalBackups, type LocalBackup } from '../services/backups';
import { cloudEnabled, useAccount } from '../services/account';
import { cloudBackups, restoreBackup, type RestoreResult } from '../services/sync';
import { friendlyError, type StateVersion } from '../services/types';
import { ui } from '../store/uiStore';

const when = (t: number | string) =>
  new Date(t).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

interface Option {
  key: string;
  at: number;
  source: 'device' | 'cloud';
  detail: string;
  load: () => Promise<unknown>;
}

export function describeRestore(r: RestoreResult): string {
  const parts = [
    r.completed > 0 && `${r.completed} ${r.completed === 1 ? 'tarea hecha' : 'tareas hechas'}`,
    r.xp > 0 && `${r.xp} XP`,
    r.coins > 0 && `${r.coins} monedas`,
    r.items > 0 && `${r.items} ${r.items === 1 ? 'complemento' : 'complementos'}`,
  ].filter(Boolean);
  return parts.length ? `Recuperado: ${parts.join(', ')}.` : 'Esa copia no tenía nada que no tengas ya.';
}

/** Ventana para recuperar datos de una copia (del dispositivo o de la nube). */
export function BackupsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAccount();
  const [cloud, setCloud] = useState<StateVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState<LocalBackup[]>([]);

  useEffect(() => {
    if (!open) return;
    setLocal(listLocalBackups());
    setError(null);
    if (!session) { setCloud([]); return; }
    setCloud(null);
    cloudBackups.list().then(setCloud, (e) => { setCloud([]); setError(friendlyError(e)); });
  }, [open, session]);

  const options: Option[] = [
    ...local.map((b) => ({
      key: `d${b.at}`, at: b.at, source: 'device' as const,
      detail: `${b.reason} · nivel ${levelInfo(b.state.frog.xp).level} · ${b.state.frog.coins} monedas`,
      load: async () => b.state,
    })),
    ...(cloud ?? []).map((v) => ({
      key: `c${v.id}`, at: Date.parse(v.saved_at), source: 'cloud' as const,
      detail: `${v.reason === 'loss' ? 'Antes de un cambio que quitaba datos' : 'Copia del día'}${v.xp != null ? ` · nivel ${levelInfo(Number(v.xp)).level} · ${v.coins ?? 0} monedas` : ''}`,
      load: () => cloudBackups.get(v.id),
    })),
  ].sort((a, b) => b.at - a.at);

  const restore = async (o: Option) => {
    setBusy(o.key);
    try {
      const r = await restoreBackup(await o.load());
      ui.toast({ message: r ? describeRestore(r) : 'No se pudo leer esa copia.', tone: r ? 'reward' : 'danger', duration: 7000 });
      if (r) onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="Recuperar datos">
      <p className="text-[15px] leading-relaxed">
        Si te falta algo (tareas hechas, compras, experiencia), elige una copia de antes de que pasara.
        <strong> No se borra nada:</strong> se añade a lo que tienes ahora solo lo que falte.
      </p>
      {error && <p className="mt-3 text-sm rounded-xl bg-danger-soft text-danger p-3" role="alert">{error}</p>}
      <ul className="mt-4 space-y-2">
        {cloud === null && <li className="text-sm text-muted p-3">Buscando copias en la nube…</li>}
        {cloud !== null && options.length === 0 && (
          <li className="text-sm text-muted p-3 rounded-xl bg-surface-2">
            Todavía no hay copias. Se guardan solas a partir de ahora{cloudEnabled ? ' (en la nube, una al día durante una semana)' : ''}.
          </li>
        )}
        {options.map((o) => (
          <li key={o.key} className="flex items-center gap-3 p-3 rounded-2xl border border-line">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-surface-2 text-muted shrink-0">
              <Icon name={o.source === 'cloud' ? 'cloud' : 'smartphone'} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium first-letter:uppercase">{when(o.at)}</span>
              <span className="block text-sm text-muted truncate">{o.source === 'cloud' ? 'Nube · ' : 'Este dispositivo · '}{o.detail}</span>
            </span>
            <Button size="sm" onClick={() => void restore(o)} disabled={!!busy}>{busy === o.key ? 'Recuperando…' : 'Recuperar'}</Button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
