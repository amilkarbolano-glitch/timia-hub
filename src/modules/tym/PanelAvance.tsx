// El panel que se abre al tocar una tarea: mover el avance y dejar la razón.
// El historial es el mismo que guardan los proyectos cerrados, así que al mes
// se puede ver por qué una tarea pasó de 40 a 60.
import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { adminStore } from '../../lib/adminStore';
import { ESTADOS, type EstadoTarea, type PlanTym, type TareaTym } from './tipos';

const ATAJOS = [0, 25, 50, 75, 100];

interface Props {
  plan: PlanTym;
  tarea: TareaTym;
  onGuardar: (cambios: { pct: number; estado: EstadoTarea; responsable?: string }, nota: string) => void;
  onCerrar: () => void;
}

export default function PanelAvance({ plan, tarea, onGuardar, onCerrar }: Props) {
  const [pct, setPct] = useState(tarea.pct);
  const [estado, setEstado] = useState<EstadoTarea>(tarea.estado);
  const [responsable, setResponsable] = useState(tarea.responsable ?? '');
  const [nota, setNota] = useState('');

  const equipo = useMemo(
    () => adminStore.getUsers().filter(u => u.active && u.projectIds.includes(plan.projectId)),
    [plan.projectId],
  );
  const historial = plan.historial[tarea.id] ?? [];

  const campo: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: 44, padding: '0 12px',
    border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 14, background: '#fff', color: '#0f172a',
  };
  const etiqueta: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 };
  const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div role="dialog" aria-modal="true" aria-label={`Actualizar avance de ${tarea.nombre}`}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }}
      onClick={onCerrar}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(960px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#f8fafc',
        borderRadius: 18, boxShadow: '0 24px 60px rgba(15,23,42,.3)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: 18, alignItems: 'flex-start' }}>

          <section style={{ flex: '999 1 430px', minWidth: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 22px 14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Actualizar avance</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  {tarea.bloque || 'General'} · {tarea.nombre}
                </p>
              </div>
              <button onClick={onCerrar} aria-label="Cerrar" style={{ flex: '0 0 auto', width: 44, height: 44, border: 0, background: 'transparent', cursor: 'pointer' }}>
                <X size={17} color="#64748b"/>
              </button>
            </div>

            <div style={{ padding: '20px 22px 22px' }}>
              <fieldset style={{ border: 0, margin: '0 0 18px', padding: 0 }}>
                <legend style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', padding: '0 0 9px' }}>Porcentaje</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignItems: 'center' }}>
                  {ATAJOS.map(v => (
                    <button key={v} onClick={() => setPct(v)} aria-pressed={v === pct} style={{
                      minHeight: 44, padding: '0 15px', borderRadius: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                      border: v === pct ? '1px solid #dc2626' : '1px solid #cbd5e1',
                      background: v === pct ? '#dc2626' : '#fff', color: v === pct ? '#fff' : '#334155',
                    }}>{v}%</button>
                  ))}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                    <label htmlFor="tym-pct" style={{ fontSize: 12.5, color: '#475569' }}>Exacto</label>
                    <input id="tym-pct" type="number" min={0} max={100} value={pct}
                      onChange={e => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      style={{ ...campo, width: 82, textAlign: 'right', fontWeight: 600 }}/>
                  </span>
                </div>
                <span style={{ display: 'block', marginTop: 14, height: 9, borderRadius: 5, background: '#e2e8f0', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 5, background: '#dc2626', width: `${pct}%` }}/>
                </span>
              </fieldset>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <label htmlFor="tym-estado" style={etiqueta}>Estado</label>
                  <select id="tym-estado" value={estado} onChange={e => setEstado(e.target.value as EstadoTarea)} style={campo}>
                    {ESTADOS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <label htmlFor="tym-resp2" style={etiqueta}>Responsable</label>
                  <select id="tym-resp2" value={responsable} onChange={e => setResponsable(e.target.value)} style={campo}>
                    <option value="">Sin asignar</option>
                    {equipo.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    {responsable && !equipo.some(u => u.name === responsable) && <option value={responsable}>{responsable}</option>}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="tym-nota" style={etiqueta}>
                  Comentario <span style={{ fontWeight: 400, color: '#64748b' }}>· queda en el historial</span>
                </label>
                <textarea id="tym-nota" rows={2} value={nota} onChange={e => setNota(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 13.5, color: '#0f172a', resize: 'vertical', fontFamily: 'inherit' }}/>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 11, justifyContent: 'flex-end' }}>
                <button onClick={onCerrar} style={{ minHeight: 44, padding: '0 18px', borderRadius: 9, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => onGuardar({ pct, estado, responsable: responsable || undefined }, nota)} style={{
                  minHeight: 44, padding: '0 22px', borderRadius: 9, border: 0, background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  Guardar avance
                </button>
              </div>
            </div>
          </section>

          <section style={{ flex: '1 1 260px', minWidth: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 20px 20px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Historial de la tarea</h2>
            {!historial.length && (
              <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8' }}>Sin movimientos todavía.</p>
            )}
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {historial.map((h, i) => (
                <li key={i} style={{ padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    <strong>{h.de}% → {h.a}%</strong> <span style={{ color: '#64748b' }}>· {h.quien}</span>
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                    {fecha(h.fecha)}{h.nota ? ` · ${h.nota}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
