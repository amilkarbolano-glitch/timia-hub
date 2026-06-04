import React from 'react';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';

const logs = [
  {
    timestamp: '2026-03-10 14:30:12',
    recipient: 'Jossone (Líder)',
    code: 'TASK-1',
    event: 'Movimiento de Tarea',
    status: 'COMPLETADO',
    detail: 'De "En Progreso" a "Revisión"',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-03-10 13:15:05',
    recipient: 'Sistema',
    code: 'ALERTA',
    event: 'Desviación de Tiempo',
    status: 'CRÍTICO',
    detail: 'Retraso detectado en Tarea 2',
    type: 'ALERT'
  },
  {
    timestamp: '2026-03-10 11:05:44',
    recipient: 'Ana García',
    code: 'TASK-3',
    event: 'Movimiento de Tarea',
    status: 'COMPLETADO',
    detail: 'De "Backlog" a "En Progreso"',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-03-10 09:45:22',
    recipient: 'Sistema',
    code: 'ALERTA',
    event: 'Carga de Procesamiento',
    status: 'ADVERTENCIA',
    detail: 'Uso de CPU superior al 85%',
    type: 'ALERT'
  },
  {
    timestamp: '2026-03-10 08:30:00',
    recipient: 'Jossone (Líder)',
    code: 'TASK-5',
    event: 'Movimiento de Tarea',
    status: 'COMPLETADO',
    detail: 'De "Revisión" a "Finalizado"',
    type: 'AUDIT'
  }
];

export default function AuditLog() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Registro de Auditoría</h1>
          <p className="text-slate-500">Monitorea los movimientos de tareas y alertas críticas del sistema.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filtrar Logs
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-8">
          <button className="border-b-2 border-primary text-primary pb-3 pt-2 text-sm font-bold tracking-wide">
            Historial de Movimientos
          </button>
          <button className="border-b-2 border-transparent text-slate-500 hover:text-slate-800 pb-3 pt-2 text-sm font-bold tracking-wide">
            Alertas del Sistema
          </button>
          <button className="border-b-2 border-transparent text-slate-500 hover:text-slate-800 pb-3 pt-2 text-sm font-bold tracking-wide">
            Historial de Correos
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Fecha y Hora</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Responsable</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Evento / Detalle</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider text-center">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log, i) => (
                <tr key={i} className={`hover:bg-slate-50 transition-colors ${log.type === 'ALERT' ? 'bg-primary/5' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm font-medium">{log.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-sm">{log.recipient}</td>
                  <td className="px-6 py-4 text-sm font-mono">
                    <span className="text-primary font-bold">【{log.code}】</span>
                    {' - '}{log.event}{' - '}
                    <span className={
                      log.status === 'COMPLETADO' ? 'text-emerald-600' : 
                      log.status === 'CRÍTICO' ? 'text-primary' : 
                      log.status === 'ADVERTENCIA' ? 'text-amber-600' : 'text-blue-600'
                    }>
                      {log.status}
                    </span>
                    {' - '}{log.detail}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.type === 'AUDIT' 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : 'bg-primary/10 text-primary border-primary/30'
                      }`}>
                        {log.type === 'AUDIT' ? 'AUDITORÍA' : 'ALERTA'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-slate-400 hover:text-primary transition-colors">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-slate-500">Showing 1-5 of 1,284 results</p>
        <div className="flex items-center gap-2">
          <button className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <ChevronLeft size={18} />
          </button>
          <button className="text-sm font-bold flex size-10 items-center justify-center text-white rounded-lg bg-primary">1</button>
          <button className="text-sm font-medium flex size-10 items-center justify-center text-slate-600 rounded-lg hover:bg-slate-100">2</button>
          <button className="text-sm font-medium flex size-10 items-center justify-center text-slate-600 rounded-lg hover:bg-slate-100">3</button>
          <span className="text-slate-400">...</span>
          <button className="text-sm font-medium flex size-10 items-center justify-center text-slate-600 rounded-lg hover:bg-slate-100">257</button>
          <button className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Footer Status */}
      <div className="flex items-center gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500"></div>
          SMTP Provider: Connected
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500"></div>
          Log Sink: Healthy
        </div>
      </div>
    </div>
  );
}
