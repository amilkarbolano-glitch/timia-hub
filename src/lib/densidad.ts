// ─── Densidad de la interfaz ─────────────────────────────────────────────────
//
// La app está afinada para ser compacta: la mayoría del texto es de 9–11px. Eso
// funciona en un portátil, pero en un monitor grande de baja densidad (un 27" a
// 1080p ronda los 82 px por pulgada) se lee chico. Antes la salida era bajar el
// zoom del navegador, que descoloca el layout.
//
// Esto escala la app entera con `zoom` sobre el contenedor raíz: a diferencia de
// `transform: scale`, recalcula el layout de verdad, así que no aparecen barras
// de scroll ni se rompen los elementos `sticky` del header y las tablas.

export type Densidad = 'compacto' | 'normal' | 'comodo';

export const DENSIDADES: { id: Densidad; label: string; factor: number; nota: string }[] = [
  { id: 'compacto', label: 'Compacto', factor: 0.9,  nota: 'Más información en pantalla' },
  { id: 'normal',   label: 'Normal',   factor: 1,    nota: 'Tamaño de referencia' },
  { id: 'comodo',   label: 'Cómodo',   factor: 1.15, nota: 'Para monitores grandes' },
];

const KEY = 'timia_densidad';

export function densidadActual(): Densidad {
  try {
    const v = localStorage.getItem(KEY);
    return DENSIDADES.some(d => d.id === v) ? (v as Densidad) : 'normal';
  } catch { return 'normal'; }
}

export function factorDe(d: Densidad): number {
  return DENSIDADES.find(x => x.id === d)?.factor ?? 1;
}

/** Aplica la densidad al documento. Se llama al arrancar y al cambiarla. */
export function aplicarDensidad(d: Densidad): void {
  try {
    localStorage.setItem(KEY, d);
  } catch { /* modo privado: se aplica igual, solo no se recuerda */ }
  const f = factorDe(d);
  // `zoom` en el <body>: el header sticky sigue funcionando porque el viewport
  // se recalcula. Con transform:scale el sticky se rompe.
  document.body.style.zoom = f === 1 ? '' : String(f);
}
