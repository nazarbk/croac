import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Coin } from '../components/ui/Icon';
import { Frog } from '../components/frog/Frog';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/cn';
import { needsRollover } from '../domain/engine';
import { itemById } from '../domain/shop';
import { WELCOME, welcomeClaimed, welcomeOptions, type WelcomeChoice } from '../domain/welcome';
import { useSyncReady } from '../services/sync';
import { actions } from '../store/actions';
import { appStore, useApp, useToday } from '../store/appStore';
import { useFrogInfo } from '../store/selectors';
import { ui } from '../store/uiStore';
import { useHasNews } from './WhatsNew';

/**
 * Regalo de bienvenida: sale una vez, cuando no hay otra ventana delante (cierre del día,
 * novedades) y ya se han traído los datos de la nube (por si se eligió en otro dispositivo).
 */
export function WelcomeGift() {
  const today = useToday();
  const ready = useSyncReady();
  const hasNews = useHasNews();
  const onboarded = useApp((s) => s.meta.onboarded);
  const claimed = useApp(welcomeClaimed);
  const info = useFrogInfo();
  const [later, setLater] = useState(false);
  const [pick, setPick] = useState<WelcomeChoice | null>(null);
  const open = ready && onboarded && !claimed && !hasNews && !later && !needsRollover(appStore.get(), today);
  if (!open) return null;
  const options = welcomeOptions(appStore.get());
  const choice = pick ?? options[0];

  const confirm = () => {
    if (!actions.claimWelcome(choice)) return;
    const item = choice === 'coins' ? null : itemById(choice);
    ui.toast(item ? { message: `¡${info.frog.name} estrena «${item.name}»!`, tone: 'reward' } : { message: '¡Regalo recibido!', tone: 'reward', coins: WELCOME.coins });
  };

  return (
    <Modal
      open
      onClose={() => setLater(true)}
      size="md"
      title="Un regalo de bienvenida"
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={() => setLater(true)}>Luego</Button>
          <Button variant="primary" icon="gift" onClick={confirm}>{choice === 'coins' ? `Quiero ${WELCOME.coins} monedas` : 'Me lo quedo'}</Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed">
        Para empezar con buen pie, elige un complemento para {info.frog.name} o, si lo prefieres, {WELCOME.coins} monedas para la tienda. Tus amigos verán lo que lleve puesto en la charca.
      </p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Regalo">
        {options.map((o) => {
          const item = o === 'coins' ? null : itemById(o);
          const selected = o === choice;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPick(o)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 pb-3 rounded-2xl border-2 transition-colors text-center',
                selected ? 'border-lily bg-lily-soft' : 'border-line hover:bg-surface-2',
              )}
            >
              {item ? (
                <Frog level={info.level} mood="happy" equipped={{ [item.slot]: item.id }} className="w-24 h-24" />
              ) : (
                <span className="w-24 h-24 grid place-items-center"><Coin size={56} /></span>
              )}
              <span className="text-sm font-semibold leading-tight">{item ? item.name : `${WELCOME.coins} monedas`}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
