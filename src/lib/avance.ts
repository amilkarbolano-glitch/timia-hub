// ─── Avance ponderado por actividad-semana (método del Excel del cliente) ────
//
// En las hojas "Plan de trabajo" el PM marca una casilla por cada semana en la que
// la actividad está activa (permite tramos discontinuos: S1–S4 y retomar en S18).
// Cada fase tiene un "Factor estático" = 100 / (nº total de casillas de la fase),
// y el consolidado del proyecto usa un factor global = 100 / (casillas de todo el plan).
//
//   Total semana (fase)  = casillas marcadas esa semana × factor de la fase
//   T (fase)             = acumulado de "Total semana"
//   Consolidado          = casillas acumuladas de todo el plan × factor global
//
// Esto es distinto de ponderar por actividad: una actividad de 6 semanas pesa 6 veces
// más que una de 1. Por eso el modo es elegible por cronograma (`pesoModo`).

/** Cómo se pondera el avance de un cronograma. */
export type PesoModo = 'actividad' | 'actividad-semana';
export const PESO_MODO_DEFAULT: PesoModo = 'actividad';

export interface AvanceActividad {
  /** Semanas marcadas (1-indexed). Si viene vacío se deriva del rango start/end. */
  weeks?: number[];
  startWeek: number;
  endWeek: number;
  /** % real de la actividad (0–100). */
  pct?: number;
}
export interface AvanceFase {
  id: string;
  label: string;
  activities: AvanceActividad[];
}

/** Semanas activas de una actividad: las marcadas, o el rango continuo start→end. */
export function marcasDe(act: AvanceActividad): number[] {
  if (act.weeks && act.weeks.length) return [...new Set(act.weeks)].filter(w => w > 0).sort((a, b) => a - b);
  const ini = Math.max(1, Math.min(act.startWeek, act.endWeek));
  const fin = Math.max(act.startWeek, act.endWeek);
  return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
}

/** Total de casillas de una fase. */
export function marcasFase(fase: AvanceFase): number {
  return fase.activities.reduce((s, a) => s + marcasDe(a).length, 0);
}

/** Factor estático de una fase: 100 / casillas. 0 si la fase está vacía. */
export function factorFase(fase: AvanceFase): number {
  const n = marcasFase(fase);
  return n > 0 ? 100 / n : 0;
}

/** Factor global del plan: 100 / casillas de todas las fases. */
export function factorGlobal(fases: AvanceFase[]): number {
  const n = fases.reduce((s, f) => s + marcasFase(f), 0);
  return n > 0 ? 100 / n : 0;
}

export interface Serie {
  /** Avance aportado en cada semana (1-indexed → índice 0 = S1). */
  semanal: number[];
  /** Acumulado semana a semana. */
  acumulado: number[];
}

function serieVacia(totalWeeks: number): Serie {
  return { semanal: Array(totalWeeks).fill(0), acumulado: Array(totalWeeks).fill(0) };
}

function acumular(semanal: number[]): number[] {
  let t = 0;
  return semanal.map(v => (t += v));
}

/** Serie planificada de una fase: "Total semana" y "T" del Excel. */
export function seriePlanFase(fase: AvanceFase, totalWeeks: number): Serie {
  const factor = factorFase(fase);
  const semanal = Array(totalWeeks).fill(0);
  for (const act of fase.activities) {
    for (const w of marcasDe(act)) {
      if (w >= 1 && w <= totalWeeks) semanal[w - 1] += factor;
    }
  }
  return { semanal, acumulado: acumular(semanal) };
}

/** Serie planificada consolidada del plan, con el factor global. */
export function seriePlanConsolidada(fases: AvanceFase[], totalWeeks: number): Serie {
  if (!totalWeeks) return serieVacia(0);
  const factor = factorGlobal(fases);
  const semanal = Array(totalWeeks).fill(0);
  for (const fase of fases) {
    for (const act of fase.activities) {
      for (const w of marcasDe(act)) {
        if (w >= 1 && w <= totalWeeks) semanal[w - 1] += factor;
      }
    }
  }
  return { semanal, acumulado: acumular(semanal) };
}

