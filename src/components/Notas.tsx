import React, { useMemo, useState } from 'react';
import { Plus, Search, Star, Trash2, Bold, Italic, List, ListChecks, Heading2, Link2, Code, Eye, Pencil, RotateCcw, BookOpen, Image as ImageIcon, Loader, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminStore, type Nota, type Cuaderno, type AdminProject, type NotaImportancia, type NotaEstado } from '../lib/adminStore';
import { markdownAHtml, resumenDeNota } from '../lib/markdownMini';
import { subirImagen, marcaDeImagen, conAnchoDeImagen } from '../lib/imagenesNota';
import { leerLocal } from '../lib/imgLocal';
import { apiBase } from '../lib/persist';

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

/** Importancia: solo tres niveles. Más matices y nadie los usa igual. */
const IMPORTANCIAS: { k: NotaImportancia; label: string; bg: string; fg: string }[] = [
  { k: 'alta',  label: 'Alta',  bg: '#fdeaea', fg: '#a32d2d' },
  { k: 'media', label: 'Media', bg: '#fdf3e2', fg: '#8a5a12' },
  { k: 'baja',  label: 'Baja',  bg: '#eef2f6', fg: '#52606d' },
];

/** Estados. Cubren el recorrido normal y las dos formas de cerrar algo:
 *  terminarlo o decidir que no hacía falta. */
const ESTADOS: { k: NotaEstado; label: string; bg: string; fg: string }[] = [
  { k: 'borrador',     label: 'Borrador',     bg: '#f1efe8', fg: '#56534a' },
  { k: 'en-curso',     label: 'En curso',     bg: '#e6f1fb', fg: '#0c447c' },
  { k: 'en-espera',    label: 'En espera',    bg: '#fdf3e2', fg: '#8a5a12' },
  { k: 'en-revision',  label: 'En revisión',  bg: '#efeafd', fg: '#4c2f9e' },
  { k: 'revisada',     label: 'Revisada',     bg: '#e1f5ee', fg: '#0f6e56' },
  { k: 'finalizada',   label: 'Finalizada',   bg: '#dff3e4', fg: '#1a6b32' },
  { k: 'no-requerida', label: 'No se requiere', bg: '#f1efe8', fg: '#7a776e' },
];
const metaImp = (k?: NotaImportancia) => IMPORTANCIAS.find(x => x.k === k);
const metaEst = (k?: NotaEstado) => ESTADOS.find(x => x.k === k);

