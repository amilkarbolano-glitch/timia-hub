import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle, Clock, ChevronRight, ChevronDown,
  FileDown, X, Users, Check, LayoutList, Search,
} from 'lucide-react';
import { PROJECTS, useAuth } from '../contexts/AuthContext';
import {
  adminStore,
  type PlanEtapa, type EtapaStates, type PlanHistorialEntry,
  type ActivityAssignees, type AdminUser,
} from '../lib/adminStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanSubtask { name: string; pct: number; optional?: boolean; }

interface PlanActivity {
  name: string; pct: number; pctExp: number;
  startWeek: number; endWeek: number;
  bbva?: boolean; subtasks?: PlanSubtask[]; etapas?: PlanEtapa[];
}
interface PlanEntregable { id: string; name: string; pctReal: number; pctExp: number; activities: PlanActivity[]; }
interface WorkPlan { projectId: string; respBBVA: string; respTimia: string; pasos: string[]; alertas: string[]; bloqueantes: string[]; entregables: PlanEntregable[]; }

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

// ─── GanttCell ────────────────────────────────────────────────────────────────

function GanttCell({ wi, act, effectivePct, isSubtask }: { wi: number; act: PlanActivity; effectivePct: number; isSubtask?: boolean }) {
  const planStart = act.startWeek - 1, planEnd = act.endWeek, totalSpan = planEnd - planStart;
  const execEnd = planStart + (effectivePct / 100) * totalSpan;
  const cellStart = wi, cellEnd = wi + 1;
  const planOverlap = Math.max(0, Math.min(planEnd, cellEnd) - Math.max(planStart, cellStart));
  if (planOverlap === 0) return <td style={{ width: CELL_W, minWidth: CELL_W, borderLeft: '0.5px solid #f1f5f9' }} />;
  const execOverlap = Math.max(0, Math.min(execEnd, cellEnd) - Math.max(planStart, cellStart));
  const execPct = (execOverlap / planOverlap) * 100;
  const isFirst = planStart >= cellStart && planStart < cellEnd;
  const isLast  = planEnd > cellStart && planEnd <= cellEnd;
  const br = `${isFirst?3:0}px ${isLast?3:0}px ${isLast?3:0}px ${isFirst?3:0}px`;
  return (
    <td style={{ width: CELL_W, minWidth: CELL_W, borderLeft: '0.5px solid #f1f5f9' }}>
      <div style={{ margin: '3px 1px', height: 13, borderRadius: br, overflow: 'hidden', background: isSubtask ? 'rgba(13,148,136,0.12)' : 'rgba(13,148,136,0.22)' }}>
        <div style={{ width: `${execPct}%`, height: '100%', background: isSubtask ? 'rgba(13,148,136,0.55)' : '#0d9488', transition: 'width .3s' }} />
      </div>
    </td>
  );
}

// ─── GanttRow ─────────────────────────────────────────────────────────────────

