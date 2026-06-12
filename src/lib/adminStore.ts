// ─── Admin Store — datos parametrizables con persistencia localStorage ────────

import { PROJECTS as BASE_PROJECTS } from '../contexts/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Priority = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type UserRole  = 'pm' | 'tech_lead' | 'project_lead' | 'tech_ref' | 'developer';

export interface AdminProject {
  id: string; name: string; area: string; color: string;
  priority: Priority; client: string; startDate: string; active: boolean;
}

export interface AdminUser {
  id: string; name: string; email: string;
  role: UserRole; projectIds: string[];
  initials: string; avatarColor: string; active: boolean;
  areaLabel?: string;
}

export interface AnsConfig { Baja: number; Media: number; Alta: number; Crítica: number; }
export interface BbvaAnsConfig {
  Pendiente: number; Enviado: number;
  'En revisión': number; Observaciones: number;
}

export interface Holiday { date: string; name: string; type: 'nacional' | 'regional'; }

export interface BitacoraEntry {
  id: string; projectId: string; fecha: string;
  quien: string; tipo: 'Campo' | 'Regla' | 'Modelo' | 'ETL' | 'Otro';
  descripcion: string; motivo: string;
  tablasAfectadas: string; jira: string;
}

export type CircuitoColumna = 'Pendiente' | 'Enviado' | 'En revisión' | 'Observaciones' | 'Aprobado';

export interface CircuitoCard {
  id: string; projectId: string; titulo: string;
  columna: CircuitoColumna;
  fechaEnvio?: string; responsable: string; prioridad: Priority;
  observaciones?: string;
  historial: { fecha: string; columna: string; nota: string }[];
}

// ─── Plan de Trabajo — Etapas y trazabilidad ─────────────────────────────────

/** Una etapa dentro de una actividad del plan */
export interface PlanEtapa {
  id: string;
  label: string;
  peso: number;           // porcentaje de la actividad que representa (0-100)
  optional?: boolean;
  subs?: string[];        // sub-ítems descriptivos (no pesan individualmente)
}

/** Estado de cada etapa (keyed por `${projectId}__${entregableId}__${actIdx}__${etapaId}`) */
export type EtapaStates = Record<string, {
  done: boolean;
  doneBy: string;       // nombre del usuario que marcó
  doneAt: string;       // ISO timestamp
}>;

/** Entrada del historial de cambios en etapas */
export interface PlanHistorialEntry {
  id: string;
  projectId: string;
  entregableId: string;
  actIdx: number;
  etapaLabel: string;
  action: 'checked' | 'unchecked';
  userName: string;
  userInitials: string;
  userColor: string;
  timestamp: string;    // ISO
}

/** Asignados a una actividad específica */
export type ActivityAssignees = Record<string, string[]>;
// key: `${projectId}__${entregableId}__${actIdx}`, value: array de user IDs

/** Configuración completa del plan de trabajo para un proyecto (generado desde Estimaciones) */
export interface PlanActivityConfig {
  label: string;
  startWeek: number;
  endWeek: number;
  bbva?: boolean;
  etapas?: PlanEtapa[];
}

export interface PlanEntregableConfig {
  id: string;
  label: string;
  activities: PlanActivityConfig[];
}

export interface PlanConfig {
  projectId: string;
  totalWeeks: number;
  weekLabels?: string[];
  entregables: PlanEntregableConfig[];
  generatedAt: string;  // ISO
}

// ─── Datos por defecto ────────────────────────────────────────────────────────

const DEFAULT_PROJECTS: AdminProject[] = BASE_PROJECTS.map(p => ({
  ...p,
  priority: 'Media' as Priority,
  client: p.area.includes('David') ? 'Credicorp Capital' : 'BBVA Colombia',
  startDate: '2026-01-15',
  active: true,
}));

const DEFAULT_ANS: AnsConfig = { Baja: 2, Media: 5, Alta: 10, Crítica: 15 };
const DEFAULT_BBVA_ANS: BbvaAnsConfig = {
  Pendiente: 3, Enviado: 5, 'En revisión': 10, Observaciones: 5,
};

