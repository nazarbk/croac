import { art } from '../components/frog/art';
import { Icon } from '../components/ui/Icon';
import { seasonBoost } from '../domain/seasons';
import { href } from '../lib/router';
import { useToday } from '../store/appStore';

/** Aviso del último día de temporada: doble de experiencia y última ocasión de comprar. */
export function SeasonBoostBanner() {
  const today = useToday();
  const boost = seasonBoost(today);
  if (!boost) return null;
  const { season } = boost;
  const times = (n: number) => (n === 2 ? 'el doble de' : n === 3 ? 'el triple de' : `×${n}`);
  const what = [boost.xp > 1 && `${times(boost.xp)} experiencia`, boost.coins > 1 && `${times(boost.coins)} monedas`].filter(Boolean).join(' y ');
  return (
    <a
      href={href('tienda')}
      className="group mt-5 relative flex items-center gap-4 overflow-hidden rounded-2xl text-white shadow-card px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      style={{ background: `linear-gradient(110deg, ${season.colors[1]}, ${season.colors[0]})` }}
    >
      {season.banner && (
        <img src={art(season.banner)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-60" style={{ objectPosition: season.bannerPosition ?? 'center' }} />
      )}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
      <span className="relative shrink-0 grid place-items-center w-12 h-12 rounded-xl bg-coin text-ink font-display text-xl font-extrabold shadow-lg ring-2 ring-white/70">×{boost.xp > 1 ? boost.xp : boost.coins}</span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-display font-bold text-[17px] leading-tight">¡Último día de la Temporada {season.number}!</span>
        <span className="block text-[14px] text-white/90 leading-snug mt-0.5">Hoy cada tarea da {what}. Mañana se cierra «{season.name}».</span>
      </span>
      <span className="relative hidden sm:flex items-center gap-1 text-sm font-semibold shrink-0">
        Ir a la tienda <Icon name="chevronRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}
