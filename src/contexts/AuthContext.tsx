import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

// pm: Rodolfo Pereda → vista ejecutiva total, acceso admin y estimaciones
// tech_lead: Juan Pablo/Diego/David → multi-proyecto de su área, marca etapas
// project_lead: lidera un proyecto específico
// tech_ref: Juliana → referente técnico, apoya líder en actividades asignadas
// developer: Sergio/Fabrizio/Ana → ejecuta sus tareas asignadas
export type UserRole = 'pm' | 'tech_lead' | 'project_lead' | 'tech_ref' | 'developer';

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
  ],
  project_lead: [
    'view_project', 'view_bank_status', 'manage_tasks', 'assign_tasks',
    'view_inventory', 'view_bitacora', 'view_controlm', 'assign_tech_ref',
    'view_plan_trabajo',
  ],
  // Referente Técnico: apoya al líder, puede crear borradores de estimaciones
  tech_ref: [
    'view_project', 'view_bank_status', 'manage_tasks',
    'update_task_status', 'comment_tasks',
    'view_inventory', 'view_bitacora', 'write_bitacora', 'view_controlm',
    'view_plan_trabajo', 'mark_etapas',
    // tech_ref puede crear borradores; el líder técnico los revisa y aprueba
    'view_estimaciones', 'edit_estimaciones',
  ],
  developer: [
    'view_my_tasks', 'update_task_status', 'comment_tasks',
    'view_inventory', 'view_bitacora',
    'add_inv_row',  // puede agregar objetos al inventario pero NO configurar columnas ni borrar
  ],
};

export function canAccess(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Vista inicial según rol
export const ROLE_LANDING: Record<UserRole, string> = {
  pm:           'analytics',
  tech_lead:    'plan-trabajo',
  project_lead: 'plan-trabajo',
  tech_ref:     'plan-trabajo',
  developer:    'dashboard',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  pm:           'Project Manager',
  tech_lead:    'Líder Técnico',
  project_lead: 'Líder de Proyecto',
  tech_ref:     'Referente Técnico',
  developer:    'Desarrollador',
};

// ─── Proyectos del sistema ─────────────────────────────────────────────────────

export const PROJECTS = [
  // Juan Pablo Arévalo — BBVA CO
  { id: 'FICO',     name: 'FICO',     area: 'Juan Pablo Arévalo', color: '#dc2626' },
  { id: 'NGA',      name: 'NGA',      area: 'Juan Pablo Arévalo', color: '#7c3aed' },
  { id: 'CRONOS',   name: 'CRONOS',   area: 'Juan Pablo Arévalo', color: '#0891b2' },
  { id: 'PINTO',    name: 'PINTO',    area: 'Juan Pablo Arévalo', color: '#059669' },
  { id: 'QA',       name: 'QA',       area: 'Juan Pablo Arévalo', color: '#d97706' },
  // Diego Sánchez — BBVA CO · SDM
  { id: 'SDM1',     name: 'SDM 1',    area: 'Diego Sánchez', color: '#2563eb' },
  { id: 'SDM2',     name: 'SDM 2',    area: 'Diego Sánchez', color: '#4f46e5' },
  { id: 'MURIC',    name: 'MURIC',    area: 'Diego Sánchez', color: '#0f766e' },
  { id: 'BRICKELL', name: 'BRICKELL', area: 'Diego Sánchez', color: '#b45309' },
  { id: 'BCBS239',  name: 'BCBS239',  area: 'Diego Sánchez', color: '#7e22ce' },
  // David Huamán — Credicorp Capital
  { id: 'OPTIM',    name: 'Optimización', area: 'David Huamán', color: '#0369a1' },
  { id: 'FABRICA',  name: 'Fábrica',  area: 'David Huamán', color: '#be185d' },
];

// ─── Equipo real Timia ────────────────────────────────────────────────────────
// En producción: reemplazar login() por token de Cloudflare Access / Google OAuth

export const MOCK_ACCOUNTS: AuthUser[] = [
  // ── Project Manager ───────────────────────────────────────────────────────
  {
    id: 'u-rodolfo', name: 'Rodolfo Pereda', email: 'rodolfo.pereda@timia.ai',
    initials: 'RP', role: 'pm', avatarColor: '#dc2626',
    projectIds: PROJECTS.map(p => p.id),
    areaLabel: 'Project Manager · BBVA CO & Credicorp Capital',
  },
  // ── Líderes Técnicos ──────────────────────────────────────────────────────
  {
    id: 'u-juan', name: 'Juan Pablo Arévalo', email: 'juanpablo.arevalo@timia.ai',
    initials: 'JA', role: 'tech_lead', avatarColor: '#7c3aed',
    projectIds: ['FICO', 'NGA', 'CRONOS', 'PINTO', 'QA'],
    areaLabel: 'Líder Técnico · FICO · NGA · CRONOS · PINTO · QA',
  },
  {
    id: 'u-david', name: 'David Huamán', email: 'david.huaman@timia.ai',
    initials: 'DH', role: 'tech_lead', avatarColor: '#0369a1',
    projectIds: ['OPTIM', 'FABRICA', 'SDM1', 'SDM2'],
    areaLabel: 'Líder Técnico · Credicorp Capital · SDM',
  },
  {
    id: 'u-diego', name: 'Diego Sánchez', email: 'diego.sanchez@timia.ai',
    initials: 'DS', role: 'tech_lead', avatarColor: '#2563eb',
    projectIds: ['SDM1', 'SDM2', 'MURIC', 'BRICKELL', 'BCBS239'],
    areaLabel: 'Líder Técnico · SDM · MURIC · BRICKELL · BCBS239',
  },
  // ── Referente Técnico ─────────────────────────────────────────────────────
  {
    id: 'u-juliana', name: 'Juliana Garzón', email: 'juliana.garzon@timia.ai',
    initials: 'JG', role: 'tech_ref', avatarColor: '#0f766e',
    projectIds: ['FICO', 'NGA'],
    areaLabel: 'Referente Técnico · FICO · NGA',
  },
  // ── Desarrolladores ───────────────────────────────────────────────────────
  {
    id: 'u-sergio', name: 'Sergio David Rodriguez', email: 'sergio.rodriguez@timia.ai',
    initials: 'SR', role: 'developer', avatarColor: '#b45309',
    projectIds: ['FICO', 'NGA', 'CRONOS'],
    areaLabel: 'Desarrollador · FICO · NGA · CRONOS',
  },
  {
    id: 'u-fabrizio', name: 'Fabrizio Atiquipa', email: 'fabrizio.atiquipa@timia.ai',
    initials: 'FA', role: 'developer', avatarColor: '#059669',
    projectIds: ['FICO', 'NGA', 'CRONOS'],
    areaLabel: 'Desarrollador · FICO · NGA · CRONOS',
  },
  {
    id: 'u-ana', name: 'Ana Restrepo', email: 'ana.restrepo@timia.ai',
    initials: 'AR', role: 'developer', avatarColor: '#be185d',
    projectIds: ['NGA', 'CRONOS', 'PINTO'],
    areaLabel: 'Desarrolladora · NGA · CRONOS · PINTO',
  },
];

// ─── Contexto ─────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, login: () => {}, logout: () => {}, isLoading: true,
});

const STORAGE_KEY = 'timia_hub_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const login = (u: AuthUser) => {
    setUser(u);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
