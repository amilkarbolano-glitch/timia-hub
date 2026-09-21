// ─── Plantillas de estimación ────────────────────────────────────────────────
//
// Los proyectos de gobierno de dato con BBVA repiten casi siempre las mismas fases
// y las mismas actividades. Este catálogo las trae pre-armadas para que estimar sea
// elegir una plantilla y ajustar, en vez de escribir 60 filas a mano.
//
// Las duraciones son la MEDIANA de lo que duró cada actividad en los cronogramas
// reales que ya tenemos cargados: SDATOOL-54364 (Migración BD a ADA) y SDATOOL-53017
// (FICO, con sus 5 sub-cronogramas) — 242 actividades en total. `veces` dice en
// cuántos de esos cronogramas apareció la actividad: 1 significa que se vio una sola
// vez y la duración es menos confiable.

import type { PlanConfig, PlanActivityConfig, PlanEntregableConfig } from './adminStore';

/** Fase del SDA con la que se imputa en el Activity Report. */
export type FaseSDA = 'Análisis y diseño' | 'Desarrollo / Gestión datos' | 'Pruebas' | 'Despliegue' | 'Operación';
/** Quién ejecuta: Timia, el banco, o Timia pero sin cerrar sin VoBo de negocio. */
export type Responsable = 'timia' | 'bbva' | 'mixto';

export interface ActividadPlantilla {
  label: string;
  /** Duración en semanas (mediana histórica). */
  semanas: number;
  resp: Responsable;
  faseSDA: FaseSDA;
  /** En cuántos cronogramas reales se observó esta actividad. */
  veces: number;
  /** Arranca la misma semana que la anterior en vez de esperar a que termine. */
  paralelo?: boolean;
  nota?: string;
}

export interface BloquePlantilla {
  id: string;
  label: string;
  /** Semana (1-indexed) en la que arranca el bloque dentro del plan. */
  inicio: number;
  actividades: ActividadPlantilla[];
}

// ─── Bloques reutilizables ───────────────────────────────────────────────────

const GOBIERNO: BloquePlantilla = {
  id: 'gob', label: 'I. Documentación y Gobierno', inicio: 1,
  actividades: [
    { label: 'Validación y análisis de la definición funcional entregada', semanas: 1, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 1 },
    { label: 'Análisis y resolución de dudas', semanas: 2, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 5, paralelo: true },
    { label: 'Elaboración de diccionarios técnicos', semanas: 2, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 3, nota: 'Escala con el número de objetos y de campos' },
    { label: 'Inicialización en Nebula', semanas: 1, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 2 },
    { label: 'Aprobación de la inicialización en Nebula', semanas: 1, resp: 'bbva', faseSDA: 'Análisis y diseño', veces: 1 },
    { label: 'Creación de documentación técnica del procesamiento (ETL + DT)', semanas: 2, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 3, paralelo: true },
    { label: 'Construcción del Modelo de Solución del Dato (MSD)', semanas: 1, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 2 },
    { label: 'Subida de diccionarios, revisión y validación por Gobierno Técnico', semanas: 2, resp: 'bbva', faseSDA: 'Análisis y diseño', veces: 5, nota: 'Suele volver con observaciones' },
    { label: 'Circuito de validación del MSD', semanas: 2, resp: 'bbva', faseSDA: 'Análisis y diseño', veces: 4, paralelo: true },
    { label: 'Solicitud y circuito de ACLs', semanas: 1, resp: 'bbva', faseSDA: 'Despliegue', veces: 3 },
    { label: 'Despliegue de esquemas en entorno previo (Work)', semanas: 1, resp: 'timia', faseSDA: 'Despliegue', veces: 6 },
    { label: 'Solicitud y despliegue de esquemas en Productivo (Live)', semanas: 1, resp: 'bbva', faseSDA: 'Despliegue', veces: 6 },
  ],
};

const TRANSMISION: BloquePlantilla = {
  id: 'datax', label: 'II. Transmisión de Datos (DataX)', inicio: 3,
  actividades: [
    { label: 'Gestión de acceso a los namespaces de DataX', semanas: 2, resp: 'bbva', faseSDA: 'Despliegue', veces: 1, nota: 'Pedir con dos semanas de antelación: bloquea todo el frente' },
    { label: 'Creación de los adaptadores en Work y Live', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 1 },
    { label: 'Creación de Schemas de los Data Objects', semanas: 2, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 1 },
    { label: 'Creación de los Data Objects para la transferencia', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 1 },
    { label: 'Creación de las transferencias', semanas: 2, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 1 },
    { label: 'Pruebas en entornos previos (Work) de la transmisión', semanas: 1, resp: 'timia', faseSDA: 'Pruebas', veces: 1 },
    { label: 'Solicitud de credenciales del adaptador Tantia en producción', semanas: 2, resp: 'bbva', faseSDA: 'Despliegue', veces: 1, paralelo: true },
    { label: 'Publicación de componentes DataX y aprobación en Work', semanas: 2, resp: 'timia', faseSDA: 'Despliegue', veces: 1 },
    { label: 'Promoción de componentes a Live', semanas: 1, resp: 'timia', faseSDA: 'Despliegue', veces: 1 },
  ],
};

