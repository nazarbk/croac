import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';

/** Aviso discreto cuando no hay conexión: la app sigue funcionando y sincroniza al volver. */
export function OfflinePill() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed z-50 left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+4.9rem)] xl:top-4 max-w-[calc(100vw-2rem)] flex items-center gap-2 px-3.5 py-2 rounded-full bg-inverse text-on-inverse text-[13px] font-medium shadow-lg"
    >
      <Icon name="cloudOff" size={15} className="shrink-0" />
      <span className="truncate">Sin conexión · tus cambios se guardan y se sincronizarán al volver</span>
    </div>
  );
}
