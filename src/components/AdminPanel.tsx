import React, { useState } from 'react';
import {
  Folders, Users, Clock, Calendar, Building2, Plus, Trash2,
  Edit2, Save, X, CheckCircle, AlertTriangle,
} from 'lucide-react';
import {
  adminStore, AdminProject, AdminUser, AnsConfig,
  BbvaAnsConfig, Holiday, Priority, UserRole,
} from '../lib/adminStore';
import { PROJECTS, useAuth } from '../contexts/AuthContext';

// ─── Paleta colores ────────────────────────────────────────────────────────────
const COLORS = ['#dc2626','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#be185d','#0369a1','#0f766e','#4f46e5','#b45309','#7e22ce'];
const ROLES: { value: UserRole; label: string }[] = [
  { value: 'pm',           label: 'Project Manager' },
  { value: 'tech_lead',    label: 'Líder Técnico' },
  { value: 'project_lead', label: 'Líder de Proyecto' },
  { value: 'tech_ref',     label: 'Referente Técnico' },
  { value: 'developer',    label: 'Desarrollador' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: color + '20', color, fontWeight: 500, display: 'inline-block' }}>
      {children}
    </span>
  );
}

function SaveBanner({ onSave, dirty }: { onSave: () => void; dirty: boolean }) {
  if (!dirty) return null;
  return (
    <div style={{ position: 'sticky', bottom: 0, background: '#1e293b', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '0 0 12px 12px', marginTop: 16 }}>
      <span style={{ fontSize: 12 }}>Tienes cambios sin guardar</span>
      <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
        <Save size={13}/> Guardar cambios
      </button>
    </div>
  );
}

// ─── localStorage key para roles por proyecto ─────────────────────────────────
const PROJ_ROLES_KEY = 'timia_project_roles'; // { "u-amilkar:FICO": "tech_ref", ... }

function loadProjRoles(): Record<string, UserRole> {
  try { return JSON.parse(localStorage.getItem(PROJ_ROLES_KEY) ?? '{}'); } catch { return {}; }
}
function saveProjRoles(r: Record<string, UserRole>) {
  try { localStorage.setItem(PROJ_ROLES_KEY, JSON.stringify(r)); } catch {}
}
function projRoleKey(userId: string, projId: string) { return `${userId}:${projId}`; }

// ─── UserRow: componente nivel módulo — evita re-montaje en cada render ───────
// IMPORTANTE: definirlo FUERA de TeamModal para que React no lo trate como
// un tipo nuevo en cada render de TeamModal, lo que causaría pérdida de estado.
interface UserRowProps {
  u: AdminUser;
  proj: AdminProject;
  projRoles: Record<string, UserRole>;
  onSetProjRole: (userId: string, role: UserRole) => void;
  onToggle: (userId: string, projId: string) => void;
  ROLE_COLOR: Record<UserRole, string>;
}
function UserRow({ u, proj, projRoles, onSetProjRole, onToggle, ROLE_COLOR }: UserRowProps) {
  const isAssigned = u.projectIds.includes(proj.id);
  const pk = projRoleKey(u.id, proj.id);
  const effectiveRole = (projRoles[pk] ?? u.role) as UserRole;
  const rc = ROLE_COLOR[effectiveRole] ?? '#64748b';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
      border:`1px solid ${isAssigned ? proj.color+'60' : '#e2e8f0'}`,
      background: isAssigned ? proj.color+'06' : '#fafafa' }}>
      {/* Avatar */}
      <div style={{ width:34, height:34, borderRadius:'50%', background:u.avatarColor+'20', color:u.avatarColor,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
        {u.initials}
      </div>
      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
        <div style={{ fontSize:10, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
      </div>
      {/* Rol en el proyecto — editable si está asignado */}
      {isAssigned ? (
        <select
          value={effectiveRole}
          onChange={e => onSetProjRole(u.id, e.target.value as UserRole)}
          onClick={e => e.stopPropagation()}
          title="Rol en este proyecto"
          style={{ fontSize:10, padding:'3px 6px', borderRadius:6, border:`1px solid ${rc}40`,
            background:rc+'15', color:rc, fontWeight:600, outline:'none', cursor:'pointer', flexShrink:0 }}>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      ) : (
        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:ROLE_COLOR[u.role]+'15', color:ROLE_COLOR[u.role], fontWeight:500, flexShrink:0 }}>
          {ROLES.find(r=>r.value===u.role)?.label}
        </span>
      )}
      {/* Checkbox asignación */}
      <div
        onClick={() => onToggle(u.id, proj.id)}
        style={{ width:22, height:22, borderRadius:6, border:`2px solid ${isAssigned ? proj.color : '#d1d5db'}`,
          background: isAssigned ? proj.color : 'transparent', display:'flex', alignItems:'center',
          justifyContent:'center', flexShrink:0, cursor:'pointer', transition:'all .12s' }}>
        {isAssigned && <CheckCircle size={13} color="#fff" strokeWidth={3}/>}
      </div>
    </div>
  );
}

