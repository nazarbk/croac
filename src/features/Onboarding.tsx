import { useState } from 'react';
import { Frog } from '../components/frog/Frog';
import { Button } from '../components/ui/Button';
import { inputClass } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { STARTER_TASKS } from '../domain/defaults';
import { cn } from '../lib/cn';
import { actions } from '../store/actions';
import { useApp } from '../store/appStore';

export function Onboarding() {
  const onboarded = useApp((s) => s.meta.onboarded);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Rani');
  const [picked, setPicked] = useState<Set<string>>(new Set(['read', 'water']));
  if (onboarded) return null;

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Modal open dismissable={false} onClose={() => {}} size="md">
      <div className="flex justify-center gap-1.5 mb-2" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-lily' : 'w-1.5 bg-line')} />)}
      </div>

      {step === 0 && (
        <div className="text-center">
          <Frog level={1} mood="happy" equipped={{ background: 'bg-pond' }} scene className="w-44 h-44 mx-auto rounded-[2rem]" />
          <h1 className="font-display text-[1.75rem] font-extrabold mt-4 leading-tight">Te presentamos a tu renacuajo</h1>
          <p className="text-muted mt-2 text-[15px] max-w-sm mx-auto">Crece con cada tarea que completas. Si dejas tareas sin hacer varios días, lo notará.</p>
          <form className="mt-5 text-left max-w-xs mx-auto" onSubmit={(e) => { e.preventDefault(); setStep(1); }}>
            <label className="text-sm font-semibold" htmlFor="frog-name">¿Cómo se llama?</label>
            <input id="frog-name" data-autofocus className={cn(inputClass, 'mt-1.5')} value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
            <Button type="submit" variant="primary" size="lg" className="w-full mt-4" disabled={!name.trim()}>Continuar</Button>
          </form>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-tight">¿Con qué quieres empezar?</h1>
          <p className="text-muted mt-1 text-[15px]">Elige algunos hábitos. Podrás cambiarlos cuando quieras.</p>
          <ul className="mt-4 space-y-1.5">
            {STARTER_TASKS.map((t) => {
              const on = picked.has(t.id);
              return (
                <li key={t.id}>
                  <button type="button" aria-pressed={on} onClick={() => toggle(t.id)}
                    className={cn('w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors', on ? 'border-lily bg-lily-soft' : 'border-line hover:bg-surface-2')}>
                    <span className={cn('w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0', on ? 'bg-lily border-lily text-on-lily' : 'border-muted/60')}>
                      {on && <Icon name="check" size={13} strokeWidth={3.2} />}
                    </span>
                    <span className="text-[15px]">{t.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between mt-5">
            <Button variant="ghost" onClick={() => setStep(0)}>Atrás</Button>
            <Button variant="primary" onClick={() => setStep(2)}>Continuar</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-tight">Las reglas de la charca</h1>
          <ul className="mt-4 space-y-3 text-[15px]">
            {[
              ['check', 'Completa tareas para ganar experiencia y monedas. Cuanto más difícil, más ganas.'],
              ['flame', 'Repite tus hábitos sin fallar: las rachas dan experiencia extra.'],
              ['clock', 'Lo que no termines pasa al día siguiente. Hazlo entonces y no pasa nada.'],
              ['alert', `Si una tarea lleva varios días atrasada, ${name.trim() || 'tu rana'} pierde experiencia cada día y te avisaremos.`],
              ['bag', 'Gasta las monedas en sombreros, corbatas, gafas y fondos en la tienda.'],
            ].map(([icon, text]) => (
              <li key={text} className="flex gap-3">
                <span className="w-8 h-8 rounded-xl bg-lily-soft text-lily-strong flex items-center justify-center shrink-0"><Icon name={icon as 'check'} size={16} /></span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted mt-4">Consejo: escribe en lenguaje natural, por ejemplo «Llamar al médico mañana a las 10 p1».</p>
          <div className="flex justify-between mt-5">
            <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
            <Button variant="primary" size="lg" onClick={() => actions.finishOnboarding(name, [...picked])} data-autofocus>Empezar</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
