import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Save, ArrowRight, ArrowLeft,
  LayoutList, Clock, CalendarDays, Settings2, CheckSquare, Users, BarChart3, Grid3x3, List, Sparkles,
} from 'lucide-react';
import { PROJECTS, useAuth, canAccess } from '../contexts/AuthContext';
import { adminStore, makePlanKey, CRONO_MAIN_NAME, puedeVerPlantilla, alcanceDe, type PlanEtapa, type PlanActivityConfig, type PlanEntregableConfig, type PlanConfig, type PlantillaPropia } from '../lib/adminStore';
import type { View } from './Layout';
import { FlowStepper } from './SetupProject';
import { snapToBusinessDay, addBusinessDays } from '../lib/businessDays';
import { marcasDe, factorFase, marcasFase, type PesoModo, PESO_MODO_DEFAULT } from '../lib/avance';
import MatrizCronograma from './MatrizCronograma';
import PreviewPlantilla, { type PreviewProps } from './PreviewPlantilla';
import { PLANTILLAS, BLOQUES, generarDesdePlantilla, insertarBloque, resumenBloque } from '../lib/plantillas';

// ─── Week label computation (días hábiles reales) ─────────────────────────────
// Cada semana = 5 días hábiles. S1 empieza en startDate (snapped a día hábil),
// S2 empieza 5 días hábiles después, etc. Fines de semana y festivos se omiten.

function computeWeekLabels(startDate: string, totalWeeks: number, holidayDates: Set<string>): string[] {
  if (!startDate) return Array.from({ length: totalWeeks }, (_, i) => `S${i + 1}`);
  const s1 = snapToBusinessDay(new Date(startDate + 'T12:00:00'), holidayDates);
  return Array.from({ length: totalWeeks }, (_, i) => {
    const d   = addBusinessDays(s1, i * 5, holidayDates);
    const day = d.getDate();
    const mon = d.toLocaleDateString('es-CO', { month: 'short' });
    return `S${i + 1} · ${day} ${mon}`;
  });
}

// ─── Combined project list (static + dynamic from adminStore) ─────────────────

function getAllProjects() {
  const dynamic = adminStore.getProjects().filter(p => p.active);
  const base = PROJECTS as { id: string; name: string; color: string }[];
  const extra = dynamic.filter(ap => !base.find(p => p.id === ap.id));
  return [
    ...base,
    ...extra.map(ap => ({ id: ap.id, name: ap.name, color: ap.color })),
  ];
}

// ─── Default templates ────────────────────────────────────────────────────────
// We bootstrap FICO from the known plan structure.
// Other projects get a blank 3-entregable template.


// ─── Plantilla Procesamiento (plan completo — igual estructura que FICO) ────────
// Se carga cuando el proyecto se crea con tipo "procesamientos" en SetupProject.

const PROCESAMIENTO_TEMPLATE = (projectId: string): PlanConfig => ({
  projectId,
  totalWeeks: 13,
  generatedAt: '',
  entregables: [
    {
      id: 'doc', label: 'I. Documentación y gobierno',
      activities: [
        { label: 'Análisis y resolución de dudas',              startWeek: 1, endWeek: 2 },
        {
          label: 'Elaboración diccionario técnico',              startWeek: 1, endWeek: 2,
          etapas: [
            { id: 'dt-1', label: 'Levantamiento inicial de campos',  peso: 25 },
            { id: 'dt-2', label: 'Envío a Gobierno de datos',        peso: 25 },
            { id: 'dt-3', label: 'Correcciones de Gobierno',         peso: 25, optional: true },
            { id: 'dt-4', label: 'Validación final del diccionario', peso: 25 },
          ],
        },
        { label: 'Inicialización en Nebula',                    startWeek: 1, endWeek: 1, bbva: true },
        {
          label: 'Circuito validación Gobierno Técnico',         startWeek: 3, endWeek: 5, bbva: true,
          etapas: [
            { id: 'cvgt-1', label: 'Presentación al comité BBVA', peso: 25 },
            { id: 'cvgt-2', label: 'Recepción de observaciones',  peso: 25 },
            { id: 'cvgt-3', label: 'Aplicación de correcciones',  peso: 25, optional: true },
            { id: 'cvgt-4', label: 'Aprobación definitiva',       peso: 25 },
          ],
        },
        { label: 'Documentación técnica ETL y mapeo de campos',  startWeek: 1, endWeek: 3 },
        { label: 'Construcción Modelo Solución del Dato (MSD)',   startWeek: 2, endWeek: 3 },
        { label: 'Circuito validación MSD',                      startWeek: 3, endWeek: 5, bbva: true },
        { label: 'Despliegue esquemas entorno Work',              startWeek: 4, endWeek: 5, bbva: true },
        { label: 'Solicitud y circuito de ACLs',                 startWeek: 4, endWeek: 5, bbva: true },
        { label: 'Solicitud despliegue Live',                    startWeek: 5, endWeek: 5, bbva: true },
        { label: 'Acompañamiento en Definición Funcional',       startWeek: 1, endWeek: 2, bbva: true },
        { label: 'Acompañamiento validación del Notebook',       startWeek: 1, endWeek: 1, bbva: true },
      ],
    },
    {
      id: 'ada', label: 'II. Componentes ADA',
      activities: [
        { label: 'Gestión repos Bitbucket · Procesamiento', startWeek: 1, endWeek: 1, bbva: true },
        {
          label: 'Construcción procesamiento Spark · Scala', startWeek: 2, endWeek: 7,
          etapas: [
            { id: 'spark-1', label: 'Ambientación del repositorio local',       peso: 10 },
            { id: 'spark-2', label: 'Construcción clases principales',          peso: 40, subs: ['Clase getData','Clase Generate','Clase Process'] },
            { id: 'spark-3', label: 'Config y utilitarios — context provider',  peso: 20 },
            { id: 'spark-4', label: 'Test unitarios y de aceptación',           peso: 20 },
            { id: 'spark-5', label: 'Escritura local — validación de salida',   peso: 10 },
          ],
        },
        { label: 'Construcción Test unitarios y Aceptación',    startWeek: 6, endWeek: 8 },
        { label: 'Construcción reglas calidad MVP (Hammurabi)', startWeek: 5, endWeek: 7 },
        { label: 'Construcción Smart Cleaner procesamiento',    startWeek: 5, endWeek: 6 },
        { label: 'Pruebas en entorno local',                    startWeek: 7, endWeek: 8 },
        {
          label: 'Despliegue y pruebas entornos Work', startWeek: 8, endWeek: 8,
          etapas: [
            { id: 'work-1', label: 'Generación de muestras/sandbox',        peso: 20, optional: true },
            { id: 'work-2', label: 'Creación y ejecución job ADA en Work',  peso: 30 },
            { id: 'work-3', label: 'Verificación de escritura en VBox',     peso: 30 },
            { id: 'work-4', label: 'Prueba en ambiente de test',            peso: 20 },
          ],
        },
        { label: 'Generación Datos Sandbox · validación',       startWeek: 8,  endWeek: 9,  bbva: true },
        { label: 'Certificación calidad por equipo QA',          startWeek: 9,  endWeek: 10, bbva: true },
        { label: 'Despliegue producción componentes ADA',        startWeek: 11, endWeek: 11 },
        { label: 'Acompañamiento validación ADA Live',           startWeek: 11, endWeek: 13, bbva: true },
      ],
    },
    {
      id: 'auto', label: 'III. Automatización y orquestación',
      activities: [
        { label: 'Gestión acceso Control-M distribuido',       startWeek: 3,  endWeek: 4,  bbva: true },
        { label: 'Definición de la automatización',            startWeek: 5,  endWeek: 5 },
        { label: 'Construcción Mallas Control-M distribuido',  startWeek: 6,  endWeek: 8 },
        { label: 'Pruebas entornos Work · Mallas Control-M',   startWeek: 7,  endWeek: 8 },
        { label: 'Elaboración documentación Mallas ADA',       startWeek: 7,  endWeek: 8 },
        { label: 'Certificación mallas Control-M',             startWeek: 8,  endWeek: 10, bbva: true },
        { label: 'Instalación mallas producción',              startWeek: 10, endWeek: 10, bbva: true },
        { label: 'Estabilización procesos en producción',      startWeek: 11, endWeek: 13 },
      ],
    },
  ],
});

// ─── Plantilla Ingesta ────────────────────────────────────────────────────────

