import React, { useState } from 'react';
import { Search, Eye } from 'lucide-react';

const logs = [
  {
    timestamp: '2026-06-18 14:30:12',
    recipient: 'Juan Pablo Arévalo',
    code: 'DECRONOS-1997',
    event: 'Cambio de estado',
    status: 'COMPLETADO',
    detail: 'De "En Progreso" a "Revisión" · FICO',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-06-18 13:15:05',
    recipient: 'Fabrizio Atiquipa',
    code: 'DECRONOS-1835',
    event: 'Commit subido',
    status: 'INFO',
    detail: 't_kbrb_output_data_co_proactivo · FICO',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-06-18 11:05:44',
    recipient: 'Juliana Garzón',
    code: 'DECRONOS-1814',
    event: 'Tarea movida',
    status: 'COMPLETADO',
    detail: 'De "Backlog" a "En Progreso" · CRONOS',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-06-17 16:22:00',
    recipient: 'Sergio Rodriguez',
    code: 'DECRONOS-1727',
    event: 'Comentario añadido',
    status: 'INFO',
    detail: 'Mapeo SQL t_kbrb_output · FICO',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-06-17 09:45:22',
    recipient: 'Juan Pablo Arévalo',
    code: 'DECRONOS-1996',
    event: 'Tarea asignada',
    status: 'INFO',
    detail: 'Solicitud ACLs Live FICO Q2-II',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-06-16 14:00:00',
    recipient: 'Juliana Garzón',
    code: 'DECRONOS-1682',
    event: 'Tarea cerrada',
    status: 'COMPLETADO',
    detail: 'Despliegue esquemas Work · NGA',
    type: 'AUDIT'
  },
  {
    timestamp: '2026-06-15 10:30:00',
    recipient: 'Eric Buitrago',
    code: 'DECRONOS-1834',
    event: 'Tarea completada',
    status: 'COMPLETADO',
    detail: 'Gestión repositorios Bitbucket · CRONOS',
    type: 'AUDIT'
  },
];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  COMPLETADO: { bg: '#dcfce7', text: '#15803d' },
  INFO:       { bg: '#eff6ff', text: '#1d4ed8' },
  ADVERTENCIA:{ bg: '#fef9c3', text: '#a16207' },
  CRÍTICO:    { bg: '#fef2f2', text: '#dc2626' },
};

export default function AuditLog() {
  const [search, setSearch] = useState('');

  const filtered = logs.filter(l =>
    !search ||
    l.recipient.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    l.event.toLowerCase().includes(search.toLowerCase()) ||
    l.detail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Registro de Auditoría</h1>
          <p className="text-sm text-slate-500">Historial de movimientos y cambios en el sistema.</p>
        </div>
        {/* Solo barra de búsqueda */}
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario, código, evento…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-slate-400">
        {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        {search && <button onClick={() => setSearch('')} className="ml-2 text-primary hover:underline">Limpiar</button>}
      </p>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha y hora</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Evento</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalle</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    No hay registros que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : filtered.map((log, i) => {
                const ss = STATUS_STYLE[log.status] ?? STATUS_STYLE.INFO;
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400 font-mono">{log.timestamp}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-700 font-medium">{log.recipient}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-mono text-primary font-semibold">{log.code}</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-600">{log.event}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 max-w-xs truncate">{log.detail}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: ss.bg, color: ss.text }}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-slate-300 hover:text-primary transition-colors">
                        <Eye size={15}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