// ─── Modal gestión equipo (con búsqueda + rol por proyecto) ───────────────────
function TeamModal({
  proj, users, onToggle, onClose, onGoToPlan, ROLE_COLOR,
}: {
  proj: AdminProject;
  users: AdminUser[];
  onToggle: (userId: string, projId: string) => void;
  onClose: () => void;
  onGoToPlan?: () => void;
  ROLE_COLOR: Record<UserRole, string>;
}) {
  const [search,    setSearch]    = useState('');
  const [projRoles, setProjRoles] = useState<Record<string, UserRole>>(loadProjRoles);

  // Guarda el rol de userId dentro de ESTE proyecto en localStorage y en estado
  function handleSetProjRole(userId: string, role: UserRole) {
    const next = { ...projRoles, [projRoleKey(userId, proj.id)]: role };
    setProjRoles(next);
    saveProjRoles(next);
  }

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const assigned  = filtered.filter(u => u.projectIds.includes(proj.id));
  const available = filtered.filter(u => !u.projectIds.includes(proj.id));

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:'0.5px solid #f1f5f9' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:7, background:proj.color+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:proj.color }}>{proj.id.slice(0,2)}</span>
                </div>
                <h3 style={{ margin:0, fontSize:14, fontWeight:600, color:'#111' }}>{proj.id} · Gestionar equipo</h3>
              </div>
              <p style={{ margin:'3px 0 0 36px', fontSize:11, color:'#94a3b8' }}>
                Activa/desactiva personas y asigna su rol dentro de este proyecto
              </p>
            </div>
            <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}><X size={16}/></button>
          </div>
          {/* Barra de búsqueda */}
          <div style={{ position:'relative' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              style={{ width:'100%', padding:'8px 10px 8px 30px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:8, outline:'none', boxSizing:'border-box' as const }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'14px 22px 18px' }}>
          {/* Asignados */}
          {assigned.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em' }}>
                Asignados ({assigned.length})
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {assigned.map(u=><UserRow key={u.id} u={u} proj={proj} projRoles={projRoles} onSetProjRole={handleSetProjRole} onToggle={onToggle} ROLE_COLOR={ROLE_COLOR}/>)}
              </div>
            </div>
          )}

          {/* Disponibles */}
          {available.length > 0 && (
            <div>
              <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em' }}>
                Disponibles ({available.length})
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {available.map(u=><UserRow key={u.id} u={u} proj={proj} projRoles={projRoles} onSetProjRole={handleSetProjRole} onToggle={onToggle} ROLE_COLOR={ROLE_COLOR}/>)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p style={{ textAlign:'center', color:'#94a3b8', fontSize:12, marginTop:20 }}>Sin resultados para "{search}"</p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 22px', borderTop:'0.5px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          {/* Botón Plan de trabajo — solo si existe */}
          {onGoToPlan ? (
            <button
              onClick={onGoToPlan}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 16px', fontSize:12, fontWeight:500,
                background:'#0f172a', color:'#fff',
                border:'none', borderRadius:8, cursor:'pointer',
                transition:'opacity .15s',
              }}
              onMouseEnter={e=>(e.currentTarget.style.opacity='.8')}
              onMouseLeave={e=>(e.currentTarget.style.opacity='1')}
            >
              {/* ícono Gantt inline */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="6" height="3" rx="1"/><rect x="7" y="10" width="10" height="3" rx="1"/><rect x="5" y="16" width="8" height="3" rx="1"/>
              </svg>
              Ver Plan de Trabajo
            </button>
          ) : <span/>}
          <button onClick={onClose} style={{ padding:'8px 20px', fontSize:12, background:'#dc2626', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:500 }}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 1: Proyectos (con equipo inline)
// ═══════════════════════════════════════════════════════════════════════════════

function TabProyectos({ onViewChange, allowedProjectIds }: { onViewChange?: (view: string) => void; allowedProjectIds?: string[] }) {
  const allProjects = adminStore.getProjects();
  // Si allowedProjectIds está definido (tech_lead), mostramos solo sus proyectos
  const [projects, setProjects] = useState<AdminProject[]>(() =>
    allowedProjectIds ? allProjects.filter(p => allowedProjectIds.includes(p.id)) : allProjects
  );
  const [users, setUsers]         = useState<AdminUser[]>(() => adminStore.getUsers());
  const [editing, setEditing]     = useState<AdminProject | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [teamModal, setTeamModal] = useState<{ proj: AdminProject } | null>(null);
  const [dirty, setDirty]         = useState(false);
  const [usersDirty, setUsersDirty] = useState(false);
  // Roles por proyecto (persona-dentro-de-proyecto): se refresca al cerrar el modal
  const [projRoles, setProjRolesDisplay] = useState<Record<string, UserRole>>(loadProjRoles);

  const PRIORIDADES: Priority[] = ['Baja', 'Media', 'Alta', 'Crítica'];
  const PRIO_COLOR: Record<Priority, string> = { Baja: '#64748b', Media: '#2563eb', Alta: '#d97706', Crítica: '#dc2626' };
  const ROLE_COLOR: Record<UserRole, string> = {
    pm: '#7c3aed', tech_lead: '#dc2626', project_lead: '#0891b2',
    tech_ref: '#059669', developer: '#d97706',
  };
  const ROLE_LABEL: Record<UserRole, string> = {
    pm: 'PM', tech_lead: 'TL', project_lead: 'PL', tech_ref: 'TR', developer: 'DEV',
  };

  function updateProject(proj: AdminProject) {
    setProjects(ps => ps.map(p => p.id === proj.id ? proj : p));
    setDirty(true);
    setEditing(null);
  }

  function toggle(id: string) {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, active: !p.active } : p));
    setDirty(true);
  }

  function save() {
    adminStore.saveProjects(projects);
    if (usersDirty) { adminStore.saveUsers(users); setUsersDirty(false); }
    setDirty(false);
  }

  // Toggle a user on/off the project
  function toggleUserOnProject(userId: string, projId: string) {
    setUsers(us => us.map(u => {
      if (u.id !== userId) return u;
      const has = u.projectIds.includes(projId);
      return { ...u, projectIds: has ? u.projectIds.filter(x => x !== projId) : [...u.projectIds, projId] };
    }));
    setUsersDirty(true);
    setDirty(true);
  }

  const projTeam = (projId: string) => users.filter(u => u.projectIds.includes(projId));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {projects.filter(p => p.active).length} activos de {projects.length} proyectos
        </p>
      </div>

      {/* Cards de proyecto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {projects.map((p) => {
          const team = projTeam(p.id);
          const isExp = expanded === p.id;
          return (
            <div key={p.id} style={{ background: '#fff', border: `0.5px solid ${isExp ? p.color + '60' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', opacity: p.active ? 1 : 0.6, transition: 'border-color .15s' }}>
              {/* Main row */}
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr 90px 100px 80px 120px 80px 60px', gap: 8, alignItems: 'center', padding: '12px 16px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.id}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{p.name}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{p.area || '—'}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{p.client}</span>
                <Badge color={PRIO_COLOR[p.priority]}>{p.priority}</Badge>
                <span style={{ fontSize: 11, color: '#64748b' }}>{p.startDate || '—'}</span>
                {/* Equipo inline: avatares */}
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                  {team.slice(0, 5).map(u => {
                    const pRoleLabel = (projRoles[projRoleKey(u.id, p.id)] ?? u.role) as UserRole;
                    return (
                      <div key={u.id} title={`${u.name} (${ROLE_LABEL[pRoleLabel]})`}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: u.avatarColor + '25', color: u.avatarColor, border: `1.5px solid ${u.avatarColor}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                        {u.initials}
                      </div>
                    );
                  })}
                  {team.length > 5 && <span style={{ fontSize: 10, color: '#94a3b8' }}>+{team.length - 5}</span>}
                  {team.length === 0 && <span style={{ fontSize: 10, color: '#cbd5e1' }}>Sin equipo</span>}
                </div>
                <button onClick={() => toggle(p.id)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 8, background: p.active ? '#dcfce7' : '#f1f5f9', color: p.active ? '#15803d' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                  {p.active ? 'Activo' : 'Inactivo'}
                </button>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <button onClick={() => setEditing({ ...p })} title="Editar proyecto" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><Edit2 size={13}/></button>
                  <button onClick={() => setExpanded(isExp ? null : p.id)} title="Ver / gestionar equipo"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: isExp ? p.color : '#94a3b8', padding: 4, transition: 'color .15s' }}>
                    <Users size={13}/>
                  </button>
                </div>
              </div>

              {/* Expanded equipo panel */}
              {isExp && (
                <div style={{ borderTop: `0.5px solid ${p.color}30`, padding: '12px 16px 14px', background: p.color + '06' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>Equipo asignado a {p.id}</span>
                    <button onClick={() => setTeamModal({ proj: p })}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 10px', background: p.color, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                      <Plus size={11}/> Gestionar equipo
                    </button>
                  </div>
                  {team.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Ningún miembro asignado aún. Haz clic en "Gestionar equipo" para añadir personas.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {team.map(u => {
                        const pRole = (projRoles[projRoleKey(u.id, p.id)] ?? u.role) as UserRole;
                        return (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#fff', border: `0.5px solid ${u.avatarColor}40`, borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: u.avatarColor + '25', color: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>{u.initials}</div>
                            <span style={{ fontSize: 11, fontWeight: 500, color: '#111' }}>{u.name}</span>
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: ROLE_COLOR[pRole] + '20', color: ROLE_COLOR[pRole], fontWeight: 600 }}>{ROLES.find(r => r.value === pRole)?.label}</span>
                            <button onClick={() => toggleUserOnProject(u.id, p.id)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 1, lineHeight: 1 }} title="Quitar del proyecto">
                              <X size={11}/>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SaveBanner onSave={save} dirty={dirty} />

      {/* Modal edición proyecto */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setEditing(null)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, padding: '22px 24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Editar proyecto {editing.id}</h3>
              <button onClick={() => setEditing(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre del proyecto</label>
                <input value={editing.name} onChange={e => setEditing(v => v && ({ ...v, name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Líder técnico</label>
                <input value={editing.area} onChange={e => setEditing(v => v && ({ ...v, area: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Cliente</label>
                  <input value={editing.client} onChange={e => setEditing(v => v && ({ ...v, client: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Prioridad</label>
                  <select value={editing.priority} onChange={e => setEditing(v => v && ({ ...v, priority: e.target.value as Priority }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
                    {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha inicio</label>
                  <input type="date" value={editing.startDate} onChange={e => setEditing(v => v && ({ ...v, startDate: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Color</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setEditing(v => v && ({ ...v, color: c }))}
                        style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: editing.color === c ? `2px solid ${c}` : '2px solid #fff', outline: editing.color === c ? `2px solid ${c}` : 'none', cursor: 'pointer' }}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setEditing(null)} style={{ padding: '8px 14px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => updateProject(editing!)} style={{ padding: '8px 14px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestión equipo */}
      {teamModal && (
        <TeamModal
          proj={teamModal.proj}
          users={users}
          onToggle={toggleUserOnProject}
          onClose={() => { setTeamModal(null); setProjRolesDisplay(loadProjRoles()); }}
          onGoToPlan={onViewChange ? () => {
            localStorage.setItem('timia_last_plan_project', teamModal.proj.id);
            setTeamModal(null);
            onViewChange('plan-trabajo');
          } : undefined}
          ROLE_COLOR={ROLE_COLOR}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 2: Equipo
// ═══════════════════════════════════════════════════════════════════════════════

function TabEquipo() {
  const [users, setUsers] = useState<AdminUser[]>(() => adminStore.getUsers());
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const ROLE_COLOR: Record<UserRole, string> = {
    pm: '#7c3aed', tech_lead: '#dc2626', project_lead: '#0891b2',
    tech_ref: '#059669', developer: '#d97706',
  };

  function upsert(u: AdminUser) {
    const exists = users.find(x => x.id === u.id);
    setUsers(exists ? users.map(x => x.id === u.id ? u : x) : [...users, u]);
    setDirty(true);
    setEditing(null);
    setShowNew(false);
  }

  function del(id: string) {
    if (confirm('¿Eliminar usuario del sistema?')) {
      setUsers(users.filter(u => u.id !== id));
      setDirty(true);
    }
  }

  function save() { adminStore.saveUsers(users); setDirty(false); }

  const newUser: AdminUser = {
    id: 'u-' + Date.now(), name: '', email: '', role: 'developer',
    projectIds: [], initials: '', avatarColor: '#dc2626', active: true,
  };

  const EditModal = ({ user }: { user: AdminUser }) => {
    const [u, setU] = useState({ ...user });
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => { setEditing(null); setShowNew(false); }}>
        <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, padding: '22px 24px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{user.name ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <button onClick={() => { setEditing(null); setShowNew(false); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre completo *</label>
                <input value={u.name} onChange={e => setU(v => ({ ...v, name: e.target.value, initials: initials(e.target.value) }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Email (@timia.ai)</label>
                <input value={u.email} onChange={e => setU(v => ({ ...v, email: e.target.value }))}
                  placeholder="nombre.apellido@timia.ai"
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Rol</label>
              <select value={u.role} onChange={e => setU(v => ({ ...v, role: e.target.value as UserRole }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Proyectos asignados</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PROJECTS.map(p => {
                  const sel = u.projectIds.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => setU(v => ({ ...v, projectIds: sel ? v.projectIds.filter(x => x !== p.id) : [...v.projectIds, p.id] }))}
                      style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: `1px solid ${sel ? p.color : '#e2e8f0'}`, background: sel ? p.color + '20' : '#fff', color: sel ? p.color : '#64748b', cursor: 'pointer', fontWeight: sel ? 500 : 400 }}>
                      {p.id}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Color avatar</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setU(v => ({ ...v, avatarColor: c }))}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: '2px solid #fff', outline: u.avatarColor === c ? `2px solid ${c}` : 'none', cursor: 'pointer' }}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => { setEditing(null); setShowNew(false); }} style={{ padding: '8px 14px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => upsert(u)} style={{ padding: '8px 14px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>Guardar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>
          <Plus size={14}/> Nuevo usuario
        </button>
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr 100px 1fr 60px', gap: 8, padding: '10px 16px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', fontSize: 10, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          <span/><span>Nombre</span><span>Email</span><span>Rol</span><span>Proyectos</span><span style={{textAlign:'center'}}>Acción</span>
        </div>
        {users.map((u, i) => {
          const rc = ROLE_COLOR[u.role];
          return (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr 100px 1fr 60px', gap: 8, alignItems: 'center', padding: '12px 16px', borderBottom: i < users.length - 1 ? '0.5px solid #f1f5f9' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafe' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.avatarColor + '20', color: u.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{u.initials}</div>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{u.name}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{u.email}</span>
              <Badge color={rc}>{ROLES.find(r => r.value === u.role)?.label ?? u.role}</Badge>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {u.projectIds.slice(0, 4).map(pid => {
                  const proj = PROJECTS.find(p => p.id === pid);
                  return <span key={pid} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: (proj?.color ?? '#64748b') + '15', color: proj?.color ?? '#64748b', fontWeight: 600 }}>{pid}</span>;
                })}
                {u.projectIds.length > 4 && <span style={{ fontSize: 9, color: '#94a3b8' }}>+{u.projectIds.length - 4}</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                <button onClick={() => setEditing(u)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><Edit2 size={13}/></button>
                <button onClick={() => del(u.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><Trash2 size={13}/></button>
              </div>
            </div>
          );
        })}
      </div>
      <SaveBanner onSave={save} dirty={dirty}/>
      {editing && <EditModal user={editing}/>}
      {showNew && <EditModal user={newUser}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 3: ANS Config
// ═══════════════════════════════════════════════════════════════════════════════

function TabAns() {
  const [ans, setAns] = useState<AnsConfig>(() => adminStore.getAns());
  const [bbva, setBbva] = useState<BbvaAnsConfig>(() => adminStore.getBbvaAns());
  const [saved, setSaved] = useState(false);

  const PRIO_COLOR: Record<string, string> = { Baja: '#64748b', Media: '#2563eb', Alta: '#d97706', Crítica: '#dc2626' };
  const COL_COLOR: Record<string, string> = { Pendiente: '#64748b', Enviado: '#2563eb', 'En revisión': '#d97706', Observaciones: '#dc2626' };

  function save() {
    adminStore.saveAns(ans);
    adminStore.saveBbvaAns(bbva);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ maxWidth: 760 }}>
      {/* ANS interno por prioridad */}
      <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: '#111' }}>ANS interno — días hábiles máximos por prioridad</h3>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8' }}>Define cuántos días hábiles tiene el equipo para resolver tareas según su prioridad (usado en la pantalla de alertas ANS).</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {(Object.keys(ans) as (keyof AnsConfig)[]).map(prio => (
          <div key={prio} style={{ background: '#fff', border: `0.5px solid ${PRIO_COLOR[prio]}40`, borderRadius: 12, padding: '18px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: PRIO_COLOR[prio], textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{prio}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" min={1} max={60} value={ans[prio]}
                onChange={e => setAns(v => ({ ...v, [prio]: parseInt(e.target.value) || v[prio] }))}
                style={{ width: 60, padding: '8px 10px', fontSize: 18, fontWeight: 500, border: `0.5px solid ${PRIO_COLOR[prio]}60`, borderRadius: 8, textAlign: 'center', color: PRIO_COLOR[prio] }}/>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>días</span>
            </div>
          </div>
        ))}
      </div>

      {/* ANS BBVA circuitos */}
      <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: '#111' }}>ANS circuitos BBVA — días máximos por columna</h3>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94a3b8' }}>Cuántos días puede estar un documento en cada estado del circuito antes de mostrarse como vencido (alerta roja).</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {(Object.keys(bbva) as (keyof BbvaAnsConfig)[]).map(col => (
          <div key={col} style={{ background: '#fff', border: `0.5px solid ${COL_COLOR[col]}40`, borderRadius: 12, padding: '18px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: COL_COLOR[col], textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>{col}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" min={1} max={60} value={bbva[col]}
                onChange={e => setBbva(v => ({ ...v, [col]: parseInt(e.target.value) || v[col] }))}
                style={{ width: 60, padding: '8px 10px', fontSize: 18, fontWeight: 500, border: `0.5px solid ${COL_COLOR[col]}60`, borderRadius: 8, textAlign: 'center', color: COL_COLOR[col] }}/>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>días</span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={save} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', background: saved ? '#059669' : '#dc2626', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'background .3s' }}>
        {saved ? <><CheckCircle size={15}/> Guardado</> : <><Save size={15}/> Guardar configuración ANS</>}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 4: Festivos
// ═══════════════════════════════════════════════════════════════════════════════

function TabFestivos() {
  const [holidays, setHolidays] = useState<Holiday[]>(() => adminStore.getHolidays());
  const [form, setForm] = useState<Holiday>({ date: '', name: '', type: 'nacional' });
  const [saved, setSaved] = useState(false);

  function add() {
    if (!form.date || !form.name) return;
    const next = [...holidays.filter(h => h.date !== form.date), form].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(next);
    setForm({ date: '', name: '', type: 'nacional' });
  }

  function del(date: string) { setHolidays(holidays.filter(h => h.date !== date)); }

  function save() { adminStore.saveHolidays(holidays); setSaved(true); setTimeout(() => setSaved(false), 2500); }

  const byYear: Record<string, Holiday[]> = {};
  holidays.forEach(h => {
    const y = h.date.slice(0, 4);
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(h);
  });

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Agregar festivo */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 500, color: '#111' }}>Agregar festivo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 110px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm(v => ({ ...v, date: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre</label>
            <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))}
              placeholder="Ej: Día del Trabajo"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, boxSizing: 'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Tipo</label>
            <select value={form.type} onChange={e => setForm(v => ({ ...v, type: e.target.value as Holiday['type'] }))}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff' }}>
              <option value="nacional">Nacional</option>
              <option value="regional">Regional</option>
            </select>
          </div>
          <button onClick={add} style={{ padding: '8px 16px', fontSize: 12, background: '#111', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', height: 36 }}>
            <Plus size={14}/>
          </button>
        </div>
      </div>

      {/* Lista por año */}
      {Object.entries(byYear).sort().map(([year, hs]) => (
        <div key={year} style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{year} — {hs.length} festivos</h4>
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            {hs.map((h, i) => {
              const d = new Date(h.date + 'T12:00');
              const dia = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <div key={h.date} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 90px 36px', gap: 8, alignItems: 'center', padding: '10px 16px', borderBottom: i < hs.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                  <span style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{dia}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{h.name}</span>
                  <Badge color={h.type === 'nacional' ? '#dc2626' : '#2563eb'}>{h.type}</Badge>
                  <button onClick={() => del(h.date)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><Trash2 size={13}/></button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={save} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', background: saved ? '#059669' : '#dc2626', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
        {saved ? <><CheckCircle size={15}/> Guardado</> : <><Save size={15}/> Guardar festivos</>}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Panel Principal
// ═══════════════════════════════════════════════════════════════════════════════

type AdminTab = 'proyectos' | 'usuarios' | 'ans' | 'festivos';

const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'proyectos', label: 'Proyectos & Equipo', icon: <Folders size={16}/>, desc: 'Proyectos con gestión de equipo integrada' },
  { id: 'usuarios',  label: 'Usuarios',  icon: <Users size={16}/>,     desc: 'CRUD de cuentas y roles' },
  { id: 'ans',       label: 'Config ANS', icon: <Clock size={16}/>,    desc: 'Días máximos por prioridad y circuito' },
  { id: 'festivos',  label: 'Festivos',  icon: <Calendar size={16}/>,  desc: 'Calendario Colombia' },
];

export default function AdminPanel({ onViewChange }: { onViewChange?: (view: string) => void } = {}) {
  const { user } = useAuth();
  const isPM        = user?.role === 'pm';
  const isTechLead  = user?.role === 'tech_lead';
  // tech_lead solo ve sus proyectos asignados; PM ve todos
  const allowedProjectIds = isTechLead ? (user?.projectIds ?? []) : undefined;
  // Tabs visibles: tech_lead solo ve Proyectos (los globales son solo PM)
  const visibleTabs = isPM ? ADMIN_TABS : ADMIN_TABS.filter(t => t.id === 'proyectos');

  const [tab, setTab] = useState<AdminTab>('proyectos');

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#dc262620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={16} color="#dc2626"/>
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: '#111' }}>Panel de administración</h2>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
          {isPM
            ? 'Configuración global del sistema — Project Manager'
            : 'Gestión de equipos de tus proyectos asignados — Líder Técnico'}
        </p>
      </div>

      {/* Nav tabs — solo se muestran los tabs que el rol puede ver */}
      {visibleTabs.length > 1 && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '0.5px solid #e2e8f0' }}>
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as AdminTab)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: 12, fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? '#dc2626' : '#64748b', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #dc2626' : '2px solid transparent', cursor: 'pointer', transition: 'all .15s' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tab === 'proyectos' && <TabProyectos onViewChange={onViewChange} allowedProjectIds={allowedProjectIds}/>}
      {tab === 'usuarios'  && isPM && <TabEquipo/>}
      {tab === 'ans'       && isPM && <TabAns/>}
      {tab === 'festivos'  && isPM && <TabFestivos/>}
    </div>
  );
}