/**
 * Casillas que cuentan como ejecutadas en una actividad, derivadas de su % real.
 * El Excel marca la casilla real a mano; aquí se reparte el % sobre las casillas
 * planificadas en orden cronológico. Es una aproximación, no un dato capturado.
 */
export function marcasReales(act: AvanceActividad): number[] {
  const marcas = marcasDe(act);
  const pct = Math.max(0, Math.min(100, act.pct ?? 0));
  const n = Math.round((pct / 100) * marcas.length);
  return marcas.slice(0, n);
}

/** Serie real de una fase, usando el mismo factor que el plan. */
export function serieRealFase(fase: AvanceFase, totalWeeks: number): Serie {
  const factor = factorFase(fase);
  const semanal = Array(totalWeeks).fill(0);
  for (const act of fase.activities) {
    for (const w of marcasReales(act)) {
      if (w >= 1 && w <= totalWeeks) semanal[w - 1] += factor;
    }
  }
  return { semanal, acumulado: acumular(semanal) };
}

/** Serie real consolidada, con el factor global. */
export function serieRealConsolidada(fases: AvanceFase[], totalWeeks: number): Serie {
  if (!totalWeeks) return serieVacia(0);
  const factor = factorGlobal(fases);
  const semanal = Array(totalWeeks).fill(0);
  for (const fase of fases) {
    for (const act of fase.activities) {
      for (const w of marcasReales(act)) {
        if (w >= 1 && w <= totalWeeks) semanal[w - 1] += factor;
      }
    }
  }
  return { semanal, acumulado: acumular(semanal) };
}

/** Valor del acumulado en una semana (1-indexed), acotado a los extremos. */
export function enSemana(serie: Serie, week: number): number {
  if (!serie.acumulado.length) return 0;
  const i = Math.max(1, Math.min(week, serie.acumulado.length)) - 1;
  return serie.acumulado[i];
}

/**
 * % esperado del plan a día de hoy.
 * - 'actividad-semana': acumulado planificado en la semana actual.
 * - 'actividad': binario por actividad (100 si su semana de fin ya pasó), promediado.
 */
export function esperadoHoy(fases: AvanceFase[], totalWeeks: number, todayWeek: number, modo: PesoModo): number {
  if (modo === 'actividad-semana') return enSemana(seriePlanConsolidada(fases, totalWeeks), todayWeek);
  const acts = fases.flatMap(f => f.activities);
  if (!acts.length) return 0;
  return acts.reduce((s, a) => s + (todayWeek >= a.endWeek ? 100 : 0), 0) / acts.length;
}

/**
 * % real del plan.
 * - 'actividad-semana': cada actividad aporta su % sobre el peso de sus casillas.
 * - 'actividad': promedio simple de los % de las actividades.
 */
export function realPlan(fases: AvanceFase[], modo: PesoModo): number {
  const acts = fases.flatMap(f => f.activities);
  if (!acts.length) return 0;
  if (modo !== 'actividad-semana') {
    return acts.reduce((s, a) => s + (a.pct ?? 0), 0) / acts.length;
  }
  const factor = factorGlobal(fases);
  return acts.reduce((s, a) => s + marcasDe(a).length * factor * ((a.pct ?? 0) / 100), 0);
}

/** % real de una sola fase, con el factor de la fase. */
export function realFase(fase: AvanceFase, modo: PesoModo): number {
  if (!fase.activities.length) return 0;
  if (modo !== 'actividad-semana') {
    return fase.activities.reduce((s, a) => s + (a.pct ?? 0), 0) / fase.activities.length;
  }
  const factor = factorFase(fase);
  return fase.activities.reduce((s, a) => s + marcasDe(a).length * factor * ((a.pct ?? 0) / 100), 0);
}
