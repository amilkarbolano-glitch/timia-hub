// ─── Carga pública de capturas de TR ─────────────────────────────────────────
// Sin sesión a propósito: la gente sube sus capturas desde el celular y pedirles
// iniciar sesión con Google para eso haría que no lo hagan. A cambio, el correo
// se confirma contra el equipo antes de dejar subir nada: un dedazo mandaría las
// horas al limbo y nadie se enteraría hasta fin de mes.
//
// La lectura de la imagen la hace un Apps Script que mantiene otra persona. Su
// URL vive en el servidor, no aquí.

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, Loader2, Camera } from 'lucide-react';
import { TimiaMark, TimiaWordmark } from './TimiaLogo';

const MAX_IMAGENES = 10;
const MAX_BYTES = 6 * 1024 * 1024;

interface Captura { id: string; nombre: string; contenido: string; peso: number }
interface Resultado { captura: string; estado: string; detalle?: string; respuesta?: unknown }

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

  async function comprobarCorreo() {
    const c = correo.trim().toLowerCase();
    setPersona(null); setErrorCorreo('');
    if (!c) return;
    setComprobando(true);
    try {
      const r = await fetch(`/api/tr/persona?correo=${encodeURIComponent(c)}`);
      if (r.ok) setPersona((await r.json()).nombre);
      else setErrorCorreo(r.status === 404
        ? 'Ese correo no está en el equipo. Revísalo o pídele a tu líder que te den de alta.'
        : 'No se pudo comprobar el correo. Intenta de nuevo.');
    } catch {
      setErrorCorreo('Sin conexión con el servidor.');
    } finally { setComprobando(false); }
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

  async function enviar() {
    setEnviando(true); setErrorEnvio(''); setResultados(null);
    try {
      const r = await fetch('/api/tr/registro', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ correo: correo.trim().toLowerCase(),
          ...(fecha ? { fecha } : {}),
          capturas: capturas.map(c => ({ nombre: c.nombre, contenido: c.contenido })) }),
      });
      const cuerpo = await r.json().catch(() => ({}));
      if (!r.ok) { setErrorEnvio(cuerpo.detail ?? `Error ${r.status}`); return; }
      setResultados(cuerpo.resultados ?? []);
      setCapturas([]);
    } catch {
      setErrorEnvio('No se pudo enviar. Revisa tu conexión y vuelve a intentarlo.');
    } finally { setEnviando(false); }
  }

  const listo = !!persona && capturas.length > 0 && !enviando;

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
          </label>

          {/* Capturas */}
          <div style={{ marginBottom:16 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#475569' }}>
              Capturas{capturas.length > 0 && ` · ${capturas.length} de ${MAX_IMAGENES}`}
            </span>
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ width:'100%', marginTop:5, padding:'20px 14px', borderRadius:11, cursor:'pointer',
                       border:'1.5px dashed #cbd5e1', background:'#fcfcfd', display:'flex',
                       flexDirection:'column', alignItems:'center', gap:6 }}>
              <Camera size={20} color="#94a3b8"/>
              <span style={{ fontSize:12.5, color:'#475569', fontWeight:600 }}>Tomar foto o elegir imágenes</span>
              <span style={{ fontSize:11, color:'#94a3b8' }}>Varias a la vez, de días distintos si hace falta</span>
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
            {enviando ? <><Loader2 size={15} className="animate-spin"/> Enviando…</> : <><Upload size={15}/> Enviar</>}
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
              return (
                <div key={i} style={{ padding:'9px 12px', borderRadius:9, background:col.bg,
                                      border:`0.5px solid ${col.bd}`, marginBottom:6 }}>
                  <div style={{ fontSize:11.5, fontWeight:600, color:col.tx }}>{r.captura}</div>
                  <div style={{ fontSize:11.5, color:col.tx, marginTop:2, lineHeight:1.5 }}>{e.texto}</div>
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
