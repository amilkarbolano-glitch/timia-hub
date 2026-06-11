import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { PROJECTS } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanActivity {
  name: string;
  pct: number;
  pctExp: number;
  startWeek: number;
  endWeek: number;
  bbva?: boolean;
}

interface PlanEntregable {
  id: string;
  name: string;
  pctReal: number;
  pctExp: number;
  activities: PlanActivity[];
}

interface WorkPlan {
  projectId: string;
  respBBVA: string;
  respTimia: string;
  pasos: string[];
  alertas: string[];
  bloqueantes: string[];
  entregables: PlanEntregable[];
}

// ─── Semanas del plan (FICO: ene-abr 2026) ───────────────────────────────────

const WEEKS = [
  {l:'S1', d:'26/01'},{l:'S2', d:'02/02'},{l:'S3', d:'09/02'},
  {l:'S4', d:'16/02'},{l:'S5', d:'23/02'},{l:'S6', d:'02/03'},
  {l:'S7', d:'09/03'},{l:'S8', d:'16/03'},{l:'S9', d:'24/03'},
  {l:'S10',d:'31/03'},{l:'S11',d:'09/04'},{l:'S12',d:'16/04'},
  {l:'S13',d:'23/04'},
];

const TOTAL_WEEKS = 13;
// Jun 2026 → plan terminó en S13, mostramos todo ejecutado/pasado
const CURRENT_WEEK = 14;
const CELL_W = 38;

// ─── Datos de planes de trabajo ───────────────────────────────────────────────

