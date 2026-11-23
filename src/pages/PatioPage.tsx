import { useEffect, useState } from 'react';
import { Frog } from '../components/frog/Frog';
import { patioArt } from '../components/frog/community';
import { Button } from '../components/ui/Button';
import { Coin, Icon } from '../components/ui/Icon';
import { addDays, diffDays, formatShort } from '../domain/dates';
import { PATIO, canvasesLeft, patioItemId } from '../domain/patio';
import { DrawingEditor, type DrawingResult } from '../features/patio/DrawingEditor';
import { cn } from '../lib/cn';
import { href } from '../lib/router';
import { cloudEnabled, currentWeekStart, useAccount } from '../services/account';
import { useIsAdmin } from '../services/admin';
import { backend } from '../services/backend';
import { loadWeek, remove, report, setHidden, submit, usePatio, vote } from '../services/patio';
import { friendlyError, type PatioEntry } from '../services/types';
import { actions } from '../store/actions';
import { useApp, useToday } from '../store/appStore';
import { useFrogInfo } from '../store/selectors';
import { ui } from '../store/uiStore';
import { NeedsAccount } from './FriendsPage';

/**
 * El patio del complemento: cada semana los usuarios dibujan complementos y se votan. El más
 * votado entra gratis en la tienda y su autor gana monedas (domain/patio.ts).
 */
