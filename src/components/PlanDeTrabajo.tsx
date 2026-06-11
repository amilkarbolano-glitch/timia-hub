import React, { useState, useRef } from 'react';
import { AlertTriangle, CheckCircle, Clock, ChevronRight, ChevronDown, FileDown } from 'lucide-react';
import { PROJECTS } from '../contexts/AuthContext';
import { adminStore } from '../lib/adminStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanSubtask {
  name: string;
  pct: number;
  optional?: boolean;
}

interface PlanActivity {
  name: string;
  pct: number;
  pctExp: number;
  startWeek: number;
  endWeek: number;
  bbva?: boolean;
  subtasks?: PlanSubtask[];
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

// ─── Semanas del plan (ene-abr 2026) ─────────────────────────────────────────

const WEEKS = [
  {l:'S1',d:'26/01'},{l:'S2',d:'02/02'},{l:'S3',d:'09/02'},
  {l:'S4',d:'16/02'},{l:'S5',d:'23/02'},{l:'S6',d:'02/03'},
  {l:'S7',d:'09/03'},{l:'S8',d:'16/03'},{l:'S9',d:'24/03'},
  {l:'S10',d:'31/03'},{l:'S11',d:'09/04'},{l:'S12',d:'16/04'},
  {l:'S13',d:'23/04'},
];
const TOTAL_WEEKS = 13;
const CELL_W = 38; // px por columna de semana

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difColor(d: number) {
  return d >= 0 ? '#15803d' : d < -5 ? '#dc2626' : '#d97706';
}
function difBg(d: number) {
  return d >= 0 ? '#dcfce7' : d < -5 ? '#fef2f2' : '#fef9c3';
}
function fmt1(n: number) {
  const d = parseFloat(n.toFixed(1));
  return `${d > 0 ? '+' : ''}${d}%`;
}

// ─── Gantt cell — cálculo de fracción continua ────────────────────────────────
// Calcula qué fracción de la celda `wi` está planificada y qué fracción ejecutada.
// Usa aritmética de punto flotante para que un 50% muestre exactamente la mitad.

function GanttCell({ wi, act, isSubtask }: { wi: number; act: PlanActivity; isSubtask?: boolean }) {
  // 0-indexed: planStart=startWeek-1, planEnd=endWeek (exclusive)
  const planStart = act.startWeek - 1;
  const planEnd   = act.endWeek;
  const totalSpan = planEnd - planStart;
  // Dónde termina la parte ejecutada (fraccional)
  const execEnd = planStart + (act.pct / 100) * totalSpan;

  const cellStart = wi;
  const cellEnd   = wi + 1;

  // Solapamiento plan ∩ celda
  const planOverlap = Math.max(0, Math.min(planEnd, cellEnd) - Math.max(planStart, cellStart));
  if (planOverlap === 0) {
    return <td style={{ width: CELL_W, minWidth: CELL_W, borderLeft: '0.5px solid #f1f5f9' }} />;
  }

  // Solapamiento exec ∩ celda
  const execOverlap = Math.max(0, Math.min(execEnd, cellEnd) - Math.max(planStart, cellStart));
  const execPct = (execOverlap / planOverlap) * 100;

  const isFirst = planStart >= cellStart && planStart < cellEnd;
  const isLast  = planEnd   > cellStart  && planEnd   <= cellEnd;

  const br = `${isFirst ? 3 : 0}px ${isLast ? 3 : 0}px ${isLast ? 3 : 0}px ${isFirst ? 3 : 0}px`;
  const planBg = isSubtask ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.22)';
  const execBg = isSubtask ? 'rgba(13,148,136,0.55)' : '#0d9488';

  return (
    <td style={{ width: CELL_W, minWidth: CELL_W, borderLeft: '0.5px solid #f1f5f9' }}>
      <div style={{ margin: '3px 1px', height: 13, borderRadius: br, overflow: 'hidden', background: planBg }}>
        <div style={{ width: `${execPct}%`, height: '100%', background: execBg, transition: 'width .3s' }} />
      </div>
    </td>
  );
}

// ─── Fila de actividad ────────────────────────────────────────────────────────

interface GanttRowProps {
  act: PlanActivity;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
  isSubtask?: boolean;
  onPctChange?: (newPct: number) => void;
}

