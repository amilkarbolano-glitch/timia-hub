// ─── Historial del plan: ver cómo estaba en una fecha pasada ─────────────────
//
// La presentación de seguimiento es siempre una foto a cierto corte. Si el plan
// solo guarda el estado de hoy, la foto de la semana pasada no se puede volver
// a sacar: los % ya se movieron y nadie recuerda cuáles eran.
//
// La forma barata de resolverlo sería guardar una copia completa cada día, pero
// eso solo sirve para los días en que a alguien se le ocurrió guardarla. Aquí la
// fuente de verdad es el registro de cambios: cada vez que un % se mueve queda
// de cuánto a cuánto, quién y cuándo. Con eso, el estado en cualquier fecha se
// obtiene deshaciendo hacia atrás desde el de hoy — exacto, sin huecos y sin
// inventar días.
//
// Las alertas y los cambios funcionales no necesitan nada de esto: ya guardan
// su fecha de inicio y de fin, así que saber cuáles estaban abiertas el día X
// es leer esas dos fechas.

/** Un movimiento de un % de avance. `null` = la actividad no tenía valor propio. */
export interface CambioPct {
  id: string;
  /** La misma clave de `timia_plan_pcts`: `${planKey}-${entregableId}-${actIdx}`. */
  clave: string;
  planKey: string;
  de: number | null;
  a: number | null;
  por: string;
  en: string;            // ISO timestamp
}

export type Pcts = Record<string, number>;

export function nuevoCambio(clave: string, planKey: string, de: number | undefined, a: number | undefined, por: string, en = new Date().toISOString()): CambioPct {
  return {
    id: `cp-${Date.parse(en)}-${Math.random().toString(36).slice(2, 7)}`,
    clave, planKey, de: de ?? null, a: a ?? null, por, en,
  };
}

/** Fin del día (hora local) de una fecha ISO: el corte es «al cierre del día». */
export function finDelDia(fechaISO: string): Date {
  const d = new Date(fechaISO + 'T23:59:59.999');
  return d;
}

/**
 * Los % tal como estaban al cierre de `hasta`.
 *
 * Se recorren los cambios del más nuevo al más viejo y se deshace cada uno que
 * ocurrió después del corte. En ese orden, el último valor que se escribe para
 * cada clave es el más antiguo de los deshechos, que es justamente el que tenía
 * antes de todos ellos.
 */
export function pctsEnFecha(actuales: Pcts, historial: CambioPct[], hasta: Date): Pcts {
  const corte = hasta.getTime();
  const out: Pcts = { ...actuales };
  const posteriores = historial
    .filter(c => Date.parse(c.en) > corte)
    .sort((a, b) => Date.parse(b.en) - Date.parse(a.en));
  for (const c of posteriores) {
    if (c.de === null) delete out[c.clave];
    else out[c.clave] = c.de;
  }
  return out;
}

/**
 * Desde cuándo se puede confiar en el historial de un cronograma.
 *
 * Antes del primer cambio registrado no hay nada que deshacer, así que
 * reconstruir esa fecha devolvería el estado de hoy disfrazado de pasado. Es
 * mejor decirlo que enseñar una cifra que parece de entonces y no lo es.
 */
export function desdeCuando(historial: CambioPct[], planKey?: string): Date | null {
  const suyos = planKey ? historial.filter(c => c.planKey === planKey) : historial;
  if (!suyos.length) return null;
  return new Date(Math.min(...suyos.map(c => Date.parse(c.en))));
}

/** ¿El historial alcanza para reconstruir esta fecha sin inventar nada? */
export function alcanzaElHistorial(historial: CambioPct[], hasta: Date, planKey?: string): boolean {
  const inicio = desdeCuando(historial, planKey);
  // Sin historial solo se puede responder por hoy: no hubo cambios que deshacer.
  if (!inicio) return hasta.getTime() >= Date.now() - 86400000;
  return hasta.getTime() >= inicio.getTime();
}

/** Los cambios de un día concreto, del más reciente al más antiguo. */
export function cambiosDelDia(historial: CambioPct[], fechaISO: string, planKey?: string): CambioPct[] {
  return historial
    .filter(c => c.en.slice(0, 10) === fechaISO && (!planKey || c.planKey === planKey))
    .sort((a, b) => Date.parse(b.en) - Date.parse(a.en));
}

/** Días en los que se movió algo, de más reciente a más antiguo. */
export function diasConCambios(historial: CambioPct[], planKey?: string): string[] {
  const dias = new Set(historial.filter(c => !planKey || c.planKey === planKey).map(c => c.en.slice(0, 10)));
  return [...dias].sort().reverse();
}

/**
 * Cuándo se tocó por última vez este cronograma: el sello de «información a
 * corte de» que la presentación siempre lleva y la herramienta no daba.
 */
export function ultimoMovimiento(historial: CambioPct[], planKey?: string): CambioPct | null {
  const suyos = historial.filter(c => !planKey || c.planKey === planKey);
  if (!suyos.length) return null;
  return suyos.reduce((a, b) => (Date.parse(b.en) > Date.parse(a.en) ? b : a));
}
