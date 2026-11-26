// ─── Dashboard ejecutivo (PM / gerente de cuenta) — 100 % datos reales ───────
// KPIs globales, avance por proyecto y por PM, alertas/bloqueantes abiertos,
// riesgo por proyecto y standup generado desde el estado actual.
import React, { useMemo, useState } from 'react';
import { Mail, AlertTriangle, TrendingUp, Users, Briefcase, CheckSquare, X, Copy, Check, Plus, ClipboardList } from 'lucide-react';
import { useAuth, canAccess } from '../contexts/AuthContext';
import { esTym } from '../modules/tym';
import { adminStore, issueImpacts, type AdminProject, type AdminUser, type PlanIssue } from '../lib/adminStore';
import { getPlanSummaries, getStandupDetalle, type PlanSummary, type ActividadStandup, type DetalleStandup } from './PlanDeTrabajo';

/**
 * Abrir un proyecto lleva a su vista: los cerrados al plan de trabajo y los
 * abiertos a la suya, que no tiene plan ni cronograma.
 */
function abrirProyecto(id: string, ir: (v: any, p?: string) => void) {
  if (esTym(id)) {
    try { localStorage.setItem('timia_tym_project', id); } catch { /* sin almacenamiento */ }
    ir('proyecto-tym', id);
    return;
  }
  try { localStorage.setItem('timia_last_plan_project', id); } catch { /* sin almacenamiento */ }
  ir('plan-trabajo', id);
}

type PMView = 'setup-project' | 'estimaciones' | 'plan-trabajo' | 'admin' | 'bitacora' | 'analytics';
interface PMDashboardProps { onViewChange?: (v: PMView, param?: string) => void; }

const fmtD = (d: Date | null) => d ? `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}` : '—';

/** Sin tildes, sin mayúsculas y sin espacios de más. */
export const plano = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * El PM de un proyecto.
 *
 * Antes se resolvía en dos sitios distintos —el PM del equipo, o el usuario
 * cuyo nombre coincidía con el área— y se agrupaba por el **nombre** que
 * saliera. Los dos proyectos de un mismo líder terminaban en grupos separados
 * cuando en uno figuraba en el equipo y en el otro solo en el área, o cuando
 * el área estaba escrita distinto. Aquí se resuelve una vez y se compara
 * aplanado.
 */
export function pmDelProyecto(p: AdminProject, equipo: AdminUser[], todos: AdminUser[]): AdminUser | undefined {
  const delEquipo = equipo.find(u => u.role === 'pm');
  if (delEquipo) return delEquipo;
  const area = plano(p.area ?? '');
  if (!area) return undefined;
  return todos.find(u => u.role === 'pm' && plano(u.name) === area)
      ?? todos.find(u => u.role === 'pm' && (plano(u.name).startsWith(area) || area.startsWith(plano(u.name))));
}

interface ProjectRow {
  p: AdminProject; plans: PlanSummary[]; real: number; exp: number; dif: number; nActs: number; done: number; late: number;
  openBloq: number; openAlert: number; team: AdminUser[]; pm?: AdminUser; leads: AdminUser[]; tasksOpen: number; tasksDone: number;
  start: Date | null; end: Date | null; risk: number; riskWhy: string[]; ultima: string | null;
}

/** Última vez que alguien movió algo del proyecto: % de actividad o etapa marcada.
 *  Sale de los dos historiales, que son append-only, así que es fiable sin
 *  guardar un campo nuevo en ninguna parte. */
function ultimasActualizaciones(): Map<string, string> {
  const m = new Map<string, string>();
  const poner = (pid: string, iso?: string) => {
    if (!pid || !iso) return;
    const previo = m.get(pid);
    if (!previo || iso > previo) m.set(pid, iso);
  };
  adminStore.getPctHistorial().forEach(c => poner(String(c.planKey ?? '').split('::')[0], c.en));
  adminStore.getHistorial().forEach(h => poner(h.projectId, h.timestamp));
  return m;
}

