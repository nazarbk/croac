import { describe, expect, it } from 'vitest';
import { STAGES } from '../../../domain/progression';
import { CATALOG } from '../../../domain/shop';
import { frogRenderMode, LAYERED_ART, layeredStageReady, MOODS, SKIN_MODELS, spriteSkin, type LayeredStage } from '../skins';

const complete: LayeredStage = {
  shade: 'frog/layers/adult/shade.webp',
  masks: { body: 'frog/layers/adult/mask-body.webp', belly: 'frog/layers/adult/mask-belly.webp', spots: 'frog/layers/adult/mask-spots.webp' },
  faces: Object.fromEntries(MOODS.map((m) => [m, `frog/layers/adult/face-${m}.webp`])),
};

describe('pieles', () => {
  it('todas las pieles del catálogo siguen usando sus ilustraciones completas', () => {
    for (const skin of CATALOG.filter((i) => i.slot === 'skin')) {
      expect(SKIN_MODELS[skin.id]?.sprites ? skin.id : `sin modelo ${skin.id}`).toBe(skin.id);
      expect(spriteSkin(skin.id)).toBe(skin.id);
      for (const st of STAGES) expect(frogRenderMode(st.id, skin.id)).toBe('sprite');
    }
  });

  it('piel desconocida o sin ilustraciones: la verde', () => {
    expect(spriteSkin(undefined)).toBe('skin-green');
    expect(spriteSkin('skin-nope')).toBe('skin-green');
  });

  it('colores en hexadecimal', () => {
    for (const m of Object.values(SKIN_MODELS)) {
      for (const c of Object.values(m.colors)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('las capas no se activan con recursos incompletos', () => {
    expect(Object.keys(LAYERED_ART)).toHaveLength(0); // hoy no hay recursos por capas
    expect(layeredStageReady('adult', { adult: complete })).toBe(true);
    const noSad = { ...complete, faces: { ...complete.faces, sad: undefined } };
    expect(layeredStageReady('adult', { adult: noSad })).toBe(false);
    expect(layeredStageReady('young', { adult: complete })).toBe(false);
  });

  it('solo las pieles que lo piden se dibujan por capas', () => {
    const art = { adult: complete };
    expect(frogRenderMode('adult', 'skin-green', art)).toBe('sprite');
    SKIN_MODELS['skin-test'] = { id: 'skin-test', sprites: false, layered: true, colors: { body: '#112233', belly: '#445566', spots: '#778899' } };
    try {
      expect(frogRenderMode('adult', 'skin-test', art)).toBe('layered');
      expect(frogRenderMode('sage', 'skin-test', art)).toBe('sprite');
      expect(frogRenderMode('adult', 'skin-test')).toBe('sprite');
    } finally {
      delete SKIN_MODELS['skin-test'];
    }
  });
});
