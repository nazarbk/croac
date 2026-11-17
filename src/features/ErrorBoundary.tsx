import { Component, type ReactNode } from 'react';
import { actions } from '../store/actions';

interface State {
  error: Error | null;
}

/**
 * Si una pantalla falla, se muestra un aviso en lugar de dejar la app en
 * blanco, con la opción de guardar una copia de los datos antes de nada.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Croac] Error en la interfaz:', error);
  }

  private download = () => {
    const blob = new Blob([actions.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `croac-copia-emergencia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mt-6 rounded-[1.5rem] border border-danger/30 bg-danger-soft p-6">
        <h1 className="font-display text-xl font-bold text-danger">Esta pantalla ha fallado</h1>
        <p className="mt-2 text-[15px] leading-relaxed">
          Tus datos siguen guardados. Prueba a recargar; si vuelve a pasar, descarga una copia y avísanos con lo que estabas haciendo.
        </p>
        <p className="mt-2 text-xs text-muted font-mono break-words">{this.state.error.message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => location.reload()} className="h-11 px-4.5 rounded-xl bg-lily bg-primary-grad text-on-lily font-semibold">Recargar</button>
          <button type="button" onClick={this.download} className="h-11 px-4.5 rounded-xl border border-line bg-surface font-semibold">Descargar copia de mis datos</button>
        </div>
      </div>
    );
  }
}
