// ─── Correo de status semanal ────────────────────────────────────────────────
// Juan manda cada semana, por proyecto, un correo con la diapositiva de resumen
// pegada arriba y debajo el texto de alertas y bloqueantes. Esto arma las dos
// piezas desde el plan, para que sea copiar y pegar.
//
// Lo importante es de dónde sale el corte: NO recalcula nada por su cuenta.
// Recibe los KPIs y las alertas tal y como los está mostrando el plan, que ya
// sabe mirar a una fecha pasada. Así el correo no puede contradecir a la
// pantalla, que es el error que se paga caro cuando el correo va al banco.
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import { adminStore, type AdminProject, type PlanIssue } from '../lib/adminStore';
import { realFase, type AvanceFase, type PesoModo } from '../lib/avance';

const VINO = '#8b1538';
const TINTA = '#1f2937';
const GRIS = '#6b7280';
const LINEA = '#e5e7eb';

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fechaLarga = (iso: string) => { const d = new Date(iso + 'T12:00:00'); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const fechaCorta = (iso: string) => { const d = new Date(iso + 'T12:00:00'); return `${d.getDate()} ${MESES[d.getMonth()][0].toUpperCase()}${MESES[d.getMonth()].slice(1,3)} ${d.getFullYear()}`; };
const un = (n: number) => `${n.toFixed(1)}%`;

/** Parte un texto en líneas que caben en `ancho`, midiendo con el propio canvas. */
function enLineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number, maxLineas = 3): string[] {
  const out: string[] = []; let linea = '';
  for (const palabra of texto.split(/\s+/)) {
    const tent = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(tent).width > ancho && linea) {
      out.push(linea); linea = palabra;
      if (out.length === maxLineas - 1 && ctx.measureText(linea).width > ancho) break;
    } else linea = tent;
  }
  if (linea) out.push(linea);
  if (out.length > maxLineas) { const corte = out.slice(0, maxLineas); corte[maxLineas - 1] += '…'; return corte; }
  return out;
}

export interface DatosCorreo {
  projectId: string;
  /** Los del plan: si el proyecto no tiene guardados los suyos, mandan estos. */
  respBBVA?: string;
  respTimia?: string;
  fechaCorte: string;            // ISO yyyy-mm-dd
  real: number;
  esperado: number;
  fases: AvanceFase[];
  pesoModo: PesoModo;
  issues: PlanIssue[];           // ya filtradas al corte por el plan
}

