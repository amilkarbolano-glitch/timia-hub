import React, { useState, useEffect } from 'react';
import { Plus, Lock, Unlock, MoreVertical, RefreshCw, Calendar, Clock, ShieldCheck, UserPlus, X, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TaskDetails from './TaskDetails';
import { Task, Column, Priority, User } from '../types';
import { hasPermission, INITIAL_ROLES } from '../lib/permissions';

const initialTasks: Record<string, Task> = {
  'task-1': { 
    id: 'task-1', 
    title: 'Construcción de Prediccionario', 
    description: 'Definición de esquemas base y endpoints iniciales.', 
    priority: 'Alta', 
    startDate: '2026-03-01', 
    endDate: '2026-03-15', 
    isLocked: true,
    status: 'in-progress',
    assignees: ['user-1'],
    attachments: [],
    links: [],
    comments: [],
    jiraId: 'THUB-101'
  },
  'task-2': { 
    id: 'task-2', 
    title: 'Mapeo de Datos SQL', 
    description: 'Transformación de tablas relacionales a JSON.', 
    priority: 'Media', 
    startDate: '2026-03-05', 
    endDate: '2026-03-20',
    status: 'in-progress',
    assignees: ['user-2'],
    attachments: [],
    links: [],
    comments: []
  },
  'task-3': { 
    id: 'task-3', 
    title: 'Validación de Calidad', 
    description: 'Reglas de limpieza y deduplicación.', 
    priority: 'Baja', 
    startDate: '2026-03-10', 
    endDate: '2026-03-25',
    status: 'backlog',
    assignees: [],
    attachments: [],
    links: [],
    comments: []
  },
};

const initialColumns: Record<string, Column> = {
  'backlog': { id: 'backlog', title: 'Backlog', color: 'bg-slate-200', taskIds: ['task-3'] },
  'in-progress': { id: 'in-progress', title: 'En Progreso', color: 'bg-primary/20', taskIds: ['task-1', 'task-2'] },
  'review': { id: 'review', title: 'Revisión', color: 'bg-amber-500/20', taskIds: [] },
  'done': { id: 'done', title: 'Finalizado', color: 'bg-emerald-500/20', taskIds: [] },
};

// Simulated User Database
const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Carlos Ruiz', role: 'leader', avatar: 'https://picsum.photos/seed/carlos/40/40', email: 'carlos@timia.com' },
  { id: 'user-2', name: 'Ana Belén', role: 'dev', avatar: 'https://picsum.photos/seed/ana/40/40', email: 'ana@timia.com' },
  { id: 'user-3', name: 'Roberto Gómez', role: 'dev', avatar: 'https://picsum.photos/seed/roberto/40/40', email: 'roberto@timia.com' },
  { id: 'user-4', name: 'Elena Torres', role: 'observer', avatar: 'https://picsum.photos/seed/elena/40/40', email: 'elena@timia.com' },
];

interface KanbanBoardProps {
  userRole: string;
  setUserRole: (role: string) => void;
}