function GanttRow({ act, idx, expanded, onToggle, isSubtask = false, onPctChange }: GanttRowProps) {
  const hasSubtasks = (act.subtasks?.length ?? 0) > 0;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(act.pct));
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (!onPctChange || isSubtask) return;
    setInputVal(String(act.pct));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  function confirmEdit() {
    const n = Math.max(0, Math.min(100, parseInt(inputVal) || 0));
    onPctChange?.(n);
    setEditing(false);
  }

  return (
    <tr style={{ background: isSubtask ? '#f8fffb' : idx % 2 === 0 ? '#fff' : '#fafafe' }}>
      {/* Nombre */}
      <td style={{
        padding: isSubtask ? '4px 8px 4px 24px' : '5px 10px',
        fontSize: isSubtask ? 10 : 11,
        color: '#374151',
        borderRight: '0.5px solid #e2e8f0',
        minWidth: 230, maxWidth: 230,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {hasSubtasks && !isSubtask && (
            <button onClick={onToggle} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: '#0d9488', display: 'flex', alignItems: 'center' }}>
              {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            </button>
          )}
          {isSubtask && <span style={{ color: '#94a3b8', fontSize: 10, flexShrink: 0 }}>└</span>}
          {act.bbva && !isSubtask && (
            <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>BBVA</span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.name}</span>
          {(act as any).optional && <span style={{ fontSize: 8, color: '#94a3b8', flexShrink: 0, marginLeft: 2 }}>(opc.)</span>}
        </div>
      </td>
      {/* % — editable con click */}
      <td style={{ textAlign: 'center', padding: '4px 5px', borderRight: '0.5px solid #e2e8f0', width: 56 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false); }}
            style={{ width: 44, padding: '2px 4px', fontSize: 11, fontWeight: 600, textAlign: 'center', border: '1.5px solid #0d9488', borderRadius: 5, outline: 'none' }}
          />
        ) : (
          <span
            onClick={startEdit}
            title={onPctChange && !isSubtask ? 'Click para editar %' : undefined}
            style={{
              display: 'inline-block', padding: '2px 6px', borderRadius: 6,
              fontSize: 10, fontWeight: 600,
              background: act.pct >= 100 ? '#dcfce7' : act.pct > 0 ? '#fef9c3' : '#f1f5f9',
              color:      act.pct >= 100 ? '#15803d' : act.pct > 0 ? '#a16207' : '#94a3b8',
              cursor: onPctChange && !isSubtask ? 'pointer' : 'default',
              outline: onPctChange && !isSubtask ? '1.5px dashed #0d948850' : 'none',
            }}>
            {act.pct}%
          </span>
        )}
      </td>
      {Array.from({ length: TOTAL_WEEKS }).map((_, wi) => (
        <GanttCell key={wi} wi={wi} act={act} isSubtask={isSubtask}/>
      ))}
    </tr>
  );
}

// ─── Entregable Section ───────────────────────────────────────────────────────

