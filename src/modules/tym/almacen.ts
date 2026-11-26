// ─── Proyectos abiertos (T&M) — dónde se guardan ─────────────────────────────
// Una sola clave de estado, `timia_tym_planes`, con un plan por proyecto. Va por
// la misma capa que el resto del front: localStorage para leer y, si hay API,
// un PUT por escritura.
//
// Una clave sola y no una por proyecto porque cada clave nueva necesita su regla
// de permisos en el API: sin regla, cualquiera con sesión puede escribirla.

import { persistSet } from '../../lib/persist';
import { adminStore, type AdminProject } from '../../lib/adminStore';
import { planVacio, type PlanTym, type TareaTym, type CambioTym } from './tipos';

const CLAVE = 'timia_tym_planes';

type Mapa = Record<string, PlanTym>;

function todos(): Mapa {
  try {
    const v = localStorage.getItem(CLAVE);
    return v ? (JSON.parse(v) as Mapa) : {};
  } catch { return {}; }
}

export function leerPlan(projectId: string): PlanTym {
  const p = todos()[projectId];
  if (!p) return planVacio(projectId);
  // Los campos nuevos pueden faltar en lo ya guardado.
  return { ...planVacio(projectId), ...p, projectId };
}

export function guardarPlan(plan: PlanTym): void {
  persistSet(CLAVE, { ...todos(), [plan.projectId]: plan });
}

/** ¿Este proyecto es abierto? Sin `tipo`, es cerrado: así estaban todos. */
export function esTym(proyecto: AdminProject | string | undefined): boolean {
  if (!proyecto) return false;
  const p = typeof proyecto === 'string'
    ? adminStore.getProjects().find(x => x.id === proyecto)
    : proyecto;
  return p?.tipo === 'tym';
}

export const nuevoId = () =>
  `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function nuevaTarea(nombre: string, bloque: string, responsable?: string): TareaTym {
  return {
    id: nuevoId(),
    nombre: nombre.trim(),
    bloque: bloque.trim(),
    responsable: responsable?.trim() || undefined,
    estado: 'en-curso',
    pct: 0,
    creada: new Date().toISOString(),
  };
}

/**
 * Cambia el avance de una tarea y deja el movimiento en el historial.
 * Devuelve el plan nuevo; no guarda, para que quien llama decida cuándo.
 */
export function conAvance(
  plan: PlanTym, tareaId: string,
  cambios: Partial<Pick<TareaTym, 'pct' | 'estado' | 'responsable' | 'nombre' | 'bloque'>>,
  quien: string, nota?: string,
): PlanTym {
  const antes = plan.tareas.find(t => t.id === tareaId);
  if (!antes) return plan;
  const tareas = plan.tareas.map(t => (t.id === tareaId ? { ...t, ...cambios } : t));
  const historial = { ...plan.historial };
  const pct = cambios.pct ?? antes.pct;
  if (pct !== antes.pct || nota?.trim()) {
    const linea: CambioTym = { fecha: new Date().toISOString(), de: antes.pct, a: pct, quien, nota: nota?.trim() || undefined };
    historial[tareaId] = [linea, ...(historial[tareaId] ?? [])].slice(0, 60);
  }
  return { ...plan, tareas, historial };
}
