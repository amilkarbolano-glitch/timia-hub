import React, { useState } from 'react';
import { Rocket, ArrowRight, Database, Cloud, Cpu, Layout as LayoutIcon, Building2 } from 'lucide-react';
import { ProjectTemplate } from '../types';

const BANCOS = [
  { id: 'bbva-co',   label: 'BBVA CO',    color: '#004481' },
  { id: 'bbva-ar',   label: 'BBVA AR',    color: '#00437d' },
  { id: 'credicorp', label: 'Credicorp',  color: '#e8242d' },
];

interface SetupProjectProps {
  onNext: () => void;
  templates: ProjectTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
}

export default function SetupProject({ onNext, templates, selectedTemplateId, onSelectTemplate }: SetupProjectProps) {
  const [banco, setBanco] = useState('bbva-co');

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
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Nuevo Proyecto</h1>
        <p className="text-slate-500 text-lg">Define los parámetros básicos del nuevo proyecto de datos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">

          {/* Banco / Organización */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={14} className="text-slate-400" />
              Banco / Organización
            </label>
            <div className="flex gap-3">
              {BANCOS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBanco(b.id)}
                  className="flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all"
                  style={{
                    borderColor: banco === b.id ? b.color : '#e2e8f0',
                    background:  banco === b.id ? b.color + '12' : '#fff',
                    color:       banco === b.id ? b.color : '#64748b',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nombre del Proyecto</label>
            <input
              type="text"
              placeholder="Ej: Campaña pre-aprobados FICO"
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
          Lanzar Proyecto
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
