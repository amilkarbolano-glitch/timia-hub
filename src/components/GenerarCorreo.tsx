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

const VINO = '#9a003d';   // el de la barra bajo la A del logo, muestreado del propio archivo
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

/** Estilos con media query: el diálogo se usa igual desde el escritorio y desde
 *  el teléfono, y en línea no se pueden escribir puntos de corte. */
const CSS = `
.gc-fondo{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:70;display:flex;align-items:center;justify-content:center;padding:16px}
.gc-modal{background:#fff;border-radius:14px;width:min(1180px,96vw);max-height:92vh;overflow-y:auto;padding:18px 22px 22px}
.gc-campos{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin-bottom:14px}
.gc-lienzo{overflow-x:auto;border:0.5px solid ${LINEA};border-radius:10px;padding:10px;margin-bottom:10px;background:#fafafa}
.gc-lienzo canvas{display:block;width:100%;min-width:640px;height:auto;border-radius:6px;border:0.5px solid ${LINEA};background:#fff}
.gc-acciones{display:flex;gap:7px;flex-wrap:wrap}
@media (max-width:760px){
  .gc-fondo{padding:0}
  .gc-modal{width:100vw;max-width:100vw;max-height:100vh;border-radius:0;padding:14px}
  .gc-campos input{font-size:16px}
  .gc-lienzo canvas{min-width:560px}
  .gc-acciones button{flex:1 1 auto;justify-content:center}
}
`;

