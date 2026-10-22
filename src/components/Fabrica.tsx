// ─── Fábrica — estatus interno ───────────────────────────────────────────────
// Tres vistas de lo mismo, según la pregunta que se esté haciendo:
//   Tubería  → ¿dónde está atascado el trabajo? (objetos por fase)
//   Objetos  → la tabla, para buscar uno concreto
//   Proyectos→ ¿cómo va cada SDATOOL? (es lo que se reporta hacia afuera)

import React, { useState, useMemo } from 'react';
import { Factory, Search, ExternalLink, AlertTriangle, Copy, Check, Plus, Settings2,
         Trash2, ChevronUp, ChevronDown, ArrowLeft, Pencil } from 'lucide-react';
import {
  fabricaStore, pasosDeFase, avance, faseActual, frenos, objetoNuevo, nuevoId, mover,
  colorEstado, codigoProyecto, nombreProyecto, ESTADOS, fases as fasesDe, duracion, fechaCol,
  type ObjetoFabrica, type PasoCatalogo, type PasoObjeto, type ProyectoFabrica,
} from '../lib/fabrica';
import { useAuth, canAccess } from '../contexts/AuthContext';

type Vista = 'tuberia' | 'objetos' | 'proyectos';

/** El ciclo al hacer clic en un paso. Vacío es "ni siquiera empezó". */

const inputS: React.CSSProperties = { width:'100%', padding:'6px 9px', fontSize:11.5,
  border:'0.5px solid #e2e8f0', borderRadius:7, outline:'none', boxSizing:'border-box' };
const botonS: React.CSSProperties = { padding:'7px 13px', fontSize:11.5, fontWeight:600, borderRadius:7,
  cursor:'pointer', border:'0.5px solid #e2e8f0', background:'#fff', color:'#374151' };

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
               color: ok ? '#059669' : '#94a3b8', display:'inline-flex', flexShrink:0 }}>
      {ok ? <Check size={11}/> : <Copy size={11}/>}
    </button>
  );
}

/**
 * Botoncito de estado del paso. Encendido se pinta con su color; apagado queda
 * en gris claro pero legible, para que se vea que está ahí y se puede pulsar.
 */
function Marca({ activo, color, fondo, borde, titulo, onClick, children }: {
  activo: boolean; color: string; fondo: string; borde: string; titulo: string;
  onClick: ()=>void; children: React.ReactNode;
}) {
  return (
    <button title={titulo} onClick={onClick}
      style={{ fontSize:9, fontWeight:600, padding:'2.5px 7px', borderRadius:6, cursor:'pointer',
               whiteSpace:'nowrap', lineHeight:1.25,
               background: activo ? fondo : '#fff',
               color:      activo ? color : '#94a3b8',
               border: `0.5px solid ${activo ? borde : '#e2e8f0'}` }}>
      {children}
    </button>
  );
}

/**
 * Campo de fecha. La fábrica escribe dd/mm/aaaa y así están las 1128 casillas
 * ya cargadas, pero teclear eso a mano es lento y se presta a errores; así que
 * por dentro usa el calendario del navegador y por fuera sigue guardando
 * dd/mm/aaaa. Se puede borrar dejándolo vacío.
 */
function Fecha({ etiqueta, valor, onCambio }: {
  etiqueta: string; valor?: string; onCambio: (v: string)=>void;
}) {
  const d = fechaCol(valor);
  const iso = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
  return (
    <label style={{ display:'block' }}>
      <span style={{ fontSize:9, color:'#94a3b8', display:'block', marginBottom:2 }}>{etiqueta}</span>
      <input type="date" value={iso} onChange={e => {
          const [a, m, dd] = e.target.value.split('-');
          onCambio(e.target.value ? `${dd}/${m}/${a}` : '');
        }}
        style={{ ...inputS, fontSize:10.5, padding:'5px 7px' }}/>
    </label>
  );
}

/** Barra de casillas: de un vistazo se ve dónde va y qué le falta. */
function Tira({ o, cat, alto = 7 }: { o: ObjetoFabrica; cat: PasoCatalogo[]; alto?: number }) {
  return (
    <div style={{ display:'flex', gap:1 }}>
      {fasesDe(cat).map(f => (
        <div key={f} style={{ display:'flex', gap:1, marginRight:3 }}>
          {pasosDeFase(f, cat).map(p => {
            const v = o.pasos?.[p.id];
            // Sin marcar queda casi en blanco y «no aplica» en gris sólido: así
            // la tira distingue lo que falta de lo que este objeto no hace.
            const c = !v ? '#f1f5f9'
                    : v.estado === 'na'  ? '#dbe2ea'
                    : v.estado === 'ok'  ? '#059669'
                    : v.estado === 'pte' ? '#f59e0b' : '#a78bfa';
            const cuando = v?.inicio && v?.fecha ? ` · ${v.inicio} → ${v.fecha}` : v?.fecha ? ` · ${v.fecha}` : '';
            return <i key={p.id} title={`${f} · ${p.label}${cuando} — ${
                     !v ? 'sin marcar' : v.estado==='na' ? 'no aplica' : v.estado==='ok' ? 'hecho'
                     : v.estado==='pte' ? 'pendiente' : (v.nota ?? 'otro')}`}
                     style={{ width:4, height:alto, borderRadius:1, background:c, flexShrink:0 }}/>;
          })}
        </div>
      ))}
    </div>
  );
}

