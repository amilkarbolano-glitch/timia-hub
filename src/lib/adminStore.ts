// ─── Admin Store — datos parametrizables con persistencia localStorage ────────

import { PROJECTS as BASE_PROJECTS } from '../contexts/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Priority = 'Baja' | 'Media' | 'Alta' | 'Crítica';
export type UserRole  = 'pm' | 'tech_lead' | 'project_lead' | 'tech_ref' | 'developer';

// ─── Imputaciones Jira ────────────────────────────────────────────────────────

export type JiraStatus =
  | 'New' | 'Analysing' | 'In Progress' | 'Ready'
  | 'Ready to Verify' | 'Ready to Deploy' | 'Deployed'
  | 'Blocked' | 'Discarded' | 'Test' | 'Accepted';

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
  entregableId?: string;
  actIdx?: number;
  fromPlan?: boolean;
  isLocked?: boolean;
  links: KanbanLink[];
  comments: KanbanComment[];
}

const DEFAULT_KANBAN_TASKS: KanbanTask[] = [
  {
    id: 'kt-1', title: 'Análisis y resolución de dudas',
    description: 'Recopilación y resolución de dudas técnicas con BBVA para inicio del proyecto FICO.',
    priority: 'Alta', startDate: '2026-01-26', endDate: '2026-02-08', status: 'done',
    assigneeIds: ['u-juliana'], projectId: 'FICO', entregableId: 'doc', actIdx: 0, fromPlan: true,
    links: [], comments: [],
  },
  {
    id: 'kt-2', title: 'Elaboración diccionario técnico (370 campos)',
    description: 'Levantamiento, envío a Gobierno de Datos BBVA y validación del diccionario técnico.',
    priority: 'Alta', startDate: '2026-01-26', endDate: '2026-02-08', status: 'in-progress',
    assigneeIds: ['u-juliana'], projectId: 'FICO', entregableId: 'doc', actIdx: 1, fromPlan: true,
    links: [], comments: [],
  },
  {
    id: 'kt-3', title: 'Documentación técnica ETL y mapeo de campos',
    description: 'Documentar flujos ETL y mapeo campo a campo entre fuente (Core Bancario) y destino (VBox FICO).',
    priority: 'Media', startDate: '2026-01-26', endDate: '2026-03-01', status: 'in-progress',
    assigneeIds: ['u-juliana', 'u-david'], projectId: 'FICO', entregableId: 'doc', actIdx: 4, fromPlan: true,
    links: [], comments: [],
  },
  {
    id: 'kt-4', title: 'Construcción procesamiento Spark · Scala',
    description: 'Desarrollo del componente ADA con Spark-Scala: clases principales, config, test unitarios y validación de salida.',
    priority: 'Crítica', startDate: '2026-02-02', endDate: '2026-03-22', status: 'in-progress',
    assigneeIds: ['u-juliana'], projectId: 'FICO', entregableId: 'ada', actIdx: 1, fromPlan: true,
    links: [], comments: [],
  },
  {
    id: 'kt-5', title: 'Construcción reglas calidad MVP (Hammurabi)',
    description: 'Implementar reglas de calidad de datos usando el framework Hammurabi de BBVA.',
    priority: 'Alta', startDate: '2026-02-23', endDate: '2026-03-22', status: 'backlog',
    assigneeIds: ['u-david'], projectId: 'FICO', entregableId: 'ada', actIdx: 3, fromPlan: true,
    links: [], comments: [],
  },
  {
    id: 'kt-6', title: 'Circuito validación Gobierno Técnico · BBVA',
    description: 'Presentación al comité técnico BBVA, gestión de observaciones y obtención de aprobación definitiva.',
    priority: 'Alta', startDate: '2026-02-09', endDate: '2026-03-08', status: 'review',
    assigneeIds: ['u-david', 'u-juliana'], projectId: 'FICO', entregableId: 'doc', actIdx: 3,
    fromPlan: true, jiraId: 'FICO-142',
    links: [], comments: [],
  },
  {
    id: 'kt-7', title: 'Despliegue y pruebas entornos Work',
    description: 'Creación y ejecución del job ADA en entorno Work, verificación de escritura en VBox y prueba de aceptación.',
    priority: 'Alta', startDate: '2026-03-22', endDate: '2026-03-29', status: 'backlog',
    assigneeIds: ['u-juliana'], projectId: 'FICO', entregableId: 'ada', actIdx: 6, fromPlan: true,
    links: [], comments: [],
  },
  // ─── NGA ──────────────────────────────────────────────────────────────────────
  {
    id: 'kt-nga-1', title: 'Análisis fuentes — Core Bancario NGA',
    description: 'Levantamiento de fuentes de datos del Core Bancario para el proyecto NGA: inventario de tablas, volúmenes y frecuencias de actualización.',
    priority: 'Alta', startDate: '2026-02-01', endDate: '2026-02-28', status: 'in-progress',
    assigneeIds: ['u-juan'], projectId: 'NGA',
    links: [], comments: [],
  },
  {
    id: 'kt-nga-2', title: 'Diccionario de datos NGA',
    description: 'Elaboración del diccionario técnico de campos NGA y validación con el área de Gobierno de Datos.',
    priority: 'Media', startDate: '2026-02-15', endDate: '2026-03-15', status: 'backlog',
    assigneeIds: ['u-juan', 'u-juliana'], projectId: 'NGA',
    links: [], comments: [],
  },
  {
    id: 'kt-nga-3', title: 'Revisión arquitectura ETL · NGA',
    description: 'Revisión del flujo ETL propuesto con el equipo de arquitectura BBVA. Definición de capas de ingestión y transformación.',
    priority: 'Alta', startDate: '2026-03-01', endDate: '2026-03-22', status: 'review',
    assigneeIds: ['u-david', 'u-juan'], projectId: 'NGA',
    links: [], comments: [],
  },
  // ─── CRONOS ───────────────────────────────────────────────────────────────────
  {
    id: 'kt-cro-1', title: 'Definición modelo estrella CRONOS',
    description: 'Diseño del modelo estrella para CRONOS: tablas de hechos, dimensiones y granularidad.',
    priority: 'Crítica', startDate: '2026-02-10', endDate: '2026-03-10', status: 'in-progress',
    assigneeIds: ['u-juan'], projectId: 'CRONOS',
    links: [], comments: [],
  },
  {
    id: 'kt-cro-2', title: 'Construcción pipeline Spark CRONOS',
    description: 'Implementación del pipeline de procesamiento con Spark, incluyendo transformaciones y validaciones de calidad.',
    priority: 'Alta', startDate: '2026-03-10', endDate: '2026-04-10', status: 'backlog',
    assigneeIds: ['u-david'], projectId: 'CRONOS',
    links: [], comments: [],
  },
];

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
  startDate?: string;   // ISO date — anchor for week label computation
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
  // ── Project Manager ──────────────────────────────────────────────────────────
  {
    id: 'u-rodolfo', name: 'Rodolfo Pereda', email: 'rodolfo.pereda@timia.ai',
    role: 'pm', projectIds: BASE_PROJECTS.map(p => p.id),
    initials: 'RP', avatarColor: '#dc2626', active: true,
    areaLabel: 'Project Manager · BBVA CO & Credicorp Capital',
  },
  // ── Líderes Técnicos ─────────────────────────────────────────────────────────
  {
    id: 'u-juan', name: 'Juan Pablo Arévalo', email: 'juanpablo.arevalo@timia.ai',
    role: 'tech_lead', projectIds: ['FICO','NGA','CRONOS','PINTO','QA'],
    initials: 'JA', avatarColor: '#7c3aed', active: true,
    areaLabel: 'Líder Técnico · FICO · NGA · CRONOS · PINTO · QA',
  },
  {
    id: 'u-david', name: 'David Huamán', email: 'david.huaman@timia.ai',
    role: 'tech_lead', projectIds: ['OPTIM','FABRICA','SDM1','SDM2'],
    initials: 'DH', avatarColor: '#0369a1', active: true,
    areaLabel: 'Líder Técnico · Credicorp Capital · SDM',
  },
  {
    id: 'u-diego', name: 'Diego Sánchez', email: 'diego.sanchez@timia.ai',
    role: 'tech_lead', projectIds: ['SDM1','SDM2','MURIC','BRICKELL','BCBS239'],
    initials: 'DS', avatarColor: '#2563eb', active: true,
    areaLabel: 'Líder Técnico · SDM · MURIC · BRICKELL · BCBS239',
  },
  // ── Referente Técnico ────────────────────────────────────────────────────────
  {
    id: 'u-juliana', name: 'Juliana Garzón', email: 'juliana.garzon@timia.ai',
    role: 'tech_ref', projectIds: ['FICO','NGA'],
    initials: 'JG', avatarColor: '#0f766e', active: true,
    areaLabel: 'Referente Técnico · FICO · NGA',
  },
  // ── Desarrolladores ───────────────────────────────────────────────────────────
  {
    id: 'u-sergio', name: 'Sergio David Rodriguez', email: 'sergio.rodriguez@timia.ai',
    role: 'developer', projectIds: ['FICO','NGA','CRONOS'],
    initials: 'SR', avatarColor: '#b45309', active: true,
    areaLabel: 'Desarrollador · FICO · NGA · CRONOS',
  },
  {
    id: 'u-fabrizio', name: 'Fabrizio Atiquipa', email: 'fabrizio.atiquipa@timia.ai',
    role: 'developer', projectIds: ['FICO','NGA','CRONOS'],
    initials: 'FA', avatarColor: '#059669', active: true,
    areaLabel: 'Desarrollador · FICO · NGA · CRONOS',
  },
  {
    id: 'u-ana', name: 'Ana Restrepo', email: 'ana.restrepo@timia.ai',
    role: 'developer', projectIds: ['NGA','CRONOS','PINTO'],
    initials: 'AR', avatarColor: '#be185d', active: true,
    areaLabel: 'Desarrolladora · NGA · CRONOS · PINTO',
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

// ─── Imputaciones FICO por defecto (seed data del proyecto real) ─────────────

const DEFAULT_IMPUTACIONES: ImputacionEntry[] = [
  { id:'imp-1450',  projectId:'FICO', jiraId:'DECRONOS-1450',  summary:'Creación y productivización Tablón FICO',                            type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Enero',   weeks:'2-13',   q:'Q1-2026',    phase:'Análisis y Diseño', hoursEst:96,  hoursImputed:96,  context:'CRONOS-4Q25-DATCAL01',                                    createdBy:'Juan Pablo Arévalo', createdAt:'2026-01-02' },
  { id:'imp-1600',  projectId:'FICO', jiraId:'DECRONOS-1600',  summary:'Tablón FICO — validación de componentes',                            type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Enero',   weeks:'14-15',  q:'Q1-2026',    phase:'Análisis y Diseño', hoursEst:16,  hoursImputed:16,  context:'CRONOS-4Q25-DATCAL01',                                    createdBy:'Juan Pablo Arévalo', createdAt:'2026-01-14' },
  { id:'imp-1682',  projectId:'FICO', jiraId:'DECRONOS-1682',  summary:'Creación y productivización tablón de insumo',                       type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Enero',   weeks:'',       q:'Q1-2026',    phase:'Análisis y Diseño', hoursEst:40,  hoursImputed:40,  context:'CRONOS-Q126-DATCAL01',                                    createdBy:'Juan Pablo Arévalo', createdAt:'2026-01-05' },
  { id:'imp-1687',  projectId:'FICO', jiraId:'DECRONOS-1687',  summary:'Migración proceso Holding Campañas a Local',                         type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Enero',   weeks:'',       q:'Q1-2026',    phase:'Análisis y Diseño', hoursEst:40,  hoursImputed:40,  context:'CRONOS-1Q26-DATCAL01',                                    createdBy:'Juan Pablo Arévalo', createdAt:'2026-01-05' },
  { id:'imp-1726',  projectId:'FICO', jiraId:'DECRONOS-1726',  summary:'Codificación componentes proceso principal',                         type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Febrero', weeks:'16-26',  q:'Q1-2026',    phase:'Codificación',      hoursEst:88,  hoursImputed:88,  context:'Refs: DECRONOS-1450 · DECRONOS-1600',                     createdBy:'Juan Pablo Arévalo', createdAt:'2026-02-16' },
  { id:'imp-1727',  projectId:'FICO', jiraId:'DECRONOS-1727',  summary:'Codificación ajuste y validación de datos',                          type:'Enabler Delivery', status:'Deployed',    assigneeIds:['u-sergio'],                       month:'Febrero', weeks:'27',     q:'Q1-2026',    phase:'Codificación',      hoursEst:8,   hoursImputed:8,   context:'DECRONOS-1600 · 6h | DECRONOS-1450 · 2h',                createdBy:'Juan Pablo Arévalo', createdAt:'2026-02-27' },
  { id:'imp-1834',  projectId:'FICO', jiraId:'DECRONOS-1834',  summary:'Creación y productivización malla Certificación componentes T02',    type:'Enabler Delivery', status:'Deployed',    assigneeIds:['u-amilkar'],                      month:'Febrero', weeks:'27',     q:'Q2-2026',    phase:'Codificación',      hoursEst:8,   hoursImputed:8,   context:'DECRONOS-1682 · 6h | DECRONOS-1450 · 2h — CRONOS-Q226', createdBy:'Juan Pablo Arévalo', createdAt:'2026-02-27' },
  { id:'imp-1835',  projectId:'FICO', jiraId:'DECRONOS-1835',  summary:'Malla Certificación componentes T02 — Deployment',                  type:'Deployment',       status:'Deployed',    assigneeIds:['u-fabrizio'],                     month:'Febrero', weeks:'27',     q:'Q2-2026',    phase:'Despliegue',        hoursEst:8,   hoursImputed:8,   context:'DECRONOS-1687 · 6h | DECRONOS-1450 · 2h — CRONOS-Q226', createdBy:'Juan Pablo Arévalo', createdAt:'2026-02-27' },
  { id:'imp-1794',  projectId:'FICO', jiraId:'DECRONOS-1794',  summary:'Procesamiento FICO – ADA',                                           type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Marzo',   weeks:'',       q:'Q2-2026',    phase:'Codificación',      hoursEst:80,  hoursImputed:80,  context:'CRONOS-Q2 2026-DATCAL01',                                 createdBy:'Juan Pablo Arévalo', createdAt:'2026-03-01' },
  { id:'imp-1814',  projectId:'FICO', jiraId:'DECRONOS-1814',  summary:'Procesamiento Input FICO – ADA',                                     type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Marzo',   weeks:'',       q:'Q2-2026',    phase:'Codificación',      hoursEst:80,  hoursImputed:80,  context:'CRONOS-Q2 2026-DATCAL01',                                 createdBy:'Juan Pablo Arévalo', createdAt:'2026-03-05' },
  { id:'imp-1804a', projectId:'FICO', jiraId:'DECRONOS-1804',  summary:'Procesamiento FICO Output Proactivo – ADA',                         type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Abril',   weeks:'1',      q:'Q2-2026',    phase:'Pruebas',           hoursEst:8,   hoursImputed:8,   context:'Refs: DECRONOS-1726 · DECRONOS-1727 — CRONOS-Q2 2026',   createdBy:'Juan Pablo Arévalo', createdAt:'2026-04-01' },
  { id:'imp-1846a', projectId:'FICO', jiraId:'DECRONOS-1846',  summary:'Historificación FICO – ADA',                                         type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Abril',   weeks:'6',      q:'Q2-2026',    phase:'Análisis y Diseño', hoursEst:8,   hoursImputed:8,   context:'Ref: DECRONOS-1794 — CRONOS-Q2 2026-DATCAL01',            createdBy:'Juan Pablo Arévalo', createdAt:'2026-04-06' },
  { id:'imp-1846b', projectId:'FICO', jiraId:'DECRONOS-1846',  summary:'Historificación FICO – ADA · Codificación',                         type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Abril',   weeks:'7-23',   q:'Q2-II-2026', phase:'Codificación',      hoursEst:136, hoursImputed:136, context:'Refs: DECRONOS-1794 · DECRONOS-1814',                     createdBy:'Juan Pablo Arévalo', createdAt:'2026-04-07' },
  { id:'imp-1804b', projectId:'FICO', jiraId:'DECRONOS-1804',  summary:'Procesamiento FICO Output Proactivo – ADA · Codificación',          type:'Enabler Delivery', status:'Deployed',    assigneeIds:['todos'],                          month:'Abril',   weeks:'23-30',  q:'Q2-II-2026', phase:'Codificación',      hoursEst:64,  hoursImputed:64,  context:'Refs: DECRONOS-1794 · DECRONOS-1814 · DECRONOS-1804',    createdBy:'Juan Pablo Arévalo', createdAt:'2026-04-23' },
  { id:'imp-1996',  projectId:'FICO', jiraId:'DECRONOS-1996',  summary:'Test — Validación componentes ADA',                                  type:'Enabler Delivery', status:'Test',        assigneeIds:['u-sergio'],                       month:'Mayo',    weeks:'',       q:'Q2-II-2026', phase:'Pruebas',           hoursEst:40,  hoursImputed:24,  context:'',                                                        createdBy:'Juan Pablo Arévalo', createdAt:'2026-05-01' },
  { id:'imp-1997',  projectId:'FICO', jiraId:'DECRONOS-1997',  summary:'Test — Validación componentes ADA',                                  type:'Enabler Delivery', status:'Test',        assigneeIds:['u-amilkar'],                      month:'Mayo',    weeks:'1-10',   q:'Q2-II-2026', phase:'Codificación',      hoursEst:80,  hoursImputed:40,  context:'Refs: DECRONOS-1794 · 1814 · 1804 · 1846',               createdBy:'Juan Pablo Arévalo', createdAt:'2026-05-01' },
  { id:'imp-1999',  projectId:'FICO', jiraId:'DECRONOS-1999',  summary:'Test — Validación componentes ADA',                                  type:'Enabler Delivery', status:'Test',        assigneeIds:['u-fabrizio'],                     month:'Mayo',    weeks:'11-25',  q:'Q2-II-2026', phase:'Pruebas',           hoursEst:120, hoursImputed:60,  context:'Refs: DECRONOS-1794 · 1814 · 1804 · 1846',               createdBy:'Juan Pablo Arévalo', createdAt:'2026-05-11' },
  { id:'imp-2000',  projectId:'FICO', jiraId:'DECRONOS-2000',  summary:'Test — Integración y validación final del equipo',                   type:'Enabler Delivery', status:'Test',        assigneeIds:['u-sergio','u-fabrizio','u-amilkar'], month:'Mayo', weeks:'26-30',  q:'Q2-II-2026', phase:'Codificación',      hoursEst:40,  hoursImputed:0,   context:'Cada uno tiene asignado su sub-ticket. Refs: 1996 · 1997 · 1999 · 2000', createdBy:'Juan Pablo Arévalo', createdAt:'2026-05-26' },
  { id:'imp-1537',  projectId:'FICO', jiraId:'DECRONOS-1537',  summary:'Procesamiento FICO – integración completa y cierre',                 type:'Enabler Delivery', status:'In Progress', assigneeIds:['u-sergio','u-fabrizio','u-amilkar'], month:'Mayo', weeks:'',       q:'Q2-II-2026', phase:'Codificación',      hoursEst:120, hoursImputed:48,  context:'',                                                        createdBy:'Juan Pablo Arévalo', createdAt:'2026-05-01' },
];

// ─── Seed desde GitHub (public/db.json) ──────────────────────────────────────
// Se llama una vez al arrancar la app (en main.tsx).
// Sobrescribe los datos de referencia en localStorage con los del archivo.
// Las claves de sesión (auth, vista actual) nunca se tocan.

const SEED_SKIP_KEYS = new Set(['timia_hub_user', 'timia_current_view']);

export async function seedFromRemote(): Promise<void> {
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
}

// ─── API pública ──────────────────────────────────────────────────────────────

export const adminStore = {
  getProjects:   (): AdminProject[]  => load('admin_projects', DEFAULT_PROJECTS),
  saveProjects:  (p: AdminProject[]) => save('admin_projects', p),

  getUsers: (): AdminUser[] => {
    const stored = load<AdminUser[]>('admin_users', DEFAULT_USERS);
    // Migration: add any new default users that don't exist in stored data
    const missing = DEFAULT_USERS.filter(du => !stored.some(u => u.id === du.id));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      save('admin_users', merged);
      return merged;
    }
    return stored;
  },
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
  getActivityJiras:  (): Record<string, string>      => load('activity_jiras', {}),
  saveActivityJiras: (j: Record<string, string>)     => save('activity_jiras', j),

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

  // Kanban tasks — merges new default tasks on every load (migration-safe)
  getKanbanTasks: (): KanbanTask[] => {
    const stored = load<KanbanTask[]>('kanban_tasks', DEFAULT_KANBAN_TASKS);
    const missing = DEFAULT_KANBAN_TASKS.filter(dt => !stored.some(t => t.id === dt.id));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      save('kanban_tasks', merged);
      return merged;
    }
    return stored;
  },
  saveKanbanTasks: (t: KanbanTask[]) => save('kanban_tasks', t),

  // Imputaciones Jira
  getImputaciones:  (): ImputacionEntry[]       => load('imputaciones', DEFAULT_IMPUTACIONES),
  saveImputaciones: (i: ImputacionEntry[])      => save('imputaciones', i),

  // Activity done dates: key = `${projectId}-${entregableId}-${actIdx}`
  getActivityDoneDates: (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem('timia_activity_done_dates') ?? '{}'); } catch { return {}; }
  },
  saveActivityDoneDates: (d: Record<string, string>) => {
    try { localStorage.setItem('timia_activity_done_dates', JSON.stringify(d)); } catch {}
  },

  // Sync a specific plan-activity assignee to its kanban card
  syncKanbanAssignees: (projectId: string, entregableId: string, actIdx: number, assigneeIds: string[]) => {
    const tasks = load<KanbanTask[]>('kanban_tasks', DEFAULT_KANBAN_TASKS);
    const idx = tasks.findIndex(t => t.projectId === projectId && t.entregableId === entregableId && t.actIdx === actIdx);
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], assigneeIds };
      save('kanban_tasks', tasks);
    }
  },
};
