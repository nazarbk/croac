import { actions } from '../../store/actions';
import { useApp } from '../../store/appStore';
import { Menu } from '../ui/controls';
import { Icon } from '../ui/Icon';

/** Elegir entre orden personalizado (arrastrar) e inteligente (prioridad y hora). */
export function SortMenu() {
  const sort = useApp((s) => s.settings.taskSort);
  return (
    <Menu
      title="Ordenar tareas"
      trigger={(p) => (
        <button
          type="button"
          {...p}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-surface-2 border border-transparent hover:border-line"
        >
          <Icon name="sort" size={16} />
          <span className="hidden sm:inline">{sort === 'manual' ? 'Personalizado' : 'Prioridad'}</span>
        </button>
      )}
      items={[
        { label: `${sort === 'manual' ? '✓ ' : ''}Personalizado (arrastrar)`, icon: 'grip', onSelect: () => actions.setTaskSort('manual') },
        { label: `${sort === 'smart' ? '✓ ' : ''}Por prioridad y hora`, icon: 'flag', onSelect: () => actions.setTaskSort('smart') },
      ]}
    />
  );
}
