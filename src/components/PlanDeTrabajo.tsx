import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, ChevronRight, ChevronDown,
  FileDown, X, Users, Check, LayoutList, Search, ExternalLink,
  Plus, Trash2, Printer,
} from 'lucide-react';
import { PROJECTS, useAuth } from '../contexts/AuthContext';
import { FlowStepper } from './SetupProject';
import { snapToBusinessDay, addBusinessDays, computeBusinessWeekIdx } from '../lib/businessDays';
import {
  adminStore,
  type PlanEtapa, type EtapaStates, type PlanHistorialEntry,
  type ActivityAssignees, type AdminUser, type PlanConfig,
} from '../lib/adminStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanSubtask { name: string; pct: number; optional?: boolean; }

interface PlanActivity {
  name: string; pct: number; pctExp: number;
  startWeek: number; endWeek: number;
  bbva?: boolean; subtasks?: PlanSubtask[]; etapas?: PlanEtapa[];
}
interface PlanEntregable { id: string; name: string; pctReal: number; pctExp: number; activities: PlanActivity[]; }
interface WorkPlan { projectId: string; respBBVA: string; respTimia: string; pasos: string[]; alertas: string[]; bloqueantes: string[]; entregables: PlanEntregable[]; startDate?: string; weekLabels?: string[]; }

// ─── Semanas ──────────────────────────────────────────────────────────────────

const WEEKS = [
  {l:'S1',d:'26/01'},{l:'S2',d:'02/02'},{l:'S3',d:'09/02'},
  {l:'S4',d:'16/02'},{l:'S5',d:'23/02'},{l:'S6',d:'02/03'},
  {l:'S7',d:'09/03'},{l:'S8',d:'16/03'},{l:'S9',d:'24/03'},
  {l:'S10',d:'31/03'},{l:'S11',d:'09/04'},{l:'S12',d:'16/04'},{l:'S13',d:'23/04'},
];
const TOTAL_WEEKS = 13;
const CELL_W = 38;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difColor(d: number) { return d >= 0 ? '#15803d' : d < -5 ? '#dc2626' : '#d97706'; }
function difBg(d: number)    { return d >= 0 ? '#dcfce7' : d < -5 ? '#fef2f2' : '#fef9c3'; }
function fmt1(n: number)     { const d = parseFloat(n.toFixed(1)); return `${d > 0 ? '+' : ''}${d}%`; }
// computeCurrentWeekIdx ahora delega en computeBusinessWeekIdx (días hábiles)
// para que los festivos de timia_holidays sean tenidos en cuenta.
// Se llama con el Set de festivos del plan activo.
function computeCurrentWeekIdx(startDate: string | undefined, holidays: Set<string>): number {
  if (!startDate) return -1;
  return computeBusinessWeekIdx(startDate, holidays);
}
function getWeekDate(weekLabels: string[] | undefined, weekIdx: number, weeks: typeof WEEKS): string {
  if (weekLabels && weekLabels[weekIdx - 1]) {
    return weekLabels[weekIdx - 1].replace(/S\d+ · /, '').replace(' 🗓', '');
  }
  return weeks[weekIdx - 1]?.d ?? `S${weekIdx}`;
}

// Calcula la Date real del inicio de una semana dado el startDate del plan.
// Usa días hábiles: cada semana = 5 días hábiles, saltando fines de semana y festivos.
function weekToActualDate(
  planStartDate: string | undefined,
  weekIdx: number,
  holidays: Set<string>,
): Date | null {
  if (!planStartDate) return null;
  const s1 = snapToBusinessDay(new Date(planStartDate + 'T12:00:00'), holidays);
  return addBusinessDays(s1, (weekIdx - 1) * 5, holidays);
}

