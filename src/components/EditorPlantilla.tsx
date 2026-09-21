// ─── Editor de plantillas de cronograma ──────────────────────────────────────
//
// Edita una plantilla propia: nombre, descripción, fases y actividades. Cada
// actividad tiene etiqueta, duración en semanas, responsable y fase SDA. Las
// semanas se recalculan al guardar, encadenando las actividades dentro de cada
// fase (las marcadas "en paralelo" arrancan junto con la anterior).
//
// Las plantillas del catálogo no se editan: se duplican primero.

import React, { useState } from 'react';
import { X, Plus, Trash2, Save, ChevronUp, ChevronDown, GitMerge } from 'lucide-react';
import { SDA_PHASES, respDe, type PlantillaPropia, type PlanEntregableConfig, type PlanActivityConfig } from '../lib/adminStore';

type Resp = 'timia' | 'bbva' | 'mixto';
const RESP_META: Record<Resp, { label: string; color: string; bg: string }> = {
  timia: { label: 'Timia', color: '#0f766e', bg: '#f0fdfa' },
  bbva:  { label: 'BBVA',  color: '#1d4ed8', bg: '#eff6ff' },
  mixto: { label: 'Mixto', color: '#b45309', bg: '#fffbeb' },
};

/** Duración en semanas de una actividad, a partir de sus casillas o su rango. */
function duracion(a: PlanActivityConfig): number {
  if (a.weeks?.length) return a.weeks.length;
  return Math.max(1, a.endWeek - a.startWeek + 1);
}

/** Recalcula las semanas de una fase encadenando sus actividades desde `inicio`. */
function resecuenciar(ent: PlanEntregableConfig, inicio: number): PlanEntregableConfig {
  let cursor = inicio, anterior = inicio;
  const activities = ent.activities.map(a => {
    const par = (a as PlanActivityConfig & { paralelo?: boolean }).paralelo;
    const ini = par ? anterior : cursor;
    const fin = ini + Math.max(1, duracion(a)) - 1;
    if (!par) anterior = ini;
    cursor = Math.max(cursor, fin + 1);
    return { ...a, startWeek: ini, endWeek: fin, weeks: Array.from({ length: fin - ini + 1 }, (_, i) => ini + i) };
  });
  return { ...ent, activities };
}

