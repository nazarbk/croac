import { useState } from 'react';
import { Frog } from '../components/frog/Frog';
import { art } from '../components/frog/art';
import { patioShopItem } from '../domain/patio';
import { usePatio } from '../services/patio';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/controls';
import { Coin, Icon } from '../components/ui/Icon';
import { can } from '../domain/plans';
import { formatLong, formatShort } from '../domain/dates';
import { currentSeason, daysLeft, LAST_DAY_BOOST, seasonById, seasonNotStarted, upcomingSeason, visibleItems, type Season } from '../domain/seasons';
import { useIsAdmin } from '../services/admin';
import { canBuy, CATALOG, SLOTS, type ShopItem } from '../domain/shop';
import type { Slot } from '../domain/types';
import { cn } from '../lib/cn';
import { href } from '../lib/router';
import { sounds } from '../lib/sound';
import { actions } from '../store/actions';
import { useApp, useToday } from '../store/appStore';
import { useFrogInfo } from '../store/selectors';
import { ui } from '../store/uiStore';

function ItemCard({ item }: { item: ShopItem }) {
  const frog = useApp((s) => s.frog);
  const plan = useApp((s) => s.meta.plan);
  const soundsOn = useApp((s) => s.settings.sounds);
  const info = useFrogInfo();
  const owned = frog.owned.includes(item.id);
  const equipped = frog.equipped[item.slot] === item.id;
  const today = useToday();
  const check = canBuy(item, { coins: frog.coins, level: info.level, owned: frog.owned, isPro: can(plan, 'premiumItems'), today });
  // Solo lo que se vende (sobre la piel que lleve), sin el resto de complementos puestos.
  const preview = { skin: frog.equipped.skin, [item.slot]: item.id };

  const buy = () => {
    const r = actions.buy(item.id);
    if (r.ok) {
      if (soundsOn) sounds.coin();
      ui.hop();
      ui.toast({ message: `${item.name}: ¡a ${frog.name} le queda genial!`, coins: undefined });
    }
  };

  let action: React.ReactNode;
  if (owned) {
    action = (
      <Button size="sm" variant={equipped ? 'secondary' : 'primary'} className="w-full" onClick={() => actions.toggleEquip(item.id)}
        disabled={equipped && (item.slot === 'skin' || item.slot === 'background')}>
        {equipped ? (item.slot === 'skin' || item.slot === 'background' ? 'En uso' : 'Quitar') : 'Ponérselo'}
      </Button>
    );
  } else if (!check.ok && check.reason === 'premium') {
    action = <a href={href('ajustes')} className="h-8 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 bg-pro-soft text-pro"><Icon name="sparkles" size={14} />Solo Pro</a>;
  } else if (!check.ok && check.reason === 'season' && seasonNotStarted(item, today)) {
    action = <div className="h-8 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 bg-surface-2 text-muted"><Icon name="clock" size={14} />Desde el {formatShort(seasonById(item.season)!.start)}</div>;
  } else if (!check.ok && check.reason === 'season') {
    action = <div className="h-8 rounded-lg text-sm font-semibold flex items-center justify-center bg-surface-2 text-muted">Ya no disponible</div>;
  } else if (!check.ok && check.reason === 'level') {
    action = <div className="h-8 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 bg-surface-2 text-muted"><Icon name="lock" size={14} />Nivel {item.minLevel}</div>;
  } else {
    action = (
      <Button size="sm" variant="coin" className="w-full tabular-nums" onClick={buy} disabled={!check.ok}>
        {item.price === 0 ? 'Gratis' : <><Coin size={15} />{item.price}</>}
      </Button>
    );
  }

  return (
    <div className={cn('rounded-2xl border bg-surface p-3 flex flex-col', equipped ? 'border-lily' : 'border-line')}>
      <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-2">
        <Frog level={info.level} mood="happy" equipped={preview} scene={item.slot === 'background'} className="w-full h-full" />
        {item.premium && <span className="absolute top-2 left-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-pro text-white dark:text-[#140d33]">PRO</span>}
        {item.community && (
          <span className="absolute top-2 left-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-lily text-on-lily max-w-[85%] truncate">@{item.community.author}</span>
        )}
        {item.season && !item.premium && (
          <span className="absolute top-2 left-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950">T{seasonById(item.season)?.number}</span>
        )}
        {owned && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-lily text-on-lily flex items-center justify-center"><Icon name="check" size={14} strokeWidth={3} /></span>}
      </div>
      <div className="mt-2.5 flex-1">
        <div className="font-semibold leading-tight">{item.name}</div>
        <div className="text-[13px] text-muted leading-snug mt-0.5">{item.description}</div>
      </div>
      <div className="mt-3">{action}</div>
    </div>
  );
}

function SeasonCountdown({ left }: { left: number }) {
  return (
    <div className="shrink-0 rounded-xl bg-black/30 backdrop-blur-sm px-3 py-2 text-center leading-tight text-white">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-white/85">{left <= 1 ? 'Último día' : 'Quedan'}</div>
      {left > 1 && <div className="font-display text-xl font-extrabold tabular-nums">{left} días</div>}
      {left <= 1 && <div className="font-display text-base font-extrabold">¡Hoy acaba!</div>}
    </div>
  );
}

/** Ganadores del patio: dibujados por usuarios, gratis para todos. */
function PatioShelf() {
  const { winners } = usePatio();
  if (!winners.length) return null;
  const items = winners.map(patioShopItem);
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between px-1 mb-3">
        <h2 className="font-display text-lg font-bold">Del patio <span className="text-muted font-normal text-[15px]">· dibujados por la comunidad, gratis</span></h2>
        <a href={href('patio')} className="text-sm font-semibold text-lily-strong hover:underline shrink-0">Ir al patio</a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((i) => <ItemCard key={i.id} item={i} />)}
      </div>
    </section>
  );
}

