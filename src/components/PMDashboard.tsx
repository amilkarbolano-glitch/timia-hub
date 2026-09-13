// ─── Dashboard ejecutivo (PM / gerente de cuenta) — 100 % datos reales ───────
// KPIs globales, avance por proyecto y por PM, alertas/bloqueantes abiertos,
// riesgo por proyecto y standup generado desde el estado actual.
import React, { useMemo, useState } from 'react';
import { Mail, AlertTriangle, TrendingUp, Users, Briefcase, CheckSquare, X, Copy, Check, Plus } from 'lucide-react';
import { useAuth, canAccess } from '../contexts/AuthContext';
import { adminStore, issueImpacts, type AdminProject, type AdminUser, type PlanIssue } from '../lib/adminStore';
import { getPlanSummaries, type PlanSummary } from './PlanDeTrabajo';

type PMView = 'setup-project' | 'estimaciones' | 'plan-trabajo' | 'admin' | 'bitacora' | 'analytics';
interface PMDashboardProps { onViewChange?: (v: PMView) => void; }

const fmtD = (d: Date | null) => d ? `${d.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}` : '—';

interface ProjectRow {
  p: AdminProject; plans: PlanSummary[]; real: number; exp: number; dif: number; nActs: number; done: number; late: number;
  openBloq: number; openAlert: number; team: AdminUser[]; pm?: AdminUser; leads: AdminUser[]; tasksOpen: number; tasksDone: number;
  start: Date | null; end: Date | null; risk: number; riskWhy: string[];
}

function useDashboardData() {
  const { user } = useAuth();
  return useMemo(() => {
    const all = canAccess(user?.role ?? 'developer', 'projects.view_all');
    const projects = adminStore.getProjects().filter(p => p.active && (all || (user?.projectIds ?? []).includes(p.id)));
    const users = adminStore.getUsers().filter(u => u.active);
    const summaries = getPlanSummaries();
    const issues = adminStore.getPlanIssues().filter(i => !i.endDate);
    const tasks = adminStore.getKanbanTasks();
    const rows: ProjectRow[] = projects.map(p => {
      const plans = summaries.filter(s => s.projectId === p.id);
      const nActs = plans.reduce((s, x) => s + x.nActs, 0);
      const real = nActs ? plans.reduce((s, x) => s + x.real * x.nActs, 0) / nActs : 0;
      const exp = nActs ? plans.reduce((s, x) => s + x.exp * x.nActs, 0) / nActs : 0;
      const team = users.filter(u => u.projectIds.includes(p.id) && u.role !== 'account_manager');
      const pm = team.find(u => u.role === 'pm') ?? users.find(u => u.role === 'pm' && u.name === p.area);
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
        start: starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : null, end: ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : null, risk: Math.min(100, risk), riskWhy: why };
    });
    return { rows, users, issues, summaries };
  }, [user]);
}

const KPI = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) => (
  <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
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
    <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderLeft: `4px solid ${r.p.color}`, borderRadius: 12, padding: '12px 16px' }}>
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
      {onOpen && <button onClick={onOpen} style={{ marginTop: 8, fontSize: 10, padding: '4px 10px', background: '#fff', border: `0.5px solid ${r.p.color}60`, color: r.p.color, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Abrir plan de trabajo</button>}
    </div>
  );
}

function StandupModal({ rows, issues, onClose }: { rows: ProjectRow[]; issues: PlanIssue[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const lines: string[] = [`*Standup Timia Hub — ${today}*`, ''];
  rows.forEach(r => {
    lines.push(`*${r.p.name}* (${r.p.id}${r.p.sda ? ` · ${r.p.sda}` : ''}) — ${r.real.toFixed(0)}% real / ${r.exp.toFixed(0)}% esperado (${r.dif >= 0 ? '+' : ''}${r.dif.toFixed(1)})`);
    lines.push(`  • ${r.done}/${r.nActs} tareas completadas${r.late ? ` · ${r.late} atrasadas` : ''}${r.tasksOpen ? ` · ${r.tasksOpen} tarjetas abiertas en el tablero` : ''}`);
    const pi = issues.filter(i => i.planKey.split('::')[0] === r.p.id || issueImpacts(i).some(m => m.planKey.split('::')[0] === r.p.id));
    pi.forEach(i => lines.push(`  ${i.type === 'bloqueante' ? '⛔' : '⚠'} ${i.title} (desde ${i.startDate})`));
    if (r.riskWhy.length) lines.push(`  ▸ Riesgo ${r.risk}: ${r.riskWhy.join(', ')}`);
    lines.push('');
  });
  const text = lines.join('\n');
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 'min(720px, 96vw)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid #e2e8f0' }}>
          <Mail size={14} /><strong style={{ fontSize: 13, flex: 1 }}>Standup generado con datos actuales</strong>
          <button onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '6px 10px', background: copied ? '#15803d' : '#111', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer' }}>{copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}</button>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}><X size={16} /></button>
        </div>
        <pre style={{ margin: 0, padding: 16, fontSize: 11, lineHeight: 1.6, color: '#1e293b', whiteSpace: 'pre-wrap', overflow: 'auto', fontFamily: 'inherit' }}>{text}</pre>
      </div>
    </div>
  );
}

