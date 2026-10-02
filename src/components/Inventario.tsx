// ─── Inventario del proyecto ─────────────────────────────────────────────────
// Tres pestañas que reemplazan las hojas del Excel de seguimiento:
//   Objetos · DataX · Transmisión
// Los campos son fijos (los mismos del Excel) y las etapas del tracking siguen
// siendo columnas configurables.

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, Package, Link2, ChevronRight, X, Server, Share2, Database } from 'lucide-react';
import { PROJECTS, canAccess } from '../contexts/AuthContext';
import { persistSet } from '../lib/persist';
import {
  invStore, ENLACES, COLS_OBJETO, COLS_OBJETO_RESUMEN, filaObjetoVacia,
  filaTransmisionVacia, filaDataXVacia, configDataXVacia,
  GRUPOS_TRANSMISION, GRUPOS_DATAX, CAMPOS_DATAX_ENTORNO,
  K_STAGES,
  type InvRow, type InvStage, type InvTransmision, type InvDataX, type DataXConfig, type DataXEntorno,
} from '../lib/inventario';
import {
  InlineEdit, LinkCell, CELL_BG, CELL_COLOR, STAGE_CYCLE, PCT_CYCLE,
  inp, lbl, btnPrimary, btnSec,
} from './Bitacora';

// Etapas por defecto del inventario (tracking real del equipo)
const DEFAULT_INV_STAGES: InvStage[] = [
  { id: 'env-msd',     label: 'Envío MSD' },
  { id: 'apr-msd',     label: 'Aprobación MSD' },
  { id: 'dicc',        label: 'Diccionario' },
  { id: 'env-gob',     label: 'Envía a gob. funcional' },
  { id: 'env-gob-tec', label: 'Envía a gob. técnico' },
  { id: 'sch-work',    label: 'Schemas Work' },
  { id: 'sol-live',    label: 'Sol. Schemas Live' },
  { id: 'sch-live',    label: 'Schemas Live' },
  { id: 'constr',      label: 'Construcción Proc.' },
  { id: 'test-unit',   label: 'Test Unitarios' },
  { id: 'test-acept',  label: 'Test Aceptación' },
  { id: 'muestras',    label: 'Gen. Muestras' },
  { id: 'prueb-work',  label: 'Pruebas Work' },
  { id: 'dat-sandbox', label: 'Datos Sandbox' },
  { id: 'dat-test',    label: 'Datos Test' },
  { id: 'valid',       label: 'Validación datos' },
  { id: 'qlt',         label: 'QLT' },
  { id: 'prueb-qlt',   label: 'Pruebas QLT' },
  { id: 'sc',          label: 'Smart Cleaner' },
  { id: 'prueb-sc',    label: 'Pruebas SC' },
  { id: 'cert-proc',   label: 'Cert. Proc.' },
  { id: 'cert-qlt',    label: 'Cert. QLT' },
  { id: 'cert-sc',     label: 'Cert. SC' },
  { id: 'jobs-proc',   label: 'Jobs Proc.' },
  { id: 'jobs-qlt',    label: 'Jobs QLT' },
  { id: 'jobs-sc',     label: 'Jobs SC' },
];
function loadStages(): InvStage[] {
  try { const raw = localStorage.getItem(K_STAGES); return raw ? JSON.parse(raw) : DEFAULT_INV_STAGES; }
  catch { return DEFAULT_INV_STAGES; }
}

const TH: React.CSSProperties = {
  padding: '0 6px', fontSize: 9, color: '#94a3b8', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap',
  background: '#f8fafc', position: 'sticky', top: 0, zIndex: 2,
  borderBottom: '0.5px solid #e2e8f0',
};
const TD: React.CSSProperties = { padding: '2px 4px', borderBottom: '0.5px solid #f1f5f9', verticalAlign: 'middle' };

const TABS = [
  { id: 'objetos',     label: 'Objetos',     icon: Package },
  { id: 'datax',       label: 'DataX',       icon: Database },
  { id: 'transmision', label: 'Transmisión', icon: Share2 },
] as const;
type TabId = typeof TABS[number]['id'];

