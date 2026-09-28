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

/** Permisos de administración de la herramienta (no dan rango dentro de un proyecto). */
export const ADMIN_PERMISSIONS = [
  'projects.view_all', 'projects.create', 'projects.manage',
  'team.manage', 'roles.manage', 'config.manage', 'audit.view',
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Administrador de la plataforma: gestiona usuarios, accesos, permisos y configuración.
  // NO da permisos operativos: dentro de cada proyecto vale su rol de `timia_project_roles`
  // (ver effectiveRole). Sin override asignado, opera como developer.
  platform_admin: ADMIN_PERMISSIONS,
  // Gerente de cuenta: todo, sobre todos los proyectos del cliente
  account_manager: ALL_PERMISSIONS,
  // PM: todo sobre sus proyectos
  pm: ALL_PERMISSIONS.filter(p => p !== 'projects.view_all'),
  // Líder / Referente técnico: apoya al PM
  tech_lead: [
    'plan.view', 'plan.edit_progress', 'plan.manage_issues', 'plan.export',
    'estimaciones.view', 'estimaciones.edit',
    'tasks.view', 'tasks.manage', 'tasks.update_status', 'tasks.assign', 'tasks.comment',
    'bitacora.view', 'bitacora.write', 'circuitos.view', 'circuitos.edit',
    'inventario.view', 'inventario.edit', 'inventario.configure', 'links.edit', 'imputaciones.edit',
    'tr.view', 'tr.load_own', 'tr.load_any', 'tr.manage_features',
    'bank_status.view', 'standup.generate',
  ],
  // Desarrollador: ve lo suyo, mueve sus tareas, reporta bloqueantes, carga su TR
  developer: [
    'plan.manage_issues',
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
const LEGACY_ROLE: Record<string, UserRole> = { admin: 'account_manager', leader: 'pm', member: 'developer', guest: 'developer', project_lead: 'tech_lead', tech_ref: 'tech_lead' };

export const ROLE_META: Record<UserRole, { name: string; description: string; color: string }> = {
  platform_admin:  { name: 'Administrador de la plataforma', description: 'Gestiona usuarios, accesos, permisos y configuración. Dentro de cada proyecto vale el rol que tenga asignado allí.', color: '#0f172a' },
  account_manager: { name: 'Gerente de cuenta',         description: 'Visión global del cliente: todos los proyectos de todos los PM, números, equipo y permisos.', color: '#dc2626' },
  pm:              { name: 'Project Manager',           description: 'Gestiona sus proyectos: estimaciones, plan, equipo, aprobaciones y configuración.', color: '#7c3aed' },
  tech_lead:       { name: 'Líder / Referente técnico', description: 'Apoya al PM: plan, estimaciones, inventario, alertas, tablero y TR del equipo.', color: '#0d9488' },
  developer:       { name: 'Desarrollador',             description: 'Ejecuta: mueve sus tareas, reporta bloqueantes, carga su TR.', color: '#374151' },
};

/** Compatibilidad con el módulo antiguo (SetupTeam): roles en el formato Role de ../types */
export const INITIAL_ROLES: Role[] = (Object.keys(ROLE_META) as UserRole[]).map(id => ({
  id, name: ROLE_META[id].name, description: ROLE_META[id].description, color: ROLE_META[id].color,
  permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p, DEFAULT_ROLE_PERMISSIONS[id].includes(p) ? 'allowed' : 'denied'])) as Role['permissions'],
}));

const KEY = 'timia_role_permissions';
const CUSTOM_KEY = 'timia_custom_roles';

/** Rol creado desde la app: combina permisos que ya existen, no inventa ninguno. */
export interface CustomRole { id: string; name: string; description?: string; color?: string; permissions: string[] }

/** Id válido para un rol nuevo: no pisa uno de fábrica y es alfanumérico. */
export function idRolValido(id: string, base: Record<string, unknown> = ROLE_META): boolean {
  const x = id.trim();
  return !!x && !(x in base) && /^[a-z0-9_-]+$/i.test(x);
}

/** Roles personalizados guardados, descartando los inválidos. */
export function customRoles(): CustomRole[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((r: any) => r && typeof r === 'object' && idRolValido(String(r.id ?? '')))
      .map((r: any) => ({
        id: String(r.id), name: String(r.name || r.id), description: r.description ? String(r.description) : undefined,
        color: r.color ? String(r.color) : '#475569',
        permissions: Array.isArray(r.permissions) ? r.permissions.filter((p: string) => ALL_PERMISSIONS.includes(p)) : [],
      }));
  } catch { return []; }
}

export function saveCustomRoles(list: CustomRole[]): void {
  persistSet(CUSTOM_KEY, list);
}

/** Metadatos de todos los roles: los de fábrica más los personalizados. */
export function allRoleMeta(): Record<string, { name: string; description: string; color: string }> {
  const out: Record<string, { name: string; description: string; color: string }> = { ...ROLE_META };
  for (const r of customRoles()) {
    out[r.id] = { name: r.name, description: r.description ?? 'Rol personalizado', color: r.color ?? '#475569' };
  }
  return out;
}

