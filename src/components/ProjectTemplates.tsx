import React, { useState } from 'react';
import {
  GitBranch, Plus, Edit2, Trash2, ChevronRight, Cloud, Cpu, Database, Layout,
  CheckCircle2, X, Save, PlusCircle, GripVertical, BarChart3, FileText, Shield,
  Layers, Settings, Activity, Box, Zap, Globe, Code2, HardDrive, Network,
  AlertTriangle, ClipboardList, ChevronDown, CalendarDays,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectTemplate, TemplateTask } from '../types';
import { PLAN_PREVIEWS, countActivities, type PlanTemplatePreview } from '../lib/planTemplates';

interface ProjectTemplatesProps {
  templates: ProjectTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ProjectTemplate[]>>;
}

// ─── Icon registry (20 opciones) ─────────────────────────────────────────────

const ICON_LIST = [
  { id:'Layout',       label:'Layout',      El: Layout      },
  { id:'GitBranch',    label:'Rama',        El: GitBranch   },
  { id:'Cloud',        label:'Cloud',       El: Cloud       },
  { id:'Cpu',          label:'CPU',         El: Cpu         },
  { id:'Database',     label:'Datos',       El: Database    },
  { id:'BarChart3',    label:'Métricas',    El: BarChart3   },
  { id:'FileText',     label:'Documento',   El: FileText    },
  { id:'Shield',       label:'Seguridad',   El: Shield      },
  { id:'Layers',       label:'Capas',       El: Layers      },
  { id:'Settings',     label:'Config',      El: Settings    },
  { id:'Activity',     label:'Actividad',   El: Activity    },
  { id:'Box',          label:'Módulo',      El: Box         },
  { id:'Zap',          label:'Pipeline',    El: Zap         },
  { id:'Globe',        label:'Global',      El: Globe       },
  { id:'Code2',        label:'Código',      El: Code2       },
  { id:'HardDrive',    label:'Storage',     El: HardDrive   },
  { id:'Network',      label:'Red',         El: Network     },
  { id:'AlertTriangle',label:'Alerta',      El: AlertTriangle },
  { id:'ClipboardList',label:'Checklist',   El: ClipboardList },
  { id:'CheckCircle2', label:'Certificado', El: CheckCircle2 },
];

function getIcon(name: string, size = 20) {
  const found = ICON_LIST.find(i => i.id === name);
  if (!found) return <Layout size={size}/>;
  const { El } = found;
  return <El size={size}/>;
}

// ─── Predefined task starters (item 9) ───────────────────────────────────────