function EntregableSection({ block, storeKey }: { block: PlanEntregable; storeKey: string }) {
  // Pct overrides persistidos por actividad (storeKey = `${projectId}-${entregableId}`)
  const [pctOverrides, setPctOverrides] = useState<Record<number, number>>(() => {
    const stored = adminStore.getPlanPcts();
    const result: Record<number, number> = {};
    block.activities.forEach((_, i) => {
      const k = `${storeKey}-${i}`;
      if (k in stored) result[i] = stored[k];
    });
    return result;
  });

  function updatePct(actIdx: number, newPct: number) {
    const next = { ...pctOverrides, [actIdx]: newPct };
    setPctOverrides(next);
    const all = adminStore.getPlanPcts();
    all[`${storeKey}-${actIdx}`] = newPct;
    adminStore.savePlanPcts(all);
  }

  // Calcular pctReal efectivo del entregable según overrides
  const effectiveActivities = block.activities.map((a, i) =>
    pctOverrides[i] !== undefined ? { ...a, pct: pctOverrides[i] } : a
  );
  const effectivePctReal = block.activities.length > 0
    ? parseFloat((effectiveActivities.reduce((s, a) => s + a.pct, 0) / effectiveActivities.length).toFixed(1))
    : block.pctReal;
  const dif = parseFloat((effectivePctReal - block.pctExp).toFixed(1));

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Cabecera entregable */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#9f1239' }}>{block.name}</h4>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#94a3b8', marginRight: 4 }}>Click en % para editar</span>
          <div style={{ textAlign: 'center', padding: '4px 12px', background: '#374151', borderRadius: 7 }}>
            <div style={{ fontSize: 8, color: '#9ca3af', marginBottom: 1 }}>Avance real</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{effectivePctReal}%</div>
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
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#fce7f3' }}>{w.l}</div>
                    <div style={{ fontSize: 7, color: '#fbcfe8' }}>{w.d}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {effectiveActivities.map((act, i) => (
                <React.Fragment key={i}>
                  <GanttRow
                    act={act}
                    idx={i}
                    expanded={expanded.has(i)}
                    onToggle={() => toggle(i)}
                    onPctChange={(v) => updatePct(i, v)}
                  />
                  {/* Subtareas (visibles si expandido) */}
                  {expanded.has(i) && act.subtasks?.map((sub, si) => (
                    <GanttRow
                      key={`sub-${si}`}
                      act={{
                        name: sub.name,
                        pct: sub.pct,
                        pctExp: sub.pct,
                        startWeek: act.startWeek,
                        endWeek: act.endWeek,
                        ...(sub.optional ? { optional: true } as any : {}),
                      }}
                      idx={si}
                      expanded={false}
                      onToggle={() => {}}
                      isSubtask
                    />
                  ))}
                </React.Fragment>
              ))}
              {/* Leyenda */}
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={2 + TOTAL_WEEKS} style={{ padding: '5px 10px' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 20, height: 9, background: '#0d9488', borderRadius: 2 }} />
                      <span style={{ fontSize: 9, color: '#64748b' }}>Ejecutado</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 20, height: 9, background: 'rgba(13,148,136,0.22)', borderRadius: 2 }} />
                      <span style={{ fontSize: 9, color: '#64748b' }}>Planificado</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>BBVA</span>
                      <span style={{ fontSize: 9, color: '#64748b' }}>Requiere acción banco</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ChevronRight size={10} color="#0d9488" />
                      <span style={{ fontSize: 9, color: '#64748b' }}>Click para ver subtareas</span>
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
            Detalle de actividades no disponible · Pendiente actualización del líder técnico
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
  const overallExp  = parseFloat((plan.entregables.reduce((s, e) => s + e.pctExp,  0) / plan.entregables.length).toFixed(1));
  const overallDif  = parseFloat((overallReal - overallExp).toFixed(1));

  return (
    <div>
      {/* Header proyecto */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, padding:'14px 18px', background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:15, fontWeight:700, color }}>{plan.projectId.slice(0,2)}</span>
          </div>
          <div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:600, color:'#111' }}>Proyecto {plan.projectId}</h3>
            <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>
              Resp. Timia: <strong style={{ color:'#64748b' }}>{plan.respTimia}</strong>
              {plan.respBBVA !== 'N/A · Credicorp Capital' && (
                <> · BBVA: <strong style={{ color:'#64748b' }}>{plan.respBBVA}</strong></>
              )}
            </p>
          </div>
        </div>
        {/* Avance general */}
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {[
            { label:'AVANCE REAL',     val:`${overallReal}%`, bg:'#374151', color:'#fff', subcolor:'#9ca3af' },
            { label:'AVANCE ESPERADO', val:`${overallExp}%`,  bg:'#4b5563', color:'#fff', subcolor:'#9ca3af' },
            { label:'DIFERENCIA',      val:fmt1(overallDif),  bg:difBg(overallDif), color:difColor(overallDif), subcolor:difColor(overallDif) },
          ].map(b => (
            <div key={b.label} style={{ textAlign:'center', padding:'6px 16px', background:b.bg, borderRadius:8 }}>
              <div style={{ fontSize:8, color:b.subcolor, marginBottom:2, textTransform:'uppercase', letterSpacing:'.04em' }}>{b.label}</div>
              <div style={{ fontSize:20, fontWeight:700, color:b.color }}>{b.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen entregables */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${plan.entregables.length},1fr)`, gap:8, marginBottom:14 }}>
        {plan.entregables.map(e => {
          const dif = parseFloat((e.pctReal - e.pctExp).toFixed(1));
          return (
            <div key={e.id} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, padding:'10px 14px' }}>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:600, color:'#9f1239', lineHeight:1.3 }}>{e.name}</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:4 }}>
                <span style={{ fontSize:20, fontWeight:700, color:'#111' }}>{e.pctReal}%</span>
                <span style={{ fontSize:10, color:'#94a3b8' }}>real · {e.pctExp}% esp.</span>
                <span style={{ fontSize:11, fontWeight:700, color:difColor(dif), marginLeft:'auto' }}>{fmt1(dif)}</span>
              </div>
              <div style={{ height:5, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(e.pctReal,100)}%`, height:'100%', background:color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Siguientes pasos · Alertas · Bloqueantes */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20 }}>
        {[
          {
            icon: <CheckCircle size={13}/>, title:'Siguientes pasos', items:plan.pasos,
            bg: '#f0fdf4', titleColor:'#15803d', emptyMsg:'Por iniciar',
            marker: (i: string) => `• ${i}`,
          },
          {
            icon: <AlertTriangle size={13}/>, title:'Alertas', items:plan.alertas,
            bg: plan.alertas.length > 0 ? '#fef9c3' : '#f8fafc',
            titleColor: plan.alertas.length > 0 ? '#a16207' : '#94a3b8',
            emptyMsg:'Sin alertas', marker: (i: string) => `⚠ ${i}`,
            badge: plan.alertas.length > 0 ? plan.alertas.length : undefined,
          },
          {
            icon: <Clock size={13}/>, title:'Bloqueantes', items:plan.bloqueantes,
            bg: plan.bloqueantes.length > 0 ? '#fef2f2' : '#f8fafc',
            titleColor: plan.bloqueantes.length > 0 ? '#dc2626' : '#94a3b8',
            emptyMsg:'Sin bloqueantes', marker: (i: string) => `⛔ ${i}`,
            badge: plan.bloqueantes.length > 0 ? plan.bloqueantes.length : undefined,
          },
        ].map(s => (
          <div key={s.title} style={{ background:s.bg, borderRadius:10, padding:'10px 14px' }}>
            <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:600, color:s.titleColor, display:'flex', alignItems:'center', gap:5 }}>
              {s.icon} {s.title}
              {s.badge && (
                <span style={{ marginLeft:4, background:'rgba(0,0,0,0.08)', borderRadius:10, padding:'0 6px', fontSize:10 }}>{s.badge}</span>
              )}
            </p>
            {s.items.length > 0
              ? s.items.map((item, i) => <p key={i} style={{ margin:'3px 0', fontSize:11, color:'#374151' }}>{s.marker(item)}</p>)
              : <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{s.emptyMsg}</p>
            }
          </div>
        ))}
      </div>

      {/* Entregables con Gantt */}
      {plan.entregables.map(e => (
        <EntregableSection key={e.id} block={e} storeKey={`${plan.projectId}-${e.id}`}/>
      ))}
    </div>
  );
}

