import React, { useState } from 'react';
import { Rocket, CheckCircle2, ChevronDown, Edit2, Trash2, Plus, Verified, ArrowLeft, ArrowRight, Calendar, X, AlignLeft, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TemplateTask } from '../types';

interface TaskConfirmationProps {
  onNext: () => void;
  onBack: () => void;
  initialTasks: TemplateTask[];
}

interface TaskItem {
  id: number;
  title: string;
  description: string;
  points: number;
  tag: string | null;
  checked: boolean;
  start: string;
  end: string;
  isManual?: boolean;
}

export default function TaskConfirmation({ onNext, onBack, initialTasks }: TaskConfirmationProps) {
  const [taskList, setTaskList] = useState<TaskItem[]>(() => 
    initialTasks.map((t, i) => ({
      id: i,
      title: t.title,
      description: t.description,
      points: t.points,
      tag: t.tag || null,
      checked: true,
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    }))
  );
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleTask = (id: number) => {
    setTaskList(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const handleDeleteTask = (id: number) => {
    setTaskList(prev => prev.filter(t => t.id !== id));
  };

  const handleEditClick = (task: TaskItem) => {
    setEditingTask({ ...task });
    setIsModalOpen(true);
  };

  const handleSaveTask = () => {
    if (!editingTask) return;
    
    if (editingTask.id === -1) {
      // New task
      const newTask = { ...editingTask, id: Date.now() };
      setTaskList(prev => [...prev, newTask]);
    } else {
      // Update existing
      setTaskList(prev => prev.map(t => t.id === editingTask.id ? editingTask : t));
    }
    
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleNewTask = () => {
    setEditingTask({
      id: -1,
      title: '',
      description: '',
      points: 5,
      tag: 'Manual',
      checked: true,
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      isManual: true
    });
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <Rocket size={16} />
            Pre-lanzamiento
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Confirmación de Tareas</h1>
          <p className="text-slate-500 text-lg max-w-2xl">Revisa y personaliza las tareas de ingestión antes de activar el flujo de trabajo del proyecto.</p>
        </div>
        <button 
          onClick={handleNewTask}
          className="flex items-center gap-2 px-6 h-12 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Nueva Tarea
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Tareas de Ingestión</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Filtros:</span>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 cursor-pointer">
              Todos los niveles
              <ChevronDown size={14} />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {taskList.map((task) => (
            <div key={task.id} className={`flex items-center gap-6 px-6 py-5 hover:bg-slate-50 transition-colors ${task.isManual ? 'bg-primary/5' : ''}`}>
              <div className="flex items-center justify-center w-6 h-6">
                <input 
                  type="checkbox" 
                  checked={task.checked}
                  onChange={() => handleToggleTask(task.id)}
                  className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold text-slate-900">{task.title}</p>
                  {task.tag && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      task.tag === 'Manual' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {task.tag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-slate-500 flex-1">{task.description}</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      Inicio: {task.start}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      Fin: {task.end}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Complejidad</p>
                  <p className="text-lg font-bold text-slate-900">{task.points}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditClick(task)}
                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {taskList.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-400 italic">No hay tareas configuradas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-6 h-12 text-slate-500 font-bold hover:text-slate-900 transition-all"
        >
          <ArrowLeft size={20} />
          Volver
        </button>
        <div className="flex gap-4">
          <button className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Guardar Borrador</button>
          <button 
            onClick={onNext}
            className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            Lanzar Proyecto
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      {/* Edit/New Task Modal */}
      <AnimatePresence>
        {isModalOpen && editingTask && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingTask.id === -1 ? 'Nueva Tarea' : 'Editar Tarea'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título de la Tarea</label>
                  <input 
                    type="text" 
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    placeholder="Ej: Análisis de requerimientos"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <AlignLeft size={14} />
                    Descripción
                  </label>
                  <textarea 
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm"
                    placeholder="Describe brevemente el objetivo..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={14} />
                      Fecha Inicio
                    </label>
                    <input 
                      type="date" 
                      value={editingTask.start}
                      onChange={(e) => setEditingTask({ ...editingTask, start: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={14} />
                      Fecha Fin
                    </label>
                    <input 
                      type="date" 
                      value={editingTask.end}
                      onChange={(e) => setEditingTask({ ...editingTask, end: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={14} />
                    Complejidad (Story Points)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5, 8, 13, 21].map(p => (
                      <button
                        key={p}
                        onClick={() => setEditingTask({ ...editingTask, points: p })}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                          editingTask.points === p 
                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveTask}
                  disabled={!editingTask.title.trim()}
                  className="flex-1 px-4 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTask.id === -1 ? 'Crear Tarea' : 'Guardar Cambios'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
