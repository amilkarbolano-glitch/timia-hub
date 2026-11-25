// ─── Proyectos abiertos (T&M) — tipos ────────────────────────────────────────
// Un proyecto abierto se factura por tiempo y materiales: no compromete fechas,
// así que no se estima ni se cronograma. Lo que tiene es una lista de tareas con
// su avance, y nada que dependa de semanas.
//
// Vive aparte del plan de trabajo a propósito. El plan de los proyectos cerrados
// está bien como está y no se toca: este módulo no importa nada suyo ni lo
// modifica, y los dos pueden evolucionar sin pisarse.

export type EstadoTarea = 'en-curso' | 'en-espera' | 'finalizada' | 'no-se-requiere';

export const ESTADOS: { id: EstadoTarea; label: string; fondo: string; texto: string; borde: string }[] = [
  { id: 'en-curso',       label: 'En curso',       fondo: '#eff6ff', texto: '#1e40af', borde: '#bfdbfe' },
  { id: 'en-espera',      label: 'En espera',      fondo: '#fffbeb', texto: '#92400e', borde: '#fde68a' },
  { id: 'finalizada',     label: 'Finalizada',     fondo: '#ecfdf5', texto: '#065f46', borde: '#a7f3d0' },
  { id: 'no-se-requiere', label: 'No se requiere', fondo: '#f1f5f9', texto: '#475569', borde: '#cbd5e1' },
];

export const estadoDe = (id: EstadoTarea) => ESTADOS.find(e => e.id === id) ?? ESTADOS[0];

export interface TareaTym {
  id: string;
  nombre: string;
  /** Agrupación opcional. Cadena vacía = sin bloque. */
  bloque: string;
  responsable?: string;
  estado: EstadoTarea;
  pct: number;
  creada: string;          // ISO
}

export interface CambioTym {
  fecha: string;           // ISO
  de: number;
  a: number;
  quien: string;
  nota?: string;
}

export interface PlanTym {
  projectId: string;
  /** El orden en el que se enseñan los bloques; las tareas guardan su nombre. */
  bloques: string[];
  tareas: TareaTym[];
  /** Historial por tarea, el mismo que guardan los proyectos cerrados. */
  historial: Record<string, CambioTym[]>;
}

export const planVacio = (projectId: string): PlanTym =>
  ({ projectId, bloques: [], tareas: [], historial: {} });

/** El avance del proyecto: promedio simple, que es lo que pesa igual cada tarea. */
export function avanceDe(plan: PlanTym): number {
  const cuentan = plan.tareas.filter(t => t.estado !== 'no-se-requiere');
  if (!cuentan.length) return 0;
  return parseFloat((cuentan.reduce((s, t) => s + t.pct, 0) / cuentan.length).toFixed(1));
}

/** Cuántas están cerradas y cuántas cuentan, para la pastilla de la cabecera. */
export function cerradasDe(plan: PlanTym): { hechas: number; total: number } {
  const cuentan = plan.tareas.filter(t => t.estado !== 'no-se-requiere');
  return { hechas: cuentan.filter(t => t.estado === 'finalizada' || t.pct >= 100).length, total: cuentan.length };
}
