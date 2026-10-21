// ─── Fábrica — estatus interno ───────────────────────────────────────────────
// Tres vistas de lo mismo, según la pregunta que se esté haciendo:
//   Tubería  → ¿dónde está atascado el trabajo? (objetos por fase)
//   Objetos  → la tabla, para buscar uno concreto
//   Proyectos→ ¿cómo va cada SDATOOL? (es lo que se reporta hacia afuera)

import React, { useState, useMemo } from 'react';
import { Factory, Search, X, ExternalLink, AlertTriangle, Copy, Check } from 'lucide-react';
import {
  fabricaStore, PASOS, FASES, pasosDeFase, avance, faseActual, frenos,
  colorEstado, codigoProyecto, nombreProyecto,
  type ObjetoFabrica,
} from '../lib/fabrica';

type Vista = 'tuberia' | 'objetos' | 'proyectos';

const card: React.CSSProperties = { background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12 };
const mono: React.CSSProperties = { fontFamily:'ui-monospace, Menlo, monospace' };

function Copiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  if (!texto) return null;
  return (
    <button title={`Copiar: ${texto}`}
      onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(texto).catch(()=>{});
                      setOk(true); setTimeout(()=>setOk(false), 1400); }}
      style={{ border:'none', background:'none', cursor:'pointer', padding:2,
               color: ok ? '#059669' : '#cbd5e1', display:'inline-flex', flexShrink:0 }}>
      {ok ? <Check size={11}/> : <Copy size={11}/>}
    </button>
  );
}

/** Barra de 28 casillas: de un vistazo se ve dónde va y qué le falta. */
function Tira({ o, alto = 7 }: { o: ObjetoFabrica; alto?: number }) {
  return (
    <div style={{ display:'flex', gap:1 }}>
      {FASES.map(f => (
        <div key={f} style={{ display:'flex', gap:1, marginRight:3 }}>
          {pasosDeFase(f).map(p => {
            const v = o.pasos?.[p.id];
            const c = !v || v.estado === 'na' ? '#f1f5f9'
                    : v.estado === 'ok' ? '#059669'
                    : v.estado === 'pte' ? '#f59e0b' : '#a78bfa';
            return <i key={p.id} title={`${f} · ${p.label}${v?.fecha ? ` · ${v.fecha}` : ''} — ${
                     !v || v.estado==='na' ? 'no aplica' : v.estado==='ok' ? 'hecho' : v.estado==='pte' ? 'pendiente' : (v.nota ?? 'otro')}`}
                     style={{ width:4, height:alto, borderRadius:1, background:c, flexShrink:0 }}/>;
          })}
        </div>
      ))}
    </div>
  );
}

