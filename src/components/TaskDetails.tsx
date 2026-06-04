import React, { useState } from 'react';
import { 
  X as CloseIcon, 
  ClipboardList, 
  RefreshCw, 
  Layers as LayersIcon, 
  AlertCircle, 
  AlignLeft, 
  Link as LinkIconLucide, 
  Globe, 
  Paperclip, 
  FileText, 
  Download as DownloadIcon, 
  Clock,
  Plus,
  Upload as UploadIcon,
  ExternalLink,
  MessageSquare,
  Send,
  Trash2,
  Calendar,
  ExternalLink as JiraIcon,
  Copy,
  Check,
  Edit2
} from 'lucide-react';
import { Task, Comment, Attachment, Link } from '../types';
import { hasPermission } from '../lib/permissions';

interface TaskDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | any;
  onUpdateTask?: (updatedTask: Task) => void;
  userRole: string;
}

export default function TaskDetails({ isOpen, onClose, task, onUpdateTask, userRole }: TaskDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | any>(task);
  const [newComment, setNewComment] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditingJira, setIsEditingJira] = useState(false);
  const [jiraIdInput, setJiraIdInput] = useState(task?.jiraId || '');
  const [copied, setCopied] = useState(false);
  
  // Update local state when task prop changes
  React.useEffect(() => {
    setEditedTask(task);
    setJiraIdInput(task?.jiraId || '');
  }, [task]);

  if (!isOpen) return null;

  const handleCopyJira = () => {
    if (!task?.jiraId) return;
    const fullJiraUrl = `https://jira.globaldevtools.bbva.com/browse/${task.jiraId}`;
    navigator.clipboard.writeText(fullJiraUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveJira = () => {
    const updatedTask = { ...task, jiraId: jiraIdInput };
    onUpdateTask?.(updatedTask);
    setIsEditingJira(false);
  };

  const handleSave = () => {
    onUpdateTask?.(editedTask);
    setIsEditing(false);
  };

  // Date validation logic
  const getDeadlineStatus = (endDate: string) => {
    const today = new Date();
    const deadline = new Date(endDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Vencida', color: 'text-red-600 bg-red-50 border-red-200' };
    if (diffDays <= 3) return { label: `Vence en ${diffDays} días`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { label: `Vence en ${diffDays} días`, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  };

  const deadlineStatus = task?.endDate ? getDeadlineStatus(task.endDate) : null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'user-1',
      userName: 'Jossone',
      userAvatar: 'https://picsum.photos/seed/joss/40/40',
      text: newComment,
      date: new Date().toISOString().split('T')[0]
    };

    // Simulate email notification
    console.log(`[SIMULACIÓN] Enviando correo al Líder de Proyecto: Nueva nota en la tarea "${task?.title}"`);
    /*
    fetch('/api/notify-leader', {
      method: 'POST',
      body: JSON.stringify({ taskId: task.id, comment: newComment })
    });
    */

    const updatedTask = {
      ...task,
      comments: [...(task.comments || []), comment]
    };
    onUpdateTask?.(updatedTask);
    setNewComment('');
  };

  const handleAddLink = () => {
    if (!linkTitle || !linkUrl) return;
    const newLink: Link = { id: Math.random().toString(36).substr(2, 9), title: linkTitle, url: linkUrl };
    const updatedTask = { ...task, links: [...(task.links || []), newLink] };
    onUpdateTask?.(updatedTask);
    setLinkTitle('');
    setLinkUrl('');
    setShowAddLink(false);
  };

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newAttachment: Attachment = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      date: new Date().toLocaleDateString(),
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other',
      url: '#'
    };

    const updatedTask = { ...task, attachments: [...(task.attachments || []), newAttachment] };
    onUpdateTask?.(updatedTask);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[100] overflow-y-auto backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col min-h-[80vh]">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <ClipboardList size={20} />
            </div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Detalles de la Tarea</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Jira ID Management */}
            <div className="flex items-center gap-1 mr-2">
              {isEditingJira ? (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                  <input 
                    type="text"
                    value={jiraIdInput}
                    onChange={(e) => setJiraIdInput(e.target.value)}
                    className="bg-transparent text-xs font-bold outline-none w-24 text-slate-700"
                    placeholder="Jira ID (THUB-123)"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveJira();
                      if (e.key === 'Escape') setIsEditingJira(false);
                    }}
                  />
                  <button onClick={handleSaveJira} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setIsEditingJira(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors">
                    <CloseIcon size={14} />
                  </button>
                </div>
              ) : (
                <>
                  {task?.jiraId ? (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Jira</span>
                        <span className="text-xs font-bold text-slate-700">
                          {task.jiraId}
                        </span>
                      </div>
                      <button 
                        onClick={handleCopyJira}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                        title="Copiar enlace completo de Jira"
                      >
                        {copied ? (
                          <>
                            <Check size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-500">Link copiado</span>
                          </>
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      {hasPermission(userRole, 't_edit') && (
                        <button 
                          onClick={() => {
                            setJiraIdInput(task.jiraId || '');
                            setIsEditingJira(true);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-colors"
                          title="Editar Jira ID"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  ) : (
                    hasPermission(userRole, 't_edit') && (
                      <button 
                        onClick={() => setIsEditingJira(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg border border-slate-200 border-dashed transition-all"
                      >
                        <Plus size={14} />
                        Vincular Jira
                      </button>
                    )
                  )}
                </>
              )}
            </div>

            <button 
              onClick={onClose}
              className="flex items-center justify-center rounded-full h-10 w-10 hover:bg-primary/10 text-slate-500 transition-colors"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6">
            {/* Title & Basic Info */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="text-3xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-full outline-none focus:ring-2 focus:ring-primary/20"
                        value={editedTask?.title}
                        onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                      />
                    ) : (
                      <h1 className="text-slate-900 text-3xl font-bold leading-tight">{task?.title || 'Sin Título'}</h1>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                      <RefreshCw size={14} className={task?.status === 'in-progress' ? 'animate-spin' : ''} />
                      {task?.status === 'backlog' ? 'Backlog' : task?.status === 'in-progress' ? 'En Progreso' : task?.status === 'review' ? 'Revisión' : 'Finalizado'}
                    </div>
                    {!isEditing && deadlineStatus && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${deadlineStatus.color}`}>
                        <Clock size={14} />
                        {deadlineStatus.label}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <AlertCircle size={16} className="text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-none">Prioridad</span>
                      {isEditing ? (
                        <select 
                          className="text-sm font-bold text-slate-900 bg-transparent outline-none"
                          value={editedTask?.priority}
                          onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
                        >
                          <option value="Baja">Baja</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                          <option value="Crítica">Crítica</option>
                        </select>
                      ) : (
                        <span className="text-sm font-bold text-slate-900">{task?.priority || 'Media'}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <Calendar size={16} className="text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold leading-none">Fecha Entrega</span>
                      {isEditing ? (
                        <input 
                          type="date" 
                          className="text-sm font-bold text-slate-900 bg-transparent outline-none"
                          value={editedTask?.endDate}
                          onChange={(e) => setEditedTask({ ...editedTask, endDate: e.target.value })}
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-900">{task?.endDate || 'Sin fecha'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <AlignLeft size={18} className="text-slate-400" />
                    <h3 className="text-slate-900 text-lg font-bold">Descripción</h3>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 text-slate-600 leading-relaxed">
                    {isEditing ? (
                      <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-none"
                        value={editedTask?.description}
                        onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                      />
                    ) : (
                      <p>{task?.description || 'Sin descripción.'}</p>
                    )}
                  </div>
                </section>

                {isEditing && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <JiraIcon size={18} className="text-slate-400" />
                      <h3 className="text-slate-900 text-lg font-bold">Jira ID</h3>
                    </div>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Ej: THUB-123"
                      value={editedTask?.jiraId || ''}
                      onChange={(e) => setEditedTask({ ...editedTask, jiraId: e.target.value })}
                    />
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <LinkIconLucide size={18} className="text-slate-400" />
                      <h3 className="text-slate-900 text-lg font-bold">Enlaces Relacionados</h3>
                    </div>
                    {hasPermission(userRole, 't_edit') && (
                      <button 
                        onClick={() => setShowAddLink(true)}
                        className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                      >
                        <Plus size={14} />
                        Añadir Enlace
                      </button>
                    )}
                  </div>
                  
                  {showAddLink && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <input 
                        type="text" 
                        placeholder="Título del enlace" 
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        value={linkTitle}
                        onChange={(e) => setLinkTitle(e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="URL (https://...)" 
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddLink(false)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                        <button onClick={handleAddLink} className="px-3 py-1 text-xs font-bold bg-primary text-white rounded-lg">Añadir</button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    {task?.links?.length > 0 ? (
                      task.links.map((link: Link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-primary/50 transition-colors group">
                          <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded group-hover:bg-primary/10 transition-colors">
                            <Globe size={16} className="text-slate-500 group-hover:text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{link.title}</p>
                            <p className="text-xs text-slate-500 truncate">{link.url}</p>
                          </div>
                          <ExternalLink size={16} className="text-slate-400" />
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">No hay enlaces añadidos.</p>
                    )}
                  </div>
                </section>

                {/* Comments Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare size={18} className="text-slate-400" />
                    <h3 className="text-slate-900 text-lg font-bold">Comentarios y Notas</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Comment List */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {task?.comments?.map((comment: Comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <img src={comment.userAvatar} alt={comment.userName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                          <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900">{comment.userName}</span>
                              <span className="text-[10px] text-slate-400">{comment.date}</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                      {(!task?.comments || task.comments.length === 0) && (
                        <p className="text-sm text-slate-400 italic text-center py-4">Sin comentarios aún. Sé el primero en añadir una nota.</p>
                      )}
                    </div>

                    {/* Add Comment Input */}
                    {hasPermission(userRole, 't_comment') && (
                      <div className="flex gap-3 items-start pt-4 border-t border-slate-100">
                        <img src="https://picsum.photos/seed/leader/40/40" alt="Me" className="w-8 h-8 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                        <div className="flex-1 relative">
                          <textarea 
                            placeholder="Añadir una nota o comentario..." 
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[80px] resize-none"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                          />
                          <button 
                            onClick={handleAddComment}
                            className="absolute bottom-3 right-3 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Paperclip size={18} className="text-slate-400" />
                      <h3 className="text-slate-900 text-lg font-bold">Adjuntos</h3>
                    </div>
                    {hasPermission(userRole, 't_edit') && (
                      <label className="text-primary text-sm font-bold flex items-center gap-1 hover:underline cursor-pointer">
                        <UploadIcon size={14} />
                        Subir
                        <input type="file" className="hidden" onChange={handleAddAttachment} />
                      </label>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {task?.attachments?.length > 0 ? (
                      task.attachments.map((att: Attachment) => (
                        // @ts-ignore
                        <AttachmentItem key={att.id} name={att.name} size={att.size} date={att.date} type={att.type as any} userRole={userRole} />
                      ))
                    ) : (
                      <p className="p-4 text-sm text-slate-400 italic">No hay archivos adjuntos.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-slate-900 text-sm font-bold mb-3 uppercase tracking-wider">Responsables</h3>
                  <div className="flex -space-x-3">
                    <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://picsum.photos/seed/a1/40/40" alt="Avatar" referrerPolicy="no-referrer" />
                    <img className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://picsum.photos/seed/a2/40/40" alt="Avatar" referrerPolicy="no-referrer" />
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                      +2
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 p-6 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Clock size={14} />
            Actualizado hace 2 horas
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTask(task);
                  }}
                  className="px-6 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                  Guardar Cambios
                </button>
              </>
            ) : (
              <>
                {hasPermission(userRole, 't_edit') && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
                  >
                    Editar Tarea
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function AttachmentItem({ name, size, date, type, userRole }: { name: string, size: string, date: string, type: 'pdf' | 'doc' | 'image' | 'other', userRole: string }) {
  return (
    <div className="p-3 flex items-center justify-between group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 flex items-center justify-center rounded ${
          type === 'pdf' ? 'bg-red-50 text-red-600' : 
          type === 'doc' ? 'bg-blue-50 text-blue-600' : 
          type === 'image' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
        }`}>
          <FileText size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          <p className="text-[11px] text-slate-400">{size} • {date}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button className="p-1 hover:text-primary transition-all">
          <DownloadIcon size={18} />
        </button>
        {hasPermission(userRole, 't_delete') && (
          <button className="p-1 hover:text-red-500 transition-all">
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
