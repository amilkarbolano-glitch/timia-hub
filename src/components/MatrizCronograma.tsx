// ─── Matriz fase × semana ────────────────────────────────────────────────────
//
// La vista que replica la hoja "Plan de trabajo" del Excel: todas las fases y todas
// las semanas a la vista, se pinta arrastrando el mouse, y abajo de cada fase salen
// las filas "Total semana" y "T" (acumulado), más el consolidado del plan.
//
// Es la forma natural de armar la estimación: se ve el plan completo de una, en vez
// de abrir actividad por actividad.

import React, { useState, useRef, useEffect } from 'react';
import { Eraser, Paintbrush, Info } from 'lucide-react';
import { respDe, type PlanEntregableConfig, type PlanActivityConfig } from '../lib/adminStore';
import { marcasDe, factorFase, marcasFase, seriePlanFase, seriePlanConsolidada, factorGlobal, type AvanceFase } from '../lib/avance';
import { metaActividad } from '../lib/plantillas';

/** Tres densidades: la matriz se lee distinto según si el plan tiene 10 o 40 semanas. */
const ZOOM = {
  compacto: { cell: 24, fila: 20, label: 260, fuente: 9,  num: 7.5 },
  normal:   { cell: 34, fila: 28, label: 340, fuente: 11, num: 9   },
  amplio:   { cell: 46, fila: 36, label: 420, fuente: 12, num: 10  },
} as const;
type Zoom = keyof typeof ZOOM;

interface Props {
  entregables: PlanEntregableConfig[];
  totalWeeks: number;
  weekLabels?: string[];
  onChange: (entregables: PlanEntregableConfig[]) => void;
}