/** "Actualizado ayer · 23 nov, 16:40", con color según lo rancio que esté. */
function textoActualizado(iso: string | null): { txt: string; color: string } {
  if (!iso) return { txt: 'Sin movimientos registrados', color: '#94a3b8' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { txt: 'Sin movimientos registrados', color: '#94a3b8' };
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  const cuando = dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`;
  const fecha = `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return { txt: `Actualizado ${cuando} · ${fecha}`, color: dias <= 3 ? '#047857' : dias <= 10 ? '#b45309' : '#b91c1c' };
}

export function useDashboardData() {
  const { user } = useAuth();
  return useMemo(() => {
    const all = canAccess(user?.role ?? 'developer', 'projects.view_all');
    const projects = adminStore.getProjects().filter(p => p.active && (all || (user?.projectIds ?? []).includes(p.id)));
    const users = adminStore.getUsers().filter(u => u.active);
    const summaries = getPlanSummaries();
    const issues = adminStore.getPlanIssues().filter(i => !i.endDate);
    const tasks = adminStore.getKanbanTasks();
    const ultimas = ultimasActualizaciones();
    const rows: ProjectRow[] = projects.map(p => {
      const plans = summaries.filter(s => s.projectId === p.id);
      const nActs = plans.reduce((s, x) => s + x.nActs, 0);
      const real = nActs ? plans.reduce((s, x) => s + x.real * x.nActs, 0) / nActs : 0;
      const exp = nActs ? plans.reduce((s, x) => s + x.exp * x.nActs, 0) / nActs : 0;
      const team = users.filter(u => u.projectIds.includes(p.id) && u.role !== 'account_manager');
      const pm = pmDelProyecto(p, team, users);
      const leads = team.filter(u => u.role === 'tech_lead');
      const pIssues = issues.filter(i => i.planKey.split('::')[0] === p.id || issueImpacts(i).some(m => m.planKey.split('::')[0] === p.id));
      const openBloq = pIssues.filter(i => i.type === 'bloqueante').length, openAlert = pIssues.filter(i => i.type === 'alerta').length;
      const late = plans.reduce((s, x) => s + x.late, 0), done = plans.reduce((s, x) => s + x.done, 0);
      const pt = tasks.filter(t => t.projectId === p.id);
      const dif = real - exp;
      const starts = plans.map(x => x.start).filter(Boolean) as Date[]; const ends = plans.map(x => x.end).filter(Boolean) as Date[];
      // Riesgo 0-100: atraso vs esperado, bloqueantes, tareas atrasadas, días perdidos
      const why: string[] = []; let risk = 0;
      if (dif < -10) { risk += 35; why.push(`${dif.toFixed(0)} pts bajo lo esperado`); } else if (dif < -3) { risk += 15; why.push(`${dif.toFixed(0)} pts bajo lo esperado`); }
      if (openBloq) { risk += Math.min(30, 15 * openBloq); why.push(`${openBloq} bloqueante${openBloq > 1 ? 's' : ''} abierto${openBloq > 1 ? 's' : ''}`); }
      if (late) { risk += Math.min(20, 5 * late); why.push(`${late} tarea${late > 1 ? 's' : ''} atrasada${late > 1 ? 's' : ''}`); }
      const lost = plans.reduce((s, x) => s + x.blockDays + x.changeDays, 0); if (lost) { risk += Math.min(15, lost); why.push(`+${lost} d hábiles por bloqueos/cambios`); }
      if (!plans.length) { risk += 10; why.push('Sin plan de trabajo generado'); }
      return { p, plans, real, exp, dif, nActs, done, late, openBloq, openAlert, team, pm, leads, tasksOpen: pt.filter(t => t.status !== 'done').length, tasksDone: pt.filter(t => t.status === 'done').length,
        start: starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : null, end: ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : null, risk: Math.min(100, risk), riskWhy: why, ultima: ultimas.get(p.id) ?? null };
    });
    return { rows, users, issues, summaries };
  }, [user]);
}

const KPI = ({ icon, label, value, sub, color, onClick }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; onClick?: () => void }) => (
  <div onClick={onClick} title={onClick ? 'Ver el detalle' : undefined}
    style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: onClick ? 'pointer' : 'default' }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
    <div><div style={{ fontSize: 22, fontWeight: 700, color: '#111', lineHeight: 1 }}>{value}</div><div style={{ fontSize: 11, color: '#374151', marginTop: 3 }}>{label}</div>{sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}</div>
  </div>
);
const difColor = (d: number) => d >= 0 ? '#15803d' : d < -5 ? '#dc2626' : '#d97706';
const riskColor = (r: number) => r >= 60 ? '#dc2626' : r >= 30 ? '#d97706' : '#15803d';
const Avatar = ({ u, size = 24 }: { u: AdminUser; size?: number }) => (
  <div title={`${u.name} · ${u.role}`} style={{ width: size, height: size, borderRadius: '50%', background: u.avatarColor + '20', color: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .36, fontWeight: 700, border: '2px solid #fff', marginLeft: -6 }}>{u.initials}</div>
);

