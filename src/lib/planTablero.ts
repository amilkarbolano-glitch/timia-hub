// ─── Puente Plan de Trabajo → Tablero ────────────────────────────────────────
// Asignar un responsable a una actividad del plan crea su tarjeta en el tablero.
// Antes solo se guardaba en timia_activity_assignees y se intentaba actualizar
// una tarjeta que casi nunca existía, así que al asignado no le aparecía nada.
//
// La tarjeta queda vinculada a la actividad por (projectId, cronoId, entregableId,
// actIdx) y marcada fromPlan + isLocked: su título y fechas los manda el plan, y
// en el tablero solo se mueve de columna y se comenta.

import { adminStore, splitPlanKey, type KanbanTask } from './adminStore';
import { weekStartDate, addBusinessDays } from './businessDays';

/** Lo que el plan sabe de una actividad y la tarjeta necesita. */
export interface MetaActividad {
  titulo: string;
  entregableName?: string;
  startWeek: number;
  endWeek: number;
  planStartDate?: string;
  jiraId?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Fechas de la actividad en el calendario real. Una semana del plan son 5 días
 * hábiles, así que el fin es el último día hábil de `endWeek`.
 * Sin fecha de inicio del plan no se puede fechar: devuelve vacío y la tarjeta
 * nace sin fechas en lugar de con fechas inventadas.
 */
export function fechasDeActividad(meta: MetaActividad, holidays: Set<string>): { startDate: string; endDate: string } {
  if (!meta.planStartDate) return { startDate: '', endDate: '' };
  const ini = Math.max(1, Math.min(meta.startWeek, meta.endWeek));
  const fin = Math.max(1, Math.max(meta.startWeek, meta.endWeek));
  const inicio = weekStartDate(meta.planStartDate, ini, holidays);
  const finSem = weekStartDate(meta.planStartDate, fin, holidays);
  return { startDate: iso(inicio), endDate: iso(addBusinessDays(finSem, 4, holidays)) };
}

/** Localiza la tarjeta vinculada a una actividad. -1 si no existe. */
function indiceVinculada(tasks: KanbanTask[], planKey: string, entregableId: string, actIdx: number): number {
  const { projectId, cronoId } = splitPlanKey(planKey);
  return tasks.findIndex(t =>
    t.projectId === projectId &&
    (t.cronoId ?? undefined) === cronoId &&
    t.entregableId === entregableId &&
    t.actIdx === actIdx);
}

/** Una tarjeta fromPlan recién creada puede borrarse sin perder trabajo del equipo. */
function esDescartable(t: KanbanTask): boolean {
  return !!t.fromPlan && t.status === 'backlog'
    && (t.comments?.length ?? 0) === 0 && (t.links?.length ?? 0) === 0;
}

export function tarjetaDesdeActividad(
  planKey: string, entregableId: string, actIdx: number,
  assigneeIds: string[], meta: MetaActividad, holidays: Set<string>,
): KanbanTask {
  const { projectId, cronoId } = splitPlanKey(planKey);
  const { startDate, endDate } = fechasDeActividad(meta, holidays);
  return {
    id: `plan-${projectId}-${cronoId ?? 'main'}-${entregableId}-${actIdx}`,
    title: meta.titulo,
    description: meta.entregableName ? `Plan de trabajo · ${meta.entregableName}` : 'Plan de trabajo',
    priority: 'media',
    startDate, endDate,
    status: 'backlog',
    assigneeIds,
    jiraId: meta.jiraId,
    projectId, cronoId,
    entregableId, actIdx,
    fromPlan: true, isLocked: true,
    links: [], comments: [],
  };
}

/**
 * Deja la tarjeta del tablero en línea con los asignados de la actividad.
 *
 *   · hay asignados y no hay tarjeta  → la crea (necesita `meta`)
 *   · hay asignados y ya hay tarjeta  → actualiza los asignados; si es fromPlan,
 *                                        también el título y las fechas
 *   · no quedan asignados             → borra la tarjeta si nadie la trabajó
 *                                        todavía; si no, la deja sin asignados
 *
 * Devuelve qué hizo, para poder avisarlo en la interfaz.
 */
export function sincronizarAsignados(
  planKey: string, entregableId: string, actIdx: number, assigneeIds: string[],
  meta?: MetaActividad, holidays: Set<string> = new Set(),
): 'creada' | 'actualizada' | 'borrada' | 'sin-cambios' {
  const tasks = adminStore.getKanbanTasks();
  const idx = indiceVinculada(tasks, planKey, entregableId, actIdx);

  if (idx < 0) {
    if (!assigneeIds.length || !meta) return 'sin-cambios';
    adminStore.saveKanbanTasks([...tasks, tarjetaDesdeActividad(planKey, entregableId, actIdx, assigneeIds, meta, holidays)]);
    return 'creada';
  }

  const actual = tasks[idx];

  if (!assigneeIds.length) {
    if (esDescartable(actual)) {
      adminStore.saveKanbanTasks(tasks.filter((_, i) => i !== idx));
      return 'borrada';
    }
    if (!actual.assigneeIds.length) return 'sin-cambios';
    const next = [...tasks];
    next[idx] = { ...actual, assigneeIds: [] };
    adminStore.saveKanbanTasks(next);
    return 'actualizada';
  }

  const campos: Partial<KanbanTask> = { assigneeIds };
  if (actual.fromPlan && meta) {
    const { startDate, endDate } = fechasDeActividad(meta, holidays);
    campos.title = meta.titulo;
    if (startDate) { campos.startDate = startDate; campos.endDate = endDate; }
  }
  const igual = Object.entries(campos).every(([k, v]) =>
    JSON.stringify((actual as any)[k]) === JSON.stringify(v));
  if (igual) return 'sin-cambios';

  const next = [...tasks];
  next[idx] = { ...actual, ...campos };
  adminStore.saveKanbanTasks(next);
  return 'actualizada';
}

/** Camino inverso: lo que se cambie en la tarjeta se refleja en la actividad del plan. */
export function sincronizarPlanDesdeTablero(planKey: string, entregableId: string, actIdx: number, assigneeIds: string[]): boolean {
  const clave = `${planKey}__${entregableId}__${actIdx}`;
  const actual = adminStore.getActivityAssignees();
  const antes = actual[clave] ?? [];
  if (antes.length === assigneeIds.length && antes.every(id => assigneeIds.includes(id))) return false;
  adminStore.saveActivityAssignees({ ...actual, [clave]: assigneeIds });
  return true;
}

// ─── Reparación de lo ya asignado ────────────────────────────────────────────

/** Lo mínimo que hace falta de un plan para reconstruir sus tarjetas. */
export interface EsquemaPlan {
  planKey: string;
  startDate?: string;
  entregables: { id: string; name: string; activities: { name: string; startWeek: number; endWeek: number }[] }[];
}

/**
 * Crea las tarjetas de las asignaciones que se hicieron antes de que este puente
 * existiera. Idempotente: si la tarjeta ya está, no la toca. No borra nada.
 * Devuelve cuántas creó.
 */
export function reconciliarTablero(planes: EsquemaPlan[], holidays: Set<string>): number {
  const asignaciones = adminStore.getActivityAssignees();
  const jiras = adminStore.getActivityJiras();
  const tasks = adminStore.getKanbanTasks();
  const nuevas: KanbanTask[] = [];

  Object.entries(asignaciones).forEach(([clave, ids]) => {
    if (!ids?.length) return;
    // clave = `${planKey}__${entregableId}__${actIdx}`; el planKey puede traer "::"
    const corte = clave.lastIndexOf('__');
    if (corte < 0) return;
    const actIdx = Number(clave.slice(corte + 2));
    const resto = clave.slice(0, corte);
    const corte2 = resto.lastIndexOf('__');
    if (corte2 < 0 || !Number.isInteger(actIdx)) return;
    const planKey = resto.slice(0, corte2);
    const entregableId = resto.slice(corte2 + 2);

    if (indiceVinculada(tasks, planKey, entregableId, actIdx) >= 0) return;
    if (indiceVinculada(nuevas, planKey, entregableId, actIdx) >= 0) return;

    const plan = planes.find(p => p.planKey === planKey);
    const ent  = plan?.entregables.find(e => e.id === entregableId);
    const act  = ent?.activities[actIdx];
    if (!plan || !ent || !act) return;        // actividad que ya no existe: se ignora

    nuevas.push(tarjetaDesdeActividad(planKey, entregableId, actIdx, ids, {
      titulo: act.name, entregableName: ent.name,
      startWeek: act.startWeek, endWeek: act.endWeek,
      planStartDate: plan.startDate, jiraId: jiras[clave],
    }, holidays));
  });

  if (nuevas.length) adminStore.saveKanbanTasks([...tasks, ...nuevas]);
  return nuevas.length;
}
