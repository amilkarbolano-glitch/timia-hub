// La vista de un proyecto abierto en marcha: sus tareas y su avance.
// Deliberadamente no hay avance esperado, diferencia ni semáforo: el contrato
// no compromete fechas, así que no hay contra qué comparar y un semáforo aquí
// mentiría.
import React, { useMemo, useState } from 'react';
import { Plus, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminStore } from '../../lib/adminStore';
import { ChipTym } from './PasosTym';
import { leerPlan, guardarPlan, conAvance, nuevaTarea } from './almacen';
import PanelAvance from './PanelAvance';
import { avanceDe, cerradasDe, estadoDe, type PlanTym, type TareaTym } from './tipos';

const SIN_BLOQUE = 'General';

export default function ProyectoTym({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const proyecto = useMemo(() => adminStore.getProjects().find(p => p.id === projectId), [projectId]);
  const [plan, setPlan] = useState<PlanTym>(() => leerPlan(projectId));
  const [abierta, setAbierta] = useState<string | null>(null);

  const avance = avanceDe(plan);
  const cerradas = cerradasDe(plan);

  const porBloque = useMemo(() => {
    const mapa = new Map<string, TareaTym[]>();
    for (const t of plan.tareas) {
      const b = t.bloque || SIN_BLOQUE;
      mapa.set(b, [...(mapa.get(b) ?? []), t]);
    }
    return [...mapa.entries()];
  }, [plan]);

  function aplicar(siguiente: PlanTym) {
    setPlan(siguiente);
    guardarPlan(siguiente);
  }

  function nueva() {
    const nombre = window.prompt('Nombre de la tarea');
    if (!nombre?.trim()) return;
    const bloque = plan.tareas.length ? (plan.tareas[plan.tareas.length - 1].bloque || SIN_BLOQUE) : SIN_BLOQUE;
    aplicar({ ...plan, tareas: [...plan.tareas, nuevaTarea(nombre, bloque)] });
  }

  const tarjeta: React.CSSProperties = {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '17px 20px',
  };
  const th: React.CSSProperties = {
    padding: '11px 20px', fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: .6, textAlign: 'left',
  };

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', padding: '34px 24px 56px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 5 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -0.9 }}>{proyecto?.name ?? projectId}</h1>
          <ChipTym/>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b' }}>
          {proyecto?.client ?? '—'} · {plan.tareas.length} {plan.tareas.length === 1 ? 'tarea' : 'tareas'}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 26 }}>
          <div style={{ ...tarjeta, flex: '0 1 200px', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: .8 }}>Avance real</p>
            <p style={{ margin: '6px 0 0', fontSize: 34, fontWeight: 900, letterSpacing: -1.6, lineHeight: 1 }}>
              {avance.toFixed(1)}<span style={{ fontSize: 20 }}>%</span>
            </p>
          </div>
          <div style={{ ...tarjeta, flex: '0 1 190px', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: .8 }}>Tareas cerradas</p>
            <p style={{ margin: '6px 0 0', fontSize: 34, fontWeight: 900, letterSpacing: -1.6, lineHeight: 1 }}>
              {cerradas.hechas}<span style={{ fontSize: 19, color: '#64748b' }}> / {cerradas.total}</span>
            </p>
          </div>
          <div style={{ ...tarjeta, flex: '1 1 320px', minWidth: 0, border: '1px dashed #cbd5e1', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <Info size={17} color="#64748b" style={{ flex: '0 0 auto', marginTop: 2 }} aria-hidden="true"/>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#475569' }}>
              Sin avance esperado, diferencia ni semáforo: el proyecto no compromete fechas, así que no hay contra qué comparar.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 }}>
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1 }}>Tareas</h2>
          <button onClick={nueva} style={{
            minHeight: 44, padding: '0 17px', borderRadius: 12, border: 0, background: '#dc2626', color: '#fff',
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <Plus size={15}/> Nueva tarea
          </button>
        </div>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
          {!plan.tareas.length && (
            <p style={{ margin: 0, padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
              Este proyecto todavía no tiene tareas.
            </p>
          )}
          {plan.tareas.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th scope="col" style={th}>Tarea</th>
                    <th scope="col" style={{ ...th, width: 160 }}>Responsable</th>
                    <th scope="col" style={{ ...th, width: 125 }}>Estado</th>
                    <th scope="col" style={{ ...th, width: 180 }}>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {porBloque.map(([bloque, tareas]) => (
                    <React.Fragment key={bloque}>
                      <tr>
                        <th colSpan={4} scope="colgroup" style={{ ...th, background: '#f1f5f9' }}>{bloque}</th>
                      </tr>
                      {tareas.map(t => {
                        const e = estadoDe(t.estado);
                        return (
                          <tr key={t.id} onClick={() => setAbierta(t.id)} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}>
                            <td style={{ padding: '12px 20px' }}>{t.nombre}</td>
                            <td style={{ padding: '12px 14px', color: '#334155' }}>{t.responsable ?? 'Sin asignar'}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ background: e.fondo, color: e.texto, border: `1px solid ${e.borde}`, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {e.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 20px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ flex: '1 1 auto', height: 7, borderRadius: 4, background: '#e2e8f0', display: 'block', overflow: 'hidden' }}>
                                  <span style={{ display: 'block', height: '100%', borderRadius: 4, background: '#dc2626', width: `${t.pct}%` }}/>
                                </span>
                                <span style={{ fontWeight: 700, minWidth: 38, textAlign: 'right' }}>{t.pct}%</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {abierta && (() => {
        const t = plan.tareas.find(x => x.id === abierta);
        if (!t) return null;
        return (
          <PanelAvance
            plan={plan} tarea={t}
            onCerrar={() => setAbierta(null)}
            onGuardar={(cambios, nota) => {
              aplicar(conAvance(plan, t.id, cambios, user?.name ?? 'Alguien', nota));
              setAbierta(null);
            }}
          />
        );
      })()}
    </div>
  );
}
