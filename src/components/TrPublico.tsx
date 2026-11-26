// ─── Carga pública de capturas de TR ─────────────────────────────────────────
// Sin sesión a propósito: la gente sube sus capturas desde el celular y pedirles
// iniciar sesión con Google para eso haría que no lo hagan. A cambio, el correo
// se confirma contra el equipo antes de dejar subir nada: un dedazo mandaría las
// horas al limbo y nadie se enteraría hasta fin de mes.
//
// La lectura de la imagen la hace un Apps Script que mantiene otra persona. Su
// URL vive en el servidor, no aquí.

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, Loader2, Camera, Search, UserPlus } from 'lucide-react';
import { TimiaMark, TimiaWordmark } from './TimiaLogo';

const MAX_IMAGENES = 20;
const MAX_BYTES = 6 * 1024 * 1024;
// Cuántas van en vuelo a la vez. Cada captura es su propia petición porque el
// lector tarda medio minuto larga y CloudFront corta al minuto: dos capturas
// en la misma petición ya se pasan. Con tres en vuelo, veinte capturas salen
// en tandas y ninguna petición se acerca al límite.
const EN_VUELO = 3;

interface Captura { id: string; nombre: string; contenido: string; peso: number }
interface Resultado { captura: string; estado: string; detalle?: string; respuesta?: unknown }
interface Fila { dia: string; horas: string }
interface Hallado { id: string; nombre: string; correo: string }

/** Lo que One Tap deja en `window`. Tipado a mano para no traer el paquete. */
interface VentanaGoogle extends Window {
  google?: { accounts?: { id?: {
    initialize: (c: Record<string, unknown>) => void;
    prompt: () => void;
  } } };
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** Carga el script de Google una sola vez, pase lo que pase. */
function cargarGis(): Promise<void> {
  const ya = document.querySelector(`script[src="${GIS_SRC}"]`);
  if (ya) return (ya as HTMLScriptElement).dataset.listo === '1'
    ? Promise.resolve()
    : new Promise(res => ya.addEventListener('load', () => res(), { once: true }));
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = GIS_SRC; sc.async = true;
    sc.onload = () => { sc.dataset.listo = '1'; res(); };
    sc.onerror = () => rej(new Error('no se pudo cargar Google'));
    document.head.appendChild(sc);
  });
}

/**
 * El correo que viene dentro del token de Google.
 *
 * Esto NO autentica a nadie: el token no se verifica aquí y no haría falta,
 * porque lo único que se hace con el correo es rellenar el campo. Quien manda
 * es el servidor, que lo valida contra el equipo igual que si se escribiera a
 * mano.
 */
function correoDeToken(credential?: string): string | null {
  if (!credential) return null;
  try {
    const carga = credential.split('.')[1];
    const json = atob(carga.replace(/-/g, '+').replace(/_/g, '/'));
    const email = JSON.parse(json)?.email;
    return typeof email === 'string' ? email.toLowerCase() : null;
  } catch { return null; }
}

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const card: React.CSSProperties = { background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:14 };
const input: React.CSSProperties = { width:'100%', padding:'10px 12px', fontSize:14, borderRadius:9,
  border:'0.5px solid #cbd5e1', outline:'none', boxSizing:'border-box' };

/** Mensaje humano para cada estado que puede devolver el servidor. */
function explica(r: Resultado): { tono: 'ok'|'aviso'|'error'; texto: string } {
  switch (r.estado) {
    case 'OK':             return { tono:'ok',    texto:'Leída correctamente.' };
    case 'SIN_CONFIGURAR': return { tono:'aviso', texto:'Guardada. El lector de capturas todavía no está conectado, así que nadie la ha leído aún.' };
    case 'TIMEOUT':        return { tono:'aviso', texto:'El lector tardó demasiado. La captura quedó guardada; vuelve a enviarla más tarde.' };
    case 'ERROR_SCRIPT':   return { tono:'error', texto:`El lector devolvió un error. ${r.detalle ?? ''}` };
    case 'ERROR_RED':      return { tono:'error', texto:'No se pudo contactar al lector de capturas.' };
    default:               return { tono:'aviso', texto: r.detalle ?? r.estado };
  }
}

/**
 * Las horas que devolvió el lector, si es que vienen.
 *
 * Todavía no hay contrato con el Apps Script, así que esto no adivina una
 * forma: busca las parejas día/horas donde suelen estar y, si no las
 * reconoce, devuelve nada y la vista enseña la respuesta cruda. Cuando el
 * contrato exista, se cambia solo esta función.
 */
