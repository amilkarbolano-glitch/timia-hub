// ─── ImputacionesJira — gestión de tickets Jira por Q / proyecto ─────────────
import React, { useState, useRef } from 'react';
import { Plus, Copy, Check, Search, X } from 'lucide-react';
import { PROJECTS, MOCK_ACCOUNTS, canAccess, AuthUser } from '../contexts/AuthContext';
import { adminStore, ImputacionEntry, JiraStatus } from '../lib/adminStore';

// ─── Constantes ───────────────────────────────────────────────────────────────

export const JIRA_STATUS_CFG: Record<JiraStatus, { bg: string; color: string; solid?: boolean }> = {
  'New':             { bg: '#f8fafc', color: '#64748b' },
  'Analysing':       { bg: '#e0f2fe', color: '#0369a1' },
  'In Progress':     { bg: '#dbeafe', color: '#1d4ed8' },
  'Ready':           { bg: '#f0fdf4', color: '#15803d' },
  'Ready to Verify': { bg: '#f3e8ff', color: '#7c3aed' },
  'Ready to Deploy': { bg: '#d1fae5', color: '#065f46' },
  'Deployed':        { bg: '#15803d', color: '#ffffff', solid: true },
  'Blocked':         { bg: '#dc2626', color: '#ffffff', solid: true },
  'Discarded':       { bg: '#fee2e2', color: '#991b1b' },
  'Test':            { bg: '#ffedd5', color: '#c2410c' },
  'Accepted':        { bg: '#bbf7d0', color: '#14532d' },
};

const ALL_STATUSES = Object.keys(JIRA_STATUS_CFG) as JiraStatus[];

const TICKET_TYPES  = ['Enabler Delivery', 'Deployment', 'Bug', 'Story', 'Task'] as const;
const Q_OPTIONS     = ['Q1-2026', 'Q2-2026', 'Q2-II-2026', 'Q3-2026', 'Q4-2026'] as const;
const PHASES        = ['Análisis y Diseño', 'Codificación', 'Pruebas', 'UAT', 'Despliegue', 'Soporte'];
const MONTHS        = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PHASE_COLORS: Record<string, string> = {
  'Análisis y Diseño': '#7c3aed', 'Codificación': '#0891b2',
  'Pruebas': '#ea580c', 'UAT': '#d97706', 'Despliegue': '#15803d', 'Soporte': '#64748b',
};

interface FormState {
  jiraId: string; summary: string; type: string; status: JiraStatus;
  assigneeIds: string[]; month: string; weeks: string; q: string;
  phase: string; hoursEst: number; hoursImputed: number; context: string;
}

const BLANK_FORM: FormState = {
  jiraId: '', summary: '', type: 'Enabler Delivery', status: 'New',
  assigneeIds: [], month: '', weeks: '', q: 'Q2-II-2026',
  phase: 'Análisis y Diseño', hoursEst: 0, hoursImputed: 0, context: '',
};

// ─── Mini-components ──────────────────────────────────────────────────────────

/** Badge coloreado del estado Jira */
function StatusBadge({ status }: { status: JiraStatus }) {
  const s = JIRA_STATUS_CFG[status] ?? JIRA_STATUS_CFG['New'];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 9px', borderRadius: 5,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, color: s.color,
      border: s.solid ? 'none' : `0.5px solid ${s.color}35`,
    }}>
      {status}
    </span>
  );
}

/** Select con el badge del estado activo */
function StatusSelect({ value, onChange, disabled }: {
  value: JiraStatus;
  onChange: (v: JiraStatus) => void;
  disabled?: boolean;
}) {
  const s = JIRA_STATUS_CFG[value] ?? JIRA_STATUS_CFG['New'];
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as JiraStatus)}
      disabled={disabled}
      style={{
        appearance: 'none', border: s.solid ? 'none' : `0.5px solid ${s.color}40`,
        borderRadius: 6, padding: '4px 22px 4px 9px',
        fontSize: 10, fontWeight: 700,
        background: `${s.bg} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(s.color)}' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 5px center`,
        color: s.color, cursor: disabled ? 'default' : 'pointer', outline: 'none',
      }}
    >
      {ALL_STATUSES.map(k => <option key={k} value={k}>{k}</option>)}
    </select>
  );
}

