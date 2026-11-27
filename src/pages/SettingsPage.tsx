import { useRef, useState, type ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import { inputClass, Segmented, Switch } from '../components/ui/controls';
import { CATALOG } from '../domain/shop';
import { seasonById } from '../domain/seasons';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { PLANS } from '../domain/plans';
import type { Settings } from '../domain/types';
import { cn } from '../lib/cn';
import { requestNotificationPermission } from '../features/reminders';
import { InstallCard } from '../features/install';
import { AccountCard } from '../features/account';
import { BackupsModal, describeRestore } from '../features/Backups';
import { restoreBackup } from '../services/sync';
import { actions } from '../store/actions';
import { appStore, useApp } from '../store/appStore';
import { useIsAdmin } from '../services/admin';
import { ui } from '../store/uiStore';

function Card({ title, children, description }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-[1.5rem] bg-surface border border-line shadow-card px-5 pt-4 pb-2">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      <div className="mt-1 divide-y divide-line">{children}</div>
    </section>
  );
}

/** Administración: devolver a tu armario un complemento perdido (también de temporadas pasadas). */
function GrantItemRow() {
  const owned = useApp((s) => s.frog.owned);
  const options = CATALOG.filter((i) => i.slot !== 'skin' && !owned.includes(i.id));
  const [id, setId] = useState('');
  const item = options.find((i) => i.id === id);
  return (
    <Row label="Recuperar un complemento" description="Añade a tu armario un complemento sin pagarlo, aunque sea de una temporada que ya terminó. Solo para tu cuenta.">
      <div className="flex gap-2 w-full sm:w-auto">
        <select aria-label="Complemento" value={id} onChange={(e) => setId(e.target.value)} className={cn(inputClass, 'h-10 py-0 min-w-0 flex-1 sm:w-56')}>
          <option value="">Elige uno…</option>
          {options.map((i) => (
            <option key={i.id} value={i.id}>{i.name}{i.season ? ` · T${seasonById(i.season)?.number ?? ''}` : ''}</option>
          ))}
        </select>
        <Button size="sm" disabled={!item} onClick={() => { if (!item) return; actions.grantItem(item.id); ui.toast({ message: `«${item.name}» ya está en tu armario` }); setId(''); }}>Añadir</Button>
      </div>
    </Row>
  );
}