// ─── Datos de planes de trabajo ───────────────────────────────────────────────
// FICO: plan completo basado en el PPTX (ene-abr 2026)
// Subtareas del diccionario según circuito real explicado por el usuario.
// Las demás actividades se completarán luego del video/explicación.

const WORK_PLANS: WorkPlan[] = [
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
    bloqueantes: ['Pendiente validación MSD por parte de BBVA'],
    entregables: [
      {
        id:'doc', name:'I. Documentación y gobierno',
        pctReal:37.1, pctExp:36.8,
        activities: [
          {
            name:'Análisis y resolución de dudas', pct:50, pctExp:50, startWeek:1, endWeek:2,
            subtasks: [
              { name:'Registro de dudas técnicas en Jira', pct:100 },
              { name:'Reuniones de aclaración con equipo BBVA', pct:100 },
              { name:'Documentación de respuestas y acuerdos', pct:0 },
            ],
          },
          {
            name:'Elaboración diccionario técnico (370 campos)', pct:50, pctExp:50, startWeek:1, endWeek:2,
            subtasks: [
              { name:'Levantamiento inicial de campos', pct:100 },
              { name:'Envío a Gobierno de datos', pct:100 },
              { name:'Corrección de campos', pct:0, optional:true },
              { name:'Validación final del diccionario', pct:0 },
            ],
          },
          { name:'Inicialización en Nebula', pct:100, pctExp:100, startWeek:1, endWeek:1, bbva:true },
          {
            name:'Circuito validación Gobierno Técnico', pct:0, pctExp:0, startWeek:3, endWeek:5, bbva:true,
            subtasks: [
              { name:'Presentación al comité BBVA', pct:0 },
              { name:'Recepción de observaciones', pct:0 },
              { name:'Aplicación de correcciones', pct:0, optional:true },
              { name:'Aprobación definitiva', pct:0 },
            ],
          },
          {
            name:'Documentación técnica ETL y mapeo de campos', pct:50, pctExp:50, startWeek:1, endWeek:3,
            subtasks: [
              { name:'Levantamiento fuentes de datos', pct:100 },
              { name:'Mapeo origen → destino por campo', pct:50 },
              { name:'Revisión con arquitecto de datos', pct:0 },
            ],
          },
          {
            name:'Construcción Modelo Solución del Dato (MSD)', pct:50, pctExp:50, startWeek:2, endWeek:3,
            subtasks: [
              { name:'Diseño modelo conceptual', pct:100 },
              { name:'Validación con arquitecto', pct:50 },
              { name:'Documentación técnica MSD', pct:0 },
            ],
          },
          { name:'Circuito validación MSD',                    pct:0,   pctExp:0,   startWeek:3, endWeek:5, bbva:true },
          { name:'Despliegue esquemas entorno Work',            pct:0,   pctExp:0,   startWeek:4, endWeek:5, bbva:true },
          { name:'Solicitud y circuito de ACLs',                pct:0,   pctExp:0,   startWeek:4, endWeek:5, bbva:true },
          { name:'Solicitud despliegue Live',                   pct:0,   pctExp:0,   startWeek:5, endWeek:5, bbva:true },
          { name:'Acompañamiento en Definición Funcional',      pct:80,  pctExp:80,  startWeek:1, endWeek:2, bbva:true },
          { name:'Acompañamiento validación del Notebook',      pct:100, pctExp:100, startWeek:1, endWeek:1, bbva:true },
        ],
      },
      {
        id:'ada', name:'II. Componentes ADA',
        pctReal:5.3, pctExp:5.3,
        activities: [
          { name:'Gestión repos Bitbucket · Procesamiento',     pct:100, pctExp:100, startWeek:1,  endWeek:1,  bbva:true },
          { name:'Construcción procesamiento Spark · Scala',    pct:0,   pctExp:0,   startWeek:2,  endWeek:7 },
          { name:'Construcción Test unitarios y Aceptación',    pct:0,   pctExp:0,   startWeek:6,  endWeek:8 },
          { name:'Construcción reglas calidad MVP (Hammurabi)', pct:0,   pctExp:0,   startWeek:5,  endWeek:7 },
          { name:'Construcción Smart Cleaner procesamiento',    pct:0,   pctExp:0,   startWeek:5,  endWeek:6 },
          { name:'Pruebas en entorno local',                    pct:0,   pctExp:0,   startWeek:7,  endWeek:8 },
          { name:'Despliegue y pruebas entornos Work',          pct:0,   pctExp:0,   startWeek:8,  endWeek:8 },
          { name:'Generación Datos Sandbox · validación',       pct:0,   pctExp:0,   startWeek:8,  endWeek:9,  bbva:true },
          { name:'Certificación calidad por equipo QA',         pct:0,   pctExp:0,   startWeek:9,  endWeek:10, bbva:true },
          { name:'Despliegue producción componentes ADA',       pct:0,   pctExp:0,   startWeek:11, endWeek:11 },
          { name:'Acompañamiento validación ADA Live',          pct:0,   pctExp:0,   startWeek:11, endWeek:13, bbva:true },
        ],
      },
      {
        id:'auto', name:'III. Automatización y orquestación',
        pctReal:0.0, pctExp:0.0,
        activities: [
          { name:'Gestión acceso Control-M distribuido',        pct:0, pctExp:0, startWeek:3,  endWeek:4,  bbva:true },
          { name:'Definición de la automatización',             pct:0, pctExp:0, startWeek:5,  endWeek:5 },
          { name:'Construcción Mallas Control-M distribuido',   pct:0, pctExp:0, startWeek:6,  endWeek:8 },
          { name:'Pruebas entornos Work · Mallas Control-M',    pct:0, pctExp:0, startWeek:7,  endWeek:8 },
          { name:'Elaboración documentación Mallas ADA',        pct:0, pctExp:0, startWeek:7,  endWeek:8 },
          { name:'Certificación mallas Control-M',              pct:0, pctExp:0, startWeek:8,  endWeek:10, bbva:true },
          { name:'Instalación mallas producción',               pct:0, pctExp:0, startWeek:10, endWeek:10, bbva:true },
          { name:'Estabilización procesos en producción',       pct:0, pctExp:0, startWeek:11, endWeek:13 },
        ],
      },
    ],
  },

  // Proyectos con resumen (detalle pendiente vía actualización de líderes técnicos)
  {
    projectId:'NGA', respBBVA:'TBD · BBVA', respTimia:'Juan Pablo Arévalo M.',
    pasos:['Cerrar documentación ETL campos pendientes','Validar esquemas en producción','Preparar cierre formal'],
    alertas:['Documentación ETL al 80% — retraso mínimo de 1 semana'], bloqueantes:[],
    entregables:[
      {id:'doc', name:'I. Documentación y gobierno', pctReal:91, pctExp:88, activities:[]},
      {id:'etl', name:'II. Componentes ETL',         pctReal:85, pctExp:80, activities:[]},
      {id:'val', name:'III. Validación y despliegue',pctReal:95, pctExp:90, activities:[]},
    ],
  },
  {
    projectId:'CRONOS', respBBVA:'TBD · BBVA', respTimia:'Juan Pablo Arévalo M.',
    pasos:['Completar pipeline Spark','Iniciar certificación QA','Documentar reglas Hammurabi'],
    alertas:['Construcción reglas Hammurabi retrasada ~1 semana'], bloqueantes:[],
    entregables:[
      {id:'doc', name:'I. Documentación',        pctReal:80, pctExp:75, activities:[]},
      {id:'proc',name:'II. Procesamiento Spark', pctReal:65, pctExp:70, activities:[]},
      {id:'auto',name:'III. Automatización',     pctReal:40, pctExp:50, activities:[]},
    ],
  },
  {
    projectId:'SDM1', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez',
    pasos:['Completar pruebas entorno Work','Escalar bloqueo con BBVA','Replantear cronograma'],
    alertas:['2 actividades bloqueadas esperando BBVA','Avance 10% por debajo de lo esperado'],
    bloqueantes:['Validación entorno Work por BBVA pendiente desde S6'],
    entregables:[
      {id:'doc', name:'I. Documentación',  pctReal:55, pctExp:65, activities:[]},
      {id:'comp',name:'II. Componentes',   pctReal:48, pctExp:60, activities:[]},
      {id:'int', name:'III. Integración',  pctReal:30, pctExp:40, activities:[]},
    ],
  },
  {
    projectId:'SDM2', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez',
    pasos:['Finalizar pruebas entorno Work','Preparar documentación Control-M'],
    alertas:[], bloqueantes:[],
    entregables:[
      {id:'doc', name:'I. Documentación',   pctReal:70, pctExp:68, activities:[]},
      {id:'comp',name:'II. Componentes',    pctReal:65, pctExp:62, activities:[]},
      {id:'auto',name:'III. Automatización',pctReal:55, pctExp:50, activities:[]},
    ],
  },
  {
    projectId:'MURIC', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez',
    pasos:['Completar certificación QA','Preparar despliegue producción'],
    alertas:[], bloqueantes:[],
    entregables:[
      {id:'doc', name:'I. Documentación',   pctReal:72, pctExp:70, activities:[]},
      {id:'comp',name:'II. Componentes',    pctReal:68, pctExp:65, activities:[]},
      {id:'auto',name:'III. Automatización',pctReal:60, pctExp:58, activities:[]},
    ],
  },
  {
    projectId:'BCBS239', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez',
    pasos:['Despliegue Control-M producción — URGENTE','Reunión de crisis con BBVA esta semana'],
    alertas:['3 actividades bloqueadas — riesgo ANS CRÍTICA activo','Proyecto con mayor riesgo del portafolio'],
    bloqueantes:['Despliegue Control-M bloqueado por ambientes BBVA','Validación datos producción pendiente 3 semanas'],
    entregables:[
      {id:'doc', name:'I. Documentación',   pctReal:48, pctExp:60, activities:[]},
      {id:'comp',name:'II. Componentes ADA',pctReal:35, pctExp:55, activities:[]},
      {id:'auto',name:'III. Automatización',pctReal:15, pctExp:45, activities:[]},
    ],
  },
  {
    projectId:'BRICKELL', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez',
    pasos:['Finalizar última tarea','Documentación de cierre','Presentar entregables finales'],
    alertas:[], bloqueantes:[],
    entregables:[
      {id:'doc',  name:'I. Documentación',pctReal:88, pctExp:85, activities:[]},
      {id:'comp', name:'II. Componentes', pctReal:90, pctExp:88, activities:[]},
      {id:'close',name:'III. Cierre',     pctReal:80, pctExp:85, activities:[]},
    ],
  },
  {
    projectId:'OPTIM', respBBVA:'N/A · Credicorp Capital', respTimia:'David Huamán',
    pasos:['Validación final Credicorp Capital','Documentación de cierre'],
    alertas:[], bloqueantes:[],
    entregables:[
      {id:'doc', name:'I. Documentación',pctReal:85, pctExp:82, activities:[]},
      {id:'comp',name:'II. Componentes', pctReal:90, pctExp:88, activities:[]},
    ],
  },
];

