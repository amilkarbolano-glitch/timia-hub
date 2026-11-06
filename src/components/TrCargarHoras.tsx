// ─── Carga del anexo de horas ────────────────────────────────────────────────
// Una sola pantalla: sueltas el Excel y ya. Lo que se lee se muestra en una
// línea, y solo se pregunta lo que de verdad no se puede resolver solo — los
// nombres que no encajan con nadie del equipo.
//
// Nada de asistentes por pasos: el líder hace esto una vez por trimestre y no
// tiene por qué aprenderse un flujo.

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react';
import { leerPlantilla, aplicarCorreos, type Hoja } from '../lib/trPlanImport';
import { trPlanStore, diferencias, emparejar,
         type PuestoAnexo, type TrimestreHoras, type Candidato } from '../lib/trPlan';

const card: React.CSSProperties = { background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12 };
const chip = (bg: string, c: string): React.CSSProperties => ({
  fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:6, background:bg, color:c });

/** El trimestre que cubre un conjunto de días. Se deduce; no se pregunta. */
function trimestreDe(dias: string[]): TrimestreHoras {
  const inicio = dias[0], fin = dias[dias.length - 1];
  const d = new Date(inicio + 'T12:00:00');
  const q = Math.floor(d.getMonth() / 3) + 1;
  return { id: `${d.getFullYear()}-Q${q}`, label: `Q${q} ${d.getFullYear()}`, inicio, fin };
}

interface Leido {
  puestos: PuestoAnexo[];
  dias: string[];
  avisos: string[];
  trimestre: TrimestreHoras;
  /** Nombre del Excel → correo propuesto (o '' si no se encontró). */
  propuestas: Record<string, { email: string; confianza: 'alta'|'media' } | null>;
  archivo: string;
}