export function PatioPage() {
  const { session, profile } = useAccount();
  const patio = usePatio();
  const isAdmin = useIsAdmin();
  const today = useToday();
  const info = useFrogInfo();
  const coins = useApp((s) => s.frog.coins);
  const canvases = useApp(canvasesLeft);
  const [drawing, setDrawing] = useState(false);
  const [order, setOrder] = useState<'new' | 'top'>('new');

  useEffect(() => {
    if (session && profile) void loadWeek();
  }, [session, profile]);

  const week = currentWeekStart(today);
  const left = diffDays(addDays(week, 6), today) + 1;
  const mine = patio.entries.find((e) => e.mine);
  const votesLeft = Math.max(0, PATIO.votesPerWeek - patio.entries.filter((e) => e.voted).length);
  const entries = [...patio.entries].sort((a, b) => (order === 'top' ? b.votes - a.votes : 0) || b.created_at.localeCompare(a.created_at));

  const buyCanvas = () => {
    if (actions.buyPatioCanvas()) ui.toast({ message: '¡Lienzo listo! Ya puedes dibujar tu complemento.', coins: -PATIO.canvasPrice });
  };
  const publish = async (r: DrawingResult) => {
    try {
      await submit(r.slot, r.name, r.ratio, r.image);
      setDrawing(false);
      ui.toast({ message: `«${r.name}» ya está en el patio. ¡Que empiecen los votos!` });
    } catch (e) {
      throw new Error(friendlyError(e));
    }
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">El patio</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Dibuja un complemento y vota los de los demás. El más votado de la semana entra <strong className="text-ink">gratis en la tienda</strong> y su autor gana {PATIO.winPrize} monedas.
        </p>
      </header>

      {!cloudEnabled || !session || !profile ? (
        <div className="mt-6">
          <NeedsAccount title="El patio es de todos">
            Con una cuenta puedes publicar tus dibujos, votar los de los demás y llevarte el tuyo a la tienda si gana.
          </NeedsAccount>
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] items-stretch">
            <div className="rounded-[1.5rem] border border-line bg-surface p-4 sm:p-5 shadow-card">
              <div className="text-[13px] font-semibold text-muted uppercase tracking-wide">
                Semana del {formatShort(week)} al {formatShort(addDays(week, 6))} · {left <= 1 ? 'acaba hoy' : `quedan ${left} días`}
              </div>
              {mine ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="w-16 h-16 rounded-xl bg-surface-2 overflow-hidden shrink-0">
                    <EntryFrog entry={mine} level={info.level} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">Tu dibujo: {mine.name}</div>
                    <div className="text-sm text-muted">{mine.votes} {mine.votes === 1 ? 'voto' : 'votos'}{mine.hidden ? ' · oculto por denuncias' : ''}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => void remove(mine)}>Borrar</Button>
                </div>
              ) : canvases > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="flex-1 min-w-48">Tienes {canvases === 1 ? 'un lienzo' : `${canvases} lienzos`} en blanco. Puedes publicar un dibujo por semana.</p>
                  <Button onClick={() => setDrawing(true)}><Icon name="brush" size={18} />Dibujar mi complemento</Button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="flex-1 min-w-48">Para participar necesitas un lienzo. Completa tareas para ganar monedas.</p>
                  <Button variant="coin" onClick={buyCanvas} disabled={coins < PATIO.canvasPrice} className="tabular-nums">
                    Comprar lienzo · <Coin size={15} />{PATIO.canvasPrice}
                  </Button>
                </div>
              )}
            </div>
            <div className="rounded-[1.5rem] border border-line bg-surface p-4 sm:p-5 shadow-card flex sm:flex-col items-center justify-center gap-2 text-center">
              <div className="flex gap-1" aria-hidden>
                {Array.from({ length: PATIO.votesPerWeek }, (_, i) => (
                  <Icon key={i} name="heart" size={22} className={i < votesLeft ? 'text-danger fill-current' : 'text-line'} />
                ))}
              </div>
              <div className="text-sm"><strong>{votesLeft}</strong> {votesLeft === 1 ? 'voto' : 'votos'} esta semana</div>
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-3 px-1">
              <h2 className="font-display text-lg font-bold">Esta semana</h2>
              <div className="flex gap-1 text-sm" role="radiogroup" aria-label="Orden">
                {(['new', 'top'] as const).map((o) => (
                  <button key={o} type="button" role="radio" aria-checked={order === o} onClick={() => setOrder(o)}
                    className={cn('h-8 px-3 rounded-lg font-medium', order === o ? 'bg-lily-soft text-lily-strong' : 'text-muted hover:text-ink')}>
                    {o === 'new' ? 'Nuevos' : 'Más votados'}
                  </button>
                ))}
              </div>
            </div>
            {patio.status === 'loading' && <p className="text-muted px-1">Cargando el patio…</p>}
            {patio.status === 'error' && (
              <p className="text-danger px-1">{patio.error} <button type="button" className="underline" onClick={() => void loadWeek()}>Reintentar</button></p>
            )}
            {patio.status === 'ready' && !entries.length && (
              <div className="rounded-2xl border border-dashed border-line p-6 text-center text-muted">Aún no hay dibujos esta semana. ¡Sé el primero!</div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {entries.map((e) => (
                <EntryCard key={e.id} entry={e} level={info.level} canVote={votesLeft > 0} isAdmin={isAdmin} />
              ))}
            </div>
          </section>
        </>
      )}

      {patio.winners.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="font-display text-lg font-bold">Ganadores</h2>
            <a href={href('tienda')} className="text-sm font-semibold text-lily-strong hover:underline">Conseguirlos en la tienda</a>
          </div>
          <ol className="flex flex-col gap-2">
            {patio.winners.map((w) => (
              <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 pr-4 shadow-card">
                <span className="w-12 h-12 rounded-xl bg-surface-2 overflow-hidden shrink-0">
                  <Frog level={info.level} mood="happy" equipped={{ [w.slot]: patioItemId(w.slot, w.id) }} className="w-full h-full" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{w.name}</div>
                  <div className="text-sm text-muted truncate">@{w.author} · semana del {formatShort(w.week_start)}</div>
                </div>
                <div className="text-sm font-semibold tabular-nums flex items-center gap-1"><Icon name="heart" size={15} className="text-danger fill-current" />{w.votes}</div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {drawing && <DrawingEditor level={info.level} onCancel={() => setDrawing(false)} onPublish={publish} />}
    </div>
  );
}

const entryItemId = (e: PatioEntry) => `${e.slot}-entry-${e.id}`;

function EntryFrog({ entry, level }: { entry: PatioEntry; level: number }) {
  const id = entryItemId(entry);
  return (
    <Frog level={level} mood="happy" className="w-full h-full"
      equipped={{ [entry.slot]: id }}
      itemArt={{ [id]: patioArt(entry.slot, entry.ratio) }}
      itemHref={{ [id]: backend.patioImageUrl(entry.image_path) }} />
  );
}

function EntryCard({ entry, level, canVote, isAdmin }: { entry: PatioEntry; level: number; canVote: boolean; isAdmin: boolean }) {
  const [confirmReport, setConfirmReport] = useState(false);
  return (
    <div className={cn('rounded-2xl border bg-surface p-2.5 flex flex-col shadow-card', entry.mine ? 'border-lily/60' : 'border-line', entry.hidden && 'opacity-60')}>
      <div className="relative aspect-square rounded-xl bg-surface-2 overflow-hidden">
        <EntryFrog entry={entry} level={level} />
        <img src={backend.patioImageUrl(entry.image_path)} alt="" loading="lazy"
          className="absolute bottom-1.5 left-1.5 w-11 h-11 object-contain rounded-lg bg-surface/90 border border-line p-0.5" />
        {entry.hidden && <span className="absolute top-1.5 right-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-danger text-white">Oculto</span>}
      </div>
      <div className="mt-2 font-semibold leading-tight truncate">{entry.name}</div>
      <div className="text-[13px] text-muted truncate">{entry.mine ? 'Tuyo' : `@${entry.author}`}{isAdmin && entry.reports > 0 ? ` · ${entry.reports} denuncias` : ''}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          disabled={entry.mine || entry.hidden || (!entry.voted && !canVote)}
          onClick={() => void vote(entry, !entry.voted)}
          aria-pressed={entry.voted}
          aria-label={entry.voted ? `Quitar tu voto a «${entry.name}»` : `Votar «${entry.name}»`}
          title={entry.mine ? 'No puedes votar tu dibujo' : !entry.voted && !canVote ? 'Ya has usado tus votos (quita uno para cambiarlo)' : undefined}
          className={cn('flex-1 h-9 rounded-xl border font-semibold text-sm inline-flex items-center justify-center gap-1.5 tabular-nums disabled:opacity-50',
            entry.voted ? 'bg-danger/10 border-danger/40 text-danger' : 'bg-surface border-line hover:border-danger/40')}
        >
          <Icon name="heart" size={16} className={entry.voted ? 'fill-current' : undefined} />{entry.votes}
        </button>
        {!entry.mine && !isAdmin && (
          confirmReport ? (
            <button type="button" className="h-9 px-2.5 rounded-xl bg-danger text-white text-xs font-semibold" onClick={() => { setConfirmReport(false); void report(entry); }}>Denunciar</button>
          ) : (
            <button type="button" aria-label="Denunciar dibujo" title="Denunciar (inapropiado o copiado)" onClick={() => setConfirmReport(true)}
              className="w-9 h-9 rounded-xl border border-line grid place-items-center text-muted hover:text-danger"><Icon name="flag" size={15} /></button>
          )
        )}
      </div>
      {isAdmin && (
        <div className="mt-1.5 flex gap-1.5">
          <button type="button" className="flex-1 h-8 rounded-lg border border-line text-xs font-semibold" onClick={() => void setHidden(entry, !entry.hidden)}>{entry.hidden ? 'Mostrar' : 'Ocultar'}</button>
          <button type="button" className="h-8 px-2.5 rounded-lg border border-line text-xs font-semibold text-danger" onClick={() => void remove(entry)}>Borrar</button>
        </div>
      )}
    </div>
  );
}
