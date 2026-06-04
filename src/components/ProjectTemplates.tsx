import React, { useState } from 'react';
import { 
  GitBranch, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  Cloud, 
  Cpu, 
  Database, 
  Layout, 
  CheckCircle2,
  X,
  Save,
  PlusCircle,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectTemplate, TemplateTask } from '../types';

interface ProjectTemplatesProps {
  templates: ProjectTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ProjectTemplate[]>>;
}

export default function ProjectTemplates({ templates, setTemplates }: ProjectTemplatesProps) {
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteTemplate = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEditTemplate = (template: ProjectTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
    setIsModalOpen(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate({
      id: `temp-${Date.now()}`,
      name: '',
      description: '',
      icon: 'Layout',
      tasks: []
    });
    setIsModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    setTemplates(prev => {
      const exists = prev.find(t => t.id === editingTemplate.id);
      if (exists) {
        return prev.map(t => t.id === editingTemplate.id ? editingTemplate : t);
      }
      return [...prev, editingTemplate];
    });
    
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const addTask = () => {
    if (!editingTemplate) return;
    const newTask: TemplateTask = {
      title: '',
      description: '',
      points: 5
    };
    setEditingTemplate({
      ...editingTemplate,
      tasks: [...editingTemplate.tasks, newTask]
    });
  };

  const removeTask = (index: number) => {
    if (!editingTemplate) return;
    const newTasks = [...editingTemplate.tasks];
    newTasks.splice(index, 1);
    setEditingTemplate({
      ...editingTemplate,
      tasks: newTasks
    });
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: any) => {
    if (!editingTemplate) return;
    const newTasks = [...editingTemplate.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setEditingTemplate({
      ...editingTemplate,
      tasks: newTasks
    });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cloud': return <Cloud size={20} />;
      case 'Cpu': return <Cpu size={20} />;
      case 'Database': return <Database size={20} />;
      default: return <Layout size={20} />;
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <GitBranch className="text-primary" size={32} />
            Plantillas de Proyecto
          </h1>
          <p className="text-slate-500 mt-1">Gestiona las tareas predefinidas para cada tipo de proyecto.</p>
        </div>
        <button 
          onClick={handleNewTemplate}
          className="flex items-center gap-2 px-6 h-12 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Nueva Plantilla
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors`}>
                {getIcon(template.icon)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEditTemplate(template)}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{template.name}</h3>
            <p className="text-sm text-slate-500 mb-6 line-clamp-2">{template.description}</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Tareas Predefinidas</span>
                <span>{template.tasks.length}</span>
              </div>
              <div className="space-y-2">
                {template.tasks.slice(0, 3).map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
                {template.tasks.length > 3 && (
                  <p className="text-xs text-slate-400 font-medium pl-6">+{template.tasks.length - 3} tareas más...</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Editor Modal */}
      <AnimatePresence>
        {isModalOpen && editingTemplate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingTemplate.id.startsWith('temp-') ? 'Nueva Plantilla' : 'Editar Plantilla'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre de la Plantilla</label>
                      <input 
                        type="text" 
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                        placeholder="Ej: Ingesta Avanzada"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                      <textarea 
                        value={editingTemplate.description}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm"
                        placeholder="Describe el propósito de esta plantilla..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Icono</label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Cloud', 'Cpu', 'Database', 'Layout'].map(icon => (
                          <button
                            key={icon}
                            onClick={() => setEditingTemplate({ ...editingTemplate, icon })}
                            className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                              editingTemplate.icon === icon 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {getIcon(icon)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tareas Predefinidas</label>
                      <button 
                        onClick={addTask}
                        className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <PlusCircle size={14} />
                        Añadir Tarea
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editingTemplate.tasks.map((task, index) => (
                        <div key={index} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex gap-4">
                          <div className="pt-2 text-slate-300">
                            <GripVertical size={18} />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <input 
                                type="text" 
                                value={task.title}
                                onChange={(e) => updateTask(index, 'title', e.target.value)}
                                className="md:col-span-3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10"
                                placeholder="Título de la tarea"
                              />
                              <input 
                                type="number" 
                                value={task.points}
                                onChange={(e) => updateTask(index, 'points', parseInt(e.target.value))}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10"
                                placeholder="Pts"
                              />
                            </div>
                            <textarea 
                              value={task.description}
                              onChange={(e) => updateTask(index, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/10 resize-none"
                              placeholder="Descripción detallada..."
                            />
                          </div>
                          <button 
                            onClick={() => removeTask(index)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      {editingTemplate.tasks.length === 0 && (
                        <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                          <p className="text-slate-400 text-sm italic">No hay tareas. Añade la primera para esta plantilla.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveTemplate}
                  disabled={!editingTemplate.name.trim()}
                  className="flex items-center gap-2 px-8 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Save size={18} />
                  Guardar Plantilla
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