export default function TrCargarHoras({ equipo, puedeEditar }: {
  equipo: Candidato[]; puedeEditar: boolean;
}) {
  const [leido, setLeido] = useState<Leido | null>(null);
  const [elegido, setElegido] = useState<Record<string, string>>({});
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function leerArchivo(file: File) {
    setLeyendo(true); setError(''); setGuardado(''); setLeido(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const hoja = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]],
        { header: 1, raw: true, defval: null }) as Hoja;

      const pre = leerPlantilla(hoja, 'tmp');
      if (!pre.dias.length) { setError(pre.avisos[0] ?? 'No pude leer el archivo.'); return; }

      const t = trimestreDe(pre.dias);
      const r = leerPlantilla(hoja, t.id);

      // Lo que ya se confirmó antes no se vuelve a preguntar.
      const alias = trPlanStore.alias();
      const propuestas: Leido['propuestas'] = {};
      const yaElegido: Record<string, string> = {};
      for (const n of r.nombres) {
        if (alias[n]) { yaElegido[n] = alias[n]; propuestas[n] = { email: alias[n], confianza: 'alta' }; continue; }
        const m = emparejar(n, equipo);
        propuestas[n] = m;
        if (m?.confianza === 'alta') yaElegido[n] = m.email;
      }
      setElegido(yaElegido);
      setLeido({ ...r, trimestre: t, propuestas, archivo: file.name });
    } catch (e) {
      setError('No pude abrir el archivo. ¿Es un .xlsx?');
    } finally { setLeyendo(false); }
  }

  function guardar() {
    if (!leido || !puedeEditar) return;
    const puestos = aplicarCorreos(leido.puestos, elegido);
    const otros = trPlanStore.puestos().filter(p => p.trimestreId !== leido.trimestre.id);
    trPlanStore.guardarPuestos([...otros, ...puestos]);

    const ts = trPlanStore.trimestres().filter(t => t.id !== leido.trimestre.id);
    trPlanStore.guardarTrimestres([...ts, leido.trimestre]);

    // Los nombres confirmados se recuerdan: la próxima carga ya no pregunta.
    trPlanStore.guardarAlias({ ...trPlanStore.alias(), ...elegido });

    setGuardado(`${puestos.length} puesto${puestos.length!==1?'s':''} de ${leido.trimestre.label}`);
    setLeido(null);
  }

  const previos = leido ? trPlanStore.puestos().filter(p => p.trimestreId === leido.trimestre.id) : [];
  const cambios = leido && previos.length ? diferencias(previos, leido.puestos) : [];
  // Solo se pregunta por quien no se pudo resolver solo: sin propuesta, o con
  // una propuesta dudosa que nadie ha confirmado todavía.
  const sinResolver = leido
    ? Object.keys(leido.propuestas).filter(n => !elegido[n])
    : [];

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Soltar el archivo */}
      <div
        onDragOver={e => { e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) leerArchivo(f); }}
        onClick={() => fileRef.current?.click()}
        style={{ ...card, padding:'26px 20px', borderStyle:'dashed', borderWidth:1.5,
                 borderColor:'#cbd5e1', cursor:'pointer', textAlign:'center' }}>
        {leyendo ? (
          <span style={{ fontSize:13, color:'#6d28d9', display:'inline-flex', alignItems:'center', gap:7 }}>
            <Loader2 size={15} className="animate-spin"/> Leyendo el archivo…</span>
        ) : (
          <>
            <FileSpreadsheet size={22} color="#94a3b8" style={{ margin:'0 auto 7px', display:'block' }}/>
            <div style={{ fontSize:13.5, fontWeight:600, color:'#374151' }}>
              Suelta aquí la plantilla de carga de horas</div>
            <div style={{ fontSize:11.5, color:'#94a3b8', marginTop:3 }}>
              El mismo Excel que manejas hoy, sin cambiarle nada</div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) leerArchivo(f); e.target.value=''; }}/>

      {error && (
        <div style={{ ...card, padding:'11px 14px', marginTop:10, background:'#fef2f2',
                      borderColor:'#fecaca', fontSize:12, color:'#991b1b', display:'flex', gap:7 }}>
          <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }}/>{error}
        </div>
      )}

      {guardado && (
        <div style={{ ...card, padding:'11px 14px', marginTop:10, background:'#f0fdf4',
                      borderColor:'#bbf7d0', fontSize:12.5, color:'#047857', display:'flex', gap:7 }}>
          <CheckCircle size={14} style={{ flexShrink:0, marginTop:1 }}/> Cargado: {guardado}.
        </div>
      )}

      {/* Lo que se leyó: una línea, no un informe */}
      {leido && (
        <div style={{ ...card, padding:'16px 18px', marginTop:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            <span style={{ fontSize:13.5, fontWeight:700 }}>{leido.trimestre.label}</span>
            <span style={chip('#f1f5f9','#475569')}>{leido.puestos.length} puestos</span>
            <span style={chip('#f1f5f9','#475569')}>{leido.dias.length} días hábiles</span>
            <span style={chip('#f1f5f9','#475569')}>
              {[...new Set(leido.puestos.map(p => p.sda))].length} SDA</span>
            {!!cambios.length && <span style={chip('#fffbeb','#92400e')}>{cambios.length} cambios</span>}
            <span style={{ marginLeft:'auto', fontSize:10.5, color:'#94a3b8' }}>{leido.archivo}</span>
          </div>

          {/* Solo se pregunta lo que no se pudo resolver */}
          {sinResolver.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:6 }}>
                ¿Quién es {sinResolver.length === 1 ? 'esta persona' : 'cada una'}?
              </div>
              {sinResolver.map(n => (
                <div key={n} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:11.5, color:'#475569', flex:1, minWidth:0, overflow:'hidden',
                                 textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n}</span>
                  <select value={elegido[n] ?? ''} onChange={e => setElegido(p => ({ ...p, [n]: e.target.value }))}
                    style={{ fontSize:11.5, padding:'5px 8px', borderRadius:7,
                             border:'0.5px solid #e2e8f0', minWidth:210 }}>
                    <option value="">— no está en el equipo —</option>
                    {equipo.map(c => <option key={c.email} value={c.email}>{c.nombre} · {c.email}</option>)}
                  </select>
                </div>
              ))}
              <p style={{ margin:'4px 0 0', fontSize:10.5, color:'#94a3b8' }}>
                Lo que elijas se recuerda: la próxima carga ya no pregunta.
              </p>
            </div>
          )}

          {/* Qué cambia respecto a lo ya cargado */}
          {!!cambios.length && (
            <details style={{ marginBottom:12 }}>
              <summary style={{ fontSize:11.5, color:'#92400e', cursor:'pointer', fontWeight:600 }}>
                {cambios.length} cambio{cambios.length!==1?'s':''} sobre lo que ya estaba cargado
              </summary>
              <div style={{ marginTop:6 }}>
                {cambios.slice(0, 12).map((c, i) => (
                  <div key={i} style={{ fontSize:11, color:'#78350f', padding:'3px 0' }}>
                    <b>{c.sda} #{c.numero}</b> · {c.tipo === 'entra' ? 'entra' : c.tipo === 'sale' ? 'sale' : c.detalle}
                    {c.tipo !== 'cambia' && ` · ${c.detalle}`}
                  </div>
                ))}
                {cambios.length > 12 && (
                  <div style={{ fontSize:10.5, color:'#a78bfa' }}>y {cambios.length - 12} más</div>
                )}
              </div>
            </details>
          )}

          {/* Avisos del lector, plegados: informan pero no estorban */}
          {!!leido.avisos.length && (
            <details style={{ marginBottom:12 }}>
              <summary style={{ fontSize:11.5, color:'#64748b', cursor:'pointer' }}>
                {leido.avisos.length} nota{leido.avisos.length!==1?'s':''} de la lectura
              </summary>
              <ul style={{ margin:'6px 0 0', paddingLeft:18 }}>
                {leido.avisos.map((a, i) => (
                  <li key={i} style={{ fontSize:11, color:'#64748b', lineHeight:1.6 }}>{a}</li>
                ))}
              </ul>
            </details>
          )}

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={guardar} disabled={!puedeEditar}
              style={{ padding:'9px 18px', fontSize:13, fontWeight:600, borderRadius:9, border:'none',
                       background: puedeEditar ? '#6d28d9' : '#e2e8f0',
                       color: puedeEditar ? '#fff' : '#94a3b8',
                       cursor: puedeEditar ? 'pointer' : 'not-allowed',
                       display:'flex', alignItems:'center', gap:6 }}>
              <Upload size={14}/> Cargar {leido.trimestre.label}</button>
            <button onClick={() => setLeido(null)}
              style={{ padding:'9px 14px', fontSize:12.5, borderRadius:9, border:'0.5px solid #e2e8f0',
                       background:'#fff', color:'#475569', cursor:'pointer' }}>Cancelar</button>
            {!puedeEditar && (
              <span style={{ fontSize:11, color:'#94a3b8' }}>Necesitas permiso para cargar horas.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