export default function Fabrica() {
  const { user } = useAuth();
  const puedeEditar = canAccess(user?.role, 'fabrica.edit');

  const [objetos, setObjetos] = useState<ObjetoFabrica[]>(() => fabricaStore.objetos());
  const [cat, setCat] = useState<PasoCatalogo[]>(() => fabricaStore.pasos());
  const [vista, setVista] = useState<Vista>('tuberia');
  const [busca, setBusca] = useState('');
  const [proy, setProy] = useState('');
  const [resp, setResp] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [editando, setEditando] = useState<ObjetoFabrica | null>(null);
  const [configPasos, setConfigPasos] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);

  /** Una sola puerta de escritura: si no tiene permiso, no se guarda nada. */
  function guardar(nuevos: ObjetoFabrica[]) {
    if (!puedeEditar) return;
    setObjetos(nuevos);
    fabricaStore.guardar(nuevos);
  }
  function guardarUno(o: ObjetoFabrica) {
    guardar(objetos.some(x => x.id === o.id) ? objetos.map(x => x.id === o.id ? o : x) : [...objetos, o]);
  }
  function borrar(id: string) {
    guardar(objetos.filter(x => x.id !== id));
    setAbierto(null);
  }
  const [proys, setProys] = useState<ProyectoFabrica[]>(() => fabricaStore.proyectos(fabricaStore.objetos()));
  const [editProy, setEditProy] = useState<ProyectoFabrica | null>(null);

  function guardarProys(v: ProyectoFabrica[]) {
    if (!puedeEditar) return;
    setProys(v);
    // Solo se guardan los dados de alta a mano; los que vienen de un objeto se
    // derivan al leer, así que no hace falta duplicarlos en la base.
    fabricaStore.guardarProyectos(v);
  }

  function guardarCat(ps: PasoCatalogo[]) {
    if (!puedeEditar) return;
    setCat(ps);
    fabricaStore.guardarPasos(ps);
  }

  // Registro propio de la fábrica, más los que solo existen porque un objeto
  // los menciona: así ninguno con trabajo se pierde de la lista.
  const proyectos = useMemo(
    () => [...new Set([...proys.map(p => p.id), ...objetos.map(o => o.proyecto)])].filter(Boolean).sort(),
    [proys, objetos]);
  const responsables = useMemo(() => [...new Set(objetos.map(o => o.responsable).filter(Boolean))].sort(), [objetos]);

  const vis = objetos.filter(o =>
    (!proy || o.proyecto === proy) && (!resp || o.responsable === resp) &&
    (!busca || `${o.objetoInsumo} ${o.objeto} ${o.proyecto} ${o.contactoBanco}`.toLowerCase().includes(busca.toLowerCase())));

  const bloqueados = vis.filter(o => o.estado === 'Bloqueado');
  const activos = vis.filter(o => !['Finalizado','Desestimado'].includes(o.estado));
  const pctMedio = activos.length ? Math.round(activos.reduce((s,o) => s + avance(o, undefined, cat).pct, 0) / activos.length) : 0;

  if (!objetos.length && !editando) return (
    <div style={{ padding:'60px 36px', textAlign:'center' }}>
      <Factory size={26} color="#94a3b8" style={{ margin:'0 auto 10px', display:'block' }}/>
      <p style={{ fontSize:13, color:'#94a3b8', margin:'0 0 14px' }}>Todavía no hay objetos cargados en la fábrica.</p>
      {puedeEditar && (
        <button onClick={()=>setEditando(objetoNuevo())} style={{ ...botonS, background:'#6d28d9', color:'#fff', border:'none' }}>
          <Plus size={12} style={{ verticalAlign:-2, marginRight:4 }}/>Agregar el primer objeto</button>
      )}
    </div>
  );

  // La ficha de proyecto reemplaza a la lista: es una pantalla, no un modal,
  // porque es lo que David abre para reportar hacia afuera.
  if (detalle) return (
    <FichaProyecto proyecto={detalle} objetos={objetos.filter(o => o.proyecto === detalle)} cat={cat}
      onVolver={()=>setDetalle(null)} onAbrir={setAbierto}
      panel={abierto && objetos.some(x=>x.id===abierto)
        ? <Panel o={objetos.find(x => x.id === abierto)!} cat={cat} puedeEditar={puedeEditar}
                 onCerrar={()=>setAbierto(null)} onGuardar={guardarUno}
                 onEditar={()=>{ setEditando(objetos.find(x=>x.id===abierto)!); setAbierto(null); }}
                 onBorrar={()=>borrar(abierto)}/>
        : null}/>
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
            {objetos.length} objetos de {proyectos.length} proyectos · cada uno recorre {cat.length} pasos
            {!puedeEditar && <span style={{ color:'#94a3b8' }}> · solo lectura</span>}
          </p>
        </div>
        {puedeEditar && (
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setConfigPasos(true)} style={botonS} title="Agregar, renombrar o reordenar los pasos">
              <Settings2 size={12} style={{ verticalAlign:-2, marginRight:4 }}/>Pasos</button>
            <button onClick={()=>setEditando(objetoNuevo(proy))}
              style={{ ...botonS, background:'#6d28d9', color:'#fff', border:'none' }}>
              <Plus size={12} style={{ verticalAlign:-2, marginRight:4 }}/>Objeto</button>
          </div>
        )}
        <div style={{ display:'flex', gap:7 }}>
          {[['Activos', activos.length, '#374151'],
            ['Avance medio', `${pctMedio}%`, '#4b5563'],
            ['Bloqueados', bloqueados.length, bloqueados.length ? '#b91c1c' : '#4b5563']].map(([l,v,bg]) => (
            <div key={l as string} style={{ textAlign:'center', padding:'5px 14px', background:bg as string, borderRadius:8 }}>
              <div style={{ fontSize:8, color:'#94a3b8' }}>{l}</div>
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

      {vista === 'tuberia'   && <Tuberia objetos={vis} cat={cat} onAbrir={setAbierto}/>}
      {vista === 'objetos'   && <Tabla objetos={vis} cat={cat} onAbrir={setAbierto}/>}
      {vista === 'proyectos' && (
        <>
          {puedeEditar && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button onClick={()=>setEditProy({ id:'', nombre:'' })} style={botonS}>
                <Plus size={12} style={{ verticalAlign:-2, marginRight:4 }}/>Proyecto</button>
            </div>
          )}
          <PorProyecto objetos={vis} cat={cat} onAbrir={setDetalle}
            registrados={proys} puedeEditar={puedeEditar}
            onEditar={p => setEditProy(p)}
            onBorrar={p => {
              if (objetos.some(o => o.proyecto === p.id)) {
                alert(`«${p.id}» tiene objetos: muévelos o bórralos antes de quitar el proyecto.`);
                return;
              }
              if (confirm(`¿Quitar «${p.id}» de la lista de proyectos de la fábrica?`))
                guardarProys(proys.filter(x => x.id !== p.id));
            }}/>
        </>
      )}

      {abierto && objetos.some(x=>x.id===abierto) && (
        <Panel o={objetos.find(x => x.id === abierto)!} cat={cat} puedeEditar={puedeEditar}
               onCerrar={()=>setAbierto(null)} onGuardar={guardarUno}
               onEditar={()=>{ setEditando(objetos.find(x=>x.id===abierto)!); setAbierto(null); }}
               onBorrar={()=>borrar(abierto)}/>
      )}
      {editando && (
        <FormObjeto o={editando} proyectos={proyectos} responsables={responsables}
          esNuevo={!objetos.some(x => x.id === editando.id)}
          onCerrar={()=>setEditando(null)}
          onGuardar={o => { guardarUno(o); setEditando(null); setAbierto(o.id); }}/>
      )}
      {configPasos && <ConfigPasos cat={cat} objetos={objetos} onCerrar={()=>setConfigPasos(false)} onGuardar={guardarCat}/>}
      {editProy && (
        <FormProyecto p={editProy} existentes={proyectos}
          esNuevo={!proys.some(x => x.id === editProy.id)}
          onCerrar={()=>setEditProy(null)}
          onGuardar={np => {
            const sinEl = proys.filter(x => x.id !== editProy.id);
            guardarProys([...sinEl, np]);
            setEditProy(null);
          }}/>
      )}
    </div>
  );
}

