import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, MoreVertical, Calendar, Clock, Search, X, Check, ExternalLink,
  Lock, FileDown, ChevronDown, Trash2, Link as LinkIcon, MessageSquare, Send,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, PROJECTS } from '../contexts/AuthContext';
import { adminStore, type KanbanTask, type KanbanStatus, type AdminUser, type Priority } from '../lib/adminStore';

// ─── Permisos por rol ─────────────────────────────────────────────────────────

const ROLE_PERMS: Record<string, {
  canCreate: boolean; canEdit: boolean; canAssign: boolean;
  canDelete: boolean; canMove: boolean; canComment: boolean;
}> = {
  pm:           { canCreate:true,  canEdit:true,  canAssign:true,  canDelete:true,  canMove:true,  canComment:true  },
  tech_lead:    { canCreate:true,  canEdit:true,  canAssign:true,  canDelete:true,  canMove:true,  canComment:true  },
  project_lead: { canCreate:true,  canEdit:true,  canAssign:true,  canDelete:false, canMove:true,  canComment:true  },
  tech_ref:     { canCreate:true,  canEdit:true,  canAssign:true,  canDelete:false, canMove:true,  canComment:true  },
  developer:    { canCreate:false, canEdit:false, canAssign:false, canDelete:false, canMove:true,  canComment:true  },
};
function perm(role: string, key: keyof typeof ROLE_PERMS.pm) {
  return ROLE_PERMS[role]?.[key] ?? false;
}

// ─── Columnas Kanban ──────────────────────────────────────────────────────────

