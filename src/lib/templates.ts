import { ProjectTemplate } from '../types';

export const INITIAL_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'ingesta',
    name: 'Ingesta',
    description: 'Conexión y extracción de fuentes externas.',
    icon: 'Cloud',
    tasks: [
      { title: 'Configuración de conectores de datos', description: 'Establecer conexión segura con APIs de terceros y bases de datos locales.', points: 8, tag: 'Sugerido' },
      { title: 'Mapping de esquemas SQL a JSON', description: 'Transformación de estructuras relacionales a documentos orientados a eventos.', points: 12, tag: 'Prioridad' },
      { title: 'Validación de calidad de datos', description: 'Implementar reglas de negocio para la limpieza y deduplicación de registros.', points: 15 },
      { title: 'Documentación técnica de API v2', description: 'Generación de Swagger y ejemplos de uso para el equipo de Frontend.', points: 7, tag: 'Manual' },
    ]
  },
  {
    id: 'procesamientos',
    name: 'Procesamientos',
    description: 'Transformación y limpieza de registros.',
    icon: 'Cpu',
    tasks: [
      { title: 'Limpieza de datos nulos', description: 'Identificación y tratamiento de valores faltantes en el dataset.', points: 5 },
      { title: 'Normalización de campos', description: 'Estandarización de formatos de fecha, moneda y direcciones.', points: 8 },
      { title: 'Cálculo de métricas derivadas', description: 'Generación de KPIs a partir de datos base.', points: 13 },
    ]
  },
  {
    id: 'hibridos',
    name: 'Híbridos',
    description: 'Incluye procesos de ingesta y procesamiento.',
    icon: 'Database',
    tasks: [
      { title: 'Pipeline End-to-End', description: 'Configuración completa desde la fuente hasta el destino final.', points: 21 },
      { title: 'Monitoreo de latencia', description: 'Implementación de alertas para retrasos en el procesamiento.', points: 5 },
    ]
  }
];