function horasDe(respuesta: unknown): Fila[] {
  const esDia = (k: string) => /fecha|dia|day|date/i.test(k);
  const esHora = (k: string) => /hora|hour|cant|valor/i.test(k);
  const filas: Fila[] = [];

  const mirar = (v: unknown, hondo = 0): void => {
    if (!v || typeof v !== 'object' || hondo > 3) return;
    if (Array.isArray(v)) { v.forEach(x => mirar(x, hondo + 1)); return; }
    const o = v as Record<string, unknown>;
    const kDia = Object.keys(o).find(esDia);
    const kHora = Object.keys(o).find(esHora);
    if (kDia && kHora && typeof o[kHora] !== 'object') {
      filas.push({ dia: String(o[kDia]), horas: String(o[kHora]) });
      return;
    }
    Object.values(o).forEach(x => mirar(x, hondo + 1));
  };
  mirar(respuesta);
  return filas;
}

export default function TrPublico() {
  const [correo, setCorreo] = useState('');
  const [persona, setPersona] = useState<string | null>(null);
  const [errorCorreo, setErrorCorreo] = useState('');
  const [comprobando, setComprobando] = useState(false);
  // El día lo saca el lector de la propia captura. Solo se pide a mano si no
  // lo consigue, y entonces se pregunta por la captura concreta que falló.
  const [fecha, setFecha] = useState('');
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [errorEnvio, setErrorEnvio] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  // Cuando la persona se elige en el buscador, se manda su identificador: la
  // vista no llega a ver el correo completo de nadie.
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [hallados, setHallados] = useState<Hallado[] | null>(null);
  const [deOtro, setDeOtro] = useState(false);

  // La cuenta de Google del navegador, si la hay.
  //
  // No hay forma de leer «el correo con el que está iniciado este Chrome»: el
  // navegador no lo da. Lo más cerca es One Tap, que enseña la cuenta y la
  // persona la toca una vez; a cambio, no tiene que escribir nada. Si no está
  // configurado el cliente de Google, esto no hace nada y la vista funciona
  // como siempre.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cfg = await (await fetch('/api/auth/config')).json();
        const clientId: string | undefined = cfg?.googleClientId;
        if (!clientId || !vivo) return;
        await cargarGis();
        const gis = (window as VentanaGoogle).google?.accounts?.id;
        if (!gis || !vivo) return;
        gis.initialize({
          client_id: clientId,
          auto_select: true,
          use_fedcm_for_prompt: true,
          callback: ({ credential }: { credential?: string }) => {
            const c = correoDeToken(credential);
            if (c && vivo) { setCorreo(c); comprobarCorreo(c); }
          },
        });
        gis.prompt();
      } catch { /* sin cuenta detectada: se escribe o se busca, como siempre */ }
    })();
    return () => { vivo = false; };
    // Solo al abrir la vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function comprobarCorreo(cual?: string) {
    const c = (cual ?? correo).trim().toLowerCase();
    setPersona(null); setPersonaId(null); setErrorCorreo('');
    if (!c) return;
    setComprobando(true);
    try {
      const r = await fetch(`/api/tr/persona?correo=${encodeURIComponent(c)}`);
      if (r.ok) setPersona((await r.json()).nombre);
      else if (r.status === 404) {
        // Pasa con la cuenta personal de Google en el celular. En vez de
        // dejarlo en «ese correo no sirve», se abre el buscador por nombre.
        setErrorCorreo('Ese correo no está en el equipo. Búscate por tu nombre.');
        setBuscando(true);
      } else setErrorCorreo('No se pudo comprobar el correo. Intenta de nuevo.');
    } catch {
      setErrorCorreo('Sin conexión con el servidor.');
    } finally { setComprobando(false); }
  }

  async function buscar(q: string) {
    setBusqueda(q);
    if (q.trim().length < 2) { setHallados(null); return; }
    try {
      const r = await fetch(`/api/tr/buscar?q=${encodeURIComponent(q.trim())}`);
      setHallados(r.ok ? (await r.json()).personas ?? [] : []);
    } catch { setHallados([]); }
  }

  function elegir(h: Hallado) {
    setPersonaId(h.id); setPersona(h.nombre); setCorreo(h.correo);
    setErrorCorreo(''); setBuscando(false); setHallados(null); setBusqueda('');
  }

  function agregar(files: FileList | null) {
    if (!files) return;
    const nuevas: Promise<Captura | null>[] = [...files].slice(0, MAX_IMAGENES).map(f => new Promise(res => {
      if (!f.type.startsWith('image/')) return res(null);
      if (f.size > MAX_BYTES) return res(null);
      const fr = new FileReader();
      fr.onload = () => res({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2,7)}`,
                              nombre: f.name, contenido: String(fr.result), peso: f.size });
      fr.onerror = () => res(null);
      fr.readAsDataURL(f);
    }));
    Promise.all(nuevas).then(lista => {
      const buenas = lista.filter(Boolean) as Captura[];
      const descartadas = lista.length - buenas.length;
      if (descartadas > 0) setErrorEnvio(`${descartadas} archivo${descartadas>1?'s':''} no se pudo usar: solo imágenes de menos de 6 MB.`);
      setCapturas(prev => [...prev, ...buenas].slice(0, MAX_IMAGENES));
    });
  }

  /**
   * Una petición por captura, de tres en tres.
   *
   * El lector tarda medio minuto larga por imagen y CloudFront corta la
   * petición al minuto, así que mandarlas todas juntas devolvía un 504 en
   * cuanto eran más de dos, aunque al otro lado se hubieran leído bien.
   * Partidas, ninguna petición se acerca al límite y los resultados van
   * apareciendo según llegan en vez de todos al final.
   */
  async function enviar() {
    setEnviando(true); setErrorEnvio(''); setResultados([]);
    const envio = `e-${Date.now().toString(36)}`;
    const pendientes = [...capturas];
    const hechos: Resultado[] = [];
    let falloRed = false;

    const obrero = async () => {
      for (;;) {
        const c = pendientes.shift();
        if (!c) return;
        try {
          const r = await fetch('/api/tr/registro', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              ...(personaId ? { persona_id: personaId } : { correo: correo.trim().toLowerCase() }),
              envio,
              ...(fecha ? { fecha } : {}),
              capturas: [{ nombre: c.nombre, contenido: c.contenido }] }),
          });
          const cuerpo = await r.json().catch(() => ({}));
          const res: Resultado = r.ok
            ? (cuerpo.resultados?.[0] ?? { captura: c.nombre, estado: 'OK' })
            : { captura: c.nombre, estado: 'ERROR_SCRIPT', detalle: cuerpo.detail ?? `Error ${r.status}` };
          hechos.push(res);
        } catch {
          falloRed = true;
          hechos.push({ captura: c.nombre, estado: 'ERROR_RED' });
        }
        // Se vuelca en cada vuelta: con veinte capturas, ver la primera a los
        // treinta segundos es la diferencia entre esperar y pensar que colgó.
        setResultados([...hechos]);
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(EN_VUELO, capturas.length) }, obrero));
      if (falloRed) setErrorEnvio('Algunas capturas no se pudieron enviar. Revisa tu conexión y vuelve a intentarlo con esas.');
      setCapturas([]);
    } finally { setEnviando(false); }
  }

  const listo = !!persona && capturas.length > 0 && !enviando;
  const totalEnvio = capturas.length || (resultados?.length ?? 0);

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', padding:'28px 16px 60px' }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <TimiaMark size={30} bg="none"/><TimiaWordmark variant="dark" height={20}/>
        </div>

        <div style={{ ...card, padding:'22px 22px 24px' }}>
          <h1 style={{ margin:0, fontSize:19, fontWeight:700, letterSpacing:'-.3px' }}>Registrar mi TR</h1>
          <p style={{ margin:'5px 0 20px', fontSize:12.5, color:'#64748b', lineHeight:1.6 }}>
            Sube las capturas de tu Time Report. El día se lee de la propia imagen,
            así que puedes mandar varios días de una vez. No hace falta iniciar sesión.
          </p>

          {/* Correo */}
          <label style={{ display:'block', marginBottom:14 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#475569' }}>Tu correo de Timia</span>
            <input type="email" value={correo} inputMode="email" autoComplete="email"
              placeholder="nombre.apellido@timia.ai"
              onChange={e => { setCorreo(e.target.value); setPersona(null); setErrorCorreo(''); }}
              onBlur={comprobarCorreo}
              onKeyDown={e => { if (e.key === 'Enter') comprobarCorreo(); }}
              style={{ ...input, marginTop:5,
                       borderColor: errorCorreo ? '#fca5a5' : persona ? '#86efac' : '#cbd5e1' }}/>
            {comprobando && (
              <span style={{ fontSize:11, color:'#64748b', display:'flex', alignItems:'center', gap:4, marginTop:5 }}>
                <Loader2 size={11} className="animate-spin"/> Comprobando…</span>
            )}
            {persona && (
              <span style={{ fontSize:11.5, color:'#047857', display:'flex', alignItems:'center', gap:4, marginTop:5 }}>
                <CheckCircle size={12}/> {persona}</span>
            )}
            {errorCorreo && (
              <span style={{ fontSize:11.5, color:'#b91c1c', display:'flex', alignItems:'flex-start', gap:4, marginTop:5, lineHeight:1.5 }}>
                <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }}/> {errorCorreo}</span>
            )}
            {personaId && deOtro && (
              <span style={{ fontSize:11, color:'#64748b', marginTop:5, display:'block' }}>
                Se registrará a nombre de {persona}, no al tuyo.</span>
            )}
          </label>

          {/* Buscar por nombre: para quien no recuerda su correo exacto y para
              subir el TR de otra persona. */}
          {!buscando ? (
            <button type="button"
              onClick={() => { setBuscando(true); setDeOtro(!!persona); }}
              style={{ marginBottom:14, padding:0, border:'none', background:'none', cursor:'pointer',
                       fontSize:11.5, color:'#6d28d9', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              {persona ? <><UserPlus size={12}/> Subir el TR de otra persona</>
                       : <><Search size={12}/> No recuerdo mi correo, buscarme por nombre</>}
            </button>
          ) : (
            <div style={{ marginBottom:14, padding:'12px 13px', borderRadius:10,
                          background:'#faf8ff', border:'0.5px solid #e9e2fb' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:600, color:'#5b21b6' }}>
                  {deOtro ? 'Buscar a la persona' : 'Buscarme por nombre'}</span>
                <button type="button" onClick={() => { setBuscando(false); setBusqueda(''); setHallados(null); }}
                  style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:0,
                           display:'flex' }} title="Cerrar"><X size={13}/></button>
              </div>
              <input value={busqueda} autoComplete="off" placeholder="Nombre o apellido"
                onChange={e => buscar(e.target.value)}
                style={{ ...input, marginTop:7, borderColor:'#ddd0fb' }}/>
              {hallados && hallados.length === 0 && busqueda.trim().length >= 2 && (
                <p style={{ margin:'8px 0 0', fontSize:11, color:'#64748b' }}>
                  Nadie con ese nombre. Pídele a tu líder que te den de alta.</p>
              )}
              {hallados && hallados.length > 0 && (
                <div style={{ marginTop:8, display:'grid', gap:5 }}>
                  {hallados.map(h => (
                    <button key={h.id} type="button" onClick={() => elegir(h)}
                      style={{ textAlign:'left', padding:'8px 11px', borderRadius:8, cursor:'pointer',
                               border:'0.5px solid #e2e8f0', background:'#fff', display:'flex',
                               flexDirection:'column', gap:1 }}>
                      <span style={{ fontSize:12.5, fontWeight:600, color:'#1e293b' }}>{h.nombre}</span>
                      <span style={{ fontSize:10.5, color:'#94a3b8' }}>{h.correo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Capturas */}
          <div style={{ marginBottom:16 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#475569' }}>
              Capturas{capturas.length > 0 && ` · ${capturas.length} de ${MAX_IMAGENES}`}
            </span>
            <button type="button" onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setEncima(true); }}
              onDragLeave={() => setEncima(false)}
              onDrop={e => { e.preventDefault(); setEncima(false); agregar(e.dataTransfer.files); }}
              style={{ width:'100%', marginTop:5, padding:'20px 14px', borderRadius:11, cursor:'pointer',
                       border:`1.5px dashed ${encima ? '#6d28d9' : '#cbd5e1'}`,
                       background: encima ? '#faf8ff' : '#fcfcfd', display:'flex',
                       flexDirection:'column', alignItems:'center', gap:6 }}>
              <Camera size={20} color={encima ? '#6d28d9' : '#94a3b8'}/>
              <span style={{ fontSize:12.5, color:'#475569', fontWeight:600 }}>
                {encima ? 'Suelta aquí' : 'Tomar foto, elegir o arrastrar imágenes'}</span>
              <span style={{ fontSize:11, color:'#94a3b8' }}>
                Hasta {MAX_IMAGENES} a la vez, de días distintos si hace falta</span>
            </button>
            {/* capture permite abrir la cámara directamente en el celular */}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => { agregar(e.target.files); e.target.value = ''; }}/>

            {capturas.length > 0 && (
              <div style={{ display:'grid', gap:7, gridTemplateColumns:'repeat(auto-fill, minmax(92px, 1fr))', marginTop:9 }}>
                {capturas.map(c => (
                  <div key={c.id} style={{ position:'relative', borderRadius:9, overflow:'hidden',
                                           border:'0.5px solid #e2e8f0', background:'#fff' }}>
                    <img src={c.contenido} alt={c.nombre}
                      style={{ width:'100%', height:68, objectFit:'cover', display:'block' }}/>
                    <button type="button" title="Quitar"
                      onClick={() => setCapturas(p => p.filter(x => x.id !== c.id))}
                      style={{ position:'absolute', top:3, right:3, width:19, height:19, borderRadius:'50%',
                               border:'none', background:'rgba(15,23,42,.65)', color:'#fff', cursor:'pointer',
                               display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <X size={11}/></button>
                    <div style={{ fontSize:8.5, color:'#94a3b8', padding:'3px 5px', overflow:'hidden',
                                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorEnvio && (
            <div style={{ padding:'10px 13px', borderRadius:9, background:'#fef2f2',
                          border:'0.5px solid #fecaca', marginBottom:14, fontSize:12, color:'#991b1b',
                          display:'flex', gap:6, lineHeight:1.5 }}>
              <AlertTriangle size={13} style={{ flexShrink:0, marginTop:1 }}/>{errorEnvio}
            </div>
          )}

          <button type="button" disabled={!listo} onClick={enviar}
            style={{ width:'100%', padding:'12px', fontSize:14, fontWeight:600, borderRadius:10, border:'none',
                     background: listo ? '#6d28d9' : '#e2e8f0', color: listo ? '#fff' : '#94a3b8',
                     cursor: listo ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center',
                     justifyContent:'center', gap:7 }}>
            {enviando
              ? <><Loader2 size={15} className="animate-spin"/> Leyendo {(resultados?.length ?? 0) + 1} de {totalEnvio}…</>
              : <><Upload size={15}/> Enviar {capturas.length > 1 ? `las ${capturas.length} capturas` : ''}</>}
          </button>

          {!persona && correo.trim() && !errorCorreo && !comprobando && (
            <p style={{ margin:'9px 0 0', fontSize:11, color:'#94a3b8', textAlign:'center' }}>
              Confirma tu correo para poder enviar.</p>
          )}
        </div>

        {/* Resultado */}
        {resultados && (
          <div style={{ ...card, padding:'18px 20px', marginTop:14 }}>
            <h2 style={{ margin:'0 0 10px', fontSize:14, fontWeight:700 }}>
              {resultados.length === 1 ? 'Tu captura' : `Tus ${resultados.length} capturas`}
            </h2>
            {resultados.map((r, i) => {
              const e = explica(r);
              const col = e.tono === 'ok' ? { bg:'#f0fdf4', bd:'#bbf7d0', tx:'#047857' }
                        : e.tono === 'aviso' ? { bg:'#fffbeb', bd:'#fde68a', tx:'#92400e' }
                        : { bg:'#fef2f2', bd:'#fecaca', tx:'#991b1b' };
              const filas = horasDe(r.respuesta);
              return (
                <div key={i} style={{ padding:'9px 12px', borderRadius:9, background:col.bg,
                                      border:`0.5px solid ${col.bd}`, marginBottom:6 }}>
                  <div style={{ fontSize:11.5, fontWeight:600, color:col.tx }}>{r.captura}</div>
                  <div style={{ fontSize:11.5, color:col.tx, marginTop:2, lineHeight:1.5 }}>{e.texto}</div>
                  {filas.length > 0 && (
                    <table style={{ width:'100%', marginTop:7, borderCollapse:'collapse', fontSize:11.5 }}>
                      <tbody>
                        {filas.map((f, j) => (
                          <tr key={j}>
                            <td style={{ padding:'3px 0', color:col.tx, opacity:0.85 }}>{f.dia}</td>
                            <td style={{ padding:'3px 0', color:col.tx, fontWeight:600, textAlign:'right',
                                         fontVariantNumeric:'tabular-nums' }}>{f.horas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => { setResultados(null); setFecha(''); }}
              style={{ marginTop:8, padding:'8px 14px', fontSize:12, fontWeight:600, borderRadius:8,
                       border:'0.5px solid #e2e8f0', background:'#fff', color:'#475569', cursor:'pointer' }}>
              Subir más capturas</button>
          </div>
        )}

        <p style={{ margin:'18px 0 0', fontSize:10.5, color:'#94a3b8', textAlign:'center', lineHeight:1.6 }}>
          Las capturas se envían al lector del equipo y quedan registradas a tu nombre.
          Solo se aceptan correos @timia.ai dados de alta.
        </p>
      </div>
    </div>
  );
}