const DEFAULT_USERS: AdminUser[] = [
  {
    id: 'u-rodolfo', name: 'Rodolfo Pereda', email: 'rodolfo.pereda@timia.ai',
    role: 'pm', projectIds: BASE_PROJECTS.map(p => p.id),
    initials: 'RP', avatarColor: '#7c3aed', active: true,
    areaLabel: 'Project Manager · BBVA CO & CAP',
  },
  {
    id: 'u-david', name: 'David Huamán', email: 'david.huaman@timia.ai',
    role: 'tech_lead', projectIds: ['FICO','NGA','CRONOS','OPTIM','FABRICA'],
    initials: 'DH', avatarColor: '#0369a1', active: true,
    areaLabel: 'Líder Técnico · BBVA CO & Credicorp Capital',
  },
  {
    id: 'u-juliana', name: 'Juliana Garzón', email: 'juliana.garzon@timia.ai',
    role: 'tech_ref', projectIds: ['FICO','NGA'],
    initials: 'JG', avatarColor: '#0f766e', active: true,
    areaLabel: 'Referente Técnico · FICO · NGA',
  },
  {
    id: 'u-juan', name: 'Juan Arévalo', email: 'juan.arevalo@timia.ai',
    role: 'tech_lead', projectIds: ['NGA','CRONOS','FICO','PINTO','QA'],
    initials: 'JA', avatarColor: '#dc2626', active: true,
    areaLabel: 'Líder Técnico · NGA · CRONOS · FICO · PINTO · QA',
  },
  {
    id: 'u-diego', name: 'Diego Sánchez', email: 'diego.sanchez@timia.ai',
    role: 'tech_lead', projectIds: ['SDM1','SDM2','MURIC','BRICKELL','BCBS239'],
    initials: 'DS', avatarColor: '#2563eb', active: true,
    areaLabel: 'Líder Técnico · SDM · MURIC · BRICKELL · BCBS239',
  },
];

const DEFAULT_HOLIDAYS: Holiday[] = [
  { date: '2026-01-01', name: 'Año Nuevo',                  type: 'nacional' },
  { date: '2026-01-12', name: 'Reyes Magos',                type: 'nacional' },
  { date: '2026-03-23', name: 'San José',                   type: 'nacional' },
  { date: '2026-04-02', name: 'Jueves Santo',               type: 'nacional' },
  { date: '2026-04-03', name: 'Viernes Santo',              type: 'nacional' },
  { date: '2026-05-01', name: 'Día del Trabajo',            type: 'nacional' },
  { date: '2026-05-18', name: 'Ascensión del Señor',        type: 'nacional' },
  { date: '2026-06-08', name: 'Corpus Christi',             type: 'nacional' },
  { date: '2026-06-15', name: 'Sagrado Corazón',            type: 'nacional' },
  { date: '2026-06-29', name: 'San Pedro y San Pablo',      type: 'nacional' },
  { date: '2026-07-20', name: 'Independencia',              type: 'nacional' },
  { date: '2026-08-07', name: 'Batalla de Boyacá',          type: 'nacional' },
  { date: '2026-08-17', name: 'Asunción de la Virgen',      type: 'nacional' },
  { date: '2026-10-12', name: 'Día de la Raza',             type: 'nacional' },
  { date: '2026-11-02', name: 'Todos los Santos',           type: 'nacional' },
  { date: '2026-11-16', name: 'Independencia de Cartagena', type: 'nacional' },
  { date: '2026-12-08', name: 'Inmaculada Concepción',      type: 'nacional' },
  { date: '2026-12-25', name: 'Navidad',                    type: 'nacional' },
];

