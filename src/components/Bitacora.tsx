import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Link2, Package, BookOpen, X, ExternalLink, Copy, Check, TicketCheck, ClipboardList } from 'lucide-react';
import { adminStore, BitacoraEntry } from '../lib/adminStore';
import { PROJECTS, useAuth, canAccess } from '../contexts/AuthContext';
import ImputacionesJira from './ImputacionesJira';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkEntry {
  id: string; projectId: string; title: string; url: string;
  category: string; descripcion: string; fecha: string; quien: string;
}

// ── Inventario v2: tabla dinámica tipo Excel ──────────────────────────────────
interface InvRow {
  id: string;
  projectId: string;
  objeto: string;         // nombre de la tabla / artifact
  descripcion: string;
  documentacion: string;  // link
  versionModelo: string;
  versionObjeto: string;
  diccionario: string;    // link
  stages: Record<string, string>;  // stageId → '' | 'Sí' | 'N/A' | valor custom
}
interface InvStage { id: string; label: string; type?: 'check' | 'percent'; }

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS_CAMBIO  = ['Campo', 'Regla', 'Modelo', 'ETL', 'Otro'] as const;
const LINK_CATS     = ['Jira', 'Ticket', 'Bitbucket', 'Documentación', 'Otro'];

// Etapas por defecto del inventario (basado en el tracking real del equipo)
const DEFAULT_INV_STAGES: InvStage[] = [
  { id: 'env-msd',     label: 'Envío MSD' },
  { id: 'apr-msd',     label: 'Aprobación MSD' },
  { id: 'env-gob',     label: 'Envía a gobierno' },
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

// ── Inventario v2 storage ────────────────────────────────────────────────────
function loadInvRows(): InvRow[] {
  try { return JSON.parse(localStorage.getItem('timia_inv_v2') ?? '[]'); } catch { return []; }
}
function saveInvRows(d: InvRow[]) { localStorage.setItem('timia_inv_v2', JSON.stringify(d)); }
function loadInvStages(): InvStage[] {
  try {
    const raw = localStorage.getItem('timia_inv_stages');
    return raw ? JSON.parse(raw) : DEFAULT_INV_STAGES;
  } catch { return DEFAULT_INV_STAGES; }
}
function saveInvStages(d: InvStage[]) { localStorage.setItem('timia_inv_stages', JSON.stringify(d)); }

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

  const accessibleIds: string[] = user?.role === 'pm' ? PROJECTS.map((p: any) => p.id) : (user?.projectIds ?? []);
  const accessibleProjects = PROJECTS.filter((p: any) => accessibleIds.includes(p.id));

  function save(next: BitacoraEntry[]) { setEntries(next); adminStore.saveBitacora(next); }
  function add() {
    if (!form.projectId || !form.descripcion.trim()) return;
    save([{ id:'b'+Date.now(), fecha:new Date().toISOString().slice(0,10), quien:user?.name??'Sistema', ...form }, ...entries]);
    setForm({ projectId:'', tipo:'Campo', descripcion:'', motivo:'', tablasAfectadas:'', jira:'' });
    setShow(false);
  }

  const filtered = entries.filter(e => {
    if (!accessibleIds.includes(e.projectId)) return false;
    if (filterProj && e.projectId !== filterProj) return false;
    if (filterTipo && e.tipo !== filterTipo)       return false;
    if (search) { const q = search.toLowerCase(); return e.descripcion.toLowerCase().includes(q) || e.motivo.toLowerCase().includes(q); }
    return true;
  });

  const [standup, setStandup] = useState(false);

  function copyStandup() {
    const today = new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const projLabel = filterProj
      ? PROJECTS.find((p: any) => p.id === filterProj)?.name ?? filterProj
      : accessibleProjects.map((p: any) => p.name).join(' · ');

    const lines: string[] = [
      `📋 STATUS SEMANAL — ${projLabel.toUpperCase()}`,
      `📅 ${today.charAt(0).toUpperCase() + today.slice(1)}`,
      `${'─'.repeat(40)}`,
      ``,
      `📝 CAMBIOS FUNCIONALES (${filtered.length})`,
      ``,
    ];

    // Agrupar por tipo
    const byTipo: Record<string, typeof filtered> = {};
    filtered.forEach(e => { (byTipo[e.tipo] ??= []).push(e); });

    const tipoEmoji: Record<string,string> = { Campo:'🔷', Regla:'📐', Modelo:'🧠', ETL:'⚙️', Otro:'📌' };
    Object.entries(byTipo).forEach(([tipo, items]) => {
      lines.push(`${tipoEmoji[tipo] ?? '▫️'} ${tipo.toUpperCase()} (${items.length})`);
      items.forEach(e => {
        lines.push(`   • ${e.descripcion}${e.motivo ? ` — ${e.motivo}` : ''}${e.jira ? ` [${e.jira}]` : ''}`);
        if (e.tablasAfectadas) lines.push(`     Tablas: ${e.tablasAfectadas}`);
      });
      lines.push('');
    });

    lines.push(`${'─'.repeat(40)}`);
    lines.push(`🔗 Registrado en Timia Hub · ${today}`);

    navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
    setStandup(true);
    setTimeout(() => setStandup(false), 2500);
  }

  // Stats por tipo
  const statsByTipo = TIPOS_CAMBIO.reduce((acc, t) => {
    acc[t] = entries.filter(e => accessibleIds.includes(e.projectId) && e.tipo === t).length;
    return acc;
  }, {} as Record<string, number>);
  const totalAll = entries.filter(e => accessibleIds.includes(e.projectId)).length;

  return (
    <div>
      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:18 }}>
        {[
          { label:'Total', value:totalAll, bg:'#f8fafc', color:'#374151', border:'#e2e8f0' },
          ...TIPOS_CAMBIO.map(t => ({
            label: t, value: statsByTipo[t] ?? 0,
            bg: TIPO_COLORS[t].bg, color: TIPO_COLORS[t].text, border: TIPO_COLORS[t].text + '30',
          })),
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`0.5px solid ${s.border}`, borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:9, color:s.color, marginTop:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em', opacity:.75 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {/* Búsqueda */}
        <div style={{ position:'relative', flex:'1 1 200px', maxWidth:260 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar descripción…" style={{...inp(), paddingLeft:28}}/>
        </div>
        {/* Filtro proyecto */}
        <select value={filterProj} onChange={e=>setFP(e.target.value)} style={{ ...inp(), maxWidth:170 }}>
          <option value="">Todos los proyectos</option>
          {accessibleProjects.map((p: any)=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {/* Pills por tipo */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {TIPOS_CAMBIO.map(t => {
            const tc = TIPO_COLORS[t];
            const active = filterTipo === t;
            return (
              <button key={t} onClick={()=>setFT(active?'':t)} style={{
                padding:'4px 10px', fontSize:10, borderRadius:20, fontWeight:active?700:500,
                border:`0.5px solid ${active?tc.text:tc.text+'40'}`,
                background: active ? tc.bg : '#fff', color: tc.text, cursor:'pointer', transition:'all .12s',
              }}>{t}</button>
            );
          })}
          {filterTipo && <button onClick={()=>setFT('')} style={{ padding:'4px 8px', fontSize:10, borderRadius:20, border:'0.5px solid #e2e8f0', background:'#fff', color:'#94a3b8', cursor:'pointer' }}>× Limpiar</button>}
        </div>
        {/* Acciones */}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button
            onClick={copyStandup}
            title="Copiar como status semanal (WhatsApp / correo / Slack)"
            style={{
              display:'flex', alignItems:'center', gap:5, padding:'7px 12px', fontSize:11,
              border:`0.5px solid ${standup ? '#86efac' : '#e2e8f0'}`,
              borderRadius:7, background: standup ? '#f0fdf4' : '#fff',
              cursor:'pointer', color: standup ? '#15803d' : '#374151',
              transition:'all .2s', fontWeight: standup ? 600 : 400,
            }}
          >
            {standup ? <Check size={12}/> : <ClipboardList size={12}/>}
            {standup ? '¡Copiado!' : 'Copiar status'}
          </button>
          {canAccess(user?.role, 'write_bitacora') && (
            <button onClick={()=>setShow(v=>!v)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:600 }}>
              <Plus size={13}/> {showForm ? 'Cerrar' : 'Nuevo cambio'}
            </button>
          )}
        </div>
      </div>

      {/* ── Formulario ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background:'linear-gradient(135deg,#fef2f2,#fff5f5)', border:'0.5px solid #fecaca', borderRadius:14, padding:'20px 22px', marginBottom:20, boxShadow:'0 2px 12px rgba(220,38,38,.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'#dc2626', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BookOpen size={14} color="#fff"/>
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:'#111' }}>Registrar cambio funcional</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            {[
              { label:'Proyecto *', node:<select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} style={inp()}><option value="">Seleccionar…</option>{accessibleProjects.map((p: any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select> },
              { label:'Tipo *',     node:<select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value as any}))} style={inp()}>{TIPOS_CAMBIO.map(t=><option key={t}>{t}</option>)}</select> },
              { label:'Ticket Jira',node:<input value={form.jira} onChange={e=>setForm(f=>({...f,jira:e.target.value}))} placeholder="DECRONOS-xxxx" style={inp()}/> },
            ].map(({label,node})=><div key={label}><label style={lbl()}>{label}</label>{node}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={lbl()}>Descripción del cambio *</label><textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={3} placeholder="Ej: Campo PAN_CUST_ID cambió de VARCHAR a NUMERIC…" style={{...inp(),resize:'vertical'}}/></div>
            <div><label style={lbl()}>Motivo / Solicitado por</label><textarea value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} rows={3} placeholder="Ej: BBVA solicitó cambio el 2026-06-03…" style={{...inp(),resize:'vertical'}}/></div>
          </div>
          <div style={{ marginBottom:14 }}><label style={lbl()}>Tablas afectadas</label><input value={form.tablasAfectadas} onChange={e=>setForm(f=>({...f,tablasAfectadas:e.target.value}))} placeholder="t_kfca_input, t_kbrb_output, …" style={inp()}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setShow(false)} style={btnSec()}>Cancelar</button>
            <button onClick={add} disabled={!form.projectId||!form.descripcion.trim()} style={{ ...btnPrimary(), opacity:!form.projectId||!form.descripcion.trim()?0.5:1 }}>Guardar cambio</button>
          </div>
        </div>
      )}

      {/* ── Tabla de cambios ────────────────────────────────────────────────── */}
      <span style={{ fontSize:11, color:'#94a3b8', display:'block', marginBottom:10 }}>
        {filtered.length} registro{filtered.length!==1?'s':''} encontrado{filtered.length!==1?'s':''}
      </span>

      {filtered.length===0 ? (
        <div style={emptyBox()}>
          <BookOpen size={28} color="#cbd5e1" style={{ marginBottom:10 }}/>
          <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>No hay cambios registrados. {entries.length===0?'Agrega el primero con el botón "Nuevo cambio".':''}</p>
        </div>
      ) : (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,.04)' }}>
          {/* Cabecera */}
          <div style={{ display:'grid', gridTemplateColumns:'92px 80px 72px 1fr 1fr 150px 90px 32px', gap:8, padding:'9px 16px', background:'#fafafa', borderBottom:'0.5px solid #e2e8f0', fontSize:9, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>
            <span>Fecha</span><span>Proyecto</span><span>Tipo</span><span>Descripción</span><span>Motivo</span><span>Tablas afectadas</span><span>Jira</span><span/>
          </div>
          {/* Filas */}
          {filtered.map((e,i)=>{
            const tc   = TIPO_COLORS[e.tipo]??TIPO_COLORS.Otro;
            const proj = PROJECTS.find(p=>p.id===e.projectId);
            return (
              <div key={e.id} style={{
                display:'grid', gridTemplateColumns:'92px 80px 72px 1fr 1fr 150px 90px 32px',
                gap:8, alignItems:'start', padding:'11px 16px',
                borderBottom: i<filtered.length-1 ? '0.5px solid #f1f5f9' : 'none',
                borderLeft: `3px solid ${tc.text}50`,
                background: i%2===0 ? '#fff' : '#fafafe',
                transition: 'background .1s',
              }}
              onMouseEnter={ev=>(ev.currentTarget.style.background='#faf5ff')}
              onMouseLeave={ev=>(ev.currentTarget.style.background=i%2===0?'#fff':'#fafafe')}
              >
                <span style={{ fontSize:10, color:'#64748b', fontVariantNumeric:'tabular-nums' }}>{e.fecha}</span>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:proj?.color??'#64748b', flexShrink:0 }}/>
                  <span style={{ fontSize:11, fontWeight:600, color:proj?.color??'#64748b' }}>{e.projectId}</span>
                </div>
                <span>
                  <span style={{ display:'inline-block', fontSize:9, padding:'3px 7px', borderRadius:6, background:tc.bg, color:tc.text, fontWeight:700 }}>{e.tipo}</span>
                </span>
                <span style={{ fontSize:11, color:'#1e293b', lineHeight:1.5 }}>{e.descripcion}</span>
                <span style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>{e.motivo||<em style={{color:'#cbd5e1'}}>—</em>}</span>
                <span style={{ fontSize:10, color:'#64748b', fontFamily:'monospace', lineHeight:1.5, wordBreak:'break-all' }}>{e.tablasAfectadas||<em style={{color:'#cbd5e1'}}>—</em>}</span>
                <span>
                  {e.jira
                    ? <a href={`https://jira.bbva.com/browse/${e.jira}`} target="_blank" rel="noreferrer" style={{ fontSize:10, color:'#1d4ed8', fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:3, background:'#eff6ff', padding:'2px 6px', borderRadius:4, border:'0.5px solid #bfdbfe' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        {e.jira}
                      </a>
                    : <em style={{fontSize:10,color:'#cbd5e1'}}>—</em>
                  }
                </span>
                <button onClick={()=>{ if(confirm('¿Eliminar este cambio?')) save(entries.filter(x=>x.id!==e.id)); }} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:2, display:'flex', alignItems:'center' }}><Trash2 size={12}/></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Links importantes ────────────────────────────────────────────────────

// ─── Iconos por categoría ─────────────────────────────────────────────────────
const CAT_META: Record<string, { bg:string; text:string; icon:string }> = {
  Jira:          { bg:'#dbeafe', text:'#1d4ed8', icon:'J' },
  Ticket:        { bg:'#ede9fe', text:'#6d28d9', icon:'T' },
  Bitbucket:     { bg:'#d1fae5', text:'#065f46', icon:'B' },
  Documentación: { bg:'#fef3c7', text:'#92400e', icon:'D' },
  Otro:          { bg:'#f1f5f9', text:'#475569', icon:'•' },
};

export function TabLinks({ user }: { user: any }) {
  const [links, setLinks]   = useState<LinkEntry[]>(loadLinks);
  const [showForm, setShow] = useState(false);
  const [filterProj, setFP] = useState('');
  const [filterCat, setFC]  = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm]     = useState({ projectId:'', title:'', url:'', category:'Ticket', descripcion:'' });

  const accessibleIds: string[] = user?.role === 'pm' ? PROJECTS.map((p: any) => p.id) : (user?.projectIds ?? []);
  const accessibleProjects = PROJECTS.filter((p: any) => accessibleIds.includes(p.id));

  function add() {
    if (!form.projectId || !form.title.trim() || !form.url.trim()) return;
    const next = [{ id:'l'+Date.now(), fecha:new Date().toISOString().slice(0,10), quien:user?.name??'Sistema', ...form }, ...links];
    setLinks(next); saveLinks(next); setForm({ projectId:'', title:'', url:'', category:'Ticket', descripcion:'' }); setShow(false);
  }
  function del(id: string) { if(confirm('¿Eliminar link?')){ const n=links.filter(l=>l.id!==id); setLinks(n); saveLinks(n); } }

  const filtered = links.filter(l =>
    accessibleIds.includes(l.projectId) &&
    (!filterProj || l.projectId === filterProj) &&
    (!filterCat  || l.category  === filterCat) &&
    (!search     || l.title.toLowerCase().includes(search.toLowerCase()) || l.descripcion.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase()))
  );

  // Agrupar por categoría para mostrar mejor
  const byCat: Record<string, typeof filtered> = {};
  filtered.forEach(l => { (byCat[l.category] ??= []).push(l); });
  const cats = LINK_CATS.filter(c => byCat[c]?.length);

  return (
    <div>
      {/* Top bar: búsqueda + nuevo link */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
        {/* Barra de búsqueda */}
        <div style={{ position:'relative', flex:'1 1 220px', maxWidth:320 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, URL, descripción…"
            style={{ ...inp(), paddingLeft:30, width:'100%', boxSizing:'border-box' as const }}/>
        </div>

        {/* Filtro por proyecto — pills */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', flex:1 }}>
          {['', ...accessibleProjects.map((p: any)=>p.id)].map(id => {
            const proj = PROJECTS.find(p=>p.id===id);
            const active = filterProj === id;
            return (
              <button key={id||'all'} onClick={()=>setFP(id)}
                style={{ fontSize:11, padding:'4px 10px', borderRadius:20, border:`1px solid ${active?(proj?.color??'#94a3b8'):'#e2e8f0'}`,
                  background: active ? (proj?.color??'#94a3b8')+'15' : '#fff',
                  color: active ? (proj?.color??'#dc2626') : '#64748b',
                  fontWeight: active ? 600 : 400, cursor:'pointer', whiteSpace:'nowrap' as const, transition:'all .12s' }}>
                {id || 'Todos'}
              </button>
            );
          })}
        </div>

        <button onClick={()=>setShow(v=>!v)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:500, flexShrink:0 }}>
          <Plus size={13}/> Nuevo link
        </button>
      </div>

      {/* Pills de categoría */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        <button onClick={()=>setFC('')}
          style={{ fontSize:11, padding:'4px 12px', borderRadius:20, border:`1px solid ${!filterCat?'#dc2626':'#e2e8f0'}`,
            background:!filterCat?'#fef2f2':'#fff', color:!filterCat?'#dc2626':'#64748b', fontWeight:!filterCat?600:400, cursor:'pointer', transition:'all .12s' }}>
          Todas ({filtered.length})
        </button>
        {LINK_CATS.map(c => {
          const meta = CAT_META[c] ?? CAT_META.Otro;
          const count = links.filter(l => accessibleIds.includes(l.projectId) && l.category===c && (!filterProj||l.projectId===filterProj) && (!search||l.title.toLowerCase().includes(search.toLowerCase()))).length;
          if (count === 0) return null;
          const active = filterCat === c;
          return (
            <button key={c} onClick={()=>setFC(active?'':c)}
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'4px 12px', borderRadius:20, border:`1px solid ${active?meta.text:'#e2e8f0'}`,
                background:active?meta.bg:'#fff', color:active?meta.text:'#64748b', fontWeight:active?600:400, cursor:'pointer', transition:'all .12s' }}>
              <span style={{ width:16, height:16, borderRadius:4, background:meta.bg, color:meta.text, fontSize:9, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{meta.icon}</span>
              {c} <span style={{ opacity:.6 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'18px 20px', marginBottom:18 }}>
          <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:600, color:'#111' }}>Nuevo link</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl()}>Proyecto *</label>
              <select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} style={inp()}>
                <option value="">Seleccionar…</option>
                {accessibleProjects.map((p: any)=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl()}>Título / Nombre *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ej: Confluence FICO Q2" style={inp()}/>
            </div>
            <div>
              <label style={lbl()}>Categoría</label>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginTop:4 }}>
                {LINK_CATS.map(c => {
                  const meta = CAT_META[c] ?? CAT_META.Otro;
                  return (
                    <button key={c} type="button" onClick={()=>setForm(f=>({...f,category:c}))}
                      style={{ fontSize:10, padding:'3px 9px', borderRadius:16, border:`1px solid ${form.category===c?meta.text:'#e2e8f0'}`,
                        background:form.category===c?meta.bg:'#fff', color:form.category===c?meta.text:'#64748b',
                        fontWeight:form.category===c?600:400, cursor:'pointer' }}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={lbl()}>URL *</label>
            <input value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://…" style={inp()}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl()}>Descripción</label>
            <input value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Qué contiene o para qué sirve…" style={inp()}/>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setShow(false)} style={btnSec()}>Cancelar</button>
            <button onClick={add} style={btnPrimary()}>Guardar link</button>
          </div>
        </div>
      )}

      {/* Contenido: agrupado por categoría si no hay filtro activo */}
      {filtered.length === 0 ? (
        <div style={emptyBox()}>
          <Link2 size={24} color="#cbd5e1" style={{ marginBottom:8 }}/>
          <p style={{ margin:0, fontSize:13, color:'#94a3b8' }}>No hay links que coincidan. Agrega Jira, Tickets, Bitbucket, documentación…</p>
        </div>
      ) : filterCat ? (
        // Filtro activo: grid plano
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:10 }}>
          {filtered.map(l => <LinkCard key={l.id} l={l} onDelete={del}/>)}
        </div>
      ) : (
        // Sin filtro: agrupar por categoría
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {cats.map(cat => (
            <div key={cat}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:9, padding:'2px 8px', borderRadius:6, background:CAT_META[cat]?.bg??'#f1f5f9', color:CAT_META[cat]?.text??'#475569', fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'.06em' }}>{cat}</span>
                <div style={{ flex:1, height:'0.5px', background:'#e2e8f0' }}/>
                <span style={{ fontSize:10, color:'#94a3b8' }}>{byCat[cat].length}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:8 }}>
                {byCat[cat].map(l => <LinkCard key={l.id} l={l} onDelete={del}/>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkCard({ l, onDelete }: { l: any; onDelete:(id:string)=>void }) {
  const meta = CAT_META[l.category] ?? CAT_META.Otro;
  const proj = PROJECTS.find(p => p.id === l.projectId);
  return (
    <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, transition:'box-shadow .15s' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Icono de categoría */}
          <div style={{ width:32, height:32, borderRadius:8, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:700, color:meta.text }}>{meta.icon}</span>
          </div>
          <div>
            <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#111', lineHeight:1.3, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{l.title}</p>
            <span style={{ fontSize:10, fontWeight:500, color:proj?.color??'#64748b' }}>{l.projectId}</span>
          </div>
        </div>
        <button onClick={()=>onDelete(l.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'#cbd5e1', padding:2, flexShrink:0, display:'flex' }}><Trash2 size={12}/></button>
      </div>

      {/* Descripción */}
      {l.descripcion && <p style={{ margin:0, fontSize:11, color:'#64748b', lineHeight:1.5 }}>{l.descripcion}</p>}

      {/* URL row */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', background:'#f8fafc', borderRadius:8, border:'0.5px solid #f1f5f9' }}>
        <Link2 size={11} color="#94a3b8" style={{ flexShrink:0 }}/>
        <a href={l.url} target="_blank" rel="noreferrer"
          style={{ fontSize:10, color:'#2563eb', textDecoration:'none', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
          {l.url}
        </a>
        <CopyBtn text={l.url}/>
        <a href={l.url} target="_blank" rel="noreferrer" style={{ color:'#94a3b8', display:'flex', flexShrink:0 }}><ExternalLink size={11}/></a>
      </div>

      {/* Footer */}
      <p style={{ margin:0, fontSize:9, color:'#cbd5e1' }}>{l.quien} · {l.fecha}</p>
    </div>
  );
}

// ─── Tab: Inventario ──────────────────────────────────────────────────────────

const CELL_BG: Record<string, string> = {
  'Sí':  '#dcfce7',
  'N/A': '#f1f5f9',
  '':    '#fff',
};
const CELL_COLOR: Record<string, string> = {
  'Sí':  '#15803d',
  'N/A': '#94a3b8',
  '':    '#111',
};
const STAGE_CYCLE: Record<string, string> = { '': 'Sí', 'Sí': 'N/A', 'N/A': '' };
const PCT_CYCLE: string[] = ['', '25', '50', '75', '100'];

function InlineEdit({ value, placeholder, mono, onSave }: { value: string; placeholder?: string; mono?: boolean; onSave: (v:string)=>void; }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);
  const inputRef              = React.useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);

  const commit = () => { onSave(val); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
        style={{ width: '100%', padding: '2px 4px', fontSize: 11, fontFamily: mono ? 'monospace' : 'inherit',
          border: 'none', outline: '2px solid #dc2626', borderRadius: 4, background: '#fff', boxSizing: 'border-box' }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ display: 'block', padding: '3px 4px', fontSize: 11, fontFamily: mono ? 'monospace' : 'inherit',
        cursor: 'text', minHeight: 22, color: value ? '#111' : '#cbd5e1', borderRadius: 4,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={value || placeholder}
    >
      {value || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{placeholder}</span>}
    </span>
  );
}

function LinkCell({ value, onSave }: { value: string; onSave: (v:string)=>void; }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);
  const inputRef              = React.useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setVal(value); }, [value]);

  const commit = () => { onSave(val); setEditing(false); };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
        placeholder="https://..."
        style={{ width: '100%', padding: '2px 4px', fontSize: 11, border: 'none', outline: '2px solid #dc2626', borderRadius: 4, background: '#fff', boxSizing: 'border-box' }}
      />
    );
  }

  if (value) {
    return (
      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
        <a href={value} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
          style={{ color:'#0891b2', fontSize:11, textDecoration:'none' }}>
          <ExternalLink size={11}/>
        </a>
        <span onClick={()=>setEditing(true)} style={{ fontSize:9, color:'#0891b2', cursor:'text', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>ver</span>
      </span>
    );
  }

  return (
    <span onClick={()=>setEditing(true)} style={{ display:'block', padding:'3px 4px', fontSize:11, color:'#cbd5e1', cursor:'text', fontStyle:'italic', borderRadius:4 }}>
      link…
    </span>
  );
}

export function TabInventario({ user }: { user: any }) {
  const [rows,    setRows]    = useState<InvRow[]>(loadInvRows);
  const [stages,  setStages]  = useState<InvStage[]>(loadInvStages);
  const [filterProj, setFP]   = useState('');
  const [search,  setSearch]  = useState('');
  const [addStage, setAddSt]  = useState(false);
  const [newStLbl, setNewStL] = useState('');
  const [newStType, setNewStT]= useState<'check'|'percent'>('check');
  const [delMode,  setDelMode]= useState(false);

  // Projects accessible to this user
  const accessibleIds: string[] = user?.role === 'pm' ? PROJECTS.map((p: any) => p.id) : (user?.projectIds ?? []);
  const accessibleProjects = PROJECTS.filter((p: any) => accessibleIds.includes(p.id));

  function save(next: InvRow[]) { setRows(next); saveInvRows(next); }

  function addRow() {
    const defaultProj = filterProj || (accessibleProjects[0]?.id ?? PROJECTS[0]?.id ?? '');
    const row: InvRow = {
      id: 'r'+Date.now(),
      projectId: defaultProj,
      objeto: '', descripcion: '', documentacion: '',
      versionModelo: '', versionObjeto: '', diccionario: '',
      stages: {},
    };
    save([...rows, row]);
  }

  function delRow(id: string) {
    if (confirm('¿Eliminar esta fila?')) save(rows.filter(r => r.id !== id));
  }

  function updateCell(id: string, col: keyof Omit<InvRow,'id'|'projectId'|'stages'>, val: string) {
    save(rows.map(r => r.id === id ? { ...r, [col]: val } : r));
  }

  function cycleStage(rowId: string, stageId: string) {
    const row   = rows.find(r => r.id === rowId);
    const stage = stages.find(s => s.id === stageId);
    if (!row) return;
    const cur = row.stages[stageId] ?? '';
    let next: string;
    if (stage?.type === 'percent') {
      const idx = PCT_CYCLE.indexOf(cur);
      next = PCT_CYCLE[(idx + 1) % PCT_CYCLE.length];
    } else {
      next = STAGE_CYCLE[cur] ?? 'Sí';
    }
    save(rows.map(r => r.id === rowId ? { ...r, stages: { ...r.stages, [stageId]: next } } : r));
  }

  function setStageVal(rowId: string, stageId: string, val: string) {
    save(rows.map(r => r.id === rowId ? { ...r, stages: { ...r.stages, [stageId]: val } } : r));
  }

  function addStageCol() {
    if (!newStLbl.trim()) return;
    const next: InvStage[] = [...stages, { id: 'st-'+Date.now(), label: newStLbl.trim(), type: newStType }];
    setStages(next); saveInvStages(next);
    setNewStL(''); setNewStT('check'); setAddSt(false);
  }

  function delStageCol(id: string) {
    if (!confirm('¿Eliminar esta columna de todas las filas?')) return;
    const next = stages.filter(s => s.id !== id);
    setStages(next); saveInvStages(next);
  }

  const visible = rows.filter(r =>
    accessibleIds.includes(r.projectId) &&
    (!filterProj || r.projectId === filterProj) &&
    (!search || (r.objeto + r.descripcion).toLowerCase().includes(search.toLowerCase()))
  );

  const TH: React.CSSProperties = {
    padding: '0 6px', fontSize: 9, color: '#94a3b8', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap',
    background: '#f8fafc', position: 'sticky' as const, top: 0, zIndex: 2,
    borderBottom: '0.5px solid #e2e8f0',
  };
  const TD: React.CSSProperties = {
    padding: '2px 4px', borderBottom: '0.5px solid #f1f5f9', verticalAlign: 'middle',
  };

  return (
    <div>
      {/* Top bar */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 180px', maxWidth:240 }}>
          <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar objeto, descripción…" style={{...inp(), paddingLeft:28}}/>
        </div>
        <select value={filterProj} onChange={e=>setFP(e.target.value)} style={{ ...inp(), width:'auto' }}>
          <option value="">Todos los proyectos</option>
          {accessibleProjects.map((p: any)=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span style={{ fontSize:11, color:'#94a3b8' }}>{visible.length} fila{visible.length!==1?'s':''}</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {/* Gestionar columnas: solo líderes/referentes/PM */}
          {canAccess(user?.role, 'write_bitacora') && (
            <button onClick={()=>setDelMode(v=>!v)}
              style={{ padding:'6px 11px', fontSize:11, border:`0.5px solid ${delMode?'#dc2626':'#e2e8f0'}`,
                borderRadius:7, background: delMode?'#fef2f2':'#fff', color: delMode?'#dc2626':'#64748b', cursor:'pointer' }}>
              {delMode ? 'Listo' : 'Gestionar columnas'}
            </button>
          )}
          {/* Agregar objeto: developers también pueden */}
          {(canAccess(user?.role, 'write_bitacora') || canAccess(user?.role, 'add_inv_row')) && (
            <button onClick={addRow} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }}>
              <Plus size={13}/> Agregar objeto
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet table */}
      <div style={{ overflowX:'auto', border:'0.5px solid #e2e8f0', borderRadius:12, background:'#fff' }}>
        <table style={{ borderCollapse:'collapse', minWidth:'100%', tableLayout:'auto' }}>
          <thead>
            <tr style={{ height: 32 }}>
              {/* Fixed left */}
              <th style={{ ...TH, width:28, minWidth:28, position:'sticky', left:0, zIndex:3, textAlign:'center' }}>#</th>
              <th style={{ ...TH, width:160, minWidth:140, position:'sticky', left:28, zIndex:3, paddingLeft:8 }}>Objeto</th>
              <th style={{ ...TH, width:200, minWidth:160 }}>Descripción</th>
              <th style={{ ...TH, width:60, minWidth:56 }}>Doc.</th>
              <th style={{ ...TH, width:72, minWidth:60 }}>V. Modelo</th>
              <th style={{ ...TH, width:72, minWidth:60 }}>V. Objeto</th>
              <th style={{ ...TH, width:56, minWidth:50 }}>Dic.</th>
              {/* Stage columns — rotated headers */}
              {stages.map(s => (
                <th key={s.id} style={{ ...TH, width:52, minWidth:48, padding:'4px 2px' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <span style={{ writingMode:'vertical-rl', textOrientation:'mixed',
                      transform:'rotate(180deg)', display:'block', maxHeight:88,
                      overflow:'hidden', whiteSpace:'nowrap', fontSize:8.5, lineHeight:1.2 }}>
                      {s.label}
                    </span>
                    {delMode && (
                      <button onClick={()=>delStageCol(s.id)}
                        style={{ border:'none', background:'#fee2e2', color:'#dc2626', borderRadius:3, cursor:'pointer', padding:'1px 3px', fontSize:9, marginTop:2 }}>
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {/* Add stage column — solo líderes/referentes/PM */}
              <th style={{ ...TH, width:36, minWidth:32 }}>
                {canAccess(user?.role, 'write_bitacora') && (
                  <button onClick={()=>setAddSt(true)}
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, lineHeight:1, padding:'0 4px' }}
                    title="Agregar columna">＋</button>
                )}
              </th>
              <th style={{ ...TH, width:28 }}/>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={stages.length + 9} style={{ padding:'40px 0', textAlign:'center' }}>
                  <Package size={22} color="#cbd5e1" style={{ margin:'0 auto 8px', display:'block' }}/>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>No hay objetos. Haz clic en <strong>Agregar objeto</strong> para empezar.</span>
                </td>
              </tr>
            ) : visible.map((row, idx) => {
              const proj = PROJECTS.find(p => p.id === row.projectId);
              return (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafe' }}>
                  {/* # */}
                  <td style={{ ...TD, width:28, textAlign:'center', fontSize:10, color:'#94a3b8',
                    position:'sticky', left:0, background: idx%2===0?'#fff':'#fafafe', zIndex:1 }}>
                    <span style={{ display:'block', fontWeight:500, color: proj?.color ?? '#94a3b8', fontSize:9 }}>
                      {row.projectId || idx+1}
                    </span>
                  </td>
                  {/* Objeto (sticky) */}
                  <td style={{ ...TD, width:160, position:'sticky', left:28, background: idx%2===0?'#fff':'#fafafe', zIndex:1 }}>
                    <InlineEdit value={row.objeto} placeholder="t_kfca_…" mono
                      onSave={v => updateCell(row.id, 'objeto', v)}/>
                  </td>
                  {/* Descripción */}
                  <td style={{ ...TD, maxWidth:200 }}>
                    <InlineEdit value={row.descripcion} placeholder="Descripción…"
                      onSave={v => updateCell(row.id, 'descripcion', v)}/>
                  </td>
                  {/* Doc link */}
                  <td style={{ ...TD, width:60 }}>
                    <LinkCell value={row.documentacion} onSave={v => updateCell(row.id, 'documentacion', v)}/>
                  </td>
                  {/* V. Modelo */}
                  <td style={{ ...TD, width:72 }}>
                    <InlineEdit value={row.versionModelo} placeholder="3.0.0"
                      onSave={v => updateCell(row.id, 'versionModelo', v)}/>
                  </td>
                  {/* V. Objeto */}
                  <td style={{ ...TD, width:72 }}>
                    <InlineEdit value={row.versionObjeto} placeholder="1.0.0"
                      onSave={v => updateCell(row.id, 'versionObjeto', v)}/>
                  </td>
                  {/* Diccionario link */}
                  <td style={{ ...TD, width:56 }}>
                    <LinkCell value={row.diccionario} onSave={v => updateCell(row.id, 'diccionario', v)}/>
                  </td>
                  {/* Stage cells */}
                  {stages.map(s => {
                    const val    = row.stages[s.id] ?? '';
                    const isPct  = s.type === 'percent';
                    const pctNum = isPct && val !== '' ? Number(val) : 0;

                    // Percent cell
                    if (isPct) {
                      const pctBg = val === '' ? '#fff'
                        : pctNum >= 100 ? '#dcfce7'
                        : pctNum >= 75  ? '#d1fae5'
                        : pctNum >= 50  ? '#fef9c3'
                        : pctNum >= 25  ? '#fff7ed'
                        : '#fff';
                      const pctTx = val === '' ? '#cbd5e1'
                        : pctNum >= 100 ? '#15803d'
                        : pctNum >= 75  ? '#059669'
                        : pctNum >= 50  ? '#a16207'
                        : '#d97706';
                      const canEditStage = canAccess(user?.role, 'write_bitacora');
                      return (
                        <td key={s.id} style={{ ...TD, width:52, padding:0, cursor: canEditStage ? 'pointer' : 'default', background: pctBg, position:'relative' }}
                          onClick={() => canEditStage && cycleStage(row.id, s.id)}
                          title={canEditStage ? `${s.label}: clic para cambiar · clic derecho para valor exacto` : s.label}
                          onContextMenu={e => {
                            if (!canEditStage) return;
                            e.preventDefault();
                            const v = prompt(`% para "${s.label}" (0-100):`, val || '0');
                            if (v !== null) { const n = Math.min(100,Math.max(0,Number(v)||0)); setStageVal(row.id, s.id, String(n)); }
                          }}>
                          {val !== '' && (
                            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'#e2e8f0' }}>
                              <div style={{ width:`${pctNum}%`, height:'100%', background: pctNum>=100?'#059669':pctNum>=50?'#d97706':'#f59e0b', transition:'width .2s' }}/>
                            </div>
                          )}
                          <span style={{ fontSize:10, fontWeight:600, color: pctTx, display:'block', textAlign:'center', lineHeight:'28px' }}>
                            {val === '' ? '' : `${val}%`}
                          </span>
                        </td>
                      );
                    }

                    // Check cell
                    const isCustom = val !== '' && val !== 'Sí' && val !== 'N/A';
                    const canEditCheck = canAccess(user?.role, 'write_bitacora');
                    return (
                      <td key={s.id} style={{ ...TD, width:52, textAlign:'center', padding:0,
                        background: isCustom ? '#fef9c3' : (CELL_BG[val] ?? '#fff'),
                        cursor: canEditCheck ? 'pointer' : 'default' }}
                        onClick={() => canEditCheck && cycleStage(row.id, s.id)}
                        title={canEditCheck ? `${s.label}: clic para cambiar · clic derecho para valor personalizado` : s.label}
                        onContextMenu={e => {
                          if (!canEditCheck) return;
                          e.preventDefault();
                          const v = prompt(`Valor para "${s.label}" (Sí / N/A / texto):`, val);
                          if (v !== null) setStageVal(row.id, s.id, v.trim());
                        }}>
                        <span style={{ fontSize: isCustom?9:12, fontWeight: 600, color: isCustom?'#92400e':(CELL_COLOR[val]??'#111') }}>
                          {val === 'Sí' ? '✓' : val === 'N/A' ? <span style={{fontSize:8}}>N/A</span> : val || ''}
                        </span>
                      </td>
                    );
                  })}
                  {/* Empty add-col placeholder */}
                  <td style={{ ...TD, width:36 }}/>
                  {/* Delete row — solo líderes/referentes/PM */}
                  <td style={{ ...TD, width:28 }}>
                    {canAccess(user?.role, 'write_bitacora') && (
                      <button onClick={()=>delRow(row.id)}
                        style={{ border:'none', background:'none', cursor:'pointer', color:'#cbd5e1', padding:2,
                          display:'flex', lineHeight:1 }}>
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
        Columna <strong>Check</strong>: clic para ciclar ✓ → N/A → vacío · clic derecho para valor personalizado &nbsp;|&nbsp;
        Columna <strong>%</strong>: clic para avanzar 0 → 25 → 50 → 75 → 100% · clic derecho para valor exacto · Clic en celda de texto para editar
      </p>

      {/* Add stage column modal */}
      {addStage && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:'24px', width:380, boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <p style={{ margin:'0 0 12px', fontWeight:700, fontSize:14, color:'#111' }}>Nueva columna de etapa</p>
            <label style={lbl()}>Nombre de la etapa</label>
            <input value={newStLbl} onChange={e=>setNewStL(e.target.value)} placeholder="Ej: Aprobación QA"
              onKeyDown={e=>e.key==='Enter'&&addStageCol()}
              style={{ ...inp(), marginBottom:12 }} autoFocus/>
            <label style={lbl()}>Tipo de celda</label>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {(['check','percent'] as const).map(t => (
                <button key={t} onClick={()=>setNewStT(t)}
                  style={{ flex:1, padding:'8px 0', fontSize:12, fontWeight:newStType===t?700:400, borderRadius:8,
                    border:`1.5px solid ${newStType===t?'#dc2626':'#e2e8f0'}`,
                    background: newStType===t?'#fef2f2':'#fff',
                    color: newStType===t?'#dc2626':'#64748b', cursor:'pointer' }}>
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

// ─── Style helpers ────────────────────────────────────────────────────────────

function inp(): React.CSSProperties { return { width:'100%', padding:'7px 10px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:7, background:'#fff', boxSizing:'border-box', outline:'none' }; }
function lbl(): React.CSSProperties { return { fontSize:11, color:'#64748b', display:'block', marginBottom:4 }; }
function btnPrimary(): React.CSSProperties { return { padding:'8px 16px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontWeight:500 }; }
function btnSec(): React.CSSProperties { return { padding:'8px 14px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:7, background:'#fff', cursor:'pointer', color:'#374151' }; }
function emptyBox(): React.CSSProperties { return { background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'48px 0', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }; }

// ─── Main export — solo Cambios funcionales ───────────────────────────────────

export default function Bitacora() {
  const { user } = useAuth();

  return (
    <div style={{ padding:'28px 36px', maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:16 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'#fef2f2', border:'0.5px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BookOpen size={16} color="#dc2626"/>
            </div>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#111', letterSpacing:'-.3px' }}>Alcances del Proyecto</h2>
              <p style={{ margin:0, fontSize:12, color:'#94a3b8', marginTop:1 }}>
                Registro de cambios funcionales — redefiniciones de campos, reglas, modelos y ETL
              </p>
            </div>
          </div>
        </div>
      </div>

      <TabCambios user={user}/>
    </div>
  );
}
