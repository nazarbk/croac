import { useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { createStore, useStore } from '../store/createStore';

/**
 * Instalación como app (PWA).
 * - Android / Chrome / Edge: se captura `beforeinstallprompt` y se lanza con un botón propio.
 * - iOS (Safari): no hay API; se muestran las instrucciones de «Añadir a pantalla de inicio».
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'croac:install-dismissed';

const installStore = createStore<{ prompt: BeforeInstallPromptEvent | null; installed: boolean }>({ prompt: null, installed: false });

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installStore.set((s) => ({ ...s, prompt: e as BeforeInstallPromptEvent }));
  });
  window.addEventListener('appinstalled', () => installStore.set({ prompt: null, installed: true }));
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function useInstall() {
  const { prompt, installed } = useStore(installStore, (s) => s);
  return {
    installed: installed || isStandalone(),
    canPrompt: !!prompt,
    ios: isIOS(),
    async install() {
      if (!prompt) return false;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      installStore.set((s) => ({ ...s, prompt: null, installed: choice.outcome === 'accepted' }));
      return choice.outcome === 'accepted';
    },
  };
}

function IosSteps() {
  return (
    <ol className="space-y-3 text-[15px]">
      <li className="flex gap-3 items-start">
        <span className="w-8 h-8 rounded-xl bg-lily-soft text-lily-strong flex items-center justify-center shrink-0"><Icon name="share" size={16} /></span>
        <span className="pt-1">Abre Croac en <strong>Safari</strong> y pulsa el botón <strong>Compartir</strong> de la barra inferior.</span>
      </li>
      <li className="flex gap-3 items-start">
        <span className="w-8 h-8 rounded-xl bg-lily-soft text-lily-strong flex items-center justify-center shrink-0"><Icon name="plusSquare" size={16} /></span>
        <span className="pt-1">Desliza y elige <strong>Añadir a pantalla de inicio</strong>.</span>
      </li>
      <li className="flex gap-3 items-start">
        <span className="w-8 h-8 rounded-xl bg-lily-soft text-lily-strong flex items-center justify-center shrink-0"><Icon name="check" size={16} /></span>
        <span className="pt-1">Pulsa <strong>Añadir</strong>. La rana aparecerá en tu pantalla de inicio y se abrirá a pantalla completa.</span>
      </li>
    </ol>
  );
}

function OtherSteps() {
  return (
    <p className="text-[15px] leading-relaxed">
      En Chrome o Edge abre el menú del navegador (<strong>⋮</strong>) y elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.
      En el ordenador también aparece un icono de instalar a la derecha de la barra de direcciones.
    </p>
  );
}

/** Tarjeta para Ajustes: estado de la instalación y cómo hacerlo. */
export function InstallCard() {
  const inst = useInstall();
  const [help, setHelp] = useState(false);
  return (
    <section className="mt-5 rounded-[1.5rem] bg-surface border border-line shadow-card p-5">
      <div className="flex items-start gap-4">
        <img src="icons/icon-192.png" alt="" className="w-14 h-14 rounded-2xl shrink-0 shadow-card" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold">Instalar la app</h2>
          <p className="text-sm text-muted mt-0.5 leading-snug">
            {inst.installed
              ? 'Croac ya está instalada en este dispositivo.'
              : 'Tenla en la pantalla de inicio del móvil o como app del ordenador. Funciona sin conexión.'}
          </p>
          {!inst.installed && (
            <div className="mt-3 flex flex-wrap gap-2">
              {inst.canPrompt ? (
                <Button variant="primary" icon="download" onClick={() => void inst.install()}>Instalar Croac</Button>
              ) : (
                <Button icon="smartphone" onClick={() => setHelp(true)}>Cómo instalarla</Button>
              )}
            </div>
          )}
        </div>
      </div>
      <Modal open={help} onClose={() => setHelp(false)} size="sm" title="Instalar Croac">
        {inst.ios ? <IosSteps /> : <OtherSteps />}
      </Modal>
    </section>
  );
}

/** Aviso discreto en móvil para instalar la app (se puede cerrar para siempre). */
export function InstallBanner() {
  const inst = useInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return true;
    }
  });
  const [help, setHelp] = useState(false);
  if (inst.installed || dismissed || !(inst.canPrompt || inst.ios)) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
  };
  return (
    <div className="lg:hidden mt-6 flex items-center gap-3 rounded-2xl border border-lily/30 bg-lily-soft/60 p-3 pl-3.5">
      <img src="icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] leading-tight">Instala Croac en tu móvil</div>
        <div className="text-[13px] text-muted leading-snug mt-0.5">Abre al instante y funciona sin conexión.</div>
      </div>
      <Button size="sm" variant="primary" onClick={() => (inst.canPrompt ? void inst.install() : setHelp(true))}>Instalar</Button>
      <IconButton icon="x" label="No mostrar más" onClick={dismiss} className="-ml-1" />
      <Modal open={help} onClose={() => setHelp(false)} size="sm" title="Instalar Croac">
        <IosSteps />
      </Modal>
    </div>
  );
}
