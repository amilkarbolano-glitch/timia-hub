// ─── Admin Store — datos parametrizables con persistencia localStorage ────────

import { PROJECTS as BASE_PROJECTS, normalizeRole, refreshProjects } from '../contexts/AuthContext';
import { persistSet, persistGet, probeApi, apiMe, loadStateFromApi } from './persist';
export { loadStateFromApi } from './persist';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Priority = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type UserRole  = 'account_manager' | 'pm' | 'tech_lead' | 'developer';

// ─── Imputaciones Jira ────────────────────────────────────────────────────────

export type JiraStatus =
  | 'New' | 'Analysing' | 'In Progress' | 'Ready'
  | 'Ready to Verify' | 'Ready to Deploy' | 'Deployed'
  | 'Blocked' | 'Discarded' | 'Test' | 'Accepted';

/** Paso por una fase/estado Jira de una feature (línea de tiempo) */
export interface ImputacionHistory { status: JiraStatus; date: string; by: string; note?: string }

export interface ImputacionEntry {
  id: string;
  projectId: string;
  jiraId: string;       // e.g. DECRONOS-1450
  summary: string;
  type: string;         // Enabler Delivery | Deployment | Bug | Story | Task
  status: JiraStatus;
  assigneeIds: string[]; // user IDs from MOCK_ACCOUNTS, or ['todos']
  month: string;
  weeks: string;
  q: string;            // Q1-2026 | Q2-2026 | Q2-II-2026 | …
  phase: string;
  hoursEst: number;
  hoursImputed: number;
  context: string;
  createdBy: string;
  createdAt: string;    // YYYY-MM-DD
  history?: ImputacionHistory[];   // cambios de estado con fecha (New → Analysing → …)
}

export interface AdminProject {
  id: string; name: string; area: string; color: string;
  priority: Priority; client: string; startDate: string; active: boolean;
  sda?: string;  // Código SDA — solo clientes BBVA Colombia / BBVA Argentina
}

export interface AdminUser {
  id: string; name: string; email: string;
  role: UserRole; projectIds: string[];
  initials: string; avatarColor: string; active: boolean;
  areaLabel?: string;
  /** Cuenta habilitada para el login de prueba (modo demo). Si ninguna lo tiene, se muestran todas las activas */
  demo?: boolean;
}

export interface AnsConfig { Baja: number; Media: number; Alta: number; Crítica: number; }
export interface BbvaAnsConfig {
  Pendiente: number; Enviado: number;
  'En revisión': number; Observaciones: number;
}

export interface Holiday { date: string; name: string; type: 'nacional' | 'regional'; }

/** Referencia a una tarea (actividad) o subtarea (etapa) del plan de trabajo */
export interface PlanImpact {
  planKey: string;        // projectId o projectId::cronoId
  entregableId: string;
  actIdx: number;
  etapaId?: string;       // subtarea (opcional)
}

export interface BitacoraEntry {
  id: string; projectId: string; fecha: string;
  quien: string; tipo: 'Campo' | 'Regla' | 'Modelo' | 'ETL' | 'Otro';
  descripcion: string; motivo: string;
  tablasAfectadas: string; jira: string;
  responsableId?: string;   // usuario Timia responsable del cambio (uno solo)
  responsable?: string;     // nombre (denormalizado)
  solicitadoPor?: string;   // quién lo pidió (BBVA / negocio / etc.)
  horasEstimadas?: number;  // horas estimadas al momento de registrar el cambio
  impacts?: PlanImpact[];   // tareas/subtareas del plan impactadas
  /** 'extiende' (default): corre el fin de las tareas impactadas · 'absorbe': no mueve fechas */
  modo?: 'extiende' | 'absorbe';
}

/** Horas por día hábil para convertir cambios en extensión de plan */
export const HOURS_PER_DAY = 8;
/** Días hábiles que un conjunto de cambios agrega a una tarea (solo modo 'extiende'). */
export function changeExtensionDays(changes: BitacoraEntry[]): number {
  const h = changes.filter(c => c.modo !== 'absorbe').reduce((s, c) => s + (c.horasEstimadas ?? 0), 0);
  return h > 0 ? Math.ceil(h / HOURS_PER_DAY - 1e-9) : 0;
}

export type CircuitoColumna = 'Pendiente' | 'Enviado' | 'En revisión' | 'Observaciones' | 'Aprobado';

export interface CircuitoCard {
  id: string; projectId: string; titulo: string;
  columna: CircuitoColumna;
  fechaEnvio?: string; responsable: string; prioridad: Priority;
  observaciones?: string;
  historial: { fecha: string; columna: string; nota: string }[];
}

// ─── Activity Report (TR) — features SDA y horas imputadas ───────────────────