export default function GenerarCorreo({ datos, onClose }: { datos: DatosCorreo; onClose: () => void }) {
  const proyectos = adminStore.getProjects();
  const proyecto = proyectos.find(p => p.id === datos.projectId);

  const [sda, setSda] = useState(proyecto?.sda ?? '');
  const [alcance, setAlcance] = useState(proyecto?.asuntoAlcance ?? '');
  const [respBBVA, setRespBBVA] = useState(proyecto?.respBBVA ?? datos.respBBVA ?? '');
  const [respTimia, setRespTimia] = useState(proyecto?.respTimia ?? datos.respTimia ?? '');
  const [copiado, setCopiado] = useState<string>('');
  const lienzo = useRef<HTMLCanvasElement | null>(null);

  const abiertas = datos.issues.filter(i => !i.endDate);
  const alertas = abiertas.filter(i => i.type === 'alerta');
  const bloqueantes = abiertas.filter(i => i.type === 'bloqueante');
  const dif = datos.real - datos.esperado;

  const fases = useMemo(
    () => datos.fases.map(f => ({ label: f.label, pct: realFase(f, datos.pesoModo) })),
    [datos.fases, datos.pesoModo],
  );

  /** Guarda en el proyecto lo que se escribe una vez y vale para siempre. */
  function recordar() {
    if (!proyecto) return;
    const cambios: Partial<AdminProject> = { sda: sda.trim() || undefined, asuntoAlcance: alcance.trim() || undefined,
      respBBVA: respBBVA.trim() || undefined, respTimia: respTimia.trim() || undefined };
    adminStore.saveProjects(proyectos.map(p => p.id === proyecto.id ? { ...p, ...cambios } : p));
  }

  const titulo = [sda.trim(), proyecto?.name ?? datos.projectId].filter(Boolean).join(' · ');

  // ── La imagen ──────────────────────────────────────────────────────────────
  // Se dibuja a mano en un canvas en vez de convertir HTML: así sale igual en
  // todos los navegadores y no depende de fuentes ni de CSS que el portapapeles
  // no se lleva.
  function dibujar(): HTMLCanvasElement {
    const W = 1120, H = 620, R = 2;
    const c = lienzo.current ?? document.createElement('canvas');
    c.width = W * R; c.height = H * R;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(R, 0, 0, R, 0, 0);
    const F = (px: number, peso = 400) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = VINO; ctx.fillRect(0, 0, W, 6);

    ctx.fillStyle = TINTA; ctx.font = F(21, 600);
    ctx.fillText(titulo || 'Plan de trabajo', 40, 52);
    ctx.fillStyle = VINO; ctx.font = F(16, 600); ctx.textAlign = 'right';
    ctx.fillText(fechaCorta(datos.fechaCorte), W - 40, 52);
    ctx.textAlign = 'left';

    // Avance general
    ctx.fillStyle = GRIS; ctx.font = F(12, 600);
    ctx.fillText('AVANCE GENERAL', 40, 92);
    const caja = (x: number, et: string, val: string, fondo: string, tinta: string) => {
      ctx.fillStyle = fondo; ctx.beginPath(); ctx.roundRect(x, 104, 180, 72, 8); ctx.fill();
      ctx.fillStyle = tinta; ctx.font = F(11, 600); ctx.textAlign = 'center';
      ctx.fillText(et, x + 90, 126);
      ctx.font = F(26, 700); ctx.fillText(val, x + 90, 160);
      ctx.textAlign = 'left';
    };
    caja(40, 'Avance real', un(datos.real), '#f3f4f6', TINTA);
    caja(236, 'Avance esperado', un(datos.esperado), '#f3f4f6', TINTA);
    const verde = dif >= 0;
    caja(432, 'Diferencia', `${dif >= 0 ? '+' : '−'}${Math.abs(dif).toFixed(1)}%`,
         verde ? '#dcfce7' : '#fee2e2', verde ? '#15803d' : '#b91c1c');

    // Entregables
    let y = 212;
    ctx.fillStyle = VINO; ctx.beginPath(); ctx.roundRect(40, y, 572, 30, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = F(12, 600);
    ctx.fillText('Entregable / Bloque', 54, y + 20);
    ctx.textAlign = 'right'; ctx.fillText('Porcentaje', 598, y + 20); ctx.textAlign = 'left';
    y += 30;
    fases.forEach((f, i) => {
      if (i % 2) { ctx.fillStyle = '#f9fafb'; ctx.fillRect(40, y, 572, 28); }
      ctx.fillStyle = TINTA; ctx.font = F(12);
      ctx.fillText(enLineas(ctx, f.label, 470, 1)[0] ?? f.label, 54, y + 19);
      ctx.font = F(12, 600); ctx.textAlign = 'right';
      ctx.fillText(un(f.pct), 598, y + 19); ctx.textAlign = 'left';
      ctx.strokeStyle = LINEA; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(40, y + 28); ctx.lineTo(612, y + 28); ctx.stroke();
      y += 28;
    });

    // Equipo
    y += 18;
    ctx.fillStyle = GRIS; ctx.font = F(11, 600); ctx.fillText('EQUIPO', 40, y);
    ctx.fillStyle = TINTA; ctx.font = F(12);
    ctx.fillText(`Responsable BBVA:  ${respBBVA || '—'}`, 40, y + 22);
    ctx.fillText(`Responsable Timia:  ${respTimia || '—'}`, 40, y + 42);

    // Alertas y bloqueantes, columna derecha
    const X = 652, ANCHO = W - X - 40;
    let yy = 92;
    const lista = (etiqueta: string, color: string, items: PlanIssue[]) => {
      ctx.fillStyle = color; ctx.font = F(13, 700);
      ctx.fillText(`${etiqueta}  (${items.length})`, X, yy); yy += 20;
      if (!items.length) {
        ctx.fillStyle = GRIS; ctx.font = F(12);
        ctx.fillText(`No se tienen ${etiqueta.toLowerCase()} por el momento`, X, yy); yy += 26; return;
      }
      items.forEach((it, n) => {
        ctx.fillStyle = TINTA; ctx.font = F(12);
        const lineas = enLineas(ctx, `${n + 1}. ${it.title}`, ANCHO, 3);
        lineas.forEach(l => { ctx.fillText(l, X, yy); yy += 17; });
        if (it.responsable) {
          ctx.fillStyle = GRIS; ctx.font = F(11);
          ctx.fillText(`Responsable: ${it.responsable}`, X, yy); yy += 16;
        }
        yy += 8;
      });
      yy += 10;
    };
    lista('Alertas', '#b45309', alertas);
    lista('Bloqueantes', '#b91c1c', bloqueantes);

    ctx.fillStyle = '#9ca3af'; ctx.font = F(10);
    ctx.fillText(`Generado desde Timia Hub · corte ${fechaCorta(datos.fechaCorte)}`, 40, H - 18);
    return c;
  }

  // El dibujo depende de lo que se escriba arriba, así que se rehace en cada
  // cambio: si no, el preview miente respecto a lo que se copia.
  useEffect(() => { if (lienzo.current) dibujar(); });

  async function copiarImagen() {
    const c = dibujar();
    const blob: Blob | null = await new Promise(res => c.toBlob(b => res(b), 'image/png'));
    if (!blob) return setCopiado('error');
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      recordar(); setCopiado('imagen'); setTimeout(() => setCopiado(''), 2500);
    } catch {
      // Firefox no deja escribir imágenes al portapapeles: se descarga y listo.
      descargar();
    }
  }

  function descargar() {
    const c = dibujar();
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `status-${datos.projectId}-${datos.fechaCorte}.png`;
    a.click();
    recordar(); setCopiado('png'); setTimeout(() => setCopiado(''), 2500);
  }

  const texto = useMemo(() => {
    const notas = [...bloqueantes, ...alertas].map(i => {
      const quien = i.responsable ? ` Responsable: ${i.responsable}.` : '';
      return `• ${i.title}${i.detail ? ` ${i.detail}` : ''}${quien} PENDIENTE`;
    });
    const cita = alcance.trim() ? `, teniendo en cuenta el alcance dado en el correo ${alcance.trim()}` : '';
    return [
      'Buen día, estimados.',
      '',
      `Compartimos el estatus correspondiente al proyecto ${titulo} con la información actualizada a corte del ${fechaLarga(datos.fechaCorte)}, donde podrán encontrar el detalle de las actividades que se vienen llevando a cabo y su respectivo avance${cita}. El documento se encuentra adjunto en formato PDF.`,
      '',
      notas.length ? 'Notas importantes:' : 'No se tienen alertas ni bloqueantes por el momento.',
      ...notas,
      '',
      'Cualquier duda o comentario quedamos atentos,',
    ].join('\n');
  }, [titulo, alcance, datos.fechaCorte, bloqueantes, alertas]);

  async function copiarTexto() {
    try { await navigator.clipboard.writeText(texto); recordar(); setCopiado('texto'); setTimeout(() => setCopiado(''), 2500); }
    catch { setCopiado('error'); }
  }

  const campo = { fontSize: 11, padding: '5px 8px', border: `0.5px solid ${LINEA}`, borderRadius: 6, width: '100%', boxSizing: 'border-box' as const };
  const boton = (fondo: string, tinta: string) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
    padding: '7px 12px', borderRadius: 7, border: 'none', background: fondo, color: tinta, cursor: 'pointer' });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 'min(960px, 100%)', maxHeight: '92vh', overflowY: 'auto', padding: '18px 22px 22px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TINTA }}>Generar correo de status</h3>
          <button onClick={onClose} aria-label="Cerrar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: GRIS, display: 'flex' }}><X size={16}/></button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: GRIS }}>
          Corte del {fechaLarga(datos.fechaCorte)} — las cifras son las que muestra el plan en pantalla con ese corte.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8, marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: GRIS }}>Código del proyecto
            <input value={sda} onChange={e => setSda(e.target.value)} placeholder="SDATOOL-54364" style={campo}/></label>
          <label style={{ fontSize: 10, color: GRIS }}>Asunto del correo de alcance
            <input value={alcance} onChange={e => setAlcance(e.target.value)} placeholder="[SDATOOL-…] - Plan de trabajo" style={campo}/></label>
          <label style={{ fontSize: 10, color: GRIS }}>Responsable BBVA
            <input value={respBBVA} onChange={e => setRespBBVA(e.target.value)} placeholder="Nombre y apellido" style={campo}/></label>
          <label style={{ fontSize: 10, color: GRIS }}>Responsable Timia
            <input value={respTimia} onChange={e => setRespTimia(e.target.value)} placeholder="Nombre y apellido" style={campo}/></label>
        </div>

        <div style={{ border: `0.5px solid ${LINEA}`, borderRadius: 10, padding: 10, marginBottom: 10, background: '#fafafa' }}>
          <canvas ref={el => { lienzo.current = el; }} style={{ width: '100%', height: 'auto', borderRadius: 6, border: `0.5px solid ${LINEA}`, background: '#fff' }}/>
        </div>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
          <button onClick={copiarImagen} style={boton(VINO, '#fff')}>
            {copiado === 'imagen' ? <Check size={13}/> : <Copy size={13}/>}{copiado === 'imagen' ? 'Imagen copiada' : 'Copiar imagen'}
          </button>
          <button onClick={descargar} style={boton('#f1f5f9', TINTA)}>
            {copiado === 'png' ? <Check size={13}/> : <Download size={13}/>}PNG
          </button>
        </div>

        <div style={{ fontSize: 10, color: GRIS, marginBottom: 4 }}>Texto — va debajo de la imagen</div>
        <textarea readOnly value={texto} rows={10}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, lineHeight: 1.6, padding: '9px 11px', border: `0.5px solid ${LINEA}`, borderRadius: 8, resize: 'vertical', color: TINTA, background: '#fff' }}/>
        <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
          <button onClick={copiarTexto} style={boton(VINO, '#fff')}>
            {copiado === 'texto' ? <Check size={13}/> : <Copy size={13}/>}{copiado === 'texto' ? 'Texto copiado' : 'Copiar texto'}
          </button>
          {copiado === 'error' && <span style={{ fontSize: 11, color: '#b91c1c', alignSelf: 'center' }}>El navegador no dejó copiar. Selecciona el texto a mano.</span>}
        </div>
      </div>
    </div>
  );
}
