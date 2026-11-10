import { useState } from 'react';
import { Frog, FrogScene } from '../components/frog/Frog';
import { moodMessage } from '../components/frog/FrogStatus';
import { Button } from '../components/ui/Button';
import { inputClass, ProgressBar } from '../components/ui/controls';
import { Coin, Icon } from '../components/ui/Icon';
import { DIFFICULTIES, LATE_FACTOR, PERFECT_DAY_BONUS, STAGES, STREAK_BONUS_MAX_STEPS, STREAK_BONUS_PER_STEP } from '../domain/progression';
import { CATALOG, SLOTS } from '../domain/shop';
import { cn } from '../lib/cn';
import { href } from '../lib/router';
import { actions } from '../store/actions';
import { useApp } from '../store/appStore';
import { useFrogInfo, useTodayGroups } from '../store/selectors';
import { useUi } from '../store/uiStore';

export function FrogPage() {
  const info = useFrogInfo();
  const hop = useUi((s) => s.hop);
  const frog = useApp((s) => s.frog);
  const grace = useApp((s) => s.settings.graceDays);
  const { due, overdue } = useTodayGroups();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(frog.name);
  const owned = CATALOG.filter((i) => frog.owned.includes(i.id));

  return (
    <div>
      <div className="rounded-[2rem] overflow-hidden border border-line bg-surface">
        <FrogScene level={info.level} mood={info.mood} equipped={frog.equipped} hopKey={hop} className="aspect-[4/3] sm:aspect-[16/10]" title={`${frog.name}, ${info.stage.name}`} />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {editing ? (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); actions.renameFrog(name); setEditing(false); }}>
                  <input className={cn(inputClass, 'font-display text-xl font-bold')} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus aria-label="Nombre de la rana" />
                  <Button type="submit" variant="primary">Guardar</Button>
                </form>
              ) : (
                <button type="button" onClick={() => { setName(frog.name); setEditing(true); }} className="group flex items-center gap-2 text-left" title="Cambiar nombre">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight">{frog.name}</h1>
                  <Icon name="edit" size={16} className="text-muted opacity-0 group-hover:opacity-100" />
                </button>
              )}
              <p className="text-muted">{info.stage.name} · nivel {info.level}. {info.stage.description}</p>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-lg tabular-nums shrink-0"><Coin size={20} />{frog.coins}</div>
          </div>
          <div className="mt-4">
            <ProgressBar value={info.progress} className="h-3" label="Experiencia" />
            <div className="flex justify-between text-sm text-muted mt-1.5 tabular-nums">
              <span>{info.into} / {info.needed} XP · faltan {info.toNext}</span>
              <span>{info.next ? `${info.next.name} en el nivel ${info.next.minLevel}` : 'Etapa final alcanzada'}</span>
            </div>
          </div>
          <p className={cn('mt-4', info.mood === 'sad' ? 'text-danger' : info.mood === 'worried' ? 'text-warn' : 'text-ink/80')}>
            {moodMessage(info.mood, frog.name, due.length + overdue.length)}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Evolución</h2>
        <ol className="mt-3 grid grid-cols-5 gap-2">
          {STAGES.map((s) => {
            const reached = info.level >= s.minLevel;
            const current = info.stage.id === s.id;
            return (
              <li key={s.id} className={cn('rounded-2xl border p-2 text-center', current ? 'border-lily bg-lily-soft' : 'border-line bg-surface')}>
                <div className={cn('aspect-square', !reached && 'grayscale opacity-35')}>
                  <Frog level={s.minLevel} stageOverride={s.id} mood={reached ? 'happy' : 'sleeping'} equipped={{ skin: frog.equipped.skin }} className="w-full h-full" />
                </div>
                <div className="text-[12px] sm:text-[13px] font-semibold leading-tight mt-1">{s.name}</div>
                <div className="text-[11px] text-muted">Nv. {s.minLevel}</div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold">Armario</h2>
          <a href={href('tienda')} className="text-sm font-semibold text-lily-strong hover:underline">Ir a la tienda</a>
        </div>
        <p className="text-sm text-muted mt-1">Toca un complemento para ponérselo o quitárselo.</p>
        {SLOTS.map((slot) => {
          const items = owned.filter((i) => i.slot === slot.id);
          if (!items.length) return null;
          return (
            <div key={slot.id} className="mt-4">
              <div className="text-sm font-semibold mb-2">{slot.plural}</div>
              <div className="flex flex-wrap gap-2">
                {items.map((i) => {
                  const on = frog.equipped[i.slot] === i.id;
                  return (
                    <button key={i.id} type="button" onClick={() => actions.toggleEquip(i.id)} aria-pressed={on}
                      className={cn('h-9 px-3 rounded-xl text-sm font-medium border flex items-center gap-1.5 transition-colors', on ? 'bg-lily text-on-lily border-lily' : 'bg-surface border-line hover:border-lily/50')}>
                      {on && <Icon name="check" size={14} strokeWidth={3} />}{i.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-8 rounded-[1.5rem] bg-surface border border-line p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold">Cómo crece {frog.name}</h2>
        <ul className="mt-3 space-y-2.5 text-[15px] leading-relaxed">
          <li><strong>Cada tarea completada</strong> da experiencia y monedas según su dificultad: {Object.values(DIFFICULTIES).map((d) => `${d.label.toLowerCase()} +${d.xp} XP`).join(', ')}.</li>
          <li><strong>Las rachas suman</strong>: cada repetición seguida de un hábito da un {Math.round(STREAK_BONUS_PER_STEP * 100)} % extra, hasta un {Math.round(STREAK_BONUS_PER_STEP * STREAK_BONUS_MAX_STEPS * 100)} %.</li>
          <li><strong>Día perfecto</strong>: si terminas todo lo de hoy, +{PERFECT_DAY_BONUS.xp} XP y +{PERFECT_DAY_BONUS.coins} monedas.</li>
          <li><strong>Lo que no termines pasa al día siguiente.</strong> Si la completas entonces, recibes el {Math.round(LATE_FACTOR * 100)} % de la recompensa y no pierdes nada.</li>
          <li className="text-danger"><strong>Si una tarea lleva más de {grace === 1 ? 'un día' : `${grace} días`} atrasada</strong>, {frog.name} pierde experiencia cada día (y puede bajar de nivel) hasta que la completes o la reprogrames.</li>
          <li><strong>¿Vacaciones o enfermedad?</strong> Activa el modo vacaciones en Ajustes y no habrá penalizaciones.</li>
        </ul>
      </section>
    </div>
  );
}
