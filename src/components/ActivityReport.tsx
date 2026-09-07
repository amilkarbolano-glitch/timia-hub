// ─── Activity Report (TR) — features SDA, carga por OCR de capturas y cumplimiento ─
import React, { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Upload, Camera, CheckCircle, AlertTriangle, Loader2, ClipboardList, BarChart3, Image as ImageIcon, X } from 'lucide-react';
import { adminStore, SDA_PHASES, TR_HOURS_PER_DAY, type TrFeature, type TrEntry, type SdaPhase, type AdminUser } from '../lib/adminStore';
import { PROJECTS, canAccess } from '../contexts/AuthContext';
import { parseTrText, fmtHours, type TrParsed } from '../lib/trParser';
import { isBusyDay } from '../lib/businessDays';

type Tab = 'features' | 'cargar' | 'cumplimiento';
const inp = (): React.CSSProperties => ({ width:'100%', padding:'7px 9px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:7, boxSizing:'border-box', background:'#fff' });
const lbl = (): React.CSSProperties => ({ fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', fontWeight:700, display:'block', marginBottom:3 });
const PHASE_SHORT: Record<SdaPhase, string> = {
  'Ideación':'Idea', 'Viabilidad y modelo de solución':'Viab.', 'Análisis y diseño':'Anál.', 'Desarrollo / Gestión datos':'Desa.',
  'Pruebas':'Prueb.', 'Despliegue':'Despl.', 'Operación':'Oper.', 'Gestión de proyecto':'Gest.', 'Ceremonias Agile':'Cerem.',
};
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

// Preprocesado de imagen para OCR: escala a ≥1800px de ancho, escala de grises y contraste
async function preprocess(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const scale = Math.max(1, Math.min(4, 1800 / img.width));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height); const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const v = Math.max(0, Math.min(255, (g - 128) * 1.35 + 128));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(d, 0, 0);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/png');
}

async function ocr(dataUrl: string, onProgress: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa', 1, { logger: m => { if (m.status === 'recognizing text') onProgress(m.progress); } });
  try { const { data } = await worker.recognize(dataUrl); return data.text; }
  finally { await worker.terminate(); }
}

export default function ActivityReport({ user }: { user: any }) {
  const [tab, setTab] = useState<Tab>('cumplimiento');
  const [features, setFeatures] = useState<TrFeature[]>(() => adminStore.getTrFeatures());
  const [entries, setEntries]   = useState<TrEntry[]>(() => adminStore.getTrEntries());
  const allUsers = useMemo(() => adminStore.getUsers().filter(u => u.active), []);
  const holidays = useMemo(() => new Set(adminStore.getHolidays().map(h => h.date)), []);
  const isPm = canAccess(user?.role ?? 'developer', 'projects.view_all');
  const canLoadAny = canAccess(user?.role ?? 'developer', 'tr.load_any');
  const canFeatures = canAccess(user?.role ?? 'developer', 'tr.manage_features');
  const accessibleIds: string[] = isPm ? PROJECTS.map((p: any) => p.id) : (user?.projectIds ?? []);
  const [filterProj, setFilterProj] = useState<string>('');
  const visFeatures = features.filter(f => accessibleIds.includes(f.projectId) && (!filterProj || f.projectId === filterProj));

  function saveFeatures(n: TrFeature[]) { setFeatures(n); adminStore.saveTrFeatures(n); }
  function saveEntries(n: TrEntry[]) { setEntries(n); adminStore.saveTrEntries(n); }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id:'cumplimiento', label:'Cumplimiento', icon:<BarChart3 size={13}/> },
    { id:'cargar',       label:'Cargar TR (capturas)', icon:<Camera size={13}/> },
    { id:'features',     label:'Features y horas', icon:<ClipboardList size={13}/> },
  ];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', fontSize:11, fontWeight:600, borderRadius:20, cursor:'pointer',
            background: tab === t.id ? '#1d4ed8' : '#fff', color: tab === t.id ? '#fff' : '#374151', border:`0.5px solid ${tab === t.id ? '#1d4ed8' : '#e2e8f0'}` }}>
            {t.icon} {t.label}
          </button>
        ))}
        <select value={filterProj} onChange={e => setFilterProj(e.target.value)} style={{ marginLeft:'auto', padding:'6px 9px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:7, background:'#fff' }}>
          <option value="">Todos los proyectos</option>
          {PROJECTS.filter((p: any) => accessibleIds.includes(p.id)).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {tab === 'features' && (canFeatures ? <FeaturesTab features={visFeatures} all={features} onSave={saveFeatures} entries={entries} accessibleIds={accessibleIds} allUsers={allUsers} filterProj={filterProj}/> : <div style={{ fontSize:11, color:'#94a3b8', padding:20, textAlign:'center' }}>No tienes permiso para definir features (tr.manage_features).</div>)}
      {tab === 'cargar' && <CargarTab features={features} entries={entries} onSave={saveEntries} user={user} allUsers={allUsers} isPm={canLoadAny} accessibleIds={accessibleIds}/>}
      {tab === 'cumplimiento' && <CumplimientoTab features={visFeatures} entries={entries} allUsers={allUsers} holidays={holidays} accessibleIds={accessibleIds} filterProj={filterProj} user={user} isPm={canLoadAny}/>}
    </div>
  );
}

// ─── Tab: Features y horas planificadas por fase ─────────────────────────────
function FeaturesTab({ features, all, onSave, entries, accessibleIds, allUsers, filterProj }: {
  features: TrFeature[]; all: TrFeature[]; onSave: (f: TrFeature[]) => void; entries: TrEntry[];
  accessibleIds: string[]; allUsers: AdminUser[]; filterProj: string;
}) {
  const empty = { id:'', projectId: filterProj || accessibleIds[0] || '', title:'', q:`Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`, hoursByPhase: {} as Partial<Record<SdaPhase, number>>, defaultPhase:'Desarrollo / Gestión datos' as SdaPhase, assigneeIds: [] as string[] };
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);
  const total = (f: { hoursByPhase: Partial<Record<SdaPhase, number>> }) => SDA_PHASES.reduce((s, p) => s + (f.hoursByPhase[p] ?? 0), 0);
  const imputed = (id: string) => entries.filter(e => e.featureId === id).reduce((s, e) => s + e.hours, 0);

  function add() {
    const id = form.id.trim().toUpperCase();
    if (!id || !form.projectId || !form.title.trim()) return;
    if (all.some(f => f.id === id)) { alert('Esa feature ya existe.'); return; }
    onSave([...all, { ...form, id, title: form.title.trim(), active: true, createdAt: new Date().toISOString() }]);
    setForm(empty); setShow(false);
  }
  function updHours(id: string, phase: SdaPhase, v: string) {
    onSave(all.map(f => f.id === id ? { ...f, hoursByPhase: { ...f.hoursByPhase, [phase]: v === '' ? undefined : Math.max(0, Number(v) || 0) } } : f));
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <p style={{ margin:0, fontSize:11, color:'#64748b' }}>Define al inicio las features Jira del proyecto y las horas por fase SDA. Contra esto se mide lo que cada persona imputa en el TR.</p>
        <button onClick={() => setShow(v => !v)} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, padding:'7px 12px', fontSize:11, fontWeight:600, background:'#1d4ed8', color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}><Plus size={12}/> Nueva feature</button>
      </div>
      {show && (
        <div style={{ background:'#fff', border:'0.5px solid #bfdbfe', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'150px 1fr 110px 150px', gap:10, marginBottom:10 }}>
            <div><label style={lbl()}>ID Jira *</label><input value={form.id} onChange={e => setForm(f => ({ ...f, id:e.target.value }))} placeholder="DECRONOS-2169" style={inp()}/></div>
            <div><label style={lbl()}>Título (como aparece en el TR) *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} placeholder="CRONOS-Q3 2026 DATCAL01 Disponibilizar tablas intermedias FICO" style={inp()}/></div>
            <div><label style={lbl()}>Q</label><input value={form.q} onChange={e => setForm(f => ({ ...f, q:e.target.value }))} style={inp()}/></div>
            <div><label style={lbl()}>Proyecto *</label>
              <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId:e.target.value }))} style={inp()}>
                {PROJECTS.filter((p: any) => accessibleIds.includes(p.id)).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
          </div>
          <label style={lbl()}>Horas planificadas por fase</label>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${SDA_PHASES.length}, 1fr)`, gap:6, marginBottom:10 }}>
            {SDA_PHASES.map(p => (
              <div key={p}>
                <div style={{ fontSize:8, color:'#64748b', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={p}>{p}</div>
                <input type="number" min={0} value={form.hoursByPhase[p] ?? ''} onChange={e => setForm(f => ({ ...f, hoursByPhase: { ...f.hoursByPhase, [p]: e.target.value === '' ? undefined : Number(e.target.value) } }))} placeholder="0" style={{ ...inp(), padding:'5px 6px', textAlign:'center' }}/>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:11, color:'#374151' }}>Total: <strong>{total(form)} h</strong></div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:10, color:'#64748b' }}>Fase por defecto al cargar TR:</span>
              <select value={form.defaultPhase} onChange={e => setForm(f => ({ ...f, defaultPhase: e.target.value as SdaPhase }))} style={{ ...inp(), width:'auto', padding:'4px 8px' }}>{SDA_PHASES.map(p => <option key={p}>{p}</option>)}</select>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
              <span style={{ fontSize:10, color:'#64748b' }}>Equipo:</span>
              {allUsers.filter(u => u.role !== 'pm' && (u.projectIds.includes(form.projectId))).map(u => {
                const on = form.assigneeIds.includes(u.id);
                return <button key={u.id} onClick={() => setForm(f => ({ ...f, assigneeIds: on ? f.assigneeIds.filter(x => x !== u.id) : [...f.assigneeIds, u.id] }))}
                  style={{ fontSize:9, padding:'2px 8px', borderRadius:10, cursor:'pointer', border:`0.5px solid ${on ? u.avatarColor : '#e2e8f0'}`, background: on ? u.avatarColor : '#fff', color: on ? '#fff' : '#374151' }}>{u.name.split(' ')[0]}</button>;
              })}
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
              <button onClick={() => setShow(false)} style={{ padding:'7px 12px', fontSize:11, background:'#f1f5f9', border:'none', borderRadius:7, cursor:'pointer' }}>Cancelar</button>
              <button onClick={add} style={{ padding:'7px 14px', fontSize:11, fontWeight:600, background:'#1d4ed8', color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}>Guardar feature</button>
            </div>
          </div>
        </div>
      )}
      {features.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12, background:'#fff', border:'0.5px dashed #e2e8f0', borderRadius:12 }}>Sin features. Crea la primera con "Nueva feature".</div>
      ) : (
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, overflow:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%', minWidth: 900 }}>
            <thead><tr style={{ background:'#fafafa' }}>
              {['Feature', 'Proyecto · Q', ...SDA_PHASES.map(p => PHASE_SHORT[p]), 'Plan', 'Imputado', ''].map((h, i) => (
                <th key={i} title={SDA_PHASES[i - 2]} style={{ padding:'8px 8px', fontSize:9, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', textAlign: i < 2 ? 'left' : 'center', borderBottom:'0.5px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {features.map(f => {
                const plan = total(f), imp = imputed(f.id); const pct = plan ? Math.round(imp / plan * 100) : 0;
                const proj = PROJECTS.find((p: any) => p.id === f.projectId);
                return (
                  <tr key={f.id} style={{ borderBottom:'0.5px solid #f1f5f9' }}>
                    <td style={{ padding:'7px 8px', minWidth:260 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#1d4ed8' }}>{f.id}</div>
                      <div style={{ fontSize:10, color:'#374151' }}>{f.title}</div>
                    </td>
                    <td style={{ padding:'7px 8px', fontSize:10, color: proj?.color ?? '#64748b', fontWeight:600, whiteSpace:'nowrap' }}>{f.projectId} · <span style={{ color:'#94a3b8', fontWeight:500 }}>{f.q}</span></td>
                    {SDA_PHASES.map(p => {
                      const ph = f.hoursByPhase[p]; const ih = entries.filter(e => e.featureId === f.id && e.phase === p).reduce((s, e) => s + e.hours, 0);
                      return (
                        <td key={p} style={{ padding:'4px 3px', textAlign:'center' }}>
                          <input type="number" min={0} value={ph ?? ''} onChange={e => updHours(f.id, p, e.target.value)} placeholder="–"
                            style={{ width:44, padding:'3px 4px', fontSize:10, textAlign:'center', border:'0.5px solid #e2e8f0', borderRadius:5, background: ph ? '#fff' : '#fafafa' }}/>
                          {ih > 0 && <div style={{ fontSize:8, color: ph !== undefined && ih > ph ? '#dc2626' : '#15803d', marginTop:1 }}>{ih} h</div>}
                        </td>
                      );
                    })}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontSize:11, fontWeight:700 }}>{plan} h</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', whiteSpace:'nowrap' }}>
                      <span style={{ fontSize:11, fontWeight:700, color: pct > 100 ? '#dc2626' : '#15803d' }}>{imp} h</span>
                      <span style={{ fontSize:9, color:'#94a3b8' }}> ({pct}%)</span>
                    </td>
                    <td style={{ padding:'7px 8px' }}><button onClick={() => { if (confirm(`¿Eliminar ${f.id}?`)) onSave(all.filter(x => x.id !== f.id)); }} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><Trash2 size={12}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cargar TR desde capturas ────────────────────────────────────────────
interface Draft { key: string; fileName: string; preview: string; status: 'pending' | 'ocr' | 'done' | 'error'; progress: number; parsed?: TrParsed; rows: DraftRow[]; date: string; replace: boolean; rawText?: string }
interface DraftRow { featureId: string; title: string; phase: SdaPhase; hours: number; actividad?: string }

function CargarTab({ features, entries, onSave, user, allUsers, isPm, accessibleIds }: {
  features: TrFeature[]; entries: TrEntry[]; onSave: (e: TrEntry[]) => void; user: any; allUsers: AdminUser[]; isPm: boolean; accessibleIds: string[];
}) {
  const [userId, setUserId] = useState<string>(user?.id ?? allUsers[0]?.id ?? '');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saved, setSaved]   = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const person = allUsers.find(u => u.id === userId) ?? { id: userId, name: user?.name ?? 'Usuario' };
  const upd = (key: string, patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) =>
    setDrafts(ds => ds.map(d => d.key === key ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d));

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    for (const f of list) {
      const key = uid('d'); const preview = URL.createObjectURL(f);
      setDrafts(ds => [...ds, { key, fileName: f.name || 'captura.png', preview, status:'pending', progress:0, rows:[], date:'', replace:true }]);
      try {
        upd(key, { status:'ocr' });
        const img = await preprocess(f);
        const text = await ocr(img, p => upd(key, { progress: p }));
        const parsed = parseTrText(text);
        const rows: DraftRow[] = parsed.entries.map(e => {
          const feat = features.find(x => x.id === e.featureId);
          return { featureId: e.featureId, title: e.title || feat?.title || '', phase: feat?.defaultPhase ?? 'Desarrollo / Gestión datos', hours: e.hours ?? 0, actividad: e.actividad };
        });
        upd(key, { status:'done', parsed, rows, date: parsed.date ?? '', rawText: text, progress: 1 });
      } catch (err) {
        upd(key, { status:'error', rawText: String(err) });
      }
    }
  }
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => { const fs = Array.from(e.clipboardData?.files ?? []); if (fs.length) addFiles(fs); };
    window.addEventListener('paste', onPaste); return () => window.removeEventListener('paste', onPaste);
  });

  function saveDraft(d: Draft) {
    if (!d.date || !d.rows.length) return;
    const valid = d.rows.filter(r => r.featureId && r.hours > 0);
    const base = d.replace ? entries.filter(e => !(e.userId === userId && e.date === d.date)) : entries;
    const news: TrEntry[] = valid.map(r => ({ id: uid('tr'), userId, userName: person.name, date: d.date, featureId: r.featureId.toUpperCase(), phase: r.phase, hours: r.hours, actividad: r.actividad, source:'ocr', createdAt: new Date().toISOString() }));
    onSave([...base, ...news]);
    setDrafts(ds => ds.filter(x => x.key !== d.key));
    setSaved(`${d.date}: ${news.length} registro${news.length !== 1 ? 's' : ''} (${valid.reduce((s, r) => s + r.hours, 0)} h) guardados para ${person.name}`);
    setTimeout(() => setSaved(''), 4000);
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, flexWrap:'wrap' }}>
        <div>
          <label style={lbl()}>Persona</label>
          <select value={userId} onChange={e => setUserId(e.target.value)} disabled={!isPm} style={{ ...inp(), width:220 }}>
            {(isPm ? allUsers : allUsers.filter(u => u.id === user?.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          style={{ flex:1, minWidth:320, display:'flex', alignItems:'center', gap:10, padding:'12px 16px', border:'1.5px dashed #93c5fd', borderRadius:12, background:'#eff6ff', cursor:'pointer' }}>
          <Upload size={18} color="#1d4ed8"/>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1e3a8a' }}>Arrastra las capturas del TR aquí, haz clic para elegirlas, o pega con Ctrl+V</div>
            <div style={{ fontSize:10, color:'#3b82f6' }}>Una captura por día (vista "Información diaria"). Se lee la fecha, cada feature DECRONOS-xxxx y sus horas. Revisas y guardas.</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}/>
        </div>
      </div>
      {saved && <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:8, fontSize:11, color:'#15803d', marginBottom:10 }}><CheckCircle size={13}/> {saved}</div>}

      {drafts.map(d => {
        const sum = d.rows.reduce((s, r) => s + (r.hours || 0), 0);
        const existing = entries.filter(e => e.userId === userId && e.date === d.date);
        return (
          <div key={d.key} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'12px 14px', marginBottom:10, display:'grid', gridTemplateColumns:'220px 1fr', gap:14 }}>
            <div>
              <img src={d.preview} alt="" style={{ width:'100%', borderRadius:8, border:'0.5px solid #e2e8f0' }}/>
              <div style={{ fontSize:9, color:'#94a3b8', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><ImageIcon size={9} style={{ verticalAlign:'middle' }}/> {d.fileName}</div>
              {d.status === 'ocr' && <div style={{ marginTop:6 }}><div style={{ height:4, background:'#e2e8f0', borderRadius:2 }}><div style={{ width:`${Math.round(d.progress * 100)}%`, height:'100%', background:'#1d4ed8', borderRadius:2 }}/></div><div style={{ fontSize:9, color:'#1d4ed8', marginTop:3, display:'flex', alignItems:'center', gap:4 }}><Loader2 size={10} className="animate-spin"/> Leyendo captura… {Math.round(d.progress * 100)}%</div></div>}
              {d.rawText && d.status === 'done' && <details style={{ marginTop:6 }}><summary style={{ fontSize:9, color:'#94a3b8', cursor:'pointer' }}>Texto leído</summary><pre style={{ fontSize:8, color:'#64748b', whiteSpace:'pre-wrap', maxHeight:140, overflow:'auto', margin:'4px 0 0' }}>{d.rawText}</pre></details>}
            </div>
            <div>
              {d.status === 'error' && <div style={{ fontSize:11, color:'#dc2626' }}>No se pudo leer la imagen. {d.rawText}</div>}
              {d.status === 'done' && (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                    <div><label style={lbl()}>Fecha</label><input type="date" value={d.date} onChange={e => upd(d.key, { date: e.target.value })} style={{ ...inp(), width:150 }}/></div>
                    {d.parsed?.dateLabel && <span style={{ fontSize:10, color:'#94a3b8', marginTop:14 }}>leído: "{d.parsed.dateLabel}"</span>}
                    <div style={{ marginLeft:'auto', textAlign:'right', marginTop:6 }}>
                      <div style={{ fontSize:9, color:'#94a3b8' }}>Total del día</div>
                      <div style={{ fontSize:16, fontWeight:700, color: Math.abs(sum - TR_HOURS_PER_DAY) < 0.01 ? '#15803d' : '#d97706' }}>{fmtHours(sum)}{d.parsed?.total !== undefined && Math.abs(d.parsed.total - sum) > 0.01 ? <span style={{ fontSize:9, color:'#dc2626' }}> (captura: {fmtHours(d.parsed.total)})</span> : null}</div>
                    </div>
                  </div>
                  {(d.parsed?.warnings ?? []).map((w, i) => <div key={i} style={{ fontSize:10, color:'#a16207', background:'#fef9c3', border:'0.5px solid #fde68a', borderRadius:6, padding:'4px 8px', marginBottom:6, display:'flex', gap:5, alignItems:'center' }}><AlertTriangle size={11}/> {w}</div>)}
                  {Math.abs(sum - TR_HOURS_PER_DAY) > 0.01 && d.rows.length > 0 && <div style={{ fontSize:10, color:'#a16207', marginBottom:6 }}>⚠ El día no suma {TR_HOURS_PER_DAY} h.</div>}
                  <table style={{ borderCollapse:'collapse', width:'100%' }}>
                    <thead><tr>{['Feature', 'Fase SDA', 'Horas', ''].map(h => <th key={h} style={{ fontSize:9, color:'#94a3b8', textAlign:'left', padding:'4px 6px', borderBottom:'0.5px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {d.rows.map((r, i) => {
                        const feat = features.find(f => f.id === r.featureId.toUpperCase());
                        return (
                          <tr key={i} style={{ borderBottom:'0.5px solid #f1f5f9' }}>
                            <td style={{ padding:'5px 6px', minWidth:260 }}>
                              <input list={`feat-${d.key}`} value={r.featureId} onChange={e => upd(d.key, dd => ({ rows: dd.rows.map((x, j) => j === i ? { ...x, featureId: e.target.value, phase: features.find(f => f.id === e.target.value.toUpperCase())?.defaultPhase ?? x.phase } : x) }))}
                                style={{ ...inp(), width:150, display:'inline-block', fontWeight:700, color: feat ? '#1d4ed8' : '#dc2626' }}/>
                              <datalist id={`feat-${d.key}`}>{features.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}</datalist>
                              <div style={{ fontSize:9, color: feat ? '#64748b' : '#dc2626', marginTop:2 }}>{feat ? feat.title : `No existe en Features${r.title ? ` · leído: "${r.title}"` : ''} — créala en "Features y horas" o corrige el ID`}</div>
                              {r.actividad && <div style={{ fontSize:8, color:'#94a3b8' }}>{r.actividad}</div>}
                            </td>
                            <td style={{ padding:'5px 6px' }}>
                              <select value={r.phase} onChange={e => upd(d.key, dd => ({ rows: dd.rows.map((x, j) => j === i ? { ...x, phase: e.target.value as SdaPhase } : x) }))} style={{ ...inp(), width:200 }}>{SDA_PHASES.map(p => <option key={p}>{p}</option>)}</select>
                            </td>
                            <td style={{ padding:'5px 6px' }}>
                              <input type="number" min={0} step={0.25} value={r.hours} onChange={e => upd(d.key, dd => ({ rows: dd.rows.map((x, j) => j === i ? { ...x, hours: Number(e.target.value) } : x) }))} style={{ ...inp(), width:70, textAlign:'center' }}/>
                            </td>
                            <td style={{ padding:'5px 6px' }}><button onClick={() => upd(d.key, dd => ({ rows: dd.rows.filter((_, j) => j !== i) }))} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={12}/></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    <button onClick={() => upd(d.key, dd => ({ rows: [...dd.rows, { featureId:'', title:'', phase:'Desarrollo / Gestión datos', hours:0 }] }))} style={{ fontSize:10, padding:'4px 9px', background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:6, cursor:'pointer' }}>+ Fila</button>
                    {existing.length > 0 && (
                      <label style={{ fontSize:10, color:'#a16207', display:'flex', alignItems:'center', gap:4 }}>
                        <input type="checkbox" checked={d.replace} onChange={e => upd(d.key, { replace: e.target.checked })}/> Ya hay {existing.length} registro(s) de {person.name.split(' ')[0]} ese día — reemplazarlos
                      </label>
                    )}
                    <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                      <button onClick={() => setDrafts(ds => ds.filter(x => x.key !== d.key))} style={{ padding:'6px 12px', fontSize:11, background:'#f1f5f9', border:'none', borderRadius:7, cursor:'pointer' }}>Descartar</button>
                      <button onClick={() => saveDraft(d)} disabled={!d.date || !d.rows.some(r => r.featureId && r.hours > 0)} style={{ padding:'6px 14px', fontSize:11, fontWeight:600, background: d.date && d.rows.some(r => r.featureId && r.hours > 0) ? '#15803d' : '#cbd5e1', color:'#fff', border:'none', borderRadius:7, cursor:'pointer' }}>Guardar día</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
      {drafts.length === 0 && (
        <div style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>
          Tip: la captura debe verse nítida (pantalla completa del TR, no miniatura). El OCR corre en tu navegador; nada sale del equipo.
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cumplimiento ────────────────────────────────────────────────────────
function CumplimientoTab({ features, entries, allUsers, holidays, accessibleIds, filterProj, user, isPm }: {
  features: TrFeature[]; entries: TrEntry[]; allUsers: AdminUser[]; holidays: Set<string>; accessibleIds: string[]; filterProj: string; user: any; isPm: boolean;
}) {
  const [month, setMonth] = useState<string>(todayISO().slice(0, 7));
  const featIds = new Set(features.map(f => f.id));
  const vis = entries.filter(e => featIds.has(e.featureId) || (!filterProj && !features.length));
  const monthEntries = vis.filter(e => e.date.startsWith(month));
  const people = (isPm ? allUsers : allUsers.filter(u => u.id === user?.id)).filter(u => u.role !== 'pm' && u.projectIds.some(p => accessibleIds.includes(p)) && (!filterProj || u.projectIds.includes(filterProj)));

  // Días hábiles del mes hasta hoy
  const [y, m] = month.split('-').map(Number);
  const days: string[] = [];
  const last = new Date(y, m, 0).getDate();
  const today = todayISO();
  for (let d = 1; d <= last; d++) { const iso = `${month}-${String(d).padStart(2, '0')}`; if (iso > today) break; if (!isBusyDay(new Date(iso + 'T12:00:00'), holidays)) days.push(iso); }

  const phaseTotals = (f: TrFeature) => SDA_PHASES.map(p => ({ p, plan: f.hoursByPhase[p] ?? 0, imp: entries.filter(e => e.featureId === f.id && e.phase === p).reduce((s, e) => s + e.hours, 0) }));

  return (
    <div>
      {/* Features: plan vs imputado */}
      <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:'#111' }}>Features · horas planificadas vs. imputadas (acumulado)</p>
      {features.length === 0 ? <div style={{ fontSize:11, color:'#94a3b8', marginBottom:16 }}>Sin features definidas para este filtro.</div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:8, marginBottom:20 }}>
          {features.map(f => {
            const pt = phaseTotals(f); const plan = pt.reduce((s, x) => s + x.plan, 0), imp = pt.reduce((s, x) => s + x.imp, 0);
            const pct = plan ? imp / plan * 100 : 0; const over = imp > plan && plan > 0;
            const proj = PROJECTS.find((p: any) => p.id === f.projectId);
            return (
              <div key={f.id} style={{ background:'#fff', border:`0.5px solid ${over ? '#fecaca' : '#e2e8f0'}`, borderRadius:12, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8' }}>{f.id}</span>
                  <span style={{ fontSize:9, color: proj?.color ?? '#64748b', fontWeight:600 }}>{f.projectId}</span>
                  <span style={{ marginLeft:'auto', fontSize:14, fontWeight:700, color: over ? '#dc2626' : '#111' }}>{imp}<span style={{ fontSize:10, color:'#94a3b8', fontWeight:500 }}> / {plan} h</span></span>
                </div>
                <div style={{ fontSize:10, color:'#64748b', margin:'2px 0 6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={f.title}>{f.title}</div>
                <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden', marginBottom:8 }}><div style={{ width:`${Math.min(100, pct)}%`, height:'100%', background: over ? '#dc2626' : pct >= 90 ? '#d97706' : '#1d4ed8' }}/></div>
                <div style={{ display:'flex', gap:3 }}>
                  {pt.filter(x => x.plan > 0 || x.imp > 0).map(x => (
                    <div key={x.p} title={`${x.p}: ${x.imp} / ${x.plan} h`} style={{ flex:1, minWidth:0 }}>
                      <div style={{ height:22, background:'#f1f5f9', borderRadius:3, position:'relative', overflow:'hidden' }}>
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${x.plan ? Math.min(100, x.imp / x.plan * 100) : (x.imp ? 100 : 0)}%`, background: x.plan && x.imp > x.plan ? '#dc2626' : '#60a5fa' }}/>
                      </div>
                      <div style={{ fontSize:7, color:'#94a3b8', textAlign:'center', marginTop:2, whiteSpace:'nowrap' }}>{PHASE_SHORT[x.p]} {x.imp}/{x.plan}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Personas: días con 8h */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#111' }}>Personas · {TR_HOURS_PER_DAY} h por día hábil</p>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...inp(), width:150, marginLeft:'auto' }}/>
      </div>
      <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, overflow:'auto' }}>
        <table style={{ borderCollapse:'collapse', minWidth:'100%' }}>
          <thead><tr style={{ background:'#fafafa' }}>
            <th style={{ padding:'6px 10px', fontSize:9, color:'#94a3b8', textAlign:'left', position:'sticky', left:0, background:'#fafafa' }}>Persona</th>
            {days.map(d => <th key={d} style={{ padding:'6px 3px', fontSize:8, color:'#94a3b8', fontWeight:600, minWidth:26, textAlign:'center' }}>{parseInt(d.slice(8))}</th>)}
            <th style={{ padding:'6px 10px', fontSize:9, color:'#94a3b8' }}>Total</th>
            <th style={{ padding:'6px 10px', fontSize:9, color:'#94a3b8' }}>Faltan</th>
          </tr></thead>
          <tbody>
            {people.map(u => {
              const per = days.map(d => monthEntries.filter(e => e.userId === u.id && e.date === d).reduce((s, e) => s + e.hours, 0));
              const tot = per.reduce((s, v) => s + v, 0); const missing = per.filter(v => v < TR_HOURS_PER_DAY - 0.01).length;
              return (
                <tr key={u.id} style={{ borderTop:'0.5px solid #f1f5f9' }}>
                  <td style={{ padding:'6px 10px', fontSize:11, fontWeight:600, color:'#111', whiteSpace:'nowrap', position:'sticky', left:0, background:'#fff' }}>
                    <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:u.avatarColor, marginRight:6 }}/>{u.name}
                  </td>
                  {per.map((v, i) => (
                    <td key={i} title={`${days[i]}: ${v} h`} style={{ padding:'4px 2px', textAlign:'center' }}>
                      <div style={{ width:22, height:22, margin:'0 auto', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700,
                        background: v >= TR_HOURS_PER_DAY - 0.01 ? '#dcfce7' : v > 0 ? '#fef9c3' : '#fee2e2', color: v >= TR_HOURS_PER_DAY - 0.01 ? '#15803d' : v > 0 ? '#a16207' : '#dc2626' }}>{v ? (Number.isInteger(v) ? v : v.toFixed(1)) : '·'}</div>
                    </td>
                  ))}
                  <td style={{ padding:'6px 10px', textAlign:'center', fontSize:11, fontWeight:700 }}>{tot} h</td>
                  <td style={{ padding:'6px 10px', textAlign:'center', fontSize:11, fontWeight:700, color: missing ? '#dc2626' : '#15803d' }}>{missing ? `${missing} día${missing !== 1 ? 's' : ''}` : '✓'}</td>
                </tr>
              );
            })}
            {people.length === 0 && <tr><td colSpan={days.length + 3} style={{ padding:16, fontSize:11, color:'#94a3b8', textAlign:'center' }}>Sin personas para este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:9, color:'#94a3b8', marginTop:6 }}>Verde = {TR_HOURS_PER_DAY} h · Ámbar = parcial · Rojo = sin imputar. Solo días hábiles hasta hoy (festivos de Colombia excluidos).</div>
    </div>
  );
}