/** Badge Jira con botón copiar */
function JiraBadge({ jiraId }: { jiraId: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(jiraId).catch(() => {});
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
      <a
        href={`https://jira.bbva.com/browse/${jiraId}`}
        target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
          background: '#eff6ff', color: '#1d4ed8', textDecoration: 'none',
          border: '0.5px solid #bfdbfe', whiteSpace: 'nowrap',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        {jiraId}
      </a>
      <button
        onClick={copy}
        title="Copiar ID del ticket"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
          border: `0.5px solid ${copied ? '#86efac' : '#e2e8f0'}`,
          background: copied ? '#f0fdf4' : '#f8fafc',
          color: copied ? '#15803d' : '#94a3b8',
          transition: 'all .15s',
        }}
      >
        {copied ? <Check size={10}/> : <Copy size={10}/>}
      </button>
    </div>
  );
}

/** Avatares de asignados */
function AssigneeAvatars({ ids, pool }: { ids: string[]; pool: AuthUser[] }) {
  if (!ids || ids.length === 0) {
    return <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Sin asignar</span>;
  }
  const isTodos = ids.includes('todos');
  const users = isTodos
    ? pool.filter(u => u.role !== 'pm')
    : ids.map(id => pool.find(u => u.id === id)).filter(Boolean) as AuthUser[];
  const shown = users.slice(0, 4);
  const extra = users.length - shown.length;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((u, i) => (
        <div
          key={u.id}
          title={u.name}
          style={{
            width: 24, height: 24, borderRadius: '50%',
            background: u.avatarColor + '20',
            border: `1.5px solid ${u.avatarColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, color: u.avatarColor,
            marginLeft: i === 0 ? 0 : -6, zIndex: shown.length - i,
            position: 'relative',
          }}
        >
          {u.initials}
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: '#f1f5f9', border: '1.5px solid #cbd5e1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700, color: '#64748b',
          marginLeft: -6, position: 'relative',
        }}>
          +{extra}
        </div>
      )}
      {isTodos && (
        <span style={{ fontSize: 9, color: '#64748b', marginLeft: 6 }}>Equipo</span>
      )}
    </div>
  );
}

/** Barra de horas imputadas vs estimadas */
function HoursBar({ imp, est }: { imp: number; est: number }) {
  if (!est) return <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>;
  const pct = Math.min(100, Math.round((imp / est) * 100));
  const barColor = pct >= 100 ? '#15803d' : pct >= 60 ? '#0891b2' : pct >= 30 ? '#d97706' : '#94a3b8';
  return (
    <div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'baseline', marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{imp}h</span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>/ {est}h</span>
      </div>
      <div style={{ width: 72, height: 4, borderRadius: 2, background: '#f1f5f9' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2 }}/>
      </div>
    </div>
  );
}

// ─── Component principal ──────────────────────────────────────────────────────

interface Props { user: any }

export default function ImputacionesJira({ user }: Props) {
  const canWrite = canAccess(user?.role, 'write_bitacora');

  // Proyectos accesibles según rol
  const accessibleIds: string[] = user?.role === 'pm'
    ? PROJECTS.map((p: any) => p.id)
    : (user?.projectIds ?? []);
  const accessibleProjects = PROJECTS.filter((p: any) => accessibleIds.includes(p.id));

  // Estado
  const [entries, setEntries]       = useState<ImputacionEntry[]>(() => adminStore.getImputaciones());
  const [selectedProj, setSelProj]  = useState<string>(accessibleProjects[0]?.id ?? '');
  const [filterQ, setFilterQ]       = useState<string>('all');
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(BLANK_FORM);

  function persist(next: ImputacionEntry[]) {
    setEntries(next);
    adminStore.saveImputaciones(next);
  }

  // Proyecto y usuarios del proyecto seleccionado
  const proj        = PROJECTS.find((p: any) => p.id === selectedProj);
  const projColor   = (proj as any)?.color ?? '#dc2626';
  const projectPool = MOCK_ACCOUNTS.filter(u =>
    u.role === 'pm' || u.projectIds.includes(selectedProj)
  );

  // Filtrado de entries visibles
  const visibleEntries = entries.filter(e => {
    if (e.projectId !== selectedProj) return false;
    if (filterQ !== 'all' && e.q !== filterQ) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.jiraId.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Estadísticas
  const stats = {
    total:   visibleEntries.length,
    done:    visibleEntries.filter(e => e.status === 'Deployed' || e.status === 'Accepted').length,
    active:  visibleEntries.filter(e => ['Analysing','In Progress','Ready','Ready to Verify','Ready to Deploy','Test'].includes(e.status)).length,
    blocked: visibleEntries.filter(e => e.status === 'Blocked').length,
    hoursE:  visibleEntries.reduce((s, e) => s + (e.hoursEst || 0), 0),
    hoursI:  visibleEntries.reduce((s, e) => s + (e.hoursImputed || 0), 0),
  };

  // Abrir formulario crear
  function openCreate() {
    setEditId(null);
    setForm({ ...BLANK_FORM, q: filterQ !== 'all' ? filterQ : 'Q2-II-2026' });
    setShowForm(true);
  }

  // Abrir formulario editar
  function openEdit(e: ImputacionEntry) {
    if (!canWrite) return;
    setEditId(e.id);
    setForm({
      jiraId: e.jiraId, summary: e.summary, type: e.type, status: e.status,
      assigneeIds: e.assigneeIds, month: e.month, weeks: e.weeks,
      q: e.q, phase: e.phase, hoursEst: e.hoursEst,
      hoursImputed: e.hoursImputed, context: e.context,
    });
    setShowForm(true);
  }

  // Guardar form
  function submitForm() {
    if (!form.jiraId.trim()) return;
    if (editId) {
      persist(entries.map(e => e.id === editId ? { ...e, ...form } : e));
    } else {
      const newEntry: ImputacionEntry = {
        id: `imp-${Date.now()}`,
        projectId: selectedProj,
        createdBy: user?.name ?? 'Sistema',
        createdAt: new Date().toISOString().slice(0, 10),
        ...form,
      };
      persist([...entries, newEntry]);
    }
    setShowForm(false);
  }

  // Eliminar
  function deleteEntry(id: string) {
    if (window.confirm('¿Eliminar esta imputación?')) {
      persist(entries.filter(e => e.id !== id));
    }
  }

  // Cambio de estado inline (disponible para todos)
  function updateStatus(id: string, status: JiraStatus) {
    persist(entries.map(e => e.id === id ? { ...e, status } : e));
  }

  // ── Estilos helper ─────────────────────────────────────────────────────────
  const inp  = (): React.CSSProperties => ({ width: '100%', padding: '7px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, outline: 'none', background: '#fff', boxSizing: 'border-box' });
  const lbl  = (): React.CSSProperties => ({ display: 'block', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 18 }}>

      {/* ── Sidebar proyectos ──────────────────────────────────────────── */}
      <div style={{ width: 138, flexShrink: 0 }}>
        <p style={{ margin: '0 0 8px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>Proyectos</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {accessibleProjects.map((p: any) => {
            const active = p.id === selectedProj;
            const cnt    = entries.filter(e => e.projectId === p.id).length;
            return (
              <button
                key={p.id}
                onClick={() => setSelProj(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                  textAlign: 'left', transition: 'all .12s',
                  background: active ? `${p.color}14` : 'transparent',
                  border: `0.5px solid ${active ? p.color + '55' : 'transparent'}`,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }}/>
                <span style={{ flex: 1, fontSize: 11, fontWeight: active ? 700 : 400, color: active ? p.color : '#374151' }}>{p.id}</span>
                {cnt > 0 && (
                  <span style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 700,
                    background: active ? p.color : '#f1f5f9',
                    color: active ? '#fff' : '#64748b',
                  }}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda de estados */}
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>Estados</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ALL_STATUSES.map(k => {
              const s = JIRA_STATUS_CFG[k];
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#64748b' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.bg, border: `0.5px solid ${s.color}55`, flexShrink: 0 }}/>
                  {k}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Contenido principal ────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {/* Q pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['all', ...Q_OPTIONS] as string[]).map(q => (
              <button
                key={q}
                onClick={() => setFilterQ(q)}
                style={{
                  padding: '5px 12px', fontSize: 11, borderRadius: 20,
                  border: `0.5px solid ${filterQ === q ? projColor : '#e2e8f0'}`,
                  background: filterQ === q ? projColor : '#fff',
                  color: filterQ === q ? '#fff' : '#64748b',
                  cursor: 'pointer', fontWeight: 500, transition: 'all .12s',
                }}
              >
                {q === 'all' ? 'Todos los Q' : q}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#f8fafc', flex: 1, maxWidth: 220 }}>
            <Search size={12} style={{ color: '#94a3b8', flexShrink: 0 }}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar ticket…"
              style={{ border: 'none', background: 'transparent', fontSize: 11, color: '#374151', outline: 'none', width: '100%' }}
            />
          </div>

          {/* Nueva imputación (sólo write_bitacora) */}
          {canWrite && (
            <button
              onClick={openCreate}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', fontSize: 12, fontWeight: 600,
                background: projColor, color: '#fff',
                border: 'none', borderRadius: 8, cursor: 'pointer', marginLeft: 'auto',
              }}
            >
              <Plus size={13}/> Nueva imputación
            </button>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 14 }}>
          {([
            { label: 'Total tickets',  value: stats.total,   color: '#374151' },
            { label: 'Finalizados',    value: stats.done,    color: '#15803d' },
            { label: 'En progreso',    value: stats.active,  color: '#1d4ed8' },
            { label: 'Bloqueados',     value: stats.blocked, color: '#dc2626' },
            {
              label: `${stats.hoursI}h / ${stats.hoursE}h`,
              value: stats.hoursE ? Math.round((stats.hoursI / stats.hoursE) * 100) + '%' : '—',
              color: '#0891b2',
            },
          ] as { label: string; value: string | number; color: string }[]).map(s => (
            <div key={s.label} style={{ background: '#fff', border: '0.5px solid #f1f5f9', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,.03)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
              {selectedProj} · {visibleEntries.length} ticket{visibleEntries.length !== 1 ? 's' : ''}
              {filterQ !== 'all' && <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>{filterQ}</span>}
            </span>
          </div>

          {visibleEntries.length === 0 ? (
            <div style={{ padding: '52px 24px', textAlign: 'center', color: '#94a3b8' }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block', opacity: .35 }}>
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
              </svg>
              <p style={{ fontSize: 13, marginBottom: 5, color: '#64748b' }}>Sin imputaciones para este filtro</p>
              {canWrite && <p style={{ fontSize: 11 }}>Crea la primera con <strong>+ Nueva imputación</strong></p>}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Ticket Jira', 'Tipo', 'Descripción', 'Estado', 'Asignado a', 'Q · Mes', 'Fase', 'Horas', ...(canWrite ? [''] : [])].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: 'left',
                        fontSize: 9, fontWeight: 700, color: '#94a3b8',
                        textTransform: 'uppercase', letterSpacing: '.07em',
                        borderBottom: '0.5px solid #f1f5f9', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map(e => (
                    <tr
                      key={e.id}
                      style={{ borderBottom: '0.5px solid #f8fafc', transition: 'background .1s' }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                    >
                      {/* Ticket */}
                      <td style={{ padding: '10px 12px' }}>
                        <JiraBadge jiraId={e.jiraId}/>
                      </td>
                      {/* Tipo */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#eff6ff', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                          {e.type === 'Enabler Delivery' ? 'Enabler' : e.type}
                        </span>
                      </td>
                      {/* Summary */}
                      <td style={{ padding: '10px 12px', maxWidth: 240 }}>
                        <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, color: '#374151' }} title={e.summary}>
                          {e.summary || <em style={{ color: '#94a3b8' }}>Sin descripción</em>}
                        </div>
                        {e.context && (
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                            {e.context}
                          </div>
                        )}
                      </td>
                      {/* Estado */}
                      <td style={{ padding: '10px 12px' }}>
                        <StatusSelect value={e.status} onChange={v => updateStatus(e.id, v)}/>
                      </td>
                      {/* Asignados */}
                      <td style={{ padding: '10px 12px' }}>
                        <AssigneeAvatars ids={e.assigneeIds} pool={projectPool}/>
                      </td>
                      {/* Q · Mes */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{e.q}</div>
                        {(e.month || e.weeks) && (
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                            {e.month}{e.month && e.weeks ? ' · ' : ''}{e.weeks ? `Sem. ${e.weeks}` : ''}
                          </div>
                        )}
                      </td>
                      {/* Fase */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {e.phase ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PHASE_COLORS[e.phase] ?? '#94a3b8', flexShrink: 0 }}/>
                            {e.phase}
                          </div>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      {/* Horas */}
                      <td style={{ padding: '10px 12px' }}>
                        <HoursBar imp={e.hoursImputed} est={e.hoursEst}/>
                      </td>
                      {/* Acciones (solo write) */}
                      {canWrite && (
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => openEdit(e)} style={{ padding: '3px 8px', fontSize: 10, border: '0.5px solid #e2e8f0', borderRadius: 5, background: '#f8fafc', cursor: 'pointer', color: '#374151' }}>
                              Editar
                            </button>
                            <button onClick={() => deleteEntry(e.id)} style={{ padding: '3px 8px', fontSize: 10, border: '0.5px solid #fee2e2', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>
                              ×
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Nota de pie */}
        <p style={{ margin: '10px 0 0', fontSize: 10, color: '#94a3b8' }}>
          {canWrite
            ? 'Solo PM y Tech Leads pueden crear y editar imputaciones. Todos los miembros pueden cambiar el estado de los tickets asignados.'
            : 'Cambia el estado de tus tickets directamente desde la columna "Estado".'}
        </p>
      </div>

      {/* ── Modal formulario ─────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.38)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 72px rgba(0,0,0,.22)' }}>

            {/* Header modal */}
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', margin: 0 }}>
                  {editId ? 'Editar imputación' : 'Nueva imputación'}
                </h3>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>Proyecto: <strong>{selectedProj}</strong></p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ padding: 6, border: 'none', background: '#f1f5f9', borderRadius: 8, cursor: 'pointer' }}>
                <X size={16} color="#64748b"/>
              </button>
            </div>

            {/* Cuerpo modal */}
            <div style={{ padding: '20px' }}>

              {/* Fila 1: Jira ID + Tipo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl()}>Ticket Jira *</label>
                  <input
                    value={form.jiraId}
                    onChange={e => setForm(f => ({ ...f, jiraId: e.target.value.toUpperCase() }))}
                    placeholder="DECRONOS-1234"
                    autoFocus
                    style={inp()}
                  />
                </div>
                <div>
                  <label style={lbl()}>Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp()}>
                    {TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl()}>Descripción</label>
                <input
                  value={form.summary}
                  onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                  placeholder="Ej: Procesamiento Input FICO — ADA Scala"
                  style={inp()}
                />
              </div>

              {/* Fila 2: Estado + Q */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl()}>Estado inicial</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as JiraStatus }))} style={inp()}>
                    {ALL_STATUSES.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl()}>Quarter</label>
                  <select value={form.q} onChange={e => setForm(f => ({ ...f, q: e.target.value }))} style={inp()}>
                    {Q_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>

              {/* Fila 3: Mes + Semanas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl()}>Mes</label>
                  <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} style={inp()}>
                    <option value="">— Sin mes —</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl()}>Semanas</label>
                  <input
                    value={form.weeks}
                    onChange={e => setForm(f => ({ ...f, weeks: e.target.value }))}
                    placeholder="Ej: 1–4  /  16–26"
                    style={inp()}
                  />
                </div>
              </div>

              {/* Fila 4: Fase + Horas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={lbl()}>Fase</label>
                  <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} style={inp()}>
                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl()}>Horas estimadas</label>
                  <input
                    type="number" min={0}
                    value={form.hoursEst || ''}
                    onChange={e => setForm(f => ({ ...f, hoursEst: Number(e.target.value) || 0 }))}
                    placeholder="Ej: 8"
                    style={inp()}
                  />
                </div>
              </div>

              {/* Horas imputadas (solo en edición) */}
              {editId && (
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl()}>Horas imputadas (real)</label>
                  <input
                    type="number" min={0}
                    value={form.hoursImputed || ''}
                    onChange={e => setForm(f => ({ ...f, hoursImputed: Number(e.target.value) || 0 }))}
                    placeholder="Ej: 4"
                    style={inp()}
                  />
                </div>
              )}

              {/* Asignados */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl()}>Asignar a</label>
                <div style={{ border: '0.5px solid #e2e8f0', borderRadius: 9, padding: '10px 12px', background: '#fafafa' }}>
                  {/* Opción "Todo el equipo" */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0', marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={form.assigneeIds.includes('todos')}
                      onChange={e => setForm(f => ({
                        ...f,
                        assigneeIds: e.target.checked ? ['todos'] : [],
                      }))}
                      style={{ width: 14, height: 14 }}
                    />
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#47556922', border: '1.5px solid #475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#475569' }}>
                      Td
                    </div>
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Todo el equipo</span>
                  </label>
                  <div style={{ borderTop: '0.5px solid #f1f5f9', paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {projectPool.filter(u => u.role !== 'pm').map(u => {
                      const isTodos   = form.assigneeIds.includes('todos');
                      const isChecked = isTodos || form.assigneeIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isTodos ? 'default' : 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 12, color: '#374151', background: isChecked ? u.avatarColor + '12' : 'transparent', border: `0.5px solid ${isChecked ? u.avatarColor + '40' : 'transparent'}` }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isTodos}
                            onChange={e => {
                              if (e.target.checked) {
                                setForm(f => ({ ...f, assigneeIds: [...f.assigneeIds.filter(x => x !== 'todos'), u.id] }));
                              } else {
                                setForm(f => ({ ...f, assigneeIds: f.assigneeIds.filter(x => x !== u.id) }));
                              }
                            }}
                            style={{ width: 13, height: 13 }}
                          />
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: u.avatarColor + '22', border: `1.5px solid ${u.avatarColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: u.avatarColor }}>
                            {u.initials}
                          </div>
                          {u.name.split(' ').slice(0, 2).join(' ')}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Contexto / notas */}
              <div style={{ marginBottom: 18 }}>
                <label style={lbl()}>Contexto / Notas</label>
                <textarea
                  value={form.context}
                  onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                  rows={2}
                  placeholder="Ej: Relacionado con DECRONOS-1450. Cada persona imputa en su sub-ticket."
                  style={{ ...inp(), resize: 'vertical' } as React.CSSProperties}
                />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                  Cancelar
                </button>
                <button
                  onClick={submitForm}
                  disabled={!form.jiraId.trim()}
                  style={{
                    padding: '8px 20px', fontSize: 12, fontWeight: 600,
                    background: form.jiraId.trim() ? projColor : '#94a3b8',
                    color: '#fff', border: 'none', borderRadius: 8,
                    cursor: form.jiraId.trim() ? 'pointer' : 'default',
                    transition: 'background .15s',
                  }}
                >
                  {editId ? 'Guardar cambios' : 'Crear imputación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