const PREDEFINED_SETS: { label: string; icon: string; tasks: TemplateTask[] }[] = [
  {
    label: 'Ingesta ADA básica', icon: 'Database',
    tasks: [
      { title: 'Levantamiento de requisitos y dudas',        description: 'Reuniones con BBVA para resolver dudas funcionales y técnicas.',          points: 5, peso: 10 },
      { title: 'Diccionario técnico de campos',              description: 'Documentar los 370+ campos con tipo, descripción y fuente.',              points: 8, peso: 15 },
      { title: 'Diseño lógico y físico de tablas ADA',       description: 'Definir tablas input, work y live con su esquema completo.',              points: 8, peso: 20 },
      { title: 'Construcción jobs Control-M',                description: 'Crear y configurar los jobs de orquestación en Control-M.',               points: 6, peso: 15 },
      { title: 'Construcción transformaciones Spark-Scala',  description: 'Desarrollar las transformaciones de procesamiento en ADA.',               points: 8, peso: 20 },
      { title: 'Pruebas de calidad de datos (LIVE)',         description: 'Validar reglas de calidad con datos reales de BBVA.',                    points: 5, peso: 10 },
      { title: 'Certificación y paso a producción',          description: 'Circuito de certificación con gobierno técnico BBVA y paso PRD.',        points: 5, peso: 10 },
    ],
  },
  {
    label: 'Gobierno de datos FICO', icon: 'Shield',
    tasks: [
      { title: 'Análisis funcional modelo FICO',             description: 'Entender variables, target y lógica de negocio del modelo.',             points: 5, peso: 15 },
      { title: 'Documentación en Confluence',                description: 'Crear y actualizar la documentación técnica en Confluence.',             points: 4, peso: 10 },
      { title: 'Diccionario y linaje de datos',              description: 'Mapear el linaje desde fuente hasta el score final.',                   points: 6, peso: 20 },
      { title: 'Validación gobierno técnico',                description: 'Presentar y aprobar con el comité de gobierno técnico de BBVA.',        points: 5, peso: 15 },
      { title: 'Reglas Hammurabi de calidad',                description: 'Definir e implementar reglas de validación de calidad de datos.',       points: 6, peso: 20 },
      { title: 'Monitoreo continuo post-producción',         description: 'Configurar alertas y reportes de seguimiento en producción.',           points: 4, peso: 20 },
    ],
  },
  {
    label: 'Pipeline ETL estándar', icon: 'Zap',
    tasks: [
      { title: 'Análisis de fuentes de datos',               description: 'Identificar y documentar todas las fuentes origen.',                    points: 4, peso: 10 },
      { title: 'Diseño del pipeline de ingesta',             description: 'Definir arquitectura del pipeline con stages y frecuencias.',           points: 5, peso: 15 },
      { title: 'Construcción extracción (Extract)',           description: 'Implementar lecturas desde Oracle/SQL Server/archivos planos.',         points: 6, peso: 25 },
      { title: 'Transformaciones y limpieza (Transform)',    description: 'Aplicar reglas de negocio, normalización y enriquecimiento.',           points: 7, peso: 25 },
      { title: 'Carga a destino (Load)',                     description: 'Insertar/actualizar datos en tablas ADA live o data warehouse.',        points: 5, peso: 15 },
      { title: 'Pruebas end-to-end y reconciliación',        description: 'Validar conteos, sumas de control y completitud.',                     points: 4, peso: 10 },
    ],
  },
  {
    label: 'Proyecto vacío', icon: 'Layout',
    tasks: [],
  },
];

// ─── Plan preview accordion ───────────────────────────────────────────────────

