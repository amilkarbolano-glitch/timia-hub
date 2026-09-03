// ─── ImpactPicker — modal para seleccionar tareas/subtareas del plan ─────────
// Selección dependiente: Cronograma → Fase → Actividad (checkbox) → Subtarea (chips).
// Multi-selección. Devuelve PlanImpact[]; sirve para alertas/bloqueantes y cambios funcionales.

import React, { useMemo, useState } from 'react';
import { X, Check, ChevronRight, Search } from 'lucide-react';
import type { PlanImpact } from '../lib/adminStore';
import { CRONO_MAIN_NAME } from '../lib/adminStore';

export interface PlanOutlineActivity { name: string; startWeek: number; endWeek: number; etapas?: { id: string; label: string }[] }
export interface PlanOutlineEntregable { id: string; name: string; activities: PlanOutlineActivity[] }
export interface PlanOutline { planKey: string; projectId: string; cronoId?: string; cronoName?: string; entregables: PlanOutlineEntregable[] }

export function impactKey(i: PlanImpact) { return `${i.planKey}|${i.entregableId}|${i.actIdx}|${i.etapaId ?? ''}`; }

/** Etiqueta legible de un impacto: "Input › Doc › Circuito Gobierno › Envío MSD" */
export function impactLabel(i: PlanImpact, plans: PlanOutline[], withPlan = true): string {
  const p = plans.find(x => x.planKey === i.planKey);
  const e = p?.entregables.find(x => x.id === i.entregableId);
  const a = e?.activities[i.actIdx];
  if (!a) return `${i.entregableId} #${i.actIdx + 1}`;
  const et = i.etapaId ? a.etapas?.find(x => x.id === i.etapaId)?.label : undefined;
  const plan = withPlan && p && p.cronoId ? `${p.cronoName ?? p.cronoId} › ` : '';
  return `${plan}${a.name}${et ? ` › ${et}` : ''}`;
}

export function ImpactChips({ impacts, plans, onRemove, max = 6 }: { impacts: PlanImpact[]; plans: PlanOutline[]; onRemove?: (i: PlanImpact) => void; max?: number }) {
  if (!impacts.length) return null;
  const shown = impacts.slice(0, max);
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {shown.map(i => (
        <span key={impactKey(i)} title={impactLabel(i, plans)} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:9, color:'#374151', background:'#f1f5f9', border:'0.5px solid #e2e8f0', borderRadius:4, padding:'1px 6px', maxWidth:240 }}>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>↳ {impactLabel(i, plans)}</span>
          {onRemove && <button onClick={() => onRemove(i)} style={{ border:'none', background:'none', cursor:'pointer', padding:0, display:'flex', color:'#94a3b8' }}><X size={9}/></button>}
        </span>
      ))}
      {impacts.length > max && <span style={{ fontSize:9, color:'#64748b' }}>+{impacts.length - max} más</span>}
    </div>
  );
}

