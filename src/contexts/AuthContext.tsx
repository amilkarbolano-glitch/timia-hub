import React, { createContext, useContext, useState, useEffect } from 'react';
import { persist, apiMe, apiLoginDemo, apiLoginGoogle, apiLogout, loadStateFromApi } from '../lib/persist';

// ─── Tipos ────────────────────────────────────────────────────────────────────

// pm: Rodolfo Pereda → vista ejecutiva total, acceso admin y estimaciones
// tech_lead: Juan Pablo/Diego/David → multi-proyecto de su área, marca etapas
// developer: Sergio/Fabrizio/Ana → ejecuta sus tareas asignadas
// Roles (4 niveles): account_manager (gerente de cuenta) · pm · tech_lead (líder/referente técnico) · developer
export type UserRole = 'account_manager' | 'pm' | 'tech_lead' | 'developer';
/** Roles antiguos → nuevos (datos guardados en navegadores/DB viejos) */
export const LEGACY_ROLE_MAP: Record<string, UserRole> = { project_lead: 'tech_lead', tech_ref: 'tech_lead' };
export function normalizeRole(r: string | undefined | null): UserRole { const x = LEGACY_ROLE_MAP[r ?? ''] ?? r; return (['account_manager','pm','tech_lead','developer'] as string[]).includes(x as string) ? x as UserRole : 'developer'; }

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: UserRole;
  avatarColor: string;
  projectIds: string[];   // proyectos a los que tiene acceso
  areaLabel?: string;     // etiqueta descriptiva del área/equipo
}

// ─── Permisos por rol ─────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  account_manager: [
    'view_all_projects', 'view_analytics', 'view_bank_status', 'view_audit', 'view_team_overview', 'view_standards',
    's_audit', 'u_roles', 'create_projects', 'view_estimaciones', 'edit_estimaciones', 'view_admin',
    'view_bitacora', 'write_bitacora', 'view_circuitos', 'edit_circuitos', 'view_plan_trabajo', 'mark_etapas',
    'generate_standup', 'export_pptx',
  ],
  pm: [
    'view_all_projects', 'view_analytics', 'view_bank_status',
    'view_audit', 'view_team_overview', 'view_standards',
    's_audit', 'u_roles', 'create_projects',
    'view_estimaciones', 'edit_estimaciones', 'view_admin',
    'view_bitacora', 'write_bitacora',
    'view_circuitos', 'edit_circuitos',
    'view_plan_trabajo', 'mark_etapas',
    'generate_standup', 'export_pptx',
  ],
  tech_lead: [
    'view_all_projects', 'view_bank_status',
    'view_audit', 'manage_tasks', 'assign_tasks',
    'view_inventory', 'view_bitacora', 'write_bitacora',
    'view_standards', 'view_controlm', 'assign_tech_ref',
    'view_circuitos',
    'view_plan_trabajo', 'mark_etapas',
    // Estimaciones: tech_lead crea/edita los planes, el PM los aprueba y genera
    'view_estimaciones', 'edit_estimaciones',
    // Admin: el líder ve y gestiona solo los proyectos que tiene asignados
    'view_admin',
  ],
  developer: [
    'view_my_tasks', 'update_task_status', 'comment_tasks',
    'view_inventory', 'view_bitacora', 'write_bitacora',
    'add_inv_row',  // puede agregar objetos al inventario pero NO configurar columnas ni borrar
  ],
};

// Permisos: la matriz vigente vive en src/lib/permissions.ts (espejo del servidor) y
// admite los nombres antiguos (ROLE_PERMISSIONS de arriba se conserva como referencia).
import { hasPermission, canInProject as _canInProject, effectiveRole as _effectiveRole } from '../lib/permissions';
export function canAccess(role: UserRole, permission: string): boolean {
  return hasPermission(role, permission);
}
/** Permiso evaluado con el rol que el usuario tiene EN ese proyecto (rol base u override). */
export const canInProject = _canInProject;
export const effectiveRole = _effectiveRole;

// Vista inicial según rol
export const ROLE_LANDING: Record<UserRole, string> = {
  account_manager: 'analytics',
  pm:           'analytics',
  tech_lead:    'plan-trabajo',
  developer:    'dashboard',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  account_manager: 'Gerente de cuenta',
  pm:           'Project Manager',
  tech_lead:    'Líder / Referente técnico',
  developer:    'Desarrollador',
};

// ─── Proyectos del sistema ─────────────────────────────────────────────────────

