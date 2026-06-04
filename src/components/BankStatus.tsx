import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3,
  Calendar,
  ArrowRight,
  Building2
} from 'lucide-react';

export default function BankStatus() {
  const estimatedProgress = 75;
  const realProgress = 74.2;
  const diff = realProgress - estimatedProgress;

  const getStatusColor = (d: number) => {
    if (d >= 0) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (d < 0 && d > -1) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusIcon = (d: number) => {
    if (d >= 0) return <TrendingUp size={24} />;
    if (d < 0 && d > -1) return <AlertTriangle size={24} />;
    return <TrendingDown size={24} />;
  };

  const inProgressTasks = [
    { id: 1, title: 'Optimización de consultas SQL', start: '2026-03-01', end: '2026-03-15', progress: 85 },
    { id: 2, title: 'Integración de API de Terceros', start: '2026-03-05', end: '2026-03-20', progress: 45 },
    { id: 3, title: 'Validación de Esquemas JSON', start: '2026-03-10', end: '2026-03-25', progress: 12 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Status Semanal</h1>
            <p className="text-slate-500 font-medium">Resumen ejecutivo del progreso del proyecto.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Última Actualización</p>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2 justify-end">
            <Calendar size={16} className="text-primary" />
            10 de Marzo, 2026
          </p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Progreso Estimado</p>
          <p className="text-5xl font-black text-slate-900">{estimatedProgress}%</p>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-400 rounded-full" style={{ width: `${estimatedProgress}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Progreso Real</p>
          <p className="text-5xl font-black text-primary">{realProgress}%</p>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(255,0,0,0.3)]" style={{ width: `${realProgress}%` }}></div>
          </div>
        </div>

        <div className={`p-8 rounded-2xl border flex flex-col justify-between shadow-sm transition-all ${getStatusColor(diff)}`}>
          <p className="text-sm font-bold uppercase tracking-wider opacity-80">Desviación</p>
          <div className="flex items-center gap-3">
            {getStatusIcon(diff)}
            <p className="text-5xl font-black">{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</p>
          </div>
          <p className="text-xs font-bold mt-4">
            {diff >= 0 ? 'El proyecto está adelantado o a tiempo.' : 
             diff > -1 ? 'Retraso crítico menor al 1%.' : 'Retraso significativo detectado.'}
          </p>
        </div>
      </div>

      {/* Tasks in Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-primary" />
            <h2 className="text-xl font-bold text-slate-900">Tareas en Curso</h2>
          </div>
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-full uppercase tracking-wider">
            {inProgressTasks.length} Activas
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {inProgressTasks.map((task) => (
            <div key={task.id} className="p-8 flex flex-col md:flex-row md:items-center gap-8 hover:bg-slate-50 transition-colors">
              <div className="flex-1 space-y-2">
                <p className="text-lg font-bold text-slate-900">{task.title}</p>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="font-medium">Inicio: {task.start}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight size={14} className="text-slate-400" />
                    <span className="font-medium">Fin: {task.end}</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-400">Completitud</span>
                  <span className="text-primary">{task.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${task.progress}%` }}></div>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-600">
                <Clock size={16} />
                <span className="text-sm font-bold">En tiempo</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end gap-4">
        <button className="px-8 h-12 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">
          Descargar PDF
        </button>
        <button className="px-8 h-12 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg">
          Enviar al Banco
        </button>
      </div>
    </div>
  );
}
