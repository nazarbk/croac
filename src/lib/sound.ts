/** Pequeños sonidos sintetizados con Web Audio (sin ficheros de audio). */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freqFrom: number, freqTo: number, start: number, dur: number, type: OscillatorType = 'triangle', vol = 0.12) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freqFrom, t);
  o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sounds = {
  /** "Croac": dos graznidos cortos. */
  complete() {
    blip(220, 140, 0, 0.09, 'square', 0.05);
    blip(260, 160, 0.11, 0.1, 'square', 0.05);
    blip(880, 1320, 0.2, 0.12, 'sine', 0.06);
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, f * 1.01, i * 0.1, 0.18, 'triangle', 0.08));
  },
  penalty() {
    blip(330, 160, 0, 0.35, 'sawtooth', 0.04);
  },
  coin() {
    blip(988, 1319, 0, 0.12, 'square', 0.04);
  },
};
