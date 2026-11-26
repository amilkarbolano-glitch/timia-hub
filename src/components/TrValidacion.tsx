// ─── Validación: lo capturado contra el anexo ────────────────────────────────
// Las dos mitades del TR existían sin hablarse: por un lado la plantilla de
// los líderes (qué se contrató, en qué SDA, cuántas horas por día) y por otro
// las capturas que sube la gente. Aquí se cruzan.
//
// Lo que no cuadra no es todo el mismo problema, así que no se enseña junto:
// cargar horas a un SDA ajeno es un error de imputación y frena; que el OCR
// lea 6 donde la plantilla espera 8 es algo que mira una persona; y un día sin
// captura todavía se puede subir.

import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, AlertTriangle, Clock, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { persistGet, persistRefresh } from '../lib/persist';
import { trPlanStore, personasDelPlan, type TrimestreHoras } from '../lib/trPlan';
import { validar, resumenHallazgos, type Hallazgo, type Gravedad, type RegistroTr } from '../lib/trLectura';

const K_REGISTROS = 'timia_tr_registros';

const TONO: Record<Gravedad, { bg: string; bd: string; tx: string; titulo: string; icono: React.ReactNode }> = {
  bloquea:  { bg:'#fef2f2', bd:'#fecaca', tx:'#991b1b', titulo:'Hay que corregirlo antes de cargar',
              icono:<ShieldAlert size={13}/> },
  avisa:    { bg:'#fffbeb', bd:'#fde68a', tx:'#92400e', titulo:'Para revisar con la persona',
              icono:<AlertTriangle size={13}/> },
  recuerda: { bg:'#f8fafc', bd:'#e2e8f0', tx:'#475569', titulo:'Todavía se puede subir',
              icono:<Clock size={13}/> },
};

const ORDEN: Gravedad[] = ['bloquea', 'avisa', 'recuerda'];
const diaCorto = (iso?: string) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';

