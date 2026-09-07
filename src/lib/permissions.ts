// ─── Roles y permisos (espejo de timia-hub-api/app/permissions.py) ───────────
// El servidor es la fuente de verdad: aplica la matriz en cada escritura. Este
// archivo la replica para (a) ocultar/mostrar UI y (b) funcionar en modo local.
// La matriz vigente se guarda en la key `timia_role_permissions` (editable por el PM).

import type { UserRole } from '../contexts/AuthContext';
import type { Role } from '../types';
import { persistSet } from './persist';

export interface PermissionDef { id: string; module: string; label: string }

export const PERMISSIONS: PermissionDef[] = [
  { id: 'projects.view_all',   module: 'Proyectos', label: 'Ver todos los proyectos (no solo los asignados)' },
  { id: 'projects.create',     module: 'Proyectos', label: 'Crear proyectos (wizard) y plantillas' },
  { id: 'projects.manage',     module: 'Proyectos', label: 'Administrar proyectos (Panel Admin)' },
  { id: 'team.manage',         module: 'Equipo',    label: 'Gestionar usuarios y su asignación a proyectos' },
  { id: 'roles.manage',        module: 'Equipo',    label: 'Editar la matriz de roles y permisos' },
  { id: 'config.manage',       module: 'Equipo',    label: 'Configurar ANS, festivos y parámetros' },
  { id: 'plan.view',           module: 'Plan de trabajo', label: 'Ver el plan de trabajo' },
  { id: 'plan.edit_progress',  module: 'Plan de trabajo', label: 'Marcar etapas, % de avance, asignados y Jira' },
  { id: 'plan.manage_issues',  module: 'Plan de trabajo', label: 'Registrar y resolver alertas y bloqueantes' },
  { id: 'plan.export',         module: 'Plan de trabajo', label: 'Exportar/imprimir el plan' },
  { id: 'estimaciones.view',   module: 'Estimaciones', label: 'Ver estimaciones' },
  { id: 'estimaciones.edit',   module: 'Estimaciones', label: 'Editar estimaciones y cronogramas' },
  { id: 'estimaciones.generate', module: 'Estimaciones', label: 'Generar el plan de trabajo' },
  { id: 'tasks.view',          module: 'Tablero', label: 'Ver el tablero de tareas' },
  { id: 'tasks.manage',        module: 'Tablero', label: 'Crear, editar y eliminar tareas' },
  { id: 'tasks.update_status', module: 'Tablero', label: 'Mover tareas de estado' },
  { id: 'tasks.assign',        module: 'Tablero', label: 'Asignar tareas' },
  { id: 'tasks.comment',       module: 'Tablero', label: 'Comentar tareas' },
  { id: 'bitacora.view',       module: 'Tareas · cambios funcionales', label: 'Ver cambios funcionales' },
  { id: 'bitacora.write',      module: 'Tareas · cambios funcionales', label: 'Registrar cambios funcionales' },
  { id: 'circuitos.view',      module: 'Circuitos BBVA', label: 'Ver circuitos' },
  { id: 'circuitos.edit',      module: 'Circuitos BBVA', label: 'Mover y editar circuitos' },
  { id: 'inventario.view',     module: 'Recursos', label: 'Ver inventario' },
  { id: 'inventario.edit',     module: 'Recursos', label: 'Agregar y editar objetos del inventario' },
  { id: 'inventario.configure',module: 'Recursos', label: 'Configurar columnas/etapas del inventario y borrar' },
  { id: 'links.edit',          module: 'Recursos', label: 'Agregar y borrar links' },
  { id: 'imputaciones.edit',   module: 'Recursos', label: 'Editar imputaciones Jira' },
  { id: 'tr.view',             module: 'Activity Report', label: 'Ver cumplimiento del TR' },
  { id: 'tr.load_own',         module: 'Activity Report', label: 'Cargar mi propio TR' },
  { id: 'tr.load_any',         module: 'Activity Report', label: 'Cargar el TR de cualquier persona' },
  { id: 'tr.manage_features',  module: 'Activity Report', label: 'Definir features y horas por fase' },
  { id: 'analytics.view',      module: 'Dirección', label: 'Dashboard ejecutivo' },
  { id: 'bank_status.view',    module: 'Dirección', label: 'Estado con el banco' },
  { id: 'standup.generate',    module: 'Dirección', label: 'Generar standup' },
  { id: 'audit.view',          module: 'Dirección', label: 'Ver auditoría' },
];
export const ALL_PERMISSIONS = PERMISSIONS.map(p => p.id);

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  pm: ALL_PERMISSIONS,
  tech_lead: [
    'projects.view_all', 'projects.create', 'projects.manage', 'config.manage',
    'plan.view', 'plan.edit_progress', 'plan.manage_issues', 'plan.export',
    'estimaciones.view', 'estimaciones.edit', 'estimaciones.generate',
    'tasks.view', 'tasks.manage', 'tasks.update_status', 'tasks.assign', 'tasks.comment',
    'bitacora.view', 'bitacora.write', 'circuitos.view', 'circuitos.edit',
    'inventario.view', 'inventario.edit', 'inventario.configure', 'links.edit', 'imputaciones.edit',
    'tr.view', 'tr.load_own', 'tr.load_any', 'tr.manage_features',
    'bank_status.view', 'standup.generate', 'audit.view',
  ],
  project_lead: [
    'plan.view', 'plan.manage_issues', 'plan.export', 'estimaciones.view',
    'tasks.view', 'tasks.manage', 'tasks.update_status', 'tasks.assign', 'tasks.comment',
    'bitacora.view', 'bitacora.write', 'circuitos.view', 'circuitos.edit',
    'inventario.view', 'inventario.edit', 'links.edit',
    'tr.view', 'tr.load_own', 'tr.load_any', 'bank_status.view',
  ],
  tech_ref: [
    'plan.view', 'plan.edit_progress', 'plan.manage_issues', 'estimaciones.view', 'estimaciones.edit',
    'tasks.view', 'tasks.manage', 'tasks.update_status', 'tasks.comment',
    'bitacora.view', 'bitacora.write', 'circuitos.view',
    'inventario.view', 'inventario.edit', 'links.edit',
    'tr.view', 'tr.load_own', 'bank_status.view',
  ],
  developer: [
    'plan.view', 'plan.manage_issues',
    'tasks.view', 'tasks.update_status', 'tasks.comment',
    'bitacora.view', 'bitacora.write', 'circuitos.view',
    'inventario.view', 'inventario.edit',
    'tr.view', 'tr.load_own',
  ],
};