export default function MatrizCronograma({ entregables, totalWeeks, weekLabels, onChange }: Props) {
  const [zoom, setZoom] = useState<Zoom>('normal');
  const Z = ZOOM[zoom];
  const CELL_W = Z.cell, LABEL_W = Z.label;
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  // Al arrastrar, todas las celdas tocadas toman el valor opuesto al de la primera.
  const drag = useRef<{ ei: number; ai: number; pintar: boolean } | null>(null);
  const [pintando, setPintando] = useState(false);

  useEffect(() => {
    const fin = () => { drag.current = null; setPintando(false); };
    window.addEventListener('mouseup', fin);
    return () => window.removeEventListener('mouseup', fin);
  }, []);

  function setWeeks(ei: number, ai: number, next: number[]) {
    const ents = entregables.map((e, i) => i !== ei ? e : {
      ...e,
      activities: e.activities.map((a, j) => {
        if (j !== ai) return a;
        if (!next.length) return { ...a, weeks: undefined };
        const ord = [...new Set(next)].sort((x, y) => x - y);
        return { ...a, weeks: ord, startWeek: ord[0], endWeek: ord[ord.length - 1] };
      }),
    });
    onChange(ents);
  }

  function aplicar(ei: number, ai: number, w: number, pintar: boolean) {
    const act = entregables[ei].activities[ai];
    const actuales = new Set(marcasDe({ weeks: act.weeks, startWeek: act.startWeek, endWeek: act.endWeek }));
    if (pintar === actuales.has(w)) return;   // ya está como debe
    if (pintar) actuales.add(w); else actuales.delete(w);
    setWeeks(ei, ai, [...actuales]);
  }

  function onDown(ei: number, ai: number, w: number, marcada: boolean) {
    const pintar = !marcada;
    drag.current = { ei, ai, pintar };
    setPintando(true);
    aplicar(ei, ai, w, pintar);
  }
  function onEnter(ei: number, ai: number, w: number) {
    const d = drag.current;
    if (!d || d.ei !== ei || d.ai !== ai) return;   // solo se pinta dentro de la misma fila
    aplicar(ei, ai, w, d.pintar);
  }

  const fases: AvanceFase[] = entregables.map(e => ({
    id: e.id, label: e.label,
    activities: e.activities.map(a => ({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek })),
  }));
  const casillasTotal = fases.reduce((s, f) => s + marcasFase(f), 0);
  const consolidado = seriePlanConsolidada(fases, totalWeeks);

  const th: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 3, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };
  const celdaLabel: React.CSSProperties = {
    position: 'sticky', left: 0, zIndex: 2, background: '#fff', width: LABEL_W, minWidth: LABEL_W, maxWidth: LABEL_W,
    padding: '2px 10px', fontSize: Z.fuente, borderRight: '1px solid #e2e8f0',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
        <Paintbrush size={13} color="#0d9488"/>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#334155' }}>Matriz del cronograma</p>
        <span style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Info size={10}/> clic para marcar una semana, arrastrá para pintar varias
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: '#0f766e', fontWeight: 600 }}>
            {casillasTotal} casillas · factor global {casillasTotal ? factorGlobal(fases).toFixed(4) : '—'}
          </span>
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            {(Object.keys(ZOOM) as Zoom[]).map(z => (
              <button key={z} onClick={() => setZoom(z)} title={`Tamaño ${z}`}
                style={{
                  padding: '3px 9px', fontSize: 9.5, cursor: 'pointer', border: 'none', textTransform: 'capitalize',
                  fontWeight: zoom === z ? 700 : 500,
                  background: zoom === z ? '#0d9488' : '#fff', color: zoom === z ? '#fff' : '#64748b',
                }}>
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto', userSelect: pintando ? 'none' : 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ ...th, ...celdaLabel, zIndex: 4, textAlign: 'left', fontSize: Z.fuente, color: '#64748b', height: 40 }}>Fase · Actividad</th>
              {weeks.map(w => (
                <th key={w} title={weekLabels?.[w - 1]} style={{ ...th, width: CELL_W, minWidth: CELL_W, fontSize: Z.num, color: '#64748b', fontWeight: 600, padding: '4px 0' }}>
                  <div>S{w}</div>
                  {weekLabels?.[w - 1] && <div style={{ fontSize: Z.num - 1.5, color: '#94a3b8', fontWeight: 400 }}>{weekLabels[w - 1].split('-')[0]}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entregables.map((ent, ei) => {
              const fase = fases[ei];
              const factor = factorFase(fase);
              const serie = seriePlanFase(fase, totalWeeks);
              return (
                <React.Fragment key={ent.id}>
                  <tr>
                    <td style={{ ...celdaLabel, background: '#f8fafc', fontWeight: 700, color: '#9f1239', height: Z.fila + 6 }} title={ent.label}>{ent.label}</td>
                    <td colSpan={totalWeeks} style={{ background: '#f8fafc', fontSize: Z.fuente - 1, color: '#0f766e', padding: '0 10px', fontWeight: 600 }}>
                      {marcasFase(fase)} casillas · factor {factor ? factor.toFixed(3) : '—'}
                    </td>
                  </tr>
                  {ent.activities.map((act, ai) => {
                    const marcadas = new Set(marcasDe({ weeks: act.weeks, startWeek: act.startWeek, endWeek: act.endWeek }));
                    const meta = metaActividad(act.label);
                    // El responsable y la fase SDA viven en la actividad; el catálogo solo
                    // sirve de respaldo para planes armados antes de que existieran esos campos.
                    const resp = act.resp ?? meta?.resp ?? respDe(act);
                    const esBBVA = resp === 'bbva';
                    const esMixto = resp === 'mixto';
                    const sda = act.faseSDA ?? meta?.faseSDA;
                    const tip = [act.label, sda && `Fase SDA: ${sda}`, meta?.nota].filter(Boolean).join('\n');
                    return (
                      <tr key={ai}>
                        <td style={{ ...celdaLabel, paddingLeft: 22, color: esBBVA ? '#1d4ed8' : '#475569', height: Z.fila }} title={tip}>
                          {esBBVA && <span style={{ fontSize: Z.num - 1, marginRight: 5, color: '#1d4ed8', fontWeight: 700 }}>BBVA</span>}
                          {esMixto && <span style={{ fontSize: Z.num - 1, marginRight: 5, color: '#b45309', fontWeight: 700 }}>MIX</span>}
                          {act.label}
                        </td>
                        {weeks.map(w => {
                          const on = marcadas.has(w);
                          return (
                            <td key={w}
                              onMouseDown={e => { e.preventDefault(); onDown(ei, ai, w, on); }}
                              onMouseEnter={() => onEnter(ei, ai, w)}
                              title={`${act.label} · S${w}${weekLabels?.[w - 1] ? ` (${weekLabels[w - 1]})` : ''}`}
                              style={{
                                width: CELL_W, height: Z.fila, cursor: 'pointer', textAlign: 'center',
                                border: '0.5px solid #f1f5f9',
                                background: on ? (esBBVA ? '#bfdbfe' : esMixto ? '#fde68a' : '#99d9ce') : '#fff',
                              }}
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                  <Totales label="Total semana" valores={serie.semanal} weeks={weeks} celdaLabel={celdaLabel} z={Z}/>
                  <Totales label="T (acumulado)" valores={serie.acumulado} weeks={weeks} celdaLabel={celdaLabel} acumulado z={Z}/>
                </React.Fragment>
              );
            })}
            <tr><td colSpan={totalWeeks + 1} style={{ height: 8 }}/></tr>
            <Totales label="CONSOLIDADO · semana" valores={consolidado.semanal} weeks={weeks} celdaLabel={celdaLabel} fuerte z={Z}/>
            <Totales label="CONSOLIDADO · acumulado" valores={consolidado.acumulado} weeks={weeks} celdaLabel={celdaLabel} fuerte acumulado z={Z}/>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 14, padding: '6px 12px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
        <Chip color="#99d9ce" texto="Timia"/>
        <Chip color="#bfdbfe" texto="BBVA (espera, no son horas nuestras)"/>
        <Chip color="#fde68a" texto="Mixto (no cierra sin VoBo de negocio)"/>
        <span style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Eraser size={10}/> volvé a arrastrar sobre casillas marcadas para borrarlas
        </span>
      </div>
    </div>
  );
}

function Totales({ label, valores, weeks, celdaLabel, acumulado, fuerte, z }: {
  label: string; valores: number[]; weeks: number[]; celdaLabel: React.CSSProperties;
  acumulado?: boolean; fuerte?: boolean; z: { fila: number; fuente: number; num: number };
}) {
  const bg = fuerte ? '#1e293b' : '#fafcff';
  const fg = fuerte ? '#e2e8f0' : acumulado ? '#0f766e' : '#64748b';
  return (
    <tr>
      <td style={{ ...celdaLabel, background: bg, color: fg, fontSize: z.fuente - 1, fontWeight: 700, paddingLeft: 22, height: z.fila - 2 }}>{label}</td>
      {weeks.map((w, i) => {
        const v = valores[i] ?? 0;
        return (
          <td key={w} style={{ background: bg, color: fg, fontSize: z.num, textAlign: 'center', border: '0.5px solid ' + (fuerte ? '#334155' : '#f1f5f9'), fontWeight: acumulado ? 700 : 400 }}>
            {v > 0.005 ? v.toFixed(acumulado ? 0 : 1) : ''}
          </td>
        );
      })}
    </tr>
  );
}

function Chip({ color, texto }: { color: string; texto: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#64748b' }}>
      <span style={{ width: 11, height: 11, borderRadius: 2, background: color, border: '0.5px solid #cbd5e1' }}/>
      {texto}
    </span>
  );
}
