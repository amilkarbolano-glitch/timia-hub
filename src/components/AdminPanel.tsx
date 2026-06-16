import React, { useState } from 'react';
import {
  Folders, Users, Clock, Calendar, Building2, Plus, Trash2,
  Edit2, Save, X, CheckCircle, AlertTriangle,
} from 'lucide-react';
import {
  adminStore, AdminProject, AdminUser, AnsConfig,
  BbvaAnsConfig, Holiday, Priority, UserRole,
} from '../lib/adminStore';
import { PROJECTS } from '../contexts/AuthContext';

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

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 1: Proyectos
// ═══════════════════════════════════════════════════════════════════════════════

function TabProyectos() {
  const [projects, setProjects] = useState<AdminProject[]>(() => adminStore.getProjects());
  const [editing, setEditing] = useState<AdminProject | null>(null);
  const [dirty, setDirty] = useState(false);

  const PRIORIDADES: Priority[] = ['Baja', 'Media', 'Alta', 'Crítica'];
  const PRIO_COLOR: Record<Priority, string> = { Baja: '#64748b', Media: '#2563eb', Alta: '#d97706', Crítica: '#dc2626' };

  function update(proj: AdminProject) {
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
    setDirty(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {projects.filter(p => p.active).length} activos de {projects.length} proyectos
        </p>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 90px 100px 80px 70px 60px', gap: 8, padding: '10px 16px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', fontSize: 10, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          <span>ID</span><span>Nombre</span><span>Líder técnico</span><span>Cliente</span><span>Prioridad</span><span>Inicio</span><span style={{textAlign:'center'}}>Estado</span><span style={{textAlign:'center'}}>Acción</span>
        </div>
        {projects.map((p, i) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 90px 100px 80px 70px 60px', gap: 8, alignItems: 'center', padding: '11px 16px', borderBottom: i < projects.length - 1 ? '0.5px solid #f1f5f9' : 'none', background: p.active ? (i % 2 === 0 ? '#fff' : '#fafafe') : '#f8fafc', opacity: p.active ? 1 : 0.55 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.id}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{p.name}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{p.area}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{p.client}</span>
            <Badge color={PRIO_COLOR[p.priority]}>{p.priority}</Badge>
            <span style={{ fontSize: 11, color: '#64748b' }}>{p.startDate}</span>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => toggle(p.id)} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 8, background: p.active ? '#dcfce7' : '#f1f5f9', color: p.active ? '#15803d' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                {p.active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setEditing({ ...p })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                <Edit2 size={14}/>
              </button>
            </div>
          </div>
        ))}
      </div>
      <SaveBanner onSave={save} dirty={dirty} />

      {/* Modal edición */}
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
              <button onClick={() => update(editing!)} style={{ padding: '8px 14px', fontSize: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 500 }}>Guardar</button>
            </div>
          </div>
        </div>
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

type AdminTab = 'proyectos' | 'equipo' | 'ans' | 'festivos';

const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'proyectos', label: 'Proyectos',  icon: <Folders size={16}/>,   desc: 'CRUD proyectos activos' },
  { id: 'equipo',    label: 'Equipo',     icon: <Users size={16}/>,     desc: 'Gestión de usuarios y roles' },
  { id: 'ans',       label: 'Config ANS', icon: <Clock size={16}/>,     desc: 'Días máximos por prioridad y circuito' },
  { id: 'festivos',  label: 'Festivos',   icon: <Calendar size={16}/>,  desc: 'Calendario Colombia' },
];

export default function AdminPanel() {
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
          Configuración parametrizable del sistema — solo accesible para Project Manager
        </p>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '0.5px solid #e2e8f0' }}>
        {ADMIN_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', fontSize: 12, fontWeight: tab === t.id ? 500 : 400, color: tab === t.id ? '#dc2626' : '#64748b', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #dc2626' : '2px solid transparent', cursor: 'pointer', transition: 'all .15s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'proyectos' && <TabProyectos/>}
      {tab === 'equipo'    && <TabEquipo/>}
      {tab === 'ans'       && <TabAns/>}
      {tab === 'festivos'  && <TabFestivos/>}
    </div>
  );
}
