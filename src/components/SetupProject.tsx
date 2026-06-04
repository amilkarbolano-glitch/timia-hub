import React from 'react';
import { Rocket, ArrowRight, Database, Cloud, Cpu, ShieldCheck, Layout as LayoutIcon } from 'lucide-react';
import { ProjectTemplate } from '../types';

interface SetupProjectProps {
  onNext: () => void;
  templates: ProjectTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
}

export default function SetupProject({ onNext, templates, selectedTemplateId, onSelectTemplate }: SetupProjectProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cloud': return <Cloud size={20} />;
      case 'Cpu': return <Cpu size={20} />;
      case 'Database': return <Database size={20} />;
      default: return <LayoutIcon size={20} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12 space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <Rocket size={32} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Configuración del Proyecto</h1>
        <p className="text-slate-500 text-lg">Comencemos definiendo los parámetros básicos de tu nuevo Data Hub.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nombre del Proyecto</label>
            <input 
              type="text" 
              placeholder="Campaña de pre aprobados FICO" 
              className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Descripción</label>
            <textarea 
              rows={4}
              placeholder="Describe el objetivo principal..." 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Prioridad del Negocio</label>
            <div className="flex gap-3">
              {['Baja', 'Media', 'Alta', 'Crítica'].map((p) => (
                <button key={p} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-bold hover:border-primary hover:text-primary transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tipo de Pipeline / Plantilla</label>
          <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {templates.map((template) => (
              <TypeOption 
                key={template.id}
                icon={getIcon(template.icon)} 
                title={template.name} 
                description={template.description} 
                selected={selectedTemplateId === template.id}
                onClick={() => onSelectTemplate(template.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-end">
        <button 
          onClick={onNext}
          className="flex items-center gap-2 px-8 h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all group"
        >
          Siguiente Paso
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

function TypeOption({ icon, title, description, selected, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      <div className="flex gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {icon}
        </div>
        <div>
          <p className="font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 leading-tight">{description}</p>
        </div>
      </div>
    </div>
  );
}
