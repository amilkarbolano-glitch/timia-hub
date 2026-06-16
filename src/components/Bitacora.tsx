import React, { useState } from 'react';
import { Plus, Trash2, FileDown, Search, Link2, Package, BookOpen, X, ExternalLink, Copy, Check } from 'lucide-react';
import { adminStore, BitacoraEntry } from '../lib/adminStore';
import { PROJECTS, useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkEntry {
  id: string; projectId: string; title: string; url: string;
  category: string; descripcion: string; fecha: string; quien: string;
}

interface InventarioItem {
  id: string; projectId: string; tipo: string; nombre: string;
  schema: string; descripcion: string; estado: string; fecha: string; quien: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_CAMBIO  = ['Campo', 'Regla', 'Modelo', 'ETL', 'Otro'] as const;
const LINK_CATS     = ['Jira', 'Confluence', 'Bitbucket', 'Documentación', 'Otro'];
const INV_TIPOS     = ['Tabla ADA', 'Tabla Work', 'Tabla Live', 'Modelo', 'Job Control-M', 'Regla Hammurabi', 'Otro'];
const INV_ESTADOS   = ['En construcción', 'En pruebas', 'Certificada', 'En producción', 'Deprecada'];

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  Campo:  { bg: '#dbeafe', text: '#1d4ed8' },
  Regla:  { bg: '#fef3c7', text: '#92400e' },
  Modelo: { bg: '#ede9fe', text: '#6d28d9' },
  ETL:    { bg: '#d1fae5', text: '#065f46' },
  Otro:   { bg: '#f1f5f9', text: '#475569' },
};

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  'En construcción': { bg: '#fef9c3', text: '#a16207' },
  'En pruebas':      { bg: '#dbeafe', text: '#1d4ed8' },
  'Certificada':     { bg: '#ede9fe', text: '#6d28d9' },
  'En producción':   { bg: '#d1fae5', text: '#065f46' },
  'Deprecada':       { bg: '#f1f5f9', text: '#94a3b8' },
};

// ─── Storage helpers (localStorage simple) ───────────────────────────────────

function loadLinks(): LinkEntry[] {
  try { return JSON.parse(localStorage.getItem('timia_links') ?? '[]'); } catch { return []; }
}
function saveLinks(d: LinkEntry[]) { localStorage.setItem('timia_links', JSON.stringify(d)); }

function loadInventario(): InventarioItem[] {
  try { return JSON.parse(localStorage.getItem('timia_inventario') ?? '[]'); } catch { return []; }
}
function saveInventario(d: InventarioItem[]) { localStorage.setItem('timia_inventario', JSON.stringify(d)); }

// ─── CopyBtn helper ───────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text).catch(()=>{}); setOk(true); setTimeout(()=>setOk(false),2000); }}
      style={{ border:'none', background:'none', cursor:'pointer', padding:2, color:ok?'#059669':'#94a3b8', display:'flex' }}>
      {ok ? <Check size={11}/> : <Copy size={11}/>}
    </button>
  );
}

// ─── Tab: Cambios funcionales ─────────────────────────────────────────────────

