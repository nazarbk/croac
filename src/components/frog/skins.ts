export interface SkinColors {
  main: string;
  dark: string;
  belly: string;
  cheek: string;
  outline: string;
  spots: string;
}

export const SKINS: Record<string, SkinColors> = {
  'skin-green': { main: '#6cc56f', dark: '#3f9a52', belly: '#e3f5bf', cheek: '#f49aa6', outline: '#24533a', spots: '#4fa75b' },
  'skin-blue': { main: '#4f9be0', dark: '#2c6db5', belly: '#d4ebfb', cheek: '#f49aa6', outline: '#1d3f6b', spots: '#1f2f55' },
  'skin-pink': { main: '#f497bd', dark: '#d46592', belly: '#ffe3ee', cheek: '#e8607f', outline: '#7a2c4d', spots: '#e47aa5' },
  'skin-gold': { main: '#f5c936', dark: '#cf9d12', belly: '#fff3c4', cheek: '#f39a7e', outline: '#6e5108', spots: '#e2b120' },
  'skin-midnight': { main: '#5d55c9', dark: '#3a3299', belly: '#dcd8ff', cheek: '#f49aa6', outline: '#1f1a5c', spots: '#fff7c2' },
};

export const skinFor = (id?: string) => SKINS[id ?? ''] ?? SKINS['skin-green'];
