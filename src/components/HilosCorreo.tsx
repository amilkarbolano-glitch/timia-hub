import React, { useMemo, useState } from 'react';
import { Mail, Plus, X, Repeat, Check, AlertOctagon, Clock, Search } from 'lucide-react';
import { useAuth, canInProject } from '../contexts/AuthContext';
import { adminStore, issueImpacts, type MailHilo, type MailMovimiento, type MailResponsable, type PlanImpact, type AdminUser } from '../lib/adminStore';
import { businessDaysBetween } from '../lib/businessDays';
import ImpactPicker, { ImpactChips, impactLabel, type PlanOutline } from './ImpactPicker';

// ─── Colores ──────────────────────────────────────────────────────────────────
//
// El color de un hilo dice DE QUIÉN ES LA PELOTA, no su estado. Es lo que hace
// que el Gantt conteste de un vistazo dónde está el trabajo parado: ámbar o
// rojo = esperando a BBVA, teal = nos toca a nosotros.

export const DIAS_ALERTA = 5;

export interface HiloTono { bg: string; fg: string; bd: string }

const TONO_TIMIA: HiloTono = { bg: '#e1f5ee', fg: '#0f6e56', bd: '#5dcaa5' };
const TONO_BBVA:  HiloTono = { bg: '#faeeda', fg: '#854f0b', bd: '#ef9f27' };
const TONO_VIEJO: HiloTono = { bg: '#fceaea', fg: '#a32d2d', bd: '#e24b4a' };
const TONO_CERRADO: HiloTono = { bg: '#f1efe8', fg: '#444441', bd: '#d3d1c7' };

export function hiloTono(h: MailHilo, dias: number): HiloTono {
  if (h.estado === 'resuelto') return TONO_CERRADO;
  if (h.responsable.lado === 'TIMIA') return TONO_TIMIA;
  return dias > DIAS_ALERTA ? TONO_VIEJO : TONO_BBVA;
}

/** Días hábiles que el hilo lleva en la mano en que está, festivos descontados. */
export function diasEnMano(h: MailHilo, holidays: Set<string>, hoyISO?: string): number {
  const hoy = hoyISO ?? new Date().toISOString().slice(0, 10);
  const hasta = h.estado === 'resuelto' ? (h.cerradoEl ?? hoy) : hoy;
  if (!h.desde || h.desde > hasta) return 0;
  return Math.max(0, businessDaysBetween(h.desde, hasta, holidays));
}

export function hilosDeActividad(hilos: MailHilo[], planKey: string | undefined, entregableId: string, actIdx: number): MailHilo[] {
  return hilos.filter(h => h.estado === 'abierto'
    && (h.impacts ?? []).some(m => m.planKey === planKey && m.entregableId === entregableId && m.actIdx === actIdx));
}