/** Fases del Activity Report SDA (equivalencia con estados Jira) */
export const SDA_PHASES = [
  'Ideación',
  'Viabilidad y modelo de solución',
  'Análisis y diseño',
  'Desarrollo / Gestión datos',
  'Pruebas',
  'Despliegue',
  'Operación',
  'Gestión de proyecto',
  'Ceremonias Agile',
] as const;
export type SdaPhase = typeof SDA_PHASES[number];

/** Feature Jira (DECRONOS-xxxx) con horas planificadas por fase — se define al inicio */
export interface TrFeature {
  id: string;                 // DECRONOS-2169
  projectId: string;
  title: string;              // CRONOS-Q3 2026 DATCAL01 Disponibilizar tablas intermedias FICO
  q: string;                  // Q3-2026
  hoursByPhase: Partial<Record<SdaPhase, number>>;
  defaultPhase?: SdaPhase;    // fase sugerida al cargar TR
  assigneeIds: string[];
  active: boolean;
  createdAt: string;
}

/** Horas imputadas por persona/día/feature/fase (cargadas desde capturas del TR o a mano) */
export interface TrEntry {
  id: string;
  userId: string;
  userName: string;
  date: string;               // yyyy-mm-dd
  featureId: string;          // DECRONOS-xxxx
  phase: SdaPhase;
  hours: number;
  actividad?: string;         // línea "Tecnología 'DATIO (Dataproc)'" del TR
  source: 'ocr' | 'manual';
  createdAt: string;
}
export const TR_HOURS_PER_DAY = 8;

// ─── Kanban — tareas del tablero ──────────────────────────────────────────────

export type KanbanStatus = 'backlog' | 'in-progress' | 'review' | 'done';

export interface KanbanComment {
  id: string; userId: string; userName: string;
  userInitials: string; userColor: string;
  text: string; date: string;
}

export interface KanbanLink {
  id: string; title: string; url: string;
}

export interface KanbanTask {
  id: string; title: string; description: string;
  priority: Priority; startDate: string; endDate: string;
  status: KanbanStatus;
  assigneeIds: string[];  // AdminUser IDs
  jiraId?: string;
  projectId?: string;
  cronoId?: string;       // cronograma dentro del proyecto (undefined = principal)
  entregableId?: string;
  actIdx?: number;
  fromPlan?: boolean;
  isLocked?: boolean;
  links: KanbanLink[];
  comments: KanbanComment[];
}

const DEFAULT_KANBAN_TASKS: KanbanTask[] = [];

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

/** Alerta o bloqueante con ventana de tiempo e impacto sobre el plan */
export interface PlanIssue {
  id: string;
  planKey: string;                 // projectId o projectId::cronoId
  type: 'alerta' | 'bloqueante';
  title: string;
  detail?: string;
  startDate: string;               // ISO yyyy-mm-dd — cuándo inicia
  endDate?: string;                // ISO yyyy-mm-dd — cuándo se reporta el fin (undefined = abierta)
  /** Tareas/subtareas impactadas (una o varias, incluso de otro cronograma del proyecto) */
  impacts?: PlanImpact[];
  /** @deprecated — formato antiguo de impacto único; usar impacts */
  entregableId?: string;
  actIdx?: number;
  etapaId?: string;
  createdBy: string;
  createdAt: string;               // ISO timestamp
  closedBy?: string;
  closedAt?: string;
}

/** Normaliza los impactos de un issue (soporta el formato antiguo de impacto único) */
export function issueImpacts(i: PlanIssue): PlanImpact[] {
  if (i.impacts && i.impacts.length) return i.impacts;
  if (i.entregableId && i.actIdx !== undefined) return [{ planKey: i.planKey, entregableId: i.entregableId, actIdx: i.actIdx, etapaId: i.etapaId }];
  return [];
}

/** Solicitud de acceso: correo del dominio autenticado con Google pero no registrado en el panel */
export interface AccessRequest {
  id: string; email: string; name: string; provider: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string; lastAttemptAt?: string; attempts?: number;
  resolvedAt?: string; resolvedBy?: string;
}

/** Asignados a una actividad específica */
export type ActivityAssignees = Record<string, string[]>;
// key: `${projectId}__${entregableId}__${actIdx}`, value: array de user IDs

/** Configuración completa del plan de trabajo para un proyecto (generado desde Estimaciones) */
export interface PlanActivityConfig {
  label: string;
  startWeek: number;
  endWeek: number;
  /**
   * Semanas marcadas (1-indexed), como las casillas del Excel del PM. Permite tramos
   * discontinuos (ej. [1,2,3,4,18,19]). Si no está, se deriva del rango startWeek→endWeek.
   */
  weeks?: number[];
  bbva?: boolean;
  etapas?: PlanEtapa[];
}

