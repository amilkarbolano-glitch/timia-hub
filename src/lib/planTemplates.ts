// ─── Plan template previews ───────────────────────────────────────────────────
// Descripción compacta de cada plantilla de plan de trabajo (Estimaciones).
// Sirve como vista previa en Herramientas > Plantillas y como fuente de verdad
// para la lógica de selección de plantilla en Estimaciones.tsx.

export interface PlanEntregablePreview {
  label: string;
  color: string;    // badge color
  activities: string[];
}

export interface PlanTemplatePreview {
  id: string;
  totalWeeks: number;
  entregables: PlanEntregablePreview[];
}

export const PLAN_PREVIEWS: Record<string, PlanTemplatePreview> = {

  procesamientos: {
    id: 'procesamientos',
    totalWeeks: 13,
    entregables: [
      {
        label: 'I. Documentación y gobierno',
        color: '#3b82f6',
        activities: [
          'Análisis y resolución de dudas',
          'Elaboración diccionario técnico',
          'Inicialización en Nebula',
          'Circuito validación Gobierno Técnico',
          'Documentación técnica ETL y mapeo de campos',
          'Construcción Modelo Solución del Dato (MSD)',
          'Circuito validación MSD',
          'Despliegue esquemas entorno Work',
          'Solicitud y circuito de ACLs',
          'Solicitud despliegue Live',
          'Acompañamiento en Definición Funcional',
          'Acompañamiento validación del Notebook',
        ],
      },
      {
        label: 'II. Componentes ADA',
        color: '#8b5cf6',
        activities: [
          'Gestión repos Bitbucket · Procesamiento',
          'Construcción procesamiento Spark · Scala',
          'Construcción Test unitarios y Aceptación',
          'Construcción reglas calidad MVP (Hammurabi)',
          'Construcción Smart Cleaner procesamiento',
          'Pruebas en entorno local',
          'Despliegue y pruebas entornos Work',
          'Generación Datos Sandbox · validación',
          'Certificación calidad por equipo QA',
          'Despliegue producción componentes ADA',
          'Acompañamiento validación ADA Live',
        ],
      },
      {
        label: 'III. Automatización y orquestación',
        color: '#f59e0b',
        activities: [
          'Gestión acceso Control-M distribuido',
          'Definición de la automatización',
          'Construcción Mallas Control-M distribuido',
          'Pruebas entornos Work · Mallas Control-M',
          'Elaboración documentación Mallas ADA',
          'Certificación mallas Control-M',
          'Instalación mallas producción',
          'Estabilización procesos en producción',
        ],
      },
    ],
  },

  ingesta: {
    id: 'ingesta',
    totalWeeks: 10,
    entregables: [
      {
        label: 'I. Documentación y análisis',
        color: '#3b82f6',
        activities: [
          'Análisis y mapeo de fuentes',
          'Diccionario de datos — campos fuente',
          'Diseño arquitectura de ingesta',
          'Circuito validación Gobierno Técnico',
          'Documentación técnica conectores',
        ],
      },
      {
        label: 'II. Pipeline de conectores',
        color: '#8b5cf6',
        activities: [
          'Configuración repositorio Bitbucket',
          'Construcción conectores de extracción',
          'Transformaciones básicas y normalización',
          'Validación de calidad de datos',
          'Pruebas en entorno local',
          'Despliegue entorno Work',
          'Certificación QA',
        ],
      },
      {
        label: 'III. Orquestación y cierre',
        color: '#f59e0b',
        activities: [
          'Construcción mallas Control-M',
          'Pruebas orquestación en Work',
          'Despliegue producción',
          'Estabilización y monitoreo',
        ],
      },
    ],
  },

  hibridos: {
    id: 'hibridos',
    totalWeeks: 14,
    entregables: [
      {
        label: 'I. Documentación y gobierno',
        color: '#3b82f6',
        activities: [
          'Análisis fuentes y mapeo end-to-end',
          'Diccionario técnico unificado',
          'Circuito Gobierno Técnico',
          'Modelo Solución del Dato (MSD)',
          'Circuito validación MSD',
          'Documentación técnica ETL completa',
          'Solicitud ACLs y accesos',
        ],
      },
      {
        label: 'II. Pipeline de Ingesta',
        color: '#10b981',
        activities: [
          'Gestión repos Bitbucket · Ingesta',
          'Construcción conectores extracción',
          'Validación calidad en ingesta (Hammurabi)',
          'Pruebas entorno local · Ingesta',
        ],
      },
      {
        label: 'III. Componentes ADA — Procesamiento',
        color: '#8b5cf6',
        activities: [
          'Gestión repos Bitbucket · Procesamiento',
          'Construcción Spark · Scala',
          'Construcción Smart Cleaner',
          'Pruebas entorno local · Procesamiento',
          'Despliegue Work — pipeline completo',
          'Certificación QA pipeline completo',
          'Despliegue producción',
          'Acompañamiento validación Live',
        ],
      },
      {
        label: 'IV. Orquestación end-to-end',
        color: '#f59e0b',
        activities: [
          'Diseño mallas Control-M integradas',
          'Construcción mallas ingesta + procesamiento',
          'Pruebas orquestación en Work',
          'Certificación mallas Control-M',
          'Instalación y activación en producción',
          'Estabilización procesos en producción',
        ],
      },
    ],
  },
};

/** Cuenta actividades totales de un preview */
export function countActivities(preview: PlanTemplatePreview): number {
  return preview.entregables.reduce((s, e) => s + e.activities.length, 0);
}