// ─── PPTX Export ─────────────────────────────────────────────────────────────

async function exportPlanPPTX(plan: WorkPlan) {
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = `Plan de Trabajo · ${plan.projectId}`;

  const BG = '0F172A';   // slate-900
  const RED = 'DC2626';
  const WHITE = 'FFFFFF';
  const GRAY = '9CA3AF';
  const LIGHT = 'F1F5F9';

  const overallReal = parseFloat((plan.entregables.reduce((s, e) => s + e.pctReal, 0) / plan.entregables.length).toFixed(1));
  const overallExp  = parseFloat((plan.entregables.reduce((s, e) => s + e.pctExp, 0)  / plan.entregables.length).toFixed(1));
  const dif = parseFloat((overallReal - overallExp).toFixed(1));
  const today = new Date().toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' });

  // ── Slide 1: Portada ──
  const s1 = pptx.addSlide();
  s1.background = { color: BG };
  s1.addText('TIMIA', { x: 0.4, y: 0.3, w: 2, fontSize: 11, bold: true, color: RED, align: 'left' });
  s1.addText(`Plan de Trabajo`, { x: 0.4, y: 1.2, w: 8, fontSize: 28, bold: false, color: GRAY, align: 'left' });
  s1.addText(`Proyecto ${plan.projectId}`, { x: 0.4, y: 1.8, w: 8, fontSize: 48, bold: true, color: WHITE, align: 'left' });
  s1.addText(today, { x: 0.4, y: 2.9, w: 8, fontSize: 14, color: GRAY, align: 'left' });
  // Avances overview
  const cols = [
    { label: 'AVANCE REAL',     val: `${overallReal}%` },
    { label: 'AVANCE ESPERADO', val: `${overallExp}%` },
    { label: 'DIFERENCIA',      val: `${dif >= 0 ? '+' : ''}${dif}%` },
  ];
  cols.forEach((c, ci) => {
    const x = 0.4 + ci * 2.8;
    s1.addShape((pptxgen as any).ShapeType?.rect ?? 'rect', { x, y: 3.5, w: 2.6, h: 1.1, fill: { color: '1E293B' }, line: { color: '334155', width: 0.5 } });
    s1.addText(c.label, { x, y: 3.58, w: 2.6, fontSize: 7, color: GRAY, align: 'center' });
    s1.addText(c.val,   { x, y: 3.88, w: 2.6, fontSize: 22, bold: true, color: ci === 2 ? (dif >= 0 ? '22C55E' : 'EF4444') : WHITE, align: 'center' });
  });
  s1.addText(`Resp. Timia: ${plan.respTimia}`, { x: 0.4, y: 4.8, w: 9, fontSize: 10, color: GRAY, align: 'left' });

  // ── Slide 2: Entregables ──
  const s2 = pptx.addSlide();
  s2.background = { color: BG };
  s2.addText('Avance por entregable', { x: 0.4, y: 0.3, w: 9, fontSize: 20, bold: true, color: WHITE });
  s2.addText(today, { x: 7.5, y: 0.3, w: 2, fontSize: 9, color: GRAY, align: 'right' });

  plan.entregables.forEach((e, ei) => {
    const yBase = 0.9 + ei * 1.2;
    const eDif = parseFloat((e.pctReal - e.pctExp).toFixed(1));
    s2.addText(e.name, { x: 0.4, y: yBase, w: 5, fontSize: 11, bold: true, color: 'FDA4AF' });
    s2.addText(`${e.pctReal}%`, { x: 5.6, y: yBase, w: 1.2, fontSize: 11, bold: true, color: WHITE, align: 'right' });
    s2.addText(`esp. ${e.pctExp}%`, { x: 7, y: yBase, w: 1.3, fontSize: 9, color: GRAY, align: 'left' });
    s2.addText(`${eDif >= 0 ? '+' : ''}${eDif}%`, { x: 8.4, y: yBase, w: 1.2, fontSize: 11, bold: true, color: eDif >= 0 ? '22C55E' : 'EF4444', align: 'right' });
    // Progress bar background
    s2.addShape('rect' as any, { x: 0.4, y: yBase + 0.35, w: 9.2, h: 0.15, fill: { color: '1E293B' } });
    // Progress bar fill
    if (e.pctReal > 0) {
      s2.addShape('rect' as any, { x: 0.4, y: yBase + 0.35, w: Math.max(0.05, 9.2 * (e.pctReal / 100)), h: 0.15, fill: { color: RED } });
    }
  });

  // ── Slide 3: Siguientes pasos · Alertas · Bloqueantes ──
  const s3 = pptx.addSlide();
  s3.background = { color: BG };
  s3.addText('Estado y próximas acciones', { x: 0.4, y: 0.3, w: 9, fontSize: 20, bold: true, color: WHITE });

  const sections = [
    { title: '✅ Siguientes pasos', items: plan.pasos, color: '22C55E', x: 0.4 },
    { title: '⚠ Alertas', items: plan.alertas.length > 0 ? plan.alertas : ['Sin alertas activas'], color: 'EAB308', x: 3.5 },
    { title: '🚧 Bloqueantes', items: plan.bloqueantes.length > 0 ? plan.bloqueantes : ['Sin bloqueantes'], color: 'EF4444', x: 6.6 },
  ];

  sections.forEach(sec => {
    s3.addText(sec.title, { x: sec.x, y: 0.9, w: 2.9, fontSize: 10, bold: true, color: sec.color });
    sec.items.forEach((item, ii) => {
      s3.addText(`• ${item}`, { x: sec.x, y: 1.3 + ii * 0.4, w: 2.9, fontSize: 9, color: LIGHT, wrap: true });
    });
  });

  s3.addText('Generado por Timia Hub', { x: 0.4, y: 5.1, w: 9, fontSize: 8, color: GRAY, align: 'center' });

  await pptx.writeFile({ fileName: `Plan_${plan.projectId}_${new Date().toISOString().slice(0,10)}.pptx` });
}