export interface PlanEntregableConfig {
  id: string;
  label: string;
  activities: PlanActivityConfig[];
}

/**
 * Plantilla de cronograma creada por el usuario desde Estimaciones.
 * `tipo: 'proyecto'` guarda todas las fases; `tipo: 'entregable'`, una sola.
 */
export interface PlantillaPropia {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: 'proyecto' | 'entregable';
  entregables: PlanEntregableConfig[];
  totalWeeks: number;
  creadaPor?: string;
  creadaEn: string;   // ISO
}

export interface PlanConfig {
  projectId: string;
  /** Cronograma dentro del proyecto. undefined/'' = cronograma principal. */
  cronoId?: string;
  cronoName?: string;
  totalWeeks: number;
  weekLabels?: string[];
  startDate?: string;   // ISO date — anchor for week label computation
  entregables: PlanEntregableConfig[];
  /**
   * Cómo se pondera el avance de este cronograma:
   *  - 'actividad' (por defecto): cada actividad pesa igual.
   *  - 'actividad-semana': cada semana marcada pesa igual, como el Excel del PM
   *    (factor estático por fase = 100 / casillas de la fase).
   * Se elige por cronograma para no cambiarle los números a los planes ya existentes.
   */
  pesoModo?: 'actividad' | 'actividad-semana';
  generatedAt: string;  // ISO
}

// ─── Cronogramas — helpers de planKey ────────────────────────────────────────
// planKey identifica un plan: `${projectId}` (principal) o `${projectId}::${cronoId}`.
// Todas las keys de %, etapas, asignados, jiras, notas usan planKey en lugar de projectId,
// lo que mantiene 100% compatible la data existente (principal ⇒ planKey === projectId).
export const CRONO_SEP = '::';
export const CRONO_MAIN_NAME = 'Principal';
export function makePlanKey(projectId: string, cronoId?: string): string {
  return cronoId ? `${projectId}${CRONO_SEP}${cronoId}` : projectId;
}
export function splitPlanKey(planKey: string): { projectId: string; cronoId?: string } {
  const i = planKey.indexOf(CRONO_SEP);
  return i < 0 ? { projectId: planKey } : { projectId: planKey.slice(0, i), cronoId: planKey.slice(i + CRONO_SEP.length) };
}
export function planKeyOf(cfg: Pick<PlanConfig, 'projectId' | 'cronoId'>): string {
  return makePlanKey(cfg.projectId, cfg.cronoId);
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

const DEFAULT_USERS: AdminUser[] = [];

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

const DEFAULT_CIRCUITOS: CircuitoCard[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem('timia_' + key);
    return v ? (JSON.parse(v) as T) : def;
  } catch { return def; }
}

function save<T>(key: string, val: T): void {
  persistSet('timia_' + key, val);   // localStorage + API (si hay)
}

// ─── Imputaciones FICO por defecto (seed data del proyecto real) ─────────────

const DEFAULT_IMPUTACIONES: ImputacionEntry[] = [];

// ─── Seed desde GitHub (public/db.json) ──────────────────────────────────────
// Se llama una vez al arrancar la app (en main.tsx).
// Sobrescribe los datos de referencia en localStorage con los del archivo.
// Las claves de sesión (auth, vista actual) nunca se tocan.

const SEED_SKIP_KEYS = new Set(['timia_hub_user', 'timia_current_view']);