// Formatea un Date como "lun 2 jun 2026"
function fmtCalDate(d: Date): string {
  const DIAS  = ['dom','lun','mar','mié','jue','vie','sáb'];
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const n = parseInt(c.length === 3 ? c.split('').map(x => x+x).join('') : c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ─── GanttCell ────────────────────────────────────────────────────────────────

function GanttCell({ wi, act, effectivePct, isSubtask, todayWeekIdx }: { wi: number; act: PlanActivity; effectivePct: number; isSubtask?: boolean; todayWeekIdx?: number }) {
  const planStart = act.startWeek - 1, planEnd = act.endWeek, totalSpan = planEnd - planStart;
  const execEnd = planStart + (effectivePct / 100) * totalSpan;
  const cellStart = wi, cellEnd = wi + 1;
  const planOverlap = Math.max(0, Math.min(planEnd, cellEnd) - Math.max(planStart, cellStart));
  const isToday = todayWeekIdx !== undefined && todayWeekIdx >= 0 && wi === todayWeekIdx;
  const todayStyle = isToday ? { borderLeft: '2px solid #16a34a', background: '#f0fdf4' } : {};
  if (planOverlap === 0) return <td style={{ width: CELL_W, minWidth: CELL_W, borderLeft: isToday ? '2px solid #16a34a' : '0.5px solid #f1f5f9', background: isToday ? '#f0fdf4' : undefined }} />;
  const execOverlap = Math.max(0, Math.min(execEnd, cellEnd) - Math.max(planStart, cellStart));
  const execPct = (execOverlap / planOverlap) * 100;
  const isFirst = planStart >= cellStart && planStart < cellEnd;
  const isLast  = planEnd > cellStart && planEnd <= cellEnd;
  const br = `${isFirst?3:0}px ${isLast?3:0}px ${isLast?3:0}px ${isFirst?3:0}px`;
  return (
    <td style={{ width: CELL_W, minWidth: CELL_W, borderLeft: isToday ? '2px solid #16a34a' : '0.5px solid #f1f5f9', ...todayStyle }}>
      <div style={{ margin: '3px 1px', height: 13, borderRadius: br, overflow: 'hidden', background: isSubtask ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.22)' }}>
        <div style={{ width: `${execPct}%`, height: '100%', background: isSubtask ? 'rgba(13,148,136,0.55)' : '#0d9488', transition: 'width .3s' }} />
      </div>
    </td>
  );
}

// ─── GanttRow ─────────────────────────────────────────────────────────────────

function GanttRow({ act, effectivePct, idx, expanded, onToggle, isSubtask = false, onPctChange, onActivityClick, todayWeekIdx, doneDateLabel }: {
  act: PlanActivity; effectivePct: number; idx: number; expanded: boolean;
  onToggle: () => void; isSubtask?: boolean;
  onPctChange?: (n: number) => void; onActivityClick?: () => void;
  todayWeekIdx?: number; doneDateLabel?: string;
}) {
  const hasSubtasks = (act.subtasks?.length ?? 0) > 0;
  const hasEtapas   = (act.etapas?.length ?? 0) > 0;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(effectivePct));

  function startEdit() { if (!onPctChange || isSubtask || hasEtapas) return; setInputVal(String(effectivePct)); setEditing(true); }
  function confirmEdit() { const n = Math.max(0, Math.min(100, parseInt(inputVal) || 0)); onPctChange?.(n); setEditing(false); }

  return (
    <tr style={{ background: isSubtask ? '#f8fffb' : idx % 2 === 0 ? '#fff' : '#fafafe' }}
        onClick={!editing && onActivityClick && !isSubtask ? onActivityClick : undefined}>
      <td style={{ padding: isSubtask ? '4px 8px 4px 24px' : '5px 10px', fontSize: isSubtask ? 10 : 11, color: '#374151', borderRight: '0.5px solid #e2e8f0', minWidth: 230, maxWidth: 230, cursor: onActivityClick && !isSubtask ? 'pointer' : 'default' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {hasSubtasks && !isSubtask && (
            <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, color: '#0d9488', display: 'flex', alignItems: 'center' }}>
              {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            </button>
          )}
          {isSubtask && <span style={{ color: '#94a3b8', fontSize: 10, flexShrink: 0 }}>└</span>}
          {act.bbva && !isSubtask && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>BBVA</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{act.name}</span>
          {doneDateLabel && (
            <span style={{ fontSize: 9, color: '#15803d', fontWeight: 500, flexShrink: 0, whiteSpace: 'nowrap' }}>
              ({doneDateLabel})
            </span>
          )}
          {(act as any).optional && <span style={{ fontSize: 8, color: '#94a3b8', flexShrink: 0 }}>(opc.)</span>}
          {hasEtapas && !isSubtask && <LayoutList size={10} color="#0d9488" style={{ flexShrink: 0 }}/>}
        </div>
      </td>
      <td style={{ textAlign: 'center', padding: '4px 5px', borderRight: '0.5px solid #e2e8f0', width: 56 }} onClick={e => { e.stopPropagation(); startEdit(); }}>
        {editing && !hasEtapas ? (
          <input value={inputVal} onChange={e => setInputVal(e.target.value)} onBlur={confirmEdit}
            onKeyDown={e => { if (e.key==='Enter') confirmEdit(); if (e.key==='Escape') setEditing(false); }}
            autoFocus style={{ width: 44, padding: '2px 4px', fontSize: 11, fontWeight: 600, textAlign: 'center', border: '1.5px solid #0d9488', borderRadius: 5, outline: 'none' }}/>
        ) : (
          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: effectivePct >= 100 ? '#dcfce7' : effectivePct > 0 ? '#fef9c3' : '#f1f5f9',
            color: effectivePct >= 100 ? '#15803d' : effectivePct > 0 ? '#a16207' : '#94a3b8',
            cursor: onPctChange && !isSubtask && !hasEtapas ? 'pointer' : 'default',
            outline: onPctChange && !isSubtask && !hasEtapas ? '1.5px dashed #0d948850' : 'none' }}>
            {effectivePct}%
          </span>
        )}
      </td>
      {Array.from({ length: TOTAL_WEEKS }).map((_, wi) => (
        <GanttCell key={wi} wi={wi} act={act} effectivePct={effectivePct} isSubtask={isSubtask} todayWeekIdx={todayWeekIdx}/>
      ))}
    </tr>
  );
}

// ─── ActivityDrawer ────────────────────────────────────────────────────────────

interface ActivityDrawerProps {
  projectId: string; entregableId: string; actIdx: number;
  act: PlanActivity; effectivePct: number;
  etapaStates: EtapaStates; historial: PlanHistorialEntry[];
  assigneeIds: string[]; allUsers: AdminUser[]; canMark: boolean;
  jiraId?: string;
  weekLabels?: string[];
  planStartDate?: string;
  holidays: Set<string>;
  onEtapaToggle: (etapaId: string) => void;
  onAssigneeAdd: (userId: string) => void;
  onAssigneeRemove: (userId: string) => void;
  onJiraSave: (id: string) => void;
  onClose: () => void;
}

function ActivityDrawer({ projectId, entregableId, actIdx, act, effectivePct, etapaStates, historial, assigneeIds, allUsers, canMark, jiraId, weekLabels, planStartDate, holidays, onEtapaToggle, onAssigneeAdd, onAssigneeRemove, onJiraSave, onClose }: ActivityDrawerProps) {
  const [search, setSearch]         = useState('');
  const [searchFocused, setFocused] = useState(false);
  const [editJira, setEditJira]     = useState(false);
  const [jiraInput, setJiraInput]   = useState(jiraId ?? '');
  const searchRef                   = useRef<HTMLInputElement>(null);
  const dropdownRef                 = useRef<HTMLDivElement>(null);

  // Cerrar drawer con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const myAssignees = allUsers.filter(u => assigneeIds.includes(u.id));
  const searchTrimmed = search.trim().toLowerCase();
  const filteredUsers = searchTrimmed.length >= 2
    ? allUsers.filter(u => !assigneeIds.includes(u.id) && u.name.toLowerCase().includes(searchTrimmed)).slice(0, 6)
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !searchRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const actHistorial = historial
    .filter(h => h.projectId === projectId && h.entregableId === entregableId && h.actIdx === actIdx)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 15);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 998 }}/>
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: 430, background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.15)', zIndex: 999, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideIn .2s ease-out' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>
                {projectId} · {entregableId.toUpperCase()}
                {act.bbva && <span style={{ marginLeft: 6, fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>BBVA</span>}
              </p>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.name}</h3>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }}><X size={16}/></button>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>Avance actual</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: effectivePct >= 100 ? '#15803d' : effectivePct > 0 ? '#a16207' : '#94a3b8' }}>{effectivePct}%</span>
            </div>
            <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${effectivePct}%`, height: '100%', borderRadius: 4, background: effectivePct >= 100 ? '#15803d' : '#0d9488', transition: 'width .35s ease' }}/>
            </div>
            {(() => {
              // Fechas reales calculadas con días hábiles (fines de semana + festivos omitidos)
              const startActual = weekToActualDate(planStartDate, act.startWeek, holidays);
              const endActual   = weekToActualDate(planStartDate, act.endWeek, holidays);
              const today       = new Date();
              const isOverdue   = endActual ? endActual < today : false;
              const deadlineColor = isOverdue && effectivePct < 100 ? '#dc2626' : '#374151';
              return (
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 11 }}>
                  {/* Inicio */}
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>Inicio</span>
                    <div style={{ fontWeight: 700, color: '#374151', marginTop: 2 }}>S{act.startWeek}</div>
                    {startActual && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{fmtCalDate(startActual)}</div>
                    )}
                  </div>
                  <div style={{ color: '#cbd5e1', paddingTop: 16, fontSize: 13 }}>→</div>
                  {/* Fin planificado */}
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>Fin planificado</span>
                    <div style={{ fontWeight: 700, color: deadlineColor, marginTop: 2 }}>S{act.endWeek}</div>
                    {endActual && (
                      <div style={{ fontSize: 11, color: deadlineColor, marginTop: 1 }}>{fmtCalDate(endActual)}</div>
                    )}
                  </div>
                  {isOverdue && effectivePct < 100 && (
                    <div style={{ alignSelf: 'center', padding: '3px 8px', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 6, fontSize: 10, color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      ⚠ Vencida
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Jira ticket */}
        <div style={{ padding:'7px 18px', borderBottom:'1px solid #f1f5f9', flexShrink:0, display:'flex', alignItems:'center', gap:8, minHeight:32 }}>
          <ExternalLink size={11} color="#94a3b8" style={{flexShrink:0}}/>
          <span style={{fontSize:10,color:'#94a3b8',flexShrink:0,fontWeight:600}}>Ticket Jira:</span>
          {editJira ? (
            <input
              autoFocus
              value={jiraInput}
              onChange={e=>setJiraInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'){onJiraSave(jiraInput.trim());setEditJira(false);} if(e.key==='Escape')setEditJira(false); }}
              placeholder="THUB-123"
              style={{flex:1,fontSize:11,padding:'2px 7px',border:'1.5px solid #2563eb',borderRadius:5,outline:'none'}}
            />
          ) : jiraId ? (
            <a href={`https://jira.globaldevtools.bbva.com/browse/${jiraId}`} target="_blank" rel="noreferrer"
               style={{fontSize:11,color:'#2563eb',fontWeight:600,textDecoration:'none',flex:1}}>
              {jiraId}
            </a>
          ) : (
            <button onClick={()=>{setEditJira(true);setJiraInput('');}} style={{fontSize:10,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',padding:0}}>
              + Vincular ticket
            </button>
          )}
          {jiraId && !editJira && <button onClick={()=>{setEditJira(true);setJiraInput(jiraId??'');}} style={{fontSize:9,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',padding:'1px 5px',borderRadius:4,marginLeft:'auto'}}>editar</button>}
        </div>

        {/* BBVA banner */}
        {act.bbva && (
          <div style={{ padding:'10px 18px', background:'#dbeafe', borderBottom:'1px solid #bfdbfe', display:'flex', alignItems:'flex-start', gap:10, flexShrink:0 }}>
            <span style={{ fontSize:16, flexShrink:0, lineHeight:1.3 }}>🏦</span>
            <div>
              <p style={{ margin:'0 0 2px', fontSize:11, fontWeight:700, color:'#1d4ed8' }}>Tarea con dependencia BBVA</p>
              <p style={{ margin:0, fontSize:10, color:'#1e40af' }}>Timia inicia y gestiona los pasos previos — la finalización depende de aprobación o acción por parte de BBVA.</p>
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

          {/* ── Etapas ─── */}
          {act.etapas && act.etapas.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={13} color="#0d9488"/> Etapas de avance
                {!canMark && <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>(solo lectura)</span>}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {act.etapas.map(etapa => {
                  const k = `${projectId}__${entregableId}__${actIdx}__${etapa.id}`;
                  const isDone = etapaStates[k]?.done ?? false;
                  return (
                    <div key={etapa.id} onClick={() => canMark && onEtapaToggle(etapa.id)} style={{ padding: '10px 12px', borderRadius: 9, background: isDone ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${isDone ? '#86efac' : '#e2e8f0'}`, cursor: canMark ? 'pointer' : 'default', transition: 'all .15s' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1, background: isDone ? '#15803d' : '#fff', border: `2px solid ${isDone ? '#15803d' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                          {isDone && <Check size={12} color="#fff" strokeWidth={3}/>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: isDone ? '#15803d' : '#374151', textDecoration: isDone ? 'line-through' : 'none' }}>{etapa.label}</span>
                            {etapa.optional && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 10, background: '#f1f5f9', color: '#94a3b8' }}>opcional</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{etapa.peso}% del avance</span>
                            {isDone && etapaStates[k]?.doneBy && (
                              <span style={{ fontSize: 9, color: '#059669', fontWeight: 500 }}>✓ {etapaStates[k].doneBy.split(' ')[0]} · {new Date(etapaStates[k].doneAt).toLocaleDateString('es-CO', {day:'2-digit',month:'short'})}</span>
                            )}
                          </div>
                          {etapa.subs && etapa.subs.length > 0 && (
                            <div style={{ marginTop: 5, borderLeft: '2px solid #e2e8f0', paddingLeft: 8 }}>
                              {etapa.subs.map((sub, si) => <p key={si} style={{ margin: '1px 0', fontSize: 9, color: '#94a3b8' }}>└ {sub}</p>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Responsables ─── */}
          <div style={{ marginBottom: 22 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} color="#7c3aed"/> Responsables
            </p>
            {myAssignees.length === 0
              ? <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin responsables asignados</p>
              : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {myAssignees.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px 5px 5px', borderRadius: 20, background: u.avatarColor + '18', border: `1px solid ${u.avatarColor}35` }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{u.initials}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#374151' }}>{u.name}</span>
                      {canMark && <button onClick={() => onAssigneeRemove(u.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex', alignItems: 'center' }}><X size={11}/></button>}
                    </div>
                  ))}
                </div>
            }

            {/* ── Search responsables ─── */}
            {canMark && (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 9, flexShrink: 0, pointerEvents: 'none' }}/>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={() => setFocused(true)}
                    placeholder="Buscar colaborador por nombre..."
                    style={{ width: '100%', padding: '8px 10px 8px 28px', fontSize: 11, border: '1.5px solid #e2e8f0', borderRadius: 8, outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = '#0d9488')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = searchFocused ? '#0d9488' : '#e2e8f0')}
                  />
                </div>
                {/* Dropdown */}
                {(searchFocused || search.length > 0) && filteredUsers.length > 0 && (
                  <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.1)', overflow: 'hidden', marginTop: 3 }}>
                    {filteredUsers.map((u, i) => (
                      <button key={u.id} onMouseDown={e => { e.preventDefault(); onAssigneeAdd(u.id); setSearch(''); setFocused(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: '#374151', borderBottom: i < filteredUsers.length - 1 ? '1px solid #f8fafc' : 'none' }}
                        onMouseOver={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{u.initials}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{u.name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{u.areaLabel ?? u.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchTrimmed.length >= 2 && filteredUsers.length === 0 && (
                  <p style={{ margin: '5px 0 0', fontSize: 10, color: '#94a3b8' }}>Sin resultados para "{search}"</p>
                )}
                {searchTrimmed.length === 1 && (
                  <p style={{ margin: '5px 0 0', fontSize: 10, color: '#94a3b8' }}>Escribe al menos 2 letras...</p>
                )}
              </div>
            )}
          </div>

          {/* ── Historial ─── */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} color="#64748b"/> Historial
              {actHistorial.length > 0 && <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 400 }}>({actHistorial.length})</span>}
            </p>
            {actHistorial.length === 0
              ? <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#f8fafc', borderRadius:8, border:'1px dashed #e2e8f0' }}>
                  <Clock size={14} color="#94a3b8" style={{ flexShrink:0 }}/>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Los cambios que marques aquí quedarán registrados automáticamente con fecha, hora y usuario.</p>
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {actHistorial.map(h => (
                    <div key={h.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: h.userColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{h.userInitials}</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 11, color: '#374151', lineHeight: 1.4 }}>
                          <strong>{h.userName}</strong>{' '}
                          {h.action === 'checked' ? <span style={{ color: '#15803d' }}>completó</span> : <span style={{ color: '#dc2626' }}>desmarcó</span>}{' '}
                          <em style={{ color: '#64748b' }}>"{h.etapaLabel}"</em>
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8' }}>
                          {new Date(h.timestamp).toLocaleString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </>
  );
}

// ─── EntregableSection ────────────────────────────────────────────────────────

function EntregableSection({ block, projectId, sectionIdx, getActivityPct, setActivityPct, onActivityClick, onGoEstimaciones, todayWeekIdx, getDoneDate }: {
  block: PlanEntregable; projectId: string; sectionIdx: number;
  getActivityPct: (i: number) => number;
  setActivityPct: (i: number, pct: number) => void;
  onActivityClick: (i: number, act: PlanActivity) => void;
  onGoEstimaciones?: () => void;
  todayWeekIdx?: number;
  getDoneDate?: (i: number) => string | undefined;
}) {
  const effectiveActivities = block.activities.map((a, i) => ({ ...a, pct: getActivityPct(i) }));
  const effectivePctReal = block.activities.length > 0
    ? parseFloat((effectiveActivities.reduce((s, a) => s + a.pct, 0) / effectiveActivities.length).toFixed(1))
    : block.pctReal;
  // pctExp dinámico: promedio de lo que debería estar completado hoy según el Gantt
  const dynamicPctExp = block.activities.length > 0 && todayWeekIdx !== undefined
    ? parseFloat((block.activities.reduce((s, a) => s + computeActExpPct(a.startWeek, a.endWeek, todayWeekIdx), 0) / block.activities.length).toFixed(1))
    : block.pctExp;
  const dif = parseFloat((effectivePctReal - dynamicPctExp).toFixed(1));
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div data-gantt-section={sectionIdx} style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#9f1239' }}>{block.name}</h4>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#94a3b8', marginRight: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <LayoutList size={10}/> Click actividad para etapas
          </span>
          {[{ label:'Avance real', val:`${effectivePctReal}%`, bg:'#374151' },{ label:'Esperado', val:`${dynamicPctExp}%`, bg:'#4b5563' },{ label:'Diferencia', val:fmt1(dif), bg:difBg(dif), c:difColor(dif) }].map(b => (
            <div key={b.label} style={{ textAlign:'center', padding:'4px 12px', background: b.bg, borderRadius:7 }}>
              <div style={{ fontSize:8, color: (b as any).c ?? '#9ca3af', marginBottom:1 }}>{b.label}</div>
              <div style={{ fontSize:15, fontWeight:700, color: (b as any).c ?? '#fff' }}>{b.val}</div>
            </div>
          ))}
        </div>
      </div>
      {block.activities.length > 0 ? (
        <div data-gantt-table style={{ overflowX: 'auto', borderRadius: 8, border: '0.5px solid #e2e8f0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 288 + TOTAL_WEEKS * CELL_W }}>
            <thead>
              <tr style={{ background: '#881337' }}>
                <th style={{ padding:'6px 10px', textAlign:'left', fontSize:10, color:'#fff', fontWeight:600, minWidth:230 }}>Actividades / Avance</th>
                <th style={{ padding:'6px', textAlign:'center', fontSize:10, color:'#fff', fontWeight:600, width:50 }}>%</th>
                {WEEKS.map((w, i) => {
                  const isToday = todayWeekIdx !== undefined && todayWeekIdx >= 0 && i === todayWeekIdx;
                  return (
                    <th key={i} style={{ width:CELL_W, padding:'4px 2px', textAlign:'center', borderLeft: isToday ? '2px solid #16a34a' : '0.5px solid rgba(255,255,255,0.15)', background: isToday ? 'rgba(22,163,74,0.25)' : undefined }}>
                      {isToday && <div style={{ fontSize:6, fontWeight:800, color:'#86efac', letterSpacing:'.05em', lineHeight:1.2 }}>HOY</div>}
                      <div style={{ fontSize:9, fontWeight:700, color: isToday ? '#fff' : '#fce7f3' }}>{w.l}</div>
                      <div style={{ fontSize:7, color: isToday ? '#bbf7d0' : '#fbcfe8' }}>{w.d}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {effectiveActivities.map((act, i) => (
                <React.Fragment key={i}>
                  <GanttRow act={act} effectivePct={act.pct} idx={i} expanded={expanded.has(i)} onToggle={() => toggle(i)}
                    onPctChange={v => setActivityPct(i, v)} onActivityClick={() => onActivityClick(i, block.activities[i])}
                    todayWeekIdx={todayWeekIdx} doneDateLabel={getDoneDate?.(i)}/>
                  {expanded.has(i) && act.subtasks?.map((sub, si) => (
                    <GanttRow key={`sub-${si}`} act={{ name:sub.name, pct:sub.pct, pctExp:sub.pct, startWeek:act.startWeek, endWeek:act.endWeek, ...(sub.optional?{optional:true}as any:{}) }} effectivePct={sub.pct} idx={si} expanded={false} onToggle={() => {}} isSubtask/>
                  ))}
                </React.Fragment>
              ))}
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={2 + TOTAL_WEEKS} style={{ padding:'5px 10px' }}>
                  <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
                    {[
                      { sw:<div style={{ width:20, height:9, background:'#0d9488', borderRadius:2 }}/>, l:'Ejecutado' },
                      { sw:<div style={{ width:20, height:9, background:'rgba(13,148,136,0.22)', borderRadius:2 }}/>, l:'Planificado' },
                      { sw:<span style={{ fontSize:8, padding:'1px 4px', borderRadius:3, background:'#dbeafe', color:'#1d4ed8', fontWeight:700 }}>BBVA</span>, l:'Depende de BBVA' },
                      { sw:<LayoutList size={10} color="#0d9488"/>, l:'Tiene etapas (click)' },
                    ].map(({ sw, l }) => (
                      <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>{sw}<span style={{ fontSize:9, color:'#64748b' }}>{l}</span></div>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding:'16px 20px', background:'#fafbff', borderRadius:8, border:'1px dashed #e2e8f0', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Clock size={15} color="#94a3b8"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:'0 0 2px', fontSize:12, fontWeight:500, color:'#64748b' }}>Plan de actividades pendiente de configuración</p>
            <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>El líder técnico cargará el desglose de etapas en <strong>Estimaciones</strong></p>
          </div>
          {onGoEstimaciones && (
            <button onClick={onGoEstimaciones} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', background:'#0d9488', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:500, flexShrink:0, whiteSpace:'nowrap' }}>
              Ir a Estimaciones →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PlanNotesModal ───────────────────────────────────────────────────────────

interface NoteItem { text: string; type: 'pasos'|'alertas'|'bloqueantes'; idx: number; custom: boolean; }

function PlanNotesModal({ item, onClose, onDelete }: { item: NoteItem; onClose: () => void; onDelete?: () => void }) {
  const typeLabel = item.type === 'pasos' ? 'Siguiente paso' : item.type === 'alertas' ? 'Alerta' : 'Bloqueante';
  const typeColor = item.type === 'pasos' ? '#15803d' : item.type === 'alertas' ? '#a16207' : '#dc2626';
  const typeBg    = item.type === 'pasos' ? '#f0fdf4' : item.type === 'alertas' ? '#fef9c3' : '#fef2f2';
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:14, padding:'24px 28px', maxWidth:480, width:'92%', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:8, background:typeBg, color:typeColor, fontWeight:600 }}>{typeLabel}</span>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={16}/></button>
        </div>
        <p style={{ margin:'0 0 20px', fontSize:14, color:'#111', lineHeight:1.7 }}>{item.text}</p>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
          {item.custom && onDelete && (
            <button onClick={()=>{ onDelete(); onClose(); }} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, border:'0.5px solid #fecaca', borderRadius:7, background:'#fef2f2', color:'#dc2626', cursor:'pointer' }}>
              <Trash2 size={12}/> Eliminar
            </button>
          )}
          <button onClick={onClose} style={{ padding:'7px 16px', fontSize:12, background:'#f1f5f9', border:'none', borderRadius:7, cursor:'pointer', color:'#374151' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── PlanDetail ───────────────────────────────────────────────────────────────

function loadNotes(projectId: string) {
  try { return JSON.parse(localStorage.getItem(`timia_notes_${projectId}`) ?? '{"pasos":[],"alertas":[],"bloqueantes":[]}'); }
  catch { return { pasos:[] as string[], alertas:[] as string[], bloqueantes:[] as string[] }; }
}
function saveNotes(projectId: string, data: { pasos:string[]; alertas:string[]; bloqueantes:string[] }) {
  localStorage.setItem(`timia_notes_${projectId}`, JSON.stringify(data));
}

function PlanDetail({ plan, getActivityPct, setActivityPct, onActivityClick, onGoEstimaciones, getDoneDate, holidays }: {
  plan: WorkPlan;
  getActivityPct: (eid: string, ai: number, a: PlanActivity) => number;
  setActivityPct: (eid: string, ai: number, pct: number) => void;
  onActivityClick: (eid: string, ai: number, a: PlanActivity) => void;
  onGoEstimaciones?: () => void;
  holidays: Set<string>;
  getDoneDate?: (eid: string, ai: number) => string | undefined;
}) {
  const color = PROJECTS.find(p => p.id === plan.projectId)?.color ?? '#64748b';
  // ── Extra notes (persisted) ─────────────────────────────────────────────────
  const [extraNotes, setExtraNotes] = useState(() => loadNotes(plan.projectId));
  const [noteModal,  setNoteModal]  = useState<NoteItem | null>(null);
  const [addingTo,   setAddingTo]   = useState<'pasos'|'alertas'|'bloqueantes'|null>(null);
  const [addText,    setAddText]    = useState('');
  function saveExtra(next: typeof extraNotes) { setExtraNotes(next); saveNotes(plan.projectId, next); }
  function addNote(type: 'pasos'|'alertas'|'bloqueantes') {
    const t = addText.trim(); if (!t) return;
    const next = { ...extraNotes, [type]: [...extraNotes[type], t] };
    saveExtra(next); setAddText(''); setAddingTo(null);
  }
  function deleteNote(type: 'pasos'|'alertas'|'bloqueantes', customIdx: number) {
    const next = { ...extraNotes, [type]: extraNotes[type].filter((_:string,i:number)=>i!==customIdx) };
    saveExtra(next);
  }
  // todayWeekIdx disponible en todo PlanDetail para cálculos de esperado
  const todayWeekIdx = computeCurrentWeekIdx(plan.startDate, holidays);

  const overallReal = parseFloat((plan.entregables.map(e => e.activities.length
    ? e.activities.reduce((s,a,i) => s + getActivityPct(e.id,i,a), 0) / e.activities.length
    : e.pctReal).reduce((s,v)=>s+v,0) / plan.entregables.length).toFixed(1));

  // overallExp dinámico: promedio de pctExp calculado por semana para cada actividad
  const overallExp = parseFloat((plan.entregables.map(e => {
    if (!e.activities.length) return e.pctExp;
    return e.activities.reduce((s, a) => s + computeActExpPct(a.startWeek, a.endWeek, todayWeekIdx), 0) / e.activities.length;
  }).reduce((s,v)=>s+v,0) / plan.entregables.length).toFixed(1));

  const overallDif  = parseFloat((overallReal-overallExp).toFixed(1));

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, padding:'14px 18px', background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:15, fontWeight:700, color }}>{plan.projectId.slice(0,2)}</span>
          </div>
          <div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:600, color:'#111' }}>Proyecto {plan.projectId}</h3>
            <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>
              Resp. Timia: <strong style={{ color:'#64748b' }}>{plan.respTimia}</strong>
              {plan.respBBVA !== 'N/A · Credicorp Capital' && <> · BBVA: <strong style={{ color:'#64748b' }}>{plan.respBBVA}</strong></>}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {[
            { label:'AVANCE REAL', val:`${overallReal}%`, bg:'#374151', c:'#fff', sc:'#9ca3af' },
            { label:'AVANCE ESPERADO', val:`${overallExp}%`, bg:'#4b5563', c:'#fff', sc:'#9ca3af' },
            { label:'DIFERENCIA', val:fmt1(overallDif), bg:difBg(overallDif), c:difColor(overallDif), sc:difColor(overallDif) },
          ].map(b => (
            <div key={b.label} style={{ textAlign:'center', padding:'6px 16px', background:b.bg, borderRadius:8 }}>
              <div style={{ fontSize:8, color:b.sc, marginBottom:2, textTransform:'uppercase', letterSpacing:'.04em' }}>{b.label}</div>
              <div style={{ fontSize:20, fontWeight:700, color:b.c }}>{b.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:`repeat(${plan.entregables.length},1fr)`, gap:8, marginBottom:14 }}>
        {plan.entregables.map(e => {
          const ePct = e.activities.length
            ? parseFloat((e.activities.reduce((s,a,i)=>s+getActivityPct(e.id,i,a),0)/e.activities.length).toFixed(1))
            : e.pctReal;
          // pctExp dinámico por entregable
          const eExp = e.activities.length
            ? parseFloat((e.activities.reduce((s,a)=>s+computeActExpPct(a.startWeek,a.endWeek,todayWeekIdx),0)/e.activities.length).toFixed(1))
            : e.pctExp;
          const dif = parseFloat((ePct-eExp).toFixed(1));
          return (
            <div key={e.id} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, padding:'10px 14px' }}>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:600, color:'#9f1239', lineHeight:1.3 }}>{e.name}</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:4 }}>
                <span style={{ fontSize:20, fontWeight:700, color:'#111' }}>{ePct}%</span>
                <span style={{ fontSize:10, color:'#94a3b8' }}>real · {eExp}% esp.</span>
                <span style={{ fontSize:11, fontWeight:700, color:difColor(dif), marginLeft:'auto' }}>{fmt1(dif)}</span>
              </div>
              <div style={{ height:5, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(ePct,100)}%`, height:'100%', background:color }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pasos / Alertas / Bloqueantes — editables */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20 }}>
        {([
          { type:'pasos'      as const, icon:<CheckCircle size={12}/>, title:'Siguientes pasos', static:plan.pasos,       bg:'#f0fdf4', tc:'#15803d', bc:'#bbf7d0', em:'Sin pasos por iniciar', mk:'•'  },
          { type:'alertas'    as const, icon:<AlertTriangle size={12}/>, title:'Alertas',         static:plan.alertas,     bg:'#fef9c3', tc:'#a16207', bc:'#fde68a', em:'Sin alertas activas',  mk:'⚠'  },
          { type:'bloqueantes'as const, icon:<Clock size={12}/>,        title:'Bloqueantes',      static:plan.bloqueantes, bg:'#fef2f2', tc:'#dc2626', bc:'#fecaca', em:'Sin bloqueantes',       mk:'⛔' },
        ] as const).map(s => {
          const allItems = [...s.static, ...extraNotes[s.type]];
          const hasItems = allItems.length > 0;
          return (
            <div key={s.type} style={{ background:hasItems?s.bg:'#f8fafc', borderRadius:10, padding:'10px 14px', border:`0.5px solid ${hasItems?s.bc:'#e2e8f0'}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:600, color:hasItems?s.tc:'#94a3b8', display:'flex', alignItems:'center', gap:5 }}>
                  {s.icon} {s.title}
                  {allItems.length>0 && <span style={{ marginLeft:4, background:'rgba(0,0,0,0.08)', borderRadius:10, padding:'0 6px', fontSize:10 }}>{allItems.length}</span>}
                </p>
                <button onClick={()=>{ setAddingTo(s.type); setAddText(''); }}
                  style={{ border:'none', background:hasItems?s.bc:'#e2e8f0', cursor:'pointer', color:hasItems?s.tc:'#64748b', borderRadius:6, padding:'2px 6px', display:'flex', alignItems:'center', gap:2, fontSize:10 }}>
                  <Plus size={10}/> Add
                </button>
              </div>
              {/* Inline add form */}
              {addingTo===s.type && (
                <div style={{ marginBottom:8 }}>
                  <textarea value={addText} onChange={e=>setAddText(e.target.value)} rows={2} autoFocus
                    placeholder={`Nuevo ${s.type==='pasos'?'paso':s.type==='alertas'?'alerta':'bloqueante'}…`}
                    style={{ width:'100%', padding:'5px 8px', fontSize:11, border:`0.5px solid ${s.bc}`, borderRadius:6, background:'#fff', resize:'vertical', boxSizing:'border-box', outline:'none', lineHeight:1.5 }}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addNote(s.type);} if(e.key==='Escape') setAddingTo(null); }}
                  />
                  <div style={{ display:'flex', gap:4, marginTop:4 }}>
                    <button onClick={()=>addNote(s.type)} style={{ padding:'3px 10px', fontSize:10, background:s.tc, color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontWeight:500 }}>Guardar</button>
                    <button onClick={()=>setAddingTo(null)} style={{ padding:'3px 8px', fontSize:10, background:'#f1f5f9', border:'none', borderRadius:5, cursor:'pointer', color:'#374151' }}>Cancelar</button>
                  </div>
                </div>
              )}
              {/* Items */}
              {hasItems ? allItems.map((item,i) => {
                const isCustom = i >= s.static.length;
                const customIdx = isCustom ? i - s.static.length : -1;
                return (
                  <div key={i} onClick={()=>setNoteModal({ text:item, type:s.type, idx:i, custom:isCustom })}
                    style={{ display:'flex', alignItems:'flex-start', gap:5, margin:'3px 0', padding:'4px 6px', borderRadius:6, cursor:'pointer', background:'rgba(255,255,255,0.6)', transition:'background .1s', lineHeight:1.5 }}
                    onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.95)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.6)')}>
                    <span style={{ fontSize:11, flexShrink:0, marginTop:1 }}>{s.mk}</span>
                    <span style={{ fontSize:11, color:'#374151', flex:1 }}>{item}</span>
                    {isCustom && <button onClick={e=>{e.stopPropagation();deleteNote(s.type,customIdx);}} style={{ border:'none', background:'none', cursor:'pointer', color:'#cbd5e1', padding:1, display:'flex', flexShrink:0 }}><Trash2 size={10}/></button>}
                  </div>
                );
              }) : <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{s.em}</p>}
            </div>
          );
        })}
      </div>
      {/* Note detail modal */}
      {noteModal && (
        <PlanNotesModal item={noteModal} onClose={()=>setNoteModal(null)}
          onDelete={noteModal.custom ? ()=>deleteNote(noteModal.type, noteModal.idx - (noteModal.type==='pasos'?plan.pasos:noteModal.type==='alertas'?plan.alertas:plan.bloqueantes).length) : undefined}
        />
      )}

      {(() => {
        return plan.entregables.map((e, ei) => (
          <EntregableSection key={e.id} block={e} projectId={plan.projectId} sectionIdx={ei}
            getActivityPct={i => getActivityPct(e.id,i,e.activities[i])}
            setActivityPct={(i,pct) => setActivityPct(e.id,i,pct)}
            onActivityClick={(i,a) => onActivityClick(e.id,i,a)}
            onGoEstimaciones={onGoEstimaciones}
            todayWeekIdx={todayWeekIdx}
            getDoneDate={getDoneDate ? (i => getDoneDate(e.id, i)) : undefined}
          />
        ));
      })()}
    </div>
  );
}

// ─── computeActExpPct — % esperado de una actividad a la semana actual ──────
// Una tarea "debería estar completa" SOLO si su semana de fin ya pasó (endWeek ≤ hoy).
// Si está en curso o no ha arrancado → NO cuenta como esperada todavía.
// Esto permite que el esperado sea "¿cuántas tareas deberían estar 100% hechas?"
// y da diferencias positivas (adelantado) o negativas (atrasado) según sección.
function computeActExpPct(startWeek: number, endWeek: number, todayWeekIdx: number): number {
  const todayWeek = todayWeekIdx + 1; // pasar a 1-indexed
  return todayWeek >= endWeek ? 100 : 0;
}

// ─── planConfigToWorkPlan — convierte un PlanConfig (Estimaciones) → WorkPlan ─

function planConfigToWorkPlan(cfg: PlanConfig): WorkPlan {
  return {
    projectId: cfg.projectId,
    startDate: cfg.startDate,
    weekLabels: cfg.weekLabels,
    respBBVA:  'Por definir',
    respTimia: 'Por definir',
    pasos:      ['Plan generado desde Estimaciones — ajusta los % de avance'],
    alertas:    [],
    bloqueantes:[],
    entregables: cfg.entregables.map(ent => ({
      id:       ent.id,
      name:     ent.label,
      pctReal:  0,
      pctExp:   0,
      activities: ent.activities.map(act => ({
        name:      act.label,
        pct:       0,
        pctExp:    0,
        startWeek: act.startWeek,
        endWeek:   act.endWeek,
        bbva:      act.bbva,
        etapas:    act.etapas,
      })),
    })),
  };
}

// ─── WORK_PLANS ───────────────────────────────────────────────────────────────
// Nota: actividades marcadas "BBVA" son tareas que TIMIA INICIA
// pero que dependen de BBVA para completarse (aprobaciones, accesos, etc.)

const WORK_PLANS: WorkPlan[] = [
  {
    projectId: 'FICO',
    startDate: '2026-05-04',
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
      // ── I. Documentación y gobierno ─────────────────────────────────────
      {
        id: 'doc', name: 'I. Documentación y gobierno',
        pctReal: 37.1, pctExp: 36.8,
        activities: [
          {
            name: 'Análisis y resolución de dudas', pct: 50, pctExp: 50, startWeek: 1, endWeek: 2,
            etapas: [
              { id: 'ard-1', label: 'Recopilación y registro de dudas técnicas', peso: 25 },
              { id: 'ard-2', label: 'Sesiones de aclaración con BBVA',           peso: 35 },
              { id: 'ard-3', label: 'Consolidación de respuestas',               peso: 20 },
              { id: 'ard-4', label: 'Documentación de acuerdos',                 peso: 20 },
            ],
          },
          {
            name: 'Elaboración diccionario técnico (370 campos)', pct: 50, pctExp: 50, startWeek: 1, endWeek: 2,
            etapas: [
              { id: 'dt-1', label: 'Levantamiento inicial de campos',    peso: 25 },
              { id: 'dt-2', label: 'Envío a Gobierno de datos',          peso: 25 },
              { id: 'dt-3', label: 'Correcciones de Gobierno',           peso: 25, optional: true },
              { id: 'dt-4', label: 'Validación final del diccionario',   peso: 25 },
            ],
          },
          {
            // 100% done — no etapas needed
            name: 'Inicialización en Nebula', pct: 100, pctExp: 100, startWeek: 1, endWeek: 1, bbva: true,
          },
          {
            name: 'Circuito validación Gobierno Técnico', pct: 0, pctExp: 0, startWeek: 3, endWeek: 5, bbva: true,
            etapas: [
              { id: 'cvgt-1', label: 'Presentación al comité BBVA',    peso: 25 },
              { id: 'cvgt-2', label: 'Recepción de observaciones',      peso: 25 },
              { id: 'cvgt-3', label: 'Aplicación de correcciones',      peso: 25, optional: true },
              { id: 'cvgt-4', label: 'Aprobación definitiva',           peso: 25 },
            ],
          },
          {
            name: 'Documentación técnica ETL y mapeo de campos', pct: 50, pctExp: 50, startWeek: 1, endWeek: 3,
            etapas: [
              { id: 'etl-1', label: 'Levantamiento de fuentes de datos',     peso: 35 },
              { id: 'etl-2', label: 'Mapeo origen → destino por campo',       peso: 40 },
              { id: 'etl-3', label: 'Validación',                             peso: 25 },
            ],
          },
          {
            name: 'Construcción Modelo Solución del Dato (MSD)', pct: 50, pctExp: 50, startWeek: 2, endWeek: 3,
            etapas: [
              { id: 'msd-1', label: 'Diseño modelo conceptual',  peso: 35 },
              { id: 'msd-2', label: 'Construcción del MSD',      peso: 35 },
              { id: 'msd-3', label: 'Validación',                peso: 30 },
            ],
          },
          {
            name: 'Circuito validación MSD', pct: 0, pctExp: 0, startWeek: 3, endWeek: 5, bbva: true,
            etapas: [
              { id: 'cmsd-1', label: 'Preparación del documento MSD',             peso: 20 },
              { id: 'cmsd-2', label: 'Envío formal a equipo BBVA',                peso: 20 },
              { id: 'cmsd-3', label: 'Seguimiento y recepción de observaciones',  peso: 30 },
              { id: 'cmsd-4', label: 'Correcciones y reenvío',                    peso: 20, optional: true },
              { id: 'cmsd-5', label: 'Cierre y aprobación',                       peso: 10 },
            ],
          },
          {
            name: 'Despliegue esquemas entorno Work', pct: 0, pctExp: 0, startWeek: 4, endWeek: 5, bbva: true,
            etapas: [
              { id: 'dsw-1', label: 'Preparación de scripts DDL/DML',       peso: 25 },
              { id: 'dsw-2', label: 'Solicitud de acceso al entorno Work',   peso: 25 },
              { id: 'dsw-3', label: 'Ejecución del despliegue',              peso: 25 },
              { id: 'dsw-4', label: 'Validación de esquemas en Work',        peso: 25 },
            ],
          },
          {
            name: 'Solicitud y circuito de ACLs', pct: 0, pctExp: 0, startWeek: 4, endWeek: 5, bbva: true,
            etapas: [
              { id: 'acl-1', label: 'Identificación de recursos y permisos requeridos', peso: 25 },
              { id: 'acl-2', label: 'Elaboración y envío de solicitud',                 peso: 25 },
              { id: 'acl-3', label: 'Seguimiento con equipo BBVA',                      peso: 25 },
              { id: 'acl-4', label: 'Confirmación y validación de accesos',             peso: 25 },
            ],
          },
          {
            name: 'Solicitud despliegue Live', pct: 0, pctExp: 0, startWeek: 5, endWeek: 5, bbva: true,
            etapas: [
              { id: 'sdl-1', label: 'Preparación de documentación para Live', peso: 30 },
              { id: 'sdl-2', label: 'Envío de solicitud formal a BBVA',       peso: 30 },
              { id: 'sdl-3', label: 'Validación en ambiente Live',            peso: 40 },
            ],
          },
          {
            // pct:80 done — no etapas (avoid state inconsistency)
            name: 'Acompañamiento en Definición Funcional', pct: 80, pctExp: 80, startWeek: 1, endWeek: 2, bbva: true,
            etapas: [
              { id: 'adf-1', label: 'Participación en sesiones de definición',         peso: 40 },
              { id: 'adf-2', label: 'Registro de decisiones y acuerdos funcionales',   peso: 30 },
              { id: 'adf-3', label: 'Validación con equipo técnico Timia',             peso: 30 },
            ],
          },
          {
            // 100% done — no etapas needed
            name: 'Acompañamiento validación del Notebook', pct: 100, pctExp: 100, startWeek: 1, endWeek: 1, bbva: true,
          },
        ],
      },

      // ── II. Componentes ADA ──────────────────────────────────────────────
      {
        id: 'ada', name: 'II. Componentes ADA',
        pctReal: 5.3, pctExp: 5.3,
        activities: [
          {
            // 100% done — no etapas
            name: 'Gestión repos Bitbucket · Procesamiento', pct: 100, pctExp: 100, startWeek: 1, endWeek: 1, bbva: true,
          },
          {
            name: 'Construcción procesamiento Spark · Scala', pct: 0, pctExp: 0, startWeek: 2, endWeek: 7,
            etapas: [
              { id: 'spark-1', label: 'Ambientación del repositorio local',       peso: 10 },
              { id: 'spark-2', label: 'Construcción clases principales',          peso: 40, subs: ['Clase getData','Clase Generate','Clase Process'] },
              { id: 'spark-3', label: 'Config y utilitarios — context provider',  peso: 20 },
              { id: 'spark-4', label: 'Test unitarios y de aceptación',           peso: 20 },
              { id: 'spark-5', label: 'Escritura local — validación de salida',   peso: 10 },
            ],
          },
          {
            name: 'Construcción Test unitarios y Aceptación', pct: 0, pctExp: 0, startWeek: 6, endWeek: 8,
            etapas: [
              { id: 'cta-1', label: 'Diseño de casos de prueba',                   peso: 20 },
              { id: 'cta-2', label: 'Implementación de tests unitarios',           peso: 30 },
              { id: 'cta-3', label: 'Implementación de tests de aceptación',       peso: 30 },
              { id: 'cta-4', label: 'Ejecución y validación de resultados',        peso: 20 },
            ],
          },
          {
            name: 'Construcción reglas calidad MVP (Hammurabi)', pct: 0, pctExp: 0, startWeek: 5, endWeek: 7,
            etapas: [
              { id: 'ham-1', label: 'Levantamiento de reglas de negocio',   peso: 25 },
              { id: 'ham-2', label: 'Implementación de reglas Hammurabi',   peso: 40 },
              { id: 'ham-3', label: 'Pruebas de reglas en local',           peso: 25 },
              { id: 'ham-4', label: 'Documentación de reglas',              peso: 10 },
            ],
          },
          {
            name: 'Construcción Smart Cleaner procesamiento', pct: 0, pctExp: 0, startWeek: 5, endWeek: 6,
            etapas: [
              { id: 'sc-1', label: 'Diseño del módulo Smart Cleaner',    peso: 25 },
              { id: 'sc-2', label: 'Implementación del módulo',          peso: 50 },
              { id: 'sc-3', label: 'Pruebas y validación',               peso: 25 },
            ],
          },
          {
            name: 'Pruebas en entorno local', pct: 0, pctExp: 0, startWeek: 7, endWeek: 8,
            etapas: [
              { id: 'pel-1', label: 'Configuración del entorno de pruebas',    peso: 20 },
              { id: 'pel-2', label: 'Ejecución de pruebas funcionales',        peso: 40 },
              { id: 'pel-3', label: 'Corrección de errores encontrados',       peso: 25 },
              { id: 'pel-4', label: 'Validación final del componente',         peso: 15 },
            ],
          },
          {
            name: 'Despliegue y pruebas entornos Work', pct: 0, pctExp: 0, startWeek: 8, endWeek: 8,
            etapas: [
              { id: 'work-1', label: 'Generación de muestras/sandbox',        peso: 20, optional: true },
              { id: 'work-2', label: 'Creación y ejecución job ADA en Work',  peso: 30 },
              { id: 'work-3', label: 'Verificación de escritura en VBox',     peso: 30 },
              { id: 'work-4', label: 'Prueba en ambiente de test',            peso: 20 },
            ],
          },
          {
            name: 'Generación Datos Sandbox · validación', pct: 0, pctExp: 0, startWeek: 8, endWeek: 9, bbva: true,
            etapas: [
              { id: 'gds-1', label: 'Preparación del dataset de prueba',   peso: 25 },
              { id: 'gds-2', label: 'Generación de datos sandbox',         peso: 35 },
              { id: 'gds-3', label: 'Ejecución con dataset sandbox',       peso: 25 },
              { id: 'gds-4', label: 'Validación de resultados',            peso: 15 },
            ],
          },
          {
            name: 'Certificación calidad por equipo QA', pct: 0, pctExp: 0, startWeek: 9, endWeek: 10, bbva: true,
            etapas: [
              { id: 'cqa-1', label: 'Preparación del ambiente QA',              peso: 20 },
              { id: 'cqa-2', label: 'Ejecución de pruebas de calidad',          peso: 35 },
              { id: 'cqa-3', label: 'Revisión de resultados con BBVA QA',       peso: 25 },
              { id: 'cqa-4', label: 'Certificación y aprobación formal',        peso: 20 },
            ],
          },
          {
            name: 'Despliegue producción componentes ADA', pct: 0, pctExp: 0, startWeek: 11, endWeek: 11,
            etapas: [
              { id: 'dpa-1', label: 'Preparación del release de producción',       peso: 25 },
              { id: 'dpa-2', label: 'Despliegue a ambiente productivo',            peso: 35 },
              { id: 'dpa-3', label: 'Validación post-despliegue',                  peso: 25 },
              { id: 'dpa-4', label: 'Documentación del cierre de despliegue',      peso: 15 },
            ],
          },
          {
            name: 'Acompañamiento validación ADA Live', pct: 0, pctExp: 0, startWeek: 11, endWeek: 13, bbva: true,
            etapas: [
              { id: 'val-1', label: 'Monitoreo de primeras ejecuciones en Live',     peso: 35 },
              { id: 'val-2', label: 'Revisión de logs y outputs',                    peso: 35 },
              { id: 'val-3', label: 'Ajustes y correcciones post-validación',        peso: 30, optional: true },
            ],
          },
        ],
      },

      // ── III. Automatización y orquestación ──────────────────────────────
      {
        id: 'auto', name: 'III. Automatización y orquestación',
        pctReal: 0.0, pctExp: 0.0,
        activities: [
          {
            name: 'Gestión acceso Control-M distribuido', pct: 0, pctExp: 0, startWeek: 3, endWeek: 4, bbva: true,
            etapas: [
              { id: 'gac-1', label: 'Identificación de requisitos de acceso', peso: 25 },
              { id: 'gac-2', label: 'Solicitud formal a BBVA',                peso: 25 },
              { id: 'gac-3', label: 'Coordinación y seguimiento',             peso: 25 },
              { id: 'gac-4', label: 'Validación de accesos otorgados',        peso: 25 },
            ],
          },
          {
            name: 'Definición de la automatización', pct: 0, pctExp: 0, startWeek: 5, endWeek: 5,
            etapas: [
              { id: 'da-1', label: 'Análisis de requerimientos de automatización', peso: 35 },
              { id: 'da-2', label: 'Diseño de la arquitectura de mallas',          peso: 40 },
              { id: 'da-3', label: 'Documentación del diseño técnico',             peso: 25 },
            ],
          },
          {
            name: 'Construcción Mallas Control-M distribuido', pct: 0, pctExp: 0, startWeek: 6, endWeek: 8,
            etapas: [
              { id: 'cm-1', label: 'Configuración del agente Control-M',                  peso: 20 },
              { id: 'cm-2', label: 'Construcción de mallas de procesamiento',             peso: 35 },
              { id: 'cm-3', label: 'Construcción de mallas de control y monitoreo',       peso: 30 },
              { id: 'cm-4', label: 'Pruebas en entorno local',                            peso: 15 },
            ],
          },
          {
            name: 'Pruebas entornos Work · Mallas Control-M', pct: 0, pctExp: 0, startWeek: 7, endWeek: 8,
            etapas: [
              { id: 'pwm-1', label: 'Despliegue de mallas en entorno Work',       peso: 30 },
              { id: 'pwm-2', label: 'Ejecución de pruebas funcionales',           peso: 40 },
              { id: 'pwm-3', label: 'Validación de dependencias y triggers',      peso: 30 },
            ],
          },
          {
            name: 'Elaboración documentación Mallas ADA', pct: 0, pctExp: 0, startWeek: 7, endWeek: 8,
            etapas: [
              { id: 'edm-1', label: 'Documentación técnica de las mallas',         peso: 40 },
              { id: 'edm-2', label: 'Diagramas de flujo de orquestación',          peso: 30 },
              { id: 'edm-3', label: 'Manual de operación y monitoreo',             peso: 30 },
            ],
          },
          {
            name: 'Certificación mallas Control-M', pct: 0, pctExp: 0, startWeek: 8, endWeek: 10, bbva: true,
            etapas: [
              { id: 'cmc-1', label: 'Presentación de mallas al equipo BBVA',   peso: 25 },
              { id: 'cmc-2', label: 'Ejecución supervisada con BBVA',          peso: 35 },
              { id: 'cmc-3', label: 'Corrección de observaciones',             peso: 25, optional: true },
              { id: 'cmc-4', label: 'Aprobación formal de certificación',      peso: 15 },
            ],
          },
          {
            name: 'Instalación mallas producción', pct: 0, pctExp: 0, startWeek: 10, endWeek: 10, bbva: true,
            etapas: [
              { id: 'imp-1', label: 'Migración de mallas a producción',              peso: 40 },
              { id: 'imp-2', label: 'Configuración de schedules productivos',        peso: 30 },
              { id: 'imp-3', label: 'Validación de instalación en producción',       peso: 30 },
            ],
          },
          {
            name: 'Estabilización procesos en producción', pct: 0, pctExp: 0, startWeek: 11, endWeek: 13,
            etapas: [
              { id: 'epp-1', label: 'Monitoreo de primeras ejecuciones productivas', peso: 40 },
              { id: 'epp-2', label: 'Análisis y corrección de incidencias',          peso: 35 },
              { id: 'epp-3', label: 'Documentación final de estabilización',         peso: 25 },
            ],
          },
        ],
      },
    ],
  },

  // ── Proyectos resumen — pctReal/pctExp en 0 hasta que se carguen actividades reales ──
  { projectId:'NGA', startDate:'2026-04-27', respBBVA:'TBD · BBVA',              respTimia:'Juan Pablo Arévalo M.', pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación y gobierno',pctReal:0,pctExp:0,activities:[]},{id:'etl',name:'II. Componentes ETL',pctReal:0,pctExp:0,activities:[]},{id:'val',name:'III. Validación y despliegue',pctReal:0,pctExp:0,activities:[]}] },
  {
    projectId: 'CRONOS',
    startDate: '2026-06-02',   // S1 = 2 jun → hoy 25 jun cae en S4
    respBBVA:  'Pedro Gómez · BBVA Analytics',
    respTimia: 'Juan Pablo Arévalo M.',
    pasos: [
      'Completar diccionario técnico y enviar a Gobierno de datos',
      'Iniciar construcción componentes Spark-Scala (semana en curso)',
      'Gestionar acceso Control-M distribuido con BBVA',
    ],
    alertas: ['Circuito validación Gobierno Técnico sin respuesta de BBVA'],
    bloqueantes: [],
    entregables: [
      {
        id: 'doc', name: 'I. Documentación y gobierno', pctReal: 55, pctExp: 45,
        activities: [
          { name: 'Análisis y resolución de dudas',          pct: 100, pctExp: 100, startWeek: 1, endWeek: 2 },
          { name: 'Elaboración diccionario técnico',          pct:  75, pctExp: 100, startWeek: 1, endWeek: 3,
            etapas: [
              { id:'dt-1', label:'Levantamiento inicial de campos',  peso: 25 },
              { id:'dt-2', label:'Envío a Gobierno de datos',        peso: 25 },
              { id:'dt-3', label:'Correcciones de Gobierno',         peso: 25, optional: true },
              { id:'dt-4', label:'Validación final del diccionario', peso: 25 },
            ],
          },
          { name: 'Inicialización en Nebula',                pct: 100, pctExp: 100, startWeek: 1, endWeek: 1, bbva: true },
          { name: 'Documentación técnica ETL',               pct:  50, pctExp:  75, startWeek: 2, endWeek: 4 },
          { name: 'Circuito validación Gobierno Técnico',    pct:   0, pctExp:  20, startWeek: 3, endWeek: 6, bbva: true },
          { name: 'Construcción Modelo Solución del Dato',   pct:  30, pctExp:  50, startWeek: 2, endWeek: 4 },
        ],
      },
      {
        id: 'ada', name: 'II. Componentes ADA', pctReal: 10, pctExp: 15,
        activities: [
          { name: 'Gestión repos Bitbucket · Procesamiento', pct: 100, pctExp: 100, startWeek: 1, endWeek: 1, bbva: true },
          { name: 'Construcción Spark · Scala',              pct:  15, pctExp:  20, startWeek: 3, endWeek: 9,
            etapas: [
              { id:'sp-1', label:'Ambientación repositorio local',      peso: 10 },
              { id:'sp-2', label:'Construcción clases principales',     peso: 40 },
              { id:'sp-3', label:'Config y utilitarios',                peso: 20 },
              { id:'sp-4', label:'Test unitarios y aceptación',         peso: 20 },
              { id:'sp-5', label:'Escritura local · validación salida', peso: 10 },
            ],
          },
          { name: 'Construcción reglas calidad (Hammurabi)', pct:   0, pctExp:   0, startWeek:  6, endWeek:  8 },
          { name: 'Pruebas en entorno local',                pct:   0, pctExp:   0, startWeek:  8, endWeek:  9 },
          { name: 'Despliegue y pruebas entornos Work',      pct:   0, pctExp:   0, startWeek:  9, endWeek: 10, bbva: true },
          { name: 'Certificación calidad por equipo QA',     pct:   0, pctExp:   0, startWeek: 10, endWeek: 11, bbva: true },
        ],
      },
      {
        id: 'auto', name: 'III. Automatización y orquestación', pctReal: 0, pctExp: 0,
        activities: [
          { name: 'Gestión acceso Control-M distribuido',    pct: 0, pctExp: 0, startWeek:  4, endWeek:  5, bbva: true },
          { name: 'Definición de la automatización',         pct: 0, pctExp: 0, startWeek:  5, endWeek:  6 },
          { name: 'Construcción Mallas Control-M',           pct: 0, pctExp: 0, startWeek:  7, endWeek: 10 },
          { name: 'Pruebas orquestación en Work',            pct: 0, pctExp: 0, startWeek:  9, endWeek: 11 },
          { name: 'Certificación mallas Control-M',          pct: 0, pctExp: 0, startWeek: 10, endWeek: 12, bbva: true },
          { name: 'Estabilización en producción',            pct: 0, pctExp: 0, startWeek: 12, endWeek: 13 },
        ],
      },
    ],
  },
  { projectId:'SDM1',    respBBVA:'TBD · BBVA',              respTimia:'Diego Sánchez',         pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes',pctReal:0,pctExp:0,activities:[]},{id:'int',name:'III. Integración',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'SDM2',    respBBVA:'TBD · BBVA',              respTimia:'Diego Sánchez',         pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes',pctReal:0,pctExp:0,activities:[]},{id:'auto',name:'III. Automatización',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'MURIC',   respBBVA:'TBD · BBVA',              respTimia:'Diego Sánchez',         pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes',pctReal:0,pctExp:0,activities:[]},{id:'auto',name:'III. Automatización',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'BCBS239', respBBVA:'TBD · BBVA',              respTimia:'Diego Sánchez',         pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes ADA',pctReal:0,pctExp:0,activities:[]},{id:'auto',name:'III. Automatización',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'BRICKELL',respBBVA:'TBD · BBVA',              respTimia:'Diego Sánchez',         pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes',pctReal:0,pctExp:0,activities:[]},{id:'close',name:'III. Cierre',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'OPTIM',   respBBVA:'N/A · Credicorp Capital', respTimia:'David Huamán',          pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'PINTO',   respBBVA:'TBD · BBVA',              respTimia:'Juan Pablo Arévalo',    pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes',pctReal:0,pctExp:0,activities:[]},{id:'auto',name:'III. Automatización',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'QA',      respBBVA:'TBD · BBVA',              respTimia:'Juan Pablo Arévalo',    pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes QA',pctReal:0,pctExp:0,activities:[]}] },
  { projectId:'FABRICA', respBBVA:'N/A · Credicorp Capital', respTimia:'David Huamán',          pasos:[], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:0,pctExp:0,activities:[]},{id:'comp',name:'II. Componentes',pctReal:0,pctExp:0,activities:[]},{id:'ent',name:'III. Entregables',pctReal:0,pctExp:0,activities:[]}] },
];

// ─── PPTX Export ──────────────────────────────────────────────────────────────

async function exportPlanPPTX(plan: WorkPlan, getActivityPct: (eid: string, ai: number, a: PlanActivity) => number, screenshots: string[] = []) {
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = `Plan de Trabajo · ${plan.projectId}`;

  // ── Paleta ───────────────────────────────────────────────────────────────────
  const BG_DARK  = '0F172A';                   // portada y última slide
  const WHITE    = 'FFFFFF';
  const TBL_HDR  = '881337';                   // header row de la tabla (maroon)
  const ROW_ODD  = 'FFFFFF';
  const ROW_EVEN = 'F8FAFC';
  const ROW_BORD = 'E2E8F0';
  const BAR_DONE = '0D9488';                   // barra ejecutado (teal sólido)
  const BAR_PLAN = 'CCFBF1';                   // barra planificado (teal claro)
  const BBVA_BG  = '1D4ED8';
  const GREEN    = '15803D';
  const GREEN_L  = '22C55E';
  const AMBER    = 'A16207';
  const RED      = 'DC2626';
  const ERR      = 'EF4444';
  const WARN     = 'EAB308';
  const GRAY     = '9CA3AF';
  const MUT      = '64748B';
  const DARK     = '1E293B';
  const CARD     = '1E293B';
  const BORDER_D = '334155';
  const ENT_COLORS = [RED,'0D9488','7C3AED','0891B2','BE185D'];

  // ── Semanas (reutiliza las mismas del Gantt de la app) ────────────────────
  const WKS = [
    {l:'S1',d:'26/01'},{l:'S2',d:'02/02'},{l:'S3',d:'09/02'},
    {l:'S4',d:'16/02'},{l:'S5',d:'23/02'},{l:'S6',d:'02/03'},
    {l:'S7',d:'09/03'},{l:'S8',d:'16/03'},{l:'S9',d:'24/03'},
    {l:'S10',d:'31/03'},{l:'S11',d:'09/04'},{l:'S12',d:'16/04'},{l:'S13',d:'23/04'},
  ];

  // ── Layout de la tabla ────────────────────────────────────────────────────
  const LM      = 0.18;       // left margin
  const RM      = 0.18;       // right margin
  const TW      = 10 - LM - RM;          // total table width: 9.64"
  const NAME_W  = 4.55;       // column: actividad
  const PCT_W   = 0.52;       // column: %
  const WK_X0   = LM + NAME_W + PCT_W;   // x donde empiezan las semanas
  const WK_TOTAL= TW - NAME_W - PCT_W;   // 4.57"
  const WK_W    = WK_TOTAL / 13;         // ~0.351" por semana
  const TBL_Y   = 0.76;       // y donde empieza la tabla
  const HDR_H   = 0.31;       // altura header
  const ROW_H   = 0.285;      // altura fila actividad
  const BAR_H   = ROW_H * 0.38; // altura de la barra Gantt
  const BAR_PAD = 0.018;      // padding horizontal dentro de cada celda de semana

  const today = new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
  const overallReal = parseFloat((
    plan.entregables.map(e=>e.activities.length?e.activities.reduce((s,a,i)=>s+getActivityPct(e.id,i,a),0)/e.activities.length:e.pctReal)
      .reduce((s,v)=>s+v,0)/Math.max(1,plan.entregables.length)
  ).toFixed(1));
  const overallExp  = parseFloat((plan.entregables.reduce((s,e)=>s+e.pctExp,0)/Math.max(1,plan.entregables.length)).toFixed(1));
  const dif = parseFloat((overallReal-overallExp).toFixed(1));

  // ══ SLIDE 1: Portada ═════════════════════════════════════════════════════════
  const s1=pptx.addSlide(); s1.background={color:BG_DARK};
  s1.addShape('rect'as any,{x:0,y:0,w:0.07,h:5.63,fill:{color:RED}});
  s1.addText('TIMIA',{x:0.4,y:0.28,w:3,fontSize:12,bold:true,color:RED,align:'left'});
  s1.addText('Plan de Trabajo',{x:0.4,y:1.05,w:9,fontSize:22,bold:false,color:GRAY,align:'left'});
  s1.addText(`Proyecto ${plan.projectId}`,{x:0.4,y:1.55,w:9,fontSize:50,bold:true,color:WHITE,align:'left'});
  s1.addText(today,{x:0.4,y:2.85,w:9,fontSize:12,color:GRAY,align:'left'});
  [{label:'AVANCE REAL',val:`${overallReal}%`,col:WHITE},{label:'AVANCE ESPERADO',val:`${overallExp}%`,col:WHITE},{label:'DIFERENCIA',val:`${dif>=0?'+':''}${dif}%`,col:dif>=0?GREEN_L:ERR}].forEach((c,ci)=>{
    const x=0.4+ci*3.1;
    s1.addShape('rect'as any,{x,y:3.4,w:2.9,h:1.1,fill:{color:CARD},line:{color:BORDER_D,width:0.5}});
    s1.addText(c.label,{x,y:3.48,w:2.9,fontSize:7,color:GRAY,align:'center'});
    s1.addText(c.val,  {x,y:3.75,w:2.9,fontSize:26,bold:true,color:c.col,align:'center'});
  });
  s1.addText(`Resp. Timia: ${plan.respTimia}   ·   Resp. BBVA: ${plan.respBBVA}`,{x:0.4,y:4.82,w:9.2,fontSize:9,color:MUT,align:'left'});

  // ══ SLIDES 2+: Una tabla Gantt por entregable (mismo visual que la app) ═══════
  const PAGE=13; // max actividades por slide antes de paginar

  plan.entregables.forEach((ent,ei)=>{
    const ACC = ENT_COLORS[ei]??'0D9488';
    const ePct = ent.activities.length
      ? parseFloat((ent.activities.reduce((s,a,i)=>s+getActivityPct(ent.id,i,a),0)/ent.activities.length).toFixed(1))
      : ent.pctReal;
    const eDif = parseFloat((ePct-ent.pctExp).toFixed(1));

    // ── Si hay screenshot de DOM, usar slide de imagen (más fiel a la app) ──
    if (screenshots[ei]) {
      const sl=pptx.addSlide(); sl.background={color:WHITE};
      sl.addText(ent.name,{x:LM,y:0.07,w:7,fontSize:13,bold:true,color:DARK,align:'left'});
      // KPI badges
      const badges=[
        {label:'Avance real',val:`${ePct}%`,bg:DARK,vc:WHITE},
        {label:'Esperado',   val:`${ent.pctExp}%`,bg:DARK,vc:WHITE},
        {label:'Diferencia', val:`${eDif>=0?'+':''}${eDif}%`,bg:DARK,vc:eDif>=0?GREEN_L:ERR},
      ];
      badges.forEach((b,bi)=>{
        const bx=8.0+bi*0.67; const bw=0.63;
        sl.addShape('rect'as any,{x:bx,y:0.05,w:bw,h:0.58,fill:{color:b.bg},line:{color:BORDER_D,width:0.3}});
        sl.addText(b.label,{x:bx,y:0.07,w:bw,fontSize:5,color:GRAY,align:'center'});
        sl.addText(b.val,  {x:bx,y:0.22,w:bw,fontSize:13,bold:true,color:b.vc,align:'center'});
      });
      // Imagen del Gantt (DOM screenshot)
      sl.addImage({data:screenshots[ei],x:LM,y:0.72,w:TW,h:4.72,sizing:{type:'contain',w:TW,h:4.72}});
      sl.addText(`Plan de Trabajo · ${plan.projectId} · Timia Hub`,{x:7,y:5.38,w:2.8,fontSize:5.5,color:MUT,align:'right'});
      return; // salta la generación manual para este entregable
    }

    for(let page=0; page*PAGE<Math.max(1,ent.activities.length); page++){
      const acts = ent.activities.slice(page*PAGE,(page+1)*PAGE);
      const totalPages = Math.ceil(Math.max(1,ent.activities.length)/PAGE);

      // ── fondo blanco (como la app) ──────────────────────────────────────────
      const sl=pptx.addSlide(); sl.background={color:WHITE};

      // ── Título del entregable (arriba a la izquierda) ───────────────────────
      const titleStr=`${ent.name}${totalPages>1?` (${page+1}/${totalPages})`:''}`;
      sl.addText(titleStr,{x:LM,y:0.14,w:5.6,fontSize:14,bold:true,color:DARK,align:'left'});

      // ── KPI badges (arriba a la derecha, mismo look que la app) ────────────
      // "Click actividad para etapas" hint label
      sl.addText('⊞  Click actividad para etapas',{x:5.85,y:0.17,w:2.1,fontSize:6,color:MUT,align:'right'});
      const badges=[
        {label:'Avance real',val:`${ePct}%`, bg:DARK, vc:WHITE},
        {label:'Esperado',   val:`${ent.pctExp}%`,bg:DARK,vc:WHITE},
        {label:'Diferencia', val:`${eDif>=0?'+':''}${eDif}%`, bg:DARK,vc:eDif>=0?GREEN_L:ERR},
      ];
      badges.forEach((b,bi)=>{
        const bx=8.0+bi*0.67; // 3 badges in 2"
        const bw=0.63;
        sl.addShape('rect'as any,{x:bx,y:0.1,w:bw,h:0.58,fill:{color:b.bg},line:{color:BORDER_D,width:0.3}});
        sl.addText(b.label,{x:bx,y:0.12,w:bw,fontSize:5,color:GRAY,align:'center'});
        sl.addText(b.val,  {x:bx,y:0.28,w:bw,fontSize:13,bold:true,color:b.vc,align:'center'});
      });

      // ── Tabla header row (fondo maroon oscuro) ──────────────────────────────
      const hY=TBL_Y;
      sl.addShape('rect'as any,{x:LM,y:hY,w:TW,h:HDR_H,fill:{color:TBL_HDR}});
      // Cabecera izquierda
      sl.addText('Actividades / Avance',{x:LM+0.1,y:hY+0.09,w:NAME_W-0.1,fontSize:7,bold:true,color:WHITE,align:'left'});
      sl.addText('%',{x:LM+NAME_W+0.04,y:hY+0.09,w:PCT_W-0.08,fontSize:7,bold:true,color:WHITE,align:'center'});
      // Divisores verticales en header
      sl.addShape('rect'as any,{x:LM+NAME_W,y:hY,w:0.008,h:HDR_H,fill:{color:'9B1C2C'}});
      sl.addShape('rect'as any,{x:WK_X0-0.008,y:hY,w:0.008,h:HDR_H,fill:{color:'9B1C2C'}});
      // Cabecera semanas: S1-S13 con fechas
      WKS.forEach((wk,wi)=>{
        const wx=WK_X0+wi*WK_W;
        sl.addText(wk.l,{x:wx,y:hY+0.03,w:WK_W,fontSize:6.5,bold:true,color:WHITE,align:'center'});
        sl.addText(wk.d,{x:wx,y:hY+0.165,w:WK_W,fontSize:4.5,color:'FFCDD2',align:'center'});
      });

      // ── Filas de actividades ────────────────────────────────────────────────
      if(acts.length===0){
        sl.addText('Sin actividades — genera el plan desde Estimaciones',
          {x:LM,y:hY+HDR_H+0.7,w:TW,fontSize:11,color:MUT,align:'center',italic:true});
      } else {
        // Borde exterior de la tabla
        const tblH=HDR_H+acts.length*ROW_H;
        sl.addShape('rect'as any,{x:LM,y:hY,w:TW,h:tblH,fill:{color:'00000000'},line:{color:ROW_BORD,width:0.5}});

        acts.forEach((act,ai)=>{
          const gIdx=page*PAGE+ai;
          const aPct=getActivityPct(ent.id,gIdx,act);
          const rY=hY+HDR_H+ai*ROW_H;
          const isEven=ai%2===0;

          // Fondo de fila
          sl.addShape('rect'as any,{x:LM,y:rY,w:TW,h:ROW_H,fill:{color:isEven?ROW_ODD:ROW_EVEN}});
          // Borde inferior de fila
          sl.addShape('rect'as any,{x:LM,y:rY+ROW_H-0.006,w:TW,h:0.006,fill:{color:ROW_BORD}});

          // Divisor vertical nombre|%
          sl.addShape('rect'as any,{x:LM+NAME_W,y:rY,w:0.006,h:ROW_H,fill:{color:ROW_BORD}});
          // Divisor vertical %|semanas
          sl.addShape('rect'as any,{x:WK_X0-0.006,y:rY,w:0.006,h:ROW_H,fill:{color:ROW_BORD}});

          // ── BBVA badge ────────────────────────────────────────────────────
          let nameX=LM+0.08;
          if(act.bbva){
            sl.addShape('rect'as any,{x:LM+0.07,y:rY+0.075,w:0.35,h:0.135,fill:{color:BBVA_BG}});
            sl.addText('BBVA',{x:LM+0.07,y:rY+0.077,w:0.35,fontSize:5.5,bold:true,color:WHITE,align:'center'});
            nameX=LM+0.45;
          }

          // ── Icono etapas (⊞ como en la app) ──────────────────────────────
          const hasEtapas=!!(act.etapas&&act.etapas.length>0);

          // ── Nombre de la actividad ────────────────────────────────────────
          const nameW=NAME_W-nameX+LM-(hasEtapas?0.22:0.1);
          const nameColor=aPct>=100?GREEN:DARK;
          sl.addText(act.name,{x:nameX,y:rY+0.078,w:nameW,fontSize:8,color:nameColor,align:'left',shrinkText:true});

          // Icono ⊞ si tiene etapas
          if(hasEtapas){
            sl.addText('⊞',{x:LM+NAME_W-0.2,y:rY+0.065,w:0.18,fontSize:9,color:'0D9488',align:'right'});
          }

          // ── % ─────────────────────────────────────────────────────────────
          const pctColor=aPct>=100?GREEN:aPct>0?AMBER:MUT;
          sl.addText(`${aPct}%`,{x:LM+NAME_W+0.04,y:rY+0.078,w:PCT_W-0.08,fontSize:7.5,bold:true,color:pctColor,align:'center'});

          // ── Barras Gantt por semana ────────────────────────────────────────
          // Calculamos cuántas semanas de las planificadas están "ejecutadas"
          const sw=act.startWeek??1;
          const ew=act.endWeek??13;
          const spanWeeks=Math.max(1,ew-sw+1);
          const execWeeks=aPct/100*spanWeeks;
          const barY=rY+(ROW_H-BAR_H)/2;

          // Para cada semana, dibujamos la celda Gantt
          for(let wi=0;wi<13;wi++){
            const weekNum=wi+1;
            const wx=WK_X0+wi*WK_W;
            if(weekNum<sw||weekNum>ew) continue; // fuera del rango → nada

            const cellX=wx+BAR_PAD;
            const cellW=WK_W-BAR_PAD*2;

            // Siempre: barra planificado (fondo claro)
            sl.addShape('rect'as any,{x:cellX,y:barY,w:cellW,h:BAR_H,fill:{color:BAR_PLAN}});

            // Barra ejecutado: calculamos qué fracción de esta semana está done
            const relativeStart=weekNum-sw;           // 0-indexed dentro del span
            const weekStartFrac=relativeStart/spanWeeks;
            const weekEndFrac=(relativeStart+1)/spanWeeks;
            const execFrac=Math.min(1,Math.max(0,execWeeks/spanWeeks));

            if(execFrac>weekStartFrac){
              const fillFrac=Math.min(weekEndFrac,execFrac)-weekStartFrac;
              const normFill=fillFrac/(weekEndFrac-weekStartFrac);
              sl.addShape('rect'as any,{x:cellX,y:barY,w:Math.max(0.01,cellW*normFill),h:BAR_H,fill:{color:BAR_DONE}});
            }
          }
        });
      }

      // ── Leyenda (parte inferior, idéntica a la app) ─────────────────────────
      const legY=5.33;
      // Fondo sutil para la leyenda
      sl.addShape('rect'as any,{x:LM,y:legY-0.04,w:TW,h:0.26,fill:{color:'F8FAFC'},line:{color:ROW_BORD,width:0.3}});

      let lx=LM+0.12;
      // Ejecutado
      sl.addShape('rect'as any,{x:lx,y:legY+0.05,w:0.14,h:0.11,fill:{color:BAR_DONE}});
      sl.addText('Ejecutado',{x:lx+0.17,y:legY+0.02,w:0.85,fontSize:6.5,color:MUT});
      lx+=1.1;
      // Planificado
      sl.addShape('rect'as any,{x:lx,y:legY+0.05,w:0.14,h:0.11,fill:{color:BAR_PLAN},line:{color:ROW_BORD,width:0.3}});
      sl.addText('Planificado',{x:lx+0.17,y:legY+0.02,w:0.85,fontSize:6.5,color:MUT});
      lx+=1.1;
      // BBVA
      sl.addShape('rect'as any,{x:lx,y:legY+0.035,w:0.35,h:0.135,fill:{color:BBVA_BG}});
      sl.addText('BBVA',{x:lx,y:legY+0.037,w:0.35,fontSize:5.5,bold:true,color:WHITE,align:'center'});
      sl.addText('Depende de BBVA',{x:lx+0.38,y:legY+0.02,w:1.3,fontSize:6.5,color:MUT});
      lx+=1.8;
      // Etapas
      sl.addText('⊞',{x:lx,y:legY-0.005,w:0.15,fontSize:10,color:'0D9488'});
      sl.addText('Tiene etapas (click)',{x:lx+0.17,y:legY+0.02,w:1.4,fontSize:6.5,color:MUT});

      // Pie de página
      sl.addText(`Plan de Trabajo · ${plan.projectId} · Timia Hub`,{x:7,y:legY+0.02,w:2.8,fontSize:6,color:MUT,align:'right'});
    }
  });

  // ══ SLIDE FINAL: Estado y próximas acciones ═══════════════════════════════════
  const sL=pptx.addSlide(); sL.background={color:BG_DARK};
  sL.addShape('rect'as any,{x:0,y:0,w:0.07,h:5.63,fill:{color:WARN}});
  sL.addText('Estado y próximas acciones',{x:0.4,y:0.22,w:9,fontSize:18,bold:true,color:WHITE});
  [{title:'✅ Siguientes pasos',items:plan.pasos.length?plan.pasos:['Sin pasos registrados'],col:GREEN_L,x:0.4},
   {title:'⚠ Alertas',        items:plan.alertas.length?plan.alertas:['Sin alertas'],col:WARN,x:3.5},
   {title:'🚧 Bloqueantes',    items:plan.bloqueantes.length?plan.bloqueantes:['Sin bloqueantes'],col:ERR,x:6.6}
  ].forEach(sec=>{
    sL.addShape('rect'as any,{x:sec.x,y:0.88,w:2.9,h:4.3,fill:{color:CARD},line:{color:BORDER_D,width:0.5}});
    sL.addText(sec.title,{x:sec.x+0.1,y:0.98,w:2.7,fontSize:9.5,bold:true,color:sec.col});
    sec.items.forEach((item,ii)=>sL.addText(`• ${item}`,{x:sec.x+0.1,y:1.5+ii*0.42,w:2.7,fontSize:9,color:'F1F5F9',wrap:true}));
  });
  sL.addText('Generado por Timia Hub',{x:0.4,y:5.1,w:9,fontSize:8,color:MUT,align:'center'});

  await pptx.writeFile({fileName:`Plan_${plan.projectId}_${new Date().toISOString().slice(0,10)}.pptx`});
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DrawerState { projectId: string; entregableId: string; actIdx: number; act: PlanActivity; }

export default function PlanDeTrabajo({ onGoEstimaciones }: { onGoEstimaciones?: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? 'developer';
  const canMark = user ? (['pm','tech_lead','tech_ref'] as string[]).includes(user.role) : false;

  // ── Planes efectivos: WORK_PLANS estáticos + planes generados desde Estimaciones ──
  // Si existe un plan generado para un proyecto estático, lo sobreescribe (permite generar NGA, CRONOS, etc.)
  function buildEffectivePlans(): WorkPlan[] {
    const storedConfigs = adminStore.getPlanConfigs();
    // Fechas de inicio overrides desde db.json → localStorage
    // Permite cambiar startDate sin recompilar el código
    let startDateOverrides: Record<string, string> = {};
    try {
      const raw = localStorage.getItem('timia_plan_startdates');
      if (raw) startDateOverrides = JSON.parse(raw);
    } catch { /* ignorar */ }

    // Mapa de planes generados (projectId → WorkPlan)
    const generatedMap: Record<string, WorkPlan> = {};
    Object.values(storedConfigs).forEach(c => {
      if (c.generatedAt && c.entregables.length > 0) {
        generatedMap[c.projectId] = planConfigToWorkPlan(c);
      }
    });
    // Prioridad: generated sobre static; aplica startDate override si existe
    const merged = WORK_PLANS.map(p => {
      const base = generatedMap[p.projectId] ?? p;
      const override = startDateOverrides[p.projectId];
      return override ? { ...base, startDate: override } : base;
    });
    // Agregar planes generados para proyectos sin plan estático
    const staticIds = new Set(WORK_PLANS.map(p => p.projectId));
    const extra = Object.values(generatedMap).filter(g => !staticIds.has(g.projectId));
    return [...merged, ...extra];
  }

  const [effectivePlans, setEffectivePlans] = useState<WorkPlan[]>(buildEffectivePlans);

  // Refrescar en cada mount (puede venir de Estimaciones con nuevo plan)
  useEffect(() => { setEffectivePlans(buildEffectivePlans()); }, []);

  // Filtrar según rol del usuario
  const visiblePlans = role === 'pm'
    ? effectivePlans
    : effectivePlans.filter(p => (user?.projectIds ?? []).includes(p.projectId));

  const [etapaStates,       setEtapaStates]       = useState<EtapaStates>(()         => adminStore.getEtapaStates());
  const [historial,         setHistorial]         = useState<PlanHistorialEntry[]>(() => adminStore.getHistorial());
  const [activityAssignees, setActivityAssignees] = useState<ActivityAssignees>(()   => adminStore.getActivityAssignees());
  const [pctOverrides,      setPctOverrides]      = useState<Record<string,number>>(()=> adminStore.getPlanPcts());
  const [activityJiras,     setActivityJiras]     = useState<Record<string,string>>(()=> adminStore.getActivityJiras());
  const [activityDoneDates, setActivityDoneDates] = useState<Record<string,string>>(()=> adminStore.getActivityDoneDates());
  const [selected,          setSelected]          = useState<string>(() => {
    // Si vienen de Estimaciones con un proyecto recién generado, auto-seleccionarlo
    const lastGen = localStorage.getItem('timia_last_plan_project');
    if (lastGen) {
      localStorage.removeItem('timia_last_plan_project');
      return lastGen;
    }
    // Para no-PM, arrancar en el primer proyecto asignado
    if (!user || user.role === 'pm') return WORK_PLANS[0].projectId;
    const firstAssigned = WORK_PLANS.find(p => (user.projectIds ?? []).includes(p.projectId));
    return firstAssigned?.projectId ?? WORK_PLANS[0].projectId;
  });
  const [drawer,            setDrawer]            = useState<DrawerState | null>(null);
  const [exportingPptx,     setExportingPptx]     = useState(false);
  const [exportingPdf,      setExportingPdf]      = useState(false);
  const [exportError,       setExportError]       = useState<string>('');
  // inFlow: true cuando venimos del wizard (paso 3/3)
  const [inFlow, setInFlow] = useState<boolean>(
    () => localStorage.getItem('timia_setup_flow') === '3'
  );

  // Limpiar error de exportación al cambiar de proyecto (debe ir después de selected y setExportError)
  useEffect(() => { setExportError(''); }, [selected]);

  // ── Auto-limpiar el flag del wizard al montar ────────────────────────────────
  // El stepper/banner se muestra una sola vez (sesión actual).
  // Al recargar, timia_setup_flow ya no existe → inFlow = false.
  useEffect(() => {
    if (localStorage.getItem('timia_setup_flow') === '3') {
      localStorage.removeItem('timia_setup_flow');
    }
  }, []);

  // El plan activo: buscar primero en effectivePlans
  const plan = effectivePlans.find(p => p.projectId === selected);

  // ── Effective pct: fallback to act.pct if no etapa states set yet ──────────
  function getActivityPct(projectId: string, entregableId: string, actIdx: number, act: PlanActivity): number {
    if (act.etapas?.length) {
      // Check if user has interacted with any etapa for this activity
      const anyInteracted = act.etapas.some(e => {
        const k = `${projectId}__${entregableId}__${actIdx}__${e.id}`;
        return etapaStates[k] !== undefined;
      });
      if (!anyInteracted) return act.pct; // show original progress
      return Math.min(100, act.etapas.reduce((sum, e) => {
        const k = `${projectId}__${entregableId}__${actIdx}__${e.id}`;
        return sum + (etapaStates[k]?.done ? e.peso : 0);
      }, 0));
    }
    const k = `${projectId}-${entregableId}-${actIdx}`;
    return pctOverrides[k] !== undefined ? pctOverrides[k] : act.pct;
  }

  function setActivityPctManual(entregableId: string, actIdx: number, pct: number) {
    const k = `${selected}-${entregableId}-${actIdx}`;
    const next = { ...pctOverrides, [k]: pct };
    setPctOverrides(next); adminStore.savePlanPcts(next);
    const doneKey = `${selected}-${entregableId}-${actIdx}`;
    const nextDone = { ...activityDoneDates };
    if (pct >= 100) {
      if (!nextDone[doneKey]) nextDone[doneKey] = new Date().toISOString();
    } else {
      delete nextDone[doneKey];
    }
    setActivityDoneDates(nextDone);
    adminStore.saveActivityDoneDates(nextDone);
  }

  function handleEtapaToggle(etapaId: string) {
    if (!user || !drawer) return;
    const { projectId, entregableId, actIdx, act } = drawer;
    const k = `${projectId}__${entregableId}__${actIdx}__${etapaId}`;
    const newDone = !(etapaStates[k]?.done ?? false);
    const nextEtapaStates: EtapaStates = { ...etapaStates, [k]: newDone
      ? { done: true, doneBy: user.name, doneAt: new Date().toISOString() }
      : { done: false, doneBy: '', doneAt: '' } };
    const newActPct = Math.min(100, (act.etapas ?? []).reduce((sum, e) => {
      const ek = `${projectId}__${entregableId}__${actIdx}__${e.id}`;
      const isDone = e.id === etapaId ? newDone : (nextEtapaStates[ek]?.done ?? false);
      return sum + (isDone ? e.peso : 0);
    }, 0));
    const pctKey = `${projectId}-${entregableId}-${actIdx}`;
    const nextPctOverrides = { ...pctOverrides, [pctKey]: newActPct };
    const etapa = (act.etapas ?? []).find(e => e.id === etapaId);
    const histEntry: PlanHistorialEntry = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      projectId, entregableId, actIdx, etapaLabel: etapa?.label ?? etapaId,
      action: newDone ? 'checked' : 'unchecked',
      userName: user.name, userInitials: user.initials, userColor: user.avatarColor,
      timestamp: new Date().toISOString(),
    };
    const nextHistorial = [histEntry, ...historial];
    const doneKey2 = `${projectId}-${entregableId}-${actIdx}`;
    const nextDone2 = { ...activityDoneDates };
    if (newActPct >= 100) {
      if (!nextDone2[doneKey2]) nextDone2[doneKey2] = new Date().toISOString();
    } else {
      delete nextDone2[doneKey2];
    }
    setActivityDoneDates(nextDone2);
    setEtapaStates(nextEtapaStates); setPctOverrides(nextPctOverrides); setHistorial(nextHistorial);
    adminStore.saveEtapaStates(nextEtapaStates); adminStore.savePlanPcts(nextPctOverrides); adminStore.saveHistorial(nextHistorial); adminStore.saveActivityDoneDates(nextDone2);
  }

  function handleAssigneeAdd(userId: string) {
    if (!drawer) return;
    const { projectId, entregableId, actIdx } = drawer;
    const k = `${projectId}__${entregableId}__${actIdx}`;
    const current = activityAssignees[k] ?? [];
    if (current.includes(userId)) return;
    const newIds = [...current, userId];
    const next = { ...activityAssignees, [k]: newIds };
    setActivityAssignees(next);
    adminStore.saveActivityAssignees(next);
    // Sync al Kanban: si existe una tarea vinculada a este plan, actualiza sus assignees
    adminStore.syncKanbanAssignees(projectId, entregableId, actIdx, newIds);
  }

  function handleAssigneeRemove(userId: string) {
    if (!drawer) return;
    const { projectId, entregableId, actIdx } = drawer;
    const k = `${projectId}__${entregableId}__${actIdx}`;
    const newIds = (activityAssignees[k] ?? []).filter(id => id !== userId);
    const next = { ...activityAssignees, [k]: newIds };
    setActivityAssignees(next);
    adminStore.saveActivityAssignees(next);
    // Sync al Kanban: si existe una tarea vinculada a este plan, actualiza sus assignees
    adminStore.syncKanbanAssignees(projectId, entregableId, actIdx, newIds);
  }

  async function handleExportPptx() {
    if (!plan) return;
    setExportingPptx(true);
    setExportError('');
    // screenshots indexed by entregable index (sparse — empty string = use manual slide)
    const numEntregables = plan.entregables.length;
    const screenshots: string[] = new Array(numEntregables).fill('');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const sectionEls = Array.from(document.querySelectorAll<HTMLElement>('[data-gantt-section]'));

      for (const el of sectionEls) {
        // The attribute value is the entregable index
        const sIdx = parseInt(el.getAttribute('data-gantt-section') ?? '-1', 10);
        if (sIdx < 0 || sIdx >= numEntregables) continue;
        try {
          // Temporarily expand overflow so the full Gantt is visible
          const saved: { el: HTMLElement; prop: string; val: string }[] = [];
          const expand = (e: HTMLElement, prop: string) => {
            saved.push({ el: e, prop, val: (e.style as Record<string,string>)[prop] ?? '' });
            (e.style as Record<string,string>)[prop] = 'visible';
          };
          expand(el, 'overflow');
          expand(el, 'overflowX');
          const innerTable = el.querySelector<HTMLElement>('[data-gantt-table]');
          if (innerTable) { expand(innerTable, 'overflow'); expand(innerTable, 'overflowX'); }
          // Reflow
          await new Promise<void>(r => setTimeout(r, 80));

          const canvas = await html2canvas(el, {
            scale: 1.5,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            logging: false,
            width: el.scrollWidth,
            height: el.scrollHeight,
            windowWidth: el.scrollWidth + 100,
            onclone: (_doc: Document, clonedEl: HTMLElement) => {
              // html2canvas no captura 'background' en <tr> correctamente → forzar
              clonedEl.querySelectorAll<HTMLElement>('thead tr').forEach(tr => {
                tr.style.backgroundColor = '#881337';
              });
              clonedEl.querySelectorAll<HTMLElement>('thead th').forEach(th => {
                th.style.backgroundColor = '#881337';
                th.style.color = '#ffffff';
              });
            },
          });

          // Restore
          for (const { el: e, prop, val } of saved) { (e.style as Record<string,string>)[prop] = val; }

          if (canvas.width > 0 && canvas.height > 0) {
            screenshots[sIdx] = canvas.toDataURL('image/png');
          }
        } catch (screenshotErr) {
          console.warn(`html2canvas failed for section ${sIdx}:`, screenshotErr);
          // screenshots[sIdx] stays '' → exportPlanPPTX uses manual table for this section
        }
      }

      await exportPlanPPTX(plan, (eid,ai,a) => getActivityPct(plan.projectId,eid,ai,a), screenshots);
    } catch (err) {
      console.error('PPTX export error:', err);
      const msg = (err instanceof Error) ? err.message : String(err);
      setExportError(`Error al generar PPTX: ${msg}`);
    } finally {
      setExportingPptx(false);
    }
  }

  // ── PDF Export — jsPDF programático (sin html2canvas, 100% fiable) ──────────
  async function handleExportPdf() {
    if (!plan) return;
    setExportingPdf(true);
    setExportError('');
    try {
      const { default: jsPDF } = await (import('jspdf') as Promise<{ default: any }>);

      // ── Constantes de layout ──────────────────────────────────────────────
      const PW = 297, PH = 210;                          // A4 landscape mm
      const ML = 14, MR = 14;                           // márgenes laterales
      const CW = PW - ML - MR;                          // 269mm ancho útil
      const NAME_COL = 90, PCT_COL = 11;
      const WEEK_COL = (CW - NAME_COL - PCT_COL) / TOTAL_WEEKS; // ~13mm
      const HDR_H = 28, TBL_HDR_H = 8, ROW_H = 7.5;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const dateStr = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

      const ENT_COLORS = ['#9f1239','#0369a1','#0d9488','#7c3aed','#b45309','#059669'];

      // ── PORTADA ───────────────────────────────────────────────────────────
      pdf.setFillColor(26, 26, 46);
      pdf.rect(0, 0, PW, PH, 'F');
      // barra roja izquierda
      pdf.setFillColor(220, 38, 38);
      pdf.rect(0, 0, 5, PH, 'F');
      // logo box
      pdf.roundedRect(ML + 3, 18, 12, 12, 2, 2, 'F');
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
      pdf.text('T', ML + 9.5, 26.5, { align: 'center' });
      // tagline
      pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148, 163, 184);
      pdf.text('TIMIA Hub  ·  Gobierno del Dato', ML + 19, 26);
      // subtítulo
      pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148, 163, 184);
      pdf.text('Plan de Trabajo', ML + 3, 50);
      // nombre proyecto grande
      pdf.setFontSize(42); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
      pdf.text(plan.projectId, ML + 3, 80);
      // info
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148, 163, 184);
      pdf.text(dateStr, ML + 3, 94);
      pdf.text(`Resp. TIMIA: ${plan.respTimia}`, ML + 3, 103);
      if (plan.respBBVA && !plan.respBBVA.includes('Credicorp')) {
        const bbvaLines: string[] = pdf.splitTextToSize(`Resp. BBVA: ${plan.respBBVA}`, CW - 90);
        bbvaLines.slice(0, 2).forEach((l: string, i: number) => pdf.text(l, ML + 3, 112 + i * 7));
      }
      // barra progreso global
      const totalPct = plan.entregables.reduce((s, e) => {
        const p = e.activities.length
          ? e.activities.reduce((ss, a, i) => ss + getActivityPct(plan.projectId, e.id, i, a), 0) / e.activities.length
          : e.pctReal;
        return s + p;
      }, 0) / plan.entregables.length;
      pdf.setFillColor(42, 42, 70);
      pdf.roundedRect(ML + 3, 130, 100, 4, 1, 1, 'F');
      pdf.setFillColor(220, 38, 38);
      pdf.roundedRect(ML + 3, 130, Math.max(2, 100 * Math.min(totalPct, 100) / 100), 4, 1, 1, 'F');
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(220, 38, 38);
      pdf.text(`${totalPct.toFixed(1)}% completado`, ML + 3, 140);

      // tarjetas de entregables (columna derecha)
      let cardX = PW - MR - 88, cardY = 18;
      pdf.setFontSize(5.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(148, 163, 184);
      pdf.text('ENTREGABLES', cardX, cardY - 3);
      plan.entregables.forEach((e, i) => {
        const [er, eg, eb] = hexToRgb(ENT_COLORS[i % ENT_COLORS.length]);
        const ePct = e.activities.length
          ? e.activities.reduce((s, a, ai) => s + getActivityPct(plan.projectId, e.id, ai, a), 0) / e.activities.length
          : e.pctReal;
        const cH = 22;
        pdf.setFillColor(Math.min(255, er * 0.15 + 32), Math.min(255, eg * 0.1 + 30), Math.min(255, eb * 0.1 + 50));
        pdf.roundedRect(cardX, cardY, 85, cH, 2, 2, 'F');
        pdf.setFillColor(er, eg, eb);
        pdf.rect(cardX, cardY, 3, cH, 'F');
        const nameLines: string[] = pdf.splitTextToSize(e.name, 60);
        pdf.setFontSize(6); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(er, eg, eb);
        pdf.text(nameLines[0], cardX + 6, cardY + 7);
        if (nameLines.length > 1) { pdf.setFontSize(5); pdf.text(nameLines[1], cardX + 6, cardY + 11.5); }
        pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
        pdf.text(`${ePct.toFixed(0)}%`, cardX + 82, cardY + 13, { align: 'right' });
        // mini progress bar
        pdf.setFillColor(42, 42, 70);
        pdf.roundedRect(cardX + 5, cardY + cH - 5, 60, 2.5, 1, 1, 'F');
        pdf.setFillColor(er, eg, eb);
        pdf.roundedRect(cardX + 5, cardY + cH - 5, Math.max(1, 60 * Math.min(ePct, 100) / 100), 2.5, 1, 1, 'F');
        cardY += cH + 3;
      });

      // footer portada
      pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(74, 85, 104);
      pdf.text(`Generado con Timia Hub  ·  ${dateStr}`, PW / 2, PH - 6, { align: 'center' });

      // ── PÁGINAS POR ENTREGABLE ────────────────────────────────────────────
      plan.entregables.forEach((ent, ei) => {
        pdf.addPage([297, 210], 'landscape');
        const [er, eg, eb] = hexToRgb(ENT_COLORS[ei % ENT_COLORS.length]);

        // cabecera de página
        pdf.setFillColor(26, 26, 46);
        pdf.rect(0, 0, PW, HDR_H, 'F');
        pdf.setFillColor(er, eg, eb);
        pdf.rect(0, 0, 5, HDR_H, 'F');

        pdf.setFontSize(6); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148, 163, 184);
        pdf.text(`TIMIA  ·  Plan de Trabajo  ·  ${plan.projectId}`, ML + 3, 9);
        const entLines: string[] = pdf.splitTextToSize(ent.name, CW - 90);
        pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
        pdf.text(entLines[0], ML + 3, 21);

        // estadísticas (derecha)
        const ePct = ent.activities.length
          ? ent.activities.reduce((s, a, ai) => s + getActivityPct(plan.projectId, ent.id, ai, a), 0) / ent.activities.length
          : ent.pctReal;
        const dif = ePct - ent.pctExp;
        const difClr: [number, number, number] = dif >= 0 ? [34, 197, 94] : dif < -5 ? [220, 38, 38] : [245, 158, 11];
        let sx = PW - MR;
        for (const { label, val, clr } of [
          { label: 'DIF.', val: `${dif > 0 ? '+' : ''}${dif.toFixed(1)}%`, clr: difClr },
          { label: 'ESP.',  val: `${ent.pctExp.toFixed(1)}%`, clr: [180, 190, 210] as [number, number, number] },
          { label: 'REAL', val: `${ePct.toFixed(1)}%`, clr: [255, 255, 255] as [number, number, number] },
        ]) {
          const bw = 34;
          sx -= bw + 3;
          pdf.setFillColor(42, 42, 70);
          pdf.roundedRect(sx, 3, bw, HDR_H - 5, 2, 2, 'F');
          pdf.setFontSize(4.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...clr);
          pdf.text(label, sx + bw / 2, 9, { align: 'center' });
          pdf.setFontSize(9.5); pdf.setFont('helvetica', 'bold');
          pdf.text(val, sx + bw / 2, 20, { align: 'center' });
        }

        // ── TABLA GANTT ───────────────────────────────────────────────────
        const tY = HDR_H + 2;

        // fila cabecera (crimson)
        pdf.setFillColor(136, 19, 55);
        pdf.rect(ML, tY, CW, TBL_HDR_H, 'F');
        pdf.setFontSize(5.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
        pdf.text('Actividades / Avance', ML + 2, tY + 5.5);
        pdf.text('%', ML + NAME_COL + PCT_COL / 2, tY + 5.5, { align: 'center' });

        WEEKS.forEach((w, wi) => {
          const wx = ML + NAME_COL + PCT_COL + wi * WEEK_COL;
          pdf.setDrawColor(255, 255, 255); pdf.setLineWidth(0.2);
          pdf.line(wx, tY, wx, tY + TBL_HDR_H);
          pdf.setFontSize(5.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
          pdf.text(w.l, wx + WEEK_COL / 2, tY + 4, { align: 'center' });
          pdf.setFontSize(4); pdf.setTextColor(252, 231, 243);
          pdf.text(w.d, wx + WEEK_COL / 2, tY + 7.2, { align: 'center' });
        });

        // filas de actividades
        ent.activities.forEach((act, ai) => {
          const ry = tY + TBL_HDR_H + ai * ROW_H;
          const rowPct = getActivityPct(plan.projectId, ent.id, ai, act);

          // fondo alternado
          pdf.setFillColor(ai % 2 === 0 ? 255 : 249, ai % 2 === 0 ? 255 : 250, ai % 2 === 0 ? 255 : 252);
          pdf.rect(ML, ry, CW, ROW_H, 'F');

          // nombre actividad
          const nameLines2: string[] = pdf.splitTextToSize(act.name, NAME_COL - 5);
          pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(55, 65, 81);
          pdf.text(nameLines2[0], ML + 2, ry + 4.5);
          if (nameLines2.length > 1) {
            pdf.setFontSize(4.5); pdf.setTextColor(100, 116, 139);
            pdf.text(nameLines2[1], ML + 2, ry + 7.2);
          }
          // badge BBVA
          if (act.bbva) {
            pdf.setFillColor(219, 234, 254);
            pdf.roundedRect(ML + 2, ry + ROW_H - 3.2, 12, 2.4, 0.5, 0.5, 'F');
            pdf.setFontSize(3.8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(37, 99, 235);
            pdf.text('BBVA', ML + 8, ry + ROW_H - 1.4, { align: 'center' });
          }

          // % con color semáforo
          const pctClr: [number, number, number] = rowPct >= act.pctExp ? [34, 197, 94]
            : rowPct >= act.pctExp * 0.75 ? [245, 158, 11] : [220, 38, 38];
          pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...pctClr);
          pdf.text(`${rowPct.toFixed(0)}%`, ML + NAME_COL + PCT_COL / 2, ry + 5.2, { align: 'center' });

          // barras Gantt por semana
          for (let wi = 0; wi < TOTAL_WEEKS; wi++) {
            const wx = ML + NAME_COL + PCT_COL + wi * WEEK_COL;
            pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.12);
            pdf.line(wx, ry, wx, ry + ROW_H);

            const planStart = act.startWeek - 1, planEnd = act.endWeek;
            const totalSpan = planEnd - planStart;
            const execEnd = planStart + (rowPct / 100) * totalSpan;
            const planOverlap = Math.max(0, Math.min(planEnd, wi + 1) - Math.max(planStart, wi));
            if (planOverlap === 0) continue;
            const execOverlap = Math.max(0, Math.min(execEnd, wi + 1) - Math.max(planStart, wi));
            const execFrac = Math.min(1, execOverlap / planOverlap);

            const bH = 3.5, bY = ry + (ROW_H - bH) / 2;
            const bX = wx + 0.8, bW = WEEK_COL - 1.6;
            // fondo plan (teal claro)
            pdf.setFillColor(204, 236, 234);
            pdf.roundedRect(bX, bY, bW, bH, 0.8, 0.8, 'F');
            // ejecución (teal sólido)
            if (execFrac > 0.01) {
              pdf.setFillColor(13, 148, 136);
              pdf.roundedRect(bX, bY, Math.max(0.5, bW * execFrac), bH, 0.8, 0.8, 'F');
            }
          }

          // borde inferior fila
          pdf.setDrawColor(241, 245, 249); pdf.setLineWidth(0.2);
          pdf.line(ML, ry + ROW_H, ML + CW, ry + ROW_H);
        });

        const tableH = TBL_HDR_H + ent.activities.length * ROW_H;
        // borde exterior tabla
        pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.3);
        pdf.rect(ML, tY, CW, tableH, 'S');
        // divisores columnas
        pdf.setLineWidth(0.2);
        pdf.line(ML + NAME_COL, tY, ML + NAME_COL, tY + tableH);
        pdf.line(ML + NAME_COL + PCT_COL, tY, ML + NAME_COL + PCT_COL, tY + tableH);

        // leyenda semáforo debajo de tabla
        const legY = tY + tableH + 4;
        [
          { clr: [34,197,94] as [number,number,number], label: 'En tiempo' },
          { clr: [245,158,11] as [number,number,number], label: 'Con demora leve' },
          { clr: [220,38,38] as [number,number,number], label: 'Atrasado' },
        ].forEach(({ clr, label }, i) => {
          const lx = ML + i * 40;
          pdf.setFillColor(...clr); pdf.circle(lx + 2, legY + 1.5, 1.5, 'F');
          pdf.setFontSize(5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 116, 139);
          pdf.text(label, lx + 5, legY + 2.5);
        });

        // pie de página
        pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(148, 163, 184);
        pdf.text(`Plan de Trabajo  ·  ${plan.projectId}  ·  Timia Hub`, PW - MR, PH - 5, { align: 'right' });
        pdf.text(`Pág. ${ei + 2} / ${plan.entregables.length + 1}`, ML, PH - 5);
      });

      pdf.save(`Plan_${plan.projectId}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      const msg = (err instanceof Error) ? err.message : String(err);
      setExportError(`Error al generar PDF: ${msg}`);
    } finally {
      setExportingPdf(false);
    }
  }

  // ── Imprimir como PDF — ventana limpia (window.open) ─────────────────────────
  function handlePrint() {
    const printEl = document.getElementById('timia-plan-print');
    if (!printEl) { alert('No se encontró el contenido del plan.'); return; }

    // Clonar el nodo con todos sus estilos inline
    const clone = printEl.cloneNode(true) as HTMLElement;

    // Quitar elementos marcados como data-print-hide dentro del clon
    clone.querySelectorAll<HTMLElement>('[data-print-hide]').forEach(el => el.remove());
    // Ocultar botones que no sean parte del Gantt (Imprimir, Configurar, etc.)
    clone.querySelectorAll<HTMLButtonElement>('button').forEach(btn => {
      if (!btn.closest('[data-gantt-section]')) btn.style.display = 'none';
    });

    const projectLabel = plan?.projectId ?? 'Timia';
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Plan de Trabajo · ${projectLabel}</title>
  <style>
    @page { size: A3 landscape; margin: 10mm 12mm; }

    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }

    html, body {
      margin: 0; padding: 0;
      width: 100%; height: auto;
      background: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #111;
    }

    /* El contenedor del plan ocupa todo el ancho — sin padres que restrinjan */
    #timia-plan-print {
      display: block;
      width: 100%;
    }

    /* ── Secciones Gantt ─────────────────────────────────────────────── */
    [data-gantt-section] {
      margin-bottom: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    [data-gantt-section]:first-of-type { page-break-before: avoid; }
    [data-gantt-section] + [data-gantt-section] { page-break-before: always; }

    /* ── Tablas full width ───────────────────────────────────────────── */
    [data-gantt-table] {
      overflow: visible;
      width: 100%;
    }
    [data-gantt-table] table {
      width: 100%;
      min-width: unset !important;
      table-layout: fixed;
      border-collapse: collapse;
    }

    /* ── Tipografía ─────────────────────────────────────────────────── */
    [data-gantt-section] td,
    [data-gantt-section] th { font-size: 10pt; }
    [data-gantt-section] h4  { font-size: 13pt; }

    /* ── Ocultar botones y controles interactivos ───────────────────── */
    button { display: none !important; }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1400,height=900');
    if (!win) {
      alert('Activa las ventanas emergentes para este sitio y vuelve a intentarlo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();

    // Dar tiempo a que cargue el DOM antes de imprimir
    setTimeout(() => {
      win.focus();
      win.print();
      win.addEventListener('afterprint', () => win.close(), { once: true });
    }, 300);
  }

  function handleJiraSave(jiraId: string) {
    if (!drawer) return;
    const k = `${drawer.projectId}__${drawer.entregableId}__${drawer.actIdx}`;
    const next = { ...activityJiras };
    if (jiraId) next[k] = jiraId; else delete next[k];
    setActivityJiras(next); adminStore.saveActivityJiras(next);
  }

  function getDoneDateLabel(projectId: string, entregableId: string, actIdx: number): string | undefined {
    const k = `${projectId}-${entregableId}-${actIdx}`;
    const iso = activityDoneDates[k];
    if (!iso) return undefined;
    const d = new Date(iso);
    return `finalizada ${d.getDate()} ${d.toLocaleDateString('es-CO', { month: 'short' })}`;
  }

  // All active users for the search (not project-filtered — 100+ employees)
  const allUsers: AdminUser[] = adminStore.getUsers().filter(u => u.active);

  // Set de festivos para cálculo de días hábiles (cargado una vez por render)
  const holidays = React.useMemo(() => {
    const hols = adminStore.getHolidays();
    return new Set(hols.map(h => h.date));
  }, []);

  const drawerKey         = drawer ? `${drawer.projectId}__${drawer.entregableId}__${drawer.actIdx}` : '';
  const drawerAssigneeIds = drawer ? (activityAssignees[drawerKey] ?? []) : [];
  const drawerEffectivePct = drawer ? getActivityPct(drawer.projectId, drawer.entregableId, drawer.actIdx, drawer.act) : 0;

  return (
    <div id="timia-plan-root">
      {/* ── Flow stepper (paso 3/3 — solo si venimos del wizard) ─────────── */}
      {inFlow && (
        <div data-print-hide style={{ marginBottom: 20 }}>
          <FlowStepper current={3} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 10, marginTop: -12 }}>
            <CheckCircle size={14} color="#15803d"/>
            <p style={{ margin: 0, fontSize: 11, color: '#15803d', fontWeight: 600 }}>
              ¡Plan generado! Revisa el Gantt y marca el avance de cada actividad.
            </p>
            {onGoEstimaciones && (
              <button
                onClick={() => {
                  localStorage.removeItem('timia_setup_flow');
                  setInFlow(false);
                  onGoEstimaciones();
                }}
                style={{ marginLeft: 'auto', fontSize: 10, padding: '4px 10px', border: '0.5px solid #86efac', borderRadius: 6, background: '#fff', color: '#15803d', cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}
              >
                ← Ajustar estimación
              </button>
            )}
          </div>
        </div>
      )}

    <div style={{ display: 'flex', gap: 14 }}>
      {/* Sidebar — hidden on print */}
      <div id="timia-plan-sidebar" data-print-hide style={{ width: 128, flexShrink: 0 }}>
        <p style={{ margin:'0 0 8px', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Proyectos</p>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {visiblePlans.map(p => {
            const proj=PROJECTS.find(pr=>pr.id===p.projectId), color=proj?.color??'#64748b', isActive=p.projectId===selected;
            const overall=Math.round(p.entregables.map(e=>e.activities.length?e.activities.reduce((s,a,i)=>s+getActivityPct(p.projectId,e.id,i,a),0)/e.activities.length:e.pctReal).reduce((s,v)=>s+v,0)/p.entregables.length);
            return (
              <button key={p.projectId} onClick={()=>setSelected(p.projectId)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:isActive?`${color}15`:'transparent', border:isActive?`0.5px solid ${color}50`:'0.5px solid transparent', borderRadius:8, cursor:'pointer', textAlign:'left', transition:'all .12s' }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }}/>
                <span style={{ fontSize:11, fontWeight:isActive?600:400, color:isActive?color:'#374151', flex:1 }}>{p.projectId}</span>
                {p.bloqueantes.length>0
                  ? <span style={{ fontSize:9 }}>⛔</span>
                  : p.alertas.length>0
                    ? <span style={{ fontSize:9 }}>⚠</span>
                    : <span style={{ fontSize:9, color:'#94a3b8' }}>{overall}%</span>
                }
              </button>
            );
          })}
        </div>
        <div style={{ marginTop:16, padding:'8px 10px', background:'#f8fafc', borderRadius:8, border:'0.5px solid #f1f5f9' }}>
          {[['⛔','Bloqueado'],['⚠','Con alertas'],['%','En tiempo']].map(([i,l])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
              <span style={{ fontSize:9 }}>{i}</span><span style={{ fontSize:9, color:'#64748b' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan detail */}
      <div id="timia-plan-print" style={{ flex:1, minWidth:0 }}>
        {plan ? (
          <>
            {/* Botones de exportar — se ocultan en print */}
            <div data-print-hide style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, marginBottom:10 }}>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handlePrint} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', fontSize:12, background:'#0d9488', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:500 }}>
                  <Printer size={13}/> Imprimir / PDF
                </button>
              </div>
              {exportError && (
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:7, maxWidth:380 }}>
                  <span style={{ fontSize:10, color:'#dc2626' }}>{exportError}</span>
                  <button onClick={()=>setExportError('')} style={{ border:'none', background:'none', cursor:'pointer', color:'#dc2626', padding:0, display:'flex', flexShrink:0 }}>✕</button>
                </div>
              )}
            </div>
            <PlanDetail
              plan={plan}
              getActivityPct={(eid,ai,a)=>getActivityPct(plan.projectId,eid,ai,a)}
              setActivityPct={(eid,ai,pct)=>setActivityPctManual(eid,ai,pct)}
              onActivityClick={(eid,ai,a)=>setDrawer({projectId:plan.projectId,entregableId:eid,actIdx:ai,act:a})}
              onGoEstimaciones={onGoEstimaciones}
              getDoneDate={(eid,ai)=>getDoneDateLabel(plan.projectId,eid,ai)}
              holidays={holidays}
            />
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8', fontSize:13 }}>Selecciona un proyecto</div>
        )}
      </div>

      {/* ActivityDrawer */}
      {drawer && (
        <ActivityDrawer
          projectId={drawer.projectId} entregableId={drawer.entregableId} actIdx={drawer.actIdx}
          act={drawer.act} effectivePct={drawerEffectivePct}
          etapaStates={etapaStates} historial={historial}
          assigneeIds={drawerAssigneeIds} allUsers={allUsers} canMark={canMark}
          jiraId={activityJiras[drawerKey]}
          weekLabels={effectivePlans.find(p => p.projectId === drawer.projectId)?.weekLabels}
          planStartDate={effectivePlans.find(p => p.projectId === drawer.projectId)?.startDate}
          holidays={holidays}
          onEtapaToggle={handleEtapaToggle}
          onAssigneeAdd={handleAssigneeAdd}
          onAssigneeRemove={handleAssigneeRemove}
          onJiraSave={handleJiraSave}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
    </div>
  );
}