export default function Fabrica() {
  const objetos = useMemo(() => fabricaStore.objetos(), []);
  const [vista, setVista] = useState<Vista>('tuberia');
  const [busca, setBusca] = useState('');
  const [proy, setProy] = useState('');
  const [resp, setResp] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);

  const proyectos = useMemo(() => [...new Set(objetos.map(o => o.proyecto))].sort(), [objetos]);
  const responsables = useMemo(() => [...new Set(objetos.map(o => o.responsable).filter(Boolean))].sort(), [objetos]);

  const vis = objetos.filter(o =>
    (!proy || o.proyecto === proy) && (!resp || o.responsable === resp) &&
    (!busca || `${o.objetoInsumo} ${o.objeto} ${o.proyecto} ${o.contactoBanco}`.toLowerCase().includes(busca.toLowerCase())));

  const bloqueados = vis.filter(o => o.estado === 'Bloqueado');
  const activos = vis.filter(o => !['Finalizado','Desestimado'].includes(o.estado));
  const pctMedio = activos.length ? Math.round(activos.reduce((s,o) => s + avance(o).pct, 0) / activos.length) : 0;

  if (!objetos.length) return (
    <div style={{ padding:'60px 36px', textAlign:'center' }}>
      <Factory size={26} color="#cbd5e1" style={{ margin:'0 auto 10px', display:'block' }}/>
      <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>Todavía no hay objetos cargados en la fábrica.</p>
    </div>
  );

  return (
    <div style={{ padding:'26px 32px 60px', maxWidth:1500, margin:'0 auto' }}>
      {/* cabecera */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'#f5f3ff', border:'0.5px solid #ddd6fe',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Factory size={16} color="#6d28d9"/>
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, letterSpacing:'-.3px' }}>Fábrica · estatus interno</h2>
          <p style={{ margin:'2px 0 0', fontSize:12, color:'#94a3b8' }}>
            {objetos.length} objetos de {proyectos.length} proyectos · cada uno recorre {PASOS.length} pasos
          </p>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          {[['Activos', activos.length, '#374151'],
            ['Avance medio', `${pctMedio}%`, '#4b5563'],
            ['Bloqueados', bloqueados.length, bloqueados.length ? '#b91c1c' : '#4b5563']].map(([l,v,bg]) => (
            <div key={l as string} style={{ textAlign:'center', padding:'5px 14px', background:bg as string, borderRadius:8 }}>
              <div style={{ fontSize:8, color:'#cbd5e1' }}>{l}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* filtros */}
      <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:2, padding:3, background:'#f1f5f9', borderRadius:9 }}>
          {([['tuberia','Tubería'],['objetos','Objetos'],['proyectos','Proyectos']] as [Vista,string][]).map(([k,l]) => (
            <button key={k} onClick={()=>setVista(k)}
              style={{ padding:'6px 13px', fontSize:12, fontWeight: vista===k?600:400, border:'none', borderRadius:7,
                       cursor:'pointer', background: vista===k?'#fff':'transparent', color: vista===k?'#111':'#64748b',
                       boxShadow: vista===k?'0 1px 3px rgba(0,0,0,.08)':'none' }}>{l}</button>
          ))}
        </div>
        <div style={{ position:'relative', flex:'1 1 180px', maxWidth:250 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar objeto, proyecto, contacto…"
            style={{ width:'100%', padding:'7px 10px 7px 28px', fontSize:12, border:'0.5px solid #e2e8f0',
                     borderRadius:7, outline:'none', boxSizing:'border-box' }}/>
        </div>
        <select value={proy} onChange={e=>setProy(e.target.value)}
          style={{ padding:'7px 10px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:7, maxWidth:260 }}>
          <option value="">Todos los proyectos</option>
          {proyectos.map(p => <option key={p} value={p}>{codigoProyecto(p)} · {nombreProyecto(p).slice(0,30)}</option>)}
        </select>
        <select value={resp} onChange={e=>setResp(e.target.value)}
          style={{ padding:'7px 10px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:7 }}>
          <option value="">Todo el equipo</option>
          {responsables.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ marginLeft:'auto', fontSize:11, color:'#94a3b8' }}>{vis.length} objeto{vis.length!==1?'s':''}</span>
      </div>

      {vista === 'tuberia'   && <Tuberia objetos={vis} onAbrir={setAbierto}/>}
      {vista === 'objetos'   && <Tabla objetos={vis} onAbrir={setAbierto}/>}
      {vista === 'proyectos' && <PorProyecto objetos={vis}/>}

      {abierto && <Panel o={objetos.find(x => x.id === abierto)!} onCerrar={()=>setAbierto(null)}/>}
    </div>
  );
}

// ═══ Tubería — dónde está atascado el trabajo ════════════════════════════════
function Tuberia({ objetos, onAbrir }: { objetos: ObjetoFabrica[]; onAbrir: (id:string)=>void }) {
  const vivos = objetos.filter(o => !['Finalizado','Desestimado'].includes(o.estado));
  const terminados = objetos.filter(o => o.estado === 'Finalizado');
  const porFase = FASES.map(f => ({ fase: f, objs: vivos.filter(o => faseActual(o) === f) }));

  return (
    <>
      <div style={{ display:'grid', gap:10, gridTemplateColumns:`repeat(${FASES.length}, minmax(170px, 1fr))`,
                    overflowX:'auto', paddingBottom:4 }}>
        {porFase.map(({ fase, objs }, i) => (
          <div key={fase} style={{ ...card, display:'flex', flexDirection:'column', minHeight:120 }}>
            <div style={{ padding:'9px 12px', borderBottom:'0.5px solid #f1f5f9', display:'flex',
                          alignItems:'center', gap:7 }}>
              <i style={{ width:17, height:17, borderRadius:'50%', display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0,
                          background:'#fff', color:'#6d28d9', border:'1.5px solid #ddd6fe' }}>{i+1}</i>
              <span style={{ fontSize:11.5, fontWeight:650, color:'#374151', flex:1 }}>{fase}</span>
              <span style={{ fontSize:11, fontWeight:700, color: objs.length ? '#6d28d9' : '#cbd5e1' }}>{objs.length}</span>
            </div>
            <div style={{ padding:7, display:'flex', flexDirection:'column', gap:5, flex:1 }}>
              {objs.length === 0 && <p style={{ margin:'auto', fontSize:10.5, color:'#cbd5e1' }}>—</p>}
              {objs.map(o => {
                const c = colorEstado(o.estado), f = frenos(o);
                return (
                  <button key={o.id} onClick={()=>onAbrir(o.id)}
                    style={{ textAlign:'left', border:`0.5px solid ${c.borde}`, background:c.bg, borderRadius:8,
                             padding:'7px 9px', cursor:'pointer' }}>
                    <div style={{ ...mono, fontSize:10, fontWeight:600, color:'#111', overflow:'hidden',
                                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.objetoInsumo || o.objeto}</div>
                    <div style={{ fontSize:9, color:c.text, marginTop:2 }}>{codigoProyecto(o.proyecto)} · {o.estado}</div>
                    {f.length > 0 && (
                      <div style={{ fontSize:8.5, color:'#b45309', marginTop:3, display:'flex', alignItems:'center', gap:3 }}>
                        <AlertTriangle size={8}/> falta: {f.map(x=>x.label).join(', ').slice(0,38)}
                      </div>
                    )}
                    <div style={{ marginTop:5 }}><Tira o={o} alto={5}/></div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {terminados.length > 0 && (
        <p style={{ margin:'12px 0 0', fontSize:11, color:'#94a3b8' }}>
          <b style={{ color:'#047857' }}>{terminados.length} finalizados</b> no se muestran aquí ·
          la tubería solo lleva lo que sigue en curso
        </p>
      )}
    </>
  );
}

// ═══ Tabla ═══════════════════════════════════════════════════════════════════
function Tabla({ objetos, onAbrir }: { objetos: ObjetoFabrica[]; onAbrir: (id:string)=>void }) {
  const th: React.CSSProperties = { padding:'9px 12px', fontSize:9.5, color:'#94a3b8', fontWeight:650,
    textTransform:'uppercase', letterSpacing:'.05em', textAlign:'left', borderBottom:'0.5px solid #e2e8f0',
    background:'#f8fafc', position:'sticky', top:0 };
  const td: React.CSSProperties = { padding:'9px 12px', borderBottom:'0.5px solid #f1f5f9', fontSize:12 };
  return (
    <div style={{ ...card, overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:860 }}>
          <thead><tr>
            <th style={th}>Objeto</th><th style={th}>Proyecto</th><th style={th}>Responsable</th>
            <th style={{...th, textAlign:'center'}}>Periodicidad</th>
            <th style={{...th, textAlign:'center'}}>Estado</th>
            <th style={th}>Recorrido</th>
            <th style={{...th, textAlign:'center'}}>Avance</th>
          </tr></thead>
          <tbody>
            {objetos.map(o => {
              const a = avance(o), c = colorEstado(o.estado);
              return (
                <tr key={o.id} onClick={()=>onAbrir(o.id)} style={{ cursor:'pointer' }}
                    onMouseOver={e=>e.currentTarget.style.background='#fafbfc'}
                    onMouseOut={e=>e.currentTarget.style.background=''}>
                  <td style={td}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ ...mono, fontSize:11, fontWeight:600 }}>{o.objetoInsumo || '—'}</span>
                      <Copiar texto={o.objetoInsumo}/>
                    </div>
                    {o.objeto && <div style={{ ...mono, fontSize:9.5, color:'#94a3b8', marginTop:2,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:260 }}>{o.objeto}</div>}
                  </td>
                  <td style={td}>
                    <div style={{ fontSize:11, fontWeight:600 }}>{codigoProyecto(o.proyecto)}</div>
                    <div style={{ fontSize:9.5, color:'#94a3b8', maxWidth:190, overflow:'hidden',
                                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nombreProyecto(o.proyecto)}</div>
                  </td>
                  <td style={{...td, fontSize:11, color:'#64748b'}}>{o.responsable || '—'}</td>
                  <td style={{...td, textAlign:'center', fontSize:11, color:'#64748b'}}>{o.periodicidad || '—'}</td>
                  <td style={{...td, textAlign:'center'}}>
                    <span style={{ fontSize:10, fontWeight:650, padding:'2px 8px', borderRadius:6,
                                   background:c.bg, color:c.text, border:`0.5px solid ${c.borde}`, whiteSpace:'nowrap' }}>
                      {o.estado || '—'}</span>
                  </td>
                  <td style={td}><Tira o={o}/></td>
                  <td style={{...td, textAlign:'center'}}>
                    <div style={{ fontSize:11, fontWeight:700, color: a.pct===100?'#047857':a.pct>0?'#b45309':'#cbd5e1' }}>{a.pct}%</div>
                    <div style={{ fontSize:9, color:'#cbd5e1' }}>{a.ok}/{a.aplican}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══ Por proyecto — lo que se reporta hacia afuera ═══════════════════════════
function PorProyecto({ objetos }: { objetos: ObjetoFabrica[] }) {
  const grupos = useMemo(() => {
    const m = new Map<string, ObjetoFabrica[]>();
    objetos.forEach(o => m.set(o.proyecto, [...(m.get(o.proyecto) ?? []), o]));
    return [...m.entries()].sort((a,b) => b[1].length - a[1].length);
  }, [objetos]);

  return (
    <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill, minmax(330px, 1fr))' }}>
      {grupos.map(([proyecto, objs]) => {
        const pct = Math.round(objs.reduce((s,o) => s + avance(o).pct, 0) / objs.length);
        const bloq = objs.filter(o => o.estado === 'Bloqueado').length;
        const fin = objs.filter(o => o.estado === 'Finalizado').length;
        return (
          <div key={proyecto} style={{ ...card, padding:'14px 16px' }}>
            <div style={{ fontSize:12.5, fontWeight:700 }}>{codigoProyecto(proyecto)}</div>
            <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:1, marginBottom:10 }}>{nombreProyecto(proyecto) || '—'}</div>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
              <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background: pct===100?'#059669':'#6d28d9' }}/>
              </div>
              <span style={{ fontSize:11.5, fontWeight:700, color:'#64748b' }}>{pct}%</span>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
              <span style={{ fontSize:9.5, padding:'2px 7px', borderRadius:5, background:'#f1f5f9', color:'#64748b' }}>
                {objs.length} objeto{objs.length!==1?'s':''}</span>
              {fin > 0 && <span style={{ fontSize:9.5, padding:'2px 7px', borderRadius:5, background:'#ecfdf5', color:'#047857' }}>{fin} finalizado{fin!==1?'s':''}</span>}
              {bloq > 0 && <span style={{ fontSize:9.5, padding:'2px 7px', borderRadius:5, background:'#fef2f2', color:'#b91c1c' }}>{bloq} bloqueado{bloq!==1?'s':''}</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {objs.map(o => (
                <div key={o.id} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ ...mono, fontSize:9.5, color:'#64748b', flex:1, overflow:'hidden',
                                 textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.objetoInsumo || o.objeto}</span>
                  <Tira o={o} alto={5}/>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ Panel del objeto ════════════════════════════════════════════════════════
function Panel({ o, onCerrar }: { o: ObjetoFabrica; onCerrar: ()=>void }) {
  const c = colorEstado(o.estado), a = avance(o), f = frenos(o);
  const dato = (k: string, v: string, m = false) => v ? (
    <><dt style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em' }}>{k}</dt>
      <dd style={{ margin:0, fontSize:11.5, display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
        <span style={{ ...(m ? mono : {}), overflow:'hidden', textOverflow:'ellipsis' }}>{v}</span>
        <Copiar texto={v}/></dd></>
  ) : null;

  return (
    <div onClick={onCerrar} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.35)', zIndex:100,
                                     display:'flex', justifyContent:'flex-end' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:520, maxWidth:'94vw', background:'#fff', height:'100%',
             overflowY:'auto', boxShadow:'-10px 0 44px rgba(0,0,0,.18)' }}>
        <div style={{ padding:'20px 22px 16px', borderBottom:'0.5px solid #f1f5f9' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em' }}>Objeto insumo</div>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                <span style={{ ...mono, fontSize:13.5, fontWeight:700, wordBreak:'break-all' }}>{o.objetoInsumo || '—'}</span>
                <Copiar texto={o.objetoInsumo}/>
              </div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:9 }}>
                <span style={{ fontSize:10, fontWeight:650, padding:'2px 8px', borderRadius:6,
                               background:c.bg, color:c.text, border:`0.5px solid ${c.borde}` }}>{o.estado}</span>
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'#f1f5f9', color:'#64748b' }}>
                  {codigoProyecto(o.proyecto)}</span>
                {o.periodicidad && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'#eff6ff', color:'#1d4ed8' }}>{o.periodicidad}</span>}
              </div>
            </div>
            <button onClick={onCerrar} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', fontSize:20, lineHeight:1 }}>&times;</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14 }}>
            <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${a.pct}%`, height:'100%', background: a.pct===100?'#059669':'#6d28d9' }}/>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>{a.pct}%</span>
            <span style={{ fontSize:10.5, color:'#cbd5e1' }}>{a.ok} de {a.aplican}</span>
          </div>
        </div>

        {f.length > 0 && (
          <div style={{ margin:'14px 22px 0', padding:'10px 13px', background:'#fffbeb',
                        border:'0.5px solid #fde68a', borderRadius:9 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#92400e', textTransform:'uppercase',
                          letterSpacing:'.05em', display:'flex', alignItems:'center', gap:5 }}>
              <AlertTriangle size={11}/> Lo que lo tiene parado
            </div>
            <div style={{ fontSize:11.5, color:'#78350f', marginTop:5 }}>
              {f.map(x => x.label).join(' · ')} <span style={{ color:'#b45309' }}>— en {faseActual(o)}</span>
            </div>
          </div>
        )}

        <div style={{ padding:'16px 22px 40px' }}>
          <dl style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'7px 14px', alignItems:'baseline', margin:'0 0 20px' }}>
            {dato('Proyecto', o.proyecto)}
            {dato('Objeto destino', o.objeto, true)}
            {dato('Responsable', o.responsable)}
            {dato('Contacto banco', o.contactoBanco)}
            {dato('Recepción', o.fechaRecepcion)}
          </dl>

          {FASES.map((fase, i) => {
            const af = avance(o, fase);
            const pasos = pasosDeFase(fase);
            return (
              <div key={fase} style={{ marginBottom:13 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <i style={{ width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center',
                              justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0,
                              background: af.pct===100 ? '#059669' : '#fff',
                              color: af.pct===100 ? '#fff' : '#6d28d9',
                              border:`1.5px solid ${af.pct===100 ? '#059669' : '#ddd6fe'}` }}>
                    {af.pct===100 ? '✓' : i+1}</i>
                  <span style={{ fontSize:11.5, fontWeight:650, color:'#374151', flex:1 }}>{fase}</span>
                  <span style={{ fontSize:10, color:'#94a3b8' }}>{af.aplican ? `${af.ok} de ${af.aplican}` : 'no aplica'}</span>
                </div>
                <div style={{ border:'0.5px solid #f1f5f9', borderRadius:9, overflow:'hidden' }}>
                  {pasos.map((p, k) => {
                    const v = o.pasos?.[p.id];
                    const na = !v || v.estado === 'na', ok = v?.estado === 'ok';
                    return (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 11px',
                        borderTop: k ? '0.5px solid #f8fafc' : 'none',
                        background: ok ? '#f0fdf4' : v?.estado === 'pte' ? '#fffbeb' : '#fff', opacity: na ? .45 : 1 }}>
                        <i style={{ width:13, height:13, borderRadius:4, flexShrink:0, display:'inline-flex',
                          alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700,
                          background: ok ? '#059669' : na ? '#f1f5f9' : '#fff', color:'#fff',
                          border:`1.5px solid ${ok ? '#059669' : na ? '#e2e8f0' : v?.estado==='pte' ? '#f59e0b' : '#cbd5e1'}` }}>
                          {ok ? '✓' : na ? '' : ''}</i>
                        <span style={{ flex:1, fontSize:11, color: na ? '#cbd5e1' : ok ? '#047857' : '#374151',
                                       textDecoration: na ? 'line-through' : 'none' }}>{p.label}</span>
                        {v?.nota && <span title={v.nota} style={{ fontSize:9, color:'#7c3aed', maxWidth:120,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.nota}</span>}
                        {v?.link && <a href={v.link} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()}
                          style={{ color:'#0e7490', display:'inline-flex' }}><ExternalLink size={10}/></a>}
                        {v?.link && <Copiar texto={v.link}/>}
                        {v?.fecha && <span style={{ fontSize:9.5, color:'#94a3b8', flexShrink:0 }}>{v.fecha}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {o.comentarios && (
            <>
              <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                            letterSpacing:'.05em', margin:'18px 0 6px' }}>Comentarios</div>
              <p style={{ margin:0, fontSize:11.5, color:'#475569', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{o.comentarios}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