const WORK_PLANS: WorkPlan[] = [
  // ── FICO: plan completo del PPTX ────────────────────────────────────────────
  {
    projectId: 'FICO',
    respBBVA: 'Alfonso Caro · Bibiana Andres Vargas',
    respTimia: 'Juan Pablo Arévalo M.',
    pasos: [
      'Cerrar circuito validación Gobierno Técnico con BBVA',
      'Iniciar construcción procesamiento Spark-Scala (ADA)',
      'Gestionar acceso Control-M distribuido',
    ],
    alertas: [
      'Definición funcional aún no cerrada con BBVA',
      'ANS "Validación calidad datos LIVE" próximo a vencer',
    ],
    bloqueantes: [
      'Pendiente validación MSD por parte de BBVA',
    ],
    entregables: [
      {
        id: 'doc', name: 'I. Documentación y gobierno',
        pctReal: 37.1, pctExp: 36.8,
        activities: [
          { name:'Análisis y resolución de dudas',              pct:50,  pctExp:50,  startWeek:1,  endWeek:2 },
          { name:'Elaboración diccionario técnico (370 campos)',pct:50,  pctExp:50,  startWeek:1,  endWeek:2 },
          { name:'Inicialización en Nebula',                    pct:100, pctExp:100, startWeek:1,  endWeek:1, bbva:true },
          { name:'Circuito validación Gobierno Técnico',        pct:0,   pctExp:0,   startWeek:3,  endWeek:5, bbva:true },
          { name:'Creación documentación técnica ETL y mapeo',  pct:50,  pctExp:50,  startWeek:1,  endWeek:3 },
          { name:'Construcción Modelo Solución del Dato (MSD)', pct:50,  pctExp:50,  startWeek:2,  endWeek:3 },
          { name:'Circuito validación MSD',                     pct:0,   pctExp:0,   startWeek:3,  endWeek:5, bbva:true },
          { name:'Despliegue esquemas entorno Work',            pct:0,   pctExp:0,   startWeek:4,  endWeek:5, bbva:true },
          { name:'Solicitud y circuito de ACLs',                pct:0,   pctExp:0,   startWeek:4,  endWeek:5, bbva:true },
          { name:'Solicitud despliegue Live',                   pct:0,   pctExp:0,   startWeek:5,  endWeek:5, bbva:true },
          { name:'Acompañamiento en Definición Funcional',      pct:80,  pctExp:80,  startWeek:1,  endWeek:2, bbva:true },
          { name:'Acompañamiento validación del Notebook',      pct:100, pctExp:100, startWeek:1,  endWeek:1, bbva:true },
        ],
      },
      {
        id: 'ada', name: 'II. Componentes ADA',
        pctReal: 5.3, pctExp: 5.3,
        activities: [
          { name:'Gestión repos Bitbucket · Procesamiento',     pct:100, pctExp:100, startWeek:1,  endWeek:1, bbva:true },
          { name:'Construcción procesamiento Spark · Scala',    pct:0,   pctExp:0,   startWeek:2,  endWeek:7 },
          { name:'Construcción Test unitarios y Aceptación',    pct:0,   pctExp:0,   startWeek:6,  endWeek:8 },
          { name:'Construcción reglas calidad MVP (Hammurabi)', pct:0,   pctExp:0,   startWeek:5,  endWeek:7 },
          { name:'Construcción Smart Cleaner para procesamiento',pct:0,  pctExp:0,   startWeek:5,  endWeek:6 },
          { name:'Pruebas en entorno local',                    pct:0,   pctExp:0,   startWeek:7,  endWeek:8 },
          { name:'Despliegue y pruebas entornos Work',          pct:0,   pctExp:0,   startWeek:8,  endWeek:8 },
          { name:'Generación Datos Sandbox · validación',       pct:0,   pctExp:0,   startWeek:8,  endWeek:9,  bbva:true },
          { name:'Certificación calidad por equipo QA',         pct:0,   pctExp:0,   startWeek:9,  endWeek:10, bbva:true },
          { name:'Despliegue producción componentes ADA',       pct:0,   pctExp:0,   startWeek:11, endWeek:11 },
          { name:'Acompañamiento validación ADA Live',          pct:0,   pctExp:0,   startWeek:11, endWeek:13, bbva:true },
        ],
      },
      {
        id: 'auto', name: 'III. Automatización y orquestación',
        pctReal: 0.0, pctExp: 0.0,
        activities: [
          { name:'Gestión acceso Control-M distribuido',        pct:0,   pctExp:0,   startWeek:3,  endWeek:4, bbva:true },
          { name:'Definición de la automatización',             pct:0,   pctExp:0,   startWeek:5,  endWeek:5 },
          { name:'Construcción Mallas Control-M distribuido',   pct:0,   pctExp:0,   startWeek:6,  endWeek:8 },
          { name:'Pruebas entornos Work · Mallas Control-M',    pct:0,   pctExp:0,   startWeek:7,  endWeek:8 },
          { name:'Elaboración documentación Mallas ADA',        pct:0,   pctExp:0,   startWeek:7,  endWeek:8 },
          { name:'Certificación mallas Control-M Distribuido',  pct:0,   pctExp:0,   startWeek:8,  endWeek:10, bbva:true },
          { name:'Instalación mallas producción',               pct:0,   pctExp:0,   startWeek:10, endWeek:10, bbva:true },
          { name:'Estabilización procesos en producción',       pct:0,   pctExp:0,   startWeek:11, endWeek:13 },
        ],
      },
    ],
  },

  // ── NGA ──────────────────────────────────────────────────────────────────────
  {
    projectId: 'NGA',
    respBBVA: 'TBD · BBVA',
    respTimia: 'Juan Pablo Arévalo M.',
    pasos: ['Cerrar documentación ETL campos pendientes', 'Validar esquemas en producción', 'Preparar cierre formal del proyecto'],
    alertas: ['Documentación ETL al 80% — retraso mínimo de 1 semana'],
    bloqueantes: [],
    entregables: [
      { id:'doc',  name:'I. Documentación y gobierno', pctReal:91, pctExp:88, activities:[] },
      { id:'etl',  name:'II. Componentes ETL',         pctReal:85, pctExp:80, activities:[] },
      { id:'val',  name:'III. Validación y despliegue',pctReal:95, pctExp:90, activities:[] },
    ],
  },

  // ── CRONOS ───────────────────────────────────────────────────────────────────
  {
    projectId: 'CRONOS',
    respBBVA: 'TBD · BBVA',
    respTimia: 'Juan Pablo Arévalo M.',
    pasos: ['Completar construcción pipeline Spark', 'Iniciar certificación QA', 'Documentar reglas Hammurabi'],
    alertas: ['Construcción reglas Hammurabi retrasada ~1 semana'],
    bloqueantes: [],
    entregables: [
      { id:'doc',  name:'I. Documentación',            pctReal:80, pctExp:75, activities:[] },
      { id:'proc', name:'II. Procesamiento Spark',     pctReal:65, pctExp:70, activities:[] },
      { id:'auto', name:'III. Automatización',         pctReal:40, pctExp:50, activities:[] },
    ],
  },

  // ── SDM1 ─────────────────────────────────────────────────────────────────────
  {
    projectId: 'SDM1',
    respBBVA: 'TBD · BBVA',
    respTimia: 'Diego Sánchez',
    pasos: ['Completar pruebas entorno Work', 'Escalar bloqueo con BBVA', 'Replantear cronograma'],
    alertas: ['2 actividades bloqueadas esperando validación banco', 'Avance 10% por debajo de lo esperado'],
    bloqueantes: ['Validación entorno Work por BBVA pendiente desde S6'],
    entregables: [
      { id:'doc',  name:'I. Documentación',            pctReal:55, pctExp:65, activities:[] },
      { id:'comp', name:'II. Componentes ADA',         pctReal:48, pctExp:60, activities:[] },
      { id:'int',  name:'III. Integración',            pctReal:30, pctExp:40, activities:[] },
    ],
  },

  // ── SDM2 ─────────────────────────────────────────────────────────────────────
  {
    projectId: 'SDM2',
    respBBVA: 'TBD · BBVA',
    respTimia: 'Diego Sánchez',
    pasos: ['Finalizar pruebas entorno Work', 'Preparar documentación Control-M', 'Iniciar proceso de certificación'],
    alertas: [],
    bloqueantes: [],
    entregables: [
      { id:'doc',  name:'I. Documentación',            pctReal:70, pctExp:68, activities:[] },
      { id:'comp', name:'II. Componentes',             pctReal:65, pctExp:62, activities:[] },
      { id:'auto', name:'III. Automatización',         pctReal:55, pctExp:50, activities:[] },
    ],
  },

  // ── MURIC ────────────────────────────────────────────────────────────────────
  {
    projectId: 'MURIC',
    respBBVA: 'TBD · BBVA',
    respTimia: 'Diego Sánchez',
    pasos: ['Completar certificación QA', 'Preparar despliegue a producción'],
    alertas: [],
    bloqueantes: [],
    entregables: [
      { id:'doc',  name:'I. Documentación',            pctReal:72, pctExp:70, activities:[] },
      { id:'comp', name:'II. Componentes',             pctReal:68, pctExp:65, activities:[] },
      { id:'auto', name:'III. Automatización',         pctReal:60, pctExp:58, activities:[] },
    ],
  },

  // ── BCBS239 ──────────────────────────────────────────────────────────────────
  {
    projectId: 'BCBS239',
    respBBVA: 'TBD · BBVA',
    respTimia: 'Diego Sánchez',
    pasos: ['Despliegue Control-M producción — URGENTE', 'Reunión de crisis con BBVA esta semana'],
    alertas: [
      '3 actividades bloqueadas — riesgo ANS CRÍTICA activo',
      'Proyecto con mayor riesgo del portafolio (48% vs 60% esperado)',
    ],
    bloqueantes: [
      'Despliegue Control-M bloqueado por ambientes BBVA',
      'Validación datos producción pendiente desde hace 3 semanas',
    ],
    entregables: [
      { id:'doc',  name:'I. Documentación',            pctReal:48, pctExp:60, activities:[] },
      { id:'comp', name:'II. Componentes ADA',         pctReal:35, pctExp:55, activities:[] },
      { id:'auto', name:'III. Automatización',         pctReal:15, pctExp:45, activities:[] },
    ],
  },

  // ── BRICKELL ─────────────────────────────────────────────────────────────────
  {
    projectId: 'BRICKELL',
    respBBVA: 'TBD · BBVA',
    respTimia: 'Diego Sánchez',
    pasos: ['Finalizar última tarea pendiente', 'Preparar documentación de cierre', 'Presentar entregables finales'],
    alertas: [],
    bloqueantes: [],
    entregables: [
      { id:'doc',   name:'I. Documentación',           pctReal:88, pctExp:85, activities:[] },
      { id:'comp',  name:'II. Componentes',            pctReal:90, pctExp:88, activities:[] },
      { id:'close', name:'III. Cierre',                pctReal:80, pctExp:85, activities:[] },
    ],
  },

  // ── OPTIM ────────────────────────────────────────────────────────────────────
  {
    projectId: 'OPTIM',
    respBBVA: 'N/A · Credicorp Capital',
    respTimia: 'David Huamán',
    pasos: ['Validación final Credicorp Capital', 'Documentación de cierre de proyecto'],
    alertas: [],
    bloqueantes: [],
    entregables: [
      { id:'doc',  name:'I. Documentación',            pctReal:85, pctExp:82, activities:[] },
      { id:'comp', name:'II. Componentes',             pctReal:90, pctExp:88, activities:[] },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difColor(dif: number) {
  if (dif >= 0) return '#15803d';
  if (dif < -5) return '#dc2626';
  return '#d97706';
}
function difBg(dif: number) {
  if (dif >= 0) return '#dcfce7';
  if (dif < -5) return '#fef2f2';
  return '#fef9c3';
}
function fmt1(n: number) {
  const d = parseFloat(n.toFixed(1));
  return d > 0 ? `+${d}%` : `${d}%`;
}

// ─── Gantt Activity Row ───────────────────────────────────────────────────────

function GanttRow({ act, idx }: { act: PlanActivity; idx: number }) {
  const span = act.endWeek - act.startWeek + 1;
  const executedCells = Math.round((act.pct / 100) * span);

  return (
    <tr style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe' }}>
      {/* Nombre */}
      <td style={{
        padding: '5px 10px', fontSize: 11, color: '#374151',
        borderRight: '0.5px solid #e2e8f0',
        minWidth: 230, maxWidth: 230, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {act.bbva && (
            <span style={{
              fontSize: 8, padding: '1px 4px', borderRadius: 3,
              background: '#dbeafe', color: '#1d4ed8', fontWeight: 700,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>BBVA</span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {act.name}
          </span>
        </div>
      </td>
      {/* % badge */}
      <td style={{ textAlign: 'center', padding: '5px 6px', borderRight: '0.5px solid #e2e8f0', width: 50 }}>
        <span style={{
          display: 'inline-block', padding: '2px 6px', borderRadius: 6,
          fontSize: 10, fontWeight: 600,
          background: act.pct >= 100 ? '#dcfce7' : act.pct > 0 ? '#fef9c3' : '#f1f5f9',
          color: act.pct >= 100 ? '#15803d' : act.pct > 0 ? '#a16207' : '#94a3b8',
        }}>
          {act.pct}%
        </span>
      </td>
      {/* Celdas de semana */}
      {Array.from({ length: TOTAL_WEEKS }).map((_, wi) => {
        const weekNum = wi + 1;
        const inSpan = weekNum >= act.startWeek && weekNum <= act.endWeek;
        const relPos = weekNum - act.startWeek;
        const isExec = inSpan && relPos < executedCells;
        const isFirst = weekNum === act.startWeek;
        const isLast = weekNum === act.endWeek;
        const isPast = weekNum < CURRENT_WEEK;
        return (
          <td key={wi} style={{ width: CELL_W, minWidth: CELL_W, padding: '4px 2px', borderLeft: '0.5px solid #f1f5f9' }}>
            {inSpan && (
              <div style={{
                height: 14, margin: '2px 1px',
                background: isExec ? '#0d9488' : (isPast ? 'rgba(13,148,136,0.25)' : 'rgba(13,148,136,0.18)'),
                borderRadius: `${isFirst ? 3 : 0}px ${isLast ? 3 : 0}px ${isLast ? 3 : 0}px ${isFirst ? 3 : 0}px`,
              }} />
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Entregable Section ───────────────────────────────────────────────────────

function EntregableSection({ block }: { block: PlanEntregable }) {
  const dif = parseFloat((block.pctReal - block.pctExp).toFixed(1));

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Cabecera entregable */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#9f1239' }}>{block.name}</h4>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'center', padding: '4px 12px', background: '#374151', borderRadius: 7 }}>
            <div style={{ fontSize: 8, color: '#9ca3af', marginBottom: 1 }}>Avance real</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{block.pctReal}%</div>
          </div>
          <div style={{ textAlign: 'center', padding: '4px 12px', background: '#4b5563', borderRadius: 7 }}>
            <div style={{ fontSize: 8, color: '#9ca3af', marginBottom: 1 }}>Avance esperado</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{block.pctExp}%</div>
          </div>
          <div style={{ textAlign: 'center', padding: '4px 12px', background: difBg(dif), borderRadius: 7 }}>
            <div style={{ fontSize: 8, color: difColor(dif), marginBottom: 1 }}>Diferencia</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: difColor(dif) }}>{fmt1(dif)}</div>
          </div>
        </div>
      </div>

      {block.activities.length > 0 ? (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '0.5px solid #e2e8f0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 288 + TOTAL_WEEKS * CELL_W }}>
            <thead>
              <tr style={{ background: '#881337' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#fff', fontWeight: 600, minWidth: 230 }}>
                  Actividades / Avance
                </th>
                <th style={{ padding: '6px', textAlign: 'center', fontSize: 10, color: '#fff', fontWeight: 600, width: 50 }}>%</th>
                {WEEKS.map((w, i) => (
                  <th key={i} style={{ width: CELL_W, padding: '4px 2px', textAlign: 'center', borderLeft: '0.5px solid rgba(255,255,255,0.15)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: i + 1 === CURRENT_WEEK ? '#fbbf24' : '#fce7f3' }}>{w.l}</div>
                    <div style={{ fontSize: 7, color: '#fbcfe8' }}>{w.d}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.activities.map((act, i) => (
                <GanttRow key={i} act={act} idx={i} />
              ))}
              {/* Leyenda */}
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={2 + TOTAL_WEEKS} style={{ padding: '6px 10px' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 22, height: 10, background: '#0d9488', borderRadius: 2 }} />
                      <span style={{ fontSize: 9, color: '#64748b' }}>Ejecutado</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 22, height: 10, background: 'rgba(13,148,136,0.25)', borderRadius: 2 }} />
                      <span style={{ fontSize: 9, color: '#64748b' }}>Planificado</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>BBVA</span>
                      <span style={{ fontSize: 9, color: '#64748b' }}>Requiere acción banco</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '14px 18px', background: '#f8fafc', borderRadius: 8, border: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color="#94a3b8" />
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
            Detalle de actividades no disponible · Solicitar actualización al líder técnico
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Plan Detail ──────────────────────────────────────────────────────────────

function PlanDetail({ plan }: { plan: WorkPlan }) {
  const color = PROJECTS.find(p => p.id === plan.projectId)?.color ?? '#64748b';
  const overallReal = parseFloat((plan.entregables.reduce((s, e) => s + e.pctReal, 0) / plan.entregables.length).toFixed(1));
  const overallExp = parseFloat((plan.entregables.reduce((s, e) => s + e.pctExp, 0) / plan.entregables.length).toFixed(1));
  const overallDif = parseFloat((overallReal - overallExp).toFixed(1));

  return (
    <div>
      {/* Project header + overall avance */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, padding: '14px 18px',
        background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10,
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color }}>{plan.projectId.slice(0, 2)}</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111' }}>Proyecto {plan.projectId}</h3>
            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
              Resp. Timia: <strong style={{ color: '#64748b' }}>{plan.respTimia}</strong>
              {plan.respBBVA !== 'N/A · Credicorp Capital' && (
                <> · BBVA: <strong style={{ color: '#64748b' }}>{plan.respBBVA}</strong></>
              )}
            </p>
          </div>
        </div>
        {/* AVANCE GENERAL */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'center', padding: '6px 16px', background: '#374151', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Avance real</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{overallReal}%</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 16px', background: '#4b5563', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Avance esperado</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{overallExp}%</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 16px', background: difBg(overallDif), borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: difColor(overallDif), marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>Diferencia</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: difColor(overallDif) }}>{fmt1(overallDif)}</div>
          </div>
        </div>
      </div>

      {/* Resumen de entregables */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${plan.entregables.length}, 1fr)`, gap: 8, marginBottom: 14 }}>
        {plan.entregables.map(e => {
          const dif = parseFloat((e.pctReal - e.pctExp).toFixed(1));
          return (
            <div key={e.id} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#9f1239', lineHeight: 1.3 }}>{e.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{e.pctReal}%</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>real · {e.pctExp}% esp.</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: difColor(dif), marginLeft: 'auto' }}>{fmt1(dif)}</span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(e.pctReal, 100)}%`, height: '100%', background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Siguientes pasos · Alertas · Bloqueantes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle size={13} /> Siguientes pasos
          </p>
          {plan.pasos.length > 0
            ? plan.pasos.map((p, i) => <p key={i} style={{ margin: '3px 0', fontSize: 11, color: '#374151' }}>• {p}</p>)
            : <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Por iniciar</p>
          }
        </div>
        <div style={{ background: plan.alertas.length > 0 ? '#fef9c3' : '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: plan.alertas.length > 0 ? '#a16207' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={13} /> Alertas {plan.alertas.length > 0 && <span style={{ background: '#fde68a', borderRadius: 10, padding: '0 6px', fontSize: 10 }}>{plan.alertas.length}</span>}
          </p>
          {plan.alertas.length > 0
            ? plan.alertas.map((a, i) => <p key={i} style={{ margin: '3px 0', fontSize: 11, color: '#374151' }}>⚠ {a}</p>)
            : <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Sin alertas</p>
          }
        </div>
        <div style={{ background: plan.bloqueantes.length > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: plan.bloqueantes.length > 0 ? '#dc2626' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} /> Bloqueantes {plan.bloqueantes.length > 0 && <span style={{ background: '#fecaca', borderRadius: 10, padding: '0 6px', fontSize: 10 }}>{plan.bloqueantes.length}</span>}
          </p>
          {plan.bloqueantes.length > 0
            ? plan.bloqueantes.map((b, i) => <p key={i} style={{ margin: '3px 0', fontSize: 11, color: '#374151' }}>⛔ {b}</p>)
            : <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Sin bloqueantes</p>
          }
        </div>
      </div>

      {/* Entregables con gantt */}
      {plan.entregables.map(e => (
        <EntregableSection key={e.id} block={e} />
      ))}
    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────

export default function PlanDeTrabajo() {
  const [selected, setSelected] = useState<string>(WORK_PLANS[0].projectId);
  const plan = WORK_PLANS.find(p => p.projectId === selected);

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {/* Sidebar de proyectos */}
      <div style={{ width: 128, flexShrink: 0 }}>
        <p style={{ margin: '0 0 8px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
          Proyectos
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {WORK_PLANS.map(p => {
            const proj = PROJECTS.find(pr => pr.id === p.projectId);
            const color = proj?.color ?? '#64748b';
            const isActive = p.projectId === selected;
            const overall = Math.round(p.entregables.reduce((s, e) => s + e.pctReal, 0) / p.entregables.length);
            const hasBloq = p.bloqueantes.length > 0;
            const hasAlert = p.alertas.length > 0;
            return (
              <button key={p.projectId} onClick={() => setSelected(p.projectId)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
                background: isActive ? color + '15' : 'transparent',
                border: isActive ? `0.5px solid ${color}50` : '0.5px solid transparent',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? color : '#374151', flex: 1 }}>
                  {p.projectId}
                </span>
                {hasBloq ? (
                  <span style={{ fontSize: 9, color: '#dc2626' }}>⛔</span>
                ) : hasAlert ? (
                  <span style={{ fontSize: 9, color: '#d97706' }}>⚠</span>
                ) : (
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>{overall}%</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda global */}
        <div style={{ marginTop: 16, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '0.5px solid #f1f5f9' }}>
          <p style={{ margin: '0 0 6px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Estado</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: '#dc2626' }}>⛔</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>Bloqueado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: '#d97706' }}>⚠</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>Con alertas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>%</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>En tiempo</span>
          </div>
        </div>
      </div>

      {/* Contenido del plan */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {plan
          ? <PlanDetail plan={plan} />
          : <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 13 }}>
              Selecciona un proyecto
            </div>
        }
      </div>
    </div>
  );
}