function GanttRow({ act, effectivePct, idx, expanded, onToggle, isSubtask = false, onPctChange, onActivityClick }: {
  act: PlanActivity; effectivePct: number; idx: number; expanded: boolean;
  onToggle: () => void; isSubtask?: boolean;
  onPctChange?: (n: number) => void; onActivityClick?: () => void;
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
        <GanttCell key={wi} wi={wi} act={act} effectivePct={effectivePct} isSubtask={isSubtask}/>
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
  onEtapaToggle: (etapaId: string) => void;
  onAssigneeAdd: (userId: string) => void;
  onAssigneeRemove: (userId: string) => void;
  onClose: () => void;
}

function ActivityDrawer({ projectId, entregableId, actIdx, act, effectivePct, etapaStates, historial, assigneeIds, allUsers, canMark, onEtapaToggle, onAssigneeAdd, onAssigneeRemove, onClose }: ActivityDrawerProps) {
  const [search, setSearch]         = useState('');
  const [searchFocused, setFocused] = useState(false);
  const searchRef                   = useRef<HTMLInputElement>(null);
  const dropdownRef                 = useRef<HTMLDivElement>(null);

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
          </div>
        </div>

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
              ? <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin cambios registrados aún</p>
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

function EntregableSection({ block, projectId, getActivityPct, setActivityPct, onActivityClick }: {
  block: PlanEntregable; projectId: string;
  getActivityPct: (i: number) => number;
  setActivityPct: (i: number, pct: number) => void;
  onActivityClick: (i: number, act: PlanActivity) => void;
}) {
  const effectiveActivities = block.activities.map((a, i) => ({ ...a, pct: getActivityPct(i) }));
  const effectivePctReal = block.activities.length > 0
    ? parseFloat((effectiveActivities.reduce((s, a) => s + a.pct, 0) / effectiveActivities.length).toFixed(1))
    : block.pctReal;
  const dif = parseFloat((effectivePctReal - block.pctExp).toFixed(1));
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#9f1239' }}>{block.name}</h4>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#94a3b8', marginRight: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <LayoutList size={10}/> Click actividad para etapas
          </span>
          {[{ label:'Avance real', val:`${effectivePctReal}%`, bg:'#374151' },{ label:'Esperado', val:`${block.pctExp}%`, bg:'#4b5563' },{ label:'Diferencia', val:fmt1(dif), bg:difBg(dif), c:difColor(dif) }].map(b => (
            <div key={b.label} style={{ textAlign:'center', padding:'4px 12px', background: b.bg, borderRadius:7 }}>
              <div style={{ fontSize:8, color: (b as any).c ?? '#9ca3af', marginBottom:1 }}>{b.label}</div>
              <div style={{ fontSize:15, fontWeight:700, color: (b as any).c ?? '#fff' }}>{b.val}</div>
            </div>
          ))}
        </div>
      </div>
      {block.activities.length > 0 ? (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '0.5px solid #e2e8f0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 288 + TOTAL_WEEKS * CELL_W }}>
            <thead>
              <tr style={{ background: '#881337' }}>
                <th style={{ padding:'6px 10px', textAlign:'left', fontSize:10, color:'#fff', fontWeight:600, minWidth:230 }}>Actividades / Avance</th>
                <th style={{ padding:'6px', textAlign:'center', fontSize:10, color:'#fff', fontWeight:600, width:50 }}>%</th>
                {WEEKS.map((w, i) => (
                  <th key={i} style={{ width:CELL_W, padding:'4px 2px', textAlign:'center', borderLeft:'0.5px solid rgba(255,255,255,0.15)' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'#fce7f3' }}>{w.l}</div>
                    <div style={{ fontSize:7, color:'#fbcfe8' }}>{w.d}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {effectiveActivities.map((act, i) => (
                <React.Fragment key={i}>
                  <GanttRow act={act} effectivePct={act.pct} idx={i} expanded={expanded.has(i)} onToggle={() => toggle(i)}
                    onPctChange={v => setActivityPct(i, v)} onActivityClick={() => onActivityClick(i, block.activities[i])}/>
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
        <div style={{ padding:'14px 18px', background:'#f8fafc', borderRadius:8, border:'0.5px solid #e2e8f0', display:'flex', alignItems:'center', gap:8 }}>
          <Clock size={14} color="#94a3b8"/>
          <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>Detalle de actividades pendiente · El líder técnico actualizará el desglose</p>
        </div>
      )}
    </div>
  );
}

// ─── PlanDetail ───────────────────────────────────────────────────────────────

function PlanDetail({ plan, getActivityPct, setActivityPct, onActivityClick }: {
  plan: WorkPlan;
  getActivityPct: (eid: string, ai: number, a: PlanActivity) => number;
  setActivityPct: (eid: string, ai: number, pct: number) => void;
  onActivityClick: (eid: string, ai: number, a: PlanActivity) => void;
}) {
  const color = PROJECTS.find(p => p.id === plan.projectId)?.color ?? '#64748b';
  const overallReal = parseFloat((plan.entregables.map(e => e.activities.length
    ? e.activities.reduce((s,a,i) => s + getActivityPct(e.id,i,a), 0) / e.activities.length
    : e.pctReal).reduce((s,v)=>s+v,0) / plan.entregables.length).toFixed(1));
  const overallExp  = parseFloat((plan.entregables.reduce((s,e)=>s+e.pctExp,0)/plan.entregables.length).toFixed(1));
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
          const dif = parseFloat((ePct-e.pctExp).toFixed(1));
          return (
            <div key={e.id} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, padding:'10px 14px' }}>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:600, color:'#9f1239', lineHeight:1.3 }}>{e.name}</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:4 }}>
                <span style={{ fontSize:20, fontWeight:700, color:'#111' }}>{ePct}%</span>
                <span style={{ fontSize:10, color:'#94a3b8' }}>real · {e.pctExp}% esp.</span>
                <span style={{ fontSize:11, fontWeight:700, color:difColor(dif), marginLeft:'auto' }}>{fmt1(dif)}</span>
              </div>
              <div style={{ height:5, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${Math.min(ePct,100)}%`, height:'100%', background:color }}/>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20 }}>
        {[
          { icon:<CheckCircle size={13}/>, title:'Siguientes pasos', items:plan.pasos, bg:'#f0fdf4', tc:'#15803d', em:'Por iniciar', mk:(i:string)=>`• ${i}`, badge:undefined },
          { icon:<AlertTriangle size={13}/>, title:'Alertas', items:plan.alertas, bg:plan.alertas.length>0?'#fef9c3':'#f8fafc', tc:plan.alertas.length>0?'#a16207':'#94a3b8', em:'Sin alertas', mk:(i:string)=>`⚠ ${i}`, badge:plan.alertas.length||undefined },
          { icon:<Clock size={13}/>, title:'Bloqueantes', items:plan.bloqueantes, bg:plan.bloqueantes.length>0?'#fef2f2':'#f8fafc', tc:plan.bloqueantes.length>0?'#dc2626':'#94a3b8', em:'Sin bloqueantes', mk:(i:string)=>`⛔ ${i}`, badge:plan.bloqueantes.length||undefined },
        ].map(s => (
          <div key={s.title} style={{ background:s.bg, borderRadius:10, padding:'10px 14px' }}>
            <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:600, color:s.tc, display:'flex', alignItems:'center', gap:5 }}>
              {s.icon} {s.title}
              {s.badge && <span style={{ marginLeft:4, background:'rgba(0,0,0,0.08)', borderRadius:10, padding:'0 6px', fontSize:10 }}>{s.badge}</span>}
            </p>
            {s.items.length>0 ? s.items.map((item,i)=><p key={i} style={{ margin:'3px 0', fontSize:11, color:'#374151' }}>{s.mk(item)}</p>) : <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{s.em}</p>}
          </div>
        ))}
      </div>

      {plan.entregables.map(e => (
        <EntregableSection key={e.id} block={e} projectId={plan.projectId}
          getActivityPct={i => getActivityPct(e.id,i,e.activities[i])}
          setActivityPct={(i,pct) => setActivityPct(e.id,i,pct)}
          onActivityClick={(i,a) => onActivityClick(e.id,i,a)}
        />
      ))}
    </div>
  );
}

// ─── WORK_PLANS ───────────────────────────────────────────────────────────────
// Nota: actividades marcadas "BBVA" son tareas que TIMIA INICIA
// pero que dependen de BBVA para completarse (aprobaciones, accesos, etc.)

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

  // ── Proyectos resumen ────────────────────────────────────────────────────────
  { projectId:'NGA', respBBVA:'TBD · BBVA', respTimia:'Juan Pablo Arévalo M.', pasos:['Cerrar documentación ETL','Validar esquemas en producción','Preparar cierre formal'], alertas:['Documentación ETL al 80% — retraso 1 semana'], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación y gobierno',pctReal:91,pctExp:88,activities:[]},{id:'etl',name:'II. Componentes ETL',pctReal:85,pctExp:80,activities:[]},{id:'val',name:'III. Validación y despliegue',pctReal:95,pctExp:90,activities:[]}] },
  { projectId:'CRONOS', respBBVA:'TBD · BBVA', respTimia:'Juan Pablo Arévalo M.', pasos:['Completar pipeline Spark','Iniciar certificación QA','Documentar reglas Hammurabi'], alertas:['Construcción reglas Hammurabi retrasada ~1 semana'], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:80,pctExp:75,activities:[]},{id:'proc',name:'II. Procesamiento Spark',pctReal:65,pctExp:70,activities:[]},{id:'auto',name:'III. Automatización',pctReal:40,pctExp:50,activities:[]}] },
  { projectId:'SDM1', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez', pasos:['Completar pruebas entorno Work','Escalar bloqueo con BBVA','Replantear cronograma'], alertas:['2 actividades bloqueadas esperando BBVA','Avance 10% por debajo del esperado'], bloqueantes:['Validación entorno Work por BBVA pendiente desde S6'], entregables:[{id:'doc',name:'I. Documentación',pctReal:55,pctExp:65,activities:[]},{id:'comp',name:'II. Componentes',pctReal:48,pctExp:60,activities:[]},{id:'int',name:'III. Integración',pctReal:30,pctExp:40,activities:[]}] },
  { projectId:'SDM2', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez', pasos:['Finalizar pruebas entorno Work','Preparar documentación Control-M'], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:70,pctExp:68,activities:[]},{id:'comp',name:'II. Componentes',pctReal:65,pctExp:62,activities:[]},{id:'auto',name:'III. Automatización',pctReal:55,pctExp:50,activities:[]}] },
  { projectId:'MURIC', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez', pasos:['Completar certificación QA','Preparar despliegue producción'], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:72,pctExp:70,activities:[]},{id:'comp',name:'II. Componentes',pctReal:68,pctExp:65,activities:[]},{id:'auto',name:'III. Automatización',pctReal:60,pctExp:58,activities:[]}] },
  { projectId:'BCBS239', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez', pasos:['Despliegue Control-M producción — URGENTE','Reunión de crisis con BBVA esta semana'], alertas:['3 actividades bloqueadas — riesgo ANS CRÍTICA activo','Proyecto con mayor riesgo del portafolio'], bloqueantes:['Despliegue Control-M bloqueado por ambientes BBVA','Validación datos producción pendiente 3 semanas'], entregables:[{id:'doc',name:'I. Documentación',pctReal:48,pctExp:60,activities:[]},{id:'comp',name:'II. Componentes ADA',pctReal:35,pctExp:55,activities:[]},{id:'auto',name:'III. Automatización',pctReal:15,pctExp:45,activities:[]}] },
  { projectId:'BRICKELL', respBBVA:'TBD · BBVA', respTimia:'Diego Sánchez', pasos:['Finalizar última tarea','Documentación de cierre','Presentar entregables finales'], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:88,pctExp:85,activities:[]},{id:'comp',name:'II. Componentes',pctReal:90,pctExp:88,activities:[]},{id:'close',name:'III. Cierre',pctReal:80,pctExp:85,activities:[]}] },
  { projectId:'OPTIM', respBBVA:'N/A · Credicorp Capital', respTimia:'David Huamán', pasos:['Validación final Credicorp Capital','Documentación de cierre'], alertas:[], bloqueantes:[], entregables:[{id:'doc',name:'I. Documentación',pctReal:85,pctExp:82,activities:[]},{id:'comp',name:'II. Componentes',pctReal:90,pctExp:88,activities:[]}] },
];

// ─── PPTX Export ──────────────────────────────────────────────────────────────

async function exportPlanPPTX(plan: WorkPlan, getActivityPct: (eid: string, ai: number, a: PlanActivity) => number) {
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = `Plan de Trabajo · ${plan.projectId}`;
  const BG='0F172A', RED='DC2626', WHITE='FFFFFF', GRAY='9CA3AF', LIGHT='F1F5F9';
  const overallReal = parseFloat((plan.entregables.map(e => e.activities.length ? e.activities.reduce((s,a,i)=>s+getActivityPct(e.id,i,a),0)/e.activities.length : e.pctReal).reduce((s,v)=>s+v,0)/plan.entregables.length).toFixed(1));
  const overallExp  = parseFloat((plan.entregables.reduce((s,e)=>s+e.pctExp,0)/plan.entregables.length).toFixed(1));
  const dif = parseFloat((overallReal-overallExp).toFixed(1));
  const today = new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
  const s1=pptx.addSlide(); s1.background={color:BG};
  s1.addText('TIMIA',{x:0.4,y:0.3,w:2,fontSize:11,bold:true,color:RED,align:'left'});
  s1.addText('Plan de Trabajo',{x:0.4,y:1.2,w:8,fontSize:28,bold:false,color:GRAY,align:'left'});
  s1.addText(`Proyecto ${plan.projectId}`,{x:0.4,y:1.8,w:8,fontSize:48,bold:true,color:WHITE,align:'left'});
  s1.addText(today,{x:0.4,y:2.9,w:8,fontSize:14,color:GRAY,align:'left'});
  [{label:'AVANCE REAL',val:`${overallReal}%`},{label:'AVANCE ESPERADO',val:`${overallExp}%`},{label:'DIFERENCIA',val:`${dif>=0?'+':''}${dif}%`}].forEach((c,ci)=>{
    const x=0.4+ci*2.8;
    s1.addShape((pptxgen as any).ShapeType?.rect??'rect',{x,y:3.5,w:2.6,h:1.1,fill:{color:'1E293B'},line:{color:'334155',width:0.5}});
    s1.addText(c.label,{x,y:3.58,w:2.6,fontSize:7,color:GRAY,align:'center'});
    s1.addText(c.val,{x,y:3.88,w:2.6,fontSize:22,bold:true,color:ci===2?(dif>=0?'22C55E':'EF4444'):WHITE,align:'center'});
  });
  s1.addText(`Resp. Timia: ${plan.respTimia}`,{x:0.4,y:4.8,w:9,fontSize:10,color:GRAY,align:'left'});
  const s2=pptx.addSlide(); s2.background={color:BG};
  s2.addText('Avance por entregable',{x:0.4,y:0.3,w:9,fontSize:20,bold:true,color:WHITE});
  plan.entregables.forEach((e,ei)=>{
    const ePct=e.activities.length?parseFloat((e.activities.reduce((s,a,i)=>s+getActivityPct(e.id,i,a),0)/e.activities.length).toFixed(1)):e.pctReal;
    const eDif=parseFloat((ePct-e.pctExp).toFixed(1));
    const yBase=0.9+ei*1.2;
    s2.addText(e.name,{x:0.4,y:yBase,w:5,fontSize:11,bold:true,color:'FDA4AF'});
    s2.addText(`${ePct}%`,{x:5.6,y:yBase,w:1.2,fontSize:11,bold:true,color:WHITE,align:'right'});
    s2.addText(`esp. ${e.pctExp}%`,{x:7,y:yBase,w:1.3,fontSize:9,color:GRAY,align:'left'});
    s2.addText(`${eDif>=0?'+':''}${eDif}%`,{x:8.4,y:yBase,w:1.2,fontSize:11,bold:true,color:eDif>=0?'22C55E':'EF4444',align:'right'});
    s2.addShape('rect'as any,{x:0.4,y:yBase+0.35,w:9.2,h:0.15,fill:{color:'1E293B'}});
    if(ePct>0) s2.addShape('rect'as any,{x:0.4,y:yBase+0.35,w:Math.max(0.05,9.2*(ePct/100)),h:0.15,fill:{color:RED}});
  });
  const s3=pptx.addSlide(); s3.background={color:BG};
  s3.addText('Estado y próximas acciones',{x:0.4,y:0.3,w:9,fontSize:20,bold:true,color:WHITE});
  [{title:'✅ Siguientes pasos',items:plan.pasos,color:'22C55E',x:0.4},{title:'⚠ Alertas',items:plan.alertas.length>0?plan.alertas:['Sin alertas'],color:'EAB308',x:3.5},{title:'🚧 Bloqueantes',items:plan.bloqueantes.length>0?plan.bloqueantes:['Sin bloqueantes'],color:'EF4444',x:6.6}].forEach(sec=>{
    s3.addText(sec.title,{x:sec.x,y:0.9,w:2.9,fontSize:10,bold:true,color:sec.color});
    sec.items.forEach((item,ii)=>s3.addText(`• ${item}`,{x:sec.x,y:1.3+ii*0.4,w:2.9,fontSize:9,color:LIGHT,wrap:true}));
  });
  s3.addText('Generado por Timia Hub',{x:0.4,y:5.1,w:9,fontSize:8,color:GRAY,align:'center'});
  await pptx.writeFile({fileName:`Plan_${plan.projectId}_${new Date().toISOString().slice(0,10)}.pptx`});
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DrawerState { projectId: string; entregableId: string; actIdx: number; act: PlanActivity; }

export default function PlanDeTrabajo() {
  const { user } = useAuth();
  const canMark = user ? (['pm','tech_lead','tech_ref'] as string[]).includes(user.role) : false;

  const [etapaStates,       setEtapaStates]       = useState<EtapaStates>(()         => adminStore.getEtapaStates());
  const [historial,         setHistorial]         = useState<PlanHistorialEntry[]>(() => adminStore.getHistorial());
  const [activityAssignees, setActivityAssignees] = useState<ActivityAssignees>(()   => adminStore.getActivityAssignees());
  const [pctOverrides,      setPctOverrides]      = useState<Record<string,number>>(()=> adminStore.getPlanPcts());
  const [selected,          setSelected]          = useState<string>(WORK_PLANS[0].projectId);
  const [drawer,            setDrawer]            = useState<DrawerState | null>(null);
  const [exportingPptx,     setExportingPptx]     = useState(false);

  const plan = WORK_PLANS.find(p => p.projectId === selected);

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
    setEtapaStates(nextEtapaStates); setPctOverrides(nextPctOverrides); setHistorial(nextHistorial);
    adminStore.saveEtapaStates(nextEtapaStates); adminStore.savePlanPcts(nextPctOverrides); adminStore.saveHistorial(nextHistorial);
  }

  function handleAssigneeAdd(userId: string) {
    if (!drawer) return;
    const { projectId, entregableId, actIdx } = drawer;
    const k = `${projectId}__${entregableId}__${actIdx}`;
    const current = activityAssignees[k] ?? [];
    if (current.includes(userId)) return;
    const next = { ...activityAssignees, [k]: [...current, userId] };
    setActivityAssignees(next); adminStore.saveActivityAssignees(next);
  }

  function handleAssigneeRemove(userId: string) {
    if (!drawer) return;
    const { projectId, entregableId, actIdx } = drawer;
    const k = `${projectId}__${entregableId}__${actIdx}`;
    const next = { ...activityAssignees, [k]: (activityAssignees[k] ?? []).filter(id => id !== userId) };
    setActivityAssignees(next); adminStore.saveActivityAssignees(next);
  }

  async function handleExportPptx() {
    if (!plan) return; setExportingPptx(true);
    try { await exportPlanPPTX(plan, (eid,ai,a) => getActivityPct(plan.projectId,eid,ai,a)); }
    finally { setExportingPptx(false); }
  }

  // All active users for the search (not project-filtered — 100+ employees)
  const allUsers: AdminUser[] = adminStore.getUsers().filter(u => u.active);

  const drawerKey         = drawer ? `${drawer.projectId}__${drawer.entregableId}__${drawer.actIdx}` : '';
  const drawerAssigneeIds = drawer ? (activityAssignees[drawerKey] ?? []) : [];
  const drawerEffectivePct = drawer ? getActivityPct(drawer.projectId, drawer.entregableId, drawer.actIdx, drawer.act) : 0;

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {/* Sidebar */}
      <div style={{ width: 128, flexShrink: 0 }}>
        <p style={{ margin:'0 0 8px', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Proyectos</p>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {WORK_PLANS.map(p => {
            const proj=PROJECTS.find(pr=>pr.id===p.projectId), color=proj?.color??'#64748b', isActive=p.projectId===selected;
            const overall=Math.round(p.entregables.map(e=>e.activities.length?e.activities.reduce((s,a,i)=>s+getActivityPct(p.projectId,e.id,i,a),0)/e.activities.length:e.pctReal).reduce((s,v)=>s+v,0)/p.entregables.length);
            return (
              <button key={p.projectId} onClick={()=>setSelected(p.projectId)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:isActive?`${color}15`:'transparent', border:isActive?`0.5px solid ${color}50`:'0.5px solid transparent', borderRadius:8, cursor:'pointer', textAlign:'left', transition:'all .12s' }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }}/>
                <span style={{ fontSize:11, fontWeight:isActive?600:400, color:isActive?color:'#374151', flex:1 }}>{p.projectId}</span>
                {p.bloqueantes.length>0?<span style={{ fontSize:9 }}>⛔</span>:p.alertas.length>0?<span style={{ fontSize:9 }}>⚠</span>:<span style={{ fontSize:9, color:'#94a3b8' }}>{overall}%</span>}
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
      <div style={{ flex:1, minWidth:0 }}>
        {plan ? (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button onClick={handleExportPptx} disabled={exportingPptx} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', fontSize:12, background:exportingPptx?'#64748b':'#111', color:'#fff', border:'none', borderRadius:8, cursor:exportingPptx?'wait':'pointer', fontWeight:500 }}>
                <FileDown size={14}/> {exportingPptx?'Generando...':'Exportar PPTX'}
              </button>
            </div>
            <PlanDetail
              plan={plan}
              getActivityPct={(eid,ai,a)=>getActivityPct(plan.projectId,eid,ai,a)}
              setActivityPct={(eid,ai,pct)=>setActivityPctManual(eid,ai,pct)}
              onActivityClick={(eid,ai,a)=>setDrawer({projectId:plan.projectId,entregableId:eid,actIdx:ai,act:a})}
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
          onEtapaToggle={handleEtapaToggle}
          onAssigneeAdd={handleAssigneeAdd}
          onAssigneeRemove={handleAssigneeRemove}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