const COLUMNS: { id: KanbanStatus; title: string; color: string; dot: string }[] = [
  { id: 'backlog',     title: 'Backlog',       color: '#f1f5f9', dot: '#94a3b8' },
  { id: 'in-progress', title: 'En Progreso',   color: '#eff6ff', dot: '#3b82f6' },
  { id: 'review',      title: 'Revisión',      color: '#fffbeb', dot: '#f59e0b' },
  { id: 'done',        title: 'Finalizado',    color: '#f0fdf4', dot: '#22c55e' },
];

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  Baja:    { bg:'#f1f5f9', text:'#475569' },
  Media:   { bg:'#dbeafe', text:'#1d4ed8' },
  Alta:    { bg:'#fef3c7', text:'#b45309' },
  Crítica: { bg:'#fee2e2', text:'#dc2626' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return `kt-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }

function UserChip({ user, size = 26 }: { user: AdminUser; size?: number }) {
  return (
    <div
      title={user.name}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: user.avatarColor + '20', color: user.avatarColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
        border: `2px solid white`,
      }}
    >
      {user.initials}
    </div>
  );
}

// ─── TaskDrawer — panel lateral para editar una tarea ─────────────────────────

interface DrawerProps {
  task: KanbanTask | null;
  allUsers: AdminUser[];
  role: string;
  onSave: (t: KanbanTask) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function TaskDrawer({ task, allUsers, role, onSave, onDelete, onClose }: DrawerProps) {
  const [t, setT] = useState<KanbanTask | null>(task);
  const [userSearch, setUserSearch] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [editJira, setEditJira] = useState(false);
  const [jiraInput, setJiraInput] = useState(task?.jiraId ?? '');
  const { user } = useAuth();

  useEffect(() => { setT(task); setJiraInput(task?.jiraId ?? ''); }, [task]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!t) return null;

  const canEdit   = perm(role, 'canEdit');
  const canAssign = perm(role, 'canAssign');
  const canDelete = perm(role, 'canDelete');

  function save(patch: Partial<KanbanTask>) {
    const updated = { ...t!, ...patch };
    setT(updated);
    onSave(updated);
  }

  function toggleAssignee(uid: string) {
    if (!canAssign) return;
    const ids = t!.assigneeIds.includes(uid)
      ? t!.assigneeIds.filter(id => id !== uid)
      : [...t!.assigneeIds, uid];
    save({ assigneeIds: ids });
  }

  function submitComment() {
    if (!newComment.trim() || !user) return;
    const c = {
      id: `c-${Date.now()}`,
      userId: user.id ?? '',
      userName: user.name,
      userInitials: user.initials ?? user.name.slice(0,2).toUpperCase(),
      userColor: user.avatarColor ?? '#dc2626',
      text: newComment.trim(),
      date: new Date().toLocaleDateString('es-CO',{ day:'numeric', month:'short', year:'numeric' }),
    };
    save({ comments: [c, ...(t!.comments ?? [])] });
    setNewComment('');
  }

  function addLink() {
    if (!newLinkUrl.trim()) return;
    const l = { id: `l-${Date.now()}`, title: newLinkTitle.trim() || newLinkUrl, url: newLinkUrl.trim() };
    save({ links: [l, ...(t!.links ?? [])] });
    setNewLinkTitle(''); setNewLinkUrl(''); setShowAddLink(false);
  }

  function saveJira() {
    save({ jiraId: jiraInput.trim() || undefined });
    setEditJira(false);
  }

  const filteredUsers = userSearch.trim().length >= 1
    ? allUsers.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    : allUsers;

  const assignedUsers = allUsers.filter(u => t.assigneeIds.includes(u.id));
  const proj = PROJECTS.find(p => p.id === t.projectId);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:998 }}/>
      <div style={{ position:'fixed', right:0, top:0, height:'100vh', width:440, background:'#fff', boxShadow:'-4px 0 32px rgba(0,0,0,0.15)', zIndex:999, display:'flex', flexDirection:'column', overflow:'hidden', animation:'slideIn .18s ease-out' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ padding:'14px 18px 10px', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
            <div style={{ flex:1, minWidth:0 }}>
              {proj && (
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:proj.color }}/>
                  <span style={{ fontSize:9, color:proj.color, fontWeight:700, textTransform:'uppercase' }}>{proj.id}</span>
                  {t.fromPlan && <span style={{ fontSize:8, padding:'1px 4px', borderRadius:3, background:'#f1f5f9', color:'#64748b', fontWeight:600 }}>Plan de Trabajo</span>}
                </div>
              )}
              {canEdit ? (
                <input
                  value={t.title}
                  onChange={e => save({ title: e.target.value })}
                  style={{ width:'100%', fontSize:14, fontWeight:700, color:'#111', border:'none', outline:'none', background:'transparent', padding:0 }}
                />
              ) : (
                <h3 style={{ margin:0, fontSize:14, fontWeight:700, color:'#111', lineHeight:1.3 }}>{t.title}</h3>
              )}
            </div>
            <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:4, flexShrink:0, display:'flex' }}><X size={16}/></button>
          </div>

          {/* Status + Priority */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {canEdit ? (
              <select value={t.status} onChange={e => save({ status: e.target.value as KanbanStatus })}
                style={{ fontSize:10, padding:'2px 6px', borderRadius:5, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#374151', fontWeight:600, cursor:'pointer' }}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            ) : (
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:'#f1f5f9', color:'#374151', fontWeight:600 }}>
                {COLUMNS.find(c=>c.id===t.status)?.title}
              </span>
            )}
            {canEdit ? (
              <select value={t.priority} onChange={e => save({ priority: e.target.value as Priority })}
                style={{ fontSize:10, padding:'2px 6px', borderRadius:5, border:'1px solid #e2e8f0', background: PRIORITY_COLORS[t.priority].bg, color: PRIORITY_COLORS[t.priority].text, fontWeight:600, cursor:'pointer' }}>
                {(['Baja','Media','Alta','Crítica'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, fontWeight:600, background: PRIORITY_COLORS[t.priority].bg, color: PRIORITY_COLORS[t.priority].text }}>{t.priority}</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>

          {/* Descripción */}
          <div style={{ marginBottom:16 }}>
            <p style={{ margin:'0 0 6px', fontSize:10, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.04em' }}>Descripción</p>
            {canEdit ? (
              <textarea
                value={t.description}
                onChange={e => save({ description: e.target.value })}
                rows={3}
                style={{ width:'100%', fontSize:12, padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', resize:'vertical', fontFamily:'inherit', color:'#374151' }}
              />
            ) : (
              <p style={{ margin:0, fontSize:12, color:'#374151', lineHeight:1.5 }}>{t.description || '—'}</p>
            )}
          </div>

          {/* Fecha entrega */}
          <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <Calendar size={12} color="#94a3b8" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#64748b', fontWeight:600, width:80 }}>Fecha entrega</span>
            {canEdit ? (
              <input type="date" value={t.endDate} onChange={e => save({ endDate: e.target.value })}
                style={{ fontSize:11, padding:'3px 7px', border:'1px solid #e2e8f0', borderRadius:5, outline:'none', color:'#374151' }}/>
            ) : (
              <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{t.endDate || '—'}</span>
            )}
          </div>

          {/* Jira */}
          <div style={{ marginBottom:16, display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'#f8fafc', borderRadius:7, border:'0.5px solid #f1f5f9' }}>
            <ExternalLink size={11} color="#94a3b8" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:10, color:'#64748b', fontWeight:600, flexShrink:0, width:60 }}>Ticket Jira</span>
            {editJira ? (
              <input autoFocus value={jiraInput} onChange={e=>setJiraInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter')saveJira(); if(e.key==='Escape')setEditJira(false); }}
                placeholder="FICO-123"
                style={{ flex:1, fontSize:11, padding:'2px 7px', border:'1.5px solid #2563eb', borderRadius:5, outline:'none' }}/>
            ) : t.jiraId ? (
              <a href={`https://jira.globaldevtools.bbva.com/browse/${t.jiraId}`} target="_blank" rel="noreferrer"
                style={{ fontSize:11, color:'#2563eb', fontWeight:600, textDecoration:'none', flex:1 }}>{t.jiraId}</a>
            ) : (
              <button onClick={()=>setEditJira(true)} style={{ fontSize:10, color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:0 }}>+ Vincular</button>
            )}
            {t.jiraId && !editJira && (
              <button onClick={()=>{ setEditJira(true); setJiraInput(t.jiraId??''); }}
                style={{ fontSize:9, color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:'1px 5px', borderRadius:4, marginLeft:'auto' }}>editar</button>
            )}
          </div>

          {/* Responsables */}
          <div style={{ marginBottom:16 }}>
            <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.04em' }}>
              Responsables {!canAssign && <span style={{ fontSize:9, color:'#94a3b8', fontWeight:400 }}>(solo lectura)</span>}
            </p>
            {assignedUsers.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                {assignedUsers.map(u => (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px 3px 4px', background:'#f8fafc', borderRadius:20, border:'0.5px solid #e2e8f0' }}>
                    <UserChip user={u} size={20}/>
                    <span style={{ fontSize:11, color:'#374151', fontWeight:500 }}>{u.name}</span>
                    {canAssign && (
                      <button onClick={()=>toggleAssignee(u.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex' }}><X size={11}/></button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canAssign && (
              <div style={{ position:'relative' }}>
                <Search size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                <input
                  value={userSearch}
                  onChange={e=>setUserSearch(e.target.value)}
                  placeholder="Buscar responsable..."
                  style={{ width:'100%', padding:'6px 8px 6px 26px', fontSize:11, border:'1px solid #e2e8f0', borderRadius:7, outline:'none', background:'#f8fafc' }}
                />
                {userSearch.trim() && (
                  <div style={{ position:'absolute', left:0, right:0, top:'calc(100% + 4px)', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', zIndex:10, maxHeight:160, overflowY:'auto' }}>
                    {filteredUsers.slice(0,8).map(u => (
                      <button key={u.id} onClick={()=>{ toggleAssignee(u.id); setUserSearch(''); }}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:t.assigneeIds.includes(u.id)?'#f0fdf4':'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
                        <UserChip user={u} size={22}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</div>
                          <div style={{ fontSize:9, color:'#94a3b8' }}>{u.areaLabel ?? u.role}</div>
                        </div>
                        {t.assigneeIds.includes(u.id) && <Check size={11} color="#15803d"/>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Links */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
              <p style={{ margin:0, fontSize:10, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.04em' }}>Adjuntos / Links</p>
              {canEdit && (
                <button onClick={()=>setShowAddLink(v=>!v)}
                  style={{ fontSize:9, padding:'2px 8px', borderRadius:5, background:'#f1f5f9', border:'none', cursor:'pointer', color:'#374151', fontWeight:600 }}>
                  {showAddLink ? 'Cancelar' : '+ Añadir'}
                </button>
              )}
            </div>
            {showAddLink && canEdit && (
              <div style={{ padding:'8px 10px', background:'#f8fafc', borderRadius:7, border:'0.5px solid #e2e8f0', marginBottom:6 }}>
                <input placeholder="Título del enlace" value={newLinkTitle} onChange={e=>setNewLinkTitle(e.target.value)}
                  style={{ width:'100%', fontSize:11, padding:'4px 7px', border:'1px solid #e2e8f0', borderRadius:5, outline:'none', marginBottom:5 }}/>
                <div style={{ display:'flex', gap:5 }}>
                  <input placeholder="URL (https://...)" value={newLinkUrl} onChange={e=>setNewLinkUrl(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter')addLink(); }}
                    style={{ flex:1, fontSize:11, padding:'4px 7px', border:'1px solid #e2e8f0', borderRadius:5, outline:'none' }}/>
                  <button onClick={addLink} style={{ padding:'4px 10px', background:'#111', color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:11 }}>OK</button>
                </div>
              </div>
            )}
            {(t.links ?? []).length === 0 && <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>Sin enlaces</p>}
            {(t.links ?? []).map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0' }}>
                <LinkIcon size={10} color="#64748b"/>
                <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'#2563eb', fontWeight:500, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.title}</a>
                {canEdit && (
                  <button onClick={()=>save({ links:(t.links??[]).filter(x=>x.id!==l.id) })}
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:0, display:'flex' }}><X size={10}/></button>
                )}
              </div>
            ))}
          </div>

          {/* Comentarios */}
          <div>
            <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.04em' }}>Comentarios</p>
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              <input
                value={newComment}
                onChange={e=>setNewComment(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter')submitComment(); }}
                placeholder="Escribe un comentario..."
                style={{ flex:1, fontSize:11, padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', background:'#f8fafc' }}
              />
              <button onClick={submitComment} style={{ padding:'6px 10px', background:'#111', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}><Send size={11}/></button>
            </div>
            {(t.comments ?? []).length === 0 && <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>Sin comentarios</p>}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(t.comments ?? []).map(c => (
                <div key={c.id} style={{ display:'flex', gap:7 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:c.userColor+'20', color:c.userColor, fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {c.userInitials}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:'#374151' }}>{c.userName}</span>
                      <span style={{ fontSize:9, color:'#94a3b8' }}>{c.date}</span>
                    </div>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:'#374151' }}>{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {canDelete && (
          <div style={{ padding:'10px 18px', borderTop:'1px solid #f1f5f9', flexShrink:0 }}>
            <button onClick={()=>{ onDelete(t.id); onClose(); }}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:'1px solid #fecaca', background:'#fff', color:'#dc2626', cursor:'pointer', fontSize:11, fontWeight:500 }}>
              <Trash2 size={12}/> Eliminar tarea
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── KanbanBoard ──────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  userRole: string;
  setUserRole: (role: string) => void;
}

export default function KanbanBoard({ userRole }: KanbanBoardProps) {
  const { user } = useAuth();
  const role = user?.role ?? userRole ?? 'developer';

  // Cargar tareas y usuarios desde adminStore
  const [tasks, setTasks] = useState<KanbanTask[]>(() => adminStore.getKanbanTasks());
  const allUsers = adminStore.getUsers().filter(u => u.active);

  // ── Ámbito de proyectos por rol ──────────────────────────────────────────────
  // pm ve todo; el resto, solo sus proyectos asignados
  const userProjectIds: string[] = role === 'pm'
    ? PROJECTS.map(p => p.id)
    : (user?.projectIds ?? []);

  // ── Filtro de proyecto (dropdown) ────────────────────────────────────────────
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // ── Reglas de visibilidad por rol ────────────────────────────────────────────
  // developer → solo sus tareas asignadas
  // tech_ref  → todas las tareas de sus proyectos (puede ver y asignar al equipo)
  // tech_lead → todas las tareas de sus proyectos + opción de filtrar por proyecto
  // pm        → todas las tareas + opción de filtrar

  // Paso 1: filtrar por proyecto seleccionado
  const projectFiltered = projectFilter === 'all'
    ? tasks.filter(t => !t.projectId || userProjectIds.includes(t.projectId))
    : tasks.filter(t => t.projectId === projectFilter);

  // Paso 2: filtrar por asignee si es developer
  const visibleTasks = role === 'developer'
    ? projectFiltered.filter(t => t.assigneeIds.includes(user?.id ?? ''))
    : projectFiltered;

  // Tareas por columna
  const byColumn = (col: KanbanStatus) => visibleTasks.filter(t => t.status === col);

  // Drawer de detalle de tarea
  const [drawer, setDrawer] = useState<KanbanTask | null>(null);

  // Modal nueva tarea
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [newPrio, setNewPrio]     = useState<Priority>('Media');
  const [newDate, setNewDate]     = useState('');
  const [newJira, setNewJira]     = useState('');
  const [newProject, setNewProject] = useState('FICO');

  // Proyectos visibles para el usuario
  const userProjects = role === 'pm'
    ? PROJECTS
    : PROJECTS.filter(p => (user?.projectIds ?? []).includes(p.id));

  function save(updated: KanbanTask[]) {
    setTasks(updated);
    adminStore.saveKanbanTasks(updated);
  }

  function saveTask(t: KanbanTask) {
    const idx = tasks.findIndex(x => x.id === t.id);
    const updated = idx >= 0
      ? [...tasks.slice(0,idx), t, ...tasks.slice(idx+1)]
      : [...tasks, t];
    save(updated);
    // Sincronizar asignados de vuelta al Plan de Trabajo si es tarea de plan
    if (t.fromPlan && t.projectId && t.entregableId !== undefined && t.actIdx !== undefined) {
      adminStore.syncKanbanAssignees(t.projectId, t.entregableId, t.actIdx, t.assigneeIds);
    }
    setDrawer(updated.find(x => x.id === t.id) ?? null);
  }

  function deleteTask(id: string) {
    save(tasks.filter(t => t.id !== id));
  }

  function addTask() {
    if (!newTitle.trim()) return;
    const t: KanbanTask = {
      id: uid(), title: newTitle.trim(), description: newDesc.trim(),
      priority: newPrio, startDate: new Date().toISOString().slice(0,10),
      endDate: newDate || new Date(Date.now() + 7*86400000).toISOString().slice(0,10),
      status: 'backlog', assigneeIds: user?.id ? [user.id] : [],
      jiraId: newJira.trim() || undefined,
      projectId: newProject,
      links: [], comments: [],
    };
    save([...tasks, t]);
    setNewTitle(''); setNewDesc(''); setNewPrio('Media'); setNewDate(''); setNewJira(''); setShowNew(false);
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (!perm(role, 'canMove')) return;
    const t = tasks.find(x => x.id === draggableId);
    if (!t) return;
    saveTask({ ...t, status: destination.droppableId as KanbanStatus });
  };

  // Totales sobre las tareas visibles (respeta el filtro de proyecto actual)
  const totalByStatus = (s: KanbanStatus) => visibleTasks.filter(t=>t.status===s).length;

  // Proyectos disponibles para el filtro
  const filterProjects = userProjectIds.length > 0
    ? PROJECTS.filter(p => userProjectIds.includes(p.id))
    : PROJECTS;

  return (
    <div style={{ padding:'24px 28px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ margin:0, fontSize:20, fontWeight:600, color:'#111' }}>Tablero</h1>
            {/* Badge de rol para Referente Técnico — distintivo visual muy importante */}
            {role === 'tech_ref' && (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'3px 10px', borderRadius:20,
                background:'linear-gradient(135deg,#0f766e18,#0f766e30)',
                border:'1.5px solid #0f766e60',
                color:'#0f766e', fontSize:11, fontWeight:700,
                letterSpacing:'0.02em',
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#0f766e', flexShrink:0 }}/>
                Referente Técnico
              </span>
            )}
            {/* Badge para otros roles — más sutil */}
            {role === 'developer' && (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'3px 10px', borderRadius:20,
                background:'#f8fafc', border:'1px solid #e2e8f0',
                color:'#64748b', fontSize:11, fontWeight:600,
              }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#94a3b8', flexShrink:0 }}/>
                Desarrollador
              </span>
            )}
          </div>
          <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>
            {role === 'developer' ? `Mis tareas asignadas · ${user?.name?.split(' ')[0]}` : `${visibleTasks.length} tareas · ${projectFilter === 'all' ? 'todos mis proyectos' : projectFilter}`}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {/* Filtro de proyecto */}
          {filterProjects.length > 1 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8 }}>
              <Search size={11} color="#94a3b8" style={{ flexShrink:0 }}/>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                style={{ fontSize:11, border:'none', background:'transparent', outline:'none', color:'#374151', fontWeight:600, cursor:'pointer' }}
              >
                <option value="all">Todos mis proyectos</option>
                {filterProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                ))}
              </select>
            </div>
          )}
          {perm(role,'canCreate') && (
            <button onClick={()=>setShowNew(true)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', background:'#111', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>
              <Plus size={13}/> Nueva tarea
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {COLUMNS.map(col => (
          <div key={col.id} style={{ padding:'10px 14px', background:'#fff', border:'1px solid #f1f5f9', borderRadius:10, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:col.dot }}/>
              <span style={{ fontSize:10, color:'#64748b', fontWeight:600 }}>{col.title}</span>
            </div>
            <span style={{ fontSize:22, fontWeight:700, color:'#111' }}>{totalByStatus(col.id)}</span>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:16, minHeight:500 }}>
          {COLUMNS.map(col => {
            const colTasks = byColumn(col.id);
            return (
              <div key={col.id} style={{ flexShrink:0, width:280, display:'flex', flexDirection:'column', gap:8 }}>
                {/* Column header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 4px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:col.dot }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:'#111' }}>{col.title}</span>
                    <span style={{ fontSize:11, padding:'1px 6px', borderRadius:8, background:'#f1f5f9', color:'#64748b', fontWeight:600 }}>{colTasks.length}</span>
                  </div>
                  {perm(role,'canCreate') && (
                    <button onClick={()=>setShowNew(true)} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:2, display:'flex' }}><Plus size={15}/></button>
                  )}
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        flex:1, padding:6, borderRadius:10, minHeight:80,
                        background: snapshot.isDraggingOver ? col.color : '#f8fafc',
                        transition:'background .12s',
                      }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {colTasks.map((task, index) => {
                          const proj = PROJECTS.find(p => p.id === task.projectId);
                          const assigned = allUsers.filter(u => task.assigneeIds.includes(u.id));
                          return (
                            // @ts-ignore
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => setDrawer(task)}
                                  style={{
                                    padding:12, background:'#fff', border:'1px solid #e2e8f0',
                                    borderRadius:9, cursor:'pointer', boxShadow: snap.isDragging?'0 8px 20px rgba(0,0,0,0.12)':'0 1px 3px rgba(0,0,0,0.05)',
                                    transition:'box-shadow .12s',
                                    ...(prov.draggableProps as any).style,
                                  }}>
                                  {/* Priority + project */}
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                                    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                      <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:4, background:PRIORITY_COLORS[task.priority].bg, color:PRIORITY_COLORS[task.priority].text }}>{task.priority}</span>
                                      {proj && <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:4, background:proj.color+'18', color:proj.color }}>{proj.id}</span>}
                                      {task.jiraId && <span style={{ fontSize:8, fontWeight:600, padding:'1px 5px', borderRadius:4, background:'#dbeafe', color:'#1d4ed8' }}>{task.jiraId}</span>}
                                    </div>
                                    {task.fromPlan && <Lock size={10} color="#94a3b8" title="Del Plan de Trabajo"/>}
                                  </div>

                                  {/* Title */}
                                  <h4 style={{ margin:'0 0 4px', fontSize:12, fontWeight:600, color:'#111', lineHeight:1.35 }}>{task.title}</h4>
                                  {task.description && <p style={{ margin:'0 0 8px', fontSize:10, color:'#64748b', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{task.description}</p>}

                                  {/* Footer */}
                                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid #f1f5f9' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, color:'#94a3b8' }}>
                                      <Calendar size={9}/> {task.endDate}
                                    </div>
                                    <div style={{ display:'flex', marginLeft:'auto' }}>
                                      {assigned.slice(0,3).map((u, i) => (
                                        <div key={u.id} style={{ marginLeft: i===0?0:-6, zIndex:3-i }}>
                                          <UserChip user={u} size={22}/>
                                        </div>
                                      ))}
                                      {assigned.length > 3 && (
                                        <div style={{ width:22, height:22, borderRadius:'50%', background:'#f1f5f9', border:'2px solid white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#64748b', fontWeight:700, marginLeft:-6 }}>
                                          +{assigned.length-3}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                      {colTasks.length === 0 && (
                        <div style={{ textAlign:'center', padding:'20px 0', color:'#94a3b8', fontSize:11 }}>Sin tareas</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Modal nueva tarea */}
      <AnimatePresence>
        {showNew && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:16 }}>
            <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.95}}
              style={{ background:'#fff', borderRadius:14, boxShadow:'0 24px 60px rgba(0,0,0,0.2)', width:'100%', maxWidth:440, overflow:'hidden' }}>
              <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>Nueva tarea</h3>
                <button onClick={()=>setShowNew(false)} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', display:'flex', padding:4 }}><X size={16}/></button>
              </div>
              <div style={{ padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <label style={{ display:'block', fontSize:9, fontWeight:700, color:'#374151', textTransform:'uppercase', marginBottom:4 }}>Título *</label>
                  <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Título de la tarea"
                    style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', fontSize:12 }}/>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:9, fontWeight:700, color:'#374151', textTransform:'uppercase', marginBottom:4 }}>Descripción</label>
                  <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} rows={2}
                    style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', fontSize:12, resize:'vertical', fontFamily:'inherit' }}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ display:'block', fontSize:9, fontWeight:700, color:'#374151', textTransform:'uppercase', marginBottom:4 }}>Prioridad</label>
                    <select value={newPrio} onChange={e=>setNewPrio(e.target.value as Priority)}
                      style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', fontSize:12 }}>
                      {(['Baja','Media','Alta','Crítica'] as Priority[]).map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:9, fontWeight:700, color:'#374151', textTransform:'uppercase', marginBottom:4 }}>Fecha entrega</label>
                    <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)}
                      style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', fontSize:12 }}/>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ display:'block', fontSize:9, fontWeight:700, color:'#374151', textTransform:'uppercase', marginBottom:4 }}>Proyecto</label>
                    <select value={newProject} onChange={e=>setNewProject(e.target.value)}
                      style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', fontSize:12 }}>
                      {userProjects.map(p=><option key={p.id} value={p.id}>{p.id}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:9, fontWeight:700, color:'#374151', textTransform:'uppercase', marginBottom:4 }}>Jira ID</label>
                    <input value={newJira} onChange={e=>setNewJira(e.target.value)} placeholder="FICO-123"
                      style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:7, outline:'none', fontSize:12 }}/>
                  </div>
                </div>
              </div>
              <div style={{ padding:'10px 18px 14px', display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button onClick={()=>setShowNew(false)} style={{ padding:'7px 14px', borderRadius:7, border:'1px solid #e2e8f0', background:'#fff', color:'#374151', cursor:'pointer', fontSize:12 }}>Cancelar</button>
                <button onClick={addTask} style={{ padding:'7px 14px', borderRadius:7, border:'none', background:'#111', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>Crear tarea</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Drawer */}
      <TaskDrawer
        task={drawer}
        allUsers={allUsers}
        role={role}
        onSave={saveTask}
        onDelete={deleteTask}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