export function fmtCorto(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/**
 * Los usuarios de un proyecto. El desplegable de Timia solo debe mostrar a la
 * gente de ese proyecto: con 100+ personas en la plataforma, una lista completa
 * invita a asignarle el hilo a alguien de otro frente.
 *
 * Si el proyecto no tiene a nadie asignado todavía, se devuelven todos los
 * activos en vez de una lista vacía, que dejaría el hilo sin responsable
 * posible.
 */
export function usuariosDeProyecto(projectId: string): AdminUser[] {
  const activos = adminStore.getUsers().filter(u => u.active);
  const delProyecto = activos.filter(u => (u.projectIds ?? []).includes(projectId));
  return delProyecto.length ? delProyecto : activos;
}

function hoyISO(): string { return new Date().toISOString().slice(0, 10); }
function nuevoId(): string { return `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }

// ─── Responsable: de la lista si es Timia, a mano si es BBVA ──────────────────

export function ResponsableInput({ value, onChange, users, autoFocusNombre = false }: {
  value: MailResponsable;
  onChange: (r: MailResponsable) => void;
  users: AdminUser[];
  autoFocusNombre?: boolean;
}) {
  const esTimia = value.lado === 'TIMIA';
  const porNombre = [...users].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  function elegirLado(lado: 'TIMIA' | 'BBVA') {
    if (lado === value.lado) return;
    // Al cambiar de lado el nombre anterior no sirve: el de Timia sale de la
    // lista y el de BBVA se escribe, así que se limpia en vez de arrastrarlo.
    onChange(lado === 'TIMIA' ? { lado, userId: '', nombre: '' } : { lado, nombre: '' });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
        {(['TIMIA', 'BBVA'] as const).map(lado => {
          const act = value.lado === lado;
          const tono = lado === 'TIMIA' ? TONO_TIMIA : TONO_BBVA;
          return (
            <button key={lado} type="button" onClick={() => elegirLado(lado)}
              style={{ flex: 1, fontSize: 11.5, fontWeight: 600, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                       background: act ? tono.bg : '#fff', color: act ? tono.fg : '#64748b',
                       border: `1px solid ${act ? tono.bd : '#e2e8f0'}` }}>
              {lado === 'TIMIA' ? 'Timia' : 'BBVA'}
            </button>
          );
        })}
      </div>

      {esTimia ? (
        <select value={value.userId ?? ''} aria-label="Responsable de Timia"
          onChange={e => {
            const u = porNombre.find(x => x.id === e.target.value);
            onChange({ lado: 'TIMIA', userId: u?.id ?? '', nombre: u?.name ?? '' });
          }}
          style={{ width: '100%', fontSize: 12, padding: '8px 9px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#1e293b', background: '#fff' }}>
          <option value="">Elige a quién le toca…</option>
          {porNombre.map(u => <option key={u.id} value={u.id}>{u.name}{u.areaLabel ? ` · ${u.areaLabel}` : ''}</option>)}
        </select>
      ) : (
        <input value={value.nombre} autoFocus={autoFocusNombre} aria-label="Nombre del responsable en BBVA"
          onChange={e => onChange({ lado: 'BBVA', nombre: e.target.value })}
          placeholder="Nombre de quien responde en BBVA"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '8px 9px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#1e293b' }}/>
      )}
    </div>
  );
}

export function ResponsableChip({ r, dias, estado }: { r: MailResponsable; dias?: number; estado?: MailHilo['estado'] }) {
  const tono = estado === 'resuelto' ? TONO_CERRADO
    : r.lado === 'TIMIA' ? TONO_TIMIA
    : (dias ?? 0) > DIAS_ALERTA ? TONO_VIEJO : TONO_BBVA;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, padding: '2px 8px',
                   borderRadius: 20, background: tono.bg, color: tono.fg, border: `0.5px solid ${tono.bd}` }}>
      {r.lado === 'TIMIA' ? 'Timia' : 'BBVA'}
      {r.nombre && <span style={{ fontWeight: 500 }}>· {r.nombre}</span>}
      {dias !== undefined && estado !== 'resuelto' && <span style={{ fontWeight: 500 }}>· {dias} d</span>}
    </span>
  );
}

// ─── Insignia del Gantt ───────────────────────────────────────────────────────

export function HiloBadge({ hilos, holidays, onClick }: { hilos: MailHilo[]; holidays: Set<string>; onClick: () => void }) {
  if (!hilos.length) return null;
  const conDias = hilos.map(h => ({ h, d: diasEnMano(h, holidays) }));
  const peor = conDias.reduce((a, b) => {
    const prio = (x: typeof a) => (x.h.responsable.lado === 'BBVA' ? 1000 : 0) + x.d;
    return prio(b) > prio(a) ? b : a;
  });
  const tono = hiloTono(peor.h, peor.d);
  const titulo = conDias
    .map(({ h, d }) => `${h.asunto} — ${h.responsable.lado === 'BBVA' ? 'esperando a BBVA' : 'nos toca'}${h.responsable.nombre ? ` (${h.responsable.nombre})` : ''} desde ${d} d hábil${d === 1 ? '' : 'es'}`)
    .join('\n');

  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick(); }} title={titulo}
      aria-label={`${hilos.length} hilo${hilos.length === 1 ? '' : 's'} de correo, el más antiguo lleva ${peor.d} días hábiles`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, padding: '1px 5px', borderRadius: 3,
               background: tono.bg, color: tono.fg, fontWeight: 700, border: `0.5px solid ${tono.bd}`,
               cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
      <Mail size={9}/>
      {hilos.length > 1 ? `${hilos.length} · ` : ''}{peor.d} d
    </button>
  );
}

// ─── Formulario de alta y edición ─────────────────────────────────────────────

export function HiloForm({ plans, planKey, impactsIniciales = [], hilo, onSave, onClose }: {
  plans: PlanOutline[];
  planKey?: string;
  impactsIniciales?: PlanImpact[];
  hilo?: MailHilo;
  onSave: (h: MailHilo) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [pkSel, setPkSel]     = useState<string>(hilo?.planKey ?? planKey ?? impactsIniciales[0]?.planKey ?? plans[0]?.planKey ?? '');
  const [asunto, setAsunto]   = useState(hilo?.asunto ?? '');
  const [resumen, setResumen] = useState(hilo?.resumen ?? '');
  const [jira, setJira]       = useState(hilo?.jira ?? '');
  const [desde, setDesde]     = useState(hilo?.desde ?? hoyISO());
  const [resp, setResp]       = useState<MailResponsable>(hilo?.responsable ?? { lado: 'BBVA', nombre: '' });
  const [impacts, setImpacts] = useState<PlanImpact[]>(hilo?.impacts ?? impactsIniciales);
  const [pickando, setPickando] = useState(false);
  const [error, setError]     = useState('');

  const pk = pkSel;
  const planSel = plans.find(p => p.planKey === pk);
  const projectId = planSel?.projectId ?? pk.split('::')[0];
  const users = useMemo(() => usuariosDeProyecto(projectId), [projectId]);

  /** Cambiar de cronograma invalida las tareas elegidas: son de otro plan. */
  function elegirPlan(nuevo: string) {
    if (nuevo === pk) return;
    setPkSel(nuevo);
    setImpacts([]);
    if (resp.lado === 'TIMIA') setResp({ lado: 'TIMIA', userId: '', nombre: '' });
  }

  function guardar() {
    if (!asunto.trim())    { setError('Pega el asunto del correo.'); return; }
    if (!resp.nombre.trim()) { setError(resp.lado === 'TIMIA' ? 'Elige quién de Timia lo tiene.' : 'Escribe el nombre de quien responde en BBVA.'); return; }
    setError('');
    const base: MailHilo = hilo ?? {
      id: nuevoId(), planKey: pk, projectId, asunto: '', estado: 'abierto',
      responsable: resp, desde, abiertoEl: desde, seguimiento: [],
      creadoPor: user?.name ?? 'Usuario', creadoEn: new Date().toISOString(),
    };
    onSave({ ...base, asunto: asunto.trim(), resumen: resumen.trim() || undefined, jira: jira.trim() || undefined,
             desde, responsable: resp, impacts, planKey: pk, projectId });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 520, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(15,23,42,.25)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={15} color="#0f6e56"/>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{hilo ? 'Editar hilo' : 'Nuevo hilo de correo'}</h3>
          <button onClick={onClose} aria-label="Cerrar" style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={16}/></button>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Proyecto y cronograma</span>
            <select value={pk} onChange={e => elegirPlan(e.target.value)} disabled={!!hilo}
              style={{ width: '100%', fontSize: 12, padding: '8px 9px', borderRadius: 8, border: '1px solid #e2e8f0', color: '#1e293b', background: hilo ? '#f8fafc' : '#fff' }}>
              {plans.map(p => <option key={p.planKey} value={p.planKey}>{p.projectId}{p.cronoId ? ` · ${p.cronoName ?? p.cronoId}` : ''}</option>)}
            </select>
            {!hilo && <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Decide de qué proyecto es el hilo, y con eso quién puede ser el responsable de Timia.</span>}
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Asunto <span style={{ color: '#94a3b8', fontWeight: 400 }}>· pégalo del correo</span></span>
            <input value={asunto} onChange={e => setAsunto(e.target.value)} autoFocus
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }}/>
          </label>

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Resumen <span style={{ color: '#94a3b8', fontWeight: 400 }}>· qué se pidió y qué se espera</span></span>
            <textarea value={resumen} onChange={e => setResumen(e.target.value)} rows={3}
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}/>
          </label>

          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 5 }}>¿En mano de quién queda?</span>
            <ResponsableInput value={resp} onChange={setResp} users={users}/>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Desde</span>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '8px 9px', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }}/>
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Jira <span style={{ color: '#94a3b8', fontWeight: 400 }}>· opcional</span></span>
              <input value={jira} onChange={e => setJira(e.target.value)} placeholder="DECRONOS-0000"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '8px 9px', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }}/>
            </label>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>Tareas que frena <span style={{ color: '#94a3b8', fontWeight: 400 }}>· puede ser más de una</span></span>
              <button type="button" onClick={() => setPickando(true)}
                style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '0.5px solid #5dcaa5', background: '#e1f5ee', color: '#0f6e56', cursor: 'pointer' }}>
                {impacts.length ? 'Cambiar' : 'Elegir tareas'}
              </button>
            </div>
            {impacts.length
              ? <ImpactChips impacts={impacts} plans={plans} onRemove={i => setImpacts(impacts.filter(x => x !== i))} max={8}/>
              : <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Sin tareas: el hilo saldrá solo en la vista de Correos.</p>}
          </div>

          {error && <p style={{ margin: 0, fontSize: 11, color: '#a32d2d', fontWeight: 600 }}>{error}</p>}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '0.5px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>Solo el asunto y el responsable son obligatorios</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, padding: '9px 14px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={guardar} style={{ fontSize: 12, fontWeight: 600, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#0f6e56', color: '#fff', cursor: 'pointer' }}>{hilo ? 'Guardar' : 'Crear hilo'}</button>
        </div>
      </div>

      {pickando && (
        <ImpactPicker plans={planSel ? [planSel] : plans} value={impacts} title="Tareas que frena el hilo" accent="#0f6e56"
          onConfirm={is => { setImpacts(is); setPickando(false); }} onClose={() => setPickando(false)}/>
      )}
    </div>
  );
}

// ─── Panel de seguimiento ─────────────────────────────────────────────────────

export function HiloPanel({ hilo, plans, holidays, puedeEditar, onSave, onEscalar, onClose }: {
  hilo: MailHilo;
  plans: PlanOutline[];
  holidays: Set<string>;
  puedeEditar: boolean;
  onSave: (h: MailHilo) => void;
  onEscalar?: (h: MailHilo) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const users = useMemo(() => usuariosDeProyecto(hilo.projectId), [hilo.projectId]);
  const dias = diasEnMano(hilo, holidays);
  const [nota, setNota] = useState('');
  const [resp, setResp] = useState<MailResponsable>(hilo.responsable);
  const [editando, setEditando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [notaCierre, setNotaCierre] = useState('');
  const [error, setError] = useState('');

  const cambiaMano = resp.lado !== hilo.responsable.lado || (resp.nombre || '') !== (hilo.responsable.nombre || '');

  function registrar() {
    if (!nota.trim() && !cambiaMano) { setError('Escribe el movimiento o cambia el responsable.'); return; }
    if (cambiaMano && !resp.nombre.trim()) { setError(resp.lado === 'TIMIA' ? 'Elige quién de Timia lo recibe.' : 'Escribe el nombre de quien lo recibe en BBVA.'); return; }
    setError('');
    const mov: MailMovimiento = {
      fecha: hoyISO(), por: user?.name ?? 'Usuario',
      nota: nota.trim() || (cambiaMano ? `Pasa a ${resp.lado === 'TIMIA' ? 'Timia' : 'BBVA'}${resp.nombre ? ` · ${resp.nombre}` : ''}` : ''),
      responsable: resp,
    };
    // La antigüedad se reinicia solo si de verdad cambió de mano: un
    // recordatorio no borra los nueve días que llevamos esperando.
    onSave({ ...hilo, responsable: resp, desde: cambiaMano ? hoyISO() : hilo.desde, seguimiento: [...hilo.seguimiento, mov] });
    setNota('');
  }

  function cerrar() {
    const mov: MailMovimiento = { fecha: hoyISO(), por: user?.name ?? 'Usuario', nota: notaCierre.trim() || 'Hilo resuelto', responsable: hilo.responsable };
    onSave({ ...hilo, estado: 'resuelto', cerradoEl: hoyISO(), notaCierre: notaCierre.trim() || undefined, seguimiento: [...hilo.seguimiento, mov] });
    onClose();
  }

  const movs = [...hilo.seguimiento].reverse();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 65, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15,23,42,.35)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(15,23,42,.18)' }}>

        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e2e8f0', background: '#fdf2f6' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: '#9f1239', fontWeight: 700, letterSpacing: '.04em', marginBottom: 3 }}>
                HILO DE CORREO · {hilo.projectId}{hilo.planKey.includes('::') ? ` · ${hilo.planKey.split('::')[1]}` : ''}
              </div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.35 }}>{hilo.asunto}</h3>
            </div>
            <button onClick={onClose} aria-label="Cerrar el panel" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={16}/></button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 11, flexWrap: 'wrap', alignItems: 'center' }}>
            <ResponsableChip r={hilo.responsable} dias={dias} estado={hilo.estado}/>
            <span style={{ fontSize: 10, color: '#64748b' }}>abierto el {fmtCorto(hilo.abiertoEl)}</span>
            {hilo.jira && <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 20, padding: '2px 8px' }}>{hilo.jira}</span>}
            {hilo.estado === 'resuelto' && <span style={{ fontSize: 10, fontWeight: 700, color: '#0f6e56' }}>Resuelto el {fmtCorto(hilo.cerradoEl)}</span>}
            {puedeEditar && hilo.estado === 'abierto' && (
              <button onClick={() => setEditando(true)} style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7, border: '0.5px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' }}>Editar</button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hilo.resumen && (
            <div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: '.04em', marginBottom: 5 }}>RESUMEN</div>
              <p style={{ margin: 0, fontSize: 12, color: '#334155', lineHeight: 1.55, background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: '9px 11px' }}>{hilo.resumen}</p>
            </div>
          )}

          {(hilo.impacts ?? []).length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: '.04em', marginBottom: 5 }}>TAREAS QUE FRENA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(hilo.impacts ?? []).map((m, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#334155', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 7, padding: '6px 9px' }}>{impactLabel(m, plans)}</div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: '.04em' }}>SEGUIMIENTO</div>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{hilo.seguimiento.length} movimiento{hilo.seguimiento.length === 1 ? '' : 's'}</span>
            </div>
            {movs.length === 0 && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Todavía sin movimientos.</p>}
            {movs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', marginTop: 4, background: i === 0 ? (m.responsable.lado === 'BBVA' ? '#e24b4a' : '#1d9e75') : '#cbd5e1' }}/>
                  {i < movs.length - 1 && <span style={{ flex: 1, width: 1, background: '#e2e8f0' }}/>}
                </div>
                <div style={{ paddingBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#1e293b', lineHeight: 1.45 }}>{m.nota}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    {fmtCorto(m.fecha)} · {m.por} · queda en <strong style={{ color: m.responsable.lado === 'BBVA' ? '#a32d2d' : '#0f6e56' }}>{m.responsable.lado === 'TIMIA' ? 'Timia' : 'BBVA'}</strong>{m.responsable.nombre ? ` · ${m.responsable.nombre}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {puedeEditar && hilo.estado === 'abierto' && !cerrando && (
          <div style={{ borderTop: '0.5px solid #e2e8f0', padding: '12px 20px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '.04em', marginBottom: 5 }}>NUEVO MOVIMIENTO</span>
              <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Qué pasó, en una línea"
                style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b', marginBottom: 7 }}/>
              <ResponsableInput value={resp} onChange={setResp} users={users}/>
            </div>
            {error && <p style={{ margin: 0, fontSize: 11, color: '#a32d2d', fontWeight: 600 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={registrar}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '9px 12px', borderRadius: 8, border: 'none', background: '#0f6e56', color: '#fff', cursor: 'pointer' }}>
                {cambiaMano ? <><Repeat size={13}/> Pasar la pelota</> : <><Plus size={13}/> Registrar</>}
              </button>
              {onEscalar && (
                <button onClick={() => onEscalar(hilo)} title="Crea un bloqueante con las mismas tareas y la fecha del hilo"
                  style={{ fontSize: 11, fontWeight: 600, padding: '9px 11px', borderRadius: 8, border: '0.5px solid #f09595', background: '#fceaea', color: '#a32d2d', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <AlertOctagon size={13}/> Bloqueante
                </button>
              )}
              <button onClick={() => setCerrando(true)}
                style={{ fontSize: 11, fontWeight: 600, padding: '9px 11px', borderRadius: 8, border: '0.5px solid #5dcaa5', background: '#e1f5ee', color: '#0f6e56', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Check size={13}/> Cerrar
              </button>
            </div>
          </div>
        )}

        {cerrando && (
          <div style={{ borderTop: '0.5px solid #e2e8f0', padding: '12px 20px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>¿Cómo se resolvió?</span>
            <input value={notaCierre} onChange={e => setNotaCierre(e.target.value)} autoFocus placeholder="Llegó el VoBo, se cerró en la reunión…"
              style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '9px 10px', border: '1px solid #e2e8f0', borderRadius: 8, color: '#1e293b' }}/>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => setCerrando(false)} style={{ fontSize: 12, fontWeight: 600, padding: '9px 14px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer' }}>Volver</button>
              <button onClick={cerrar} style={{ flex: 1, fontSize: 12, fontWeight: 600, padding: '9px 14px', borderRadius: 8, border: 'none', background: '#0f6e56', color: '#fff', cursor: 'pointer' }}>Cerrar el hilo</button>
            </div>
          </div>
        )}
      </div>

      {editando && (
        <HiloForm plans={plans} hilo={hilo} onClose={() => setEditando(false)}
          onSave={h => { onSave(h); setEditando(false); }}/>
      )}
    </div>
  );
}

// ─── Vista global ─────────────────────────────────────────────────────────────

export default function HilosCorreo({ plans, holidays, onGoPlan }: {
  plans: PlanOutline[];
  holidays: Set<string>;
  onGoPlan?: (planKey: string) => void;
}) {
  const { user } = useAuth();
  const [hilos, setHilos] = useState<MailHilo[]>(() => adminStore.getMailHilos());
  const [filtro, setFiltro] = useState<'bbva' | 'timia' | 'resueltos' | 'todos'>('todos');
  const [proyecto, setProyecto] = useState('todos');
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState<MailHilo | null>(null);
  const [creando, setCreando] = useState(false);

  const proyectos = useMemo(() => [...new Set(hilos.map(h => h.projectId).concat(plans.map(p => p.projectId)))].sort(), [hilos, plans]);

  function guardar(h: MailHilo) {
    const next = hilos.some(x => x.id === h.id) ? hilos.map(x => (x.id === h.id ? h : x)) : [...hilos, h];
    setHilos(next);
    adminStore.saveMailHilos(next);
    setAbierto(prev => (prev && prev.id === h.id ? h : prev));
  }

  const conDias = hilos.map(h => ({ h, d: diasEnMano(h, holidays) }));
  const visibles = conDias
    .filter(({ h }) => (proyecto === 'todos' || h.projectId === proyecto))
    .filter(({ h }) => (q.trim() ? `${h.asunto} ${h.resumen ?? ''} ${h.responsable.nombre}`.toLowerCase().includes(q.trim().toLowerCase()) : true))
    .filter(({ h }) => {
      if (filtro === 'resueltos') return h.estado === 'resuelto';
      if (filtro === 'bbva')  return h.estado === 'abierto' && h.responsable.lado === 'BBVA';
      if (filtro === 'timia') return h.estado === 'abierto' && h.responsable.lado === 'TIMIA';
      return h.estado === 'abierto';
    })
    .sort((a, b) => b.d - a.d);

  const abiertos = conDias.filter(({ h }) => h.estado === 'abierto');
  const enBbva   = abiertos.filter(({ h }) => h.responsable.lado === 'BBVA');
  const enTimia  = abiertos.filter(({ h }) => h.responsable.lado === 'TIMIA');
  const viejo    = enBbva.reduce((m, x) => Math.max(m, x.d), 0);
  const pasados  = enBbva.filter(x => x.d > DIAS_ALERTA);

  const puedeEditar = (h: MailHilo) => !!user && canInProject(user, 'plan.manage_issues', h.projectId);
  const puedeCrear  = !!user && plans.some(p => canInProject(user, 'plan.manage_issues', p.projectId));

  const btnFiltro = (k: typeof filtro, label: string, tono: HiloTono) => {
    const act = filtro === k;
    return (
      <button key={k} onClick={() => setFiltro(k)}
        style={{ fontSize: 11, fontWeight: act ? 700 : 600, padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                 background: act ? tono.bg : '#fff', color: act ? tono.fg : '#64748b', border: `0.5px solid ${act ? tono.bd : '#e2e8f0'}` }}>
        {label}
      </button>
    );
  };

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 500, color: '#111' }}>Correos</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            {abiertos.length} hilo{abiertos.length === 1 ? '' : 's'} abierto{abiertos.length === 1 ? '' : 's'} · {enBbva.length} esperando a BBVA
            {viejo > 0 && <> · el más viejo lleva {viejo} día{viejo === 1 ? '' : 's'} hábil{viejo === 1 ? '' : 'es'}</>}
          </p>
        </div>
        {puedeCrear && (
          <button onClick={() => setCreando(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, padding: '9px 14px', borderRadius: 9, border: 'none', background: '#0f6e56', color: '#fff', cursor: 'pointer' }}>
            <Plus size={14}/> Nuevo hilo
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569', fontWeight: 600 }}>
          Proyecto
          <select value={proyecto} onChange={e => setProyecto(e.target.value)}
            style={{ fontSize: 11, padding: '6px 9px', border: '0.5px solid #e2e8f0', borderRadius: 7, color: '#1e293b', background: '#fff' }}>
            <option value="todos">Todos</option>
            {proyectos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <span style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }}/>
        {btnFiltro('todos', `Abiertos · ${abiertos.length}`, TONO_CERRADO)}
        {btnFiltro('bbva', `Esperando a BBVA · ${enBbva.length}`, TONO_VIEJO)}
        {btnFiltro('timia', `En mano de Timia · ${enTimia.length}`, TONO_TIMIA)}
        {btnFiltro('resueltos', 'Resueltos', TONO_CERRADO)}
        <label style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Search size={13} color="#94a3b8"/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por asunto o responsable" aria-label="Buscar hilos"
            style={{ fontSize: 11, padding: '7px 9px', border: '0.5px solid #e2e8f0', borderRadius: 7, color: '#1e293b', width: 230 }}/>
        </label>
      </div>

      <div style={{ border: '0.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#881337' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#fff', fontWeight: 600 }}>Asunto</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#fff', fontWeight: 600, width: 230 }}>Tareas que frena</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#fff', fontWeight: 600, width: 190 }}>En mano de</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#fff', fontWeight: 600, width: 100 }}>Antigüedad</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#fff', fontWeight: 600, width: 180 }}>Último movimiento</th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '26px 12px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                Nada aquí. {filtro === 'todos' ? 'Registra el primer hilo con «Nuevo hilo».' : 'Prueba otro filtro.'}
              </td></tr>
            )}
            {visibles.map(({ h, d }, idx) => {
              const ult = h.seguimiento[h.seguimiento.length - 1];
              const tono = hiloTono(h, d);
              return (
                <tr key={h.id} onClick={() => setAbierto(h)} style={{ borderTop: '0.5px solid #e2e8f0', background: idx % 2 ? '#f8fafc' : '#fff', cursor: 'pointer' }}>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ color: '#1e293b', fontWeight: 600 }}>{h.asunto}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                      {h.projectId}{h.jira ? ` · ${h.jira}` : ''}{h.resumen ? ` · ${h.resumen.slice(0, 70)}${h.resumen.length > 70 ? '…' : ''}` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '9px 10px', color: '#475569' }}>
                    {(h.impacts ?? []).length
                      ? (h.impacts ?? []).slice(0, 2).map(m => impactLabel(m, plans, false)).join(' · ') + ((h.impacts ?? []).length > 2 ? ` +${(h.impacts ?? []).length - 2}` : '')
                      : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 10px' }}><ResponsableChip r={h.responsable} estado={h.estado}/></td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: h.estado === 'resuelto' ? '#64748b' : tono.fg }}>{d} d</td>
                  <td style={{ padding: '9px 10px', color: '#64748b' }}>{ult ? `${fmtCorto(ult.fecha)} · ${ult.nota.slice(0, 40)}${ult.nota.length > 40 ? '…' : ''}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pasados.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', marginTop: 12, background: '#fdf2f6', border: '0.5px solid #fbcfe8', borderRadius: 9 }}>
          <Clock size={14} color="#9f1239"/>
          <span style={{ fontSize: 11, color: '#9f1239' }}>
            <strong>{pasados.length} hilo{pasados.length === 1 ? '' : 's'} pasa{pasados.length === 1 ? '' : 'n'} de {DIAS_ALERTA} días hábiles con BBVA.</strong> Son los del comité: cada uno lleva su bitácora de recordatorios como respaldo.
          </span>
        </div>
      )}

      {abierto && (
        <HiloPanel hilo={abierto} plans={plans} holidays={holidays} puedeEditar={puedeEditar(abierto)}
          onSave={guardar} onClose={() => setAbierto(null)}/>
      )}
      {creando && (
        <HiloForm plans={plans} onClose={() => setCreando(false)}
          onSave={h => { guardar(h); setCreando(false); }}/>
      )}
      {onGoPlan && null}
    </div>
  );
}