// ─── Export principal ─────────────────────────────────────────────────────────

export default function PlanDeTrabajo() {
  const [selected, setSelected] = useState<string>(WORK_PLANS[0].projectId);
  const plan = WORK_PLANS.find(p => p.projectId === selected);
  const [exportingPptx, setExportingPptx] = useState(false);

  async function handleExportPptx() {
    if (!plan) return;
    setExportingPptx(true);
    try { await exportPlanPPTX(plan); } finally { setExportingPptx(false); }
  }

  return (
    <div style={{ display:'flex', gap:14 }}>
      {/* Sidebar proyectos */}
      <div style={{ width:124, flexShrink:0 }}>
        <p style={{ margin:'0 0 8px', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Proyectos</p>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {WORK_PLANS.map(p => {
            const proj  = PROJECTS.find(pr => pr.id === p.projectId);
            const color = proj?.color ?? '#64748b';
            const isActive = p.projectId === selected;
            const overall  = Math.round(p.entregables.reduce((s, e) => s + e.pctReal, 0) / p.entregables.length);
            const hasBloq  = p.bloqueantes.length > 0;
            const hasAlert = p.alertas.length > 0;
            return (
              <button key={p.projectId} onClick={() => setSelected(p.projectId)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'7px 10px',
                background: isActive ? `${color}15` : 'transparent',
                border: isActive ? `0.5px solid ${color}50` : '0.5px solid transparent',
                borderRadius:8, cursor:'pointer', textAlign:'left', transition:'all .12s',
              }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }} />
                <span style={{ fontSize:11, fontWeight:isActive?600:400, color:isActive?color:'#374151', flex:1 }}>
                  {p.projectId}
                </span>
                {hasBloq  ? <span style={{ fontSize:9 }}>⛔</span>
                  : hasAlert ? <span style={{ fontSize:9 }}>⚠</span>
                  : <span style={{ fontSize:9, color:'#94a3b8' }}>{overall}%</span>
                }
              </button>
            );
          })}
        </div>
        {/* Leyenda estado */}
        <div style={{ marginTop:16, padding:'8px 10px', background:'#f8fafc', borderRadius:8, border:'0.5px solid #f1f5f9' }}>
          {[['⛔','Bloqueado'],['⚠','Con alertas'],['%','En tiempo']].map(([i,l]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
              <span style={{ fontSize:9 }}>{i}</span>
              <span style={{ fontSize:9, color:'#64748b' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle del plan */}
      <div style={{ flex:1, minWidth:0 }}>
        {plan ? (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button onClick={handleExportPptx} disabled={exportingPptx}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:12, background: exportingPptx ? '#64748b' : '#111', color:'#fff', border:'none', borderRadius:8, cursor: exportingPptx ? 'wait' : 'pointer', fontWeight:500 }}>
                <FileDown size={14}/> {exportingPptx ? 'Generando...' : 'Exportar PPTX'}
              </button>
            </div>
            <PlanDetail plan={plan}/>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8', fontSize:13 }}>Selecciona un proyecto</div>
        )}
      </div>
    </div>
  );
}
