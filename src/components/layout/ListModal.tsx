import { useEffect, useState } from 'react';
import { LIST_COLORS } from '../../domain/defaults';
import type { TaskList } from '../../domain/types';
import { cn } from '../../lib/cn';
import { navigate } from '../../lib/router';
import { actions } from '../../store/actions';
import { ui } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { Field, inputClass } from '../ui/controls';
import { Modal } from '../ui/Modal';

const EMOJIS = ['📁', '🌱', '💼', '🏠', '📚', '💪', '🛒', '🎨', '💡', '✈️', '🎮', '💰', '🧘', '🐸', '🎓', '❤️'];

export function ListModal({ open, onClose, list }: { open: boolean; onClose: () => void; list?: TaskList }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [color, setColor] = useState(LIST_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    setName(list?.name ?? '');
    setEmoji(list?.emoji ?? '📁');
    setColor(list?.color ?? LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)]);
  }, [open, list]);

  const save = () => {
    if (!name.trim()) return;
    if (list) {
      actions.updateList(list.id, { name: name.trim(), emoji, color });
    } else {
      const r = actions.addList({ name, emoji, color });
      if (r.error) { ui.toast({ message: r.error, tone: 'warning' }); return; }
      if (r.list) navigate('tareas', { lista: r.list.id });
    }
    onClose();
  };

  return (
    <Modal
      open={open} onClose={onClose} size="sm" title={list ? 'Editar lista' : 'Nueva lista'}
      footer={
        <>
          {list && !list.system && (
            <Button variant="danger" className="mr-auto" onClick={() => { actions.deleteList(list.id); onClose(); navigate('tareas'); ui.toast({ message: 'Lista eliminada. Sus tareas están en la bandeja de entrada.' }); }}>
              Eliminar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={!name.trim()}>{list ? 'Guardar' : 'Crear lista'}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Nombre">
          <input data-autofocus className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Universidad" />
        </Field>
        <Field label="Icono">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setEmoji(e)} aria-pressed={emoji === e}
                className={cn('w-9 h-9 rounded-xl text-lg', emoji === e ? 'bg-lily-soft ring-2 ring-lily' : 'hover:bg-surface-2')}>
                {e}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {LIST_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`} aria-pressed={color === c}
                className={cn('w-8 h-8 rounded-full', color === c && 'ring-2 ring-offset-2 ring-offset-surface ring-ink')}
                style={{ background: c }} />
            ))}
          </div>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
