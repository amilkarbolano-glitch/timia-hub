// ─── Vista previa de una plantilla antes de aplicarla ────────────────────────
//
// Muestra exactamente la matriz que va a quedar: las fases, las actividades y las
// semanas pintadas. Para las plantillas de entregable deja elegir en qué semana
// arranca y la previsualización se recalcula en vivo.

import React, { useMemo, useState } from 'react';
import { X, Check, AlertTriangle, CalendarRange } from 'lucide-react';
import MatrizCronograma from './MatrizCronograma';
import { marcasDe, factorGlobal, type AvanceFase } from '../lib/avance';
import { respDe, type PlanEntregableConfig } from '../lib/adminStore';

export interface PreviewProps {
  titulo: string;
  descripcion?: string;
  /** 'reemplaza': el cronograma completo · 'agrega': una fase al final. */
  modo: 'reemplaza' | 'agrega';
  /** Devuelve los entregables resultantes para una semana de arranque dada. */
  construir: (desdeSemana: number) => PlanEntregableConfig[];
  /** Semanas y etiquetas del cronograma actual, para fechar la previsualización. */
  totalWeeksActual: number;
  weekLabels?: string[];
  /** Cuántas fases tiene hoy el cronograma (para avisar qué se reemplaza). */
  fasesActuales: number;
  onAplicar: (entregables: PlanEntregableConfig[], totalWeeks: number, desdeSemana: number) => void;
  onCerrar: () => void;
}

export default function PreviewPlantilla({
  titulo, descripcion, modo, construir, totalWeeksActual, weekLabels,
  fasesActuales, onAplicar, onCerrar,
}: PreviewProps) {
  const [desde, setDesde] = useState(1);

  const { entregables, totalWeeks, nuevas } = useMemo(() => {
    const ents = construir(modo === 'agrega' ? desde : 1);
    const max = Math.max(1, ...ents.flatMap(e => e.activities.map(a => a.endWeek)));
    return {
      entregables: ents,
      totalWeeks: modo === 'agrega' ? Math.max(totalWeeksActual, max) : max,
      // En modo agregar solo las fases nuevas son las que no estaban antes.
      nuevas: modo === 'agrega' ? ents.slice(fasesActuales) : ents,
    };
  }, [construir, desde, modo, totalWeeksActual, fasesActuales]);

  const fases: AvanceFase[] = nuevas.map(e => ({
    id: e.id, label: e.label,
    activities: e.activities.map(a => ({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek })),
  }));
  const acts = nuevas.flatMap(e => e.activities);
  const casillas = acts.reduce((s, a) => s + marcasDe({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek }).length, 0);
  const porResp = acts.reduce((m, a) => { const r = a.resp ?? respDe(a); m[r] = (m[r] ?? 0) + 1; return m; }, {} as Record<string, number>);
  const ultima = Math.max(1, ...acts.map(a => a.endWeek));

  const semanas = Array.from({ length: Math.max(totalWeeksActual, 1) + 8 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-6" onClick={onCerrar}>
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Vista previa</p>
            <h2 className="text-xl font-black text-slate-900 leading-tight">{titulo}</h2>
            {descripcion && <p className="text-sm text-slate-500 mt-0.5">{descripcion}</p>}
          </div>
          <button onClick={onCerrar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"><X size={18}/></button>
        </div>

        {/* Resumen */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          {[
            [nuevas.length, nuevas.length === 1 ? 'fase' : 'fases'],
            [acts.length, 'actividades'],
            [casillas, 'casillas'],
            [ultima, 'semana final'],
          ].map(([v, l]) => (
            <div key={l as string} className="bg-white rounded-lg px-3 py-1.5 border border-slate-200">
              <span className="text-base font-bold text-slate-900">{v as number}</span>
              <span className="text-[10px] text-slate-400 ml-1.5">{l as string}</span>
            </div>
          ))}
          <div className="flex gap-2">
            {porResp.timia > 0 && <Pill n={porResp.timia} label="Timia" color="#0f766e" bg="#f0fdfa"/>}
            {porResp.bbva > 0 && <Pill n={porResp.bbva} label="BBVA" color="#1d4ed8" bg="#eff6ff"/>}
            {porResp.mixto > 0 && <Pill n={porResp.mixto} label="Mixto" color="#b45309" bg="#fffbeb"/>}
          </div>
          <span className="text-[11px] text-slate-400 ml-auto">
            factor {casillas ? factorGlobal(fases).toFixed(4) : '—'} por casilla
          </span>
        </div>

        {/* Semana de arranque (solo al agregar una fase) */}
        {modo === 'agrega' && (
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <CalendarRange size={14} className="text-slate-400"/>
            <label className="text-sm text-slate-600">Arranca en la semana</label>
            <select value={desde} onChange={e => setDesde(+e.target.value)}
              className="text-sm font-bold border border-slate-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer">
              {semanas.map(w => (
                <option key={w} value={w}>S{w}{weekLabels?.[w - 1] ? ` · ${weekLabels[w - 1]}` : ''}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">
              La fase se agrega al final del cronograma; podés moverla después pintando en la matriz.
            </span>
          </div>
        )}

        {/* Aviso de reemplazo */}
        {modo === 'reemplaza' && fasesActuales > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0"/>
            <p className="text-xs text-amber-900">
              Se reemplazan las <b>{fasesActuales}</b> {fasesActuales === 1 ? 'fase actual' : 'fases actuales'} de este cronograma.
              Lo que tengas pintado ahí se pierde.
            </p>
          </div>
        )}

        {/* Matriz */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <MatrizCronograma
            entregables={entregables}
            totalWeeks={totalWeeks}
            weekLabels={weekLabels}
            onChange={() => {}}
            readOnly
            titulo="Así va a quedar"
            maxAlto="46vh"
            zoomInicial={totalWeeks > 24 ? 'compacto' : 'normal'}
          />
        </div>

        {/* Pie */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onCerrar} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={() => onAplicar(entregables, totalWeeks, desde)}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90">
            <Check size={16}/> {modo === 'reemplaza' ? 'Reemplazar cronograma' : 'Agregar al cronograma'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pill({ n, label, color, bg }: { n: number; label: string; color: string; bg: string }) {
  return (
    <span className="text-[10px] font-bold rounded-full px-2 py-1" style={{ color, background: bg }}>
      {n} {label}
    </span>
  );
}