const DESARROLLO: BloquePlantilla = {
  id: 'dev', label: 'III. Desarrollo de Procesamientos', inicio: 4,
  actividades: [
    { label: 'Gestión de repositorios Bitbucket (procesamiento, Hammurabi, Smart Cleaner)', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 3 },
    { label: 'Construcción del procesamiento', semanas: 3, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 6, nota: 'La actividad más pesada; escala con el número de procesamientos' },
    { label: 'Pruebas en entorno local', semanas: 1, resp: 'timia', faseSDA: 'Pruebas', veces: 5 },
    { label: 'Construcción de Test unitarios y de Aceptación', semanas: 1, resp: 'timia', faseSDA: 'Pruebas', veces: 6 },
    { label: 'Generación de datos, acompañamiento y VoBo de la información', semanas: 2, resp: 'mixto', faseSDA: 'Pruebas', veces: 6, nota: 'Requiere disponibilidad de negocio' },
    { label: 'Despliegue y pruebas en Work + Jobs Dataproc (work)', semanas: 2, resp: 'timia', faseSDA: 'Despliegue', veces: 6 },
    { label: 'Construcción de reglas de calidad MVP (Hammurabi)', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 4 },
    { label: 'Construcción del borrado Smart Cleaner', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 4, paralelo: true },
    { label: 'Certificación de calidad por el equipo de QA', semanas: 2, resp: 'bbva', faseSDA: 'Pruebas', veces: 6, nota: 'Reservar cupo con QA al iniciar la construcción' },
    { label: 'Creación de Jobs Dataproc (live)', semanas: 1, resp: 'timia', faseSDA: 'Despliegue', veces: 2 },
    { label: 'Validación y puesta en producción de componentes ADA', semanas: 1, resp: 'timia', faseSDA: 'Despliegue', veces: 6 },
  ],
};

const HISTORIA: BloquePlantilla = {
  id: 'hist', label: 'IV. Generación de Historia', inicio: 10,
  actividades: [
    { label: 'Gestión de repositorios Bitbucket — Migration Tool', semanas: 2, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 3 },
    { label: 'Construcción del Migration Tool', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 3 },
    { label: 'Construcción de mallas temporales', semanas: 2, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 4 },
    { label: 'Ejecución de históricos', semanas: 1, resp: 'timia', faseSDA: 'Operación', veces: 3 },
    { label: 'Validación de los datos históricos generados', semanas: 2, resp: 'mixto', faseSDA: 'Pruebas', veces: 4, nota: 'Requiere VoBo de negocio' },
  ],
};

const AUTOMATIZACION: BloquePlantilla = {
  id: 'auto', label: 'V. Automatización y Orquestación', inicio: 11,
  actividades: [
    { label: 'Gestión de accesos a Control-M distribuido', semanas: 1, resp: 'bbva', faseSDA: 'Despliegue', veces: 4, nota: 'Pedir con antelación' },
    { label: 'Definición de la automatización', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 4 },
    { label: 'Construcción de mallas en Control-M distribuido', semanas: 2, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 4 },
    { label: 'Pruebas en Work de las mallas Control-M', semanas: 1, resp: 'timia', faseSDA: 'Pruebas', veces: 4 },
    { label: 'Elaboración de documentación de mallas (ADA)', semanas: 1, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 4, paralelo: true },
  ],
};

const CERTIFICACION: BloquePlantilla = {
  id: 'cert', label: 'VI. Certificación, Productivización y Estabilización', inicio: 14,
  actividades: [
    { label: 'Certificación de mallas Control-M distribuido', semanas: 2, resp: 'bbva', faseSDA: 'Pruebas', veces: 3 },
    { label: 'Instalación de mallas Control-M en producción', semanas: 1, resp: 'timia', faseSDA: 'Despliegue', veces: 3 },
    { label: 'Estabilización de procesos en producción', semanas: 2, resp: 'timia', faseSDA: 'Operación', veces: 4, nota: 'Ventana de acompañamiento post-salida' },
  ],
};

/** Ajuste de algo que ya está en producción (el frente tipo "Dynamic Pricing"). */
const AJUSTE: BloquePlantilla = {
  id: 'ajuste', label: 'Ajuste de procesamiento existente', inicio: 1,
  actividades: [
    { label: 'Análisis de las casuísticas presentadas', semanas: 3, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 1 },
    { label: 'Gestión de repositorios Bitbucket', semanas: 1, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 3, paralelo: true },
    { label: 'Ajuste del procesamiento', semanas: 2, resp: 'timia', faseSDA: 'Desarrollo / Gestión datos', veces: 4 },
    { label: 'Ajuste de la documentación técnica y del MSD', semanas: 2, resp: 'timia', faseSDA: 'Análisis y diseño', veces: 2, paralelo: true },
    { label: 'Pruebas en entorno local', semanas: 2, resp: 'timia', faseSDA: 'Pruebas', veces: 2 },
    { label: 'Ajuste de Test unitarios y de Aceptación', semanas: 2, resp: 'timia', faseSDA: 'Pruebas', veces: 1, paralelo: true },
    { label: 'Validación de datos generados y VoBo', semanas: 2, resp: 'mixto', faseSDA: 'Pruebas', veces: 2 },
    { label: 'Despliegue y pruebas en Work', semanas: 2, resp: 'timia', faseSDA: 'Despliegue', veces: 2 },
    { label: 'Certificación de calidad por QA', semanas: 2, resp: 'bbva', faseSDA: 'Pruebas', veces: 2 },
    { label: 'Modificación de Jobs Dataproc (live)', semanas: 2, resp: 'timia', faseSDA: 'Despliegue', veces: 2 },
    { label: 'Puesta en producción de componentes ADA', semanas: 1, resp: 'timia', faseSDA: 'Despliegue', veces: 1 },
  ],
};