function PlanPreviewAccordion({ preview }: { preview: PlanTemplatePreview }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const total = countActivities(preview);

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Plan de Estimaciones
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{total} actividades</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#94a3b8' }}>
            <CalendarDays size={10}/>{preview.totalWeeks} sem.
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {preview.entregables.map((ent, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} style={{ border: `1px solid ${ent.color}22`, borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', background: isOpen ? `${ent.color}10` : '#f8fafc',
                  cursor: 'pointer', border: 'none', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: ent.color,
                  flexShrink: 0, boxShadow: `0 0 0 2px ${ent.color}22`,
                }}/>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#334155', lineHeight: 1.3 }}>
                  {ent.label}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, marginRight: 4 }}>
                  {ent.activities.length}
                </span>
                <ChevronDown size={12} style={{
                  color: '#94a3b8', flexShrink: 0,
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform .15s',
                }}/>
              </button>
              {isOpen && (
                <div style={{ padding: '6px 10px 8px 26px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ent.activities.map((act, aIdx) => (
                    <div key={aIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: ent.color, flexShrink: 0, marginTop: 5 }}/>
                      <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectTemplates({ templates, setTemplates }: ProjectTemplatesProps) {
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [isModalOpen,     setIsModalOpen]     = useState(false);
  const [showPredefined,  setShowPredefined]  = useState(false);

  const handleDeleteTemplate = (id: string) => {
    if (confirm('¿Eliminar esta plantilla?')) setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleEditTemplate = (template: ProjectTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
    setIsModalOpen(true);
  };

  const handleNewTemplate = () => {
    setShowPredefined(true);
  };

  const handleSelectPredefined = (set: typeof PREDEFINED_SETS[0]) => {
    setEditingTemplate({
      id: `temp-${Date.now()}`,
      name: set.label !== 'Proyecto vacío' ? '' : '',
      description: '',
      icon: set.icon,
      tasks: JSON.parse(JSON.stringify(set.tasks)),
    });
    setShowPredefined(false);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    setTemplates(prev => {
      const exists = prev.find(t => t.id === editingTemplate.id);
      if (exists) return prev.map(t => t.id === editingTemplate.id ? editingTemplate : t);
      return [...prev, editingTemplate];
    });
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const addTask = () => {
    if (!editingTemplate) return;
    const newTask: TemplateTask = { title: '', description: '', points: 5, peso: 0 };
    setEditingTemplate({ ...editingTemplate, tasks: [...editingTemplate.tasks, newTask] });
  };

  const removeTask = (index: number) => {
    if (!editingTemplate) return;
    const newTasks = [...editingTemplate.tasks];
    newTasks.splice(index, 1);
    setEditingTemplate({ ...editingTemplate, tasks: newTasks });
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: any) => {
    if (!editingTemplate) return;
    const newTasks = [...editingTemplate.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setEditingTemplate({ ...editingTemplate, tasks: newTasks });
  };

  // ── Ponderation helpers ─────────────────────────────────────────────────────
  const totalPeso = (editingTemplate?.tasks ?? []).reduce((s, t) => s + (t.peso ?? 0), 0);
  const pesoColor = Math.abs(totalPeso - 100) < 1 ? '#15803d' : totalPeso > 100 ? '#dc2626' : '#d97706';

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
        <button onClick={handleNewTemplate} className="flex items-center gap-2 px-6 h-12 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <Plus size={20}/> Nueva Plantilla
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const totalPesoCard = template.tasks.reduce((s, t) => s + (t.peso ?? 0), 0);
          const isPonderado   = template.tasks.some(t => (t.peso ?? 0) > 0);
          return (
            <div key={template.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors">
                  {getIcon(template.icon)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditTemplate(template)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"><Edit2 size={16}/></button>
                  <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{template.name}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{template.description}</p>
              {/* Ponderation bar */}
              {isPonderado && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400">Ponderación total</span>
                    <span className="text-xs font-bold" style={{ color: Math.abs(totalPesoCard-100)<1 ? '#15803d' : totalPesoCard>100 ? '#dc2626' : '#d97706' }}>{totalPesoCard}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(totalPesoCard,100)}%`, background: Math.abs(totalPesoCard-100)<1?'#15803d':totalPesoCard>100?'#dc2626':'#d97706' }}/>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Tareas predefinidas</span><span>{template.tasks.length}</span>
                </div>
                {template.tasks.slice(0, 3).map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0"/>
                    <span className="truncate flex-1">{task.title}</span>
                    {(task.peso ?? 0) > 0 && <span className="text-xs text-slate-400 shrink-0">{task.peso}%</span>}
                  </div>
                ))}
                {template.tasks.length > 3 && <p className="text-xs text-slate-400 font-medium pl-6">+{template.tasks.length-3} tareas más…</p>}
              </div>
              {/* Plan de Estimaciones — vista previa del plan que se generará */}
              {PLAN_PREVIEWS[template.id] && (
                <PlanPreviewAccordion preview={PLAN_PREVIEWS[template.id]}/>
              )}
            </div>
          );
        })}
        {templates.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 text-slate-400">
            <ClipboardList size={40} className="mb-4 opacity-30"/>
            <p className="text-sm">No hay plantillas. Crea tu primera con el botón de arriba.</p>
          </div>
        )}
      </div>

      {/* Selector de plantillas predefinidas */}
      <AnimatePresence>
        {showPredefined && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:20 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Nueva plantilla</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Elige un punto de partida — se crea una <strong>copia editable</strong>, los originales no se modifican</p>
                </div>
                <button onClick={()=>setShowPredefined(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={18} className="text-slate-500"/></button>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl mb-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-xs text-blue-700 leading-relaxed">Al seleccionar un punto de partida, se genera una <strong>copia nueva</strong> que puedes personalizar libremente. Las plantillas base nunca cambian.</p>
                </div>
                {PREDEFINED_SETS.map(set => (
                  <button key={set.label} onClick={()=>handleSelectPredefined(set)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary hover:bg-primary/5 transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                      {getIcon(set.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm">{set.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{set.tasks.length === 0 ? 'Sin tareas predefinidas — empezar desde cero' : `${set.tasks.length} tareas · ${set.tasks.reduce((s,t)=>s+(t.peso??0),0)}% ponderado`}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary shrink-0"/>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Editor Modal */}
      <AnimatePresence>
        {isModalOpen && editingTemplate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:20 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingTemplate.id.startsWith('temp-') ? 'Nueva Plantilla' : 'Editar Plantilla'}
                </h3>
                <button onClick={()=>setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left — Basic info + Icons */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre de la Plantilla</label>
                      <input type="text" value={editingTemplate.name} onChange={(e)=>setEditingTemplate({...editingTemplate,name:e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium" placeholder="Ej: Ingesta Avanzada ADA"/>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                      <textarea value={editingTemplate.description} onChange={(e)=>setEditingTemplate({...editingTemplate,description:e.target.value})}
                        rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm" placeholder="Describe el propósito de esta plantilla…"/>
                    </div>
                    {/* Icon picker — 20 options */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ícono ({ICON_LIST.length} opciones)</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {ICON_LIST.map(ic => (
                          <button key={ic.id} onClick={()=>setEditingTemplate({...editingTemplate,icon:ic.id})} title={ic.label}
                            className={`p-2 rounded-lg flex items-center justify-center transition-all ${editingTemplate.icon===ic.id?'bg-primary text-white shadow-lg shadow-primary/20':'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                            {getIcon(ic.id, 16)}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400">Seleccionado: <strong>{ICON_LIST.find(i=>i.id===editingTemplate.icon)?.label ?? editingTemplate.icon}</strong></p>
                    </div>
                    {/* Ponderation summary */}
                    {editingTemplate.tasks.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ponderación total</span>
                          <span className="text-sm font-bold" style={{ color: pesoColor }}>{totalPeso}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                          <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(totalPeso,100)}%`, background:pesoColor }}/>
                        </div>
                        <p className="text-xs" style={{ color: pesoColor }}>
                          {Math.abs(totalPeso-100)<1 ? '✓ Ponderación completa (100%)' : totalPeso > 100 ? `⚠ Excede el 100% en ${totalPeso-100}%` : `Faltan ${100-totalPeso}% por ponderar`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right — Tasks */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tareas Predefinidas ({editingTemplate.tasks.length})</label>
                      <button onClick={addTask} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                        <PlusCircle size={14}/> Añadir tarea
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editingTemplate.tasks.map((task, index) => (
                        <div key={index} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex gap-4">
                          <div className="pt-2 text-slate-300"><GripVertical size={18}/></div>
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-12 gap-2">
                              <input type="text" value={task.title} onChange={(e)=>updateTask(index,'title',e.target.value)}
                                className="col-span-7 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10" placeholder="Título de la tarea"/>
                              <div className="col-span-2 relative">
                                <input type="number" value={task.points} min={1} max={99}
                                  onChange={(e)=>updateTask(index,'points',parseInt(e.target.value)||0)}
                                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 text-center" placeholder="Pts" title="Story points"/>
                                <span className="absolute -top-4 left-0 text-xs text-slate-400">Pts</span>
                              </div>
                              <div className="col-span-3 relative">
                                <input type="number" value={task.peso ?? 0} min={0} max={100}
                                  onChange={(e)=>updateTask(index,'peso',Math.min(100,parseInt(e.target.value)||0))}
                                  className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 text-center"
                                  placeholder="%" title="Peso ponderado (%)"/>
                                <span className="absolute -top-4 left-0 text-xs text-slate-400">Peso %</span>
                              </div>
                            </div>
                            <textarea value={task.description} onChange={(e)=>updateTask(index,'description',e.target.value)}
                              rows={2} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/10 resize-none" placeholder="Descripción detallada de la tarea…"/>
                          </div>
                          <button onClick={()=>removeTask(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                      ))}
                      {editingTemplate.tasks.length === 0 && (
                        <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                          <p className="text-slate-400 text-sm italic">Sin tareas. Añade la primera o vuelve al inicio para usar una plantilla base.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={()=>setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveTemplate} disabled={!editingTemplate.name.trim()}
                  className="flex items-center gap-2 px-8 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                  <Save size={18}/> Guardar Plantilla
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