export default function TrValidacion({ festivos, equipo }: {
  festivos: Set<string>;
  equipo: { email: string; nombre: string }[];
}) {
  const [cargando, setCargando] = useState(true);
  const [registros, setRegistros] = useState<RegistroTr[]>([]);
  const trimestres = useMemo(() => trPlanStore.trimestres(), []);
  const puestos = useMemo(() => trPlanStore.puestos(), []);
  const [trimestreId, setTrimestreId] = useState<string>(() => trimestres.at(-1)?.id ?? '');
  const [persona, setPersona] = useState<string>('');

  const leer = React.useCallback(async () => {
    setCargando(true);
    // Las capturas entran por la vista pública, o sea que el servidor las
    // escribe después de que esta sesión arrancó: lo que haya en memoria es
    // de hace rato.
    await persistRefresh(K_REGISTROS);
    setRegistros(persistGet<RegistroTr[]>(K_REGISTROS, []));
    setCargando(false);
  }, []);

  useEffect(() => { void leer(); }, [leer]);

  const t: TrimestreHoras | undefined = trimestres.find(x => x.id === trimestreId);
  const personas = useMemo(
    () => t ? personasDelPlan(puestos, t.id) : [],
    [puestos, t]);

  useEffect(() => {
    if (personas.length && !personas.includes(persona)) setPersona(personas[0]);
  }, [personas, persona]);

  const hallazgos: Hallazgo[] = useMemo(
    () => (t && persona) ? validar(registros, puestos, persona, t, festivos) : [],
    [registros, puestos, persona, t, festivos]);

  const resumen = useMemo(() => resumenHallazgos(hallazgos), [hallazgos]);
  const nombreDe = (correo: string) =>
    equipo.find(e => e.email.toLowerCase() === correo.toLowerCase())?.nombre ?? correo;

  if (!trimestres.length || !puestos.length) {
    return (
      <div style={{ padding:'30px 20px', textAlign:'center', fontSize:12, color:'#64748b', lineHeight:1.7 }}>
        Todavía no hay anexo cargado.<br/>
        Carga la plantilla de horas en <strong>Horas del anexo</strong> y aquí aparecerá
        el contraste contra lo que suba la gente.
      </div>
    );
  }

  return (
    <div>
      {/* Controles */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <select value={trimestreId} onChange={e => setTrimestreId(e.target.value)}
          style={{ padding:'6px 9px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:7, background:'#fff' }}>
          {trimestres.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <select value={persona} onChange={e => setPersona(e.target.value)}
          style={{ padding:'6px 9px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:7,
                   background:'#fff', maxWidth:260 }}>
          {personas.map(p => <option key={p} value={p}>{nombreDe(p)}</option>)}
        </select>
        <button type="button" onClick={() => void leer()} disabled={cargando}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 11px', fontSize:11, fontWeight:600,
                   borderRadius:7, border:'0.5px solid #e2e8f0', background:'#fff', color:'#475569',
                   cursor: cargando ? 'default' : 'pointer' }}>
          {cargando ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>}
          Actualizar capturas
        </button>
        <span style={{ marginLeft:'auto', fontSize:10.5, color:'#94a3b8' }}>
          {registros.length} carga{registros.length === 1 ? '' : 's'} registrada{registros.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Marcador */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {ORDEN.map(g => (
          <div key={g} style={{ flex:'1 1 150px', padding:'10px 13px', borderRadius:10,
                                background:TONO[g].bg, border:`0.5px solid ${TONO[g].bd}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, color:TONO[g].tx,
                          fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>
              {TONO[g].icono} {g === 'bloquea' ? 'Frena' : g === 'avisa' ? 'Revisar' : 'Pendiente'}
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:TONO[g].tx, marginTop:2 }}>{resumen[g]}</div>
          </div>
        ))}
      </div>

      {hallazgos.length === 0 ? (
        <div style={{ padding:'26px 20px', textAlign:'center', borderRadius:10,
                      background:'#f0fdf4', border:'0.5px solid #bbf7d0' }}>
          <CheckCircle2 size={20} color="#047857"/>
          <p style={{ margin:'7px 0 0', fontSize:12.5, color:'#047857', fontWeight:600 }}>
            Todo cuadra con el anexo.</p>
          <p style={{ margin:'3px 0 0', fontSize:11, color:'#059669' }}>
            {nombreDe(persona)} · {t?.label}</p>
        </div>
      ) : ORDEN.map(g => {
        const grupo = hallazgos.filter(h => h.gravedad === g);
        if (!grupo.length) return null;
        const c = TONO[g];
        return (
          <div key={g} style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:6,
                          color:c.tx, fontSize:11, fontWeight:700 }}>
              {c.icono} {c.titulo} · {grupo.length}
            </div>
            <div style={{ border:`0.5px solid ${c.bd}`, borderRadius:10, overflow:'hidden' }}>
              {grupo.map((h, i) => (
                <div key={i} style={{ display:'flex', alignItems:'baseline', gap:9, padding:'8px 12px',
                                      background: i % 2 ? '#fff' : c.bg,
                                      borderTop: i ? `0.5px solid ${c.bd}` : 'none' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:c.tx, minWidth:38,
                                 fontVariantNumeric:'tabular-nums' }}>{diaCorto(h.fecha)}</span>
                  <span style={{ fontSize:11, color:c.tx, fontWeight:600, minWidth:118 }}>{h.sda ?? ''}</span>
                  <span style={{ fontSize:11, color:c.tx, flex:1, lineHeight:1.5 }}>{h.detalle}</span>
                  {h.tipo === 'horas-distintas' && (
                    <span style={{ fontSize:11, color:c.tx, fontVariantNumeric:'tabular-nums', fontWeight:700 }}>
                      {h.esperado} → {h.real}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p style={{ margin:'16px 0 0', fontSize:10.5, color:'#94a3b8', lineHeight:1.7 }}>
        El SDA sale de lo que devuelve el lector, que lo trae dentro de una línea larga
        («SDATOOL-53017 - Estrategia campañas preaprobados - FICO - …»). Si una captura no
        trae SDA no se puede validar contra el anexo y no aparece aquí: eso se arregla del
        lado del lector, no de este lado.
      </p>
    </div>
  );
}
