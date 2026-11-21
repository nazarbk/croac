import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Frog, FrogScene } from '../../components/frog/Frog';
import { EYES_MEASURED, ITEM_ART, STAGE_ART, type ItemArt } from '../../components/frog/art';
import type { FitAdjust, FitConfig } from '../../components/frog/fit-schema';
import { FIT_LIMITS, ITEM_ID, stringifyFit, validateFit } from '../../components/frog/fit-schema.js';
import { layoutFrog, mapPoint, PROJECT_FIT, resolveAdjust, slotOf, type AccSlot, type ItemLayout } from '../../components/frog/layout';
import type { Mood } from '../../domain/engine';
import { STAGES, type StageId } from '../../domain/progression';
import { CATALOG } from '../../domain/shop';
import { cn } from '../../lib/cn';
import { copyStage, getScope, patchAdjust, renameItem, restoreFrom, setSplit, type Scope } from './fitEdit';
import { artSnippet, loadLocalImage, SLOT_DEFAULTS, type LocalItem } from './localImage';
import { LAYERED_ART, layeredStageReady, MOODS as SKIN_MOODS, SKIN_MODELS } from '../../components/frog/skins';

/**
 * Probador de complementos (#/dev/wardrobe). Solo se incluye en desarrollo (ver App.tsx).
 *
 * Tres niveles de guardado, siempre a la vista:
 *   1. Cambios temporales: en memoria, en esta pestaña.
 *   2. Borrador local: localStorage de este navegador. NO es el proyecto.
 *   3. Proyecto: src/components/frog/accessory-fit.json. Solo se escribe con
 *      «Incorporar al proyecto» (servidor de desarrollo de Vite) o con `npm run fit:apply`.
 */

const DRAFT_KEY = 'croac:dev:fit-draft';
const FIT_ENDPOINT = '/__croac/fit';
const FIT_FILE = 'src/components/frog/accessory-fit.json';
const MOODS: { id: Mood; label: string }[] = [
  { id: 'neutral', label: 'Normal' }, { id: 'happy', label: 'Contenta' }, { id: 'worried', label: 'Preocupada' },
  { id: 'sad', label: 'Triste' }, { id: 'sleeping', label: 'Dormida' },
];
const SLOT_LABEL: Record<AccSlot, string> = { hat: 'Cabeza', neck: 'Cuello', eyes: 'Gafas' };
const ACC = CATALOG.filter((i): i is typeof i & { slot: AccSlot } => i.slot === 'hat' || i.slot === 'neck' || i.slot === 'eyes');
const SKINS = ['skin-green', ...CATALOG.filter((i) => i.slot === 'skin' && i.id !== 'skin-green').map((i) => i.id)];
const nameOf = (id: string) => CATALOG.find((i) => i.id === id)?.name ?? id;
const stageName = (s: StageId) => STAGES.find((x) => x.id === s)!.name;
const r2 = (v: number) => Math.round(v * 100) / 100;

function readDraft(): string | null {
  try { return localStorage.getItem(DRAFT_KEY); } catch { return null; }
}
function parseDraft(s: string | null): FitConfig | null {
  if (!s) return null;
  try {
    const r = validateFit(JSON.parse(s));
    return r.ok ? r.value : null;
  } catch { return null; }
}

interface History { past: FitConfig[]; present: FitConfig; future: FitConfig[] }
const undoH = (h: History): History => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h);
const redoH = (h: History): History => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h);
type Notice = { tone: 'ok' | 'warn' | 'error'; title: string; lines?: string[] };