// ═══ Tubería — dónde está atascado el trabajo ════════════════════════════════
function Tuberia({ objetos, cat, onAbrir }: { objetos: ObjetoFabrica[]; cat: PasoCatalogo[]; onAbrir: (id:string)=>void }) {
  const vivos = objetos.filter(o => !['Finalizado','Desestimado'].includes(o.estado));
  const terminados = objetos.filter(o => o.estado === 'Finalizado');
  const FS = fasesDe(cat);
  const porFase = FS.map(f => ({ fase: f, objs: vivos.filter(o => faseActual(o, cat) === f) }));

  return (
    <>
      <div style={{ display:'grid', gap:10, gridTemplateColumns:`repeat(${FS.length}, minmax(170px, 1fr))`,
                    overflowX:'auto', paddingBottom:4 }}>
        {porFase.map(({ fase, objs }, i) => (
          <div key={fase} style={{ ...card, display:'flex', flexDirection:'column', minHeight:120 }}>
            <div style={{ padding:'9px 12px', borderBottom:'0.5px solid #f1f5f9', display:'flex',
                          alignItems:'center', gap:7 }}>
              <i style={{ width:17, height:17, borderRadius:'50%', display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:9, fontWeight:700, flexShrink:0,
                          background:'#fff', color:'#6d28d9', border:'1.5px solid #ddd6fe' }}>{i+1}</i>
              <span style={{ fontSize:11.5, fontWeight:650, color:'#374151', flex:1 }}>{fase}</span>
              <span style={{ fontSize:11, fontWeight:700, color: objs.length ? '#6d28d9' : '#94a3b8' }}>{objs.length}</span>
            </div>
            <div style={{ padding:7, display:'flex', flexDirection:'column', gap:5, flex:1 }}>
              {objs.length === 0 && <p style={{ margin:'auto', fontSize:10.5, color:'#94a3b8' }}>—</p>}
              {objs.map(o => {
                const c = colorEstado(o.estado), a = avance(o, undefined, cat);
                // El nombre de lo que falta ya está en la barra de abajo y en la
                // ficha; aquí la pregunta es cuánto lleva, que es lo comparable
                // entre objetos de una misma fase.
                return (
                  <button key={o.id} onClick={()=>onAbrir(o.id)} title={frenos(o, cat).map(x=>x.label).join(' · ')}
                    style={{ textAlign:'left', border:`0.5px solid ${c.borde}`, background:c.bg, borderRadius:8,
                             padding:'7px 9px', cursor:'pointer' }}>
                    <div style={{ ...mono, fontSize:10, fontWeight:600, color:'#111', overflow:'hidden',
                                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.objetoInsumo || o.objeto}</div>
                    <div style={{ fontSize:9, color:c.text, marginTop:2 }}>{codigoProyecto(o.proyecto)} · {o.estado}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5 }}>
                      <div style={{ flex:1 }}><Tira o={o} cat={cat} alto={5}/></div>
                      <span style={{ fontSize:9.5, fontWeight:700, flexShrink:0,
                        color: a.pct===100 ? '#047857' : a.pct>0 ? '#6d28d9' : '#94a3b8' }}>{a.pct}%</span>
                      <span style={{ fontSize:8.5, color:'#64748b', flexShrink:0 }}>{a.ok}/{a.aplican}</span>
                    </div>
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
function Tabla({ objetos, cat, onAbrir }: { objetos: ObjetoFabrica[]; cat: PasoCatalogo[]; onAbrir: (id:string)=>void }) {
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
              const a = avance(o, undefined, cat), c = colorEstado(o.estado);
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
                  <td style={td}><Tira o={o} cat={cat}/></td>
                  <td style={{...td, textAlign:'center'}}>
                    <div style={{ fontSize:11, fontWeight:700, color: a.pct===100?'#047857':a.pct>0?'#b45309':'#94a3b8' }}>{a.pct}%</div>
                    <div style={{ fontSize:9, color:'#94a3b8' }}>{a.ok}/{a.aplican}</div>
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
function PorProyecto({ objetos, cat, onAbrir, registrados = [], puedeEditar = false, onEditar, onBorrar }: {
  objetos: ObjetoFabrica[]; cat: PasoCatalogo[]; onAbrir: (p:string)=>void;
  registrados?: ProyectoFabrica[]; puedeEditar?: boolean;
  onEditar?: (p: ProyectoFabrica)=>void; onBorrar?: (p: ProyectoFabrica)=>void;
}) {
  const grupos = useMemo(() => {
    const m = new Map<string, ObjetoFabrica[]>();
    // Los registrados entran aunque no tengan objetos: eso es justamente lo
    // que permite dar de alta un proyecto antes de cargarle el primero.
    registrados.forEach(p => m.set(p.id, []));
    objetos.forEach(o => m.set(o.proyecto, [...(m.get(o.proyecto) ?? []), o]));
    return [...m.entries()].sort((a,b) => b[1].length - a[1].length);
  }, [objetos, registrados]);
  const metaDe = (id: string) => registrados.find(p => p.id === id);

  // Dos códigos que solo se diferencian en un guion o un espacio son el mismo
  // proyecto partido en dos, y así nadie cuadra sus objetos. Se avisa en vez de
  // unirlos solos: cuál es el bueno lo sabe David, no la herramienta.
  const duplicados = useMemo(() => {
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    const porClave = new Map<string, string[]>();
    for (const [id] of grupos) porClave.set(norm(id), [...(porClave.get(norm(id)) ?? []), id]);
    return [...porClave.values()].filter(v => v.length > 1);
  }, [grupos]);

  return (
    <>
    {duplicados.length > 0 && (
      <div style={{ ...card, padding:'11px 14px', marginBottom:10, background:'#fffbeb',
                    border:'0.5px solid #fde68a' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#92400e', textTransform:'uppercase',
                      letterSpacing:'.05em', display:'flex', alignItems:'center', gap:5 }}>
          <AlertTriangle size={11}/> El mismo proyecto aparece dos veces
        </div>
        {duplicados.map(par => (
          <div key={par.join()} style={{ fontSize:11, color:'#78350f', marginTop:5 }}>
            {par.map(x => <code key={x} style={{ ...mono, background:'#fef3c7', padding:'1px 5px',
              borderRadius:4, marginRight:6 }}>{x}</code>)}
            <span style={{ color:'#b45309' }}>
              — difieren solo en un guion o un espacio. Edita los objetos de uno para pasarlos al otro.
            </span>
          </div>
        ))}
      </div>
    )}
    <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill, minmax(330px, 1fr))' }}>
      {grupos.map(([proyecto, objs]) => {
        const pct = objs.length ? Math.round(objs.reduce((s,o) => s + avance(o, undefined, cat).pct, 0) / objs.length) : 0;
        const meta = metaDe(proyecto);
        const bloq = objs.filter(o => o.estado === 'Bloqueado').length;
        const fin = objs.filter(o => o.estado === 'Finalizado').length;
        return (
          <div key={proyecto} onClick={()=>onAbrir(proyecto)} title="Abrir la ficha del proyecto"
               style={{ ...card, padding:'14px 16px', cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:700 }}>{codigoProyecto(proyecto)}</div>
                <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:1 }}>
                  {meta?.nombre || nombreProyecto(proyecto) || '—'}</div>
                {meta?.responsable && (
                  <div style={{ fontSize:9.5, color:'#64748b', marginTop:1 }}>{meta.responsable}</div>
                )}
              </div>
              {puedeEditar && meta && (
                <div style={{ display:'flex', gap:2, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                  <button title="Editar el proyecto" onClick={()=>onEditar?.(meta)}
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:2, display:'flex' }}>
                    <Pencil size={11}/></button>
                  <button title="Quitar el proyecto" onClick={()=>onBorrar?.(meta)}
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#fca5a5', padding:2, display:'flex' }}>
                    <Trash2 size={11}/></button>
                </div>
              )}
            </div>
            <div style={{ height:10 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
              <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background: pct===100?'#059669':'#6d28d9' }}/>
              </div>
              <span style={{ fontSize:11.5, fontWeight:700, color:'#64748b' }}>{pct}%</span>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
              <span style={{ fontSize:9.5, padding:'2px 7px', borderRadius:5,
                background: objs.length ? '#f1f5f9' : '#fffbeb', color: objs.length ? '#64748b' : '#b45309' }}>
                {objs.length ? `${objs.length} objeto${objs.length!==1?'s':''}` : 'sin objetos aún'}</span>
              {fin > 0 && <span style={{ fontSize:9.5, padding:'2px 7px', borderRadius:5, background:'#ecfdf5', color:'#047857' }}>{fin} finalizado{fin!==1?'s':''}</span>}
              {bloq > 0 && <span style={{ fontSize:9.5, padding:'2px 7px', borderRadius:5, background:'#fef2f2', color:'#b91c1c' }}>{bloq} bloqueado{bloq!==1?'s':''}</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {objs.slice(0, 8).map(o => (
                <div key={o.id} style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <span style={{ ...mono, fontSize:9.5, color:'#64748b', flex:1, overflow:'hidden',
                                 textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.objetoInsumo || o.objeto}</span>
                  <Tira o={o} cat={cat} alto={5}/>
                </div>
              ))}
              {objs.length > 8 && (
                <span style={{ fontSize:9.5, color:'#a78bfa', marginTop:2 }}>
                  y {objs.length - 8} objeto{objs.length-8!==1?'s':''} más — abrir ficha</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

// ═══ Panel del objeto ════════════════════════════════════════════════════════
function Panel({ o, cat, puedeEditar, onCerrar, onGuardar, onEditar, onBorrar }: {
  o: ObjetoFabrica; cat: PasoCatalogo[]; puedeEditar: boolean;
  onCerrar: ()=>void; onGuardar: (o: ObjetoFabrica)=>void; onEditar: ()=>void; onBorrar: ()=>void;
}) {
  const c = colorEstado(o.estado), a = avance(o, undefined, cat), f = frenos(o, cat);
  const [detalleDe, setDetalleDe] = useState<string | null>(null);

  const hoy = () => new Date().toLocaleDateString('es-CO');

  function escribir(pasoId: string, v: PasoObjeto | null) {
    if (!puedeEditar) return;
    const pasos = { ...o.pasos };
    if (v) pasos[pasoId] = v; else delete pasos[pasoId];
    onGuardar({ ...o, pasos });
  }

  /**
   * «Iniciado» y «Finalizado» como dos interruptores, en vez de un clic que
   * rotaba entre cuatro estados. Lo que pasaba antes: al desmarcar un paso
   * hecho quedaba en «pendiente» —naranja— con la fecha de cierre todavía
   * puesta, y nadie entendía por qué. Aquí cada botón dice lo que hace y se
   * apaga volviendo a pulsarlo.
   *
   * Finalizar sin haber iniciado es válido: la mitad de las casillas del Excel
   * traen solo la fecha de cierre, porque eso es lo que se anota cuando algo
   * sale bien a la primera.
   */
  function marcarInicio(pasoId: string) {
    const v = o.pasos?.[pasoId];
    if (v?.inicio) {
      // Apagar «iniciado»: si ya estaba finalizado, sigue finalizado.
      const resto: PasoObjeto = { ...v, inicio: undefined };
      escribir(pasoId, v.estado === 'ok' ? resto
                     : resto.nota || resto.link ? { ...resto, estado: 'pte' } : null);
    } else {
      escribir(pasoId, { ...(v ?? {}), estado: v?.estado === 'ok' ? 'ok' : 'pte', inicio: hoy() });
    }
  }

  function marcarFin(pasoId: string) {
    const v = o.pasos?.[pasoId];
    if (v?.estado === 'ok') {
      // Apagar «finalizado» borra la fecha de fin: dejarla puesta en un paso
      // que ya no está hecho es justo lo que confundía antes.
      const resto: PasoObjeto = { ...v, estado: 'pte', fecha: undefined };
      escribir(pasoId, resto.inicio || resto.nota || resto.link ? resto : null);
    } else {
      escribir(pasoId, { ...(v ?? {}), estado: 'ok', fecha: v?.fecha ?? hoy() });
    }
  }

  /** «No aplica» es excluyente: un paso que este objeto no hace no tiene fechas. */
  function marcarNA(pasoId: string) {
    const v = o.pasos?.[pasoId];
    escribir(pasoId, v?.estado === 'na' ? null
                   : { estado: 'na', nota: v?.nota, link: v?.link });
  }

  function editarPaso(pasoId: string, campo: 'fecha'|'inicio'|'nota'|'link', valor: string) {
    if (!puedeEditar) return;
    const prev: PasoObjeto = o.pasos?.[pasoId] ?? { estado: 'pte' };
    const pasos = { ...o.pasos, [pasoId]: { ...prev, [campo]: valor || undefined } };
    onGuardar({ ...o, pasos });
  }
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
            <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
              {puedeEditar && (
                <>
                  <button onClick={onEditar} title="Editar los datos del objeto"
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:4, display:'flex' }}>
                    <Pencil size={13}/></button>
                  <button title="Borrar este objeto de la fábrica"
                    onClick={() => { if (confirm(`¿Borrar «${o.objetoInsumo || o.objeto}» de la fábrica?`)) onBorrar(); }}
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#fca5a5', padding:4, display:'flex' }}>
                    <Trash2 size={13}/></button>
                </>
              )}
              <button onClick={onCerrar} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', fontSize:20, lineHeight:1 }}>&times;</button>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14 }}>
            <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${a.pct}%`, height:'100%', background: a.pct===100?'#059669':'#6d28d9' }}/>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>{a.pct}%</span>
            <span style={{ fontSize:10.5, color:'#94a3b8' }}>{a.ok} de {a.aplican}</span>
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
              {f.map(x => x.label).join(' · ')} <span style={{ color:'#b45309' }}>— en {faseActual(o, cat)}</span>
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

          {puedeEditar && (
            <p style={{ margin:'0 0 11px', fontSize:10.5, color:'#64748b', lineHeight:1.6 }}>
              <b style={{ color:'#b45309' }}>Iniciado</b> y <b style={{ color:'#047857' }}>Finalizado</b> ponen
              la fecha de hoy; se quitan volviéndolos a pulsar. <b>N/A</b> es para un paso
              por el que este objeto no pasa. Abre la fila para corregir las fechas o dejar una nota.
            </p>
          )}

          {fasesDe(cat).map((fase, i) => {
            const af = avance(o, fase, cat);
            const pasos = pasosDeFase(fase, cat);
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
                    // «sin marcar» y «no aplica» son cosas distintas: el primero es
                    // trabajo que falta, el segundo trabajo que este objeto no hace.
                    // Dibujarlos igual —los dos en gris y tachados— hacía que una fase
                    // entera por empezar pareciera descartada.
                    const na = v?.estado === 'na', ok = v?.estado === 'ok';
                    const abierto = detalleDe === p.id;
                    const dias = duracion(v);
                    return (
                      <div key={p.id} style={{ borderTop: k ? '0.5px solid #eef2f6' : 'none',
                        background: ok ? '#f0fdf4' : v?.estado === 'pte' ? '#fffbeb'
                                  : v?.estado === 'otro' ? '#faf5ff' : na ? '#f8fafc' : '#fff' }}>
                        <div onClick={()=>setDetalleDe(abierto ? null : p.id)}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 9px 5px 11px',
                                   cursor:'pointer' }}>
                          <i style={{ width:13, height:13, borderRadius:4, flexShrink:0, display:'inline-flex',
                            alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, lineHeight:1,
                            background: ok ? '#059669' : na ? '#e2e8f0' : '#fff',
                            color: na ? '#64748b' : '#fff',
                            border:`1.5px solid ${ok ? '#059669' : na ? '#94a3b8'
                                   : v?.estado==='pte' ? '#f59e0b' : v?.estado==='otro' ? '#a78bfa' : '#94a3b8'}` }}>
                            {ok ? '✓' : na ? '–' : ''}</i>
                          <span style={{ flex:1, fontSize:11, minWidth:0, overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap',
                            color: ok ? '#047857' : na ? '#94a3b8' : '#334155' }}>{p.label}</span>

                          {v?.nota && <span title={v.nota} style={{ fontSize:9, color:'#7c3aed', maxWidth:80,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{v.nota}</span>}
                          {v?.link && <a href={v.link} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()}
                            style={{ color:'#0e7490', display:'inline-flex', flexShrink:0 }}><ExternalLink size={10}/></a>}
                          {v?.link && <Copiar texto={v.link}/>}
                          {dias !== null && <span title={`${dias} día${dias!==1?'s':''} hábil${dias!==1?'es':''}`}
                            style={{ fontSize:9, color:'#64748b', background:'#f1f5f9', borderRadius:4,
                                     padding:'1px 5px', flexShrink:0 }}>{dias}d</span>}

                          {puedeEditar ? (
                            <div style={{ display:'flex', gap:3, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                              <Marca activo={!!v?.inicio} color="#b45309" fondo="#fef3c7" borde="#fde68a"
                                titulo={v?.inicio ? `Iniciado el ${v.inicio} — pulsa para quitarlo` : 'Marcar como iniciado hoy'}
                                onClick={()=>marcarInicio(p.id)}>Iniciado</Marca>
                              <Marca activo={ok} color="#047857" fondo="#d1fae5" borde="#a7f3d0"
                                titulo={ok ? `Finalizado el ${v?.fecha} — pulsa para quitarlo` : 'Marcar como finalizado hoy'}
                                onClick={()=>marcarFin(p.id)}>Finalizado</Marca>
                              <Marca activo={na} color="#475569" fondo="#e2e8f0" borde="#cbd5e1"
                                titulo={na ? 'No aplica — pulsa para quitarlo' : 'Este objeto no pasa por este paso'}
                                onClick={()=>marcarNA(p.id)}>N/A</Marca>
                            </div>
                          ) : (
                            <span style={{ fontSize:9.5, color:'#64748b', flexShrink:0 }}>
                              {na ? 'no aplica' : v?.inicio && v?.fecha ? `${v.inicio} → ${v.fecha}`
                               : v?.inicio ? `desde ${v.inicio}` : v?.fecha ?? ''}</span>
                          )}
                          <ChevronDown size={12} style={{ flexShrink:0, color: abierto ? '#6d28d9' : '#cbd5e1',
                            transform: abierto ? 'rotate(180deg)' : 'none' }}/>
                        </div>
                        {abierto && (
                          <div style={{ display:'grid', gap:5, gridTemplateColumns:'1fr 1fr',
                                        padding:'2px 11px 9px 33px' }}>
                            {puedeEditar ? (
                              <>
                                <Fecha etiqueta="Inicio" valor={v?.inicio} onCambio={x=>editarPaso(p.id, 'inicio', x)}/>
                                <Fecha etiqueta="Fin"    valor={v?.fecha}  onCambio={x=>editarPaso(p.id, 'fecha',  x)}/>
                                <input defaultValue={v?.nota ?? ''} placeholder="Nota (p. ej. qué lo trabó)"
                                  onBlur={e=>editarPaso(p.id, 'nota', e.target.value.trim())}
                                  style={{ ...inputS, fontSize:10.5, gridColumn:'1 / -1' }}/>
                                <input defaultValue={v?.link ?? ''} placeholder="Enlace (repo, documento, WO…)"
                                  onBlur={e=>editarPaso(p.id, 'link', e.target.value.trim())}
                                  style={{ ...inputS, fontSize:10.5, gridColumn:'1 / -1' }}/>
                                {v?.inicio && v?.fecha && dias === null && (
                                  <span style={{ gridColumn:'1 / -1', fontSize:9.5, color:'#b45309' }}>
                                    El fin queda antes del inicio.</span>
                                )}
                              </>
                            ) : (
                              <dl style={{ gridColumn:'1 / -1', margin:0, display:'grid',
                                           gridTemplateColumns:'auto 1fr', gap:'3px 10px', fontSize:10.5 }}>
                                {v?.inicio && <><dt style={{ color:'#94a3b8' }}>Inicio</dt><dd style={{ margin:0 }}>{v.inicio}</dd></>}
                                {v?.fecha  && <><dt style={{ color:'#94a3b8' }}>Fin</dt><dd style={{ margin:0 }}>{v.fecha}</dd></>}
                                {v?.nota   && <><dt style={{ color:'#94a3b8' }}>Nota</dt><dd style={{ margin:0 }}>{v.nota}</dd></>}
                                {!v && <dd style={{ gridColumn:'1 / -1', margin:0, color:'#94a3b8' }}>Sin marcar.</dd>}
                              </dl>
                            )}
                          </div>
                        )}
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

// ═══ Ficha de proyecto ═══════════════════════════════════════════════════════
// La pregunta que contesta: «¿cómo va SDATOOL-51117 y qué le falta?».
// Por eso lo primero es el embudo por fase — cuántos objetos pasaron cada una —
// y enseguida lo que está frenando, agrupado por paso: si cinco objetos esperan
// la misma certificación, eso es una gestión, no cinco.
function FichaProyecto({ proyecto, objetos, cat, onVolver, onAbrir, panel }: {
  proyecto: string; objetos: ObjetoFabrica[]; cat: PasoCatalogo[];
  onVolver: ()=>void; onAbrir: (id:string)=>void; panel: React.ReactNode;
}) {
  const FS = fasesDe(cat);
  const pct = objetos.length ? Math.round(objetos.reduce((s,o)=>s+avance(o,undefined,cat).pct,0)/objetos.length) : 0;
  const vivos = objetos.filter(o => !['Finalizado','Desestimado'].includes(o.estado));

  // Cuántos objetos superaron cada fase: el embudo de verdad del proyecto.
  const embudo = FS.map(f => ({
    fase: f,
    completa: objetos.filter(o => avance(o, f, cat).pct === 100 && avance(o, f, cat).aplican > 0).length,
    aplica:   objetos.filter(o => avance(o, f, cat).aplican > 0).length,
  }));

  // Frenos agrupados por paso, no por objeto.
  const cuellos = useMemo(() => {
    const m = new Map<string, { paso: PasoCatalogo; objs: ObjetoFabrica[] }>();
    for (const o of vivos) for (const p of frenos(o, cat)) {
      const e = m.get(p.id) ?? { paso: p, objs: [] };
      e.objs.push(o); m.set(p.id, e);
    }
    return [...m.values()].sort((a,b) => b.objs.length - a.objs.length);
  }, [objetos, cat]);

  const porEstado = Object.keys(ESTADOS)
    .map(e => ({ estado: e, n: objetos.filter(o => o.estado === e).length })).filter(x => x.n);
  const equipo = [...new Set(objetos.map(o => o.responsable).filter(Boolean))];
  const contactos = [...new Set(objetos.map(o => o.contactoBanco).filter(Boolean))];

  return (
    <div style={{ padding:'26px 32px 60px', maxWidth:1500, margin:'0 auto' }}>
      <button onClick={onVolver} style={{ ...botonS, border:'none', background:'none', padding:'4px 0',
        color:'#6d28d9', marginBottom:12 }}>
        <ArrowLeft size={12} style={{ verticalAlign:-2, marginRight:5 }}/>Todos los proyectos</button>

      <div style={{ display:'flex', alignItems:'flex-start', gap:14, flexWrap:'wrap', marginBottom:18 }}>
        <div style={{ flex:1, minWidth:240 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <h2 style={{ margin:0, fontSize:19, fontWeight:700, letterSpacing:'-.3px' }}>{codigoProyecto(proyecto)}</h2>
            <Copiar texto={codigoProyecto(proyecto)}/>
          </div>
          <p style={{ margin:'2px 0 0', fontSize:12.5, color:'#64748b' }}>{nombreProyecto(proyecto) || '—'}</p>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:9 }}>
            {porEstado.map(({estado,n}) => {
              const c = colorEstado(estado);
              return <span key={estado} style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:6,
                background:c.bg, color:c.text, border:`0.5px solid ${c.borde}` }}>{n} {estado.toLowerCase()}</span>;
            })}
          </div>
        </div>
        <div style={{ ...card, padding:'12px 18px', minWidth:150 }}>
          <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Avance medio</div>
          <div style={{ fontSize:26, fontWeight:700, color:'#111', lineHeight:1.1 }}>{pct}%</div>
          <div style={{ fontSize:10.5, color:'#94a3b8' }}>{objetos.length} objeto{objetos.length!==1?'s':''} · {vivos.length} en curso</div>
        </div>
      </div>

      {/* Embudo por fase */}
      <div style={{ ...card, padding:'15px 18px', marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                      letterSpacing:'.05em', marginBottom:11 }}>Cuántos objetos pasaron cada fase</div>
        <div style={{ display:'grid', gap:9, gridTemplateColumns:`repeat(${FS.length}, 1fr)` }}>
          {embudo.map(({ fase, completa, aplica }, i) => {
            const p = aplica ? Math.round(completa/aplica*100) : 0;
            return (
              <div key={fase}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                  <i style={{ width:16, height:16, borderRadius:'50%', display:'flex', alignItems:'center',
                    justifyContent:'center', fontSize:8.5, fontWeight:700, flexShrink:0,
                    background: p===100?'#059669':'#fff', color: p===100?'#fff':'#6d28d9',
                    border:`1.5px solid ${p===100?'#059669':'#ddd6fe'}` }}>{p===100?'✓':i+1}</i>
                  <span style={{ fontSize:11, fontWeight:600, color:'#374151', overflow:'hidden',
                                 textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fase}</span>
                </div>
                <div style={{ height:5, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${p}%`, height:'100%', background: p===100?'#059669':'#6d28d9' }}/>
                </div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>
                  {aplica ? `${completa} de ${aplica}` : 'no aplica'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:'grid', gap:12, gridTemplateColumns:'minmax(300px, 1fr) minmax(260px, 340px)' }}>
        {/* Objetos */}
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'11px 16px', borderBottom:'0.5px solid #f1f5f9', fontSize:10, fontWeight:700,
                        color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>Objetos</div>
          {objetos.map((o, i) => {
            const a = avance(o, undefined, cat), c = colorEstado(o.estado), fr = frenos(o, cat);
            return (
              <div key={o.id} onClick={()=>onAbrir(o.id)}
                style={{ padding:'10px 16px', borderTop: i?'0.5px solid #f8fafc':'none', cursor:'pointer',
                         display:'flex', alignItems:'center', gap:11 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ ...mono, fontSize:11, fontWeight:600, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.objetoInsumo || o.objeto || '—'}</span>
                    <Copiar texto={o.objetoInsumo || o.objeto}/>
                  </div>
                  <div style={{ fontSize:9.5, color:'#94a3b8', marginTop:2 }}>
                    {o.responsable || 'sin responsable'}
                    {fr.length > 0 && <span style={{ color:'#b45309' }}> · falta {fr.map(x=>x.label).join(', ').slice(0,44)}</span>}
                  </div>
                  <div style={{ marginTop:5 }}><Tira o={o} cat={cat} alto={5}/></div>
                </div>
                <span style={{ fontSize:9.5, fontWeight:600, padding:'2px 7px', borderRadius:5, flexShrink:0,
                  background:c.bg, color:c.text }}>{o.estado}</span>
                <span style={{ fontSize:11.5, fontWeight:700, color:'#64748b', width:34, textAlign:'right', flexShrink:0 }}>{a.pct}%</span>
              </div>
            );
          })}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Cuellos de botella */}
          <div style={{ ...card, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                          letterSpacing:'.05em', marginBottom:10, display:'flex', alignItems:'center', gap:5 }}>
              <AlertTriangle size={11} color="#b45309"/> Qué está frenando
            </div>
            {cuellos.length === 0 && <p style={{ margin:0, fontSize:11.5, color:'#94a3b8' }}>Nada pendiente en curso.</p>}
            {cuellos.map(({ paso, objs }) => (
              <div key={paso.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <span style={{ width:20, height:20, borderRadius:6, flexShrink:0, display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700,
                  background: objs.length>1 ? '#fef2f2' : '#fffbeb',
                  color: objs.length>1 ? '#b91c1c' : '#b45309' }}>{objs.length}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:11, color:'#374151', overflow:'hidden', textOverflow:'ellipsis',
                                whiteSpace:'nowrap' }}>{paso.label}</div>
                  <div style={{ fontSize:9, color:'#94a3b8' }}>{paso.fase}</div>
                </div>
              </div>
            ))}
            {cuellos.some(c => c.objs.length > 1) && (
              <p style={{ margin:'8px 0 0', fontSize:10, color:'#94a3b8', lineHeight:1.5 }}>
                Los pasos con varios objetos se destraban de una sola gestión.</p>
            )}
          </div>

          {/* Quién */}
          <div style={{ ...card, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase',
                          letterSpacing:'.05em', marginBottom:9 }}>Quién</div>
            {[['Fábrica', equipo], ['Banco', contactos]].map(([t, gente]) => (
              <div key={t as string} style={{ marginBottom:8 }}>
                <div style={{ fontSize:9.5, color:'#94a3b8', marginBottom:3 }}>{t}</div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {(gente as string[]).length === 0 && <span style={{ fontSize:11, color:'#94a3b8' }}>—</span>}
                  {(gente as string[]).map(p => (
                    <span key={p} style={{ fontSize:10.5, padding:'2px 8px', borderRadius:6,
                      background:'#f8fafc', color:'#475569', display:'inline-flex', alignItems:'center', gap:2 }}>
                      {p}<Copiar texto={p}/></span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {panel}
    </div>
  );
}

// ═══ Alta y edición de un objeto ═════════════════════════════════════════════
// Los pasos no se tocan aquí: se marcan en el panel, uno por uno, que es como
// ocurre en la realidad. Este formulario es solo la ficha del objeto.
function FormObjeto({ o, proyectos, responsables, esNuevo, onCerrar, onGuardar }: {
  o: ObjetoFabrica; proyectos: string[]; responsables: string[]; esNuevo: boolean;
  onCerrar: ()=>void; onGuardar: (o: ObjetoFabrica)=>void;
}) {
  const [f, setF] = useState<ObjetoFabrica>(o);
  // Un objeto puede llegar con un proyecto que todavía no está en la lista
  // (importado, o escrito antes de que existiera el registro).
  const [esNuevoProy, setEsNuevoProy] = useState(!!o.proyecto && !proyectos.includes(o.proyecto));
  // Aviso de dedazo: «SDATOOL-51117 SDM1» contra «SDATOOL-51117 SDM 1».
  const limpio = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  const avisoParecido = esNuevoProy && f.proyecto.trim()
    ? proyectos.find(p => p !== f.proyecto.trim() && limpio(p) === limpio(f.proyecto)) ?? null
    : null;
  const set = (k: keyof ObjetoFabrica) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  // Sin nombre y sin proyecto el objeto no se puede ni buscar ni reportar.
  const falta = !f.objetoInsumo.trim() || !f.proyecto.trim();

  const campo = (etiqueta: string, nodo: React.ReactNode, ancho = 1) => (
    <label style={{ gridColumn: `span ${ancho}` }}>
      <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>{etiqueta}</div>
      {nodo}
    </label>
  );

  return (
    <div onClick={onCerrar} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.4)', zIndex:110,
                                     display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:560, maxWidth:'100%', maxHeight:'90vh', overflowY:'auto',
             background:'#fff', borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:'0.5px solid #f1f5f9' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>{esNuevo ? 'Nuevo objeto' : 'Editar objeto'}</h3>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'#94a3b8' }}>
            {esNuevo ? 'Entra sin pasos marcados; se van marcando en su ficha.' : 'Los pasos se marcan en la ficha del objeto.'}
          </p>
        </div>

        <div style={{ padding:'16px 22px', display:'grid', gap:11, gridTemplateColumns:'1fr 1fr' }}>
          {campo('Objeto insumo *', <input autoFocus value={f.objetoInsumo} onChange={set('objetoInsumo')}
            placeholder="t_kusu_user_err" style={{ ...inputS, ...mono }}/>, 2)}

          {campo('Proyecto *', <>
            <select value={esNuevoProy ? '__nuevo' : f.proyecto}
              onChange={e => {
                if (e.target.value === '__nuevo') { setEsNuevoProy(true); setF({ ...f, proyecto: '' }); }
                else { setEsNuevoProy(false); setF({ ...f, proyecto: e.target.value }); }
              }}
              style={inputS}>
              <option value="">— elegir proyecto —</option>
              {proyectos.map(p => <option key={p} value={p}>{p}</option>)}
              <option value="__nuevo">+ Registrar un proyecto nuevo…</option>
            </select>
            {esNuevoProy && (
              <>
                <input autoFocus value={f.proyecto} onChange={set('proyecto')}
                  placeholder="SDATOOL-60001 Nombre del proyecto"
                  style={{ ...inputS, marginTop:5 }}/>
                {avisoParecido && (
                  <div style={{ fontSize:10, color:'#b45309', marginTop:4 }}>
                    Se parece mucho a «{avisoParecido}», que ya existe. ¿Quisiste decir ese?
                  </div>
                )}
              </>
            )}
          </>, 2)}

          {campo('Objeto destino', <input value={f.objeto} onChange={set('objeto')} style={{ ...inputS, ...mono }}/>, 2)}

          {campo('Responsable', <>
            <input value={f.responsable} onChange={set('responsable')} list="fab-resp" style={inputS}/>
            <datalist id="fab-resp">{responsables.map(r => <option key={r} value={r}/>)}</datalist>
          </>)}
          {campo('Contacto banco', <input value={f.contactoBanco} onChange={set('contactoBanco')} style={inputS}/>)}

          {campo('Estado', <select value={f.estado} onChange={set('estado')} style={inputS}>
            {Object.keys(ESTADOS).map(e => <option key={e} value={e}>{e}</option>)}
          </select>)}
          {campo('Periodicidad', <input value={f.periodicidad} onChange={set('periodicidad')}
            placeholder="Diario, Mensual, Eventual…" style={inputS}/>)}

          {campo('Fecha de recepción', <input type="date" value={f.fechaRecepcion?.slice(0,10) ?? ''}
            onChange={set('fechaRecepcion')} style={inputS}/>, 2)}

          {campo('Comentarios', <textarea value={f.comentarios} onChange={set('comentarios')} rows={3}
            style={{ ...inputS, resize:'vertical', fontFamily:'inherit' }}/>, 2)}
        </div>

        <div style={{ padding:'12px 22px 18px', display:'flex', gap:8, justifyContent:'flex-end',
                      borderTop:'0.5px solid #f1f5f9' }}>
          {falta && <span style={{ fontSize:10.5, color:'#b45309', marginRight:'auto', alignSelf:'center' }}>
            Hace falta el nombre del objeto y el proyecto</span>}
          <button onClick={onCerrar} style={botonS}>Cancelar</button>
          <button disabled={falta} onClick={()=>onGuardar({ ...f, objetoInsumo: f.objetoInsumo.trim(), proyecto: f.proyecto.trim() })}
            style={{ ...botonS, border:'none', background: falta ? '#e2e8f0' : '#6d28d9',
                     color: falta ? '#94a3b8' : '#fff', cursor: falta ? 'not-allowed' : 'pointer' }}>
            {esNuevo ? 'Crear objeto' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══ Configurar los pasos ════════════════════════════════════════════════════
// El proceso de la fábrica cambia. Esto deja cambiarlo sin tocar el código.
// La única regla dura: si un paso ya tiene datos en objetos reales, borrarlo
// pierde esos datos, así que se avisa con el número exacto.
function ConfigPasos({ cat, objetos, onCerrar, onGuardar }: {
  cat: PasoCatalogo[]; objetos: ObjetoFabrica[]; onCerrar: ()=>void; onGuardar: (p: PasoCatalogo[])=>void;
}) {
  const [ps, setPs] = useState<PasoCatalogo[]>(cat);
  const [nuevaFase, setNuevaFase] = useState('');

  /** Cuántos objetos tienen marcado este paso: lo que se perdería al borrarlo. */
  const usos = (id: string) => objetos.filter(o => o.pasos?.[id]).length;

  const agregar = (fase: string) => {
    const label = prompt(`Nombre del paso nuevo en «${fase}»`)?.trim();
    if (!label) return;
    const id = nuevoId(label, ps);
    // Se inserta al final de su fase, que es donde suele ir un paso nuevo.
    const ult = ps.map(p => p.fase).lastIndexOf(fase);
    setPs([...ps.slice(0, ult+1), { id, label, fase }, ...ps.slice(ult+1)]);
  };

  const renombrar = (id: string) => {
    const p = ps.find(x => x.id === id)!;
    const label = prompt('Nombre del paso', p.label)?.trim();
    // El id no cambia al renombrar: los datos ya marcados cuelgan de él.
    if (label) setPs(ps.map(x => x.id === id ? { ...x, label } : x));
  };

  const quitar = (id: string) => {
    const n = usos(id);
    const p = ps.find(x => x.id === id)!;
    if (n && !confirm(`«${p.label}» está marcado en ${n} objeto${n!==1?'s':''}. Si lo quitas, se pierde esa marca. ¿Seguir?`)) return;
    setPs(ps.filter(x => x.id !== id));
  };

  const fs = fasesDe(ps);
  const cambiado = JSON.stringify(ps) !== JSON.stringify(cat);

  return (
    <div onClick={onCerrar} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.4)', zIndex:110,
                                     display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:620, maxWidth:'100%', maxHeight:'90vh', display:'flex',
             flexDirection:'column', background:'#fff', borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:'0.5px solid #f1f5f9' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Pasos de la fábrica</h3>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'#94a3b8' }}>
            {ps.length} pasos en {fs.length} fases · todos los objetos recorren esta lista.
            El orden es el proceso; mover un paso fuera de su fase lo pasa a la vecina.
          </p>
        </div>

        <div style={{ padding:'14px 22px', overflowY:'auto', flex:1 }}>
          {fs.map(fase => (
            <div key={fase} style={{ marginBottom:15 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#6d28d9', textTransform:'uppercase',
                               letterSpacing:'.05em' }}>{fase}</span>
                <span style={{ fontSize:10, color:'#94a3b8' }}>{pasosDeFase(fase, ps).length}</span>
                <button onClick={()=>agregar(fase)} style={{ border:'none', background:'none', cursor:'pointer',
                  color:'#a78bfa', fontSize:10.5, display:'flex', alignItems:'center', gap:2, padding:0 }}>
                  <Plus size={10}/>paso</button>
              </div>
              <div style={{ border:'0.5px solid #f1f5f9', borderRadius:9, overflow:'hidden' }}>
                {pasosDeFase(fase, ps).map((p, k) => {
                  const n = usos(p.id);
                  return (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 10px',
                      borderTop: k ? '0.5px solid #f8fafc' : 'none' }}>
                      <span style={{ flex:1, fontSize:11, color:'#374151' }}>{p.label}</span>
                      {n > 0 && <span title={`Marcado en ${n} objeto${n!==1?'s':''}`}
                        style={{ fontSize:9, color:'#94a3b8' }}>{n}</span>}
                      <button onClick={()=>setPs(mover(ps, p.id, -1))} title="Subir"
                        style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:1, display:'flex' }}>
                        <ChevronUp size={12}/></button>
                      <button onClick={()=>setPs(mover(ps, p.id, 1))} title="Bajar"
                        style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:1, display:'flex' }}>
                        <ChevronDown size={12}/></button>
                      <button onClick={()=>renombrar(p.id)} title="Renombrar"
                        style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:1, display:'flex' }}>
                        <Pencil size={11}/></button>
                      <button onClick={()=>quitar(p.id)} title="Quitar"
                        style={{ border:'none', background:'none', cursor:'pointer', color:'#fca5a5', padding:1, display:'flex' }}>
                        <Trash2 size={11}/></button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4 }}>
            <input value={nuevaFase} onChange={e=>setNuevaFase(e.target.value)} placeholder="Nombre de una fase nueva"
              style={{ ...inputS, flex:1 }}/>
            <button disabled={!nuevaFase.trim() || fs.includes(nuevaFase.trim())}
              onClick={()=>{ const f = nuevaFase.trim();
                setPs([...ps, { id: nuevoId(`${f}-paso`, ps), label: 'Paso nuevo', fase: f }]);
                setNuevaFase(''); }}
              style={{ ...botonS, opacity: nuevaFase.trim() && !fs.includes(nuevaFase.trim()) ? 1 : .45 }}>
              Agregar fase</button>
          </div>
        </div>

        <div style={{ padding:'12px 22px 18px', display:'flex', gap:8, justifyContent:'flex-end',
                      borderTop:'0.5px solid #f1f5f9' }}>
          <button onClick={()=>setPs(cat)} disabled={!cambiado}
            style={{ ...botonS, border:'none', background:'none', color: cambiado ? '#94a3b8' : '#e2e8f0',
                     marginRight:'auto' }}>Deshacer cambios</button>
          <button onClick={onCerrar} style={botonS}>Cancelar</button>
          <button onClick={()=>{ onGuardar(ps); onCerrar(); }} disabled={!cambiado}
            style={{ ...botonS, border:'none', background: cambiado ? '#6d28d9' : '#e2e8f0',
                     color: cambiado ? '#fff' : '#94a3b8', cursor: cambiado ? 'pointer' : 'default' }}>Guardar pasos</button>
        </div>
      </div>
    </div>
  );
}

// ═══ Alta y edición de un proyecto de la fábrica ═════════════════════════════
// Estos proyectos son de David, no los de la plataforma: no salen en el tablero
// del equipo ni en los planes de trabajo, y dar de alta uno aquí no le crea
// nada a nadie. El código es la identidad, así que cambiarlo en un proyecto
// que ya tiene objetos los dejaría huérfanos: por eso se bloquea.
function FormProyecto({ p, existentes, esNuevo, onCerrar, onGuardar }: {
  p: ProyectoFabrica; existentes: string[]; esNuevo: boolean;
  onCerrar: ()=>void; onGuardar: (p: ProyectoFabrica)=>void;
}) {
  const [f, setF] = useState<ProyectoFabrica>(p);
  const id = f.id.trim();

  const limpio = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  const duplicado = esNuevo && existentes.some(x => x === id);
  const parecido  = !duplicado && id
    ? existentes.find(x => x !== id && limpio(x) === limpio(id)) ?? null
    : null;
  const falta = !id || duplicado;

  return (
    <div onClick={onCerrar} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.4)', zIndex:110,
                                     display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:480, maxWidth:'100%', background:'#fff',
             borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:'0.5px solid #f1f5f9' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>
            {esNuevo ? 'Nuevo proyecto de la fábrica' : 'Editar proyecto'}</h3>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'#94a3b8', lineHeight:1.5 }}>
            Vive solo aquí: no aparece en Proyectos de la plataforma, ni en el tablero,
            ni en los planes de trabajo del equipo.
          </p>
        </div>

        <div style={{ padding:'16px 22px', display:'grid', gap:11 }}>
          <label>
            <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>
              Código *</div>
            <input autoFocus={esNuevo} value={f.id} disabled={!esNuevo}
              onChange={e=>setF({ ...f, id: e.target.value })}
              placeholder="SDATOOL-60001 SDM3"
              style={{ ...inputS, ...mono, background: esNuevo ? '#fff' : '#f8fafc', color: esNuevo ? '#111' : '#64748b' }}/>
            {!esNuevo && (
              <div style={{ fontSize:9.5, color:'#94a3b8', marginTop:3 }}>
                El código no se cambia: es lo que guarda cada objeto para saber a qué proyecto pertenece.
              </div>
            )}
            {duplicado && (
              <div style={{ fontSize:10, color:'#b91c1c', marginTop:4 }}>Ya existe un proyecto con ese código.</div>
            )}
            {parecido && (
              <div style={{ fontSize:10, color:'#b45309', marginTop:4 }}>
                Se parece mucho a «{parecido}». Si es el mismo, usa ese para no partir el proyecto en dos.
              </div>
            )}
          </label>

          <label>
            <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>
              Nombre</div>
            <input value={f.nombre} onChange={e=>setF({ ...f, nombre: e.target.value })}
              placeholder="Migración de Capital" style={inputS}/>
          </label>

          <label>
            <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>
              Responsable</div>
            <input value={f.responsable ?? ''} onChange={e=>setF({ ...f, responsable: e.target.value })}
              placeholder="David Huaman" style={inputS}/>
          </label>

          <label>
            <div style={{ fontSize:9.5, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>
              Nota</div>
            <textarea value={f.nota ?? ''} onChange={e=>setF({ ...f, nota: e.target.value })} rows={2}
              style={{ ...inputS, resize:'vertical', fontFamily:'inherit' }}/>
          </label>
        </div>

        <div style={{ padding:'12px 22px 18px', display:'flex', gap:8, justifyContent:'flex-end',
                      borderTop:'0.5px solid #f1f5f9' }}>
          <button onClick={onCerrar} style={botonS}>Cancelar</button>
          <button disabled={falta}
            onClick={()=>onGuardar({ ...f, id, nombre: f.nombre.trim() || nombreProyecto(id) })}
            style={{ ...botonS, border:'none', background: falta ? '#e2e8f0' : '#6d28d9',
                     color: falta ? '#94a3b8' : '#fff', cursor: falta ? 'not-allowed' : 'pointer' }}>
            {esNuevo ? 'Crear proyecto' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}
