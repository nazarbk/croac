import { useEffect } from 'react';
import { Frog } from '../components/frog/Frog';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { STAGES, stageForLevel } from '../domain/progression';
import { sounds } from '../lib/sound';
import { actions } from '../store/actions';
import { appStore, useApp } from '../store/appStore';
import { onGameEvents, ui, useUi } from '../store/uiStore';
import { notify } from './reminders';

/** Traduce los eventos del motor en toasts, sonidos, saltos y celebraciones. */
export function useGameFeedback() {
  useEffect(
    () =>
      onGameEvents((events) => {
        const { settings, frog } = appStore.get();
        const play = (fn: () => void) => settings.sounds && fn();
        const evolve = events.find((e) => e.type === 'evolve');
        for (const e of events) {
          switch (e.type) {
            case 'reward':
              ui.hop();
              play(sounds.complete);
              ui.toast({
                message: e.streak > 1 ? `¡Racha de ${e.streak}!` : 'Completada',
                tone: 'reward',
                xp: e.xp,
                coins: e.coins,
                action: { label: 'Deshacer', run: () => actions.undoCompletion(e.entryId) },
              });
              break;
            case 'perfectDay':
              ui.toast({ message: '¡Día perfecto!', tone: 'reward', xp: e.xp, coins: e.coins, duration: 4500 });
              break;
            case 'levelUp':
              play(sounds.levelUp);
              ui.celebrate({ kind: 'level', level: e.level, evolvedTo: evolve?.type === 'evolve' ? evolve.stage : undefined });
              break;
            case 'levelDown':
              ui.toast({ message: `${frog.name} ha bajado al nivel ${e.level}`, tone: 'danger', duration: 6000 });
              break;
            case 'penalty':
              play(sounds.penalty);
              ui.toast({ message: `${frog.name} ha perdido ${e.xp} XP por tareas atrasadas`, tone: 'danger', duration: 6000 });
              notify('Croac', `${frog.name} ha perdido ${e.xp} XP por tareas atrasadas.`);
              break;
            case 'warning':
              notify('Tareas atrasadas', e.titles.slice(0, 3).join(', '));
              break;
          }
        }
      }),
    [],
  );
}

const CONFETTI = ['#5cbf79', '#f5c542', '#ff7aa8', '#4f9be0', '#b5d94a'];

export function Celebrations() {
  const current = useUi((s) => s.celebrations[0]);
  const frog = useApp((s) => s.frog);
  if (!current || current.kind !== 'level') return null;
  const stage = current.evolvedTo ? STAGES.find((s) => s.id === current.evolvedTo) : null;
  return (
    <Modal open onClose={ui.closeCelebration} size="sm">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className="confetti absolute top-0 w-2 h-3 rounded-sm"
            style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 7) * 0.12}s` }} />
        ))}
      </div>
      <div className="text-center -mt-4">
        <Frog level={current.level} mood="happy" equipped={frog.equipped} scene hopKey={1} className="w-48 h-48 mx-auto rounded-[2rem]" />
        <div className="font-display text-3xl font-extrabold mt-4">¡Nivel {current.level}!</div>
        <p className="text-muted mt-1.5 text-[15px]">
          {stage ? `${frog.name} ha evolucionado: ahora es ${stage.name}. ${stage.description}` : `${frog.name} sigue creciendo. ${stageForLevel(current.level).name} de nivel ${current.level}.`}
        </p>
        <Button variant="primary" size="lg" className="mt-5 w-full" onClick={ui.closeCelebration} data-autofocus>¡Croac!</Button>
      </div>
    </Modal>
  );
}