export default function PMDashboard({ onViewChange }: PMDashboardProps) {
  const { user } = useAuth();
  const { rows, users, issues } = useDashboardData();
  const [showStandup, setShowStandup] = useState(false);
  const totalActs = rows.reduce((s, r) => s + r.nActs, 0);
  const globalReal = totalActs ? rows.reduce((s, r) => s + r.real * r.nActs, 0) / totalActs : 0;
  const globalExp = totalActs ? rows.reduce((s, r) => s + r.exp * r.nActs, 0) / totalActs : 0;
  const people = users.filter(u => u.role !== 'account_manager' && u.projectIds.some(p => rows.some(r => r.p.id === p)));
  const bloq = rows.reduce((s, r) => s + r.openBloq, 0), alerts = rows.reduce((s, r) => s + r.openAlert, 0);
  const byPm = new Map<string, ProjectRow[]>(); rows.forEach(r => { const k = r.pm?.name ?? r.p.area; byPm.set(k, [...(byPm.get(k) ?? []), r]); });
  const isAccount = user?.role === 'account_manager';

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
            <button onClick={() => setShowStandup(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}><Mail size={14} /> Generar standup</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 18 }}>
        <KPI icon={<Briefcase size={18} />} label="Proyectos activos" value={rows.length} sub={`${byPm.size} PM`} color="#7c3aed" />
        <KPI icon={<TrendingUp size={18} />} label="Avance global" value={`${globalReal.toFixed(0)}%`} sub={`esperado ${globalExp.toFixed(0)}% · ${globalReal - globalExp >= 0 ? '+' : ''}${(globalReal - globalExp).toFixed(1)}`} color={difColor(globalReal - globalExp)} />
        <KPI icon={<CheckSquare size={18} />} label="Tareas del plan" value={`${rows.reduce((s, r) => s + r.done, 0)}/${totalActs}`} sub={`${rows.reduce((s, r) => s + r.late, 0)} atrasadas`} color="#0369a1" />
        <KPI icon={<AlertTriangle size={18} />} label="Bloqueantes · alertas" value={`${bloq} · ${alerts}`} sub={bloq ? 'requieren acción' : 'sin bloqueos'} color={bloq ? '#dc2626' : alerts ? '#d97706' : '#15803d'} />
        <KPI icon={<Users size={18} />} label="Personas" value={people.length} sub={`${people.filter(u => u.role === 'tech_lead').length} líderes · ${people.filter(u => u.role === 'developer').length} devs`} color="#0f766e" />
      </div>

      {rows.length === 0 && <div style={{ background: '#fff', border: '0.5px dashed #e2e8f0', borderRadius: 12, padding: 40, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>No hay proyectos activos. Crea el primero con "Nuevo proyecto".</div>}

      {Array.from(byPm.entries()).map(([pm, prs]) => {
        const n = prs.reduce((s, r) => s + r.nActs, 0); const avg = n ? prs.reduce((s, r) => s + r.real * r.nActs, 0) / n : 0;
        const pmUser = users.find(u => u.name === pm);
        return (
          <div key={pm} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {pmUser && <div style={{ width: 26, height: 26, borderRadius: '50%', background: pmUser.avatarColor + '20', color: pmUser.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{pmUser.initials}</div>}
              <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{pm}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>· {prs.length} proyecto{prs.length !== 1 ? 's' : ''} · {avg.toFixed(0)}% prom.</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 10 }}>
              {prs.map(r => <ProjectCard key={r.p.id} r={r} onOpen={onViewChange ? () => { localStorage.setItem('timia_last_plan_project', r.p.id); onViewChange('plan-trabajo'); } : undefined} />)}
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
      {showStandup && <StandupModal rows={rows} issues={issues} onClose={() => setShowStandup(false)} />}
    </div>
  );
}

export function ProyectosPage() {
  const { rows } = useDashboardData();
  return (
    <div style={{ padding: '28px 36px', maxWidth: 1600, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: '#111' }}>Proyectos</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: '#94a3b8' }}>{rows.length} proyecto{rows.length !== 1 ? 's' : ''} activo{rows.length !== 1 ? 's' : ''}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 10 }}>{rows.map(r => <ProjectCard key={r.p.id} r={r} />)}</div>
    </div>
  );
}