export interface ProjectRef { id: string; name: string; area: string; color: string; client?: string; sda?: string }
// Lista viva de proyectos: se llena desde `timia_admin_projects` (API/db.json) y se
// refresca con refreshProjects(). Sin datos → arranca con el piloto.
const PILOT_PROJECTS: ProjectRef[] = [
  { id: 'MIGBD', name: 'Migración BD a ADA', area: 'Juan Pablo Arévalo', color: '#0e7490', client: 'BBVA Colombia', sda: 'SDATOOL-54364' },
];
export const PROJECTS: ProjectRef[] = [];
export function refreshProjects(): ProjectRef[] {
  let list: ProjectRef[] = PILOT_PROJECTS;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('timia_admin_projects') : null;
    const arr = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length) list = arr.filter((p: any) => p && p.id && p.active !== false).map((p: any) => ({ id: p.id, name: p.name ?? p.id, area: p.area ?? '', color: p.color ?? '#64748b', client: p.client, sda: p.sda }));
  } catch {}
  PROJECTS.splice(0, PROJECTS.length, ...list);
  return PROJECTS;
}
refreshProjects();

// ─── Equipo real Timia ────────────────────────────────────────────────────────
// En producción: reemplazar login() por token de Cloudflare Access / Google OAuth

export const MOCK_ACCOUNTS: AuthUser[] = [
  // ── Cuentas de prueba (hasta integrar Google) — mismas que en db.json ─────
  {
    id: 'u-amilkar', name: 'Amilkar José Bolaño', email: 'amilkar.bolano@timia.ai',
    initials: 'AB', role: 'tech_lead', avatarColor: '#7c3aed', projectIds: ['MIGBD'],
    areaLabel: 'Líder técnico · Migración BD a ADA',
  },
  {
    id: 'u-rodolfo', name: 'Rodolfo Pereda', email: 'rodolfo.pereda@timia.ai',
    initials: 'RP', role: 'account_manager', avatarColor: '#dc2626', projectIds: ['MIGBD'],
    areaLabel: 'Gerente de cuenta · BBVA Colombia',
  },
  {
    id: 'u-juan', name: 'Juan Pablo Arévalo', email: 'juanpablo.arevalo@timia.ai',
    initials: 'JA', role: 'pm', avatarColor: '#7c3aed', projectIds: ['MIGBD'],
    areaLabel: 'Project Manager · Migración BD a ADA',
  },
];


// ─── Contexto ─────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: AuthUser | null;
  /** Login local (modo sin API): guarda la cuenta en el navegador */
  login: (user: AuthUser) => void;
  /** Login demo contra la API (cuenta del panel, sin contraseña) */
  loginDemo: (userId: string) => Promise<{ error?: string }>;
  /** Login con Google (ID token del botón de Google) contra la API */
  loginWithGoogle: (credential: string) => Promise<{ error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  loginWithGoogle: async () => ({ error: 'no disponible' }),
  loginDemo: async () => ({ error: 'no disponible' }),
  user: null, login: () => {}, logout: () => {}, isLoading: true,
});

const STORAGE_KEY = 'timia_hub_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (persist.mode === 'api') {
        // Sesión en cookie httpOnly: la API dice quién soy (el estado ya se cargó en seedFromRemote)
        const me = await apiMe();
        if (me) setUser({ ...(me as AuthUser), role: normalizeRole(me.role) });
        setIsLoading(false);
        return;
      }
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: AuthUser = JSON.parse(stored);
          // Validate that the stored user ID still exists in current accounts
          // (prevents stale sessions when user accounts are renamed/removed)
          const isValid = MOCK_ACCOUNTS.some(a => a.id === parsed.id);
          if (isValid) {
            // Refresh with current account data (picks up name/email/role changes)
            const current = MOCK_ACCOUNTS.find(a => a.id === parsed.id)!;
            setUser(current);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  // Si la sesión de la API caduca mientras se trabaja, volver al login
  useEffect(() => persist.onChange(() => { if (persist.sessionLost) { persist.resetSession(); setUser(null); } }), []);

  const login = (u: AuthUser) => {
    setUser(u);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
  };

  const afterApiLogin = async (u: AuthUser) => {
    await loadStateFromApi();            // estado compartido → localStorage (caché de lectura)
    refreshProjects();
    setUser(u);
  };
  const loginDemo = async (userId: string) => {
    const r = await apiLoginDemo(userId);
    if (r.user) { await afterApiLogin({ ...(r.user as AuthUser), role: normalizeRole(r.user.role) }); return {}; }
    return { error: r.error };
  };
  const loginWithGoogle = async (credential: string) => {
    const r = await apiLoginGoogle(credential);
    if (r.user) { await afterApiLogin({ ...(r.user as AuthUser), role: normalizeRole(r.user.role) }); return {}; }
    return { error: r.error };
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    if (persist.mode === 'api') apiLogout();
  };

  return (
    <AuthContext.Provider value={{ user, login, loginDemo, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