/** Chip pequeño, el mismo para importancia y estado. */
function Chip({ label, bg, fg, punto = false }: { label: string; bg: string; fg: string; punto?: boolean }) {
  return (
    <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: bg, color: fg, fontWeight: 600,
                   display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {punto && <span style={{ width: 5, height: 5, borderRadius: '50%', background: fg }}/>}
      {label}
    </span>
  );
}

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
  const [subiendo, setSubiendo]   = useState(0);
  const [errorImg, setErrorImg]   = useState('');
  const [avisoLocal, setAvisoLocal] = useState(false);
  const [fImp, setFImp] = useState<NotaImportancia | ''>('');
  const [fEst, setFEst] = useState<NotaEstado | ''>('');
  const [imgSel, setImgSel]       = useState<{ sha: string; idx: number; ancho: number; top: number; left: number } | null>(null);
  const refCuerpo = React.useRef<HTMLTextAreaElement>(null);
  const refLectura = React.useRef<HTMLDivElement>(null);

  function guardarNotas(n: Nota[]) { setNotas(n); adminStore.saveNotas(n); }

  /**
   * Las imágenes que quedaron solo en este navegador (sin API detrás) no las
   * puede traer el `src`: se buscan en IndexedDB por su sha y se cambian por
   * una URL de blob. Y de paso cada imagen queda clicable para cambiar su
   * tamaño sin salir de la nota.
   */
  React.useEffect(() => {
    const cont = refLectura.current;
    if (!cont) return;
    const imgs = [...cont.querySelectorAll<HTMLImageElement>('img[data-sha]')];
    const blobs: string[] = [];
    let vivo = true;

    const porSha = new Map<string, number>();
    imgs.forEach(img => {
      const sha = img.dataset.sha ?? '';
      const idx = porSha.get(sha) ?? 0;
      porSha.set(sha, idx + 1);
      img.dataset.idx = String(idx);
      img.style.cursor = 'zoom-in';

      // Si falla la carga desde el API, puede estar guardada aquí.
      const intentarLocal = async () => {
        const b = await leerLocal(sha);
        if (!vivo || !b) return;
        const u = URL.createObjectURL(b);
        blobs.push(u);
        img.src = u;
        img.dataset.local = '1';
      };
      img.addEventListener('error', intentarLocal, { once: true });
      if (!img.complete || img.naturalWidth === 0) void intentarLocal();
    });

    const alHacerClic = (e: Event) => {
      const img = (e.target as HTMLElement).closest('img[data-sha]') as HTMLImageElement | null;
      if (!img) { setImgSel(null); return; }
      const r = img.getBoundingClientRect();
      setImgSel({ sha: img.dataset.sha ?? '', idx: Number(img.dataset.idx ?? 0),
                  ancho: Number(img.dataset.ancho ?? Math.round(r.width)),
                  top: r.bottom + 6, left: r.left });
    };
    cont.addEventListener('click', alHacerClic);

    return () => {
      vivo = false;
      cont.removeEventListener('click', alHacerClic);
      blobs.forEach(u => URL.revokeObjectURL(u));
    };
  }, [selId, notas, editando]);

  function ponerAncho(ancho: number | null) {
    if (!sel || !imgSel) return;
    actualizar(sel.id, { cuerpo: conAnchoDeImagen(sel.cuerpo, imgSel.sha, imgSel.idx, ancho) });
    setImgSel(null);
  }
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
    const porTexto = t ? base.filter(n => `${n.titulo} ${n.cuerpo} ${(n.etiquetas ?? []).join(' ')}`.toLowerCase().includes(t)) : base;
    const filtrada = porTexto.filter(n => (!fImp || n.importancia === fImp) && (!fEst || n.estado === fEst));
    // Lo urgente primero, y dentro de cada nivel lo último que se tocó.
    const peso = (n: Nota) => n.importancia === 'alta' ? 0 : n.importancia === 'media' ? 1 : n.importancia === 'baja' ? 3 : 2;
    return [...filtrada].sort((a, b) => peso(a) - peso(b) || (b.actualizadaEn > a.actualizadaEn ? 1 : -1));
  }, [cuaderno, q, notas, yo, fImp, fEst]);

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

  /**
   * Las imágenes no van en la nota: se suben al API, que las guarda por el
   * SHA-256 de su contenido, y en el cuerpo queda la marca de markdown con esa
   * URL. Si fueran parte de la nota, entrarían en la descarga completa del
   * estado que el front hace al entrar y reventarían el cupo de localStorage.
   */
  async function insertarImagenes(id: string, archivos: (File | Blob)[], cuerpoActual: string) {
    const imgs = archivos.filter(f => /^image\//.test((f as File).type || ''));
    if (!imgs.length) return;
    setErrorImg('');
    setSubiendo(n => n + imgs.length);
    let cuerpo = cuerpoActual;
    for (const f of imgs) {
      try {
        const sub = await subirImagen(f);
        if (sub.local) setAvisoLocal(true);
        cuerpo = `${cuerpo}${marcaDeImagen(sub.url)}`;
        actualizar(id, { cuerpo });
      } catch (e) {
        setErrorImg(e instanceof Error ? e.message : 'no se pudo subir la imagen');
      } finally {
        setSubiendo(n => Math.max(0, n - 1));
      }
    }
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

        <div style={{ padding: '8px 14px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <select value={fImp} onChange={e => setFImp(e.target.value as NotaImportancia | '')} aria-label="Filtrar por importancia"
            style={{ flex: 1, minWidth: 0, fontSize: 10, padding: '4px 6px', border: '0.5px solid #e2e8f0', borderRadius: 7, color: '#334155', background: metaImp(fImp || undefined)?.bg ?? '#fff' }}>
            <option value="">Toda importancia</option>
            {IMPORTANCIAS.map(x => <option key={x.k} value={x.k}>{x.label}</option>)}
          </select>
          <select value={fEst} onChange={e => setFEst(e.target.value as NotaEstado | '')} aria-label="Filtrar por estado"
            style={{ flex: 1, minWidth: 0, fontSize: 10, padding: '4px 6px', border: '0.5px solid #e2e8f0', borderRadius: 7, color: '#334155', background: metaEst(fEst || undefined)?.bg ?? '#fff' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(x => <option key={x.k} value={x.k}>{x.label}</option>)}
          </select>
          {(fImp || fEst) && (
            <button onClick={() => { setFImp(''); setFEst(''); }} aria-label="Quitar los filtros"
              style={{ border: '0.5px solid #e2e8f0', background: '#fff', borderRadius: 7, padding: '4px 6px', cursor: 'pointer', display: 'flex', color: '#64748b' }}>
              <X size={11}/>
            </button>
          )}
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
                  {(() => { const m = metaImp(n.importancia); return m ? <Chip label={m.label} bg={m.bg} fg={m.fg} punto/> : null; })()}
                  {(() => { const m = metaEst(n.estado); return m ? <Chip label={m.label} bg={m.bg} fg={m.fg}/> : null; })()}
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
                  {puedeEditar && (
                    <>
                      <select value={sel.importancia ?? ''} aria-label="Importancia de la nota"
                        onChange={e => actualizar(sel.id, { importancia: (e.target.value || undefined) as NotaImportancia | undefined })}
                        style={{ fontSize: 10, padding: '3px 7px', border: '0.5px solid #e2e8f0', borderRadius: 20, color: '#334155', background: metaImp(sel.importancia)?.bg ?? '#fff' }}>
                        <option value="">importancia</option>
                        {IMPORTANCIAS.map(x => <option key={x.k} value={x.k}>{x.label}</option>)}
                      </select>
                      <select value={sel.estado ?? ''} aria-label="Estado de la nota"
                        onChange={e => actualizar(sel.id, { estado: (e.target.value || undefined) as NotaEstado | undefined })}
                        style={{ fontSize: 10, padding: '3px 7px', border: '0.5px solid #e2e8f0', borderRadius: 20, color: '#334155', background: metaEst(sel.estado)?.bg ?? '#fff' }}>
                        <option value="">sin estado</option>
                        {ESTADOS.map(x => <option key={x.k} value={x.k}>{x.label}</option>)}
                      </select>
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
                <span style={{ width: 1, height: 18, background: '#e2e8f0', margin: '0 5px' }}/>
                <label title="Insertar una imagen"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#0f6e56',
                           background: '#e1f5ee', border: '0.5px solid #5dcaa5', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>
                  {subiendo > 0 ? <Loader size={13}/> : <ImageIcon size={13}/>}
                  {subiendo > 0 ? `Subiendo ${subiendo}…` : 'Imagen'}
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={e => { const fs: File[] = e.target.files ? Array.from(e.target.files) : []; e.target.value = ''; insertarImagenes(sel.id, fs, sel.cuerpo); }}/>
                </label>
                {errorImg
                  ? <span style={{ marginLeft: 'auto', fontSize: 10, color: '#a32d2d', fontWeight: 600 }}>{errorImg}</span>
                  : <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>Markdown · pega una captura con Ctrl+V o suéltala aquí</span>}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
              {editando && puedeEditar ? (
                <textarea ref={refCuerpo} value={sel.cuerpo} onChange={e => actualizar(sel.id, { cuerpo: e.target.value })}
                  onPaste={e => {
                    const fs: File[] = e.clipboardData?.files ? Array.from(e.clipboardData.files) : [];
                    if (fs.length) { e.preventDefault(); insertarImagenes(sel.id, fs, sel.cuerpo); }
                  }}
                  onDragOver={e => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); }}
                  onDrop={e => {
                    const fs: File[] = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
                    if (fs.length) { e.preventDefault(); insertarImagenes(sel.id, fs, sel.cuerpo); }
                  }}
                  placeholder={'Escribe aquí.\n\n## Un título\n- una lista\n- [ ] algo por hacer\n\nPega una captura con Ctrl+V.'}
                  aria-label="Cuerpo de la nota"
                  style={{ width: '100%', height: '100%', minHeight: 300, boxSizing: 'border-box', border: 'none', outline: 'none',
                           resize: 'none', fontSize: 13.5, lineHeight: 1.7, color: '#1e293b', fontFamily: 'inherit' }}/>
              ) : (
                <div ref={refLectura} className="md-cuerpo" style={{ fontSize: 13.5, lineHeight: 1.7, color: '#1e293b', maxWidth: 760 }}
                  dangerouslySetInnerHTML={{ __html: sel.cuerpo.trim()
                    ? markdownAHtml(sel.cuerpo, apiBase() ?? '')
                    : '<p style="color:#94a3b8">Nota vacía. Pulsa Editar para escribir.</p>' }}/>
              )}
            </div>
          </>
        )}
      </div>

      {imgSel && (
        <div role="group" aria-label="Tamaño de la imagen"
          style={{ position: 'fixed', top: imgSel.top, left: imgSel.left, zIndex: 40, display: 'flex', alignItems: 'center', gap: 4,
                   background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 9, padding: 5, boxShadow: '0 6px 20px rgba(15,23,42,.14)' }}>
          <span style={{ fontSize: 10, color: '#64748b', padding: '0 4px' }}>Tamaño</span>
          {[{ l: 'S', w: 320 }, { l: 'M', w: 560 }, { l: 'L', w: 860 }].map(o => (
            <button key={o.l} onClick={() => ponerAncho(o.w)} title={`${o.w} px de ancho`}
              style={{ fontSize: 11, fontWeight: 700, width: 30, height: 30, borderRadius: 7, cursor: 'pointer',
                       border: `0.5px solid ${imgSel.ancho === o.w ? '#5dcaa5' : '#e2e8f0'}`,
                       background: imgSel.ancho === o.w ? '#e1f5ee' : '#fff',
                       color: imgSel.ancho === o.w ? '#0f6e56' : '#334155' }}>{o.l}</button>
          ))}
          <button onClick={() => ponerAncho(null)} title="Ancho completo de la nota"
            style={{ fontSize: 11, fontWeight: 600, padding: '0 10px', height: 30, borderRadius: 7, cursor: 'pointer', border: '0.5px solid #e2e8f0', background: '#fff', color: '#334155' }}>
            Completo
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 2 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>px</span>
            <input type="number" min={80} max={2000} step={20} defaultValue={imgSel.ancho} aria-label="Ancho en píxeles"
              onKeyDown={e => { if (e.key === 'Enter') ponerAncho(Math.min(2000, Math.max(80, Number((e.target as HTMLInputElement).value)))); }}
              style={{ width: 62, fontSize: 11, padding: '6px 7px', border: '0.5px solid #e2e8f0', borderRadius: 7, color: '#1e293b' }}/>
          </label>
          <button onClick={() => setImgSel(null)} aria-label="Cerrar"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
            <X size={14}/>
          </button>
        </div>
      )}

      {avisoLocal && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 40, maxWidth: 380, display: 'flex', alignItems: 'flex-start', gap: 9,
                      background: '#faeeda', border: '0.5px solid #ef9f27', borderRadius: 10, padding: '10px 12px', boxShadow: '0 6px 20px rgba(15,23,42,.14)' }}>
          <ImageIcon size={14} color="#854f0b" style={{ flexShrink: 0, marginTop: 1 }}/>
          <div style={{ fontSize: 11, color: '#854f0b', lineHeight: 1.5 }}>
            <strong>La imagen quedó solo en este navegador.</strong> Esta copia del Hub no tiene API detrás, así que no se pudo subir.
            La nota ya apunta a su URL definitiva: cuando el API esté arriba, se sube y la nota no cambia.
          </div>
          <button onClick={() => setAvisoLocal(false)} aria-label="Entendido"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#854f0b', display: 'flex', flexShrink: 0 }}>
            <X size={13}/>
          </button>
        </div>
      )}

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
        .md-cuerpo figure.md-img { margin: 12px 0; }
        .md-cuerpo figure.md-img img { max-width: 100%; height: auto; display: block; border: 0.5px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
        .md-cuerpo figure.md-img figcaption { font-size: 11px; color: #64748b; margin-top: 5px; }
      `}</style>
    </div>
  );
}