// ─── Plantillas ──────────────────────────────────────────────────────────────

export interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string;
  bloques: BloquePlantilla[];
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'migracion-ada',
    nombre: 'Migración a ADA',
    descripcion: 'Objetos que vienen de otra plataforma: gobierno, transmisión DataX, procesamientos, historia, automatización y certificación. Es la forma del proyecto MIGBD.',
    bloques: [GOBIERNO, TRANSMISION, DESARROLLO, HISTORIA, AUTOMATIZACION, CERTIFICACION],
  },
  {
    id: 'procesamiento',
    nombre: 'Procesamiento nuevo',
    descripcion: 'Un procesamiento desde cero sin transmisión: gobierno, desarrollo, automatización y certificación.',
    bloques: [GOBIERNO, { ...DESARROLLO, inicio: 3 }, { ...AUTOMATIZACION, inicio: 9 }, { ...CERTIFICACION, inicio: 12 }],
  },
  {
    id: 'ingesta',
    nombre: 'Ingesta DataX',
    descripcion: 'Solo traer el dato: gobierno y transmisión, sin construir procesamientos.',
    bloques: [GOBIERNO, TRANSMISION],
  },
  {
    id: 'ajuste',
    nombre: 'Ajuste de procesamiento existente',
    descripcion: 'Cambios sobre algo que ya está productivo, con su ciclo de pruebas y certificación.',
    bloques: [AJUSTE],
  },
  {
    id: 'historia',
    nombre: 'Generación de historia',
    descripcion: 'Solo la carga histórica: Migration Tool, mallas temporales y validación.',
    bloques: [{ ...HISTORIA, inicio: 1 }],
  },
];

// ─── Generación del cronograma ───────────────────────────────────────────────

export interface OpcionesPlantilla {
  projectId: string;
  cronoId?: string;
  cronoName?: string;
  startDate?: string;
  /** Bloques a incluir (ids). Si no viene, todos los de la plantilla. */
  bloques?: string[];
}

/**
 * Convierte una plantilla en un PlanConfig con las semanas ya marcadas.
 * Dentro de cada bloque las actividades van una detrás de otra, salvo las marcadas
 * `paralelo`, que arrancan la misma semana que la anterior. Los bloques arrancan en
 * su semana `inicio`, así que se solapan igual que en los planes reales.
 * Todo queda editable después en la matriz: esto es un punto de partida, no un dogma.
 */
export function generarDesdePlantilla(plantilla: Plantilla, opts: OpcionesPlantilla): PlanConfig {
  const incluidos = opts.bloques?.length
    ? plantilla.bloques.filter(b => opts.bloques!.includes(b.id))
    : plantilla.bloques;

  let maxWeek = 1;
  const entregables: PlanEntregableConfig[] = incluidos.map(bloque => {
    let cursor = bloque.inicio;
    let anteriorInicio = bloque.inicio;
    const activities: PlanActivityConfig[] = bloque.actividades.map(a => {
      const inicio = a.paralelo ? anteriorInicio : cursor;
      const fin = inicio + Math.max(1, a.semanas) - 1;
      if (!a.paralelo) anteriorInicio = inicio;
      cursor = Math.max(cursor, fin + 1);
      maxWeek = Math.max(maxWeek, fin);
      const weeks = Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
      return {
        label: a.label,
        startWeek: inicio,
        endWeek: fin,
        weeks,
        bbva: a.resp === 'bbva',
      };
    });
    return { id: bloque.id, label: bloque.label, activities };
  });

  return {
    projectId: opts.projectId,
    cronoId: opts.cronoId,
    cronoName: opts.cronoName,
    totalWeeks: maxWeek,
    startDate: opts.startDate,
    entregables,
    pesoModo: 'actividad-semana',
    generatedAt: '',
  };
}

/** Metadatos de una actividad de plantilla, por etiqueta (para mostrar fase SDA, ANS, notas). */
const META = new Map<string, ActividadPlantilla>();
for (const p of PLANTILLAS) for (const b of p.bloques) for (const a of b.actividades) META.set(a.label, a);
export function metaActividad(label: string): ActividadPlantilla | undefined {
  return META.get(label);
}