function ProjectCard({ r, onOpen }: { r: ProjectRow; onOpen?: () => void }) {
  return (
    <div onClick={onOpen}
      title={onOpen ? `Abrir el plan de trabajo de ${r.p.name}` : undefined}
      style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderLeft: `4px solid ${r.p.color}`, borderRadius: 12, padding: '12px 16px', cursor: onOpen ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{r.p.name} <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{r.p.id}</span></div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{r.p.sda ? `SDA ${r.p.sda} · ` : ''}{r.p.client} · PM {r.pm?.name ?? r.p.area}{r.leads.length ? ` · Líder ${r.leads.map(l => l.name.split(' ')[0]).join(', ')}` : ''}</div>
        </div>
        <span title="Riesgo" style={{ fontSize: 10, fontWeight: 700, color: riskColor(r.risk), background: `${riskColor(r.risk)}15`, borderRadius: 10, padding: '2px 8px' }}>riesgo {r.risk}</span>
        {r.openBloq > 0 && <span style={{ fontSize: 11 }}>⛔{r.openBloq}</span>}{r.openAlert > 0 && <span style={{ fontSize: 11 }}>⚠{r.openAlert}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>{r.real.toFixed(0)}%</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>real · {r.exp.toFixed(0)}% esperado</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: difColor(r.dif), marginLeft: 'auto' }}>{r.dif >= 0 ? '+' : ''}{r.dif.toFixed(1)}</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', margin: '6px 0', position: 'relative' }}>
        <div style={{ width: `${Math.min(100, r.real)}%`, height: '100%', background: r.p.color }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(100, r.exp)}%`, width: 2, background: '#64748b' }} title="esperado" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#64748b' }}>
        <span>{r.done}/{r.nActs} tareas del plan</span>{r.late > 0 && <span style={{ color: '#c2410c', fontWeight: 600 }}>· {r.late} atrasadas</span>}
        <span>· {fmtD(r.start)} → {fmtD(r.end)}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', paddingLeft: 6 }}>{r.team.slice(0, 6).map(u => <Avatar key={u.id} u={u} />)}{r.team.length > 6 && <span style={{ fontSize: 9, marginLeft: 4 }}>+{r.team.length - 6}</span>}</div>
      </div>
      {r.riskWhy.length > 0 && <div style={{ marginTop: 6, fontSize: 9, color: riskColor(r.risk) }}>{r.riskWhy.join(' · ')}</div>}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {onOpen && <button onClick={e => { e.stopPropagation(); onOpen(); }} style={{ fontSize: 10, padding: '4px 10px', background: '#fff', border: `0.5px solid ${r.p.color}60`, color: r.p.color, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Abrir plan de trabajo</button>}
        {(() => { const u = textoActualizado(r.ultima); return (
          <span title="Último movimiento de % o de etapas en este proyecto" style={{ fontSize: 10, color: u.color, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.color, flexShrink: 0 }}/>{u.txt}
          </span>); })()}
      </div>
    </div>
  );
}

/** Días hábiles que lleva abierto algo, para ordenar por lo que más duele. */
export function diasAbierta(desde: string, hoy = new Date()): number {
  const d = new Date(desde + 'T12:00:00');
  if (isNaN(d.getTime())) return 0;
  // Días de calendario, no instantes: algo abierto el 10 lleva nueve días el
  // 19, se mire a las ocho de la mañana o a las seis de la tarde. Restando
  // marcas de tiempo, media mañana lo dejaba en ocho.
  const a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((a - b) / 86400000));
}

/**
 * Todo lo abierto, agrupado por proyecto.
 *
 * El KPI decía «3 · 7» y había que bajar hasta el final de la página para ver
 * cuáles eran. Ahora el número es el botón.
 */
export function AlertasModal({ rows, issues, onClose, onAbrir }: {
  rows: ProjectRow[]; issues: PlanIssue[];
  onClose: () => void; onAbrir?: (projectId: string) => void;
}) {
  const porProyecto = rows
    .map(r => ({
      r,
      items: issues
        .filter(i => i.planKey.split('::')[0] === r.p.id || issueImpacts(i).some(m => m.planKey.split('::')[0] === r.p.id))
        // Bloqueantes primero y, dentro de cada tipo, lo más viejo arriba.
        .sort((a, b) => (a.type === b.type ? 0 : a.type === 'bloqueante' ? -1 : 1)
                     || a.startDate.localeCompare(b.startDate)),
    }))
    .filter(g => g.items.length > 0)
    .sort((a, b) => {
      const bl = (g: typeof a) => g.items.filter(i => i.type === 'bloqueante').length;
      return bl(b) - bl(a) || b.items.length - a.items.length;
    });

  const totalBloq = porProyecto.reduce((s, g) => s + g.items.filter(i => i.type === 'bloqueante').length, 0);
  const totalAlert = porProyecto.reduce((s, g) => s + g.items.filter(i => i.type === 'alerta').length, 0);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:1000,
                                    display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:14, width:'min(760px, 96vw)', maxHeight:'86vh',
                 display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'13px 17px', borderBottom:'0.5px solid #e2e8f0' }}>
          <AlertTriangle size={15} color={totalBloq ? '#dc2626' : '#d97706'}/>
          <div style={{ flex:1 }}>
            <strong style={{ fontSize:13, color:'#111' }}>Alertas y bloqueantes abiertos</strong>
            <div style={{ fontSize:10.5, color:'#94a3b8' }}>
              {totalBloq} bloqueante{totalBloq === 1 ? '' : 's'} · {totalAlert} alerta{totalAlert === 1 ? '' : 's'} en {porProyecto.length} proyecto{porProyecto.length === 1 ? '' : 's'}
            </div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={16}/></button>
        </div>

        <div style={{ overflow:'auto', padding:'13px 17px' }}>
          {porProyecto.length === 0 && (
            <p style={{ margin:0, padding:'28px 0', textAlign:'center', fontSize:12.5, color:'#15803d' }}>
              Nada abierto. Ni un bloqueante.</p>
          )}
          {porProyecto.map(({ r, items }) => (
            <div key={r.p.id} style={{ marginBottom:15 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
                <span style={{ width:9, height:9, borderRadius:3, background:r.p.color, flexShrink:0 }}/>
                <span style={{ fontSize:12, fontWeight:700, color:'#111' }}>{r.p.name}</span>
                <span style={{ fontSize:10, color:'#94a3b8' }}>{r.pm?.name ?? r.p.area}</span>
                {onAbrir && (
                  <button onClick={() => onAbrir(r.p.id)}
                    style={{ marginLeft:'auto', fontSize:10, padding:'3px 9px', background:'#fff',
                             border:`0.5px solid ${r.p.color}60`, color:r.p.color, borderRadius:7,
                             cursor:'pointer', fontWeight:600 }}>Abrir plan</button>
                )}
              </div>
              <div style={{ border:'0.5px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
                {items.map((i, n) => {
                  const bloq = i.type === 'bloqueante';
                  const dias = diasAbierta(i.startDate);
                  return (
                    <div key={i.id} style={{ display:'flex', alignItems:'baseline', gap:9, padding:'8px 11px',
                                             background: bloq ? '#fef2f2' : '#fffbeb',
                                             borderTop: n ? '0.5px solid #f1f5f9' : 'none' }}>
                      <span style={{ fontSize:12, flexShrink:0 }}>{bloq ? '⛔' : '⚠'}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11.5, color:'#111', fontWeight:600 }}>{i.title}</div>
                        {i.responsable && (
                          <div style={{ fontSize:10, color:'#64748b', marginTop:1 }}>En mano de {i.responsable}</div>
                        )}
                      </div>
                      <span title={`Abierto desde ${i.startDate}`}
                        style={{ fontSize:10, fontWeight:700, flexShrink:0,
                                 color: dias > 14 ? '#b91c1c' : dias > 5 ? '#b45309' : '#64748b' }}>
                        {dias} d
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Standup ────────────────────────────────────────────────────────────────
// El de antes era una lista de porcentajes: cada proyecto con su número y sus
// bloqueantes. Eso no es un standup, es un tablero leído en voz alta. Un
// standup responde tres preguntas —qué se movió, en qué estamos, qué frena— y
// para contestarlas hay que bajar a la actividad, no quedarse en el promedio.
//
// Se puede copiar como texto (para pegarlo en Teams) o como markdown (para un
// correo o una página), y se elige la ventana: desde el viernes para el lunes,
// o la semana entera para el status.

type Ventana = 1 | 3 | 7 | 15;
const VENTANAS: { d: Ventana; label: string }[] = [
  { d: 1,  label: 'Desde ayer' },
  { d: 3,  label: '3 días' },
  { d: 7,  label: 'Semana' },
  { d: 15, label: '15 días' },
];

const fmtFecha = (d: Date) =>
  d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

/** Un proyecto, ya cocinado para el standup. */
export interface BloqueStandup {
  r: ProjectRow;
  cerradas: ActividadStandup[];
  movidas: ActividadStandup[];
  enCurso: ActividadStandup[];
  porVenir: ActividadStandup[];
  abiertas: PlanIssue[];
}

function armarBloques(rows: ProjectRow[], issues: PlanIssue[], dias: number): BloqueStandup[] {
  const detalle = getStandupDetalle(dias);
  const junta = (r: ProjectRow, campo: keyof Omit<DetalleStandup, 'desde'>) =>
    r.plans.flatMap(pl => detalle.get(pl.planKey)?.[campo] ?? []);

  return rows.map(r => ({
    r,
    cerradas: junta(r, 'cerradas'),
    movidas:  junta(r, 'movidas'),
    enCurso:  junta(r, 'enCurso'),
    porVenir: junta(r, 'porVenir'),
    abiertas: issues
      .filter(i => i.planKey.split('::')[0] === r.p.id || issueImpacts(i).some(m => m.planKey.split('::')[0] === r.p.id))
      .sort((a, b) => (a.type === b.type ? 0 : a.type === 'bloqueante' ? -1 : 1) || a.startDate.localeCompare(b.startDate)),
  }));
}

/** El standup en texto. `md` lo devuelve en markdown; si no, en texto plano. */
export function textoStandup(bloques: BloqueStandup[], dias: number, md: boolean): string {
  const hoy = new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const b = (t: string) => md ? `**${t}**` : t.toUpperCase();
  const L: string[] = [];

  L.push(md ? `# Standup · ${hoy}` : `STANDUP · ${hoy.toUpperCase()}`);
  const tot = bloques.reduce((a, x) => ({
    cerradas: a.cerradas + x.cerradas.length,
    enCurso:  a.enCurso + x.enCurso.length,
    bloq:     a.bloq + x.abiertas.filter(i => i.type === 'bloqueante').length,
  }), { cerradas: 0, enCurso: 0, bloq: 0 });
  L.push(`${tot.cerradas} terminadas en ${dias} día${dias === 1 ? '' : 's'} · ${tot.enCurso} en curso · ${tot.bloq} bloqueante${tot.bloq === 1 ? '' : 's'}`);
  L.push('');

  bloques.forEach(({ r, cerradas, movidas, enCurso, porVenir, abiertas }) => {
    if (!cerradas.length && !movidas.length && !enCurso.length && !porVenir.length && !abiertas.length) return;
    L.push(`${b(r.p.name)}${r.p.sda ? ` · ${r.p.sda}` : ''} — ${r.real.toFixed(0)}% real / ${r.exp.toFixed(0)}% esperado (${r.dif >= 0 ? '+' : ''}${r.dif.toFixed(1)})`);

    const lista = (titulo: string, items: ActividadStandup[], pinta: (a: ActividadStandup) => string) => {
      if (!items.length) return;
      L.push(`  ${titulo}`);
      items.slice(0, 8).forEach(a => L.push(`    - ${pinta(a)}`));
      if (items.length > 8) L.push(`    - …y ${items.length - 8} más`);
    };

    lista('Terminado', cerradas, a => `${a.nombre}${a.responsables.length ? ` (${a.responsables.map(n => n.split(' ')[0]).join(', ')})` : ''}`);
    lista('Avanzó', movidas, a => `${a.nombre}: ${a.de ?? 0}% → ${a.pct}%`);
    lista('En curso', enCurso, a => `${a.nombre} — ${a.pct}%${a.atrasada ? ' · ATRASADA' : ''}${a.fin ? ` · vence ${fmtFecha(a.fin)}` : ''}`);
    lista('Arranca', porVenir, a => `${a.nombre}${a.inicio ? ` · ${fmtFecha(a.inicio)}` : ''}`);

    if (abiertas.length) {
      L.push('  Frena');
      abiertas.forEach(i => L.push(`    ${i.type === 'bloqueante' ? '[BLOQUEANTE]' : '[alerta]'} ${i.title}`
        + ` — ${diasAbierta(i.startDate)} d${i.responsable ? ` · en mano de ${i.responsable}` : ''}`));
    }
    L.push('');
  });

  return L.join('\n');
}