const INGESTA_TEMPLATE = (projectId: string): PlanConfig => ({
  projectId,
  totalWeeks: 10,
  generatedAt: '',
  entregables: [
    {
      id: 'doc', label: 'I. Documentación y análisis',
      activities: [
        { label: 'Análisis y mapeo de fuentes',              startWeek: 1, endWeek: 2 },
        { label: 'Diccionario de datos — campos fuente',     startWeek: 1, endWeek: 2,
          etapas: [
            { id: 'ing-dt-1', label: 'Levantamiento de campos origen', peso: 33 },
            { id: 'ing-dt-2', label: 'Validación con equipo BBVA',     peso: 34 },
            { id: 'ing-dt-3', label: 'Aprobación final',               peso: 33 },
          ],
        },
        { label: 'Diseño arquitectura de ingesta',           startWeek: 2, endWeek: 3 },
        { label: 'Circuito validación Gobierno Técnico',     startWeek: 3, endWeek: 5, bbva: true },
        { label: 'Documentación técnica conectores',         startWeek: 2, endWeek: 4 },
      ],
    },
    {
      id: 'ing', label: 'II. Desarrollo conectores y pipeline',
      activities: [
        { label: 'Configuración repositorio Bitbucket',      startWeek: 1, endWeek: 1, bbva: true },
        { label: 'Construcción conectores de extracción',    startWeek: 3, endWeek: 6,
          etapas: [
            { id: 'con-1', label: 'Conector fuente principal',      peso: 50 },
            { id: 'con-2', label: 'Manejo de errores y reintentos', peso: 30 },
            { id: 'con-3', label: 'Logging y monitoreo',            peso: 20 },
          ],
        },
        { label: 'Transformaciones básicas y normalización', startWeek: 5, endWeek: 7 },
        { label: 'Validación de calidad de datos',           startWeek: 6, endWeek: 8,
          etapas: [
            { id: 'val-1', label: 'Reglas de negocio básicas',   peso: 40 },
            { id: 'val-2', label: 'Deduplicación',               peso: 30 },
            { id: 'val-3', label: 'Validación de completitud',   peso: 30 },
          ],
        },
        { label: 'Pruebas en entorno local',                 startWeek: 7, endWeek: 8 },
        { label: 'Despliegue entorno Work',                  startWeek: 8, endWeek: 9, bbva: true },
        { label: 'Certificación QA',                         startWeek: 9, endWeek: 10, bbva: true },
      ],
    },
    {
      id: 'ops', label: 'III. Orquestación y cierre',
      activities: [
        { label: 'Construcción mallas Control-M',            startWeek: 6,  endWeek: 8 },
        { label: 'Pruebas orquestación en Work',             startWeek: 8,  endWeek: 9 },
        { label: 'Despliegue producción',                    startWeek: 9,  endWeek: 10, bbva: true },
        { label: 'Estabilización y monitoreo',               startWeek: 10, endWeek: 11 },
      ],
    },
  ],
});

// ─── Plantilla Híbrido ────────────────────────────────────────────────────────

const HIBRIDO_TEMPLATE = (projectId: string): PlanConfig => ({
  projectId,
  totalWeeks: 14,
  generatedAt: '',
  entregables: [
    {
      id: 'doc', label: 'I. Documentación y gobierno',
      activities: [
        { label: 'Análisis fuentes y mapeo end-to-end',          startWeek: 1, endWeek: 2 },
        { label: 'Diccionario técnico unificado',                startWeek: 1, endWeek: 3,
          etapas: [
            { id: 'h-dt-1', label: 'Campos de ingesta',         peso: 34 },
            { id: 'h-dt-2', label: 'Campos procesamiento',      peso: 33 },
            { id: 'h-dt-3', label: 'Validación y aprobación',   peso: 33 },
          ],
        },
        { label: 'Circuito Gobierno Técnico',                    startWeek: 3, endWeek: 5, bbva: true },
        { label: 'Modelo Solución del Dato (MSD)',               startWeek: 2, endWeek: 4 },
        { label: 'Circuito validación MSD',                      startWeek: 4, endWeek: 6, bbva: true },
        { label: 'Documentación técnica ETL completa',           startWeek: 2, endWeek: 4 },
        { label: 'Solicitud ACLs y accesos',                     startWeek: 5, endWeek: 6, bbva: true },
      ],
    },
    {
      id: 'ing', label: 'II. Pipeline de Ingesta',
      activities: [
        { label: 'Gestión repos Bitbucket · Ingesta',            startWeek: 1, endWeek: 1, bbva: true },
        { label: 'Construcción conectores extracción',           startWeek: 3, endWeek: 6,
          etapas: [
            { id: 'h-con-1', label: 'Conector fuente principal',      peso: 50 },
            { id: 'h-con-2', label: 'Manejo errores y reintentos',    peso: 30 },
            { id: 'h-con-3', label: 'Logging y monitoreo',            peso: 20 },
          ],
        },
        { label: 'Validación calidad en ingesta (Hammurabi)',    startWeek: 5, endWeek: 7 },
        { label: 'Pruebas entorno local · Ingesta',             startWeek: 7, endWeek: 8 },
      ],
    },
    {
      id: 'ada', label: 'III. Componentes ADA — Procesamiento',
      activities: [
        { label: 'Gestión repos Bitbucket · Procesamiento',      startWeek: 1, endWeek: 1, bbva: true },
        { label: 'Construcción Spark · Scala',                   startWeek: 4, endWeek: 9,
          etapas: [
            { id: 'h-spark-1', label: 'Ambientación repositorio',          peso: 10 },
            { id: 'h-spark-2', label: 'Construcción clases principales',   peso: 40, subs: ['Clase getData','Clase Generate','Clase Process'] },
            { id: 'h-spark-3', label: 'Config y utilitarios',              peso: 20 },
            { id: 'h-spark-4', label: 'Test unitarios y aceptación',       peso: 20 },
            { id: 'h-spark-5', label: 'Escritura local — validación',      peso: 10 },
          ],
        },
        { label: 'Construcción Smart Cleaner',                   startWeek: 7, endWeek: 9 },
        { label: 'Pruebas entorno local · Procesamiento',        startWeek: 9, endWeek: 10 },
        {
          label: 'Despliegue Work — pipeline completo',           startWeek: 10, endWeek: 11, bbva: true,
          etapas: [
            { id: 'h-work-1', label: 'Ingesta en Work',              peso: 25 },
            { id: 'h-work-2', label: 'Procesamiento en Work',        peso: 25 },
            { id: 'h-work-3', label: 'Verificación end-to-end',      peso: 25 },
            { id: 'h-work-4', label: 'Prueba de aceptación QA',      peso: 25 },
          ],
        },
        { label: 'Certificación QA pipeline completo',           startWeek: 11, endWeek: 12, bbva: true },
        { label: 'Despliegue producción',                        startWeek: 13, endWeek: 13 },
        { label: 'Acompañamiento validación Live',               startWeek: 13, endWeek: 14, bbva: true },
      ],
    },
    {
      id: 'auto', label: 'IV. Orquestación end-to-end',
      activities: [
        { label: 'Diseño mallas Control-M integradas',           startWeek: 6,  endWeek: 7 },
        { label: 'Construcción mallas ingesta + procesamiento',  startWeek: 8,  endWeek: 10 },
        { label: 'Pruebas orquestación en Work',                 startWeek: 10, endWeek: 11 },
        { label: 'Certificación mallas Control-M',               startWeek: 11, endWeek: 12, bbva: true },
        { label: 'Instalación y activación en producción',       startWeek: 13, endWeek: 13, bbva: true },
        { label: 'Estabilización procesos en producción',        startWeek: 13, endWeek: 14 },
      ],
    },
  ],
});

// ─── Template selector — elige según tipo de proyecto ─────────────────────────

function getDefaultPlanConfig(projectId: string): PlanConfig {
  try {
    // SetupProject guarda { projectId, type } para evitar contaminar otros proyectos.
    // También soporta el formato simple string por compatibilidad.
    const raw = localStorage.getItem('timia_setup_template_type') ?? '';
    let type = '';
    if (raw.startsWith('{')) {
      const info = JSON.parse(raw) as { projectId?: string; type?: string };
      // Solo aplica si el projectId coincide o no está especificado
      if (!info.projectId || info.projectId === projectId) {
        type = info.type ?? '';
      }
    } else {
      type = raw;
    }
    if (type === 'procesamientos') return PROCESAMIENTO_TEMPLATE(projectId);
    if (type === 'ingesta')        return INGESTA_TEMPLATE(projectId);
    if (type === 'hibridos')       return HIBRIDO_TEMPLATE(projectId);
  } catch {}
  return BLANK_TEMPLATE(projectId);
}

