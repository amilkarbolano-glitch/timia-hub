import React, { useMemo, useState } from 'react';
import { Plus, Search, Star, Trash2, Bold, Italic, List, ListChecks, Heading2, Link2, Code, Eye, Pencil, RotateCcw, X, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminStore, type Nota, type Cuaderno, type AdminProject } from '../lib/adminStore';
import { markdownAHtml, resumenDeNota } from '../lib/markdownMini';

// Paleta de los cuadernos: los mismos tonos que usa el resto de la herramienta.
const COLORES = ['#1d9e75', '#534ab7', '#ba7517', '#d85a30', '#378add', '#d4537e', '#5f5e5a'];

function nuevoId(pre: string): string { return `${pre}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }
function ahora(): string { return new Date().toISOString(); }

function fmtFecha(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return mismoDia
    ? `hoy ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

const ETIQUETA_VIS: Record<Nota['visibilidad'], { label: string; bg: string; fg: string }> = {
  privada:  { label: 'privada',  bg: '#f1efe8', fg: '#444441' },
  equipo:   { label: 'equipo',   bg: '#e1f5ee', fg: '#0f6e56' },
  proyecto: { label: 'proyecto', bg: '#e6f1fb', fg: '#0c447c' },
};

export default function Notas() {
  const { user } = useAuth();
  const yo = user?.id ?? '';
  const proyectos: AdminProject[] = useMemo(() => adminStore.getProjects().filter(p => p.active), []);

  const [notas, setNotas]         = useState<Nota[]>(() => adminStore.getNotas());
  const [cuadernos, setCuadernos] = useState<Cuaderno[]>(() => adminStore.getCuadernos());
  const [cuaderno, setCuaderno]   = useState<string>('todas');   // id | 'todas' | 'favoritas' | 'papelera'
  const [selId, setSelId]         = useState<string>('');
  const [q, setQ]                 = useState('');
  const [editando, setEditando]   = useState(false);
  const [nuevoCuaderno, setNuevoCuaderno] = useState('');

  function guardarNotas(n: Nota[]) { setNotas(n); adminStore.saveNotas(n); }
  function guardarCuadernos(c: Cuaderno[]) { setCuadernos(c); adminStore.saveCuadernos(c); }

  // Lo que cada uno ve: lo suyo, más lo que otros compartieron con el equipo o
  // con un proyecto. Las privadas de otra persona no se listan.
  const mias = notas.filter(n => n.ownerId === yo);
  const visibles = notas.filter(n => n.ownerId === yo || n.visibilidad !== 'privada');
  const misCuadernos = cuadernos.filter(c => c.ownerId === yo);

  const enPapelera = visibles.filter(n => n.borradaEn);
  const vivas      = visibles.filter(n => !n.borradaEn);

  const lista = useMemo(() => {
    const base = cuaderno === 'papelera' ? enPapelera
      : cuaderno === 'favoritas' ? vivas.filter(n => n.favorita)
      : cuaderno === 'todas' ? vivas
      : vivas.filter(n => n.cuadernoId === cuaderno);
    const t = q.trim().toLowerCase();
    const filtrada = t ? base.filter(n => `${n.titulo} ${n.cuerpo} ${(n.etiquetas ?? []).join(' ')}`.toLowerCase().includes(t)) : base;
    return [...filtrada].sort((a, b) => (b.actualizadaEn > a.actualizadaEn ? 1 : -1));
  }, [cuaderno, q, notas, yo]);

  const sel = notas.find(n => n.id === selId) ?? lista[0];

  function crearNota() {
    const n: Nota = {
      id: nuevoId('n'), titulo: '', cuerpo: '',
      cuadernoId: ['todas', 'favoritas', 'papelera'].includes(cuaderno) ? undefined : cuaderno,
      visibilidad: 'privada', ownerId: yo, ownerNombre: user?.name ?? 'Usuario',
      creadaEn: ahora(), actualizadaEn: ahora(),
    };
    guardarNotas([n, ...notas]);
    setSelId(n.id);
    setEditando(true);
  }

  function actualizar(id: string, cambios: Partial<Nota>) {
    guardarNotas(notas.map(n => (n.id === id ? { ...n, ...cambios, actualizadaEn: ahora(), actualizadaPor: user?.name } : n)));
  }

  function crearCuaderno() {
    const nombre = nuevoCuaderno.trim();
    if (!nombre) return;
    const c: Cuaderno = { id: nuevoId('c'), nombre, color: COLORES[misCuadernos.length % COLORES.length], ownerId: yo, creadoEn: ahora() };
    guardarCuadernos([...cuadernos, c]);
    setNuevoCuaderno('');
    setCuaderno(c.id);
  }

  const puedeEditar = !!sel && sel.ownerId === yo && !sel.borradaEn;
  const cuentaDe = (id: string) => vivas.filter(n => n.cuadernoId === id).length;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: '#fff' }}>

      {/* ── Cuadernos ───────────────────────────────────────────────────── */}
      <div style={{ width: 232, flexShrink: 0, borderRight: '0.5px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '18px 16px 12px' }}>
          <h1 style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 500, color: '#111' }}>Notas</h1>
          <p style={{ margin: 0, fontSize: 10.5, color: '#64748b' }}>{mias.filter(n => !n.borradaEn).length} tuyas · las privadas solo las ves tú</p>
        </div>

        <button onClick={crearNota}
          style={{ margin: '0 12px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '9px', borderRadius: 8, border: 'none', background: '#0f6e56', color: '#fff', cursor: 'pointer' }}>
          <Plus size={14}/> Nueva nota
        </button>

        <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[{ k: 'todas', label: 'Todas', n: vivas.length }, { k: 'favoritas', label: 'Favoritas', n: vivas.filter(x => x.favorita).length }].map(x => (
            <button key={x.k} onClick={() => setCuaderno(x.k)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: cuaderno === x.k ? 600 : 400,
                       color: cuaderno === x.k ? '#0f6e56' : '#334155', background: cuaderno === x.k ? '#e1f5ee' : 'none',
                       border: 'none', borderRadius: 7, padding: '8px', cursor: 'pointer', textAlign: 'left' }}>
              {x.k === 'favoritas' ? <Star size={12}/> : <BookOpen size={12}/>}
              {x.label}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>{x.n}</span>
            </button>
          ))}

          <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: '.05em', padding: '12px 8px 5px' }}>CUADERNOS</div>
          {misCuadernos.map(c => (
            <button key={c.id} onClick={() => setCuaderno(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: cuaderno === c.id ? 600 : 400,
                       color: cuaderno === c.id ? '#0f6e56' : '#334155', background: cuaderno === c.id ? '#e1f5ee' : 'none',
                       border: 'none', borderRadius: 7, padding: '8px', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }}/>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>{cuentaDe(c.id)}</span>
            </button>
          ))}

          <div style={{ display: 'flex', gap: 5, padding: '6px 8px' }}>
            <input value={nuevoCuaderno} onChange={e => setNuevoCuaderno(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') crearCuaderno(); }}
              placeholder="Nuevo cuaderno" aria-label="Nombre del cuaderno nuevo"
              style={{ flex: 1, minWidth: 0, fontSize: 11, padding: '6px 8px', border: '0.5px solid #e2e8f0', borderRadius: 7, color: '#1e293b' }}/>
            <button onClick={crearCuaderno} aria-label="Crear cuaderno"
              style={{ border: '0.5px solid #e2e8f0', background: '#fff', borderRadius: 7, padding: '0 8px', cursor: 'pointer', color: '#0f6e56', display: 'flex', alignItems: 'center' }}>
              <Plus size={13}/>
            </button>
          </div>

          <div style={{ height: 1, background: '#e2e8f0', margin: '8px' }}/>
          <button onClick={() => setCuaderno('papelera')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: cuaderno === 'papelera' ? 600 : 400,
                     color: cuaderno === 'papelera' ? '#a32d2d' : '#334155', background: cuaderno === 'papelera' ? '#fceaea' : 'none',
                     border: 'none', borderRadius: 7, padding: '8px', cursor: 'pointer', textAlign: 'left' }}>
            <Trash2 size={12}/> Papelera
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>{enPapelera.length}</span>
          </button>
        </div>
      </div>

      {/* ── Lista de notas ──────────────────────────────────────────────── */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '0.5px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Search size={13} color="#94a3b8"/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en título y contenido" aria-label="Buscar en las notas"
            style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '7px 8px', border: '0.5px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }}/>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {lista.length === 0 && (
            <p style={{ margin: 0, padding: '24px 16px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              {q ? 'Nada con esa búsqueda.' : cuaderno === 'papelera' ? 'La papelera está vacía.' : 'Sin notas aquí. Crea la primera.'}
            </p>
          )}
          {lista.map(n => {
            const act = sel?.id === n.id;
            const c = cuadernos.find(x => x.id === n.cuadernoId);
            const vis = ETIQUETA_VIS[n.visibilidad];
            return (
              <button key={n.id} onClick={() => { setSelId(n.id); setEditando(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                         background: act ? '#f1f5f9' : '#fff', border: 'none',
                         borderLeft: `3px solid ${act ? (c?.color ?? '#1d9e75') : 'transparent'}`,
                         borderBottom: '0.5px solid #e2e8f0', padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.titulo || 'Sin título'}
                  </span>
                  {n.favorita && <Star size={10} color="#ba7517" style={{ flexShrink: 0 }}/>}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4, maxHeight: 31, overflow: 'hidden' }}>
                  {resumenDeNota(n.cuerpo) || '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, color: '#64748b' }}>{fmtFecha(n.actualizadaEn)}</span>
                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: vis.bg, color: vis.fg, fontWeight: 600 }}>
                    {n.visibilidad === 'proyecto' ? (n.projectId ?? 'proyecto') : vis.label}
                  </span>
                  {n.ownerId !== yo && <span style={{ fontSize: 9, color: '#94a3b8' }}>de {n.ownerNombre.split(' ')[0]}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Editor / lectura ────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!sel ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            Elige una nota o crea una nueva.
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 24px 10px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {puedeEditar ? (
                  <input value={sel.titulo} onChange={e => actualizar(sel.id, { titulo: e.target.value })}
                    placeholder="Título de la nota" aria-label="Título de la nota"
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: 19, fontWeight: 500, color: '#111827', border: 'none', outline: 'none', padding: 0, marginBottom: 6 }}/>
                ) : (
                  <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 500, color: '#111827' }}>{sel.titulo || 'Sin título'}</h2>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    {cuadernos.find(c => c.id === sel.cuadernoId)?.nombre ?? 'Sin cuaderno'} · guardada {fmtFecha(sel.actualizadaEn)}
                    {sel.ownerId !== yo && ` · de ${sel.ownerNombre}`}
                  </span>
                  {puedeEditar && (
                    <>
                      <select value={sel.cuadernoId ?? ''} onChange={e => actualizar(sel.id, { cuadernoId: e.target.value || undefined })}
                        aria-label="Cuaderno de la nota"
                        style={{ fontSize: 10, padding: '3px 7px', border: '0.5px solid #e2e8f0', borderRadius: 20, color: '#334155', background: '#fff' }}>
                        <option value="">Sin cuaderno</option>
                        {misCuadernos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      <select value={sel.visibilidad} aria-label="Visibilidad de la nota"
                        onChange={e => {
                          const v = e.target.value as Nota['visibilidad'];
                          actualizar(sel.id, { visibilidad: v, projectId: v === 'proyecto' ? (sel.projectId ?? proyectos[0]?.id) : undefined });
                        }}
                        style={{ fontSize: 10, padding: '3px 7px', border: '0.5px solid #e2e8f0', borderRadius: 20, color: '#334155', background: '#fff' }}>
                        <option value="privada">privada</option>
                        <option value="equipo">equipo</option>
                        <option value="proyecto">proyecto</option>
                      </select>
                      {sel.visibilidad === 'proyecto' && (
                        <select value={sel.projectId ?? ''} aria-label="Proyecto de la nota"
                          onChange={e => actualizar(sel.id, { projectId: e.target.value })}
                          style={{ fontSize: 10, padding: '3px 7px', border: '0.5px solid #e2e8f0', borderRadius: 20, color: '#334155', background: '#fff' }}>
                          {proyectos.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
                        </select>
                      )}
                    </>
                  )}
                </div>
              </div>

              {puedeEditar && (
                <>
                  <button onClick={() => actualizar(sel.id, { favorita: !sel.favorita })}
                    aria-label={sel.favorita ? 'Quitar de favoritas' : 'Marcar como favorita'}
                    style={{ background: sel.favorita ? '#faeeda' : '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: 9, cursor: 'pointer', display: 'flex' }}>
                    <Star size={15} color={sel.favorita ? '#ba7517' : '#64748b'}/>
                  </button>
                  <button onClick={() => setEditando(!editando)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '9px 12px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' }}>
                    {editando ? <><Eye size={13}/> Ver</> : <><Pencil size={13}/> Editar</>}
                  </button>
                  <button onClick={() => { actualizar(sel.id, { borradaEn: ahora() }); setSelId(''); }}
                    aria-label="Mover a la papelera"
                    style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: 9, cursor: 'pointer', display: 'flex' }}>
                    <Trash2 size={15} color="#a32d2d"/>
                  </button>
                </>
              )}

              {sel.borradaEn && sel.ownerId === yo && (
                <button onClick={() => actualizar(sel.id, { borradaEn: undefined })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '9px 12px', borderRadius: 8, border: '0.5px solid #5dcaa5', background: '#e1f5ee', color: '#0f6e56', cursor: 'pointer' }}>
                  <RotateCcw size={13}/> Restaurar
                </button>
              )}
            </div>

            {editando && puedeEditar && (
              <div style={{ padding: '8px 24px', borderBottom: '0.5px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                {[
                  { ic: <Heading2 size={14}/>, t: 'Título', ins: '## ' },
                  { ic: <Bold size={14}/>, t: 'Negrita', ins: '**texto**' },
                  { ic: <Italic size={14}/>, t: 'Cursiva', ins: '*texto*' },
                  { ic: <List size={14}/>, t: 'Lista', ins: '- ' },
                  { ic: <ListChecks size={14}/>, t: 'Casillas', ins: '- [ ] ' },
                  { ic: <Link2 size={14}/>, t: 'Enlace', ins: '[texto](https://)' },
                  { ic: <Code size={14}/>, t: 'Código', ins: '`código`' },
                ].map(b => (
                  <button key={b.t} title={b.t} aria-label={b.t}
                    onClick={() => actualizar(sel.id, { cuerpo: `${sel.cuerpo}${sel.cuerpo && !sel.cuerpo.endsWith('\n') ? '\n' : ''}${b.ins}` })}
                    style={{ background: 'none', border: 'none', borderRadius: 6, padding: '7px 9px', cursor: 'pointer', color: '#334155', display: 'flex' }}>
                    {b.ic}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>
                  Markdown · las imágenes llegan en la siguiente entrega
                </span>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              {editando && puedeEditar ? (
                <textarea value={sel.cuerpo} onChange={e => actualizar(sel.id, { cuerpo: e.target.value })}
                  placeholder={'Escribe aquí.\n\n## Un título\n- una lista\n- [ ] algo por hacer'}
                  aria-label="Cuerpo de la nota"
                  style={{ width: '100%', height: '100%', minHeight: 300, boxSizing: 'border-box', border: 'none', outline: 'none',
                           resize: 'none', fontSize: 13.5, lineHeight: 1.7, color: '#1e293b', fontFamily: 'inherit' }}/>
              ) : (
                <div className="md-cuerpo" style={{ fontSize: 13.5, lineHeight: 1.7, color: '#1e293b', maxWidth: 760 }}
                  dangerouslySetInnerHTML={{ __html: sel.cuerpo.trim()
                    ? markdownAHtml(sel.cuerpo)
                    : '<p style="color:#94a3b8">Nota vacía. Pulsa Editar para escribir.</p>' }}/>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .md-cuerpo h2 { font-size: 16px; font-weight: 600; margin: 18px 0 8px; color: #111827; }
        .md-cuerpo h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; color: #111827; }
        .md-cuerpo h4, .md-cuerpo h5 { font-size: 13px; font-weight: 600; margin: 14px 0 6px; color: #334155; }
        .md-cuerpo p { margin: 0 0 10px; }
        .md-cuerpo ul, .md-cuerpo ol { margin: 0 0 10px; padding-left: 22px; }
        .md-cuerpo li { margin-bottom: 4px; }
        .md-cuerpo ul.md-tareas { list-style: none; padding-left: 2px; }
        .md-cuerpo ul.md-tareas li.md-hecha { color: #94a3b8; text-decoration: line-through; }
        .md-cuerpo code { background: #f1f5f9; border-radius: 4px; padding: 1px 5px; font-size: 12.5px; }
        .md-cuerpo pre { background: #f8fafc; border: 0.5px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; overflow-x: auto; }
        .md-cuerpo pre code { background: none; padding: 0; }
        .md-cuerpo blockquote { margin: 0 0 10px; padding: 6px 12px; border-left: 3px solid #cbd5e1; color: #475569; background: #f8fafc; }
        .md-cuerpo a { color: #0f6e56; }
        .md-cuerpo hr { border: none; border-top: 0.5px solid #e2e8f0; margin: 16px 0; }
      `}</style>
    </div>
  );
}
