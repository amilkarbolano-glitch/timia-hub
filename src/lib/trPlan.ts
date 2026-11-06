// ─── Plan de horas del trimestre ─────────────────────────────────────────────
// Lo que cada persona DEBERÍA imputar, cargado por los líderes. Es la otra
// mitad del TR: hasta ahora el módulo comparaba contra «8 horas por día hábil»
// para todo el mundo, un supuesto plano que no sabe a qué SDA va cada hora.
//
// Con esto se puede decir «debías 4 h a FICO el martes y cargaste 6», que es
// lo que hoy los líderes sacan a mano mirando capturas una por una.

import { persistGet, persistSet } from './persist';
import { isBusyDay } from './businessDays';

/** El trimestre contra el que se imputa. */
export interface TrimestreHoras {
  id: string;        // '2026-Q4'
  label: string;     // 'Q4 2026'
  /** Primer día del trimestre. Si cae en fin de semana o festivo, se corre. */
  inicio: string;    // yyyy-mm-dd
  semanas: number;   // 13 o 14
}

/**
 * Una fila del Excel de los líderes: a esta persona, en este SDA, tantas horas
 * por día hábil en cada semana.
 *
 * Las horas son POR DÍA, no por semana: «S1 8h» significa 8 horas cada día de
 * esa semana, no 8 en total. Y cuando alguien reparte su semana entre dos SDA,
 * vienen dos filas que suman 8 al día.
 */
export interface AsignacionHoras {
  id: string;
  trimestreId: string;
  /** Correo @timia.ai: es lo que une esta fila con las capturas del TR. */
  persona: string;
  sda: string;
  /** Horas por día hábil. Índice 0 = S1. Ausente o 0 = esa semana no aplica. */
  horasPorSemana: number[];
}

export const JORNADA = 8;

// ─── Calendario ──────────────────────────────────────────────────────────────

const aFecha = (iso: string) => new Date(iso + 'T12:00:00');
export const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

/**
 * Los días hábiles del trimestre, en orden. Una semana son 5 días hábiles
 * consecutivos, igual que en el Plan de Trabajo: así un festivo no desplaza
 * el calendario, solo quita un día de esa semana.
 */
