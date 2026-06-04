import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

// pm: Rodolfo → vista ejecutiva total
// tech_lead: Juan/Diego/David → multi-proyecto de su área
// project_lead: Juliana/Jose → lidera un proyecto específico
// tech_ref: Amilkar/Daniel → referente técnico, asignado por líder, apoya 1+ proyectos
// developer: Sergio/Fabrizio → ejecuta sus tareas asignadas
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
    'view_audit', 'view_team_overview',
  ],
  tech_lead: [
    'view_all_projects', 'view_analytics', 'view_bank_status',
    'view_audit', 'manage_tasks', 'assign_tasks', 'create_projects',
    'manage_team', 'view_inventory', 'view_bitacora',
    'view_standards', 'view_roles', 'view_controlm', 'assign_tech_ref',
  ],
  project_lead: [
    'view_project', 'view_bank_status', 'manage_tasks', 'assign_tasks',
    'view_inventory', 'view_bitacora', 'view_controlm', 'assign_tech_ref',
  ],
  // Referente Técnico: asignado por líder, apoya 1+ proyectos sin liderar
  tech_ref: [
    'view_project', 'view_bank_status', 'manage_tasks',
    'update_task_status', 'comment_tasks',
    'view_inventory', 'view_bitacora', 'view_controlm',
  ],
  developer: [
    'view_my_tasks', 'update_task_status', 'comment_tasks',
    'view_inventory', 'view_bitacora',
  ],
};

export function canAccess(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Vista inicial según rol
export const ROLE_LANDING: Record<UserRole, string> = {
  pm:           'analytics',
  tech_lead:    'dashboard',
  project_lead: 'dashboard',
  tech_ref:     'dashboard',
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
  // Juan Arévalo
  { id: 'NGA',      name: 'NGA',      area: 'Juan Arévalo', color: '#7c3aed' },
  { id: 'CRONOS',   name: 'CRONOS',   area: 'Juan Arévalo', color: '#0891b2' },
  { id: 'FICO',     name: 'FICO',     area: 'Juan Arévalo', color: '#dc2626' },
  { id: 'PINTO',    name: 'PINTO',    area: 'Juan Arévalo', color: '#059669' },
  { id: 'QA',       name: 'QA',       area: 'Juan Arévalo', color: '#d97706' },
  // Diego Sánchez
  { id: 'SDM1',     name: 'SDM 1',    area: 'Diego Sánchez', color: '#2563eb' },
  { id: 'SDM2',     name: 'SDM 2',    area: 'Diego Sánchez', color: '#4f46e5' },
  { id: 'MURIC',    name: 'MURIC',    area: 'Diego Sánchez', color: '#0f766e' },
  { id: 'BRICKELL', name: 'BRICKELL', area: 'Diego Sánchez', color: '#b45309' },
  { id: 'BCBS239',  name: 'BCBS239',  area: 'Diego Sánchez', color: '#7e22ce' },
  // David Huamán
  { id: 'OPTIM',    name: 'Optimización', area: 'David Huamán', color: '#0369a1' },
  { id: 'FABRICA',  name: 'Fábrica',  area: 'David Huamán', color: '#be185d' },
];

// ─── Cuentas simuladas (@timia.ai) ────────────────────────────────────────────
// En producción: reemplazar login() por token de Cloudflare Access / Google OAuth

export const MOCK_ACCOUNTS: AuthUser[] = [
  // N1 · PM
  {
    id: 'u-rodolfo', name: 'Rodolfo Pereda', email: 'rodolfo.pereda@timia.ai',
    initials: 'RP', role: 'pm', avatarColor: '#7c3aed',
    projectIds: PROJECTS.map(p => p.id),
    areaLabel: 'Project Manager · BBVA CO & CAP',
  },
  // N2 · Líderes Técnicos
  {
    id: 'u-juan', name: 'Juan Arévalo', email: 'juan.arevalo@timia.ai',
    initials: 'JA', role: 'tech_lead', avatarColor: '#dc2626',
    projectIds: ['NGA', 'CRONOS', 'FICO', 'PINTO', 'QA'],
    areaLabel: 'Líder Técnico · NGA · CRONOS · FICO · PINTO · QA',
  },
  {
    id: 'u-diego', name: 'Diego Sánchez', email: 'diego.sanchez@timia.ai',
    initials: 'DS', role: 'tech_lead', avatarColor: '#2563eb',
    projectIds: ['SDM1', 'SDM2', 'MURIC', 'BRICKELL', 'BCBS239'],
    areaLabel: 'Líder Técnico · SDM · MURIC · BRICKELL · BCBS239',
  },
  {
    id: 'u-david', name: 'David Huamán', email: 'david.huaman@timia.ai',
    initials: 'DH', role: 'tech_lead', avatarColor: '#0369a1',
    projectIds: ['OPTIM', 'FABRICA'],
    areaLabel: 'Líder Técnico · Credicorp Capital',
  },
  // N3 · Líderes de Proyecto
  {
    id: 'u-juliana', name: 'Juliana Garzón', email: 'juliana.garzon@timia.ai',
    initials: 'JG', role: 'project_lead', avatarColor: '#0f766e',
    projectIds: ['NGA'],
    areaLabel: 'Líder Proyecto · NGA',
  },
  {
    id: 'u-jose', name: 'Jose Bolaño', email: 'jose.bolano@timia.ai',
    initials: 'JB', role: 'project_lead', avatarColor: '#7e22ce',
    projectIds: ['FICO'],
    areaLabel: 'Líder Proyecto · FICO',
  },
  // N4 · Referentes Técnicos (asignados por el líder)
  {
    id: 'u-amilkar', name: 'Amilkar Bolaño', email: 'amilkar.bolano@timia.ai',
    initials: 'AB', role: 'tech_ref', avatarColor: '#dc2626',
    projectIds: ['FICO'],
    areaLabel: 'Referente Técnico · FICO',
  },
  {
    id: 'u-daniel', name: 'Daniel Gómez', email: 'daniel.gomez@timia.ai',
    initials: 'DG', role: 'tech_ref', avatarColor: '#0891b2',
    projectIds: ['SDM2', 'MURIC'],
    areaLabel: 'Referente Técnico · SDM2 · MURIC',
  },
  // N5 · Desarrolladores
  {
    id: 'u-sergio', name: 'Sergio Rodriguez', email: 'sergio.rodriguez@timia.ai',
    initials: 'SR', role: 'developer', avatarColor: '#b45309',
    projectIds: ['FICO'],
    areaLabel: 'Desarrollador · FICO',
  },
  {
    id: 'u-fabrizio', name: 'Fabrizio Atiquipa', email: 'fabrizio.atiquipa@timia.ai',
    initials: 'FA', role: 'developer', avatarColor: '#059669',
    projectIds: ['FICO'],
    areaLabel: 'Desarrollador · FICO',
  },
  {
    id: 'u-eric', name: 'Eric Buitrago', email: 'eric.buitrago@timia.ai',
    initials: 'EB', role: 'developer', avatarColor: '#0891b2',
    projectIds: ['CRONOS'],
    areaLabel: 'Desarrollador · CRONOS',
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
      if (stored) setUser(JSON.parse(stored));
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
