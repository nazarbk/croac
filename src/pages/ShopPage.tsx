import { useState } from 'react';
import { Frog } from '../components/frog/Frog';
import { Button } from '../components/ui/Button';
import { Segmented } from '../components/ui/controls';
import { Coin, Icon } from '../components/ui/Icon';
import { can } from '../domain/plans';
import { canBuy, CATALOG, SLOTS, type ShopItem } from '../domain/shop';
import type { Slot } from '../domain/types';
import { cn } from '../lib/cn';
import { href } from '../lib/router';
import { sounds } from '../lib/sound';
import { actions } from '../store/actions';
import { useApp } from '../store/appStore';
import { useFrogInfo } from '../store/selectors';
import { ui } from '../store/uiStore';

function ItemCard({ item }: { item: ShopItem }) {
  const frog = useApp((s) => s.frog);
  const plan = useApp((s) => s.meta.plan);
  const soundsOn = useApp((s) => s.settings.sounds);
  const info = useFrogInfo();
  const owned = frog.owned.includes(item.id);
  const equipped = frog.equipped[item.slot] === item.id;
  const check = canBuy(item, { coins: frog.coins, level: info.level, owned: frog.owned, isPro: can(plan, 'premiumItems') });
  const preview = { ...frog.equipped, [item.slot]: item.id };

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
  } else if (!check.ok && check.reason === 'level') {
    action = <div className="h-8 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 bg-surface-2 text-muted"><Icon name="lock" size={14} />Nivel {item.minLevel}</div>;
  } else {
    action = (
      <Button size="sm" variant="coin" className="w-full tabular-nums" onClick={buy} disabled={!check.ok}>
        <Coin size={15} />{item.price}
      </Button>
    );
  }

  return (
    <div className={cn('rounded-2xl border bg-surface p-3 flex flex-col', equipped ? 'border-lily' : 'border-line')}>
      <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-2">
        <Frog level={info.level} mood="happy" equipped={preview} scene={item.slot === 'background'} className="w-full h-full" />
        {item.premium && <span className="absolute top-2 left-2 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-pro text-white dark:text-[#140d33]">PRO</span>}
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

export function ShopPage() {
  const [slot, setSlot] = useState<Slot>('hat');
  const coins = useApp((s) => s.frog.coins);
  const items = CATALOG.filter((i) => i.slot === slot && i.price > 0).sort((a, b) => a.minLevel - b.minLevel || a.price - b.price);
  return (
    <div>
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Tienda</h1>
          <p className="text-muted mt-1.5">Canjea las monedas que ganas completando tareas.</p>
        </div>
        <div className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-coin-soft font-bold text-lg tabular-nums shrink-0"><Coin size={20} />{coins}</div>
      </header>
      <div className="mt-5 -mx-4 px-4 overflow-x-auto scrollbar-none">
        <Segmented<Slot> value={slot} onChange={setSlot} options={SLOTS.map((s) => ({ value: s.id, label: s.plural }))} />
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((i) => <ItemCard key={i.id} item={i} />)}
      </div>
    </div>
  );
}