export function diasHabiles(t: TrimestreHoras, festivos: Set<string>): string[] {
  const dias: string[] = [];
  const d = aFecha(t.inicio);
  const total = t.semanas * 5;
  // Guarda contra un trimestre mal definido: 5 años de días es más que de sobra.
  let vueltas = 0;
  while (dias.length < total && vueltas++ < 2000) {
    // isBusyDay es «día ocupado»: fin de semana o festivo. El hábil es el otro.
    if (!isBusyDay(d, festivos)) dias.push(aISO(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

/** En qué semana (1..N) cae una fecha. null si está fuera del trimestre. */
export function semanaDe(t: TrimestreHoras, fecha: string, festivos: Set<string>): number | null {
  const i = diasHabiles(t, festivos).indexOf(fecha);
  return i < 0 ? null : Math.floor(i / 5) + 1;
}

// ─── Lo esperado ─────────────────────────────────────────────────────────────

/**
 * Lo que una persona debería imputar un día, abierto por SDA.
 * En un día no hábil devuelve vacío: nadie imputa en festivo.
 */
export function esperadoDia(
  asignaciones: AsignacionHoras[], persona: string, fecha: string,
  t: TrimestreHoras, festivos: Set<string>,
): { porSda: Record<string, number>; total: number } {
  const sem = semanaDe(t, fecha, festivos);
  const porSda: Record<string, number> = {};
  if (sem === null) return { porSda, total: 0 };
  let total = 0;
  for (const a of asignaciones) {
    if (a.trimestreId !== t.id || !mismaPersona(a.persona, persona)) continue;
    const h = a.horasPorSemana[sem - 1] ?? 0;
    if (h > 0) { porSda[a.sda] = (porSda[a.sda] ?? 0) + h; total += h; }
  }
  return { porSda, total };
}

/** Los correos vienen del Excel y del formulario; no siempre con el mismo formato. */
export const mismaPersona = (a: string, b: string) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/** Total esperado de una persona en todo el trimestre. */
export function esperadoTrimestre(
  asignaciones: AsignacionHoras[], persona: string, t: TrimestreHoras, festivos: Set<string>,
): number {
  return diasHabiles(t, festivos)
    .reduce((s, d) => s + esperadoDia(asignaciones, persona, d, t, festivos).total, 0);
}

// ─── Contraste contra lo imputado ────────────────────────────────────────────

export interface ImputacionReal { persona: string; fecha: string; sda: string; horas: number }

export interface Desvio {
  fecha: string;
  sda: string;
  esperado: number;
  real: number;
  /** real − esperado. Negativo = falta imputar. */
  dif: number;
}

/**
 * Compara día a día lo esperado contra lo imputado, por SDA.
 *
 * Incluye los SDA que solo aparecen en uno de los dos lados: si alguien cargó
 * horas a un SDA que no tenía asignado, eso es justo lo que hay que ver, no
 * algo que convenga esconder.
 */
export function desvios(
  asignaciones: AsignacionHoras[], reales: ImputacionReal[], persona: string,
  t: TrimestreHoras, festivos: Set<string>,
): Desvio[] {
  const out: Desvio[] = [];
  const porFecha = new Map<string, ImputacionReal[]>();
  for (const r of reales) {
    if (!mismaPersona(r.persona, persona)) continue;
    porFecha.set(r.fecha, [...(porFecha.get(r.fecha) ?? []), r]);
  }
  for (const fecha of diasHabiles(t, festivos)) {
    const esp = esperadoDia(asignaciones, persona, fecha, t, festivos).porSda;
    const real: Record<string, number> = {};
    for (const r of porFecha.get(fecha) ?? []) real[r.sda] = (real[r.sda] ?? 0) + r.horas;
    for (const sda of new Set([...Object.keys(esp), ...Object.keys(real)])) {
      const e = esp[sda] ?? 0, v = real[sda] ?? 0;
      if (e || v) out.push({ fecha, sda, esperado: e, real: v, dif: +(v - e).toFixed(2) });
    }
  }
  return out;
}

/** Resumen por persona: cuánto debía, cuánto cargó y en cuántos días no cuadra. */
export function resumenPersona(
  asignaciones: AsignacionHoras[], reales: ImputacionReal[], persona: string,
  t: TrimestreHoras, festivos: Set<string>,
) {
  const d = desvios(asignaciones, reales, persona, t, festivos);
  const esperado = d.reduce((s, x) => s + x.esperado, 0);
  const real = d.reduce((s, x) => s + x.real, 0);
  const diasConDesvio = new Set(d.filter(x => Math.abs(x.dif) > 0.01).map(x => x.fecha)).size;
  const sdaNoAsignado = [...new Set(d.filter(x => x.esperado === 0 && x.real > 0).map(x => x.sda))];
  return { esperado, real, dif: +(real - esperado).toFixed(2), diasConDesvio, sdaNoAsignado };
}

// ─── Comparar dos cargas del mismo trimestre ─────────────────────────────────

export interface CambioAsignacion {
  persona: string;
  sda: string;
  tipo: 'entra' | 'sale' | 'cambia';
  antes?: number[];
  despues?: number[];
  /** Semanas (1..N) cuyas horas cambian. */
  semanas: number[];
}

/**
 * Qué cambiaría al subir un Excel nuevo sobre uno ya cargado. Replanificar es
 * normal; pisar sin mirar no, así que esto se le muestra al líder antes de
 * escribir nada.
 */
export function diferencias(viejas: AsignacionHoras[], nuevas: AsignacionHoras[]): CambioAsignacion[] {
  const clave = (a: AsignacionHoras) => `${a.persona.trim().toLowerCase()}|${a.sda}`;
  const antes = new Map(viejas.map(a => [clave(a), a]));
  const despues = new Map(nuevas.map(a => [clave(a), a]));
  const out: CambioAsignacion[] = [];

  for (const [k, n] of despues) {
    const v = antes.get(k);
    if (!v) { out.push({ persona: n.persona, sda: n.sda, tipo: 'entra', despues: n.horasPorSemana, semanas: [] }); continue; }
    const largo = Math.max(v.horasPorSemana.length, n.horasPorSemana.length);
    const semanas: number[] = [];
    for (let i = 0; i < largo; i++) {
      if ((v.horasPorSemana[i] ?? 0) !== (n.horasPorSemana[i] ?? 0)) semanas.push(i + 1);
    }
    if (semanas.length) out.push({ persona: n.persona, sda: n.sda, tipo: 'cambia', antes: v.horasPorSemana, despues: n.horasPorSemana, semanas });
  }
  for (const [k, v] of antes) {
    if (!despues.has(k)) out.push({ persona: v.persona, sda: v.sda, tipo: 'sale', antes: v.horasPorSemana, semanas: [] });
  }
  return out;
}

// ─── Persistencia ────────────────────────────────────────────────────────────
export const K_TRIMESTRES   = 'timia_tr_trimestres';
export const K_ASIGNACIONES = 'timia_tr_asignaciones';

export const trPlanStore = {
  trimestres:  (): TrimestreHoras[]  => persistGet<TrimestreHoras[]>(K_TRIMESTRES, []),
  asignaciones:(): AsignacionHoras[] => persistGet<AsignacionHoras[]>(K_ASIGNACIONES, []),
  guardarTrimestres:   (v: TrimestreHoras[])  => persistSet(K_TRIMESTRES, v),
  guardarAsignaciones: (v: AsignacionHoras[]) => persistSet(K_ASIGNACIONES, v),
};

export const nuevaAsignacion = (trimestreId: string, persona = '', sda = ''): AsignacionHoras => ({
  id: `asg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  trimestreId, persona, sda, horasPorSemana: [],
});