function TabCambios({ user }: { user: any }) {
  const [entries, setEntries] = useState<BitacoraEntry[]>(() => adminStore.getBitacora());
  const [form, setForm]       = useState({ projectId:'', tipo:'Campo' as typeof TIPOS_CAMBIO[number], descripcion:'', motivo:'', tablasAfectadas:'', jira:'' });
  const [showForm, setShow]   = useState(false);
  const [filterProj, setFP]   = useState('');
  const [filterTipo, setFT]   = useState('');
  const [search, setSearch]   = useState('');

  function save(next: BitacoraEntry[]) { setEntries(next); adminStore.saveBitacora(next); }
  function add() {
    if (!form.projectId || !form.descripcion.trim()) return;
    save([{ id:'b'+Date.now(), fecha:new Date().toISOString().slice(0,10), quien:user?.name??'Sistema', ...form }, ...entries]);
    setForm({ projectId:'', tipo:'Campo', descripcion:'', motivo:'', tablasAfectadas:'', jira:'' });
    setShow(false);
  }

  const filtered = entries.filter(e => {
    if (filterProj && e.projectId !== filterProj) return false;
    if (filterTipo && e.tipo !== filterTipo)       return false;
    if (search) { const q = search.toLowerCase(); return e.descripcion.toLowerCase().includes(q) || e.motivo.toLowerCase().includes(q); }
    return true;
  });

  function exportCsv() {
    const hdr = 'Fecha,Proyecto,Tipo,Descripción,Motivo,Tablas,Jira,Registrado por';
    const rows = filtered.map(e => [e.fecha,e.projectId,e.tipo,`"${e.descripcion}"`,`"${e.motivo}"`,`"${e.tablasAfectadas}"`,e.jira,e.quien].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([hdr+'\n'+rows.join('\n')],{type:'text/csv'}));
    a.download = `cambios_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginBottom:16 }}>
        <button onClick={exportCsv} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', color:'#374151' }}>
          <FileDown size={13}/> CSV
        </button>
        <button onClick={()=>setShow(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }}>
          <Plus size={13}/> Nuevo cambio
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'18px 20px', marginBottom:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            {[
              { label:'Proyecto *', node:<select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} style={inp()}><option value="">Seleccionar…</option>{PROJECTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select> },
              { label:'Tipo *', node:<select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value as any}))} style={inp()}>{TIPOS_CAMBIO.map(t=><option key={t}>{t}</option>)}</select> },
              { label:'Ticket Jira', node:<input value={form.jira} onChange={e=>setForm(f=>({...f,jira:e.target.value}))} placeholder="DECRONOS-xxxx" style={inp()}/> },
            ].map(({label,node})=><div key={label}><label style={lbl()}>{label}</label>{node}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={lbl()}>Descripción del cambio *</label><textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={3} placeholder="Ej: Campo PAN_CUST_ID cambió de VARCHAR a NUMERIC…" style={{...inp(),resize:'vertical'}}/></div>
            <div><label style={lbl()}>Motivo / Solicitado por</label><textarea value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} rows={3} placeholder="Ej: BBVA solicitó cambio el 2026-06-03…" style={{...inp(),resize:'vertical'}}/></div>
          </div>
          <div style={{ marginBottom:12 }}><label style={lbl()}>Tablas afectadas</label><input value={form.tablasAfectadas} onChange={e=>setForm(f=>({...f,tablasAfectadas:e.target.value}))} placeholder="t_kfca_input, t_kbrb_output, …" style={inp()}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setShow(false)} style={btnSec()}>Cancelar</button>
            <button onClick={add} style={btnPrimary()}>Guardar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 200px', maxWidth:260 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar descripción…" style={{...inp(), paddingLeft:28}}/>
        </div>
        <select value={filterProj} onChange={e=>setFP(e.target.value)} style={inp()}>
          <option value="">Todos los proyectos</option>
          {PROJECTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterTipo} onChange={e=>setFT(e.target.value)} style={inp()}>
          <option value="">Todos los tipos</option>
          {TIPOS_CAMBIO.map(t=><option key={t}>{t}</option>)}
        </select>
        <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto' }}>{filtered.length} registro{filtered.length!==1?'s':''}</span>
      </div>

      {filtered.length===0 ? (
        <div style={emptyBox()}>
          <BookOpen size={24} color="#cbd5e1" style={{ marginBottom:8 }}/>
          <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>No hay cambios registrados. {entries.length===0?'Agrega el primero.':''}</p>
        </div>
      ) : (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'80px 80px 70px 1fr 1fr 140px 80px 32px', gap:8, padding:'8px 14px', background:'#f8fafc', borderBottom:'0.5px solid #e2e8f0', fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>
            <span>Fecha</span><span>Proyecto</span><span>Tipo</span><span>Descripción</span><span>Motivo</span><span>Tablas</span><span>Jira</span><span/>
          </div>
          {filtered.map((e,i)=>{
            const tc = TIPO_COLORS[e.tipo]??TIPO_COLORS.Otro;
            const proj = PROJECTS.find(p=>p.id===e.projectId);
            return (
              <div key={e.id} style={{ display:'grid', gridTemplateColumns:'80px 80px 70px 1fr 1fr 140px 80px 32px', gap:8, alignItems:'start', padding:'10px 14px', borderBottom:i<filtered.length-1?'0.5px solid #f1f5f9':'none', background:i%2===0?'#fff':'#fafafe' }}>
                <span style={{ fontSize:10, color:'#64748b' }}>{e.fecha}</span>
                <span style={{ fontSize:11, fontWeight:500, color:proj?.color??'#64748b' }}>{e.projectId}</span>
                <span><span style={{ fontSize:9, padding:'2px 6px', borderRadius:8, background:tc.bg, color:tc.text, fontWeight:500 }}>{e.tipo}</span></span>
                <span style={{ fontSize:11, color:'#374151', lineHeight:1.5 }}>{e.descripcion}</span>
                <span style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>{e.motivo||'—'}</span>
                <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', lineHeight:1.4 }}>{e.tablasAfectadas||'—'}</span>
                <span style={{ fontSize:10, color:'#2563eb' }}>{e.jira||'—'}</span>
                <button onClick={()=>{ if(confirm('¿Eliminar?')) save(entries.filter(x=>x.id!==e.id)); }} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:2, display:'flex', alignItems:'center' }}><Trash2 size={12}/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Links importantes ────────────────────────────────────────────────────

function TabLinks({ user }: { user: any }) {
  const [links, setLinks]       = useState<LinkEntry[]>(loadLinks);
  const [showForm, setShow]     = useState(false);
  const [filterProj, setFP]     = useState('');
  const [filterCat, setFC]      = useState('');
  const [form, setForm]         = useState({ projectId:'', title:'', url:'', category:'Confluence', descripcion:'' });

  function add() {
    if (!form.projectId || !form.title.trim() || !form.url.trim()) return;
    const next = [{ id:'l'+Date.now(), fecha:new Date().toISOString().slice(0,10), quien:user?.name??'Sistema', ...form }, ...links];
    setLinks(next); saveLinks(next); setForm({ projectId:'', title:'', url:'', category:'Confluence', descripcion:'' }); setShow(false);
  }
  function del(id: string) { if(confirm('¿Eliminar link?')){ const n=links.filter(l=>l.id!==id); setLinks(n); saveLinks(n); } }

  const filtered = links.filter(l => (!filterProj||l.projectId===filterProj) && (!filterCat||l.category===filterCat));

  const CAT_COLORS: Record<string,{bg:string;text:string}> = {
    Jira:          {bg:'#dbeafe',text:'#1d4ed8'},
    Confluence:    {bg:'#ede9fe',text:'#6d28d9'},
    Bitbucket:     {bg:'#d1fae5',text:'#065f46'},
    Documentación: {bg:'#fef3c7',text:'#92400e'},
    Otro:          {bg:'#f1f5f9',text:'#475569'},
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button onClick={()=>setShow(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }}>
          <Plus size={13}/> Nuevo link
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'18px 20px', marginBottom:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={lbl()}>Proyecto *</label><select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} style={inp()}><option value="">Seleccionar…</option>{PROJECTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={lbl()}>Título / Nombre *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ej: Confluence FICO Q2" style={inp()}/></div>
            <div><label style={lbl()}>Categoría</label><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inp()}>{LINK_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ marginBottom:10 }}><label style={lbl()}>URL *</label><input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://…" style={inp()}/></div>
          <div style={{ marginBottom:12 }}><label style={lbl()}>Descripción</label><input value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Qué contiene o para qué sirve este link…" style={inp()}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setShow(false)} style={btnSec()}>Cancelar</button>
            <button onClick={add} style={btnPrimary()}>Guardar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <select value={filterProj} onChange={e=>setFP(e.target.value)} style={inp()}>
          <option value="">Todos los proyectos</option>
          {PROJECTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterCat} onChange={e=>setFC(e.target.value)} style={inp()}>
          <option value="">Todas las categorías</option>
          {LINK_CATS.map(c=><option key={c}>{c}</option>)}
        </select>
        <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto', alignSelf:'center' }}>{filtered.length} link{filtered.length!==1?'s':''}</span>
      </div>

      {filtered.length===0 ? (
        <div style={emptyBox()}>
          <Link2 size={24} color="#cbd5e1" style={{ marginBottom:8 }}/>
          <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>No hay links registrados. Agrega Jira, Confluence, Bitbucket, docs importantes…</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:10 }}>
          {filtered.map(l => {
            const cc = CAT_COLORS[l.category]??CAT_COLORS.Otro;
            const proj = PROJECTS.find(p=>p.id===l.projectId);
            return (
              <div key={l.id} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:9, padding:'2px 7px', borderRadius:6, background:cc.bg, color:cc.text, fontWeight:600 }}>{l.category}</span>
                      <span style={{ fontSize:10, fontWeight:500, color:proj?.color??'#64748b' }}>{l.projectId}</span>
                    </div>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#111', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.title}</p>
                  </div>
                  <button onClick={()=>del(l.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:2, flexShrink:0, display:'flex' }}><Trash2 size={12}/></button>
                </div>
                {l.descripcion && <p style={{ margin:'0 0 8px', fontSize:11, color:'#64748b', lineHeight:1.5 }}>{l.descripcion}</p>}
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 8px', background:'#f8fafc', borderRadius:7 }}>
                  <Link2 size={11} color="#94a3b8"/>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize:10, color:'#2563eb', textDecoration:'none', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.url}</a>
                  <CopyBtn text={l.url}/>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color:'#94a3b8', display:'flex' }}><ExternalLink size={11}/></a>
                </div>
                <p style={{ margin:'6px 0 0', fontSize:9, color:'#cbd5e1' }}>Agregado por {l.quien} · {l.fecha}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Inventario ──────────────────────────────────────────────────────────

function TabInventario({ user }: { user: any }) {
  const [items, setItems]   = useState<InventarioItem[]>(loadInventario);
  const [showForm, setShow] = useState(false);
  const [filterProj, setFP] = useState('');
  const [filterTipo, setFT] = useState('');
  const [filterEst, setFE]  = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm]     = useState({ projectId:'', tipo:'Tabla ADA', nombre:'', schema:'', descripcion:'', estado:'En construcción' });

  function add() {
    if (!form.projectId || !form.nombre.trim()) return;
    const next = [{ id:'i'+Date.now(), fecha:new Date().toISOString().slice(0,10), quien:user?.name??'Sistema', ...form }, ...items];
    setItems(next); saveInventario(next);
    setForm({ projectId:'', tipo:'Tabla ADA', nombre:'', schema:'', descripcion:'', estado:'En construcción' }); setShow(false);
  }
  function del(id: string) { if(confirm('¿Eliminar?')){ const n=items.filter(i=>i.id!==id); setItems(n); saveInventario(n); } }
  function updEstado(id: string, estado: string) {
    const n = items.map(i=>i.id===id?{...i,estado}:i); setItems(n); saveInventario(n);
  }

  const filtered = items.filter(i =>
    (!filterProj||i.projectId===filterProj) && (!filterTipo||i.tipo===filterTipo) &&
    (!filterEst||i.estado===filterEst) &&
    (!search||(i.nombre+i.schema+i.descripcion).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button onClick={()=>setShow(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }}>
          <Plus size={13}/> Nuevo objeto
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'18px 20px', marginBottom:18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={lbl()}>Proyecto *</label><select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} style={inp()}><option value="">Seleccionar…</option>{PROJECTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label style={lbl()}>Tipo *</label><select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp()}>{INV_TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={lbl()}>Estado inicial</label><select value={form.estado} onChange={e=>setForm(f=>({...f,estado:e.target.value}))} style={inp()}>{INV_ESTADOS.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={lbl()}>Nombre del objeto *</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="t_kfca_crsp_fico_data_co" style={inp()}/></div>
            <div><label style={lbl()}>Schema / Path</label><input value={form.schema} onChange={e=>setForm(f=>({...f,schema:e.target.value}))} placeholder="ej: schema_fico.t_kfca_…" style={inp()}/></div>
          </div>
          <div style={{ marginBottom:12 }}><label style={lbl()}>Descripción</label><input value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Qué contiene, para qué sirve…" style={inp()}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setShow(false)} style={btnSec()}>Cancelar</button>
            <button onClick={add} style={btnPrimary()}>Guardar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 180px', maxWidth:240 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar tabla, schema…" style={{...inp(), paddingLeft:28}}/>
        </div>
        <select value={filterProj} onChange={e=>setFP(e.target.value)} style={inp()}>
          <option value="">Todos los proyectos</option>
          {PROJECTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterTipo} onChange={e=>setFT(e.target.value)} style={inp()}>
          <option value="">Todos los tipos</option>
          {INV_TIPOS.map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={filterEst} onChange={e=>setFE(e.target.value)} style={inp()}>
          <option value="">Todos los estados</option>
          {INV_ESTADOS.map(s=><option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto' }}>{filtered.length} objeto{filtered.length!==1?'s':''}</span>
      </div>

      {filtered.length===0 ? (
        <div style={emptyBox()}>
          <Package size={24} color="#cbd5e1" style={{ marginBottom:8 }}/>
          <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>No hay objetos registrados. Agrega tablas, modelos, jobs, reglas…</p>
        </div>
      ) : (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'80px 110px 1fr 140px 130px 80px 30px', gap:8, padding:'8px 14px', background:'#f8fafc', borderBottom:'0.5px solid #e2e8f0', fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>
            <span>Proyecto</span><span>Tipo</span><span>Nombre / Schema</span><span>Descripción</span><span>Estado</span><span>Fecha</span><span/>
          </div>
          {filtered.map((it,i)=>{
            const ec = ESTADO_COLORS[it.estado]??ESTADO_COLORS['En construcción'];
            const proj = PROJECTS.find(p=>p.id===it.projectId);
            return (
              <div key={it.id} style={{ display:'grid', gridTemplateColumns:'80px 110px 1fr 140px 130px 80px 30px', gap:8, alignItems:'center', padding:'10px 14px', borderBottom:i<filtered.length-1?'0.5px solid #f1f5f9':'none', background:i%2===0?'#fff':'#fafafe' }}>
                <span style={{ fontSize:11, fontWeight:500, color:proj?.color??'#64748b' }}>{it.projectId}</span>
                <span style={{ fontSize:9, padding:'2px 6px', borderRadius:6, background:'#f1f5f9', color:'#475569', fontWeight:500, display:'inline-block' }}>{it.tipo}</span>
                <div>
                  <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#111', fontFamily:'monospace' }}>{it.nombre}</p>
                  {it.schema && <p style={{ margin:'2px 0 0', fontSize:10, color:'#94a3b8', fontFamily:'monospace' }}>{it.schema}</p>}
                </div>
                <span style={{ fontSize:11, color:'#64748b', lineHeight:1.4 }}>{it.descripcion||'—'}</span>
                <select value={it.estado} onChange={e=>updEstado(it.id,e.target.value)}
                  style={{ fontSize:10, padding:'3px 6px', borderRadius:7, border:'none', background:ec.bg, color:ec.text, fontWeight:600, cursor:'pointer', appearance:'none', WebkitAppearance:'none' }}>
                  {INV_ESTADOS.map(s=><option key={s}>{s}</option>)}
                </select>
                <span style={{ fontSize:10, color:'#94a3b8' }}>{it.fecha}</span>
                <button onClick={()=>del(it.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:2, display:'flex' }}><Trash2 size={12}/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function inp(): React.CSSProperties { return { width:'100%', padding:'7px 10px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:7, background:'#fff', boxSizing:'border-box', outline:'none' }; }
function lbl(): React.CSSProperties { return { fontSize:11, color:'#64748b', display:'block', marginBottom:4 }; }
function btnPrimary(): React.CSSProperties { return { padding:'8px 16px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }; }
function btnSec(): React.CSSProperties { return { padding:'8px 14px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', color:'#374151' }; }
function emptyBox(): React.CSSProperties { return { background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'48px 0', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }; }

// ─── Main export ──────────────────────────────────────────────────────────────

type Tab = 'cambios' | 'links' | 'inventario';

const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id:'cambios',    label:'Cambios funcionales', icon:<BookOpen size={14}/>,  desc:'Redefiniciones de campos, reglas, modelos y ETL' },
  { id:'links',      label:'Links importantes',   icon:<Link2 size={14}/>,     desc:'Jira, Confluence, Bitbucket, documentación de referencia' },
  { id:'inventario', label:'Inventario',           icon:<Package size={14}/>,   desc:'Tablas, objetos, jobs y modelos del proyecto' },
];

export default function Bitacora() {
  const { user }        = useAuth();
  const [tab, setTab]   = useState<Tab>('cambios');
  const active          = TABS.find(t=>t.id===tab)!;

  return (
    <div style={{ padding:'28px 36px', maxWidth:1500, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:500, color:'#111' }}>Alcances del proyecto</h2>
        <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>Gestión de cambios · links clave · inventario de objetos y tablas</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'0.5px solid #e2e8f0', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'9px 16px', fontSize:13, fontWeight:tab===t.id?600:400,
            color:tab===t.id?'#dc2626':'#64748b',
            background:'none', border:'none',
            borderBottom:tab===t.id?'2px solid #dc2626':'2px solid transparent',
            cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Subtitle */}
      <p style={{ margin:'0 0 16px', fontSize:12, color:'#94a3b8' }}>{active.desc}</p>

      {/* Content */}
      {tab === 'cambios'    && <TabCambios    user={user}/>}
      {tab === 'links'      && <TabLinks      user={user}/>}
      {tab === 'inventario' && <TabInventario user={user}/>}
    </div>
  );
}
