// Paso 2 de un proyecto abierto: crear las tareas con las que arranca el equipo.
// No hay semanas que estimar, así que esto es todo lo que hay entre crear el
// proyecto y empezar a trabajar.
import React, { useMemo, useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { adminStore } from '../../lib/adminStore';
import { PasosTym, ChipTym } from './PasosTym';
import { leerPlan, guardarPlan, nuevaTarea } from './almacen';
import type { PlanTym, TareaTym } from './tipos';

const SIN_BLOQUE = 'General';

interface Props {
  projectId: string;
  onListo: () => void;
  onAtras?: () => void;
}

export default function CrearTareas({ projectId, onListo, onAtras }: Props) {
  const proyecto = useMemo(() => adminStore.getProjects().find(p => p.id === projectId), [projectId]);
  const equipo = useMemo(
    () => adminStore.getUsers().filter(u => u.active && u.projectIds.includes(projectId)),
    [projectId],
  );
  const [plan, setPlan] = useState<PlanTym>(() => leerPlan(projectId));
  const [nombre, setNombre] = useState('');
  const [responsable, setResponsable] = useState('');
  const [bloque, setBloque] = useState(SIN_BLOQUE);
  const [bloqueNuevo, setBloqueNuevo] = useState('');

  const bloques = useMemo(() => {
    const vistos = new Set<string>([SIN_BLOQUE, ...plan.bloques, ...plan.tareas.map(t => t.bloque || SIN_BLOQUE)]);
    return [...vistos];
  }, [plan]);

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

  function agregar() {
    const texto = nombre.trim();
    if (!texto) return;
    const destino = (bloque === '__nuevo' ? bloqueNuevo.trim() : bloque) || SIN_BLOQUE;
    const t = nuevaTarea(texto, destino, responsable || undefined);
    aplicar({
      ...plan,
      bloques: plan.bloques.includes(destino) ? plan.bloques : [...plan.bloques, destino],
      tareas: [...plan.tareas, t],
    });
    setNombre('');
    if (bloque === '__nuevo') { setBloque(destino); setBloqueNuevo(''); }
  }

  function quitar(id: string) {
    aplicar({ ...plan, tareas: plan.tareas.filter(t => t.id !== id) });
  }

  const campo: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: 48, padding: '0 14px',
    border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: '#fff', color: '#0f172a',
  };
  const etiqueta: React.CSSProperties = {
    display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6,
  };

  return (
    <div style={{ minHeight: '100%', background: '#f8fafc', padding: '40px 24px 56px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <PasosTym current={2}/>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>Crear tareas</h1>
          <ChipTym/>
        </div>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: '#64748b', maxWidth: '72ch' }}>
          {proyecto?.name ?? projectId}. Agrega las tareas con las que arranca el equipo; después se pueden crear más desde el proyecto.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>

          <section style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px 22px 22px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1 }}>
              Agregar tarea
            </h2>

            <label htmlFor="tym-nombre" style={etiqueta}>Nombre</label>
            <input id="tym-nombre" value={nombre} onChange={e => setNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') agregar(); }}
              placeholder="Ej: Atención de incidencias en producción"
              style={{ ...campo, marginBottom: 14 }}/>

            <label htmlFor="tym-resp" style={etiqueta}>Responsable</label>
            <select id="tym-resp" value={responsable} onChange={e => setResponsable(e.target.value)} style={{ ...campo, marginBottom: 14 }}>
              <option value="">Sin asignar</option>
              {equipo.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>

            <label htmlFor="tym-bloque" style={etiqueta}>
              Bloque <span style={{ fontWeight: 400, color: '#64748b' }}>· opcional</span>
            </label>
            <select id="tym-bloque" value={bloque} onChange={e => setBloque(e.target.value)} style={{ ...campo, marginBottom: bloque === '__nuevo' ? 10 : 8 }}>
              {bloques.map(b => <option key={b} value={b}>{b}</option>)}
              <option value="__nuevo">Nuevo bloque…</option>
            </select>
            {bloque === '__nuevo' && (
              <input value={bloqueNuevo} onChange={e => setBloqueNuevo(e.target.value)} placeholder="Nombre del bloque"
                aria-label="Nombre del bloque nuevo" style={{ ...campo, marginBottom: 8 }}/>
            )}
            <p style={{ margin: '0 0 18px', fontSize: 11.5, lineHeight: 1.5, color: '#64748b' }}>
              Agrupa tareas para leerlas mejor. Sin bloques, todas cuelgan de uno solo.
            </p>

            <button onClick={agregar} disabled={!nombre.trim()} style={{
              width: '100%', minHeight: 48, border: 0, borderRadius: 12,
              background: nombre.trim() ? '#dc2626' : '#e2e8f0', color: nombre.trim() ? '#fff' : '#94a3b8',
              fontSize: 14, fontWeight: 700, cursor: nombre.trim() ? 'pointer' : 'default',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Plus size={16}/> Agregar tarea
            </button>
          </section>

          <section style={{ flex: '999 1 420px', minWidth: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: 1 }}>
                Tareas del proyecto
              </h2>
              <span style={{ fontSize: 12.5, color: '#64748b' }}>
                {plan.tareas.length} {plan.tareas.length === 1 ? 'tarea' : 'tareas'} · {porBloque.length} {porBloque.length === 1 ? 'bloque' : 'bloques'}
              </span>
            </div>

            {!plan.tareas.length && (
              <p style={{ margin: 0, padding: '38px 20px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                Todavía no hay tareas. Agrega la primera con el formulario de al lado.
              </p>
            )}

            {porBloque.map(([nombreBloque, tareas]) => (
              <div key={nombreBloque}>
                <p style={{ margin: 0, padding: '10px 20px', background: '#f8fafc', fontSize: 11.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: .6 }}>
                  {nombreBloque}
                </p>
                {tareas.map(t => (
                  <div key={t.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '13px 20px', borderTop: '1px solid #f1f5f9' }}>
                    <GripVertical size={15} color="#cbd5e1" style={{ flex: '0 0 auto' }} aria-hidden="true"/>
                    <span style={{ flex: '999 1 200px', minWidth: 0, fontSize: 13.5 }}>{t.nombre}</span>
                    <span style={{ flex: '0 1 auto', fontSize: 12.5, color: '#64748b' }}>{t.responsable ?? 'Sin asignar'}</span>
                    <button onClick={() => quitar(t.id)} aria-label={`Quitar ${t.nombre}`} style={{
                      flex: '0 0 auto', width: 44, height: 44, border: 0, background: 'transparent', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <X size={15} color="#94a3b8"/>
                    </button>
                  </div>
                ))}
              </div>
            ))}

            {plan.tareas.length > 0 && (
              <p style={{ margin: 0, padding: '14px 20px', borderTop: '1px solid #f1f5f9', fontSize: 12.5, lineHeight: 1.55, color: '#64748b' }}>
                Todas arrancan en 0% y estado <em>En curso</em>. El avance se registra después, tarea por tarea.
              </p>
            )}
          </section>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end', marginTop: 30 }}>
          {onAtras && (
            <button onClick={onAtras} style={{ minHeight: 48, padding: '0 20px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Atrás
            </button>
          )}
          <button onClick={onListo} style={{
            display: 'inline-flex', alignItems: 'center', gap: 9, height: 56, padding: '0 30px', border: 0, borderRadius: 16,
            background: '#dc2626', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(220,38,38,.22)',
          }}>
            {plan.tareas.length ? 'Abrir el proyecto' : 'Crear vacío y configurar luego'}
          </button>
        </div>
      </div>
    </div>
  );
}
