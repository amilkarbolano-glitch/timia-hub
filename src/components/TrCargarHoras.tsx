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

const thFijo: React.CSSProperties = { padding:'4px 8px', fontSize:9, color:'#94a3b8', textAlign:'left',
  position:'sticky', left:0, background:'#fafafa', zIndex:1, minWidth:150,
  borderBottom:'0.5px solid #e2e8f0', borderRight:'0.5px solid #e2e8f0' };
const tdFijo: React.CSSProperties = { padding:'4px 8px', fontSize:10, textAlign:'left', whiteSpace:'nowrap',
  position:'sticky', left:0, background:'#fff', zIndex:1,
  borderBottom:'0.5px solid #f1f5f9', borderRight:'0.5px solid #e2e8f0' };

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];

/** Agrupa los días por mes para la cabecera de la vista previa. */
function mesesDe(dias: string[]): { nombre: string; cuantos: number }[] {
  const out: { nombre: string; cuantos: number }[] = [];
  for (const d of dias) {
    const nombre = MESES[Number(d.slice(5, 7)) - 1];
    const ultimo = out[out.length - 1];
    if (ultimo?.nombre === nombre) ultimo.cuantos++;
    else out.push({ nombre, cuantos: 1 });
  }
  return out;
}

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

          {/* Vista previa: lo que se va a guardar, antes de guardarlo.
              Es un trimestre entero de horas; ver solo contadores no basta
              para confiar en que se leyó bien. */}
          <div style={{ border:'0.5px solid #f1f5f9', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', fontSize:10 }}>
                <thead>
                  {/* Meses, para no perderse entre 61 columnas */}
                  <tr style={{ background:'#fafafa' }}>
                    <th style={{ ...thFijo, borderBottom:'none' }}/>
                    {mesesDe(leido.dias).map(m => (
                      <th key={m.nombre} colSpan={m.cuantos}
                        style={{ padding:'4px 0', fontSize:9, fontWeight:700, color:'#64748b',
                                 textTransform:'uppercase', letterSpacing:'.05em',
                                 borderBottom:'0.5px solid #f1f5f9',
                                 borderLeft:'0.5px solid #f1f5f9' }}>{m.nombre}</th>
                    ))}
                  </tr>
                  <tr style={{ background:'#fafafa' }}>
                    <th style={thFijo}>Puesto</th>
                    {leido.dias.map(d => (
                      <th key={d} title={d}
                        style={{ padding:'3px 0', minWidth:17, fontSize:8, fontWeight:600,
                                 color:'#94a3b8', borderBottom:'0.5px solid #e2e8f0' }}>
                        {d.slice(8)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leido.puestos.map(p => (
                    <React.Fragment key={p.id}>
                      <tr>
                        <td style={tdFijo}>
                          <div style={{ fontWeight:700, color:'#111' }}>{p.sda} #{p.numero}</div>
                          <div style={{ fontSize:8.5, color:'#94a3b8' }}>{p.rol}</div>
                          <div style={{ fontSize:8.5, color: elegido[p.persona ?? ''] ? '#047857' : '#b45309' }}>
                            {elegido[p.persona ?? ''] ?? p.persona ?? 'sin asignar'}</div>
                        </td>
                        {leido.dias.map(d => {
                          const h = p.horasPorDia[d];
                          return (
                            <td key={d} title={`${d}: ${h ?? 0} h`}
                              style={{ textAlign:'center', padding:'2px 0',
                                       borderBottom:'0.5px solid #f8fafc',
                                       background: h ? '#eef2ff' : '#fff',
                                       color: h ? '#4338ca' : '#e2e8f0',
                                       fontWeight: h ? 600 : 400 }}>{h ?? '·'}</td>
                          );
                        })}
                      </tr>
                      {(p.coberturas ?? []).map((c, i) => (
                        <tr key={`${p.id}-c${i}`}>
                          <td style={{ ...tdFijo, paddingLeft:16 }}>
                            <div style={{ fontSize:9, color:'#92400e' }}>
                              cubre: {elegido[c.persona] ?? c.persona}</div>
                            {!c.dias.length && (
                              <div style={{ fontSize:8, color:'#b45309' }}>sin días marcados</div>
                            )}
                          </td>
                          {leido.dias.map(d => (
                            <td key={d} style={{ textAlign:'center', padding:'2px 0',
                                   borderBottom:'0.5px solid #f8fafc',
                                   background: c.dias.includes(d) ? '#fef3c7' : '#fff',
                                   color:'#b45309', fontSize:8 }}>
                              {c.dias.includes(d) ? '●' : ''}</td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'5px 10px', fontSize:9.5, color:'#94a3b8',
                          borderTop:'0.5px solid #f1f5f9', background:'#fcfcfd' }}>
              Horas contratadas por día. Total del trimestre:{' '}
              <b style={{ color:'#475569' }}>
                {leido.puestos.reduce((s, p) => s + Object.values(p.horasPorDia).reduce((a: number, b: number) => a + b, 0), 0)} h
              </b>
              {leido.puestos.some(p => (p.coberturas ?? []).some(c => !c.dias.length)) &&
                ' · las coberturas sin días marcados quedan como suplentes'}
            </div>
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