export default function ImpactPicker({ plans, value, onConfirm, onClose, title = 'Tareas impactadas', accent = '#7c3aed' }: {
  plans: PlanOutline[];
  value: PlanImpact[];
  onConfirm: (impacts: PlanImpact[]) => void;
  onClose: () => void;
  title?: string;
  accent?: string;
}) {
  const [sel, setSel]         = useState<PlanImpact[]>(value);
  const [planKey, setPlanKey] = useState<string>(plans[0]?.planKey ?? '');
  const [entId, setEntId]     = useState<string>(plans[0]?.entregables[0]?.id ?? '');
  const [q, setQ]             = useState('');

  const plan = plans.find(p => p.planKey === planKey) ?? plans[0];
  const ent  = plan?.entregables.find(e => e.id === entId) ?? plan?.entregables[0];
  const has  = (i: PlanImpact) => sel.some(s => impactKey(s) === impactKey(i));
  const countIn = (pk: string, eid?: string) => sel.filter(s => s.planKey === pk && (!eid || s.entregableId === eid)).length;

  function toggleActivity(actIdx: number) {
    if (!plan || !ent) return;
    const base = { planKey: plan.planKey, entregableId: ent.id, actIdx };
    const anyOfAct = sel.filter(s => s.planKey === base.planKey && s.entregableId === base.entregableId && s.actIdx === actIdx);
    if (anyOfAct.length) setSel(sel.filter(s => !anyOfAct.includes(s)));         // quitar tarea y sus subtareas
    else setSel([...sel, base]);                                                    // toda la tarea
  }
  function toggleEtapa(actIdx: number, etapaId: string) {
    if (!plan || !ent) return;
    const it = { planKey: plan.planKey, entregableId: ent.id, actIdx, etapaId };
    if (has(it)) { setSel(sel.filter(s => impactKey(s) !== impactKey(it))); return; }
    // al elegir subtarea, se reemplaza la selección de "toda la tarea"
    const whole = impactKey({ planKey: plan.planKey, entregableId: ent.id, actIdx });
    setSel([...sel.filter(s => impactKey(s) !== whole), it]);
  }

  // Búsqueda global (todas las actividades del proyecto)
  const searchHits = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t) return [];
    const out: { plan: PlanOutline; ent: PlanOutlineEntregable; actIdx: number; a: PlanOutlineActivity }[] = [];
    plans.forEach(p => p.entregables.forEach(e => e.activities.forEach((a, i) => { if (a.name.toLowerCase().includes(t)) out.push({ plan: p, ent: e, actIdx: i, a }); })));
    return out.slice(0, 30);
  }, [q, plans]);

  const col = (w: string | number): React.CSSProperties => ({ width: w, flexShrink: 0, borderRight: '0.5px solid #e2e8f0', overflowY: 'auto', padding: '6px' });
  const item = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    display:'flex', alignItems:'center', gap:6, width:'100%', textAlign:'left', padding:'7px 9px', fontSize:11, borderRadius:7, cursor:'pointer',
    background: active ? `${accent}12` : 'transparent', color: active ? accent : '#374151', fontWeight: active ? 600 : 500, border:'none', ...extra,
  });
  const badge = (n: number) => n > 0 ? <span style={{ marginLeft:'auto', fontSize:9, fontWeight:700, color:'#fff', background:accent, borderRadius:10, padding:'0 6px' }}>{n}</span> : null;

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:14, width:'min(1040px, 96vw)', height:'min(640px, 90vh)', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.25)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'0.5px solid #e2e8f0' }}>
          <div>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111' }}>{title}</h3>
            <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Marca una o varias tareas. Si eliges subtareas, el impacto queda a ese nivel.</p>
          </div>
          <div style={{ marginLeft:'auto', position:'relative' }}>
            <Search size={12} color="#94a3b8" style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)' }}/>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar tarea en todo el proyecto…"
              style={{ width:260, padding:'6px 8px 6px 26px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:7 }}/>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={16}/></button>
        </div>

        {/* Body */}
        {q.trim() ? (
          <div style={{ flex:1, overflowY:'auto', padding:8 }}>
            {searchHits.length === 0 && <p style={{ fontSize:11, color:'#94a3b8', textAlign:'center', padding:20 }}>Sin resultados</p>}
            {searchHits.map(h => {
              const base = { planKey: h.plan.planKey, entregableId: h.ent.id, actIdx: h.actIdx };
              const active = sel.some(s => s.planKey === base.planKey && s.entregableId === base.entregableId && s.actIdx === base.actIdx);
              return (
                <button key={impactKey(base)} onClick={() => { setPlanKey(h.plan.planKey); setEntId(h.ent.id); const anyOfAct = sel.filter(s => s.planKey === base.planKey && s.entregableId === base.entregableId && s.actIdx === base.actIdx); setSel(anyOfAct.length ? sel.filter(s => !anyOfAct.includes(s)) : [...sel, base]); }}
                  style={item(active)}>
                  <span style={{ width:14, height:14, borderRadius:4, border:`1.5px solid ${active ? accent : '#cbd5e1'}`, background: active ? accent : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{active && <Check size={10} color="#fff"/>}</span>
                  <span style={{ fontSize:9, color:'#94a3b8' }}>{h.plan.cronoId ? (h.plan.cronoName ?? h.plan.cronoId) : CRONO_MAIN_NAME} › {h.ent.name.replace(/^[IVX]+\.\s*/, '')}</span>
                  <ChevronRight size={10} color="#cbd5e1"/>
                  <span style={{ flex:1 }}>{h.a.name}</span>
                  <span style={{ fontSize:9, color:'#94a3b8' }}>S{h.a.startWeek}–S{h.a.endWeek}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', minHeight:0 }}>
            {/* Cronogramas */}
            {plans.length > 1 && (
              <div style={col(190)}>
                <p style={{ margin:'4px 8px 6px', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:700 }}>Cronograma</p>
                {plans.map(p => (
                  <button key={p.planKey} onClick={() => { setPlanKey(p.planKey); setEntId(p.entregables[0]?.id ?? ''); }} style={item(p.planKey === plan?.planKey)}>
                    <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.cronoId ? (p.cronoName ?? p.cronoId) : CRONO_MAIN_NAME}</span>
                    {badge(countIn(p.planKey))}
                    <ChevronRight size={11} color="#cbd5e1"/>
                  </button>
                ))}
              </div>
            )}
            {/* Fases */}
            <div style={col(250)}>
              <p style={{ margin:'4px 8px 6px', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:700 }}>Fase / entregable</p>
              {plan?.entregables.map(e => (
                <button key={e.id} onClick={() => setEntId(e.id)} style={item(e.id === ent?.id)}>
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.name}</span>
                  <span style={{ fontSize:9, color:'#94a3b8' }}>{e.activities.length}</span>
                  {badge(countIn(plan.planKey, e.id))}
                  <ChevronRight size={11} color="#cbd5e1"/>
                </button>
              ))}
            </div>
            {/* Actividades */}
            <div style={{ ...col('auto'), flex:1, borderRight:'none' }}>
              <p style={{ margin:'4px 8px 6px', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:700 }}>Tareas {ent ? `· ${ent.name.replace(/^[IVX]+\.\s*/, '')}` : ''}</p>
              {ent?.activities.map((a, i) => {
                const whole = plan && has({ planKey: plan.planKey, entregableId: ent.id, actIdx: i });
                const etSel = plan ? sel.filter(s => s.planKey === plan.planKey && s.entregableId === ent.id && s.actIdx === i && s.etapaId) : [];
                const active = !!whole || etSel.length > 0;
                return (
                  <div key={i} style={{ borderRadius:8, background: active ? `${accent}08` : 'transparent', marginBottom:2 }}>
                    <button onClick={() => toggleActivity(i)} style={item(active, { fontWeight: 500, color: '#111' })}>
                      <span style={{ width:14, height:14, borderRadius:4, border:`1.5px solid ${active ? accent : '#cbd5e1'}`, background: whole ? accent : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {whole ? <Check size={10} color="#fff"/> : etSel.length > 0 ? <span style={{ width:6, height:6, background:accent, borderRadius:1 }}/> : null}
                      </span>
                      <span style={{ flex:1 }}>{a.name}</span>
                      <span style={{ fontSize:9, color:'#94a3b8' }}>S{a.startWeek}–S{a.endWeek}</span>
                    </button>
                    {(a.etapas?.length ?? 0) > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4, padding:'0 9px 7px 29px' }}>
                        {a.etapas!.map(et => {
                          const on = plan ? has({ planKey: plan.planKey, entregableId: ent.id, actIdx: i, etapaId: et.id }) : false;
                          return (
                            <button key={et.id} onClick={() => toggleEtapa(i, et.id)}
                              style={{ fontSize:9, padding:'2px 8px', borderRadius:10, cursor:'pointer', border:`0.5px solid ${on ? accent : '#e2e8f0'}`, background: on ? accent : '#fff', color: on ? '#fff' : '#64748b', fontWeight: on ? 600 : 500 }}>
                              {et.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {ent && ent.activities.length === 0 && <p style={{ fontSize:11, color:'#94a3b8', padding:12 }}>Esta fase no tiene tareas.</p>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop:'0.5px solid #e2e8f0', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, background:'#fafafe' }}>
          <div style={{ flex:1, minWidth:0 }}>
            {sel.length === 0
              ? <span style={{ fontSize:10, color:'#94a3b8' }}>Ninguna tarea seleccionada — el registro afectará al plan en general.</span>
              : <ImpactChips impacts={sel} plans={plans} onRemove={i => setSel(sel.filter(s => impactKey(s) !== impactKey(i)))} max={8}/>}
          </div>
          <button onClick={onClose} style={{ padding:'7px 12px', fontSize:11, background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:7, cursor:'pointer', color:'#374151' }}>Cancelar</button>
          <button onClick={() => onConfirm(sel)} style={{ padding:'7px 14px', fontSize:11, fontWeight:600, background:accent, color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}>
            Confirmar {sel.length > 0 ? `(${sel.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