/** Solo administradores: ver la próxima temporada antes de su estreno (nadie más la ve). */
function SeasonPreviewBar({ season, on, onToggle }: { season: Season; on: boolean; onToggle: () => void }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-pro bg-pro-soft/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2.5">
      <div className="min-w-0 sm:flex-1 text-[14px] leading-snug">
        <span className="font-bold text-pro">Solo administradores · </span>
        Temporada {season.number}, «{season.name}», sale sola el {formatLong(season.start)}. Hasta entonces nadie más la ve.
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a href="#/admin/probador" className="h-9 px-3 rounded-xl text-sm font-semibold flex items-center border border-line bg-surface hover:bg-surface-2">Ajustar en el probador</a>
        <Button size="sm" variant={on ? 'secondary' : 'primary'} onClick={onToggle} aria-pressed={on}>{on ? 'Volver a hoy' : 'Vista previa'}</Button>
      </div>
    </div>
  );
}

function SeasonBanner({ season, preview }: { season: Season; preview?: boolean }) {
  const today = useToday();
  const left = daysLeft(season, today);
  const badge = preview ? `Empieza el ${formatShort(season.start)}` : left <= 1 ? `¡Último día! · XP ×${LAST_DAY_BOOST.xp}` : `Quedan ${left} días`;
  const owned = useApp((s) => s.frog.owned);
  const items = visibleItems(season);
  const got = items.filter((i) => owned.includes(i.id)).length;
  return (
    <section className={cn('mt-5 rounded-[1.75rem] border bg-surface shadow-card overflow-hidden', preview ? 'border-2 border-dashed border-pro' : 'border-line')}>
      {season.banner ? (
        <div className="relative text-white bg-[#1c2b3f] sm:min-h-[13rem] sm:flex sm:flex-col sm:justify-end">
          {/* Móvil: la ilustración arriba y el texto debajo. Desde sm: el texto encima, a la izquierda. */}
          <div className="relative h-36 sm:absolute sm:inset-0 sm:h-auto overflow-hidden">
            <img src={art(season.banner)} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: season.bannerPosition ?? 'center' }} />
            <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" aria-hidden />
            <div className="sm:hidden absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1c2b3f] to-transparent" aria-hidden />
          </div>
          <div className="relative px-5 pb-4 pt-1 sm:pt-14 sm:max-w-[55%]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-sm">Temporada {season.number}</span>
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-coin text-ink">{badge}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-[1.75rem] font-extrabold leading-tight mt-1.5 [text-shadow:0_2px_8px_rgb(0_0_0/.5)]">{season.name}</h2>
            <p className="text-white/90 text-[15px] mt-1 leading-snug [text-shadow:0_1px_4px_rgb(0_0_0/.6)]">{season.tagline}</p>
          </div>
        </div>
      ) : (
        <div className="relative px-5 pt-5 pb-4 text-white" style={{ background: `linear-gradient(120deg, ${season.colors[0]}, ${season.colors[1]})` }}>
          <div className="absolute inset-0 bg-black/15" aria-hidden />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/25 backdrop-blur-sm">Temporada {season.number}</span>
              <h2 className="font-display text-2xl sm:text-[1.75rem] font-extrabold leading-tight mt-1.5 drop-shadow-sm">{season.name}</h2>
              <p className="text-white/90 text-[15px] mt-1 leading-snug max-w-md">{season.tagline}</p>
            </div>
            {preview ? <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-coin text-ink">{badge}</span> : <SeasonCountdown left={left} />}
          </div>
        </div>
      )}
      <p className="px-5 pt-3 text-[13px] text-muted">
        {preview ? `Del ${formatLong(season.start)} al ${formatLong(season.end)}` : `Hasta el ${formatLong(season.end)}`} · {got}/{items.length} conseguidos · lo que compres es tuyo para siempre
      </p>
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((i) => <ItemCard key={i.id} item={i} />)}
      </div>
    </section>
  );
}