export async function seedFromRemote(): Promise<void> {
  // 1) API (FastAPI + Mongo): fuente de verdad compartida por todo el equipo.
  //    Si hay API pero no hay sesión, el estado se carga después del login (AuthContext).
  const cfg = await probeApi();
  if (cfg) {
    const me = await apiMe();
    if (me) await loadStateFromApi();
    refreshProjects();
    // En modo API la lista de cuentas para el login demo viene de la API, no del navegador
    return;
  }
  // 2) Sin API: public/db.json como semilla (modo local / GitHub Pages)
  try {
    const base = import.meta.env.BASE_URL ?? '/';
    const url  = base.endsWith('/') ? `${base}db.json` : `${base}/db.json`;
    const res  = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const data: Record<string, unknown> = await res.json();
    Object.entries(data).forEach(([key, val]) => {
      if (key.startsWith('_')) return;                // _version, _note → ignorar
      if (SEED_SKIP_KEYS.has(key)) return;            // auth y nav → no tocar
      if (key.startsWith('timia_')) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
      }
    });
  } catch {
    // Si el fetch falla (offline, etc.), el app arranca con los defaults del código
  }
  refreshProjects();
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const adminStore = {
  getProjects:   (): AdminProject[]  => load('admin_projects', DEFAULT_PROJECTS),
  saveProjects:  (p: AdminProject[]) => { save('admin_projects', p); refreshProjects(); },

  getUsers: (): AdminUser[] => load<AdminUser[]>('admin_users', DEFAULT_USERS).map(u => ({ ...u, role: normalizeRole(u.role as string) })),
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

  // Tickets Jira por actividad: key = `${projectId}__${entregableId}__${actIdx}`
  // Solicitudes de acceso
  getAccessRequests:  (): AccessRequest[]  => load('access_requests', []),
  saveAccessRequests: (r: AccessRequest[]) => save('access_requests', r),

  // Activity Report (TR)
  getTrFeatures:  (): TrFeature[]     => load('tr_features', []),
  saveTrFeatures: (f: TrFeature[])    => save('tr_features', f),
  getTrEntries:   (): TrEntry[]       => load('tr_entries', []),
  saveTrEntries:  (e: TrEntry[])      => save('tr_entries', e),

  // Alertas / bloqueantes con fechas e impacto
  getPlanIssues:  (): PlanIssue[]     => load('plan_issues', []),
  savePlanIssues: (i: PlanIssue[])    => save('plan_issues', i),

  getActivityJiras:  (): Record<string, string>      => load('activity_jiras', {}),
  saveActivityJiras: (j: Record<string, string>)     => save('activity_jiras', j),

  // Configuración de planes generados desde Estimaciones (keyed by planKey)
  getPlanConfigs:  (): Record<string, PlanConfig>   => load('plan_configs', {}),

  // ── Plantillas propias de cronograma (proyecto y entregable) ──────────────
  // Se guardan aparte del catálogo de fábrica, que vive en lib/plantillas.ts.
  getPlantillasPropias: (): PlantillaPropia[] => load('plantillas_cronograma', [] as PlantillaPropia[]),
  savePlantillasPropias: (p: PlantillaPropia[]) => save('plantillas_cronograma', p),

  savePlanConfigs: (c: Record<string, PlanConfig>)  => save('plan_configs', c),
  getPlanConfig:   (planKey: string): PlanConfig | null => {
    const all = load<Record<string, PlanConfig>>('plan_configs', {});
    return all[planKey] ?? null;
  },
  savePlanConfig: (planKey: string, config: PlanConfig) => {
    const all = load<Record<string, PlanConfig>>('plan_configs', {});
    all[planKey] = config;
    save('plan_configs', all);
  },
  /** Cronogramas configurados para un proyecto (principal primero). */
  getProjectCronogramas: (projectId: string): { planKey: string; cronoId?: string; name: string; cfg: PlanConfig }[] => {
    const all = load<Record<string, PlanConfig>>('plan_configs', {});
    return Object.entries(all)
      .filter(([, c]) => c.projectId === projectId)
      .map(([planKey, cfg]) => ({ planKey, cronoId: cfg.cronoId, name: cfg.cronoId ? (cfg.cronoName ?? cfg.cronoId) : CRONO_MAIN_NAME, cfg }))
      .sort((a, b) => (a.cronoId ? 1 : 0) - (b.cronoId ? 1 : 0));
  },

  // Kanban tasks — merges new default tasks on every load (migration-safe)
  getKanbanTasks: (): KanbanTask[] => load('kanban_tasks', DEFAULT_KANBAN_TASKS),
  saveKanbanTasks: (t: KanbanTask[]) => save('kanban_tasks', t),

  // Imputaciones Jira
  getImputaciones:  (): ImputacionEntry[]       => load('imputaciones', DEFAULT_IMPUTACIONES),
  saveImputaciones: (i: ImputacionEntry[])      => save('imputaciones', i),

  // Activity done dates: key = `${projectId}-${entregableId}-${actIdx}`
  getActivityDoneDates: (): Record<string, string> => persistGet('timia_activity_done_dates', {}),
  saveActivityDoneDates: (d: Record<string, string>) => persistSet('timia_activity_done_dates', d),

  // Sync a specific plan-activity assignee to its kanban card
  // planKey puede ser `${projectId}` o `${projectId}::${cronoId}`
  syncKanbanAssignees: (planKey: string, entregableId: string, actIdx: number, assigneeIds: string[]) => {
    const { projectId, cronoId } = splitPlanKey(planKey);
    const tasks = load<KanbanTask[]>('kanban_tasks', DEFAULT_KANBAN_TASKS);
    const idx = tasks.findIndex(t => t.projectId === projectId && (t.cronoId ?? undefined) === cronoId && t.entregableId === entregableId && t.actIdx === actIdx);
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], assigneeIds };
      save('kanban_tasks', tasks);
    }
  },
};