/** Matriz vigente: defaults + ajustes guardados por el PM (el PM siempre tiene todo). */
export function currentMatrix(): Record<string, string[]> {
  const out: Record<string, string[]> = { ...DEFAULT_ROLE_PERMISSIONS };
  for (const r of customRoles()) out[r.id] = r.permissions;
  try {
    const raw = localStorage.getItem(KEY);
    const stored = raw ? JSON.parse(raw) : null;
    if (stored && typeof stored === 'object') {
      (Object.keys(out) as UserRole[]).forEach(r => {
        if (Array.isArray(stored[r])) out[r] = stored[r].filter((p: unknown) => typeof p === 'string' && ALL_PERMISSIONS.includes(p as string));
      });
    }
  } catch {}
  out.account_manager = ALL_PERMISSIONS;
  return out;
}

/** Rol efectivo de un usuario en un proyecto: override de timia_project_roles ("userId:projectId") o su rol base. */
export function effectiveRole(user: { id: string; role: string } | null | undefined, projectId?: string): UserRole | undefined {
  if (!user) return undefined;
  const base = (LEGACY_ROLE[user.role] ?? user.role) as UserRole;
  // El gerente de cuenta manda en todos los proyectos por definición: no se le aplican
  // overrides (si no, podría bloquearse a sí mismo bajándose el rol en un proyecto).
  if (!projectId || base === 'account_manager') return base;
  try {
    const raw = localStorage.getItem('timia_project_roles');
    const map = raw ? JSON.parse(raw) : {};
    const o = map?.[`${user.id}:${projectId}`];
    if (typeof o === 'string') return (LEGACY_ROLE[o] ?? o) as UserRole;
  } catch {}
  // El administrador de la plataforma no tiene rango operativo: sin override explícito
  // entra a un proyecto como developer, no como administrador.
  if (base === 'platform_admin') return 'developer';
  return base;
}

/**
 * Rol con el que la persona se presenta: el más alto que tiene entre sus proyectos.
 * No es el rol base ni el permiso administrativo — `platform_admin` sirve para
 * administrar la herramienta, no describe a qué se dedica alguien, así que se
 * excluye salvo que no tenga ningún proyecto.
 *
 * "Más alto" se mide por cantidad de permisos en la matriz vigente, no con una
 * tabla fija: así los roles creados desde la app se ordenan solos según lo que
 * pueden hacer, sin tener que registrarlos en ningún lado.
 */
export function rolPrincipal(user: { id: string; role: string; projectIds?: string[] } | null | undefined): string {
  if (!user) return 'developer';
  const base = (LEGACY_ROLE[user.role] ?? user.role) as string;
  // El gerente de cuenta lo es sobre toda la cuenta, no por proyecto.
  if (base === 'account_manager') return base;

  const matriz = currentMatrix();
  const peso = (r: string) => matriz[r]?.length ?? 0;

  const candidatos = (user.projectIds ?? [])
    .map(p => effectiveRole(user, p) as string)
    .filter(r => r && r !== 'platform_admin');
  if (base !== 'platform_admin') candidatos.push(base);

  // Sin proyectos no hay rol operativo que mostrar: se usa el base, aunque sea
  // el administrativo, para no inventarle un rol que no tiene.
  if (!candidatos.length) return base;
  return candidatos.reduce((a, b) => (peso(b) > peso(a) ? b : a));
}

/** ¿Tiene permisos de administración de la herramienta? (para marcarlo aparte) */
export function esAdminPlataforma(user: { id: string; role: string } | null | undefined): boolean {
  if (!user) return false;
  const r = (LEGACY_ROLE[user.role] ?? user.role) as string;
  return (currentMatrix()[r] ?? []).includes('team.manage');
}

/** Permiso de un usuario dentro de un proyecto (usa el rol efectivo en ese proyecto). */
export function canInProject(user: { id: string; role: string; projectIds?: string[] } | null | undefined, permission: string, projectId: string): boolean {
  if (!user) return false;
  const base = (LEGACY_ROLE[user.role] ?? user.role) as UserRole;
  // El administrador de la plataforma administra cualquier proyecto (crear, configurar,
  // equipo), aunque no pertenezca a él. Lo operativo sigue la regla de abajo.
  if (base === 'platform_admin' && ADMIN_PERMISSIONS.includes(permission)) return true;
  const role = effectiveRole(user, projectId);
  if (!hasPermission(role, permission)) return false;
  // sin projects.view_all, además debe estar asignado al proyecto
  return hasPermission(role, 'projects.view_all') || (user.projectIds ?? []).includes(projectId);
}

export function hasPermission(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  const r = (LEGACY_ROLE[role] ?? role) as UserRole;
  const p = LEGACY_ALIASES[permission] ?? permission;
  return currentMatrix()[r]?.includes(p) ?? false;
}

/** Guarda la matriz (solo PM; el servidor también lo verifica). */
export function saveMatrix(matrix: Record<string, string[]>): void {
  persistSet(KEY, matrix);   // localStorage + API (el servidor la aplica en la siguiente petición)
}
