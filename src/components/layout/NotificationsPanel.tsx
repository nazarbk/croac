import { useEffect } from 'react';
import type { AppNotification } from '../../domain/types';
import { cn } from '../../lib/cn';
import { actions } from '../../store/actions';
import { useApp } from '../../store/appStore';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/controls';
import { Icon, type IconName } from '../ui/Icon';
import { Modal } from '../ui/Modal';

const kindStyle: Record<AppNotification['kind'], { icon: IconName; tone: string }> = {
  warning: { icon: 'alert', tone: 'bg-warn-soft text-warn' },
  penalty: { icon: 'alert', tone: 'bg-danger-soft text-danger' },
  level: { icon: 'sparkles', tone: 'bg-lily-soft text-lily-strong' },
  reward: { icon: 'heart', tone: 'bg-coin-soft text-coin' },
  info: { icon: 'bell', tone: 'bg-surface-2 text-muted' },
};

function timeAgo(at: number): string {
  const min = Math.round((Date.now() - at) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notifications = useApp((s) => s.notifications);
  useEffect(() => {
    if (!open) return;
    return () => actions.markNotificationsRead();
  }, [open]);

  return (
    <Modal
      open={open} onClose={onClose} size="sm" title="Avisos"
      footer={notifications.length ? <Button variant="ghost" size="sm" onClick={actions.clearNotifications}>Borrar todo</Button> : undefined}
    >
      {notifications.length === 0 ? (
        <EmptyState title="Sin avisos">Aquí verás las subidas de nivel, las tareas que se acumulan y la experiencia perdida.</EmptyState>
      ) : (
        <ul className="space-y-1 -mx-2">
          {notifications.map((n) => (
            <li key={n.id} className={cn('flex gap-3 p-2 rounded-2xl', !n.read && 'bg-surface-2')}>
              <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', kindStyle[n.kind].tone)}>
                <Icon name={kindStyle[n.kind].icon} size={17} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-[15px] leading-snug">{n.title}</div>
                {n.body && <div className="text-sm text-muted leading-snug mt-0.5">{n.body}</div>}
                <div className="text-xs text-muted/80 mt-1">{timeAgo(n.at)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
