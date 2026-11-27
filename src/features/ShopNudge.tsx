import { useState } from 'react';
import { Frog } from '../components/frog/Frog';
import { Icon } from '../components/ui/Icon';
import { can } from '../domain/plans';
import { CATALOG, canBuy } from '../domain/shop';
import { href } from '../lib/router';
import { useApp, useToday } from '../store/appStore';
import { useFrogInfo } from '../store/selectors';

const KEY = 'croac:nudge-shop';
const ACCESSORY = new Set(['hat', 'neck', 'eyes']);

/**
 * «¡Ya puedes comprar tu primer complemento!»: solo mientras la rana no lleva nada y hay monedas
 * para algo. Es lo que da gracia a la charca (los amigos ven tus complementos).
 */
export function ShopNudge() {
  const today = useToday();
  const plan = useApp((s) => s.meta.plan);
  const info = useFrogInfo();
  const [hidden, setHidden] = useState(() => {
    try {
      return (localStorage.getItem(KEY) ?? '') >= today;
    } catch {
      return false;
    }
  });
  const { frog } = info;
  if (hidden || frog.owned.some((id) => ACCESSORY.has(id.split('-')[0]))) return null;
  const affordable = CATALOG
    .filter((i) => ACCESSORY.has(i.slot))
    .filter((i) => canBuy(i, { coins: frog.coins, level: info.level, owned: frog.owned, isPro: can(plan, 'premiumItems'), today }).ok)
    .sort((a, b) => a.price - b.price);
  const pick = affordable[0];
  if (!pick) return null;
  const dismiss = () => {
    // Vuelve a salir dentro de 3 días.
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + 3);
    try {
      localStorage.setItem(KEY, d.toISOString().slice(0, 10));
    } catch {
      /* ignorar */
    }
    setHidden(true);
  };
  return (
    <div className="mt-5 relative flex items-center gap-3 rounded-2xl border border-coin/50 bg-coin/10 p-3 pr-10">
      <Frog level={info.level} mood="happy" equipped={{ ...frog.equipped, [pick.slot]: pick.id, background: undefined }} className="w-16 h-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold leading-tight">¡Ya puedes estrenar complemento!</p>
        <p className="text-sm text-muted leading-snug mt-0.5">
          Con tus {frog.coins} monedas tienes para {affordable.length === 1 ? `«${pick.name}»` : `${affordable.length} complementos, como «${pick.name}»`}. Tus amigos lo verán en la charca.
        </p>
        <a href={href('tienda')} className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-lily-strong">
          Ir a la tienda <Icon name="chevronRight" size={15} />
        </a>
      </div>
      <button type="button" onClick={dismiss} aria-label="Ahora no" className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-lg text-muted hover:bg-surface-2">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