const BLANK_TEMPLATE = (projectId: string): PlanConfig => ({
  projectId,
  totalWeeks: 10,
  generatedAt: '',
  entregables: [
    {
      id: 'ent-1', label: 'I. Documentación',
      activities: [
        { label: 'Levantamiento de requerimientos', startWeek: 1, endWeek: 2 },
        { label: 'Documentación técnica',           startWeek: 2, endWeek: 3 },
      ],
    },
    {
      id: 'ent-2', label: 'II. Desarrollo',
      activities: [
        { label: 'Construcción componentes principales', startWeek: 3, endWeek: 8 },
        { label: 'Pruebas unitarias',                    startWeek: 7, endWeek: 9 },
      ],
    },
    {
      id: 'ent-3', label: 'III. Despliegue y cierre',
      activities: [
        { label: 'Despliegue a producción', startWeek: 9,  endWeek: 11 },
        { label: 'Estabilización',          startWeek: 11, endWeek: 13 },
      ],
    },
  ],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix = 'id') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }

function pesoTotal(etapas: PlanEtapa[]): number {
  return etapas.reduce((s, e) => s + e.peso, 0);
}

// ─── EtapaRow ─────────────────────────────────────────────────────────────────

function EtapaRow({
  etapa, index, total,
  onChange, onDelete, onMoveUp, onMoveDown,
}: {
  etapa: PlanEtapa; index: number; total: number;
  onChange: (e: PlanEtapa) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'center',
      padding: '6px 10px', borderRadius: 7,
      background: '#f8fafc', border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        <button disabled={index === 0} onClick={onMoveUp}
          style={{ border: 'none', background: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '1px 3px', color: '#94a3b8', fontSize: 9, lineHeight: 1 }}>▲</button>
        <button disabled={index === total - 1} onClick={onMoveDown}
          style={{ border: 'none', background: 'none', cursor: index === total - 1 ? 'not-allowed' : 'pointer', padding: '1px 3px', color: '#94a3b8', fontSize: 9, lineHeight: 1 }}>▼</button>
      </div>
      <input
        value={etapa.label}
        onChange={e => onChange({ ...etapa, label: e.target.value })}
        placeholder="Nombre de la etapa"
        style={{ flex: 1, padding: '4px 8px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none', background: '#fff' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <input
          type="number" min={0} max={100} value={etapa.peso}
          onChange={e => onChange({ ...etapa, peso: parseInt(e.target.value) || 0 })}
          style={{ width: 48, padding: '4px 6px', fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 5, textAlign: 'center', outline: 'none' }}
        />
        <span style={{ fontSize: 10, color: '#94a3b8' }}>%</span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}>
        <input
          type="checkbox" checked={etapa.optional ?? false}
          onChange={e => onChange({ ...etapa, optional: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        opc.
      </label>
      <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, color: '#fca5a5', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Trash2 size={12}/>
      </button>
    </div>
  );
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────

function ActivityCard({
  act, actIdx, totalWeeks, porSemana, weekLabels,
  onChange, onDelete,
}: {
  act: PlanActivityConfig; actIdx: number; totalWeeks: number;
  /** true si el cronograma pondera por actividad-semana: se habilita la rejilla de casillas. */
  porSemana?: boolean;
  weekLabels?: string[];
  onChange: (a: PlanActivityConfig) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const etapas = act.etapas ?? [];
  const total  = pesoTotal(etapas);
  const overOrUnder = etapas.length > 0 ? total !== 100 : false;

  function addEtapa() {
    const remaining = Math.max(0, 100 - total);
    const newEtapa: PlanEtapa = { id: uid('et'), label: 'Nueva etapa', peso: remaining };
    onChange({ ...act, etapas: [...etapas, newEtapa] });
    setOpen(true);
  }

  function updateEtapa(i: number, e: PlanEtapa) {
    const next = [...etapas];
    next[i] = e;
    onChange({ ...act, etapas: next });
  }

  function deleteEtapa(i: number) {
    const next = etapas.filter((_, idx) => idx !== i);
    onChange({ ...act, etapas: next.length ? next : undefined });
  }

  function moveEtapa(from: number, to: number) {
    const next = [...etapas];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ ...act, etapas: next });
  }

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  // ── Casillas por semana (método del Excel del PM) ──
  const marcas = marcasDe({ weeks: act.weeks, startWeek: act.startWeek, endWeek: act.endWeek });
  const marcasSet = new Set(marcas);
  const discontinua = marcas.length > 0 && marcas.length !== (marcas[marcas.length - 1] - marcas[0] + 1);

  /** Marca/desmarca una semana y reajusta el rango start/end para que el Gantt siga cuadrando. */
  function toggleSemana(w: number) {
    const next = new Set(marcas);
    if (next.has(w)) next.delete(w); else next.add(w);
    const arr = [...next].sort((a, b) => a - b);
    if (!arr.length) { onChange({ ...act, weeks: undefined }); return; }
    onChange({ ...act, weeks: arr, startWeek: arr[0], endWeek: arr[arr.length - 1] });
  }
  /** Vuelve al rango continuo: borra las casillas y deja start→end. */
  function limpiarMarcas() {
    onChange({ ...act, weeks: undefined });
  }

  return (
    <div style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 6 }}>
      {/* Activity header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}>
        {open ? <ChevronDown size={12} color="#0d9488"/> : <ChevronRight size={12} color="#0d9488"/>}
        <input
          value={act.label}
          onChange={e => { e.stopPropagation(); onChange({ ...act, label: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          placeholder="Nombre de la actividad"
          style={{ flex: 1, padding: '3px 6px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none' }}
        />
        {/* Week range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <CalendarDays size={11} color="#94a3b8"/>
          <select value={act.startWeek} onChange={e => onChange({ ...act, startWeek: +e.target.value })}
            style={{ fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', background: '#fff', cursor: 'pointer' }}>
            {weeks.map(w => <option key={w} value={w}>S{w}</option>)}
          </select>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>→</span>
          <select value={act.endWeek} onChange={e => onChange({ ...act, endWeek: +e.target.value })}
            style={{ fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', background: '#fff', cursor: 'pointer' }}>
            {weeks.filter(w => w >= act.startWeek).map(w => <option key={w} value={w}>S{w}</option>)}
          </select>
        </div>
        {/* Casillas — nº de semanas marcadas; avisa si el tramo es discontinuo */}
        {porSemana && (
          <span title={discontinua ? `Tramo discontinuo: ${marcas.map(w => `S${w}`).join(', ')}` : `${marcas.length} semana(s) marcada(s)`}
            style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: discontinua ? '#faf5ff' : '#f1f5f9', color: discontinua ? '#7c3aed' : '#64748b', fontWeight: 600, flexShrink: 0 }}>
            {marcas.length} ⬚{discontinua ? ' ⤳' : ''}
          </span>
        )}
        {/* BBVA toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#1d4ed8', cursor: 'pointer', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={act.bbva ?? false}
            onChange={e => onChange({ ...act, bbva: e.target.checked })}
            style={{ cursor: 'pointer' }}/>
          BBVA
        </label>
        {/* Etapas badge — suma de pesos de todas las etapas (debe ser exactamente 100%) */}
        {etapas.length > 0 && (
          <span title={overOrUnder ? `Las etapas suman ${total}% — deben sumar exactamente 100%` : 'Las etapas suman 100% correctamente'}
            style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: overOrUnder ? '#fef2f2' : '#f0fdf4', color: overOrUnder ? '#dc2626' : '#15803d', fontWeight: 600, flexShrink: 0, display:'flex', alignItems:'center', gap:3 }}>
            {overOrUnder ? `⚠ ${total}%` : `✓ ${total}%`}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, color: '#fca5a5', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Trash2 size={12}/>
        </button>
      </div>

      {/* Expanded: casillas por semana + etapas editor */}
      {open && (
        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f1f5f9', background: '#fafcff' }}>
          {porSemana && (
            <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CalendarDays size={11}/> Semanas de trabajo
                  <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>
                    — marcá cada semana activa; se admiten tramos discontinuos
                  </span>
                </p>
                {act.weeks?.length && (
                  <button onClick={limpiarMarcas}
                    style={{ fontSize: 9, border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 7px', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
                    Volver al rango continuo
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {weeks.map(w => {
                  const on = marcasSet.has(w);
                  return (
                    <button key={w} onClick={() => toggleSemana(w)}
                      title={weekLabels?.[w - 1] ? `S${w} · ${weekLabels[w - 1]}` : `S${w}`}
                      style={{
                        width: 34, height: 26, fontSize: 9, fontWeight: on ? 700 : 500, cursor: 'pointer',
                        border: `1px solid ${on ? '#0d9488' : '#e2e8f0'}`, borderRadius: 4,
                        background: on ? '#99d9ce' : '#fff', color: on ? '#0f766e' : '#94a3b8',
                      }}>
                      S{w}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <LayoutList size={11}/> Etapas de avance
              {etapas.length > 0 && (
                <span style={{ fontSize: 9, color: overOrUnder ? '#dc2626' : '#15803d', fontWeight: 700 }}>
                  {overOrUnder ? `⚠ suma=${total}% (debe ser 100%)` : '✓ suma correcta'}
                </span>
              )}
            </p>
            <button onClick={addEtapa} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
              fontSize: 10, border: '1px solid #0d9488', borderRadius: 5,
              background: '#f0fdfa', color: '#0d9488', cursor: 'pointer', fontWeight: 500,
            }}>
              <Plus size={10}/> Agregar etapa
            </button>
          </div>
          {etapas.length === 0 ? (
            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
              Sin etapas — el % se edita manualmente en el Plan de Trabajo
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {etapas.map((et, i) => (
                <EtapaRow
                  key={et.id} etapa={et} index={i} total={etapas.length}
                  onChange={e => updateEtapa(i, e)}
                  onDelete={() => deleteEtapa(i)}
                  onMoveUp={() => moveEtapa(i, i - 1)}
                  onMoveDown={() => moveEtapa(i, i + 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EntregablePanel ──────────────────────────────────────────────────────────

function EntregablePanel({
  ent, entIdx, totalWeeks, porSemana, weekLabels,
  onChange, onDelete, onSaveTemplate,
}: {
  ent: PlanEntregableConfig; entIdx: number; totalWeeks: number;
  porSemana?: boolean; weekLabels?: string[];
  onChange: (e: PlanEntregableConfig) => void;
  onDelete: () => void;
  onSaveTemplate?: () => void;
}) {
  const [open, setOpen] = useState(entIdx === 0);

  function addActivity() {
    const newAct: PlanActivityConfig = { label: 'Nueva actividad', startWeek: 1, endWeek: 2 };
    onChange({ ...ent, activities: [...ent.activities, newAct] });
    setOpen(true);
  }

  function updateActivity(i: number, a: PlanActivityConfig) {
    const next = [...ent.activities]; next[i] = a;
    onChange({ ...ent, activities: next });
  }

  function deleteActivity(i: number) {
    onChange({ ...ent, activities: ent.activities.filter((_, idx) => idx !== i) });
  }

  const totalActivities = ent.activities.length;
  const withEtapas      = ent.activities.filter(a => (a.etapas?.length ?? 0) > 0).length;
  // Factor estático de la fase: 100 / casillas (igual que el Excel del PM)
  const casillas = marcasFase({ id: ent.id, label: ent.label, activities: ent.activities });
  const factor   = factorFase({ id: ent.id, label: ent.label, activities: ent.activities });

  return (
    <div style={{ marginBottom: 14, borderRadius: 10, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff', cursor: 'pointer', borderBottom: open ? '1px solid #f1f5f9' : 'none' }}
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown size={14} color="#9f1239"/> : <ChevronRight size={14} color="#9f1239"/>}
        <input
          value={ent.label}
          onChange={e => { e.stopPropagation(); onChange({ ...ent, label: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          placeholder="Nombre del entregable"
          style={{ flex: 1, padding: '4px 8px', fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none', color: '#9f1239' }}
        />
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9', color: '#64748b' }}>
            {totalActivities} actividades
          </span>
          {porSemana && casillas > 0 && (
            <span title={`Factor estático = 100 / ${casillas} casillas = ${factor.toFixed(3)}`}
              style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#f0fdfa', color: '#0f766e', fontWeight: 600 }}>
              {casillas} ⬚ · factor {factor.toFixed(3)}
            </span>
          )}
          {withEtapas > 0 && (
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#f0fdf4', color: '#15803d' }}>
              {withEtapas} con etapas
            </span>
          )}
        </div>
        {onSaveTemplate && (
          <button onClick={e => { e.stopPropagation(); onSaveTemplate(); }}
            title="Guardar este entregable como plantilla reutilizable"
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#a78bfa', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Sparkles size={13}/>
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#fca5a5', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Trash2 size={13}/>
        </button>
      </div>

      {open && (
        <div style={{ padding: '12px 14px', background: '#fafcff' }}>
          {ent.activities.map((act, i) => (
            <ActivityCard
              key={i} act={act} actIdx={i} totalWeeks={totalWeeks} porSemana={porSemana} weekLabels={weekLabels}
              onChange={a => updateActivity(i, a)}
              onDelete={() => deleteActivity(i)}
            />
          ))}
          <button onClick={addActivity} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            width: '100%', marginTop: 6, borderRadius: 7, cursor: 'pointer',
            background: '#f8fafc', border: '1px dashed #d1d5db',
            fontSize: 11, color: '#64748b', justifyContent: 'center',
          }}>
            <Plus size={12}/> Agregar actividad
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main: Estimaciones ───────────────────────────────────────────────────────

interface EstimacionesProps {
  onViewChange: (view: View) => void;
  onBack?: () => void;   // Volver al paso anterior (SetupProject)
}

export default function Estimaciones({ onViewChange, onBack }: EstimacionesProps) {
  const { user } = useAuth();
  const role = user?.role ?? 'developer';

  // Build project list combining static PROJECTS + dynamic adminStore projects
  const allProjects = getAllProjects();
  const visibleProjects = canAccess(role, 'projects.view_all')
    ? allProjects
    : allProjects.filter(p => (user?.projectIds ?? []).includes(p.id));

  // Auto-select the newly-created project if we're coming from SetupProject
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const draftId = localStorage.getItem('timia_setup_draft_id');
    if (draftId) {
      localStorage.removeItem('timia_setup_draft_id');
      return draftId;
    }
    return visibleProjects[0]?.id ?? 'FICO';
  });
  const [configs, setConfigs] = useState<Record<string, PlanConfig>>(() => adminStore.getPlanConfigs());
  // Cronograma seleccionado dentro del proyecto ('' = principal)
  const [selectedCronoId, setSelectedCronoId] = useState<string>('');
  const [newCronoOpen, setNewCronoOpen] = useState(false);
  const [newCronoName, setNewCronoName] = useState('');
  const [newCronoTpl,  setNewCronoTpl]  = useState<'copy' | 'blank'>('copy');
  const [dirty, setDirty]     = useState(false);
  const [saved, setSaved]     = useState(false);
  // inFlow: true cuando venimos del wizard de creación de proyecto
  const [inFlow, setInFlow]   = useState<boolean>(
    () => localStorage.getItem('timia_setup_flow') === '2'
  );
  const [teamOpen,   setTeamOpen]   = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRev,    setTeamRev]    = useState(0); // incrementar fuerza re-render del equipo

  // ── Auto-limpiar flag del wizard al montar ──────────────────────────────────
  // Si el usuario abandona el wizard por el navbar (sin usar Volver/Siguiente),
  // el flag '2' quedaba en LS indefinidamente mostrando el stepper en cada visita.
  useEffect(() => {
    if (localStorage.getItem('timia_setup_flow') === '2') {
      localStorage.removeItem('timia_setup_flow');
    }
  }, []);

  // Holiday dates set for week label computation
  const holidayDates = React.useMemo(() => {
    const holidays = adminStore.getHolidays();
    return new Set(holidays.map(h => h.date));
  }, []);

  // Get or bootstrap the config for the selected project.
  // getDefaultPlanConfig selecciona PROCESAMIENTO_TEMPLATE, INGESTA_TEMPLATE,
  // HIBRIDO_TEMPLATE o BLANK_TEMPLATE según el tipo de proyecto creado en SetupProject.
  // planKey = projectId (principal) o projectId::cronoId — es la key de `configs` y de todo el storage del plan.
  const planKey = makePlanKey(selectedProjectId, selectedCronoId || undefined);
  const currentConfig: PlanConfig = configs[planKey] ?? getDefaultPlanConfig(selectedProjectId);

  // Cronogramas existentes del proyecto (principal siempre primero, aunque no tenga config guardada)
  const projectCronos = React.useMemo(() => {
    const extra = (Object.entries(configs) as [string, PlanConfig][])
      .filter(([, c]) => c.projectId === selectedProjectId && c.cronoId)
      .map(([key, c]) => ({ key, cronoId: c.cronoId as string, name: c.cronoName ?? (c.cronoId as string), generated: !!c.generatedAt }));
    return [{ key: selectedProjectId, cronoId: '', name: CRONO_MAIN_NAME, generated: !!configs[selectedProjectId]?.generatedAt }, ...extra];
  }, [configs, selectedProjectId]);

  useEffect(() => {
    setDirty(false);
    setSaved(false);
  }, [selectedProjectId, selectedCronoId]);

  // Al cambiar de proyecto, volver al cronograma principal
  useEffect(() => { setSelectedCronoId(''); setNewCronoOpen(false); }, [selectedProjectId]);

  function slugCrono(name: string): string {
    const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'crono';
    let id = base, n = 2;
    while (configs[makePlanKey(selectedProjectId, id)]) id = `${base}-${n++}`;
    return id;
  }

  function createCronograma() {
    const name = newCronoName.trim();
    if (!name) return;
    const cronoId = slugCrono(name);
    const principal = configs[selectedProjectId] ?? getDefaultPlanConfig(selectedProjectId);
    // Copiar estructura del principal (fases, actividades y etapas) con IDs nuevos, o partir en blanco
    const entregables: PlanEntregableConfig[] = newCronoTpl === 'copy'
      ? principal.entregables.map(e => ({ ...e, id: uid('ent'), activities: e.activities.map(a => ({ ...a, etapas: a.etapas?.map(et => ({ ...et })) })) }))
      : [];
    const cfg: PlanConfig = {
      projectId: selectedProjectId, cronoId, cronoName: name,
      totalWeeks: principal.totalWeeks, startDate: today, entregables, generatedAt: '',
    };
    const key = makePlanKey(selectedProjectId, cronoId);
    const next = { ...configs, [key]: cfg };
    setConfigs(next);
    adminStore.savePlanConfigs(next);
    setSelectedCronoId(cronoId);
    setNewCronoOpen(false); setNewCronoName(''); setNewCronoTpl('copy');
  }

  function deleteCronograma(key: string) {
    if (!configs[key]?.cronoId) return; // el principal no se elimina
    if (!window.confirm(`¿Eliminar el cronograma "${configs[key].cronoName}"? Se perderá su estimación.`)) return;
    const next = { ...configs }; delete next[key];
    setConfigs(next);
    adminStore.savePlanConfigs(next);
    setSelectedCronoId('');
  }

  // Vista de edición: matriz (todo el cronograma junto) o lista (detalle por actividad)
  const [vista, setVista] = useState<'matriz' | 'lista'>('matriz');
  const [showPlantillas, setShowPlantillas] = useState(false);
  /** 'proyecto' reemplaza todo el cronograma; 'entregable' agrega una fase al final. */
  const [tipoPlantilla, setTipoPlantilla] = useState<'proyecto' | 'entregable'>('proyecto');
  const [propias, setPropias] = useState<PlantillaPropia[]>(() => adminStore.getPlantillasPropias());
  /** Plantilla en vista previa, antes de aplicarla al cronograma. */
  const [preview, setPreview] = useState<Omit<PreviewProps, 'onCerrar' | 'totalWeeksActual' | 'weekLabels' | 'fasesActuales'> | null>(null);

  /** Aplica el resultado de una vista previa al cronograma actual. */
  function aplicarPreview(entregables: PlanEntregableConfig[], totalWeeks: number) {
    const labels = computeWeekLabels(currentConfig.startDate ?? startDate, totalWeeks, holidayDates);
    updateConfig({ entregables, totalWeeks, weekLabels: labels, pesoModo: 'actividad-semana' });
    setPreview(null); setShowPlantillas(false); setVista('matriz');
  }

  /** Guarda el cronograma actual (o una de sus fases) como plantilla reutilizable. */
  function guardarComoPlantilla(tipo: 'proyecto' | 'entregable', entIdx?: number) {
    const ents = tipo === 'entregable' && entIdx !== undefined
      ? [currentConfig.entregables[entIdx]]
      : currentConfig.entregables;
    if (!ents.length || !ents[0]) { alert('No hay nada que guardar.'); return; }
    const sugerido = tipo === 'entregable' ? ents[0].label : (currentConfig.cronoName ?? currentConfig.projectId);
    const nombre = prompt(`Nombre de la plantilla de ${tipo}:`, sugerido);
    if (!nombre) return;
    const nueva: PlantillaPropia = {
      id: uid('plt'), nombre, tipo,
      descripcion: `Guardada desde ${currentConfig.projectId}${currentConfig.cronoName ? ' · ' + currentConfig.cronoName : ''}`,
      entregables: JSON.parse(JSON.stringify(ents)),
      totalWeeks: currentConfig.totalWeeks,
      // Nace privada; se comparte desde Herramientas → Plantillas.
      alcance: 'privada', ownerId: user?.id, ownerName: user?.name,
      creadaEn: new Date().toISOString(),
    };
    const next = [...propias, nueva];
    setPropias(next); adminStore.savePlantillasPropias(next);
  }

  function updateConfig(patch: Partial<PlanConfig>) {
    const next = { ...configs, [planKey]: { ...currentConfig, ...patch } };
    setConfigs(next);
    setDirty(true);
    setSaved(false);
  }

  function saveConfig() {
    const labels = computeWeekLabels(startDate, currentConfig.totalWeeks, holidayDates);
    const updated = {
      ...configs,
      [planKey]: {
        ...currentConfig,
        startDate,
        weekLabels: labels,
        generatedAt: new Date().toISOString(),
      },
    };
    setConfigs(updated);
    adminStore.savePlanConfigs(updated);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function generatePlan() {
    // Recompute weekLabels based on current startDate before saving
    const labels = computeWeekLabels(startDate, currentConfig.totalWeeks, holidayDates);
    const updated = {
      ...configs,
      [planKey]: {
        ...currentConfig,
        startDate,
        weekLabels: labels,
        generatedAt: new Date().toISOString(),
      },
    };
    setConfigs(updated);
    adminStore.savePlanConfigs(updated);
    setDirty(false);
    // Marca el plan (planKey) para que PlanDeTrabajo lo auto-seleccione al montar
    localStorage.setItem('timia_last_plan_project', planKey);
    // Avanza al paso 3 del flujo de creación
    if (inFlow) {
      localStorage.setItem('timia_setup_flow', '3');
    }
    onViewChange('plan-trabajo');
  }

  function updateEntregable(i: number, ent: typeof currentConfig.entregables[number]) {
    const next = [...currentConfig.entregables]; next[i] = ent;
    updateConfig({ entregables: next });
  }

  function deleteEntregable(i: number) {
    updateConfig({ entregables: currentConfig.entregables.filter((_, idx) => idx !== i) });
  }

  function addEntregable() {
    const idx = currentConfig.entregables.length + 1;
    updateConfig({
      entregables: [...currentConfig.entregables, {
        id: uid('ent'), label: `${idx}. Nuevo entregable`, activities: [],
      }],
    });
  }

  const proj  = allProjects.find(p => p.id === selectedProjectId);
  const color = proj?.color ?? '#64748b';

  // Start date: stored in config or today by default
  const today = new Date().toISOString().slice(0, 10);
  const startDate = currentConfig.startDate ?? today;

  const totalActivities = currentConfig.entregables.reduce((s, e) => s + e.activities.length, 0);
  const totalEtapas     = currentConfig.entregables.reduce((s, e) => s + e.activities.reduce((s2, a) => s2 + (a.etapas?.length ?? 0), 0), 0);

  return (
    <div style={{ minHeight: '100%' }}>

      {/* ── Flow stepper (solo cuando venimos del wizard) ────────────────── */}
      {inFlow && (
        <div style={{ marginBottom: 24 }}>
          <FlowStepper current={2} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#fafafa', border: '0.5px solid #e2e8f0', borderRadius: 10, marginTop: -12 }}>
            <button
              onClick={() => {
                localStorage.removeItem('timia_setup_flow');
                setInFlow(false);
                onBack?.();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', color: '#374151', fontWeight: 500 }}
            >
              <ArrowLeft size={12}/> Volver a configurar proyecto
            </button>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              Configura el plan de tu nuevo proyecto y haz clic en <strong>Generar Plan de Trabajo</strong> para continuar.
            </p>
          </div>
        </div>
      )}

    <div style={{ display: 'flex', gap: 16 }}>

      {/* ── Sidebar proyectos ───────────────────────────────────────────────── */}
      <div style={{ width: 140, flexShrink: 0 }}>
        <p style={{ margin: '0 0 8px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>Proyectos</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {visibleProjects.map(p => {
            const isActive   = p.id === selectedProjectId;
            const hasConfig  = !!configs[p.id];
            return (
              <button key={p.id} onClick={() => setSelectedProjectId(p.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
                background: isActive ? `${p.color}15` : 'transparent',
                border: isActive ? `0.5px solid ${p.color}50` : '0.5px solid transparent',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? p.color : '#374151', flex: 1 }}>
                  {p.id}
                </span>
                {hasConfig
                  ? <span style={{ fontSize: 8, color: '#15803d' }}>✓</span>
                  : <span style={{ fontSize: 8, color: '#94a3b8' }}>—</span>
                }
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div style={{ marginTop: 16, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '0.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: '#15803d' }}>✓</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>Plan guardado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>—</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>Sin plan</span>
          </div>
        </div>
      </div>

      {/* ── Editor principal ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: '14px 18px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color }}>{selectedProjectId.slice(0,2)}</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>
                Estimaciones · {selectedProjectId}
                {selectedCronoId && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color, background: color + '15', border: `0.5px solid ${color}40`, borderRadius: 12, padding: '2px 9px' }}>Cronograma · {currentConfig.cronoName ?? selectedCronoId}</span>}
              </h3>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                {currentConfig.entregables.length} entregables · {totalActivities} actividades · {totalEtapas} etapas definidas
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Start date con detección de festivos */}
            {(() => {
              const isHolidayDate = holidayDates.has(startDate);
              const isDow = startDate ? [0,6].includes(new Date(startDate+'T12:00:00').getDay()) : false;
              const isInvalid = isHolidayDate || isDow;
              const allHolidays = adminStore.getHolidays();
              const hitHoliday  = allHolidays.find(h=>h.date===startDate);
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                    background: isInvalid ? '#fef2f2' : '#f8fafc',
                    border: `1px solid ${isInvalid ? '#fecaca' : '#e2e8f0'}`, borderRadius: 8 }}>
                    <CalendarDays size={12} color={isInvalid ? '#dc2626' : '#64748b'}/>
                    <label style={{ fontSize: 10, color: isInvalid ? '#dc2626' : '#64748b' }}>Inicio:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => {
                        const newStart = e.target.value;
                        const labels = computeWeekLabels(newStart, currentConfig.totalWeeks, holidayDates);
                        updateConfig({ startDate: newStart, weekLabels: labels });
                      }}
                      style={{ padding: '2px 6px', fontSize: 11, fontWeight: 600,
                        border: 'none', borderRadius: 5, outline: 'none',
                        background: 'transparent', cursor: 'pointer',
                        color: isInvalid ? '#dc2626' : '#111' }}
                    />
                  </div>
                  {/* Aviso si cae en festivo o fin de semana */}
                  {isInvalid && (
                    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:6 }}>
                      <span style={{ fontSize:10, color:'#dc2626', fontWeight:500 }}>
                        ⚠ {hitHoliday ? `Festivo: ${hitHoliday.name}` : 'Fin de semana'} — elige un día hábil
                      </span>
                    </div>
                  )}
                  {/* Mini lista de festivos cercanos */}
                  {startDate && (() => {
                    const base = new Date(startDate+'T12:00:00');
                    const near = allHolidays.filter(h => {
                      const d = new Date(h.date+'T12:00:00');
                      const diff = (d.getTime()-base.getTime())/(1000*60*60*24);
                      return diff >= 0 && diff <= 30;
                    }).slice(0,3);
                    if (!near.length) return null;
                    return (
                      <div style={{ padding:'5px 10px', background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:6 }}>
                        <p style={{ margin:'0 0 3px', fontSize:9, fontWeight:600, color:'#a16207', textTransform:'uppercase', letterSpacing:'.04em' }}>Festivos próximos</p>
                        {near.map(h=>(
                          <p key={h.date} style={{ margin:'1px 0', fontSize:10, color:'#92400e' }}>
                            🗓 {h.date.slice(5).replace('-','/')} · {h.name}
                          </p>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Weeks editor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <Clock size={12} color="#64748b"/>
              <label style={{ fontSize: 10, color: '#64748b' }}>Semanas:</label>
              <input
                type="number" min={4} max={52} value={currentConfig.totalWeeks}
                onChange={e => {
                  const weeks = Math.max(4, Math.min(52, +e.target.value || 10));
                  const labels = computeWeekLabels(startDate, weeks, holidayDates);
                  updateConfig({ totalWeeks: weeks, weekLabels: labels });
                }}
                style={{ width: 40, padding: '2px 4px', fontSize: 11, fontWeight: 600, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none' }}
              />
            </div>

            {/* Modo de ponderación — 'actividad-semana' replica el cálculo del Excel del PM */}
            {(() => {
              const modo: PesoModo = currentConfig.pesoModo ?? PESO_MODO_DEFAULT;
              const porSemana = modo === 'actividad-semana';
              const fases = currentConfig.entregables.map(e => ({ id: e.id, label: e.label, activities: e.activities }));
              const casillas = fases.reduce((s, f) => s + marcasFase(f), 0);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: porSemana ? '#f0fdfa' : '#f8fafc', border: `1px solid ${porSemana ? '#99f6e4' : '#e2e8f0'}`, borderRadius: 8 }}>
                  <BarChart3 size={12} color={porSemana ? '#0d9488' : '#64748b'}/>
                  <label style={{ fontSize: 10, color: '#64748b' }}>Ponderación:</label>
                  <select
                    value={modo}
                    onChange={e => updateConfig({ pesoModo: e.target.value as PesoModo })}
                    style={{ fontSize: 10, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 5px', background: '#fff', cursor: 'pointer', color: porSemana ? '#0f766e' : '#475569' }}
                  >
                    <option value="actividad">Por actividad</option>
                    <option value="actividad-semana">Por actividad-semana (Excel)</option>
                  </select>
                  {porSemana && casillas > 0 && (
                    <span title={`Factor global = 100 / ${casillas} casillas`}
                      style={{ fontSize: 9, color: '#0f766e', fontWeight: 600 }}>
                      {casillas} ⬚ · {(100 / casillas).toFixed(4)}
                    </span>
                  )}
                </div>
              );
            })()}

            <button onClick={saveConfig} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              fontSize: 12, background: saved ? '#f0fdf4' : dirty ? '#fff' : '#f8fafc',
              color: saved ? '#15803d' : dirty ? '#374151' : '#94a3b8',
              border: `1px solid ${saved ? '#86efac' : dirty ? '#d1d5db' : '#e2e8f0'}`,
              borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition: 'all .2s',
            }}>
              <Save size={13}/> {saved ? '¡Guardado!' : 'Guardar'}
            </button>

            <button onClick={generatePlan} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
              fontSize: 12, background: '#dc2626', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
            }}>
              <ArrowRight size={14}/> Generar Plan de Trabajo
            </button>
          </div>
        </div>

        {/* ── Cronogramas del proyecto ─────────────────────────────────────── */}
        <div style={{ marginBottom: 14, padding: '10px 16px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginRight: 4 }}>Cronogramas</span>
            {projectCronos.map(c => {
              const active = c.cronoId === selectedCronoId;
              return (
                <button key={c.key} onClick={() => setSelectedCronoId(c.cronoId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', fontSize: 11, fontWeight: active ? 600 : 500,
                    background: active ? color : '#fff', color: active ? '#fff' : '#374151',
                    border: `0.5px solid ${active ? color : '#e2e8f0'}`, borderRadius: 20, cursor: 'pointer' }}>
                  {c.name}
                  <span style={{ fontSize: 8, opacity: .7 }}>{c.generated ? '✓' : '—'}</span>
                </button>
              );
            })}
            <button onClick={() => setNewCronoOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#7c3aed',
                background: '#f5f3ff', border: '0.5px dashed #c4b5fd', borderRadius: 20, cursor: 'pointer' }}>
              + Cronograma
            </button>
            {selectedCronoId && (
              <button onClick={() => deleteCronograma(planKey)} title="Eliminar este cronograma"
                style={{ marginLeft: 'auto', padding: '4px 9px', fontSize: 10, color: '#dc2626', background: '#fff', border: '0.5px solid #fecaca', borderRadius: 7, cursor: 'pointer' }}>
                Eliminar cronograma
              </button>
            )}
          </div>
          {newCronoOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '10px 12px', background: '#fafafe', border: '0.5px solid #ede9fe', borderRadius: 8, flexWrap: 'wrap' }}>
              <input autoFocus value={newCronoName} onChange={e => setNewCronoName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createCronograma(); if (e.key === 'Escape') setNewCronoOpen(false); }}
                placeholder="Nombre · ej: Input, Output, Randómico, FICO 2.0…"
                style={{ flex: 1, minWidth: 220, padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e8f0', borderRadius: 7 }}/>
              <select value={newCronoTpl} onChange={e => setNewCronoTpl(e.target.value as 'copy' | 'blank')}
                style={{ padding: '7px 8px', fontSize: 11, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
                <option value="copy">Copiar fases del principal</option>
                <option value="blank">En blanco</option>
              </select>
              <button onClick={createCronograma} disabled={!newCronoName.trim()}
                style={{ padding: '7px 14px', fontSize: 11, fontWeight: 600, color: '#fff', background: newCronoName.trim() ? '#7c3aed' : '#c4b5fd', border: 'none', borderRadius: 7, cursor: newCronoName.trim() ? 'pointer' : 'default' }}>
                Crear
              </button>
              <button onClick={() => setNewCronoOpen(false)} style={{ padding: '7px 10px', fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
              <p style={{ width: '100%', margin: 0, fontSize: 9, color: '#94a3b8' }}>
                Un cronograma es un sub-plan del proyecto con su propia fecha de inicio y semanas (ej. un procesamiento, un tablón, una migración). El % del proyecto se pondera por actividades entre todos sus cronogramas.
              </p>
            </div>
          )}
        </div>

        {/* ── Panel Gestionar Equipo — visible para pm / tech_lead / project_lead ── */}
        {canAccess(role, 'team.manage') && (() => {
          // teamRev en dependencias → re-render cada vez que se toggle un miembro
          const allUsers  = adminStore.getUsers().filter(u => u.active && u.role !== 'account_manager');
          const inProject = (u: { id: string; projectIds: string[] }) =>
            adminStore.getUsers().find(x => x.id === u.id)?.projectIds.includes(selectedProjectId) ?? false;

          function toggleMember(userId: string) {
            const users = adminStore.getUsers();
            const cur   = users.find(u => u.id === userId);
            if (!cur) return;
            const alreadyIn = cur.projectIds.includes(selectedProjectId);
            const updated = users.map(u =>
              u.id !== userId ? u : {
                ...u,
                projectIds: alreadyIn
                  ? u.projectIds.filter(id => id !== selectedProjectId)
                  : [...u.projectIds, selectedProjectId],
              }
            );
            adminStore.saveUsers(updated);
            setTeamRev(v => v + 1); // ← dispara re-render reactivo
          }

          const ROLE_LABEL_SHORT: Record<string, string> = {
            account_manager: 'Gerente', pm: 'PM',
            tech_lead: 'Líder Téc.', developer: 'Developer',
          };
          const ROLE_COLOR: Record<string, string> = {
            account_manager: '#dc2626', pm: '#7c3aed',
            tech_lead: '#0d9488', developer: '#374151',
          };

          const memberCount  = allUsers.filter(u => inProject(u)).length;
          const searchLow    = teamSearch.toLowerCase();
          const filteredUsers = teamSearch
            ? allUsers.filter(u => u.name.toLowerCase().includes(searchLow) || (u.role ?? '').toLowerCase().includes(searchLow))
            : allUsers;
          // siempre primero los que ya están en el proyecto
          const sortedUsers = [...filteredUsers].sort((a, b) => {
            const aIn = inProject(a) ? 0 : 1;
            const bIn = inProject(b) ? 0 : 1;
            return aIn - bIn || a.name.localeCompare(b.name);
          });

          return (
            <div style={{ marginBottom: 14, border: '0.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header del panel */}
              <button
                onClick={() => { setTeamOpen(v => !v); setTeamSearch(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  background: teamOpen ? '#f8fafc' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <Users size={14} color="#64748b"/>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', flex: 1 }}>
                  Equipo del proyecto
                  {memberCount > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: '#7c3aed' }}>{memberCount} asignado{memberCount !== 1 ? 's' : ''}</span>}
                </span>
                {/* Avatares resumen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 8 }}>
                  {allUsers.filter(u => inProject(u)).slice(0, 5).map(u => (
                    <div key={u.id} style={{ width: 22, height: 22, borderRadius: '50%', background: u.avatarColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 700, color: '#fff', border: '1.5px solid #fff', marginLeft: -4 }}
                      title={u.name}>
                      {u.initials}
                    </div>
                  ))}
                  {memberCount > 5 && <span style={{ fontSize: 9, color: '#64748b', marginLeft: 2 }}>+{memberCount - 5}</span>}
                  {memberCount === 0 && <span style={{ fontSize: 10, color: '#94a3b8' }}>Sin equipo asignado</span>}
                </div>
                {teamOpen ? <ChevronDown size={13} color="#94a3b8"/> : <ChevronRight size={13} color="#94a3b8"/>}
              </button>

              {/* Cuerpo del panel */}
              {teamOpen && (
                <div style={{ padding: '12px 16px', borderTop: '0.5px solid #f1f5f9', background: '#fafafe' }}>
                  {/* Barra de búsqueda */}
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                      style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      autoFocus
                      placeholder={`Buscar entre ${allUsers.length} personas…`}
                      value={teamSearch}
                      onChange={e => setTeamSearch(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '100%', padding: '7px 10px 7px 28px', fontSize: 11, border: '0.5px solid #e2e8f0',
                        borderRadius: 7, background: '#fff', outline: 'none', boxSizing: 'border-box',
                        color: '#374151' }}
                    />
                    {teamSearch && (
                      <button onClick={() => setTeamSearch('')}
                        style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                          border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {sortedUsers.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>
                      Sin resultados para "{teamSearch}"
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                      {sortedUsers.map(u => {
                        const active = inProject(u);
                        return (
                          <button key={u.id + '-' + teamRev} onClick={() => toggleMember(u.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                              border: `1.5px solid ${active ? u.avatarColor + '60' : '#e2e8f0'}`,
                              borderRadius: 8, background: active ? u.avatarColor + '12' : '#fff',
                              cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.avatarColor,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {u.initials}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.name}
                              </div>
                              <div style={{ fontSize: 9, color: ROLE_COLOR[u.role] ?? '#64748b', fontWeight: 500 }}>
                                {ROLE_LABEL_SHORT[u.role] ?? u.role}
                              </div>
                            </div>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${active ? u.avatarColor : '#d1d5db'}`,
                              background: active ? u.avatarColor : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {active && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Entregables', val: currentConfig.entregables.length, icon: <CheckSquare size={16} color="#7c3aed"/>, bg: '#f5f3ff' },
            { label: 'Actividades', val: totalActivities, icon: <LayoutList size={16} color="#0369a1"/>, bg: '#eff6ff' },
            { label: 'Con etapas',  val: totalEtapas > 0 ? currentConfig.entregables.reduce((s,e) => s + e.activities.filter(a=>(a.etapas?.length??0)>0).length,0) : 0, icon: <Settings2 size={16} color="#0d9488"/>, bg: '#f0fdfa' },
            { label: 'Semanas',     val: currentConfig.totalWeeks, icon: <CalendarDays size={16} color="#d97706"/>, bg: '#fffbeb' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {s.icon}
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{s.val}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Vista: matriz (todo junto, como el Excel) o lista (detalle por actividad) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {([['matriz', 'Matriz', <Grid3x3 size={12} key="g"/>], ['lista', 'Detalle', <List size={12} key="l"/>]] as const).map(([v, lbl, ic]) => (
              <button key={v} onClick={() => setVista(v as 'matriz' | 'lista')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11, cursor: 'pointer',
                  border: 'none', fontWeight: vista === v ? 700 : 500,
                  background: vista === v ? '#0d9488' : '#fff', color: vista === v ? '#fff' : '#64748b',
                }}>
                {ic} {lbl}
              </button>
            ))}
          </div>
          <button onClick={() => setShowPlantillas(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11, cursor: 'pointer', border: '1px solid #c4b5fd', borderRadius: 8, background: showPlantillas ? '#ede9fe' : '#faf5ff', color: '#6d28d9', fontWeight: 600 }}>
            <Sparkles size={12}/> Plantillas
          </button>
          <button onClick={() => guardarComoPlantilla('proyecto')}
            title="Guarda todas las fases de este cronograma como una plantilla reutilizable"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b', fontWeight: 600 }}>
            <Save size={12}/> Guardar como plantilla
          </button>
          <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
            {vista === 'matriz'
              ? 'Pintá las semanas de cada actividad arrastrando, como en el Excel.'
              : 'Editá nombres, etapas de avance y el detalle de cada actividad.'}
          </p>
        </div>

        {/* Plantillas — reemplazan las fases y actividades del cronograma actual */}
        {showPlantillas && (
          <div style={{ marginBottom: 14, padding: '12px 14px', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#6d28d9' }}>Plantillas</p>
              <div style={{ display: 'flex', border: '1px solid #ddd6fe', borderRadius: 7, overflow: 'hidden' }}>
                {([['proyecto', 'Proyecto completo'], ['entregable', 'Un entregable']] as const).map(([v, lbl]) => (
                  <button key={v} onClick={() => setTipoPlantilla(v)}
                    style={{
                      padding: '4px 11px', fontSize: 10, cursor: 'pointer', border: 'none',
                      fontWeight: tipoPlantilla === v ? 700 : 500,
                      background: tipoPlantilla === v ? '#6d28d9' : '#fff', color: tipoPlantilla === v ? '#fff' : '#7c3aed',
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 10, color: '#7c3aed' }}>
              {tipoPlantilla === 'proyecto'
                ? <>Arman el cronograma completo. <b>Reemplazan</b> lo que haya en <b>{currentConfig.cronoName ?? CRONO_MAIN_NAME}</b>.</>
                : <>Una fase suelta, con sus actividades y semanas. Se <b>agrega</b> al final del cronograma actual; podés meter la misma más de una vez.</>}
              {' '}Las duraciones son la mediana de los cronogramas reales de MIGBD y FICO; después ajustás en la matriz.
            </p>

            {tipoPlantilla === 'entregable' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 8, marginBottom: 12 }}>
                {BLOQUES.map(b => {
                  const r = resumenBloque(b);
                  return (
                    <button key={b.id}
                      onClick={() => setPreview({
                        titulo: b.label,
                        descripcion: `${r.actividades} actividades encadenadas · ${r.casillas} casillas`,
                        modo: 'agrega',
                        construir: sem => insertarBloque(currentConfig.entregables, b, sem),
                        onAplicar: aplicarPreview,
                      })}
                      style={{ textAlign: 'left', padding: '9px 11px', border: '1px solid #ddd6fe', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', marginBottom: 2 }}>{b.label}</div>
                      <div style={{ fontSize: 9, color: '#94a3b8' }}>
                        {r.actividades} actividades · {r.casillas} casillas · {r.semanas} semanas
                        {r.bbva > 0 && <> · <span style={{ color: '#1d4ed8' }}>{r.bbva} de BBVA</span></>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {tipoPlantilla === 'proyecto' && (<>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>
              {PLANTILLAS.map(pl => {
                const nAct = pl.bloques.reduce((s, b) => s + b.actividades.length, 0);
                return (
                  <button key={pl.id}
                    onClick={() => setPreview({
                      titulo: pl.nombre, descripcion: pl.descripcion, modo: 'reemplaza',
                      construir: () => generarDesdePlantilla(pl, {
                        projectId: currentConfig.projectId,
                        cronoId: currentConfig.cronoId,
                        cronoName: currentConfig.cronoName,
                        startDate: currentConfig.startDate ?? startDate,
                      }).entregables,
                      onAplicar: aplicarPreview,
                    })}
                    style={{ textAlign: 'left', padding: '9px 11px', border: '1px solid #ddd6fe', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', marginBottom: 2 }}>{pl.nombre}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>{pl.bloques.length} fases · {nAct} actividades</div>
                    <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.35 }}>{pl.descripcion}</div>
                  </button>
                );
              })}
            </div>
            </>)}

            {/* Plantillas propias — guardadas desde este mismo módulo */}
            {(() => {
              // Solo las que este usuario puede abrir (propias, compartidas, catálogo o con acceso aprobado).
              const solicitudes = adminStore.getSolicitudesPlantilla();
              const mias = propias.filter(p =>
                p.tipo === tipoPlantilla &&
                puedeVerPlantilla(p, user?.id ?? '', (user?.role ?? 'developer') as never, solicitudes));
              if (!mias.length) return null;
              return (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #ddd6fe' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#6d28d9' }}>Mis plantillas</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>
                    {mias.map(pl => {
                      const nAct = pl.entregables.reduce((s, e) => s + e.activities.length, 0);
                      return (
                        <div key={pl.id} style={{ padding: '9px 11px', border: '1px solid #ddd6fe', borderRadius: 8, background: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'start', gap: 6 }}>
                            <button onClick={() => setPreview({
                              titulo: pl.nombre, descripcion: pl.descripcion,
                              modo: pl.tipo === 'proyecto' ? 'reemplaza' : 'agrega',
                              construir: sem => {
                                const copia: PlanEntregableConfig[] = JSON.parse(JSON.stringify(pl.entregables));
                                if (pl.tipo === 'proyecto') return copia;
                                // Al agregar, se corre la fase para que arranque en la semana elegida.
                                const ini = Math.min(...copia[0].activities.map(a => a.startWeek), 1);
                                const delta = sem - ini;
                                const movida = {
                                  ...copia[0],
                                  activities: copia[0].activities.map(a => ({
                                    ...a,
                                    startWeek: a.startWeek + delta,
                                    endWeek: a.endWeek + delta,
                                    weeks: (a.weeks ?? []).map(w => w + delta),
                                  })),
                                };
                                const usados = new Set(currentConfig.entregables.map(e => e.id));
                                let id = movida.id, n = 2;
                                while (usados.has(id)) id = `${movida.id}-${n++}`;
                                return [...currentConfig.entregables, { ...movida, id }];
                              },
                              onAplicar: aplicarPreview,
                            })} style={{ flex: 1, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9' }}>{pl.nombre}</div>
                              <div style={{ fontSize: 9, color: '#94a3b8' }}>
                                {pl.entregables.length} fases · {nAct} actividades
                                {pl.ownerName && pl.ownerId !== user?.id && <> · de {pl.ownerName}</>}
                                {alcanceDe(pl) !== 'privada' && <> · {alcanceDe(pl)}</>}
                              </div>
                              {pl.descripcion && <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>{pl.descripcion}</div>}
                            </button>
                            <button onClick={() => {
                              if (!confirm(`¿Borrar la plantilla "${pl.nombre}"?`)) return;
                              const next = propias.filter(x => x.id !== pl.id);
                              setPropias(next); adminStore.savePlantillasPropias(next);
                            }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#fca5a5', visibility: (!pl.ownerId || pl.ownerId === user?.id) ? 'visible' : 'hidden' }}>
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {preview && (
          <PreviewPlantilla
            {...preview}
            totalWeeksActual={currentConfig.totalWeeks}
            weekLabels={currentConfig.weekLabels}
            fasesActuales={currentConfig.entregables.length}
            onCerrar={() => setPreview(null)}
          />
        )}

        {vista === 'matriz' ? (
          <MatrizCronograma
            entregables={currentConfig.entregables}
            totalWeeks={currentConfig.totalWeeks}
            weekLabels={currentConfig.weekLabels}
            onChange={ents => updateConfig({ entregables: ents })}
          />
        ) : (
          <>
            {/* Tip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11 }}>💡</span>
              <p style={{ margin: 0, fontSize: 11, color: '#92400e' }}>
                <strong>Tip:</strong> expande una actividad para definir sus etapas de avance. Los pesos deben sumar 100% — esto controla la propagación del % en el Plan de Trabajo.
              </p>
            </div>

            {/* Entregables */}
            {currentConfig.entregables.map((ent, i) => (
              <EntregablePanel
                key={ent.id} ent={ent} entIdx={i} totalWeeks={currentConfig.totalWeeks}
                porSemana={(currentConfig.pesoModo ?? PESO_MODO_DEFAULT) === 'actividad-semana'}
                weekLabels={currentConfig.weekLabels}
                onChange={e => updateEntregable(i, e)}
                onDelete={() => deleteEntregable(i)}
                onSaveTemplate={() => guardarComoPlantilla('entregable', i)}
              />
            ))}

            {/* Add entregable */}
            <button onClick={addEntregable} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              width: '100%', marginTop: 4, borderRadius: 10, cursor: 'pointer',
              background: '#f8fafc', border: '1.5px dashed #d1d5db',
              fontSize: 12, color: '#64748b', justifyContent: 'center',
              fontWeight: 500,
            }}>
              <Plus size={14}/> Agregar entregable
            </button>
          </>
        )}

        {/* Bottom CTA */}
        <div style={{ marginTop: 24, padding: '16px 20px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              ¿Listo para generar el plan?
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
              Se guardará la configuración y podrás ver el Gantt en Plan de Trabajo.
            </p>
          </div>
          <button onClick={generatePlan} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px',
            fontSize: 13, background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700,
            flexShrink: 0,
          }}>
            Generar Plan de Trabajo <ArrowRight size={15}/>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