const DEFAULT_CIRCUITOS: CircuitoCard[] = [
  {
    id: 'c1', projectId: 'FICO', titulo: 'Validación Diccionario Técnico v2',
    columna: 'En revisión', fechaEnvio: '2026-06-01',
    responsable: 'Juliana Garzón', prioridad: 'Alta',
    observaciones: 'Enviado con correcciones de campos solicitadas',
    historial: [
      { fecha: '2026-05-26', columna: 'Enviado',      nota: 'Envío inicial al equipo BBVA' },
      { fecha: '2026-06-01', columna: 'En revisión',  nota: 'BBVA confirmó recepción' },
    ],
  },
  {
    id: 'c2', projectId: 'BCBS239', titulo: 'Despliegue Control-M producción',
    columna: 'Pendiente', responsable: 'Mauricio Pajoy', prioridad: 'Crítica',
    historial: [],
  },
  {
    id: 'c3', projectId: 'NGA', titulo: 'Aprobación ETL t_nga_output',
    columna: 'Aprobado', fechaEnvio: '2026-05-20',
    responsable: 'Juliana Garzón', prioridad: 'Media',
    historial: [
      { fecha: '2026-05-20', columna: 'Enviado',  nota: 'Envío v1' },
      { fecha: '2026-05-28', columna: 'Aprobado', nota: 'Aprobado sin observaciones' },
    ],
  },
  {
    id: 'c4', projectId: 'SDM1', titulo: 'Certificación calidad datos SDM',
    columna: 'Observaciones', fechaEnvio: '2026-05-28',
    responsable: 'Omar Bonilla', prioridad: 'Alta',
    observaciones: '3 campos requieren ajuste en nomenclatura',
    historial: [
      { fecha: '2026-05-28', columna: 'Enviado',      nota: 'Envío inicial' },
      { fecha: '2026-06-03', columna: 'Observaciones',nota: 'BBVA devolvió con 3 observaciones' },
    ],
  },
  {
    id: 'c5', projectId: 'CRONOS', titulo: 'Aprobación Hammurabi Rules v3',
    columna: 'Enviado', fechaEnvio: '2026-06-05',
    responsable: 'Eric Buitrago', prioridad: 'Alta',
    historial: [
      { fecha: '2026-06-05', columna: 'Enviado', nota: 'Envío v3 con correcciones' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem('timia_' + key);
    return v ? (JSON.parse(v) as T) : def;
  } catch { return def; }
}

function save<T>(key: string, val: T): void {
  try { localStorage.setItem('timia_' + key, JSON.stringify(val)); } catch {}
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const adminStore = {
  getProjects:   (): AdminProject[]  => load('admin_projects', DEFAULT_PROJECTS),
  saveProjects:  (p: AdminProject[]) => save('admin_projects', p),

  getUsers:      (): AdminUser[]     => load('admin_users', DEFAULT_USERS),
  saveUsers:     (u: AdminUser[])    => save('admin_users', u),

  getAns:        (): AnsConfig       => load('ans_config', DEFAULT_ANS),
  saveAns:       (c: AnsConfig)      => save('ans_config', c),

  getBbvaAns:    (): BbvaAnsConfig   => load('bbva_ans_config', DEFAULT_BBVA_ANS),
  saveBbvaAns:   (c: BbvaAnsConfig)  => save('bbva_ans_config', c),

  getHolidays:   (): Holiday[]       => load('holidays', DEFAULT_HOLIDAYS),
  saveHolidays:  (h: Holiday[])      => save('holidays', h),

  getBitacora:   (): BitacoraEntry[] => load('bitacora', []),
  saveBitacora:  (b: BitacoraEntry[]) => save('bitacora', b),

  getCircuitos:  (): CircuitoCard[]  => load('circuitos', DEFAULT_CIRCUITOS),
  saveCircuitos: (c: CircuitoCard[]) => save('circuitos', c),

  // Plan % overrides (keyed by projectId.entregableId.activityIndex)
  getPlanPcts:   (): Record<string, number> => load('plan_pcts', {}),
  savePlanPcts:  (p: Record<string, number>) => save('plan_pcts', p),

  // Etapa states: key = `${projectId}__${entregableId}__${actIdx}__${etapaId}`
  getEtapaStates:  (): EtapaStates          => load('etapa_states', {}),
  saveEtapaStates: (s: EtapaStates)         => save('etapa_states', s),

  // Historial de cambios en etapas
  getHistorial:  (): PlanHistorialEntry[]   => load('plan_historial', []),
  saveHistorial: (h: PlanHistorialEntry[])  => save('plan_historial', h),

  // Asignados por actividad: key = `${projectId}__${entregableId}__${actIdx}`
  getActivityAssignees:  (): ActivityAssignees       => load('activity_assignees', {}),
  saveActivityAssignees: (a: ActivityAssignees)      => save('activity_assignees', a),

  // Configuración de planes generados desde Estimaciones (keyed by projectId)
  getPlanConfigs:  (): Record<string, PlanConfig>   => load('plan_configs', {}),
  savePlanConfigs: (c: Record<string, PlanConfig>)  => save('plan_configs', c),
  getPlanConfig:   (projectId: string): PlanConfig | null => {
    const all = load<Record<string, PlanConfig>>('plan_configs', {});
    return all[projectId] ?? null;
  },
  savePlanConfig: (projectId: string, config: PlanConfig) => {
    const all = load<Record<string, PlanConfig>>('plan_configs', {});
    all[projectId] = config;
    save('plan_configs', all);
  },
};
