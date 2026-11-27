import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * La diferencia entre lo real y lo esperado, como se escribe.
 *
 * Solo el negativo lleva signo. Un «+0.0%» es ruido: el más no dice nada que
 * el número no diga ya, y en una lámina de seguimiento el signo tiene que
 * saltar a la vista justo cuando hay algo que explicar.
 *
 * @param n       la diferencia en puntos
 * @param dec     decimales (1 por omisión)
 * @param unicode true para el menos tipográfico «−», que es el que alinea en
 *                las tablas del deck; false para el guion de siempre
 */
export function difTexto(n: number, dec = 1, unicode = false): string {
  const v = parseFloat(n.toFixed(dec));
  const signo = v < 0 ? (unicode ? '−' : '-') : '';
  return `${signo}${Math.abs(v).toFixed(dec)}%`;
}
