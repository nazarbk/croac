import { useEffect } from 'react';
import { cn } from '../../lib/cn';
import { ui, useUi, type Toast } from '../../store/uiStore';
import { Coin, Icon } from './Icon';

function ToastView({ t }: { t: Toast }) {
  useEffect(() => {
    const timer = setTimeout(() => ui.dismissToast(t.id), t.duration ?? (t.action ? 5000 : 3200));
    return () => clearTimeout(timer);
  }, [t]);
  const tone =
    t.tone === 'danger' ? 'bg-danger text-white'
      : t.tone === 'warning' ? 'bg-[#4a3312] text-[#ffe2b8]'
        : 'bg-inverse text-on-inverse';
  return (
    <div role="status" className={cn('pointer-events-auto flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-2xl shadow-float animate-pop-in min-h-12 max-w-[calc(100vw-2rem)]', tone)}>
      <span className="text-[15px] font-medium leading-snug min-w-0">{t.message}</span>
      {(t.xp !== undefined || t.coins !== undefined) && (
        <span className="flex items-center gap-2 text-sm font-bold tabular-nums">
          {t.xp !== undefined && t.xp !== 0 && <span className={t.xp > 0 ? 'text-lily-soft dark:text-lily' : 'text-danger-soft dark:text-danger'}>{t.xp > 0 ? '+' : ''}{t.xp} XP</span>}
          {!!t.coins && <span className="flex items-center gap-1">+{t.coins}<Coin size={14} /></span>}
        </span>
      )}
      {t.action ? (
        <button
          type="button"
          onClick={() => { t.action!.run(); ui.dismissToast(t.id); }}
          className="ml-1 px-3 h-9 rounded-xl font-semibold text-sm bg-on-inverse/12 hover:bg-on-inverse/20 flex items-center gap-1.5 whitespace-nowrap"
        >
          <Icon name={t.action.icon ?? 'undo'} size={14} />{t.action.label}
        </button>
      ) : (
        <span className="w-2" />
      )}
    </div>
  );
}

export function Toaster() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="fixed z-[60] inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 flex flex-col items-center gap-2 pointer-events-none px-4" aria-live="polite">
      {toasts.map((t) => <ToastView key={t.id} t={t} />)}
    </div>
  );
}