export function StandupModal({ rows, issues, onClose }: { rows: ProjectRow[]; issues: PlanIssue[]; onClose: () => void }) {
  const [dias, setDias] = useState<Ventana>(7);
  const [copiado, setCopiado] = useState<'' | 'texto' | 'md'>('');
  const [soloMovidos, setSoloMovidos] = useState(false);

  const bloques = useMemo(() => armarBloques(rows, issues, dias), [rows, issues, dias]);
  const visibles = soloMovidos
    ? bloques.filter(x => x.cerradas.length || x.movidas.length || x.abiertas.length)
    : bloques;

  const copiar = (md: boolean) => {
    navigator.clipboard?.writeText(textoStandup(visibles, dias, md));
    setCopiado(md ? 'md' : 'texto');
    setTimeout(() => setCopiado(''), 2000);
  };

  const hoy = new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' });
  const tot = visibles.reduce((a, x) => ({
    cerradas: a.cerradas + x.cerradas.length,
    movidas:  a.movidas + x.movidas.length,
    enCurso:  a.enCurso + x.enCurso.length,
    bloq:     a.bloq + x.abiertas.filter(i => i.type === 'bloqueante').length,
  }), { cerradas: 0, movidas: 0, enCurso: 0, bloq: 0 });

  const estiloBtn = (activo: boolean): React.CSSProperties => ({
    fontSize:10.5, fontWeight:600, padding:'4px 10px', borderRadius:7, cursor:'pointer',
    border:`0.5px solid ${activo ? '#111' : '#e2e8f0'}`,
    background: activo ? '#111' : '#fff', color: activo ? '#fff' : '#475569',
  });

  const Grupo = ({ titulo, color, items, pinta }: {
    titulo: string; color: string; items: ActividadStandup[];
    pinta: (a: ActividadStandup) => React.ReactNode;
  }) => items.length === 0 ? null : (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
        <span style={{ width:5, height:5, borderRadius:'50%', background:color }}/>
        <span style={{ fontSize:9.5, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.06em' }}>
          {titulo}</span>
        <span style={{ fontSize:9.5, color:'#cbd5e1' }}>{items.length}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2, paddingLeft:10 }}>
        {items.map((a, i) => <div key={i} style={{ fontSize:11, color:'#475569', lineHeight:1.55 }}>{pinta(a)}</div>)}
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:1000,
                                    display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:14, width:'min(860px, 96vw)', maxHeight:'88vh',
                 display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Cabecera */}
        <div style={{ padding:'14px 18px', borderBottom:'0.5px solid #e2e8f0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
            <ClipboardList size={16} color="#111"/>
            <div style={{ flex:1 }}>
              <strong style={{ fontSize:13.5, color:'#111' }}>Standup</strong>
              <div style={{ fontSize:10.5, color:'#94a3b8', textTransform:'capitalize' }}>{hoy}</div>
            </div>
            <button onClick={() => copiar(false)}
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'6px 11px',
                       background: copiado === 'texto' ? '#15803d' : '#111', color:'#fff',
                       border:'none', borderRadius:8, cursor:'pointer' }}>
              {copiado === 'texto' ? <Check size={12}/> : <Copy size={12}/>} Copiar
            </button>
            <button onClick={() => copiar(true)} title="Con formato, para correo o página"
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'6px 11px',
                       background:'#fff', color: copiado === 'md' ? '#15803d' : '#475569',
                       border:'0.5px solid #e2e8f0', borderRadius:8, cursor:'pointer' }}>
              {copiado === 'md' ? <Check size={12}/> : <Copy size={12}/>} Markdown
            </button>
            <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', display:'flex' }}><X size={16}/></button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
            {VENTANAS.map(v => (
              <button key={v.d} onClick={() => setDias(v.d)} style={estiloBtn(dias === v.d)}>{v.label}</button>
            ))}
            <span style={{ width:1, height:16, background:'#e2e8f0', margin:'0 3px' }}/>
            <button onClick={() => setSoloMovidos(m => !m)} style={estiloBtn(soloMovidos)}>Solo con movimiento</button>
            <span style={{ marginLeft:'auto', fontSize:10.5, color:'#64748b' }}>
              <b style={{ color:'#15803d' }}>{tot.cerradas}</b> terminadas ·
              <b style={{ color:'#0369a1' }}> {tot.movidas}</b> avanzaron ·
              <b style={{ color:'#b45309' }}> {tot.enCurso}</b> en curso ·
              <b style={{ color: tot.bloq ? '#b91c1c' : '#15803d' }}> {tot.bloq}</b> frenan
            </span>
          </div>
        </div>

        {/* Cuerpo */}
        <div style={{ overflow:'auto', padding:'14px 18px' }}>
          {visibles.length === 0 && (
            <p style={{ margin:0, padding:'30px 0', textAlign:'center', fontSize:12.5, color:'#94a3b8' }}>
              Nada que contar en esta ventana. Prueba con un rango más amplio.</p>
          )}

          {visibles.map(({ r, cerradas, movidas, enCurso, porVenir, abiertas }) => (
            <div key={r.p.id} style={{ marginBottom:16, paddingBottom:14, borderBottom:'0.5px solid #f1f5f9' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                <span style={{ width:9, height:9, borderRadius:3, background:r.p.color, alignSelf:'center', flexShrink:0 }}/>
                <span style={{ fontSize:12.5, fontWeight:700, color:'#111' }}>{r.p.name}</span>
                {r.p.sda && <span style={{ fontSize:10, color:'#94a3b8' }}>{r.p.sda}</span>}
                <span style={{ fontSize:11, color:'#475569', marginLeft:'auto', fontVariantNumeric:'tabular-nums' }}>
                  {r.real.toFixed(0)}% <span style={{ color:'#cbd5e1' }}>/ {r.exp.toFixed(0)}%</span>
                </span>
                <span style={{ fontSize:11.5, fontWeight:700, color:difColor(r.dif), fontVariantNumeric:'tabular-nums' }}>
                  {r.dif >= 0 ? '+' : ''}{r.dif.toFixed(1)}
                </span>
              </div>

              <Grupo titulo="Terminado" color="#15803d" items={cerradas}
                pinta={a => <>✓ {a.nombre}
                  {a.responsables.length > 0 && <span style={{ color:'#94a3b8' }}> · {a.responsables.map(n => n.split(' ')[0]).join(', ')}</span>}
                </>}/>
              <Grupo titulo="Avanzó" color="#0369a1" items={movidas}
                pinta={a => <>{a.nombre}
                  <span style={{ color:'#94a3b8', fontVariantNumeric:'tabular-nums' }}> · {a.de ?? 0}% → {a.pct}%</span>
                </>}/>
              <Grupo titulo="En curso" color="#b45309" items={enCurso}
                pinta={a => <>{a.nombre}
                  <span style={{ color:'#94a3b8', fontVariantNumeric:'tabular-nums' }}> · {a.pct}%</span>
                  {a.atrasada && <span style={{ color:'#b91c1c', fontWeight:700 }}> · atrasada</span>}
                  {!a.atrasada && a.fin && <span style={{ color:'#cbd5e1' }}> · vence {fmtFecha(a.fin)}</span>}
                </>}/>
              <Grupo titulo="Arranca" color="#7c3aed" items={porVenir}
                pinta={a => <>{a.nombre}{a.inicio && <span style={{ color:'#94a3b8' }}> · {fmtFecha(a.inicio)}</span>}</>}/>

              {abiertas.length > 0 && (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#b91c1c' }}/>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#b91c1c', textTransform:'uppercase', letterSpacing:'.06em' }}>
                      Frena</span>
                    <span style={{ fontSize:9.5, color:'#cbd5e1' }}>{abiertas.length}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3, paddingLeft:10 }}>
                    {abiertas.map(i => (
                      <div key={i.id} style={{ fontSize:11, color:'#475569', lineHeight:1.55 }}>
                        {i.type === 'bloqueante' ? '⛔' : '⚠'} {i.title}
                        <span style={{ color: diasAbierta(i.startDate) > 14 ? '#b91c1c' : '#94a3b8' }}>
                          {' '}· {diasAbierta(i.startDate)} d
                        </span>
                        {i.responsable && <span style={{ color:'#94a3b8' }}> · {i.responsable}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!cerradas.length && !movidas.length && !enCurso.length && !porVenir.length && !abiertas.length && (
                <p style={{ margin:0, fontSize:11, color:'#cbd5e1', fontStyle:'italic' }}>Sin movimiento en esta ventana.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PMDashboard({ onViewChange }: PMDashboardProps) {
  const { user } = useAuth();
  const { rows, users, issues } = useDashboardData();
  const [showStandup, setShowStandup] = useState(false);
  const [showAlertas, setShowAlertas] = useState(false);
  const totalActs = rows.reduce((s, r) => s + r.nActs, 0);
  const globalReal = totalActs ? rows.reduce((s, r) => s + r.real * r.nActs, 0) / totalActs : 0;
  const globalExp = totalActs ? rows.reduce((s, r) => s + r.exp * r.nActs, 0) / totalActs : 0;
  const people = users.filter(u => u.role !== 'account_manager' && u.projectIds.some(p => rows.some(r => r.p.id === p)));
  const bloq = rows.reduce((s, r) => s + r.openBloq, 0), alerts = rows.reduce((s, r) => s + r.openAlert, 0);
  // La clave es la identidad del PM, no su nombre escrito: así los dos
  // proyectos del mismo líder caen en la misma fila aunque el área venga
  // escrita distinto en cada uno.
  const byPm = new Map<string, { nombre: string; pm?: AdminUser; prs: ProjectRow[] }>();
  rows.forEach(r => {
    const k = r.pm?.id ?? `area:${plano(r.p.area ?? 'sin-pm')}`;
    const g = byPm.get(k) ?? { nombre: r.pm?.name ?? r.p.area ?? 'Sin PM', pm: r.pm, prs: [] };
    g.prs.push(r);
    byPm.set(k, g);
  });
  // Más proyectos arriba; a igualdad, alfabético. Y dentro de cada fila, por
  // nombre: que la posición de una tarjeta no cambie entre recargas.
  const grupos = Array.from(byPm.values())
    .map(g => ({ ...g, prs: [...g.prs].sort((a, b) => a.p.name.localeCompare(b.p.name)) }))
    .sort((a, b) => b.prs.length - a.prs.length || a.nombre.localeCompare(b.nombre));
  // Quien ve todos los proyectos tiene vista de cuenta; el resto ve los suyos.
  // Por permiso y no por rol: con roles nuevos la comparación por nombre se rompe.
  const isAccount = canAccess(user?.role ?? 'developer', 'projects.view_all');

  return (
    <div id="pm-dashboard-root" style={{ padding: '28px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <div data-print-hide style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#111' }}>{isAccount ? 'Vista global de la cuenta' : 'Mis proyectos'}</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94a3b8' }}>{Array.from(new Set(rows.map(r => r.p.client))).join(' · ') || 'Sin proyectos'} · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onViewChange && canAccess(user?.role ?? 'developer', 'projects.create') && (
            <button onClick={() => onViewChange('setup-project')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#f0fdf4', color: '#15803d', border: '0.5px solid #bbf7d0', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}><Plus size={14} /> Nuevo proyecto</button>
          )}
          {canAccess(user?.role ?? 'developer', 'standup.generate') && (
            <button onClick={() => setShowStandup(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}><ClipboardList size={14} /> Generar standup</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 18 }}>
        <KPI icon={<Briefcase size={18} />} label="Proyectos activos" value={rows.length} sub={`${grupos.length} PM`} color="#7c3aed" />
        <KPI icon={<TrendingUp size={18} />} label="Avance global" value={`${globalReal.toFixed(0)}%`} sub={`esperado ${globalExp.toFixed(0)}% · ${globalReal - globalExp >= 0 ? '+' : ''}${(globalReal - globalExp).toFixed(1)}`} color={difColor(globalReal - globalExp)} />
        <KPI icon={<CheckSquare size={18} />} label="Tareas del plan" value={`${rows.reduce((s, r) => s + r.done, 0)}/${totalActs}`} sub={`${rows.reduce((s, r) => s + r.late, 0)} atrasadas`} color="#0369a1" />
        <KPI icon={<AlertTriangle size={18} />} label="Bloqueantes · alertas" value={`${bloq} · ${alerts}`}
          sub={bloq + alerts ? 'ver el detalle' : 'sin bloqueos'}
          color={bloq ? '#dc2626' : alerts ? '#d97706' : '#15803d'}
          onClick={bloq + alerts ? () => setShowAlertas(true) : undefined} />
        <KPI icon={<Users size={18} />} label="Personas" value={people.length} sub={`${people.filter(u => u.role === 'tech_lead').length} líderes · ${people.filter(u => u.role === 'developer').length} devs`} color="#0f766e" />
      </div>

      {rows.length === 0 && <div style={{ background: '#fff', border: '0.5px dashed #e2e8f0', borderRadius: 12, padding: 40, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>No hay proyectos activos. Crea el primero con "Nuevo proyecto".</div>}

      {grupos.map(({ nombre: pm, pm: pmUser, prs }) => {
        const n = prs.reduce((s, r) => s + r.nActs, 0); const avg = n ? prs.reduce((s, r) => s + r.real * r.nActs, 0) / n : 0;
        return (
          <div key={pm} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {pmUser && <div style={{ width: 26, height: 26, borderRadius: '50%', background: pmUser.avatarColor + '20', color: pmUser.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{pmUser.initials}</div>}
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{pm}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>· {prs.length} proyecto{prs.length !== 1 ? 's' : ''} · {avg.toFixed(0)}% prom.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 10 }}>
              {prs.map(r => <ProjectCard key={r.p.id} r={r} onOpen={onViewChange ? () => abrirProyecto(r.p.id, onViewChange) : undefined} />)}
            </div>
          </div>
        );
      })}

      {issues.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginTop: 6 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>Alertas y bloqueantes abiertos</p>
          {issues.filter(i => rows.some(r => i.planKey.split('::')[0] === r.p.id)).map(i => (
            <div key={i.id} style={{ display: 'flex', gap: 8, fontSize: 11, padding: '4px 0', borderTop: '0.5px solid #f1f5f9' }}>
              <span>{i.type === 'bloqueante' ? '⛔' : '⚠'}</span><span style={{ flex: 1, color: '#111' }}>{i.title}</span>
              <span style={{ fontSize: 10, color: '#64748b' }}>{i.planKey}</span><span style={{ fontSize: 10, color: '#94a3b8' }}>desde {i.startDate}</span>
            </div>
          ))}
        </div>
      )}
      {showAlertas && (
        <AlertasModal rows={rows} issues={issues} onClose={() => setShowAlertas(false)}
          onAbrir={onViewChange ? id => { setShowAlertas(false); abrirProyecto(id, onViewChange); } : undefined}/>
      )}
      {showStandup && <StandupModal rows={rows} issues={issues} onClose={() => setShowStandup(false)} />}
    </div>
  );
}

export function ProyectosPage({ onViewChange }: PMDashboardProps = {}) {
  const { rows } = useDashboardData();
  const abrir = (id: string) => onViewChange
    ? () => abrirProyecto(id, onViewChange)
    : undefined;
  return (
    <div style={{ padding: '28px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#111' }}>Proyectos</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: '#94a3b8' }}>{rows.length} proyecto{rows.length !== 1 ? 's' : ''} activo{rows.length !== 1 ? 's' : ''}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 10 }}>{rows.map(r => <ProjectCard key={r.p.id} r={r} onOpen={abrir(r.p.id)} />)}</div>
    </div>
  );
}