export default function GenerarCorreo({ datos, onClose }: { datos: DatosCorreo; onClose: () => void }) {
  const proyectos = adminStore.getProjects();
  const proyecto = proyectos.find(p => p.id === datos.projectId);

  const [sda, setSda] = useState(proyecto?.sda ?? '');
  const [alcance, setAlcance] = useState(proyecto?.asuntoAlcance ?? '');
  const [respBBVA, setRespBBVA] = useState(proyecto?.respBBVA ?? datos.respBBVA ?? '');
  const [respTimia, setRespTimia] = useState(proyecto?.respTimia ?? datos.respTimia ?? '');
  const [copiado, setCopiado] = useState<string>('');
  /** Logo y marca de agua salen de la plantilla real de TIMIA, no redibujados:
   *  así el correo no se parece al formato del banco, es ese formato. */
  const [marca, setMarca] = useState<{ logo?: HTMLImageElement; agua?: HTMLImageElement }>({});
  const lienzo = useRef<HTMLCanvasElement | null>(null);

  const abiertas = datos.issues.filter(i => !i.endDate);
  const alertas = abiertas.filter(i => i.type === 'alerta');
  const bloqueantes = abiertas.filter(i => i.type === 'bloqueante');
  const dif = datos.real - datos.esperado;

  const fases = useMemo(
    () => datos.fases.map(f => ({ label: f.label, pct: realFase(f, datos.pesoModo) })),
    [datos.fases, datos.pesoModo],
  );

  /** Guarda en el proyecto lo que se escribe una vez y vale para siempre.
   *  Se llama al salir de cada campo, no solo al copiar: son datos que se
   *  escriben una vez por proyecto y volver a teclearlos cada semana sería
   *  justo lo que esto viene a quitar. */
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
  function trazar(ctx: CanvasRenderingContext2D, W: number): number {
    const F = (px: number, peso = 400) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const IZQ = 40, ANCHO_IZQ = 470;        // alertas y bloqueantes
    const DER = 560, ANCHO_DER = W - DER - 40;  // el dibujo: cifras, tabla y equipo

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, 4000);

    // La marca de agua va primero y muy suave: detrás de todo, como en la plantilla.
    if (marca.agua) {
      const lado = 520;
      ctx.save(); ctx.globalAlpha = 0.07;
      ctx.drawImage(marca.agua, W - lado + 60, 150, lado, lado * (marca.agua.height / marca.agua.width));
      ctx.restore();
    }
    ctx.fillStyle = VINO; ctx.fillRect(0, 0, W, 6);

    if (marca.logo) {
      const alto = 30, ancho = alto * (marca.logo.width / marca.logo.height);
      ctx.drawImage(marca.logo, IZQ, 20, ancho, alto);
    } else {
      ctx.fillStyle = TINTA; ctx.font = F(24, 700); ctx.fillText('TIMIA', IZQ, 46);
    }
    ctx.fillStyle = VINO; ctx.font = F(17, 600); ctx.textAlign = 'right';
    ctx.fillText(fechaCorta(datos.fechaCorte), W - 40, 44);
    ctx.textAlign = 'left';
    ctx.fillStyle = GRIS; ctx.font = F(12);
    ctx.fillText(titulo || 'Plan de trabajo', IZQ, 70);

    // ── Izquierda: alertas y bloqueantes ─────────────────────────────────────
    let yI = 108;
    const lista = (etiqueta: string, color: string, items: PlanIssue[]) => {
      ctx.fillStyle = color; ctx.font = F(13, 700);
      ctx.fillText(`${etiqueta}  (${items.length})`, IZQ, yI); yI += 10;
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(IZQ, yI); ctx.lineTo(IZQ + ANCHO_IZQ, yI); ctx.stroke();
      yI += 18;
      if (!items.length) {
        ctx.fillStyle = GRIS; ctx.font = F(12);
        ctx.fillText(`No se tienen ${etiqueta.toLowerCase()} por el momento`, IZQ, yI);
        yI += 30; return;
      }
      items.forEach((it, n) => {
        ctx.fillStyle = TINTA; ctx.font = F(12);
        const cuerpo = [it.title, it.detail].filter(Boolean).join(' ');
        enLineas(ctx, `${n + 1}. ${cuerpo}`, ANCHO_IZQ, 4).forEach(l => { ctx.fillText(l, IZQ, yI); yI += 17; });
        if (it.responsable) {
          ctx.fillStyle = color; ctx.font = F(11, 600);
          ctx.fillText(`Responsable: ${it.responsable}`, IZQ, yI); yI += 16;
        }
        yI += 10;
      });
      yI += 12;
    };
    lista('Alertas', '#b45309', alertas);
    lista('Bloqueantes', '#b91c1c', bloqueantes);

    // ── Derecha: el dibujo ───────────────────────────────────────────────────
    let yD = 108;
    ctx.fillStyle = GRIS; ctx.font = F(11, 600);
    ctx.textAlign = 'center'; ctx.fillText('AVANCE GENERAL', DER + ANCHO_DER / 2, yD); ctx.textAlign = 'left';
    yD += 12;
    const anchoCaja = (ANCHO_DER - 24) / 3;
    const caja = (i: number, et: string, val: string, fondo: string, tinta: string) => {
      const x = DER + i * (anchoCaja + 12);
      ctx.fillStyle = fondo; ctx.beginPath(); ctx.roundRect(x, yD, anchoCaja, 70, 8); ctx.fill();
      ctx.fillStyle = tinta; ctx.textAlign = 'center';
      ctx.font = F(11, 600); ctx.fillText(et, x + anchoCaja / 2, yD + 22);
      ctx.font = F(25, 700); ctx.fillText(val, x + anchoCaja / 2, yD + 55);
      ctx.textAlign = 'left';
    };
    caja(0, 'Avance real', un(datos.real), '#f3f4f6', TINTA);
    caja(1, 'Avance esperado', un(datos.esperado), '#f3f4f6', TINTA);
    // El semáforo de la diferencia es el del banco, no el mío: en el status real
    // un −1.3% va en verde, porque un atraso pequeño se absorbe. Verde hasta −2
    // puntos, ámbar hasta −5, rojo por debajo.
    const tono = dif >= -2 ? ['#dcfce7', '#15803d'] : dif >= -5 ? ['#fef3c7', '#b45309'] : ['#fee2e2', '#b91c1c'];
    caja(2, 'Diferencia', `${dif >= 0 ? '+' : '−'}${Math.abs(dif).toFixed(1)}%`, tono[0], tono[1]);
    yD += 70 + 22;

    ctx.fillStyle = VINO; ctx.beginPath(); ctx.roundRect(DER, yD, ANCHO_DER, 30, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = F(12, 600);
    ctx.fillText('Entregable / Bloque', DER + 14, yD + 20);
    ctx.textAlign = 'right'; ctx.fillText('Porcentaje', DER + ANCHO_DER - 14, yD + 20); ctx.textAlign = 'left';
    yD += 30;
    fases.forEach((f, i) => {
      if (i % 2) { ctx.fillStyle = '#f9fafb'; ctx.fillRect(DER, yD, ANCHO_DER, 28); }
      ctx.fillStyle = TINTA; ctx.font = F(12);
      ctx.fillText(enLineas(ctx, f.label, ANCHO_DER - 100, 1)[0] ?? f.label, DER + 14, yD + 19);
      ctx.font = F(12, 600); ctx.textAlign = 'right';
      ctx.fillText(un(f.pct), DER + ANCHO_DER - 14, yD + 19); ctx.textAlign = 'left';
      ctx.strokeStyle = LINEA; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(DER, yD + 28); ctx.lineTo(DER + ANCHO_DER, yD + 28); ctx.stroke();
      yD += 28;
    });

    yD += 22;
    ctx.fillStyle = VINO; ctx.beginPath(); ctx.roundRect(DER, yD, ANCHO_DER, 26, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = F(11, 600);
    ctx.fillText('Equipo', DER + 14, yD + 18);
    ctx.textAlign = 'right'; ctx.fillText('Responsable', DER + ANCHO_DER - 14, yD + 18); ctx.textAlign = 'left';
    yD += 26;
    ([['Responsable BBVA', respBBVA], ['Responsable Timia', respTimia]] as const).forEach(([et, val], i) => {
      if (i % 2) { ctx.fillStyle = '#f9fafb'; ctx.fillRect(DER, yD, ANCHO_DER, 26); }
      ctx.fillStyle = GRIS; ctx.font = F(11, 600); ctx.fillText(et, DER + 14, yD + 18);
      ctx.fillStyle = TINTA; ctx.font = F(11); ctx.textAlign = 'right';
      ctx.fillText(enLineas(ctx, val || '—', ANCHO_DER - 160, 1)[0] ?? '—', DER + ANCHO_DER - 14, yD + 18);
      ctx.textAlign = 'left';
      ctx.strokeStyle = LINEA; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(DER, yD + 26); ctx.lineTo(DER + ANCHO_DER, yD + 26); ctx.stroke();
      yD += 26;
    });

    return Math.max(yI, yD) + 16;
  }

  /** Dos pasadas: la primera mide sobre un lienzo de usar y tirar, la segunda
   *  dibuja ya con el alto justo. Así un bloqueante largo no se corta. */
  function dibujar(): HTMLCanvasElement {
    const W = 1120, R = 2;
    const borrador = document.createElement('canvas');
    borrador.width = W; borrador.height = 2000;
    const alto = Math.max(420, trazar(borrador.getContext('2d')!, W));
    const c = lienzo.current ?? document.createElement('canvas');
    c.width = W * R; c.height = alto * R;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(R, 0, 0, R, 0, 0);
    trazar(ctx, W);
    return c;
  }

  useEffect(() => {
    let vivo = true;
    const base = import.meta.env.BASE_URL ?? '/';
    const raiz = base.endsWith('/') ? base : `${base}/`;
    const cargar = (f: string) => new Promise<HTMLImageElement | undefined>(res => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(undefined);     // sin plantilla el dibujo sale igual, solo sin fondo
      im.src = `${raiz}plantilla/${f}`;
    });
    Promise.all([cargar('timia-logo.png'), cargar('timia-marca.png')])
      .then(([logo, agua]) => { if (vivo) setMarca({ logo, agua }); });
    return () => { vivo = false; };
  }, []);

  // El dibujo tiene que estar hecho antes de que nadie toque nada: si solo se
  // dibujara al copiar, no habría forma de revisar el correo antes de mandarlo.
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
    <div onClick={onClose} className="gc-fondo">
      <style>{CSS}</style>
      <div onClick={e => e.stopPropagation()} className="gc-modal">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TINTA }}>Generar correo de status</h3>
          <button onClick={onClose} aria-label="Cerrar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: GRIS, display: 'flex' }}><X size={16}/></button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 11, color: GRIS }}>
          Corte del {fechaLarga(datos.fechaCorte)} — las cifras son las que muestra el plan en pantalla con ese corte.
        </p>

        <div className="gc-campos">
          <label style={{ fontSize: 10, color: GRIS }}>Código del proyecto
            <input value={sda} onChange={e => setSda(e.target.value)} onBlur={recordar} placeholder="SDATOOL-54364" style={campo}/></label>
          <label style={{ fontSize: 10, color: GRIS }}>Asunto del correo de alcance
            <input value={alcance} onChange={e => setAlcance(e.target.value)} onBlur={recordar} placeholder="[SDATOOL-…] - Plan de trabajo" style={campo}/></label>
          <label style={{ fontSize: 10, color: GRIS }}>Responsable BBVA
            <input value={respBBVA} onChange={e => setRespBBVA(e.target.value)} onBlur={recordar} placeholder="Nombre y apellido" style={campo}/></label>
          <label style={{ fontSize: 10, color: GRIS }}>Responsable Timia
            <input value={respTimia} onChange={e => setRespTimia(e.target.value)} onBlur={recordar} placeholder="Nombre y apellido" style={campo}/></label>
        </div>

        <div className="gc-lienzo">
          <canvas ref={el => { lienzo.current = el; }}/>
        </div>

        <div className="gc-acciones" style={{ marginBottom: 14 }}>
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
        <div className="gc-acciones" style={{ marginTop: 8 }}>
          <button onClick={copiarTexto} style={boton(VINO, '#fff')}>
            {copiado === 'texto' ? <Check size={13}/> : <Copy size={13}/>}{copiado === 'texto' ? 'Texto copiado' : 'Copiar texto'}
          </button>
          {copiado === 'error' && <span style={{ fontSize: 11, color: '#b91c1c', alignSelf: 'center' }}>El navegador no dejó copiar. Selecciona el texto a mano.</span>}
        </div>
      </div>
    </div>
  );
}