export default function EditorPlantilla({ plantilla, onGuardar, onCerrar }: {
  plantilla: PlantillaPropia;
  onGuardar: (p: PlantillaPropia) => void;
  onCerrar: () => void;
}) {
  const [p, setP] = useState<PlantillaPropia>(() => JSON.parse(JSON.stringify(plantilla)));

  function setEnt(i: number, ent: PlanEntregableConfig) {
    setP(prev => ({ ...prev, entregables: prev.entregables.map((e, j) => j === i ? ent : e) }));
  }
  function setAct(ei: number, ai: number, patch: Partial<PlanActivityConfig & { paralelo?: boolean }>) {
    const ent = p.entregables[ei];
    setEnt(ei, { ...ent, activities: ent.activities.map((a, j) => j === ai ? { ...a, ...patch } : a) });
  }
  function moverAct(ei: number, ai: number, delta: number) {
    const ent = p.entregables[ei];
    const dest = ai + delta;
    if (dest < 0 || dest >= ent.activities.length) return;
    const acts = [...ent.activities];
    [acts[ai], acts[dest]] = [acts[dest], acts[ai]];
    setEnt(ei, { ...ent, activities: acts });
  }
  function borrarAct(ei: number, ai: number) {
    const ent = p.entregables[ei];
    setEnt(ei, { ...ent, activities: ent.activities.filter((_, j) => j !== ai) });
  }
  function agregarAct(ei: number) {
    const ent = p.entregables[ei];
    const nueva: PlanActivityConfig = { label: 'Nueva actividad', startWeek: 1, endWeek: 1, weeks: [1], resp: 'timia' };
    setEnt(ei, { ...ent, activities: [...ent.activities, nueva] });
  }
  function agregarFase() {
    const id = `fase-${p.entregables.length + 1}-${Date.now().toString(36).slice(-4)}`;
    setP(prev => ({ ...prev, entregables: [...prev.entregables, { id, label: 'Nueva fase', activities: [] }] }));
  }
  function borrarFase(ei: number) {
    if (!confirm(`¿Quitar la fase "${p.entregables[ei].label}" de la plantilla?`)) return;
    setP(prev => ({ ...prev, entregables: prev.entregables.filter((_, j) => j !== ei) }));
  }

  function guardar() {
    if (!p.nombre.trim()) { alert('Ponle un nombre a la plantilla.'); return; }
    // Cada fase conserva su semana de arranque; las actividades se reencadenan.
    const entregables = p.entregables.map(e => {
      const inicio = Math.min(...e.activities.map(a => a.startWeek), 1) || 1;
      return resecuenciar(e, e.activities.length ? inicio : 1);
    });
    const totalWeeks = Math.max(1, ...entregables.flatMap(e => e.activities.map(a => a.endWeek)));
    onGuardar({ ...p, entregables, totalWeeks });
  }

  const totalAct = p.entregables.reduce((s, e) => s + e.activities.length, 0);
  const totalCas = p.entregables.reduce((s, e) => s + e.activities.reduce((x, a) => x + duracion(a), 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-6" onClick={onCerrar}>
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4">
          <div className="flex-1">
            <input
              value={p.nombre}
              onChange={e => setP({ ...p, nombre: e.target.value })}
              placeholder="Nombre de la plantilla"
              className="w-full text-xl font-black text-slate-900 outline-none placeholder:text-slate-300"
            />
            <input
              value={p.descripcion ?? ''}
              onChange={e => setP({ ...p, descripcion: e.target.value })}
              placeholder="Para qué sirve esta plantilla"
              className="w-full text-sm text-slate-500 outline-none mt-0.5 placeholder:text-slate-300"
            />
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400">{p.entregables.length} fases · {totalAct} actividades</div>
            <div className="text-xs text-slate-400">{totalCas} casillas</div>
          </div>
          <button onClick={onCerrar} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18}/></button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {p.entregables.map((ent, ei) => (
            <div key={ent.id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <input
                  value={ent.label}
                  onChange={e => setEnt(ei, { ...ent, label: e.target.value })}
                  className="flex-1 text-sm font-bold text-rose-800 bg-transparent outline-none"
                />
                <span className="text-xs text-slate-400 shrink-0">{ent.activities.length} act.</span>
                {p.tipo === 'proyecto' && (
                  <button onClick={() => borrarFase(ei)} className="p-1.5 text-slate-300 hover:text-red-500 rounded"><Trash2 size={14}/></button>
                )}
              </div>

              <div className="divide-y divide-slate-50">
                {ent.activities.map((a, ai) => {
                  const par = (a as PlanActivityConfig & { paralelo?: boolean }).paralelo ?? false;
                  const r = (a.resp ?? respDe(a)) as Resp;
                  return (
                    <div key={ai} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50/60">
                      <div className="flex flex-col shrink-0">
                        <button onClick={() => moverAct(ei, ai, -1)} disabled={ai === 0}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-20 leading-none"><ChevronUp size={12}/></button>
                        <button onClick={() => moverAct(ei, ai, 1)} disabled={ai === ent.activities.length - 1}
                          className="text-slate-300 hover:text-slate-600 disabled:opacity-20 leading-none"><ChevronDown size={12}/></button>
                      </div>
                      <input
                        value={a.label}
                        onChange={e => setAct(ei, ai, { label: e.target.value })}
                        className="flex-1 text-xs text-slate-700 bg-transparent outline-none border border-transparent focus:border-slate-200 rounded px-1.5 py-1"
                      />
                      <label className="flex items-center gap-1 shrink-0" title="Duración en semanas">
                        <input
                          type="number" min={1} max={52} value={duracion(a)}
                          onChange={e => {
                            const n = Math.max(1, Math.min(52, +e.target.value || 1));
                            setAct(ei, ai, { weeks: Array.from({ length: n }, (_, i) => a.startWeek + i), endWeek: a.startWeek + n - 1 });
                          }}
                          className="w-12 text-xs text-center border border-slate-200 rounded px-1 py-1 outline-none"
                        />
                        <span className="text-[10px] text-slate-400">sem</span>
                      </label>
                      <select
                        value={r}
                        onChange={e => {
                          const v = e.target.value as Resp;
                          setAct(ei, ai, { resp: v, bbva: v === 'bbva' });
                        }}
                        className="text-[10px] font-bold rounded px-1.5 py-1 border border-slate-200 outline-none cursor-pointer shrink-0"
                        style={{ color: RESP_META[r].color, background: RESP_META[r].bg }}
                      >
                        {(Object.keys(RESP_META) as Resp[]).map(k => <option key={k} value={k}>{RESP_META[k].label}</option>)}
                      </select>
                      <select
                        value={a.faseSDA ?? ''}
                        onChange={e => setAct(ei, ai, { faseSDA: e.target.value || undefined })}
                        title="Fase SDA con la que se imputa en el Activity Report"
                        className="text-[10px] text-slate-500 rounded px-1.5 py-1 border border-slate-200 outline-none cursor-pointer shrink-0 max-w-[150px]"
                      >
                        <option value="">Fase SDA…</option>
                        {SDA_PHASES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <button
                        onClick={() => setAct(ei, ai, { paralelo: !par } as never)}
                        title={par ? 'Arranca junto con la anterior' : 'Arranca cuando termina la anterior'}
                        className={`p-1 rounded shrink-0 ${par ? 'text-violet-600 bg-violet-50' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                        <GitMerge size={13}/>
                      </button>
                      <button onClick={() => borrarAct(ei, ai)} className="p-1 text-slate-300 hover:text-red-500 rounded shrink-0">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  );
                })}
              </div>

              <button onClick={() => agregarAct(ei)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-100">
                <Plus size={12}/> Agregar actividad
              </button>
            </div>
          ))}

          {p.tipo === 'proyecto' && (
            <button onClick={agregarFase}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50">
              <Plus size={14}/> Agregar fase
            </button>
          )}
        </div>

        {/* Pie */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            <GitMerge size={11} className="inline mr-1"/>
            marca que una actividad arranca junto con la anterior. Las semanas se recalculan al guardar.
          </p>
          <div className="flex gap-3 shrink-0">
            <button onClick={onCerrar} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Cancelar</button>
            <button onClick={guardar} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:opacity-90">
              <Save size={16}/> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
