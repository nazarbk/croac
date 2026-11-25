/**
 * Tablón de novedades. La primera entrada es la más reciente.
 * Al publicar una versión: sube "version" en package.json y añade aquí su entrada
 * con la MISMA versión. Quien abra la app verá la ventana de novedades una vez.
 * Una entrada con fecha futura (p. ej. el estreno de una temporada) no se enseña hasta ese día.
 */
export type ChangeKind = 'nuevo' | 'mejora' | 'arreglo';

export interface Release {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  /** Ilustración de cabecera (ruta dentro de public/art). */
  art?: string;
  changes: { kind: ChangeKind; text: string }[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.4.0',
    date: '2026-11-26',
    title: 'Temporada 2: Más allá del jardín',
    art: 'ui/celebrate.webp',
    changes: [
      { kind: 'nuevo', text: 'Temporada 2, «Más allá del jardín», hasta el miércoles 9 de diciembre: gorro de poeta, tetera por sombrero, gafas de calabaza y de rama, colgante de pajarito y farol del bosque.' },
      { kind: 'nuevo', text: 'Dos fondos otoñales: el atardecer de calabazas y la charca del bosque oscuro.' },
      { kind: 'mejora', text: 'Las temporadas duran ahora dos semanas: más tiempo para ahorrar monedas y hacerte con todo.' },
      { kind: 'mejora', text: 'Lo que compraste en la Temporada 1 sigue siendo tuyo y lo encuentras en la tienda y en el armario.' },
    ],
  },
  {
    version: '1.3.2',
    date: '2026-11-25',
    title: 'Último día: doble de experiencia y de monedas',
    art: 'ui/celebrate.webp',
    changes: [
      { kind: 'nuevo', text: 'El último día de cada temporada, cada tarea (y el día perfecto) da el doble de experiencia y el doble de monedas. ¡Aprovecha para terminar la colección antes de que cierre!' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-11-23',
    title: 'El patio del complemento',
    art: 'ui/celebrate.webp',
    changes: [
      { kind: 'nuevo', text: 'El patio: compra un lienzo, dibuja un gorro, algo para el cuello o unas gafas y publícalo para que lo vote todo el mundo.' },
      { kind: 'nuevo', text: 'Cada semana tienes 3 votos. El dibujo más votado entra gratis en la tienda con la firma de su autor, que además gana 200 monedas.' },
      { kind: 'mejora', text: 'La charca avisa cuando empieza la semana: la clasificación vuelve a cero cada lunes, pero la experiencia y el nivel de cada rana siguen intactos. Y ahora puedes ver quién ganó la semana pasada.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-22',
    title: 'Ranas renovadas',
    art: 'ui/celebrate.webp',
    changes: [
      { kind: 'mejora', text: 'Tu rana estrena dibujo en las cinco etapas, con caras nuevas para cada ánimo.' },
      { kind: 'mejora', text: 'Gafas, colgantes, bufandas y gorros mejor colocados en cada etapa.' },
      { kind: 'nuevo', text: 'Dos fondos de la Temporada 1: la Casa del árbol y el Reino de caramelo.' },
      { kind: 'nuevo', text: 'Cartel nuevo de la temporada en la tienda.' },
      { kind: 'mejora', text: 'Las pieles de colores descansan una temporada mientras preparamos sus nuevos dibujos. Si tenías alguna, sigue siendo tuya.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-19',
    title: 'Temporada 1: Hora de aventuras',
    art: 'ui/celebrate.webp',
    changes: [
      { kind: 'nuevo', text: 'Temporadas en la tienda: cada semana, complementos que solo se pueden comprar durante 7 días. Lo que compres es tuyo para siempre.' },
      { kind: 'nuevo', text: 'Temporada 1, «Hora de aventuras», hasta el miércoles 25 de noviembre: gorro de oso, bufanda perruna, gafas de caramelo y de nube, colgante bajo-hacha y corona helada.' },
      { kind: 'nuevo', text: 'Este tablón de novedades, para que veas qué cambia en cada actualización.' },
      { kind: 'mejora', text: 'Todos los complementos redibujados: los del cuello quedan bajo la barbilla, los sombreros entre los ojos y las gafas siempre por delante.' },
      { kind: 'mejora', text: 'En la tienda cada artículo se ve solo y entero sobre tu rana, sin el resto de complementos que lleves puestos.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-19',
    title: 'Ranas ilustradas, cuentas y la charca',
    art: 'ui/empty-friends.webp',
    changes: [
      { kind: 'nuevo', text: 'La rana, sus complementos, los fondos y la charca, todo ilustrado a mano.' },
      { kind: 'nuevo', text: 'Cuentas: tus tareas y tu rana en el móvil y en el ordenador. Con recuperación de contraseña.' },
      { kind: 'nuevo', text: 'Amigos con código o enlace de invitación, la charca compartida y un ranking semanal.' },
      { kind: 'nuevo', text: 'Historial: repite cualquier tarea hecha en uno o varios días.' },
      { kind: 'mejora', text: 'Añadir varias subtareas desde «Más opciones» también en Android.' },
      { kind: 'mejora', text: 'Repaso de márgenes y textos en móviles pequeños.' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-17',
    title: 'Modo oscuro nuevo y app instalable',
    changes: [
      { kind: 'nuevo', text: 'Ordena tus tareas arrastrándolas.' },
      { kind: 'nuevo', text: 'Subtareas visibles y marcables desde la propia tarjeta.' },
      { kind: 'nuevo', text: 'Instala Croac en el móvil como una app más.' },
      { kind: 'nuevo', text: 'Repeticiones personalizadas: elige los días de la semana (lunes y miércoles, martes, jueves y sábado…).' },
      { kind: 'mejora', text: 'Modo oscuro rediseñado y mejor en móvil.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-10',
    title: 'Nace Croac',
    changes: [
      { kind: 'nuevo', text: 'Tareas puntuales y repetidas, con experiencia, monedas, rachas y una rana que crece contigo.' },
      { kind: 'nuevo', text: 'La tienda de complementos y la revisión del día anterior.' },
    ],
  },
];

export const LATEST = CHANGELOG[0];

/** Las entradas ya publicadas a fecha de hoy (las de fecha futura esperan a su día). */
export const releasedChangelog = (today: string) => CHANGELOG.filter((r) => r.date <= today);

/** La versión más reciente ya publicada hoy. */
export const latestReleased = (today: string) => releasedChangelog(today)[0] ?? CHANGELOG[CHANGELOG.length - 1];

/** Compara "1.2.0" con "1.10.0" correctamente. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}