export default function WardrobePage() {
  const [stage, setStage] = useState<StageId>('adult');
  const [mood, setMood] = useState<Mood>('happy');
  const [skin, setSkin] = useState('skin-green');
  const [itemId, setItemId] = useState('eyes-round');
  const [withOthers, setWithOthers] = useState(false);
  const [others, setOthers] = useState<Partial<Record<AccSlot, string>>>({ hat: 'hat-cap', neck: 'neck-bowtie', eyes: 'eyes-round' });
  const [bg, setBg] = useState<'light' | 'dark' | 'checker'>('light');
  const [guides, setGuides] = useState({ anchors: true, bounds: true, eyes: false, grid: false });
  const [scopeMode, setScopeMode] = useState<'stage' | 'base'>('stage');
  const [local, setLocal] = useState<LocalItem | null>(null);
  const [localSlot, setLocalSlot] = useState<AccSlot>('hat');
  const [saved, setSaved] = useState<string | null>(readDraft);
  const [hist, setHist] = useState<History>(() => ({ past: [], present: parseDraft(readDraft()) ?? PROJECT_FIT, future: [] }));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmWrite, setConfirmWrite] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(() => new URLSearchParams(location.hash.split('?')[1]).has('hoja'));
  const sheetSize = Number(new URLSearchParams(location.hash.split('?')[1]).get('hoja')) || 112;
  const lastEdit = useRef<{ key?: string; t: number }>({ t: 0 });

  const fit = hist.present;
  const scope: Scope = scopeMode === 'base' ? 'base' : stage;
  const slot = slotOf(itemId) ?? 'hat';
  const itemArt: Record<string, ItemArt> | undefined = local ? { [local.id]: local.art } : undefined;
  const itemHref = local ? { [local.id]: local.href } : undefined;
  const art = local ? { ...ITEM_ART, [local.id]: local.art } : ITEM_ART;
  const knownIds = [...ACC.map((i) => i.id), ...(local ? [local.id] : [])];

  const equippedFor = (id = itemId): Partial<Record<AccSlot | 'skin', string>> => {
    const s = slotOf(id) ?? 'hat';
    const e: Partial<Record<AccSlot | 'skin', string>> = { skin };
    if (withOthers) for (const k of ['hat', 'neck', 'eyes'] as AccSlot[]) if (others[k] && k !== s) e[k] = others[k];
    e[s] = id;
    return e;
  };
  const frogProps = { fit, itemArt, itemHref, equipped: equippedFor() };

  // ---------- Edición e historial ----------
  const edit = (f: (c: FitConfig) => FitConfig, key?: string) => {
    const now = Date.now();
    const merge = !!key && lastEdit.current.key === key && now - lastEdit.current.t < 900;
    lastEdit.current = { key, t: now };
    setHist((h) => {
      const next = f(h.present);
      if (stringifyFit(next) === stringifyFit(h.present)) return h;
      return merge ? { ...h, present: next, future: [] } : { past: [...h.past.slice(-199), h.present], present: next, future: [] };
    });
  };
  const undo = () => setHist(undoH);
  const redo = () => setHist(redoH);
  const setField = (patch: Partial<FitAdjust>, key: string) => edit((c) => patchAdjust(c, itemId, scope, patch), `${key}:${itemId}:${scope}`);
  const nudge = (patch: (a: FitAdjust) => Partial<FitAdjust>, key: string) =>
    edit((c) => patchAdjust(c, itemId, scope, patch(scopeBase(c))), `${key}:${itemId}:${scope}`);
  /** Valores de partida para editar en el ámbito actual (en «etapa», lo que se ve ahora). */
  const scopeBase = (c: FitConfig): FitAdjust => (scope === 'base' ? getScope(c, itemId, 'base') ?? {} : resolveAdjust(c, itemId, stage));

  // Atajos globales: deshacer/rehacer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); setHist(undoH); }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); setHist(redoH); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Estado de guardado ----------
  const draftStr = stringifyFit(fit);
  const projectStr = stringifyFit(PROJECT_FIT);
  const unsaved = draftStr !== (saved ?? projectStr);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  useEffect(() => { document.title = 'Probador · Croac (desarrollo)'; }, []);

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, draftStr);
      setSaved(draftStr);
      setNotice({ tone: 'ok', title: 'Borrador guardado en este navegador', lines: ['Solo en localStorage: el proyecto no ha cambiado.'] });
    } catch {
      setNotice({ tone: 'error', title: 'No se pudo guardar el borrador (localStorage bloqueado o lleno)' });
    }
  };
  const dropDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* nada */ }
    setSaved(null);
    setNotice({ tone: 'ok', title: 'Borrador local borrado', lines: ['Lo que ves sigue en esta pestaña hasta que recargues.'] });
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([draftStr], { type: 'application/json' }));
    a.download = 'accessory-fit.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setNotice({ tone: 'ok', title: 'JSON descargado', lines: ['Para incorporarlo: npm run fit:apply -- ruta/al/accessory-fit.json'] });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draftStr);
      setNotice({ tone: 'ok', title: 'JSON copiado al portapapeles' });
    } catch {
      setNotice({ tone: 'error', title: 'El navegador no deja copiar: usa «Descargar JSON»' });
    }
  };
  const importFile = async (file: File) => {
    let data: unknown;
    try { data = JSON.parse(await file.text()); } catch {
      setNotice({ tone: 'error', title: `${file.name} no es un JSON válido` });
      return;
    }
    const r = validateFit(data, { knownIds });
    if (!r.ok) {
      setNotice({ tone: 'error', title: `No se ha importado ${file.name}: tiene errores`, lines: r.errors.slice(0, 12) });
      return;
    }
    edit(() => r.value);
    setNotice({ tone: r.warnings.length ? 'warn' : 'ok', title: `Importado ${file.name} (cambios temporales: guárdalos o incorpóralos)`, lines: r.warnings });
  };
  const writeProject = async () => {
    setConfirmWrite(false);
    try {
      const res = await fetch(FIT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Croac-Fit': '1' }, body: draftStr });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.errors?.join(' · ') || body.error || `HTTP ${res.status}`);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* nada */ }
      setSaved(null);
      setNotice({ tone: 'ok', title: `Escrito en ${body.file ?? FIT_FILE}`, lines: ['Confirmado por el servidor de desarrollo. Revisa el cambio con git diff y haz commit cuando quieras.', 'El borrador local se ha borrado porque ya está en el proyecto.'] });
    } catch (e) {
      setNotice({ tone: 'error', title: 'No se ha escrito nada en el proyecto', lines: [String((e as Error).message ?? e), 'Alternativa: «Descargar JSON» y npm run fit:apply -- ruta/al/archivo.json'] });
    }
  };

  // ---------- PNG local ----------
  const loadPng = async (file: File) => {
    const id = local?.id && slotOf(local.id) === localSlot ? local.id : `${localSlot}-nuevo`;
    try {
      const item = await loadLocalImage(file, localSlot, id);
      if (local) URL.revokeObjectURL(local.href);
      setLocal(item);
      setItemId(item.id);
      setNotice({ tone: 'ok', title: `${file.name} cargado solo en este navegador`, lines: [`${item.size[0]} × ${item.size[1]} px · parte visible ${item.art.bounds ? item.art.bounds.join(', ') : 'todo el archivo'} · no se sube a ningún sitio`] });
    } catch (e) {
      setNotice({ tone: 'error', title: 'No se pudo leer la imagen', lines: [String((e as Error).message ?? e)] });
    }
  };
  const renameLocal = (id: string) => {
    if (!local || !ITEM_ID.test(id) || slotOf(id) !== slotOf(local.id) || ITEM_ART[id]) return false;
    edit((c) => renameItem(c, local.id, id));
    setLocal({ ...local, id });
    setItemId(id);
    return true;
  };
  const setLocalArt = (patch: Partial<ItemArt>) => local && setLocal({ ...local, art: { ...local.art, ...patch } });

  // ---------- Dibujo principal ----------
  const layout = layoutFrog(stage, mood, [equippedFor().neck, equippedFor().hat, mood === 'sleeping' ? undefined : equippedFor().eyes], fit, art);
  const sel = [...layout.back, ...layout.front].find((l) => l.id === itemId);
  const eff = resolveAdjust(fit, itemId, stage);
  const scoped = getScope(fit, itemId, scope) ?? {};
  const split = fit.items[itemId]?.split;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="lg:sticky lg:top-0 z-20 border-b border-line bg-surface/95 backdrop-blur px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-extrabold leading-tight">Probador de complementos</h1>
            <p className="text-[12px] text-muted">Herramienta de desarrollo · no existe en la app publicada</p>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <Status tone={unsaved ? 'warn' : 'idle'} title="Cambios temporales" text={unsaved ? 'Sin guardar: se pierden al recargar' : 'Ninguno'} />
            <Status tone={saved ? 'info' : 'idle'} title="Borrador local" text={saved ? (saved === draftStr ? 'En este navegador · al día' : 'En este navegador · anterior') : 'No hay'} />
            <Status tone={draftStr === projectStr ? 'ok' : 'idle'} title="Proyecto (accessory-fit.json)" text={`${Object.keys(PROJECT_FIT.items).length} ajustados · ${draftStr === projectStr ? 'es lo que ves' : 'distinto de lo que ves'}`} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <Btn onClick={undo} disabled={!hist.past.length} title="Ctrl+Z">Deshacer ({hist.past.length})</Btn>
          <Btn onClick={redo} disabled={!hist.future.length} title="Ctrl+Mayús+Z">Rehacer</Btn>
          <Sep />
          <Btn onClick={saveDraft} disabled={saved === draftStr}>Guardar borrador local</Btn>
          <Btn onClick={dropDraft} disabled={!saved}>Borrar borrador</Btn>
          <Btn onClick={() => edit(() => PROJECT_FIT)} disabled={draftStr === projectStr}>Volver al proyecto</Btn>
          <Sep />
          <Btn onClick={download}>Descargar JSON</Btn>
          <Btn onClick={copy}>Copiar JSON</Btn>
          <label className="h-8 px-3 rounded-lg border border-line bg-surface text-[13px] font-medium inline-flex items-center cursor-pointer hover:bg-surface-2">
            Importar JSON
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
          </label>
          <Sep />
          {!confirmWrite ? (
            <Btn tone="primary" onClick={() => setConfirmWrite(true)} disabled={draftStr === projectStr}>Incorporar al proyecto…</Btn>
          ) : (
            <span className="inline-flex gap-2 items-center text-[13px]">
              <span>¿Escribir <code className="font-mono">{FIT_FILE}</code>?</span>
              <Btn tone="primary" onClick={() => void writeProject()}>Sí, escribir</Btn>
              <Btn onClick={() => setConfirmWrite(false)}>Cancelar</Btn>
            </span>
          )}
        </div>
        {notice && (
          <div role="status" className={cn('mt-2.5 rounded-xl px-3 py-2 text-[13px] border flex gap-3 items-start',
            notice.tone === 'ok' && 'bg-lily-soft border-lily/30', notice.tone === 'warn' && 'bg-warn-soft border-warn/30', notice.tone === 'error' && 'bg-danger-soft border-danger/30 text-danger')}>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{notice.title}</div>
              {notice.lines?.map((l, i) => <div key={i} className="break-words">{l}</div>)}
            </div>
            <button type="button" className="text-muted hover:text-ink" onClick={() => setNotice(null)} aria-label="Cerrar">✕</button>
          </div>
        )}
      </header>

      <main className="p-4 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px] lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ---------- Selección ---------- */}
        <Panel title="Qué probar">
          <Label text="Etapa">
            <Chips value={stage} onChange={setStage} options={STAGES.map((s) => ({ value: s.id, label: s.name }))} />
          </Label>
          <Label text="Ánimo">
            <Chips value={mood} onChange={setMood} options={MOODS.map((m) => ({ value: m.id, label: m.label }))} />
          </Label>
          <Label text="Piel">
            <select className={selectCls} value={skin} onChange={(e) => setSkin(e.target.value)}>
              {SKINS.map((s) => <option key={s} value={s}>{nameOf(s)}{CATALOG.find((i) => i.id === s)?.hidden ? ' (oculta)' : ''}</option>)}
            </select>
          </Label>
          <Label text="Complemento">
            <select className={selectCls} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {(['hat', 'neck', 'eyes'] as AccSlot[]).map((s) => (
                <optgroup key={s} label={SLOT_LABEL[s]}>
                  {ACC.filter((i) => i.slot === s).map((i) => <option key={i.id} value={i.id}>{i.name}{i.season ? ` (T${i.season.slice(1)})` : ''}{fit.items[i.id] ? ' •' : ''}</option>)}
                </optgroup>
              ))}
              {local && <optgroup label="PNG local"><option value={local.id}>{local.name} → {local.id}</option></optgroup>}
            </select>
            <p className="text-[12px] text-muted mt-1">• = tiene ajustes en lo que ves</p>
          </Label>
          <Label text="Combinación">
            <Chips value={withOthers ? 'combo' : 'solo'} onChange={(v) => setWithOthers(v === 'combo')} options={[{ value: 'solo', label: 'Solo este' }, { value: 'combo', label: 'Con otros' }]} />
            {withOthers && (['hat', 'neck', 'eyes'] as AccSlot[]).filter((s) => s !== slot).map((s) => (
              <select key={s} className={cn(selectCls, 'mt-2')} value={others[s] ?? ''} onChange={(e) => setOthers({ ...others, [s]: e.target.value || undefined })}>
                <option value="">{SLOT_LABEL[s]}: nada</option>
                {ACC.filter((i) => i.slot === s).map((i) => <option key={i.id} value={i.id}>{SLOT_LABEL[s]}: {i.name}</option>)}
              </select>
            ))}
          </Label>
          <Label text="Fondo">
            <Chips value={bg} onChange={setBg} options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }, { value: 'checker', label: 'Cuadros' }]} />
          </Label>
          <Label text="Guías">
            <div className="grid grid-cols-2 gap-1.5 text-[13px]">
              <Check label="Anclajes" value={guides.anchors} onChange={(v) => setGuides({ ...guides, anchors: v })} />
              <Check label="Límites" value={guides.bounds} onChange={(v) => setGuides({ ...guides, bounds: v })} />
              <Check label="Ojos medidos" value={guides.eyes} onChange={(v) => setGuides({ ...guides, eyes: v })} />
              <Check label="Cuadrícula" value={guides.grid} onChange={(v) => setGuides({ ...guides, grid: v })} />
            </div>
          </Label>

          <div className="border-t border-line pt-3 mt-1">
            <div className="text-sm font-semibold">Probar un PNG nuevo</div>
            <p className="text-[12px] text-muted mt-0.5 leading-snug">Se abre solo en este navegador: no se sube a ningún servidor ni se copia al proyecto.</p>
            <div className="flex gap-2 mt-2">
              <select className={selectCls} style={{ width: '7rem', flexShrink: 0 }} value={localSlot} onChange={(e) => setLocalSlot(e.target.value as AccSlot)} aria-label="Hueco">
                {(['hat', 'neck', 'eyes'] as AccSlot[]).map((s) => <option key={s} value={s}>{SLOT_LABEL[s]}</option>)}
              </select>
              <label className="flex-1 min-w-0 whitespace-nowrap h-9 px-3 rounded-lg border border-dashed border-line bg-surface-2 text-[13px] font-medium inline-flex items-center justify-center cursor-pointer hover:border-lily">
                Elegir PNG…
                <input type="file" accept="image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadPng(f); e.target.value = ''; }} />
              </label>
            </div>
            {local && <LocalPanel local={local} onRename={renameLocal} onArt={setLocalArt} onRemove={() => { URL.revokeObjectURL(local.href); setLocal(null); if (itemId === local.id) setItemId(ACC[0].id); }} />}
          </div>
        </Panel>

        {/* ---------- Lienzo ---------- */}
        <section className="min-w-0">
          <Canvas
            bg={bg} stage={stage} mood={mood} guides={guides} sel={sel} layout={layout}
            frog={<Frog level={1} stageOverride={stage} mood={mood} {...frogProps} className="absolute inset-0 w-full h-full" />}
            onDrag={(dx, dy, start) => edit((c) => patchAdjust(c, itemId, scope, { x: r2(start.x + dx), y: r2(start.y + dy) }), `drag:${start.t}`)}
            dragStart={() => { const a = scopeBase(fit); return { x: a.x ?? 0, y: a.y ?? 0, t: Date.now() }; }}
            onKey={(e) => {
              const step = e.shiftKey ? 2 : e.altKey ? 0.1 : 0.5;
              const arrows: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
              if (arrows[e.key]) {
                e.preventDefault();
                const [dx, dy] = arrows[e.key];
                nudge((a) => ({ x: r2((a.x ?? 0) + dx), y: r2((a.y ?? 0) + dy) }), 'key-move');
              } else if (e.key === '+' || e.key === '=' || e.key === '-') {
                e.preventDefault();
                const d = (e.key === '-' ? -1 : 1) * (e.shiftKey ? 0.05 : 0.01);
                nudge((a) => ({ scale: r2(Math.min(FIT_LIMITS.scale[1], Math.max(FIT_LIMITS.scale[0], (a.scale ?? 1) + d))) }), 'key-scale');
              } else if (e.key === '[' || e.key === ']' || e.key === '{' || e.key === '}') {
                e.preventDefault();
                const d = (e.key === '[' || e.key === '{' ? -1 : 1) * (e.shiftKey ? 5 : 1);
                nudge((a) => ({ rotate: r2((a.rotate ?? 0) + d) }), 'key-rotate');
              }
            }}
          />
          <p className="text-[12px] text-muted mt-2 leading-relaxed">
            Arrastra para mover · Flechas 0,5 (Mayús 2 · Alt 0,1) · <kbd>+</kbd>/<kbd>−</kbd> escala · <kbd>[</kbd>/<kbd>]</kbd> giro · Ctrl+Z deshacer.
            Coordenadas en la caja de 240 × 240 de la rana: el resultado no depende del tamaño en pantalla.
          </p>
        </section>

        {/* ---------- Ajuste ---------- */}
        <Panel title={`Ajuste · ${local?.id === itemId ? local.name : nameOf(itemId)}`} className="lg:col-span-2 xl:col-span-1">
          <Chips value={scopeMode} onChange={setScopeMode} options={[{ value: 'stage', label: `Solo ${stageName(stage)}` }, { value: 'base', label: 'Todas las etapas (base)' }]} />
          <p className="text-[12px] text-muted -mt-1 leading-snug">
            {scopeMode === 'stage' ? 'Lo de la etapa manda sobre la base, campo a campo.' : 'La base se aplica en todas las etapas salvo donde la etapa tenga su propio valor.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Num label="X" value={scoped.x} fallback={eff.x ?? 0} step={0.1} onChange={(v) => setField({ x: v }, 'x')} />
            <Num label="Y" value={scoped.y} fallback={eff.y ?? 0} step={0.1} onChange={(v) => setField({ y: v }, 'y')} />
            <Num label="Escala" value={scoped.scale} fallback={eff.scale ?? 1} step={0.01} min={FIT_LIMITS.scale[0]} max={FIT_LIMITS.scale[1]} onChange={(v) => setField({ scale: v }, 'scale')} />
            <Num label="Giro (°)" value={scoped.rotate} fallback={eff.rotate ?? 0} step={0.5} onChange={(v) => setField({ rotate: v }, 'rotate')} />
            <Num label="Pivote X (0-1)" value={scoped.pivot?.[0]} fallback={eff.pivot?.[0] ?? art[itemId]?.ax ?? 0.5} step={0.05} onChange={(v) => setField({ pivot: v === undefined ? undefined : [v, scoped.pivot?.[1] ?? eff.pivot?.[1] ?? art[itemId]?.ay ?? 0.5] }, 'pivot')} />
            <Num label="Pivote Y (0-1)" value={scoped.pivot?.[1]} fallback={eff.pivot?.[1] ?? art[itemId]?.ay ?? 0.5} step={0.05} onChange={(v) => setField({ pivot: v === undefined ? undefined : [scoped.pivot?.[0] ?? eff.pivot?.[0] ?? art[itemId]?.ax ?? 0.5, v] }, 'pivot')} />
            <Num label="Orden (z)" value={scoped.z} fallback={sel?.z ?? 0} step={1} onChange={(v) => setField({ z: v === undefined ? undefined : Math.round(v) }, 'z')} />
            <label className="text-[12px] font-medium text-muted">Capa
              <select className={cn(selectCls, 'mt-1')} value={scoped.layer ?? ''} onChange={(e) => setField({ layer: (e.target.value || undefined) as FitAdjust['layer'] }, 'layer')}>
                <option value="">({eff.layer ?? 'front'})</option><option value="front">Delante</option><option value="back">Detrás de la rana</option>
              </select>
            </label>
            <label className="text-[12px] font-medium text-muted col-span-2">Repintar encima
              <select className={cn(selectCls, 'mt-1')} value={scoped.overlay ?? ''} onChange={(e) => setField({ overlay: (e.target.value || undefined) as FitAdjust['overlay'] }, 'overlay')}>
                <option value="">Automático ({sel?.overlay === 'eyes' ? 'ojos' : sel?.overlay === 'head' ? 'cabeza' : 'nada'})</option>
                <option value="none">Nada</option><option value="eyes">Ojos (sombrero entre los ojos)</option><option value="head">Cabeza (meter bajo la barbilla)</option>
              </select>
            </label>
          </div>
          {slot === 'eyes' && (
            <div className="rounded-xl border border-line p-2.5 space-y-2">
              <div className="text-[13px] font-semibold">Lentes separadas (opcional)</div>
              <p className="text-[12px] text-muted leading-snug">Corta la misma imagen en lente izquierda, puente y lente derecha (en proporción del ancho). Las lentes se mueven enteras; solo se estira el puente.</p>
              <div className="grid grid-cols-3 gap-2">
                <Num label="Fin izq." value={split?.[0]} fallback={0.42} step={0.01} onChange={(v) => edit((c) => setSplit(c, itemId, v === undefined ? undefined : [v, Math.max(v, split?.[1] ?? 0.58)]), 'split')} />
                <Num label="Inicio der." value={split?.[1]} fallback={0.58} step={0.01} onChange={(v) => edit((c) => setSplit(c, itemId, v === undefined ? undefined : [Math.min(v, split?.[0] ?? 0.42), v]), 'split')} />
                <Num label="Separar" value={scoped.spread} fallback={eff.spread ?? 0} step={0.25} disabled={!split} onChange={(v) => setField({ spread: v }, 'spread')} />
              </div>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <div className="text-[13px] font-semibold">Restablecer</div>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => edit((c) => restoreFrom(c, PROJECT_FIT, itemId, scope))}>Como en el proyecto ({scopeMode === 'base' ? 'base' : stageName(stage)})</Btn>
              <Btn onClick={() => edit((c) => patchAdjust(c, itemId, scope, null))}>Valores originales ({scopeMode === 'base' ? 'base' : stageName(stage)})</Btn>
              <Btn onClick={() => edit((c) => restoreFrom(c, { version: 1, items: {} }, itemId))}>Todo el complemento a los originales</Btn>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[13px] font-semibold">Copiar el ajuste de {stageName(stage)} a…</div>
            <div className="flex flex-wrap gap-2">
              {STAGES.filter((s) => s.id !== stage).map((s) => (
                <Btn key={s.id} onClick={() => { edit((c) => copyStage(c, itemId, stage, s.id)); setNotice({ tone: 'ok', title: `Ajuste de ${stageName(stage)} copiado a ${s.name}`, lines: ['Solo esa etapa. Es un punto de partida: revísala.'] }); }}>{s.name}</Btn>
              ))}
            </div>
          </div>
          <details className="text-[12px]">
            <summary className="cursor-pointer text-muted">Datos calculados</summary>
            <pre className="mt-2 p-2 rounded-lg bg-surface-2 overflow-x-auto text-[11px] leading-snug">{JSON.stringify({
              etapa: fit.items[itemId]?.stages?.[stage] ?? null, base: fit.items[itemId]?.base ?? null,
              apoyo: sel?.support.map(r2), visible: sel && [r2(sel.visible.x), r2(sel.visible.y), r2(sel.visible.w), r2(sel.visible.h)], z: sel?.z, capa: sel?.layer,
            }, null, 1)}</pre>
          </details>
        </Panel>
      </main>

      {/* ---------- Las cinco etapas ---------- */}
      <section className="px-4 pb-4">
        <h2 className="text-sm font-semibold mb-2">Las cinco etapas · {MOODS.find((m) => m.id === mood)!.label.toLowerCase()}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAGES.map((s) => (
            <button key={s.id} type="button" onClick={() => setStage(s.id)}
              className={cn('rounded-2xl border p-2 text-left bg-surface', s.id === stage ? 'border-lily ring-2 ring-lily/30' : 'border-line hover:border-lily/50')}>
              <div className={cn('relative aspect-square rounded-xl overflow-hidden', bgCls(bg))}>
                <Frog level={1} stageOverride={s.id} mood={mood} {...frogProps} className="absolute inset-0 w-full h-full" />
              </div>
              <div className="mt-1.5 text-[13px] font-medium flex items-center gap-1.5">
                {s.name}
                {fit.items[itemId]?.stages?.[s.id] && <span className="text-[11px] px-1.5 rounded bg-lily-soft text-lily-strong">ajustada</span>}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Todos a la vez ---------- */}
      <section className="px-4 pb-4">
        <details open={sheetOpen} onToggle={(e) => setSheetOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer text-sm font-semibold">Todos los complementos en las cinco etapas (para revisar de un vistazo)</summary>
          {sheetOpen && (
            <div className="mt-3 overflow-x-auto">
              <table className="border-separate border-spacing-1.5">
                <thead>
                  <tr><th />{STAGES.map((s) => <th key={s.id} className="text-[12px] font-medium text-muted">{s.name}</th>)}</tr>
                </thead>
                <tbody>
                  {[...ACC.map((i) => i.id), ...(local ? [local.id] : [])].map((id) => (
                    <tr key={id}>
                      <th className="text-left text-[12px] font-medium pr-2 max-w-32">
                        <button type="button" className={cn('text-left hover:underline', id === itemId && 'text-lily-strong')} onClick={() => setItemId(id)}>{local?.id === id ? local.name : nameOf(id)}</button>
                      </th>
                      {STAGES.map((s) => (
                        <td key={s.id}>
                          <button type="button" onClick={() => { setItemId(id); setStage(s.id); }} className={cn('block rounded-xl overflow-hidden', bgCls(bg), id === itemId && s.id === stage && 'ring-2 ring-lily')} style={{ width: sheetSize, height: sheetSize }} aria-label={`${nameOf(id)} · ${s.name}`}>
                            <Frog level={1} stageOverride={s.id} mood={mood} fit={fit} itemArt={itemArt} itemHref={itemHref} equipped={equippedFor(id)} className="w-full h-full" />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      </section>

      {/* ---------- Pieles por capas ---------- */}
      <section className="px-4 pb-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Pieles por capas: estado de los recursos</summary>
          <p className="text-[12px] text-muted mt-2 max-w-3xl leading-snug">
            La rana se dibuja con las ilustraciones completas de cada piel. La composición por capas (colores + sombreado + expresión) solo se activa
            en una etapa cuando tiene todos sus recursos; la lista exacta está en docs/PIELES.md.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="text-[12px] border-separate border-spacing-x-3 border-spacing-y-1">
              <thead><tr className="text-muted text-left"><th>Etapa</th><th>Sombreado</th><th>Máscaras</th>{SKIN_MOODS.map((m) => <th key={m}>Cara {m}</th>)}<th>Estado</th></tr></thead>
              <tbody>
                {STAGES.map((st) => {
                  const a = LAYERED_ART[st.id];
                  const mark = (ok: boolean) => <span className={ok ? 'text-lily-strong' : 'text-danger'}>{ok ? '✓' : '✗'}</span>;
                  return (
                    <tr key={st.id}>
                      <td className="font-medium">{st.name}</td>
                      <td>{mark(!!a?.shade)}</td>
                      <td>{mark(!!(a?.masks.body && a.masks.belly && a.masks.spots))}</td>
                      {SKIN_MOODS.map((m) => <td key={m}>{mark(!!a?.faces[m])}</td>)}
                      <td>{layeredStageReady(st.id) ? 'Lista' : 'Ilustraciones completas (fallback)'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.values(SKIN_MODELS).map((m) => (
              <div key={m.id} className="rounded-xl border border-line bg-surface px-2.5 py-2 text-[12px]">
                <div className="font-medium">{nameOf(m.id)}</div>
                <div className="flex gap-1 mt-1">
                  {Object.entries(m.colors).map(([k, c]) => <span key={k} title={`${k} ${c}`} className="w-5 h-5 rounded-md border border-black/10" style={{ background: c }} />)}
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* ---------- Tamaño real ---------- */}
      <section className="px-4 pb-10">
        <h2 className="text-sm font-semibold mb-1">A tamaño real, como en la app</h2>
        <p className="text-[12px] text-muted mb-3">Mismas clases y tamaños que la tienda (móvil y ordenador), Hoy, la revisión diaria, la charca y el perfil.</p>
        <div className="flex flex-wrap items-end gap-5">
          {[166, 214].map((w) => (
            <Real key={w} label={`Tienda ${w < 200 ? 'móvil' : 'ordenador'}`}>
              <div className="rounded-2xl border border-line bg-surface p-3 flex flex-col" style={{ width: w }}>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-2">
                  <Frog level={1} stageOverride={stage} mood="happy" fit={fit} itemArt={itemArt} itemHref={itemHref} equipped={{ skin, [slot]: itemId }} className="w-full h-full" />
                </div>
                <div className="mt-2.5 font-semibold leading-tight text-[15px]">{local?.id === itemId ? local.name : nameOf(itemId)}</div>
              </div>
            </Real>
          ))}
          <Real label="Hoy (128 px)"><Frog level={1} stageOverride={stage} mood={mood} {...frogProps} className="w-32 h-32" /></Real>
          <Real label="Revisión (80 px)"><Frog level={1} stageOverride={stage} mood="worried" {...frogProps} className="w-20 h-20" /></Real>
          <Real label="Charca (56 px)"><div className="w-14 h-14 rounded-full bg-water/20 overflow-hidden"><Frog level={1} stageOverride={stage} mood={mood} {...frogProps} className="w-full h-full scale-110 translate-y-0.5" /></div></Real>
          <Real label="Perfil"><FrogScene level={1} stageOverride={stage} mood={mood} {...frogProps} equipped={{ ...frogProps.equipped, background: 'bg-pond' }} className="w-[300px] aspect-[4/3] rounded-2xl" /></Real>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Lienzo con guías y arrastre ---------------- */

function Canvas({ bg, stage, mood, guides, sel, layout, frog, onDrag, dragStart, onKey }: {
  bg: 'light' | 'dark' | 'checker';
  stage: StageId;
  mood: Mood;
  guides: { anchors: boolean; bounds: boolean; eyes: boolean; grid: boolean };
  sel?: ItemLayout;
  layout: ReturnType<typeof layoutFrog>;
  frog: ReactNode;
  onDrag: (dx: number, dy: number, start: { x: number; y: number; t: number }) => void;
  dragStart: () => { x: number; y: number; t: number };
  onKey: (e: ReactKeyboardEvent<HTMLDivElement>) => void;
}) {
  const svg = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ p0: DOMPoint; start: { x: number; y: number; t: number } } | null>(null);
  const toBox = (e: { clientX: number; clientY: number }) => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  };
  const sa = STAGE_ART[stage];
  const f = layout.frame;
  const pt = (x: number, y: number) => mapPoint(f, x, y);
  const em = EYES_MEASURED[stage];
  const anchors: [string, string, [number, number, number]][] = [['hat', '#f59e0b', sa.hat], ['eyes', '#0ea5e9', sa.eyes], ['neck', '#a855f7', sa.neck]];
  const line = { vectorEffect: 'non-scaling-stroke' as const, fill: 'none' };

  return (
    <div
      tabIndex={0} onKeyDown={onKey} aria-label="Lienzo: arrastra o usa las flechas para mover el complemento"
      className={cn('relative w-full max-w-[560px] mx-auto aspect-square rounded-3xl border border-line overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-lily/30', bgCls(bg))}
    >
      {frog}
      <svg
        ref={svg} viewBox="0 0 240 240" className="absolute inset-0 w-full h-full touch-none cursor-move"
        onPointerDown={(e) => {
          const p = toBox(e);
          if (!p || !sel) return;
          (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
          drag.current = { p0: p, start: dragStart() };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const p = d && toBox(e);
          if (!d || !p) return;
          // Se edita en el encuadre neutral: se deshace la escala del ánimo.
          onDrag((p.x - d.p0.x) / f.s, (p.y - d.p0.y) / f.s, d.start);
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {guides.grid && Array.from({ length: 23 }, (_, i) => (i + 1) * 10).map((v) => (
          <g key={v} stroke={v === 120 ? '#ef4444' : '#94a3b8'} strokeOpacity={v === 120 ? 0.6 : 0.25} strokeWidth={1}>
            <line x1={v} y1={0} x2={v} y2={240} {...line} /><line x1={0} y1={v} x2={240} y2={v} {...line} />
          </g>
        ))}
        {guides.anchors && anchors.map(([k, c, [x, y, w]]) => {
          const [ax, ay] = pt(x, y);
          return (
            <g key={k} stroke={c} strokeWidth={1.5}>
              <line x1={ax - (w * f.s) / 2} y1={ay} x2={ax + (w * f.s) / 2} y2={ay} {...line} strokeDasharray="4 3" />
              <circle cx={ax} cy={ay} r={2} fill={c} />
              <text x={ax + (w * f.s) / 2 + 2} y={ay + 2} fontSize={6} fill={c} stroke="none">{k}</text>
            </g>
          );
        })}
        {guides.eyes && [em.l, em.r].map(([x, y], i) => {
          const [cx, cy] = pt(x, y);
          return (
            <g key={i} stroke="#ef4444" strokeWidth={1}>
              <circle cx={cx} cy={cy} r={(em.d / 2) * f.s} {...line} />
              <line x1={cx - 3} y1={cy} x2={cx + 3} y2={cy} {...line} /><line x1={cx} y1={cy - 3} x2={cx} y2={cy + 3} {...line} />
            </g>
          );
        })}
        {guides.bounds && sel && (
          <g transform={sel.rotate ? `rotate(${sel.rotate} ${sel.pivot[0]} ${sel.pivot[1]})` : undefined}>
            {(sel.img.w !== sel.visible.w || sel.img.h !== sel.visible.h) && (
              <rect x={sel.img.x} y={sel.img.y} width={sel.img.w} height={sel.img.h} stroke="#64748b" strokeWidth={1} strokeDasharray="1 3" {...line} />
            )}
            <rect x={sel.visible.x} y={sel.visible.y} width={sel.visible.w} height={sel.visible.h} stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" {...line} />
            {sel.split && <>
              <line x1={sel.split.l} y1={sel.visible.y} x2={sel.split.l} y2={sel.visible.y + sel.visible.h} stroke="#10b981" strokeWidth={1} {...line} />
              <line x1={sel.split.r} y1={sel.visible.y} x2={sel.split.r} y2={sel.visible.y + sel.visible.h} stroke="#10b981" strokeWidth={1} {...line} />
            </>}
          </g>
        )}
        {guides.bounds && sel && <>
          <circle cx={sel.support[0]} cy={sel.support[1]} r={2.2} fill="#10b981" stroke="white" strokeWidth={0.8} />
          <circle cx={sel.pivot[0]} cy={sel.pivot[1]} r={4} stroke="#f43f5e" strokeWidth={1.2} {...line} />
        </>}
      </svg>
      <div className="absolute left-2 bottom-2 text-[11px] px-2 py-1 rounded-md bg-black/55 text-white pointer-events-none">
        {STAGES.find((s) => s.id === stage)!.name} · {mood}{f.s !== 1 ? ` · encuadre ×${f.s}` : ''}
      </div>
    </div>
  );
}

/* ---------------- Piezas pequeñas ---------------- */

const selectCls = 'w-full h-9 px-2.5 rounded-lg bg-surface-2 border border-line text-[13px] text-ink focus:outline-none focus:border-lily';
const bgCls = (bg: 'light' | 'dark' | 'checker') =>
  bg === 'light' ? 'bg-[#f3f6f1]' : bg === 'dark' ? 'bg-[#0f1a1e]'
    : 'bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-[length:20px_20px]';

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-surface p-3.5 space-y-3 h-fit', className)}>
      <h2 className="font-semibold text-[15px] truncate">{title}</h2>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return <div><div className="text-[12px] font-medium text-muted mb-1">{text}</div>{children}</div>;
}

function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cn('h-8 px-2.5 rounded-lg text-[13px] font-medium border', o.value === value ? 'bg-lily text-on-lily border-lily' : 'bg-surface-2 border-line text-muted hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--lily)]" />{label}
    </label>
  );
}

function Btn({ children, onClick, disabled, title, tone }: { children: ReactNode; onClick: () => void; disabled?: boolean; title?: string; tone?: 'primary' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={cn('h-8 px-3 rounded-lg text-[13px] font-medium border disabled:opacity-40 disabled:cursor-not-allowed',
        tone === 'primary' ? 'bg-lily text-on-lily border-lily hover:brightness-105' : 'bg-surface border-line hover:bg-surface-2')}>
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px bg-line mx-1 self-stretch" aria-hidden />;

function Status({ tone, title, text }: { tone: 'ok' | 'warn' | 'info' | 'idle'; title: string; text: string }) {
  return (
    <div className={cn('rounded-lg border px-2.5 py-1 leading-tight',
      tone === 'ok' && 'border-lily/40 bg-lily-soft', tone === 'warn' && 'border-warn/40 bg-warn-soft', tone === 'info' && 'border-water/40 bg-water/10', tone === 'idle' && 'border-line bg-surface-2')}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</div>
      <div className="text-[13px] font-medium">{text}</div>
    </div>
  );
}

/** Campo numérico: vacío = sin valor propio (usa el heredado, que se ve en gris). */
function Num({ label, value, fallback, step, min, max, disabled, onChange }: {
  label: string; value: number | undefined; fallback: number; step: number; min?: number; max?: number; disabled?: boolean;
  onChange: (v: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setText(value === undefined ? '' : String(value)); }, [value, focus]);
  return (
    <label className="text-[12px] font-medium text-muted">
      {label}
      <input
        type="number" inputMode="decimal" step={step} min={min} max={max} disabled={disabled}
        value={text} placeholder={String(r2(fallback))}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') return onChange(undefined);
          const v = Number(e.target.value.replace(',', '.'));
          if (Number.isFinite(v)) onChange(min !== undefined || max !== undefined ? Math.min(max ?? v, Math.max(min ?? v, v)) : v);
        }}
        className={cn(selectCls, 'mt-1 tabular-nums', value === undefined && 'text-muted')}
      />
    </label>
  );
}

function Real({ label, children }: { label: string; children: ReactNode }) {
  return <figure className="flex flex-col items-center gap-1.5">{children}<figcaption className="text-[11px] text-muted">{label}</figcaption></figure>;
}

function LocalPanel({ local, onRename, onArt, onRemove }: {
  local: LocalItem; onRename: (id: string) => boolean; onArt: (p: Partial<ItemArt>) => void; onRemove: () => void;
}) {
  const [id, setId] = useState(local.id);
  useEffect(() => setId(local.id), [local.id]);
  const valid = ITEM_ID.test(id) && slotOf(id) === slotOf(local.id) && (!ITEM_ART[id] || id === local.id);
  const snippet = artSnippet(local.id, local.art);
  return (
    <div className="mt-2 rounded-xl border border-line p-2.5 space-y-2 text-[12px]">
      <div className="flex items-center gap-2">
        <img src={local.href} alt="" className="w-10 h-10 object-contain rounded bg-surface-2" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{local.name}</div>
          <div className="text-muted">{local.size[0]} × {local.size[1]} px · proporción visible {local.art.ratio}</div>
        </div>
        <button type="button" onClick={onRemove} className="text-muted hover:text-danger" aria-label="Quitar PNG">✕</button>
      </div>
      <label className="block font-medium text-muted">Id definitivo (nombre del archivo en public/art/acc)
        <div className="flex gap-1.5 mt-1">
          <input className={cn(selectCls, !valid && 'border-danger')} value={id} onChange={(e) => setId(e.target.value.trim())} />
          <button type="button" className="h-9 px-2.5 rounded-lg border border-line bg-surface text-[12px] disabled:opacity-40" disabled={!valid || id === local.id} onClick={() => onRename(id)}>Usar</button>
        </div>
        {!valid && <span className="text-danger">Usa {slotOf(local.id)}-nombre (minúsculas, números y guiones) y que no exista ya.</span>}
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        <Num label="Ancho (w)" value={local.art.w} fallback={SLOT_DEFAULTS[slotOf(local.id) ?? 'hat'].w} step={0.01} onChange={(v) => v !== undefined && v > 0 && onArt({ w: v })} />
        <Num label="Apoyo x" value={local.art.ax} fallback={0.5} step={0.01} onChange={(v) => v !== undefined && onArt({ ax: v })} />
        <Num label="Apoyo y" value={local.art.ay} fallback={0.5} step={0.01} onChange={(v) => v !== undefined && onArt({ ay: v })} />
      </div>
      <p className="text-muted leading-snug">«Ancho» y «Apoyo» son el dibujo base (art.ts): ponlos para que quede bien en casi todas las etapas y usa los ajustes para el resto.</p>
      <div>
        <div className="font-medium text-muted mb-1">Para art.ts (ITEM_ART)</div>
        <pre className="p-2 rounded-lg bg-surface-2 overflow-x-auto text-[11px]">{snippet}</pre>
      </div>
    </div>
  );
}