export default function KanbanBoard({ userRole, setUserRole }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [columns, setColumns] = useState(initialColumns);
  const [columnOrder] = useState(['backlog', 'in-progress', 'review', 'done']);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  
  // Form states for new task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Media');
  const [newTaskEndDate, setNewTaskEndDate] = useState('');
  const [newTaskJira, setNewTaskJira] = useState('');

  // Member search state
  const [memberSearch, setMemberSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    // Simulate DB Request
    const fetchUsers = async () => {
      /*
      const response = await fetch('/api/users');
      const data = await response.json();
      setAvailableUsers(data);
      */
      setAvailableUsers(MOCK_USERS);
    };
    fetchUsers();
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  const handleAddTask = () => {
    if (!newTaskTitle) return;

    const newId = `task-${Date.now()}`;
    const newTask: Task = {
      id: newId,
      title: newTaskTitle,
      description: newTaskDesc,
      priority: newTaskPriority,
      startDate: new Date().toISOString().split('T')[0],
      endDate: newTaskEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'backlog',
      assignees: [],
      attachments: [],
      links: [],
      comments: [],
      jiraId: newTaskJira
    };

    setTasks({ ...tasks, [newId]: newTask });
    setColumns({
      ...columns,
      backlog: { ...columns.backlog, taskIds: [newId, ...columns.backlog.taskIds] }
    });

    // Reset form
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('Media');
    setNewTaskEndDate('');
    setNewTaskJira('');
    setIsAddTaskOpen(false);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Permission check for moving tasks
    if (!hasPermission(userRole, 't_status')) {
      return;
    }

    const start = columns[source.droppableId];
    const finish = columns[destination.droppableId];

    if (start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...start, taskIds: newTaskIds };
      setColumns({ ...columns, [newColumn.id]: newColumn });
      return;
    }

    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    // Update task status based on column
    const updatedTask = { ...tasks[draggableId], status: destination.droppableId as any };
    setTasks({ ...tasks, [draggableId]: updatedTask });

    setColumns({
      ...columns,
      [newStart.id]: newStart,
      [newFinish.id]: newFinish,
    });
  };

  const updateTask = (updatedTask: Task) => {
    setTasks({ ...tasks, [updatedTask.id]: updatedTask });
    setSelectedTask(updatedTask);
  };

  return (
    <div className="p-6 space-y-6">
      <TaskDetails 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        task={selectedTask}
        onUpdateTask={updateTask}
        userRole={userRole}
      />

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddTaskOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Nueva Tarea</h3>
                <button onClick={() => setIsAddTaskOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Ej: Ingesta de Datos"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[100px] resize-none"
                    placeholder="Detalles de la tarea..."
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridad</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                      <option value="Crítica">Crítica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Entrega</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={newTaskEndDate}
                      onChange={(e) => setNewTaskEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jira ID (Opcional)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Ej: THUB-123"
                    value={newTaskJira}
                    onChange={(e) => setNewTaskJira(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button onClick={() => setIsAddTaskOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
                <button onClick={handleAddTask} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20">Crear Tarea</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddMemberOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Añadir Miembro</h3>
                <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre o correo..." 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {availableUsers
                    .filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.email.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <UserPlus size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end">
                <button onClick={() => setIsAddMemberOpen(false)} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold">Listo</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Tareas Totales" value={Object.keys(tasks).length.toString()} icon={<RefreshCw size={20} />} />
        <StatCard title="En Progreso" value={Object.values(tasks).filter((t: Task) => t.status === 'in-progress').length.toString()} icon={<Clock size={20} />} />
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Miembros</p>
            <div className="flex -space-x-2">
              {MOCK_USERS.slice(0, 3).map(u => (
                <img key={u.id} src={u.avatar} className="w-8 h-8 rounded-full border-2 border-white object-cover" referrerPolicy="no-referrer" />
              ))}
              {hasPermission(userRole, 'u_invite') && (
                <button 
                  onClick={() => setIsAddMemberOpen(true)}
                  className="w-8 h-8 rounded-full bg-primary text-white border-2 border-white flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform"
                >
                  +
                </button>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
            <UserPlus size={20} />
          </div>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vista de Rol</p>
            <select 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value)}
              className="text-sm font-bold text-slate-900 bg-transparent border-none focus:ring-0 cursor-pointer p-0"
            >
              {INITIAL_ROLES.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 min-h-[600px]">
          {columnOrder.map((columnId) => {
            const column = columns[columnId];
            const columnTasks = column.taskIds.map((taskId) => tasks[taskId]);

            return (
              <div key={column.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.color.replace('/20', '')}`} />
                    <h3 className="font-bold text-slate-900">{column.title}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
                      {column.taskIds.length}
                    </span>
                  </div>
                  {hasPermission(userRole, 't_create') && (
                    <button 
                      onClick={() => setIsAddTaskOpen(true)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 p-2 rounded-xl transition-colors ${
                        snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-slate-50/50'
                      }`}
                    >
                      <div className="space-y-3">
                        {columnTasks.map((task, index) => (
                          // @ts-ignore
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => handleTaskClick(task)}
                                className={`p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-primary/50 transition-all cursor-pointer group ${
                                  snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 border-primary' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex flex-wrap gap-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      task.priority === 'Crítica' ? 'bg-red-100 text-red-600' :
                                      task.priority === 'Alta' ? 'bg-amber-100 text-amber-600' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>
                                      {task.priority}
                                    </span>
                                    {task.jiraId && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-600 border border-blue-100">
                                        {task.jiraId}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {task.isLocked && userRole === 'leader' && (
                                      <Lock size={14} className="text-primary" />
                                    )}
                                    <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-opacity">
                                      <MoreVertical size={14} />
                                    </button>
                                  </div>
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm mb-1">{task.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                      <Calendar size={10} />
                                      {task.endDate}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                      {task.assignees.map(uid => {
                                        const u = MOCK_USERS.find(user => user.id === uid);
                                        return u ? (
                                          <img key={u.id} src={u.avatar} className="w-6 h-6 rounded-full border-2 border-white object-cover" referrerPolicy="no-referrer" />
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
      <div className="w-10 h-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}
