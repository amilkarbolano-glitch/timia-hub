import React, { useState } from 'react';
import { Rocket, ArrowRight, Database, Cloud, Cpu, Layout as LayoutIcon, Building2, CheckCircle2 } from 'lucide-react';
import { ProjectTemplate } from '../types';
import { adminStore, AdminProject } from '../lib/adminStore';

// ─── Flow Stepper ─────────────────────────────────────────────────────────────
const FLOW_STEPS = [
  { n: 1, label: 'Configurar proyecto' },
  { n: 2, label: 'Estimar plan' },
  { n: 3, label: 'Plan de trabajo' },
];

export function FlowStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {FLOW_STEPS.map((step, idx) => {
        const done   = step.n < current;
        const active = step.n === current;
        return (
          <React.Fragment key={step.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#15803d' : active ? '#dc2626' : '#f1f5f9',
                border: `2px solid ${done ? '#15803d' : active ? '#dc2626' : '#e2e8f0'}`,
                transition: 'all .2s',
              }}>
                {done
                  ? <CheckCircle2 size={16} color="#fff" fill="#15803d" strokeWidth={0}/>
                  : <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : '#94a3b8' }}>{step.n}</span>
                }
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? '#dc2626' : done ? '#15803d' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {idx < FLOW_STEPS.length - 1 && (
              <div style={{ width: 64, height: 2, background: done ? '#86efac' : '#e2e8f0', margin: '0 4px', marginBottom: 20, transition: 'background .2s' }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

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
  const [name, setName]   = useState(() => localStorage.getItem('timia_setup_draft_name') ?? '');
  const [desc, setDesc]   = useState(() => localStorage.getItem('timia_setup_draft_desc') ?? '');

  function handleNext() {
    // Persist form state so Back → Next doesn't lose it
    localStorage.setItem('timia_setup_draft_name', name);
    localStorage.setItem('timia_setup_draft_desc', desc);

    // Generate a clean project ID from the name
    const rawId = name.trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-').toUpperCase()
      .slice(0, 10) || ('PROJ' + Date.now().toString().slice(-4));

    const today = new Date().toISOString().slice(0, 10);
    const clientLabel = banco === 'bbva-co' ? 'BBVA CO' : banco === 'bbva-ar' ? 'BBVA AR' : 'Credicorp';

    // Colors cycle: pick one based on existing project count
    const palette = ['#dc2626','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#be185d'];
    const existing = adminStore.getProjects();
    const projectColor = palette[existing.length % palette.length];

    const newProject: AdminProject = {
      id: rawId,
      name: name.trim() || 'Nuevo Proyecto',
      area: '',
      color: projectColor,
      priority: 'Media',
      client: clientLabel,
      startDate: today,
      active: true,
    };

    // Only add if not already saved (idempotent if user clicks Next twice)
    if (!existing.find(p => p.id === rawId)) {
      adminStore.saveProjects([...existing, newProject]);
    }

    // Limpiar borradores — evita que el formulario aparezca prerelleno en futuras visitas
    localStorage.removeItem('timia_setup_draft_name');
    localStorage.removeItem('timia_setup_draft_desc');

    // Signal Estimaciones to auto-select this project and use the right plan template.
    // Guardamos { projectId, type } para que solo este proyecto reciba la plantilla.
    localStorage.setItem('timia_setup_draft_id', rawId);
    localStorage.setItem('timia_setup_template_type', JSON.stringify({ projectId: rawId, type: selectedTemplateId }));
    localStorage.setItem('timia_setup_flow', '2');
    onNext();
  }

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
      <FlowStepper current={1} />
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
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Campaña pre-aprobados FICO"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Descripción</label>
            <textarea
              rows={4}
              value={desc}
              onChange={e => setDesc(e.target.value)}
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
          onClick={handleNext}
          disabled={!name.trim()}
          className="flex items-center gap-2 px-8 h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente: Estimar plan
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