// ─── Celda de selección (listas cortas tipo Sí/No, Alto/Medio/Bajo) ──────────
function SelectCell({ value, opciones, onSave }: { value: string; opciones: string[]; onSave: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onSave(e.target.value)}
      style={{ width:'100%', border:'none', background:'transparent', fontSize:11, padding:'3px 2px',
        color: value ? '#111' : '#cbd5e1', outline:'none', cursor:'pointer', appearance:'none' }}>
      <option value="">—</option>
      {opciones.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Chips de enlaces ────────────────────────────────────────────────────────
function ChipsEnlaces({ enlaces, puedeEditar, onSet }: {
  enlaces: Record<string, string>; puedeEditar: boolean; onSet: (id: string, url: string) => void;
}) {
  return (
    <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
      {ENLACES.map(e => {
        const url = enlaces[e.id] ?? '';
        const puesto = !!url;
        return (
          <span key={e.id} style={{ display:'inline-flex', alignItems:'center', gap:2,
            padding:'1px 5px', borderRadius:5, fontSize:8.5, fontWeight:600, whiteSpace:'nowrap',
            background: puesto ? '#ecfeff' : '#f8fafc',
            color:      puesto ? '#0e7490' : '#cbd5e1',
            border: `0.5px solid ${puesto ? '#a5f3fc' : '#e2e8f0'}` }}
            title={`${e.label} — ${e.hint}${url ? `\n${url}` : '\nSin enlace'}`}>
            {puesto ? (
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ color:'inherit', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:2 }}>
                <Link2 size={8}/>{e.label}
              </a>
            ) : <span>{e.label}</span>}
            {puedeEditar && (
              <button onClick={() => {
                  const v = prompt(`URL de ${e.label}\n${e.hint}`, url);
                  if (v !== null) onSet(e.id, v.trim());
                }}
                style={{ border:'none', background:'none', cursor:'pointer', padding:0,
                  color: puesto ? '#0e7490' : '#cbd5e1', fontSize:9, lineHeight:1 }}
                title={puesto ? 'Cambiar enlace' : 'Agregar enlace'}>
                {puesto ? '✎' : '＋'}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ─── Panel de detalle de un objeto ───────────────────────────────────────────
function DetalleObjeto({ row, stages, puedeEditar, onClose, onChange }: {
  row: InvRow; stages: InvStage[]; puedeEditar: boolean; onClose: () => void;
  onChange: (campo: keyof InvRow & string, val: string) => void;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.35)', zIndex:300, display:'flex', justifyContent:'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:460, maxWidth:'92vw', background:'#fff', height:'100%', overflowY:'auto', padding:'22px 24px', boxShadow:'-8px 0 40px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:18 }}>
          <div>
            <p style={{ margin:0, fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Objeto</p>
            <p style={{ margin:'2px 0 0', fontSize:14, fontWeight:700, color:'#111', fontFamily:'ui-monospace, monospace', wordBreak:'break-all' }}>
              {row.objeto || '(sin nombre)'}
            </p>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}><X size={16}/></button>
        </div>

        <label style={lbl()}>Descripción</label>
        <textarea value={row.descripcion} disabled={!puedeEditar} rows={3}
          onChange={e => onChange('descripcion', e.target.value)}
          style={{ ...inp(), marginBottom:16, resize:'vertical', fontFamily:'inherit' }}/>

        <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>Atributos</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 12px', marginBottom:18 }}>
          {COLS_OBJETO.map(c => (
            <div key={c.key} style={{ gridColumn: c.width > 150 ? '1 / -1' : 'auto' }}>
              <label style={lbl()}>{c.label}</label>
              {c.opciones ? (
                <select value={(row[c.key] as string) ?? ''} disabled={!puedeEditar}
                  onChange={e => onChange(c.key, e.target.value)} style={inp()}>
                  <option value="">—</option>
                  {c.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={(row[c.key] as string) ?? ''} disabled={!puedeEditar}
                  onChange={e => onChange(c.key, e.target.value)}
                  style={{ ...inp(), fontFamily: c.mono ? 'ui-monospace, monospace' : 'inherit', fontSize: c.mono ? 11 : 12 }}/>
              )}
            </div>
          ))}
        </div>

        <p style={{ margin:'0 0 4px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>Responsable por etapa</p>
        <p style={{ margin:'0 0 8px', fontSize:10, color:'#cbd5e1' }}>Quién ejecuta el paso. Se muestra en gris dentro de la celda mientras la etapa no esté hecha.</p>
        <div style={{ marginBottom:18 }}>
          {stages.map(st => (
            <div key={st.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:10, color:'#94a3b8', width:150, flexShrink:0 }}>{st.label}</span>
              <input value={row.responsables?.[st.id] ?? ''} disabled={!puedeEditar} placeholder="—"
                onChange={ev => onChange(`responsables.${st.id}` as any, ev.target.value)}
                style={{ ...inp(), fontSize:11, padding:'5px 8px' }}/>
            </div>
          ))}
        </div>

        <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>Enlaces</p>
        {ENLACES.map(e => (
          <div key={e.id} style={{ marginBottom:9 }}>
            <label style={lbl()}>{e.label} <span style={{ color:'#cbd5e1' }}>· {e.hint}</span></label>
            <input value={row.enlaces?.[e.id] ?? ''} disabled={!puedeEditar} placeholder="https://…"
              onChange={ev => onChange(`enlaces.${e.id}` as any, ev.target.value)}
              style={{ ...inp(), fontSize:11 }}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pestaña: Objetos ────────────────────────────────────────────────────────
function PanelObjetos({ user, proyectos, filterProj, search }: {
  user: any; proyectos: any[]; filterProj: string; search: string;
}) {
  const [rows, setRows]     = useState<InvRow[]>(invStore.objetos);
  const [stages, setStages] = useState<InvStage[]>(loadStages);
  const [delMode, setDelMode] = useState(false);
  const [addStage, setAddSt]  = useState(false);
  const [newStLbl, setNewStL] = useState('');
  const [newStType, setNewStT] = useState<'check'|'percent'>('check');
  const [detalle, setDetalle] = useState<string | null>(null);

  const puedeEditar  = canAccess(user?.role, 'inventario.edit') || canAccess(user?.role, 'write_bitacora');
  const puedeConfig  = canAccess(user?.role, 'inventario.configure') || canAccess(user?.role, 'write_bitacora');
  const accesibles   = proyectos.map(p => p.id);

  function save(next: InvRow[]) { setRows(next); invStore.setObjetos(next); }

  function setCampo(id: string, campo: string, val: string) {
    save(rows.map(r => {
      if (r.id !== id) return r;
      if (campo.startsWith('responsables.')) {
        const k = campo.slice(13);
        const responsables = { ...(r.responsables ?? {}) };
        if (val) responsables[k] = val; else delete responsables[k];
        return { ...r, responsables };
      }
      if (campo.startsWith('enlaces.')) {
        const k = campo.slice(8);
        const enlaces = { ...r.enlaces };
        if (val) enlaces[k] = val; else delete enlaces[k];
        return { ...r, enlaces };
      }
      return { ...r, [campo]: val };
    }));
  }

  function addRow() {
    const proj = filterProj || accesibles[0] || PROJECTS[0]?.id || '';
    save([...rows, filaObjetoVacia(proj)]);
  }
  function delRow(id: string) {
    const r = rows.find(x => x.id === id);
    if (confirm(`¿Eliminar "${r?.objeto || 'esta fila'}" del inventario? Se pierden sus etapas y enlaces.`)) {
      save(rows.filter(x => x.id !== id));
    }
  }

  function cycleStage(rowId: string, stageId: string) {
    const row = rows.find(r => r.id === rowId);
    const st  = stages.find(s => s.id === stageId);
    if (!row) return;
    const cur = row.stages[stageId] ?? '';
    const next = st?.type === 'percent'
      ? PCT_CYCLE[(PCT_CYCLE.indexOf(cur) + 1) % PCT_CYCLE.length]
      : (STAGE_CYCLE[cur] ?? 'Sí');
    save(rows.map(r => r.id === rowId ? { ...r, stages: { ...r.stages, [stageId]: next } } : r));
  }
  function setStageVal(rowId: string, stageId: string, val: string) {
    save(rows.map(r => r.id === rowId ? { ...r, stages: { ...r.stages, [stageId]: val } } : r));
  }
  function addStageCol() {
    if (!newStLbl.trim()) return;
    const next = [...stages, { id: 'st-' + Date.now(), label: newStLbl.trim(), type: newStType }];
    setStages(next); persistSet(K_STAGES, next);
    setNewStL(''); setNewStT('check'); setAddSt(false);
  }
  function delStageCol(id: string) {
    if (!confirm('¿Eliminar esta columna de todas las filas?')) return;
    const next = stages.filter(s => s.id !== id);
    setStages(next); persistSet(K_STAGES, next);
  }

  const visible = rows.filter(r =>
    accesibles.includes(r.projectId) &&
    (!filterProj || r.projectId === filterProj) &&
    (!search || (r.objeto + r.descripcion + r.alias + r.nombreLegacy).toLowerCase().includes(search.toLowerCase()))
  );
  const resumen = COLS_OBJETO.filter(c => COLS_OBJETO_RESUMEN.has(c.key));
  const rowDetalle = detalle ? rows.find(r => r.id === detalle) : null;

  // Progreso de etapas por fila: cuántas están en Sí o 100%
  function progreso(r: InvRow): number {
    if (!stages.length) return 0;
    const hechas = stages.filter(s => {
      const v = r.stages[s.id] ?? '';
      return s.type === 'percent' ? Number(v) >= 100 : v === 'Sí';
    }).length;
    const naps = stages.filter(s => (r.stages[s.id] ?? '') === 'N/A').length;
    const base = stages.length - naps;
    return base > 0 ? Math.round(hechas / base * 100) : 100;
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, color:'#94a3b8' }}>{visible.length} objeto{visible.length!==1?'s':''}</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {puedeConfig && (
            <button onClick={()=>setDelMode(v=>!v)}
              style={{ padding:'6px 11px', fontSize:11, border:`0.5px solid ${delMode?'#dc2626':'#e2e8f0'}`,
                borderRadius:7, background: delMode?'#fef2f2':'#fff', color: delMode?'#dc2626':'#64748b', cursor:'pointer' }}>
              {delMode ? 'Listo' : 'Gestionar columnas'}
            </button>
          )}
          {puedeEditar && (
            <button onClick={addRow} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }}>
              <Plus size={13}/> Agregar objeto
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX:'auto', border:'0.5px solid #e2e8f0', borderRadius:12, background:'#fff' }}>
        <table style={{ borderCollapse:'collapse', minWidth:'100%', tableLayout:'auto' }}>
          <thead>
            <tr style={{ height:32 }}>
              <th style={{ ...TH, width:26, minWidth:26, position:'sticky', left:0, zIndex:3, textAlign:'center' }}>#</th>
              <th style={{ ...TH, width:190, minWidth:160, position:'sticky', left:26, zIndex:3, paddingLeft:8 }}>Objeto</th>
              {resumen.map(c => <th key={c.key} style={{ ...TH, width:c.width, minWidth:Math.min(c.width,56) }}>{c.label}</th>)}
              <th style={{ ...TH, width:300, minWidth:240 }}>Enlaces</th>
              <th style={{ ...TH, width:64, minWidth:56, textAlign:'center' }}>Avance</th>
              {stages.map(s => (
                <th key={s.id} style={{ ...TH, width:52, minWidth:48, padding:'4px 2px' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <span style={{ writingMode:'vertical-rl', textOrientation:'mixed', transform:'rotate(180deg)',
                      display:'block', maxHeight:88, overflow:'hidden', whiteSpace:'nowrap', fontSize:8.5, lineHeight:1.2 }}>
                      {s.label}
                    </span>
                    {delMode && (
                      <button onClick={()=>delStageCol(s.id)}
                        style={{ border:'none', background:'#fee2e2', color:'#dc2626', borderRadius:3, cursor:'pointer', padding:'1px 3px', fontSize:9, marginTop:2 }}>✕</button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ ...TH, width:34, minWidth:30 }}>
                {puedeConfig && (
                  <button onClick={()=>setAddSt(true)} title="Agregar columna"
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, lineHeight:1, padding:'0 4px' }}>＋</button>
                )}
              </th>
              <th style={{ ...TH, width:46 }}/>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={stages.length + resumen.length + 6} style={{ padding:'40px 0', textAlign:'center' }}>
                  <Package size={22} color="#cbd5e1" style={{ margin:'0 auto 8px', display:'block' }}/>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>No hay objetos en este inventario.</span>
                </td>
              </tr>
            ) : visible.map((row, idx) => {
              const proj = PROJECTS.find(p => p.id === row.projectId);
              const bg   = idx % 2 === 0 ? '#fff' : '#fafafe';
              const pct  = progreso(row);
              return (
                <tr key={row.id} style={{ background: bg }}>
                  <td style={{ ...TD, width:26, textAlign:'center', position:'sticky', left:0, background:bg, zIndex:1 }}>
                    <span style={{ fontSize:9, fontWeight:500, color: proj?.color ?? '#94a3b8' }}>{row.projectId || idx+1}</span>
                  </td>
                  <td style={{ ...TD, width:190, position:'sticky', left:26, background:bg, zIndex:1 }}>
                    <InlineEdit value={row.objeto} placeholder="t_crdc_…" mono onSave={v => setCampo(row.id,'objeto',v)}/>
                  </td>
                  {resumen.map(c => (
                    <td key={c.key} style={{ ...TD, width:c.width }}>
                      {c.opciones
                        ? <SelectCell value={(row[c.key] as string) ?? ''} opciones={c.opciones} onSave={v => setCampo(row.id, c.key, v)}/>
                        : <InlineEdit value={(row[c.key] as string) ?? ''} placeholder="—" mono={c.mono} onSave={v => setCampo(row.id, c.key, v)}/>}
                    </td>
                  ))}
                  <td style={{ ...TD, width:300 }}>
                    <ChipsEnlaces enlaces={row.enlaces ?? {}} puedeEditar={puedeEditar}
                      onSet={(k,v) => setCampo(row.id, `enlaces.${k}`, v)}/>
                  </td>
                  <td style={{ ...TD, width:64 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ flex:1, height:4, background:'#f1f5f9', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background: pct>=100?'#059669':pct>=50?'#d97706':'#f59e0b' }}/>
                      </div>
                      <span style={{ fontSize:9, color:'#64748b', fontWeight:600, minWidth:22, textAlign:'right' }}>{pct}%</span>
                    </div>
                  </td>
                  {stages.map(s => {
                    const val = row.stages[s.id] ?? '';
                    if (s.type === 'percent') {
                      const n = val !== '' ? Number(val) : 0;
                      const bgp = val === '' ? '#fff' : n>=100?'#dcfce7' : n>=75?'#d1fae5' : n>=50?'#fef9c3' : n>=25?'#fff7ed' : '#fff';
                      const txp = val === '' ? '#cbd5e1' : n>=100?'#15803d' : n>=75?'#059669' : n>=50?'#a16207' : '#d97706';
                      return (
                        <td key={s.id} style={{ ...TD, width:52, padding:0, background:bgp, position:'relative', cursor: puedeEditar?'pointer':'default' }}
                          onClick={() => puedeEditar && cycleStage(row.id, s.id)}
                          title={`${s.label}${puedeEditar ? ' · clic para cambiar · clic derecho para valor exacto' : ''}`}
                          onContextMenu={e => { if (!puedeEditar) return; e.preventDefault();
                            const v = prompt(`% para "${s.label}" (0-100):`, val || '0');
                            if (v !== null) setStageVal(row.id, s.id, String(Math.min(100, Math.max(0, Number(v)||0)))); }}>
                          {val !== '' && (
                            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'#e2e8f0' }}>
                              <div style={{ width:`${n}%`, height:'100%', background: n>=100?'#059669':n>=50?'#d97706':'#f59e0b' }}/>
                            </div>
                          )}
                          <span style={{ fontSize:10, fontWeight:600, color:txp, display:'block', textAlign:'center', lineHeight:'28px' }}>
                            {val === '' ? '' : `${val}%`}
                          </span>
                        </td>
                      );
                    }
                    const isCustom = val !== '' && val !== 'Sí' && val !== 'N/A';
                    const resp = row.responsables?.[s.id] ?? '';
                    return (
                      <td key={s.id} style={{ ...TD, width:52, textAlign:'center', padding:0,
                        background: isCustom ? '#fef9c3' : (CELL_BG[val] ?? '#fff'), cursor: puedeEditar?'pointer':'default' }}
                        onClick={() => puedeEditar && cycleStage(row.id, s.id)}
                        title={`${s.label}${resp ? ` · responsable: ${resp}` : ''}${puedeEditar ? ' · clic para cambiar · clic derecho para valor personalizado' : ''}`}
                        onContextMenu={e => { if (!puedeEditar) return; e.preventDefault();
                          const v = prompt(`Valor para "${s.label}" (Sí / N/A / texto):`, val);
                          if (v !== null) setStageVal(row.id, s.id, v.trim()); }}>
                        <span style={{ fontSize: isCustom?9:12, fontWeight:600, color: isCustom?'#92400e':(CELL_COLOR[val] ?? '#111') }}>
                          {val === 'Sí' ? '✓' : val === 'N/A' ? <span style={{fontSize:8}}>N/A</span> : val
                            || (resp ? <span style={{ fontSize:7.5, fontWeight:500, color:'#a1aab8' }}>{resp.slice(0,4)}</span> : '')}
                        </span>
                      </td>
                    );
                  })}
                  <td style={{ ...TD, width:34 }}/>
                  <td style={{ ...TD, width:46, whiteSpace:'nowrap' }}>
                    <button onClick={()=>setDetalle(row.id)} title="Ver todos los atributos y enlaces"
                      style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:2 }}>
                      <ChevronRight size={13}/>
                    </button>
                    {puedeEditar && (
                      <button onClick={()=>delRow(row.id)}
                        style={{ border:'none', background:'none', cursor:'pointer', color:'#cbd5e1', padding:2 }}>
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ margin:'8px 0 0', fontSize:10, color:'#94a3b8' }}>
        Clic en una celda de texto para editarla · en las etapas, clic cicla ✓ → N/A → vacío y clic derecho pone un valor exacto ·
        la flecha <ChevronRight size={9} style={{ verticalAlign:'middle' }}/> abre el resto de atributos y los enlaces.
        <strong> Avance</strong> cuenta las etapas en ✓ o 100%, descontando las marcadas N/A.
      </p>

      {rowDetalle && (
        <DetalleObjeto row={rowDetalle} stages={stages} puedeEditar={puedeEditar} onClose={()=>setDetalle(null)}
          onChange={(c,v) => setCampo(rowDetalle.id, c, v)}/>
      )}

      {addStage && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:320 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:380, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <p style={{ margin:'0 0 12px', fontWeight:700, fontSize:14, color:'#111' }}>Nueva columna de etapa</p>
            <label style={lbl()}>Nombre de la etapa</label>
            <input value={newStLbl} onChange={e=>setNewStL(e.target.value)} placeholder="Ej: Aprobación QA" autoFocus
              onKeyDown={e=>e.key==='Enter'&&addStageCol()} style={{ ...inp(), marginBottom:12 }}/>
            <label style={lbl()}>Tipo de celda</label>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {(['check','percent'] as const).map(t => (
                <button key={t} onClick={()=>setNewStT(t)}
                  style={{ flex:1, padding:'8px 0', fontSize:12, fontWeight:newStType===t?700:400, borderRadius:8,
                    border:`1.5px solid ${newStType===t?'#dc2626':'#e2e8f0'}`,
                    background: newStType===t?'#fef2f2':'#fff', color: newStType===t?'#dc2626':'#64748b', cursor:'pointer' }}>
                  {t === 'check' ? '✓ Check (Sí / N/A)' : '% Porcentaje (0–100)'}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={()=>{setAddSt(false);setNewStL('');setNewStT('check');}} style={btnSec()}>Cancelar</button>
              <button onClick={addStageCol} style={btnPrimary()}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pestaña: Transmisión ────────────────────────────────────────────────────
function PanelTransmision({ user, proyectos, filterProj, search }: {
  user: any; proyectos: any[]; filterProj: string; search: string;
}) {
  const [rows, setRows] = useState<InvTransmision[]>(invStore.transmision);
  const puedeEditar = canAccess(user?.role, 'inventario.edit') || canAccess(user?.role, 'write_bitacora');
  const accesibles  = proyectos.map(p => p.id);

  function save(next: InvTransmision[]) { setRows(next); invStore.setTransmision(next); }
  function setCampo(id: string, campo: string, val: string) {
    save(rows.map(r => r.id === id ? { ...r, [campo]: val } : r));
  }
  function addRow() {
    save([...rows, filaTransmisionVacia(filterProj || accesibles[0] || PROJECTS[0]?.id || '')]);
  }
  function delRow(id: string) {
    const r = rows.find(x => x.id === id);
    if (confirm(`¿Eliminar la transmisión de "${r?.objeto || 'esta fila'}"?`)) save(rows.filter(x => x.id !== id));
  }

  const visible = rows.filter(r =>
    accesibles.includes(r.projectId) &&
    (!filterProj || r.projectId === filterProj) &&
    (!search || (r.objeto + r.nombreLegacy + r.archivoTantia).toLowerCase().includes(search.toLowerCase()))
  );
  const campos = GRUPOS_TRANSMISION.flatMap(g => g.campos);

  return (
    <div>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, color:'#94a3b8' }}>{visible.length} transmisión{visible.length!==1?'es':''}</span>
        {puedeEditar && (
          <button onClick={addRow} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }}>
            <Plus size={13}/> Agregar transmisión
          </button>
        )}
      </div>

      <div style={{ overflowX:'auto', border:'0.5px solid #e2e8f0', borderRadius:12, background:'#fff' }}>
        <table style={{ borderCollapse:'collapse', minWidth:'100%' }}>
          <thead>
            {/* Fila de grupos */}
            <tr style={{ height:24 }}>
              <th style={{ ...TH, width:26, position:'sticky', left:0, zIndex:3 }}/>
              {GRUPOS_TRANSMISION.map((g, gi) => (
                <th key={g.titulo} colSpan={g.campos.length}
                  style={{ ...TH, top:0, textAlign:'left', paddingLeft:8, fontSize:9, color:'#475569',
                    background: gi % 2 === 0 ? '#f1f5f9' : '#f8fafc', borderLeft:'0.5px solid #e2e8f0' }}>
                  {g.titulo}
                </th>
              ))}
              <th style={{ ...TH, width:28 }}/>
            </tr>
            <tr style={{ height:28 }}>
              <th style={{ ...TH, top:24, width:26, position:'sticky', left:0, zIndex:3, textAlign:'center' }}>#</th>
              {GRUPOS_TRANSMISION.map((g, gi) => g.campos.map((c, ci) => (
                <th key={c.key} style={{ ...TH, top:24, width:c.width, minWidth:Math.min(c.width,60),
                  borderLeft: ci === 0 ? '0.5px solid #e2e8f0' : undefined,
                  background: gi % 2 === 0 ? '#f8fafc' : '#fff' }}>{c.label}</th>
              )))}
              <th style={{ ...TH, top:24, width:28 }}/>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan={campos.length + 2} style={{ padding:'40px 0', textAlign:'center' }}>
                <Share2 size={22} color="#cbd5e1" style={{ margin:'0 auto 8px', display:'block' }}/>
                <span style={{ fontSize:12, color:'#94a3b8' }}>No hay transmisiones registradas.</span>
              </td></tr>
            ) : visible.map((row, idx) => {
              const proj = PROJECTS.find(p => p.id === row.projectId);
              const bg = idx % 2 === 0 ? '#fff' : '#fafafe';
              return (
                <tr key={row.id} style={{ background:bg }}>
                  <td style={{ ...TD, width:26, textAlign:'center', position:'sticky', left:0, background:bg, zIndex:1 }}>
                    <span style={{ fontSize:9, fontWeight:500, color: proj?.color ?? '#94a3b8' }}>{row.projectId || idx+1}</span>
                  </td>
                  {GRUPOS_TRANSMISION.map(g => g.campos.map((c, ci) => (
                    <td key={c.key} style={{ ...TD, maxWidth:c.width, borderLeft: ci === 0 ? '0.5px solid #f1f5f9' : undefined }}>
                      <InlineEdit value={(row[c.key] as string) ?? ''} placeholder="—" mono={c.mono}
                        onSave={v => setCampo(row.id, c.key, v)}/>
                    </td>
                  )))}
                  <td style={{ ...TD, width:28 }}>
                    {puedeEditar && (
                      <button onClick={()=>delRow(row.id)}
                        style={{ border:'none', background:'none', cursor:'pointer', color:'#cbd5e1', padding:2 }}>
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ margin:'8px 0 0', fontSize:10, color:'#94a3b8' }}>
        Rutas, nombres de archivo y ventana de ejecución de cada automatización. Las fechas de corte son las que lee y escribe el proceso.
      </p>
    </div>
  );
}

// ─── Pestaña: DataX ──────────────────────────────────────────────────────────
function PanelDataX({ user, proyectos, filterProj, search }: {
  user: any; proyectos: any[]; filterProj: string; search: string;
}) {
  const projActivo = filterProj || proyectos[0]?.id || '';
  const [rows, setRows] = useState<InvDataX[]>(invStore.datax);
  const [cfg, setCfg]   = useState<DataXConfig>(() => invStore.dataxConfig(projActivo));
  const puedeEditar = canAccess(user?.role, 'inventario.edit') || canAccess(user?.role, 'write_bitacora');
  const accesibles  = proyectos.map(p => p.id);

  useEffect(() => { setCfg(invStore.dataxConfig(projActivo)); }, [projActivo]);

  function save(next: InvDataX[]) { setRows(next); invStore.setDatax(next); }
  function setCampo(id: string, campo: string, val: string) {
    save(rows.map(r => r.id === id ? { ...r, [campo]: val } : r));
  }
  function setCfgCampo(lado: 'tantia'|'ada', campo: keyof DataXEntorno & string, val: string) {
    const next: DataXConfig = { ...cfg, [lado]: { ...cfg[lado], [campo]: val } };
    setCfg(next); invStore.setDataxConfig(next);
  }
  function addRow() { save([...rows, filaDataXVacia(projActivo || PROJECTS[0]?.id || '')]); }
  function delRow(id: string) {
    const r = rows.find(x => x.id === id);
    if (confirm(`¿Eliminar el bloque DataX de "${r?.objeto || 'esta fila'}"?`)) save(rows.filter(x => x.id !== id));
  }

  const visible = rows.filter(r =>
    accesibles.includes(r.projectId) &&
    (!filterProj || r.projectId === filterProj) &&
    (!search || r.objeto.toLowerCase().includes(search.toLowerCase()))
  );
  const nombreProj = PROJECTS.find(p => p.id === projActivo)?.name ?? projActivo;

  return (
    <div>
      {/* Configuración del proyecto */}
      <div style={{ border:'0.5px solid #e2e8f0', borderRadius:12, background:'#fff', padding:'16px 18px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
          <Server size={13} color="#0e7490"/>
          <p style={{ margin:0, fontSize:12, fontWeight:700, color:'#111' }}>Configuración DataX · {nombreProj}</p>
        </div>
        <p style={{ margin:'0 0 14px', fontSize:10.5, color:'#94a3b8' }}>
          Namespaces, adapters y rutas base del proyecto. Es lo mismo para todos los objetos, por eso va una sola vez.
        </p>
        {!projActivo ? (
          <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>Elegí un proyecto arriba para ver su configuración.</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:18 }}>
            {([['tantia','Tantia · origen'],['ada','ADA · destino']] as const).map(([lado, titulo]) => (
              <div key={lado}>
                <p style={{ margin:'0 0 8px', fontSize:9.5, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>{titulo}</p>
                {CAMPOS_DATAX_ENTORNO.map(c => (
                  <div key={c.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <span style={{ fontSize:10, color:'#94a3b8', width:124, flexShrink:0 }}>{c.label}</span>
                    <input value={cfg[lado][c.key] ?? ''} disabled={!puedeEditar} placeholder="—"
                      onChange={e => setCfgCampo(lado, c.key, e.target.value)}
                      style={{ ...inp(), fontSize:10.5, padding:'5px 8px', fontFamily:'ui-monospace, monospace' }}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bloques por objeto */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, color:'#94a3b8' }}>{visible.length} objeto{visible.length!==1?'s':''} en DataX</span>
        {puedeEditar && (
          <button onClick={addRow} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }}>
            <Plus size={13}/> Agregar objeto DataX
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div style={{ border:'0.5px solid #e2e8f0', borderRadius:12, background:'#fff', padding:'40px 0', textAlign:'center' }}>
          <Database size={22} color="#cbd5e1" style={{ margin:'0 auto 8px', display:'block' }}/>
          <span style={{ fontSize:12, color:'#94a3b8' }}>No hay objetos cargados en DataX.</span>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {visible.map(row => (
            <div key={row.id} style={{ border:'0.5px solid #e2e8f0', borderRadius:12, background:'#fff', padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ flex:'0 1 420px' }}>
                  <InlineEdit value={row.objeto} placeholder="t_crdc_…" mono onSave={v => setCampo(row.id,'objeto',v)}/>
                </div>
                {puedeEditar && (
                  <button onClick={()=>delRow(row.id)} style={{ marginLeft:'auto', border:'none', background:'none', cursor:'pointer', color:'#cbd5e1', padding:2 }}>
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:18 }}>
                {GRUPOS_DATAX.map(g => (
                  <div key={g.titulo}>
                    <p style={{ margin:'0 0 7px', fontSize:9.5, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>{g.titulo}</p>
                    {g.campos.map(c => (
                      <div key={c.key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:10, color:'#94a3b8', width:126, flexShrink:0 }}>{c.label}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <InlineEdit value={(row[c.key] as string) ?? ''} placeholder="—" mono
                            onSave={v => setCampo(row.id, c.key, v)}/>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Inventario({ user }: { user: any }) {
  const [tab, setTab]        = useState<TabId>('objetos');
  const [filterProj, setFP]  = useState('');
  const [search, setSearch]  = useState('');

  const accesibles = canAccess(user?.role ?? 'developer', 'projects.view_all')
    ? PROJECTS.map((p: any) => p.id)
    : (user?.projectIds ?? []);
  const proyectos = useMemo(() => PROJECTS.filter((p: any) => accesibles.includes(p.id)), [accesibles.join(',')]);

  const comun = { user, proyectos, filterProj, search };

  return (
    <div>
      {/* Barra superior compartida */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:2, padding:3, background:'#f1f5f9', borderRadius:9 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const act  = tab === t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12,
                  fontWeight: act ? 600 : 400, border:'none', borderRadius:7, cursor:'pointer',
                  background: act ? '#fff' : 'transparent', color: act ? '#111' : '#64748b',
                  boxShadow: act ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                <Icon size={12}/> {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ position:'relative', flex:'1 1 180px', maxWidth:240 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar objeto…" style={{ ...inp(), paddingLeft:28 }}/>
        </div>
        <select value={filterProj} onChange={e=>setFP(e.target.value)} style={{ ...inp(), width:'auto' }}>
          <option value="">{tab === 'datax' ? 'Primer proyecto' : 'Todos los proyectos'}</option>
          {proyectos.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {tab === 'objetos'     && <PanelObjetos {...comun}/>}
      {tab === 'datax'       && <PanelDataX {...comun}/>}
      {tab === 'transmision' && <PanelTransmision {...comun}/>}
    </div>
  );
}