/** Nombres antiguos usados en componentes → permiso nuevo (compatibilidad) */
export const LEGACY_ALIASES: Record<string, string> = {
  view_all_projects: 'projects.view_all', create_projects: 'projects.create', view_admin: 'projects.manage',
  u_roles: 'roles.manage', s_audit: 'audit.view', view_audit: 'audit.view',
  view_analytics: 'analytics.view', view_bank_status: 'bank_status.view', generate_standup: 'standup.generate',
  view_plan_trabajo: 'plan.view', mark_etapas: 'plan.edit_progress', export_pptx: 'plan.export',
  view_estimaciones: 'estimaciones.view', edit_estimaciones: 'estimaciones.edit',
  view_bitacora: 'bitacora.view', write_bitacora: 'bitacora.write',
  view_circuitos: 'circuitos.view', edit_circuitos: 'circuitos.edit',
  manage_tasks: 'tasks.manage', assign_tasks: 'tasks.assign', update_task_status: 'tasks.update_status',
  comment_tasks: 'tasks.comment', view_my_tasks: 'tasks.view',
  view_inventory: 'inventario.view', add_inv_row: 'inventario.edit',
  view_team_overview: 'projects.view_all', view_standards: 'plan.view', view_controlm: 'inventario.view',
  assign_tech_ref: 'tasks.assign', view_project: 'plan.view',
  // ids del antiguo módulo de roles (TaskDetails / SetupTeam)
  t_create: 'tasks.manage', t_edit: 'tasks.manage', t_delete: 'tasks.manage', t_assign: 'tasks.assign',
  t_comment: 'tasks.comment', t_status: 'tasks.update_status',
  p_create: 'projects.create', p_edit: 'projects.manage', p_archive: 'projects.manage', p_view_all: 'projects.view_all',
  u_invite: 'team.manage', u_remove: 'team.manage', s_standards: 'plan.view', s_billing: 'config.manage',
};
/** Ids de rol del módulo antiguo → rol real */
const LEGACY_ROLE: Record<string, UserRole> = { admin: 'pm', leader: 'project_lead', member: 'developer', guest: 'developer' };

export const ROLE_META: Record<UserRole, { name: string; description: string; color: string }> = {
  pm:           { name: 'Project Manager',   description: 'Control total: proyectos, equipo, permisos y configuración.', color: '#dc2626' },
  tech_lead:    { name: 'Líder Técnico',     description: 'Dirige varios proyectos: estimaciones, plan, tablero, TR y administración.', color: '#7c3aed' },
  project_lead: { name: 'Líder de Proyecto', description: 'Gestiona sus proyectos: tareas, alertas, circuitos y TR del equipo.', color: '#0369a1' },
  tech_ref:     { name: 'Referente Técnico', description: 'Apoya al líder: avance del plan, borradores de estimación, tareas.', color: '#0d9488' },
  developer:    { name: 'Desarrollador',     description: 'Ejecuta: mueve sus tareas, reporta bloqueantes, carga su TR.', color: '#374151' },
};

/** Compatibilidad con el módulo antiguo (SetupTeam): roles en el formato Role de ../types */
export const INITIAL_ROLES: Role[] = (Object.keys(ROLE_META) as UserRole[]).map(id => ({
  id, name: ROLE_META[id].name, description: ROLE_META[id].description, color: ROLE_META[id].color,
  permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p, DEFAULT_ROLE_PERMISSIONS[id].includes(p) ? 'allowed' : 'denied'])) as Role['permissions'],
}));

const KEY = 'timia_role_permissions';

/** Matriz vigente: defaults + ajustes guardados por el PM (el PM siempre tiene todo). */
export function currentMatrix(): Record<UserRole, string[]> {
  const out = { ...DEFAULT_ROLE_PERMISSIONS };
  try {
    const raw = localStorage.getItem(KEY);
    const stored = raw ? JSON.parse(raw) : null;
    if (stored && typeof stored === 'object') {
      (Object.keys(out) as UserRole[]).forEach(r => {
        if (Array.isArray(stored[r])) out[r] = stored[r].filter((p: unknown) => typeof p === 'string' && ALL_PERMISSIONS.includes(p as string));
      });
    }
  } catch {}
  out.pm = ALL_PERMISSIONS;
  return out;
}

export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  const r = (LEGACY_ROLE[role] ?? role) as UserRole;
  const p = LEGACY_ALIASES[permission] ?? permission;
  return currentMatrix()[r]?.includes(p) ?? false;
}

/** Guarda la matriz (solo PM; el servidor también lo verifica). */
export function saveMatrix(matrix: Record<UserRole, string[]>): void {
  persistSet(KEY, matrix);   // localStorage + API (el servidor la aplica en la siguiente petición)
}