export function ShopPage() {
  const [slot, setSlot] = useState<Slot>('hat');
  const coins = useApp((s) => s.frog.coins);
  const owned = useApp((s) => s.frog.owned);
  const today = useToday();
  const isAdmin = useIsAdmin();
  const upcoming = isAdmin || import.meta.env.DEV ? upcomingSeason(today) : undefined;
  const [previewOn, setPreviewOn] = useState(false);
  const preview = previewOn && !!upcoming;
  // Con la vista previa, la tienda se ve tal y como quedará el día del estreno.
  const season = preview ? upcoming : currentSeason(today);
  // Los de la temporada actual van en su cartel; los de temporadas pasadas, solo si ya son tuyos.
  const regular = CATALOG.filter((i) => i.price > 0 && !i.hidden && (!i.season || (owned.includes(i.id) && i.season !== season?.id)));
  // Solo las pestañas con algo que enseñar (p. ej. no hay pieles a la venta ahora mismo).
  const slots = SLOTS.filter((s) => regular.some((i) => i.slot === s.id));
  const current = slots.some((s) => s.id === slot) ? slot : (slots[0]?.id ?? 'hat');
  const items = regular.filter((i) => i.slot === current).sort((a, b) => a.minLevel - b.minLevel || a.price - b.price);
  return (
    <div>
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Tienda</h1>
          <p className="text-muted mt-1.5">Canjea las monedas que ganas completando tareas.</p>
        </div>
        <div className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-coin-soft font-bold text-lg tabular-nums shrink-0"><Coin size={20} />{coins}</div>
      </header>
      {upcoming && <SeasonPreviewBar season={upcoming} on={preview} onToggle={() => setPreviewOn((v) => !v)} />}
      {season && <SeasonBanner season={season} preview={preview} />}
      <PatioShelf />
      {season && <h2 className="font-display text-lg font-bold px-1 mt-8">Siempre disponible</h2>}
      <div className={cn('-mx-4 px-4 overflow-x-auto scrollbar-none', season ? 'mt-3' : 'mt-5')}>
        <Segmented<Slot> value={current} onChange={setSlot} options={slots.map((s) => ({ value: s.id, label: s.plural }))} />
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((i) => <ItemCard key={i.id} item={i} />)}
      </div>
    </div>
  );
}