function Row({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-6 py-3.5">
      <div>
        <div className="font-medium">{label}</div>
        {description && <div className="text-sm text-muted mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const isAdmin = useIsAdmin();
  const settings = useApp((s) => s.settings);
  const plan = useApp((s) => s.meta.plan);
  const frogName = useApp((s) => s.frog.name);
  const set = (p: Partial<Settings>) => actions.updateSettings(p);
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = () => {
    const blob = new Blob([actions.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `croac-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar COMBINA con lo que hay (no borra nada); en un dispositivo vacío, lo carga tal cual.
  const importData = async (file: File) => {
    const text = await file.text();
    const s = appStore.get();
    if (!s.tasks.length && !s.history.length) {
      const r = actions.importData(text);
      ui.toast(r.ok ? { message: 'Copia restaurada' } : { message: r.error!, tone: 'danger' });
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      ui.toast({ message: 'No se pudo leer el archivo. Comprueba que es un .json exportado desde Croac.', tone: 'danger' });
      return;
    }
    const r = await restoreBackup(raw);
    ui.toast(r ? { message: describeRestore(r), tone: 'reward', duration: 7000 } : { message: 'El archivo no tiene el formato de una copia de Croac.', tone: 'danger' });
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Ajustes</h1>
      </header>

      <AccountCard />
      {isAdmin && (
        <Card title="Administración" description="Solo lo ves tú: tu cuenta está en la lista de administradores del servidor.">
          <Row label="Probador de complementos" description="Coloca complementos y caras en las cinco etapas y publica los ajustes para todos.">
            <a href="#/admin/probador" className="h-10 px-4 rounded-xl bg-surface-2 border border-line font-semibold inline-flex items-center gap-1.5 hover:border-lily">
              Abrir <Icon name="chevronRight" size={16} />
            </a>
          </Row>
          <GrantItemRow />
        </Card>
      )}
      <InstallCard />

      <Card title="Reglas del juego" description="Cómo de exigente es la charca.">
        <Switch
          checked={settings.penaltiesEnabled}
          onChange={(v) => set({ penaltiesEnabled: v })}
          label="Penalizar tareas atrasadas"
          description={`${frogName} pierde experiencia cada día que una tarea pasa del margen.`}
        />
        <Row label="Días de margen" description="Días que una tarea puede ir atrasada antes de empezar a restar XP.">
          <Segmented<number> value={settings.graceDays} onChange={(v) => set({ graceDays: v })} options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))} />
        </Row>
        <Switch
          checked={settings.vacationMode}
          onChange={(v) => set({ vacationMode: v })}
          label="Modo vacaciones"
          description={`Pausa todas las penalizaciones. ${frogName} se echará una siesta.`}
        />
      </Card>

      <Card title="Día y calendario">
        <Row label="El día empieza a las" description="Útil si sueles terminar tareas pasada la medianoche.">
          <select
            className="h-10 pl-3 pr-8 rounded-xl bg-surface-2 border border-line"
            value={settings.dayStartHour}
            onChange={(e) => set({ dayStartHour: Number(e.target.value) })}
            aria-label="Hora de inicio del día"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
          </select>
        </Row>
        <Row label="Orden de las tareas" description="Personalizado: el que eliges arrastrando. Prioridad: urgentes y con hora primero.">
          <Segmented<Settings['taskSort']> value={settings.taskSort} onChange={(v) => set({ taskSort: v })} options={[{ value: 'manual', label: 'Personalizado' }, { value: 'smart', label: 'Prioridad' }]} />
        </Row>
        <Row label="La semana empieza en">
          <Segmented<0 | 1> value={settings.weekStartsOn} onChange={(v) => set({ weekStartsOn: v })} options={[{ value: 1, label: 'Lunes' }, { value: 0, label: 'Domingo' }]} />
        </Row>
      </Card>

      <Card title="Apariencia y avisos">
        <Row label="Tema">
          <Segmented<Settings['theme']> value={settings.theme} onChange={(v) => set({ theme: v })}
            options={[{ value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
        </Row>
        <Switch
          checked={settings.notifications}
          onChange={async (v) => {
            if (v && !(await requestNotificationPermission())) {
              ui.toast({ message: 'El navegador ha bloqueado las notificaciones. Actívalas en los permisos del sitio.', tone: 'warning' });
              return;
            }
            set({ notifications: v });
          }}
          label="Notificaciones del navegador"
          description="Recordatorios a la hora de cada tarea y avisos de tareas atrasadas mientras la app está abierta."
        />
        <Switch checked={settings.sounds} onChange={(v) => set({ sounds: v })} label="Sonidos" description="Un pequeño «croac» al completar tareas." />
      </Card>

      <section className="mt-5 rounded-[1.5rem] border border-line overflow-hidden">
        <div className="grid sm:grid-cols-2">
          {(['free', 'pro'] as const).map((p) => {
            const info = PLANS[p];
            const active = plan === p;
            return (
              <div key={p} className={cn('p-5', p === 'pro' ? 'bg-pro-soft' : 'bg-surface')}>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold flex items-center gap-1.5">
                    {p === 'pro' && <Icon name="sparkles" size={18} className="text-pro" />}{info.name}
                  </h2>
                  {active && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-lily-soft text-lily-strong">Tu plan</span>}
                </div>
                <p className="text-sm text-muted mt-0.5">{info.tagline}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {info.perks.map((perk) => <li key={perk} className="flex gap-2"><Icon name="check" size={16} className="text-lily shrink-0 mt-0.5" />{perk}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 bg-surface-2 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <span className="text-muted">Los pagos aún no están conectados. Puedes probar Pro en modo demostración.</span>
          <Button size="sm" variant={plan === 'pro' ? 'secondary' : 'primary'} onClick={() => actions.setPlan(plan === 'pro' ? 'free' : 'pro')}>
            {plan === 'pro' ? 'Volver a Gratis' : 'Probar Pro (demo)'}
          </Button>
        </div>
      </section>

      <Card title="Tus datos" description="Se guardan en este dispositivo y, con cuenta, en la nube. Además se hacen copias automáticas.">
        <Row label="Recuperar datos" description="¿Te falta algo? Recupera tareas hechas, compras o experiencia de una copia automática, sin borrar nada.">
          <Button size="sm" icon="history" onClick={() => setBackupsOpen(true)}>Ver copias</Button>
        </Row>
        <Row label="Exportar copia" description="Descarga un archivo .json con todas tus tareas y tu rana.">
          <Button size="sm" icon="download" onClick={exportData}>Exportar</Button>
        </Row>
        <Row label="Importar copia" description="Añade lo que tenga el archivo y ahora falte (tareas hechas, compras, experiencia). No borra nada.">
          <Button size="sm" icon="upload" onClick={() => fileRef.current?.click()}>Importar</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importData(f); e.target.value = ''; }} />
        </Row>
        <Row label="Empezar de cero" description="Borra tareas, historial y progreso de la rana.">
          <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirmReset(true)}>Borrar todo</Button>
        </Row>
      </Card>

      <div className="hidden lg:block">
      <Card title="Atajos de teclado">
        <div className="py-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {[['N', 'Nueva tarea'], ['/', 'Buscar tareas'], ['H', 'Ir a Hoy'], ['P', 'Ver el calendario'], ['Esc', 'Cerrar ventanas']].map(([k, d]) => (
            <div key={k} className="contents">
              <kbd className="font-sans font-semibold text-xs px-2 h-6 min-w-6 inline-flex items-center justify-center rounded-md border border-line bg-surface-2">{k}</kbd>
              <span className="text-muted self-center">{d}</span>
            </div>
          ))}
        </div>
      </Card>
      </div>

      <p className="text-center text-xs text-muted mt-8">Croac v{__APP_VERSION__}</p>

      <BackupsModal open={backupsOpen} onClose={() => setBackupsOpen(false)} />
      <Modal
        open={confirmReset} onClose={() => setConfirmReset(false)} size="sm" title="¿Borrar todos los datos?"
        footer={<><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancelar</Button><Button variant="danger" onClick={() => { actions.resetAll(); setConfirmReset(false); }}>Borrar todo</Button></>}
      >
        <p className="text-[15px]">Se eliminarán tus tareas, el historial y todo el progreso de {frogName}. No se puede deshacer. Si quieres conservar algo, exporta una copia antes.</p>
      </Modal>
    </div>
  );
}
