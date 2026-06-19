import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Save, ArrowRight, ArrowLeft,
  LayoutList, Clock, CalendarDays, Settings2, CheckSquare,
} from 'lucide-react';
import { PROJECTS, useAuth } from '../contexts/AuthContext';
import { adminStore, type PlanEtapa, type PlanActivityConfig, type PlanEntregableConfig, type PlanConfig } from '../lib/adminStore';
import type { View } from './Layout';
import { FlowStepper } from './SetupProject';

// ─── Week label computation (date-based + holiday awareness) ──────────────────

function computeWeekLabels(startDate: string, totalWeeks: number, holidayDates: Set<string>): string[] {
  if (!startDate) return Array.from({ length: totalWeeks }, (_, i) => `S${i + 1}`);
  const base = new Date(startDate + 'T12:00:00');
  return Array.from({ length: totalWeeks }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i * 7);
    const iso  = d.toISOString().slice(0, 10);
    const day  = d.getDate();
    const mon  = d.toLocaleDateString('es-CO', { month: 'short' });
    const flag = holidayDates.has(iso) ? ' 🗓' : '';
    return `S${i + 1} · ${day} ${mon}${flag}`;
  });
}

// ─── Combined project list (static + dynamic from adminStore) ─────────────────

function getAllProjects() {
  const dynamic = adminStore.getProjects().filter(p => p.active);
  const base = PROJECTS as { id: string; name: string; color: string }[];
  const extra = dynamic.filter(ap => !base.find(p => p.id === ap.id));
  return [
    ...base,
    ...extra.map(ap => ({ id: ap.id, name: ap.name, color: ap.color })),
  ];
}

// ─── Default templates ────────────────────────────────────────────────────────
// We bootstrap FICO from the known plan structure.
// Other projects get a blank 3-entregable template.

const FICO_DEFAULT: PlanConfig = {
  projectId: 'FICO',
  totalWeeks: 10,
  weekLabels: ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'],
  generatedAt: '',
  entregables: [
    {
      id: 'doc', label: 'I. Documentación y gobierno',
      activities: [
        { label: 'Análisis y resolución de dudas',              startWeek: 1, endWeek: 2 },
        {
          label: 'Elaboración diccionario técnico (370 campos)', startWeek: 1, endWeek: 2,
          etapas: [
            { id: 'dt-1', label: 'Levantamiento inicial de campos', peso: 25 },
            { id: 'dt-2', label: 'Envío a Gobierno de datos',       peso: 25 },
            { id: 'dt-3', label: 'Correcciones de Gobierno',        peso: 25, optional: true },
            { id: 'dt-4', label: 'Validación final del diccionario',peso: 25 },
          ],
        },
        { label: 'Inicialización en Nebula',                     startWeek: 1, endWeek: 1, bbva: true },
        {
          label: 'Circuito validación Gobierno Técnico',          startWeek: 3, endWeek: 5, bbva: true,
          etapas: [
            { id: 'cvgt-1', label: 'Presentación al comité BBVA',  peso: 25 },
            { id: 'cvgt-2', label: 'Recepción de observaciones',   peso: 25 },
            { id: 'cvgt-3', label: 'Aplicación de correcciones',   peso: 25, optional: true },
            { id: 'cvgt-4', label: 'Aprobación definitiva',        peso: 25 },
          ],
        },
        { label: 'Documentación técnica ETL y mapeo de campos',   startWeek: 1, endWeek: 3 },
        { label: 'Construcción Modelo Solución del Dato (MSD)',    startWeek: 2, endWeek: 3 },
        { label: 'Circuito validación MSD',                       startWeek: 3, endWeek: 5, bbva: true },
        { label: 'Despliegue esquemas entorno Work',               startWeek: 4, endWeek: 5, bbva: true },
        { label: 'Solicitud y circuito de ACLs',                  startWeek: 4, endWeek: 5, bbva: true },
        { label: 'Solicitud despliegue Live',                     startWeek: 5, endWeek: 5, bbva: true },
        { label: 'Acompañamiento en Definición Funcional',        startWeek: 1, endWeek: 2, bbva: true },
        { label: 'Acompañamiento validación del Notebook',        startWeek: 1, endWeek: 1, bbva: true },
      ],
    },
    {
      id: 'ada', label: 'II. Componentes ADA',
      activities: [
        { label: 'Gestión repos Bitbucket · Procesamiento', startWeek: 1, endWeek: 1, bbva: true },
        {
          label: 'Construcción procesamiento Spark · Scala', startWeek: 2, endWeek: 7,
          etapas: [
            { id: 'spark-1', label: 'Ambientación del repositorio local',       peso: 10 },
            { id: 'spark-2', label: 'Construcción clases principales',          peso: 40, subs: ['Clase getData','Clase Generate','Clase Process'] },
            { id: 'spark-3', label: 'Config y utilitarios — context provider',  peso: 20 },
            { id: 'spark-4', label: 'Test unitarios y de aceptación',           peso: 20 },
            { id: 'spark-5', label: 'Escritura local — validación de salida',   peso: 10 },
          ],
        },
        { label: 'Construcción Test unitarios y Aceptación',     startWeek: 6, endWeek: 8 },
        { label: 'Construcción reglas calidad MVP (Hammurabi)',   startWeek: 5, endWeek: 7 },
        { label: 'Construcción Smart Cleaner procesamiento',      startWeek: 5, endWeek: 6 },
        { label: 'Pruebas en entorno local',                      startWeek: 7, endWeek: 8 },
        {
          label: 'Despliegue y pruebas entornos Work', startWeek: 8, endWeek: 8,
          etapas: [
            { id: 'work-1', label: 'Generación de muestras/sandbox',       peso: 20, optional: true },
            { id: 'work-2', label: 'Creación y ejecución job ADA en Work', peso: 30 },
            { id: 'work-3', label: 'Verificación de escritura en VBox',    peso: 30 },
            { id: 'work-4', label: 'Prueba en ambiente de test',           peso: 20 },
          ],
        },
        { label: 'Generación Datos Sandbox · validación',        startWeek: 8,  endWeek: 9,  bbva: true },
        { label: 'Certificación calidad por equipo QA',           startWeek: 9,  endWeek: 10, bbva: true },
        { label: 'Despliegue producción componentes ADA',         startWeek: 11, endWeek: 11 },
        { label: 'Acompañamiento validación ADA Live',            startWeek: 11, endWeek: 13, bbva: true },
      ],
    },
    {
      id: 'auto', label: 'III. Automatización y orquestación',
      activities: [
        { label: 'Gestión acceso Control-M distribuido',      startWeek: 3,  endWeek: 4,  bbva: true },
        { label: 'Definición de la automatización',           startWeek: 5,  endWeek: 5 },
        { label: 'Construcción Mallas Control-M distribuido', startWeek: 6,  endWeek: 8 },
        { label: 'Pruebas entornos Work · Mallas Control-M',  startWeek: 7,  endWeek: 8 },
        { label: 'Elaboración documentación Mallas ADA',      startWeek: 7,  endWeek: 8 },
        { label: 'Certificación mallas Control-M',            startWeek: 8,  endWeek: 10, bbva: true },
        { label: 'Instalación mallas producción',             startWeek: 10, endWeek: 10, bbva: true },
        { label: 'Estabilización procesos en producción',     startWeek: 11, endWeek: 13 },
      ],
    },
  ],
};

const BLANK_TEMPLATE = (projectId: string): PlanConfig => ({
  projectId,
  totalWeeks: 10,
  generatedAt: '',
  entregables: [
    {
      id: 'ent-1', label: 'I. Documentación',
      activities: [
        { label: 'Levantamiento de requerimientos', startWeek: 1, endWeek: 2 },
        { label: 'Documentación técnica',           startWeek: 2, endWeek: 3 },
      ],
    },
    {
      id: 'ent-2', label: 'II. Desarrollo',
      activities: [
        { label: 'Construcción componentes principales', startWeek: 3, endWeek: 8 },
        { label: 'Pruebas unitarias',                    startWeek: 7, endWeek: 9 },
      ],
    },
    {
      id: 'ent-3', label: 'III. Despliegue y cierre',
      activities: [
        { label: 'Despliegue a producción', startWeek: 9,  endWeek: 11 },
        { label: 'Estabilización',          startWeek: 11, endWeek: 13 },
      ],
    },
  ],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix = 'id') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }

function pesoTotal(etapas: PlanEtapa[]): number {
  return etapas.reduce((s, e) => s + e.peso, 0);
}

// ─── EtapaRow ─────────────────────────────────────────────────────────────────

function EtapaRow({
  etapa, index, total,
  onChange, onDelete, onMoveUp, onMoveDown,
}: {
  etapa: PlanEtapa; index: number; total: number;
  onChange: (e: PlanEtapa) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'center',
      padding: '6px 10px', borderRadius: 7,
      background: '#f8fafc', border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        <button disabled={index === 0} onClick={onMoveUp}
          style={{ border: 'none', background: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '1px 3px', color: '#94a3b8', fontSize: 9, lineHeight: 1 }}>▲</button>
        <button disabled={index === total - 1} onClick={onMoveDown}
          style={{ border: 'none', background: 'none', cursor: index === total - 1 ? 'not-allowed' : 'pointer', padding: '1px 3px', color: '#94a3b8', fontSize: 9, lineHeight: 1 }}>▼</button>
      </div>
      <input
        value={etapa.label}
        onChange={e => onChange({ ...etapa, label: e.target.value })}
        placeholder="Nombre de la etapa"
        style={{ flex: 1, padding: '4px 8px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none', background: '#fff' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <input
          type="number" min={0} max={100} value={etapa.peso}
          onChange={e => onChange({ ...etapa, peso: parseInt(e.target.value) || 0 })}
          style={{ width: 48, padding: '4px 6px', fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 5, textAlign: 'center', outline: 'none' }}
        />
        <span style={{ fontSize: 10, color: '#94a3b8' }}>%</span>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}>
        <input
          type="checkbox" checked={etapa.optional ?? false}
          onChange={e => onChange({ ...etapa, optional: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        opc.
      </label>
      <button onClick={onDelete} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, color: '#fca5a5', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Trash2 size={12}/>
      </button>
    </div>
  );
}

// ─── ActivityCard ─────────────────────────────────────────────────────────────

function ActivityCard({
  act, actIdx, totalWeeks,
  onChange, onDelete,
}: {
  act: PlanActivityConfig; actIdx: number; totalWeeks: number;
  onChange: (a: PlanActivityConfig) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const etapas = act.etapas ?? [];
  const total  = pesoTotal(etapas);
  const overOrUnder = etapas.length > 0 ? total !== 100 : false;

  function addEtapa() {
    const remaining = Math.max(0, 100 - total);
    const newEtapa: PlanEtapa = { id: uid('et'), label: 'Nueva etapa', peso: remaining };
    onChange({ ...act, etapas: [...etapas, newEtapa] });
    setOpen(true);
  }

  function updateEtapa(i: number, e: PlanEtapa) {
    const next = [...etapas];
    next[i] = e;
    onChange({ ...act, etapas: next });
  }

  function deleteEtapa(i: number) {
    const next = etapas.filter((_, idx) => idx !== i);
    onChange({ ...act, etapas: next.length ? next : undefined });
  }

  function moveEtapa(from: number, to: number) {
    const next = [...etapas];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ ...act, etapas: next });
  }

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div style={{ borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 6 }}>
      {/* Activity header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}>
        {open ? <ChevronDown size={12} color="#0d9488"/> : <ChevronRight size={12} color="#0d9488"/>}
        <input
          value={act.label}
          onChange={e => { e.stopPropagation(); onChange({ ...act, label: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          placeholder="Nombre de la actividad"
          style={{ flex: 1, padding: '3px 6px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none' }}
        />
        {/* Week range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <CalendarDays size={11} color="#94a3b8"/>
          <select value={act.startWeek} onChange={e => onChange({ ...act, startWeek: +e.target.value })}
            style={{ fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', background: '#fff', cursor: 'pointer' }}>
            {weeks.map(w => <option key={w} value={w}>S{w}</option>)}
          </select>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>→</span>
          <select value={act.endWeek} onChange={e => onChange({ ...act, endWeek: +e.target.value })}
            style={{ fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', background: '#fff', cursor: 'pointer' }}>
            {weeks.filter(w => w >= act.startWeek).map(w => <option key={w} value={w}>S{w}</option>)}
          </select>
        </div>
        {/* BBVA toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#1d4ed8', cursor: 'pointer', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={act.bbva ?? false}
            onChange={e => onChange({ ...act, bbva: e.target.checked })}
            style={{ cursor: 'pointer' }}/>
          BBVA
        </label>
        {/* Etapas badge — suma de pesos de todas las etapas (debe ser exactamente 100%) */}
        {etapas.length > 0 && (
          <span title={overOrUnder ? `Las etapas suman ${total}% — deben sumar exactamente 100%` : 'Las etapas suman 100% correctamente'}
            style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: overOrUnder ? '#fef2f2' : '#f0fdf4', color: overOrUnder ? '#dc2626' : '#15803d', fontWeight: 600, flexShrink: 0, display:'flex', alignItems:'center', gap:3 }}>
            {overOrUnder ? `⚠ ${total}%` : `✓ ${total}%`}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 3, color: '#fca5a5', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Trash2 size={12}/>
        </button>
      </div>

      {/* Expanded: etapas editor */}
      {open && (
        <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f1f5f9', background: '#fafcff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
              <LayoutList size={11}/> Etapas de avance
              {etapas.length > 0 && (
                <span style={{ fontSize: 9, color: overOrUnder ? '#dc2626' : '#15803d', fontWeight: 700 }}>
                  {overOrUnder ? `⚠ suma=${total}% (debe ser 100%)` : '✓ suma correcta'}
                </span>
              )}
            </p>
            <button onClick={addEtapa} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
              fontSize: 10, border: '1px solid #0d9488', borderRadius: 5,
              background: '#f0fdfa', color: '#0d9488', cursor: 'pointer', fontWeight: 500,
            }}>
              <Plus size={10}/> Agregar etapa
            </button>
          </div>
          {etapas.length === 0 ? (
            <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
              Sin etapas — el % se edita manualmente en el Plan de Trabajo
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {etapas.map((et, i) => (
                <EtapaRow
                  key={et.id} etapa={et} index={i} total={etapas.length}
                  onChange={e => updateEtapa(i, e)}
                  onDelete={() => deleteEtapa(i)}
                  onMoveUp={() => moveEtapa(i, i - 1)}
                  onMoveDown={() => moveEtapa(i, i + 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EntregablePanel ──────────────────────────────────────────────────────────

function EntregablePanel({
  ent, entIdx, totalWeeks,
  onChange, onDelete,
}: {
  ent: PlanEntregableConfig; entIdx: number; totalWeeks: number;
  onChange: (e: PlanEntregableConfig) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(entIdx === 0);

  function addActivity() {
    const newAct: PlanActivityConfig = { label: 'Nueva actividad', startWeek: 1, endWeek: 2 };
    onChange({ ...ent, activities: [...ent.activities, newAct] });
    setOpen(true);
  }

  function updateActivity(i: number, a: PlanActivityConfig) {
    const next = [...ent.activities]; next[i] = a;
    onChange({ ...ent, activities: next });
  }

  function deleteActivity(i: number) {
    onChange({ ...ent, activities: ent.activities.filter((_, idx) => idx !== i) });
  }

  const totalActivities = ent.activities.length;
  const withEtapas      = ent.activities.filter(a => (a.etapas?.length ?? 0) > 0).length;

  return (
    <div style={{ marginBottom: 14, borderRadius: 10, border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff', cursor: 'pointer', borderBottom: open ? '1px solid #f1f5f9' : 'none' }}
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown size={14} color="#9f1239"/> : <ChevronRight size={14} color="#9f1239"/>}
        <input
          value={ent.label}
          onChange={e => { e.stopPropagation(); onChange({ ...ent, label: e.target.value }); }}
          onClick={e => e.stopPropagation()}
          placeholder="Nombre del entregable"
          style={{ flex: 1, padding: '4px 8px', fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none', color: '#9f1239' }}
        />
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#f1f5f9', color: '#64748b' }}>
            {totalActivities} actividades
          </span>
          {withEtapas > 0 && (
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#f0fdf4', color: '#15803d' }}>
              {withEtapas} con etapas
            </span>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: '#fca5a5', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Trash2 size={13}/>
        </button>
      </div>

      {open && (
        <div style={{ padding: '12px 14px', background: '#fafcff' }}>
          {ent.activities.map((act, i) => (
            <ActivityCard
              key={i} act={act} actIdx={i} totalWeeks={totalWeeks}
              onChange={a => updateActivity(i, a)}
              onDelete={() => deleteActivity(i)}
            />
          ))}
          <button onClick={addActivity} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            width: '100%', marginTop: 6, borderRadius: 7, cursor: 'pointer',
            background: '#f8fafc', border: '1px dashed #d1d5db',
            fontSize: 11, color: '#64748b', justifyContent: 'center',
          }}>
            <Plus size={12}/> Agregar actividad
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main: Estimaciones ───────────────────────────────────────────────────────

interface EstimacionesProps {
  onViewChange: (view: View) => void;
  onBack?: () => void;   // Volver al paso anterior (SetupProject)
}

export default function Estimaciones({ onViewChange, onBack }: EstimacionesProps) {
  const { user } = useAuth();
  const role = user?.role ?? 'developer';

  // Build project list combining static PROJECTS + dynamic adminStore projects
  const allProjects = getAllProjects();
  const visibleProjects = role === 'pm'
    ? allProjects
    : allProjects.filter(p => (user?.projectIds ?? []).includes(p.id));

  // Auto-select the newly-created project if we're coming from SetupProject
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const draftId = localStorage.getItem('timia_setup_draft_id');
    if (draftId) {
      localStorage.removeItem('timia_setup_draft_id');
      return draftId;
    }
    return visibleProjects[0]?.id ?? 'FICO';
  });
  const [configs, setConfigs] = useState<Record<string, PlanConfig>>(() => adminStore.getPlanConfigs());
  const [dirty, setDirty]     = useState(false);
  const [saved, setSaved]     = useState(false);
  // inFlow: true cuando venimos del wizard de creación de proyecto
  const [inFlow, setInFlow]   = useState<boolean>(
    () => localStorage.getItem('timia_setup_flow') === '2'
  );

  // ── Auto-limpiar flag del wizard al montar ──────────────────────────────────
  // Si el usuario abandona el wizard por el navbar (sin usar Volver/Siguiente),
  // el flag '2' quedaba en LS indefinidamente mostrando el stepper en cada visita.
  useEffect(() => {
    if (localStorage.getItem('timia_setup_flow') === '2') {
      localStorage.removeItem('timia_setup_flow');
    }
  }, []);

  // Holiday dates set for week label computation
  const holidayDates = React.useMemo(() => {
    const holidays = adminStore.getHolidays();
    return new Set(holidays.map(h => h.date));
  }, []);

  // Get or bootstrap the config for the selected project
  const currentConfig: PlanConfig = configs[selectedProjectId] ?? (
    selectedProjectId === 'FICO' ? FICO_DEFAULT : BLANK_TEMPLATE(selectedProjectId)
  );

  useEffect(() => {
    setDirty(false);
    setSaved(false);
  }, [selectedProjectId]);

  function updateConfig(patch: Partial<PlanConfig>) {
    const next = { ...configs, [selectedProjectId]: { ...currentConfig, ...patch } };
    setConfigs(next);
    setDirty(true);
    setSaved(false);
  }

  function saveConfig() {
    const labels = computeWeekLabels(startDate, currentConfig.totalWeeks, holidayDates);
    const updated = {
      ...configs,
      [selectedProjectId]: {
        ...currentConfig,
        startDate,
        weekLabels: labels,
        generatedAt: new Date().toISOString(),
      },
    };
    setConfigs(updated);
    adminStore.savePlanConfigs(updated);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function generatePlan() {
    // Recompute weekLabels based on current startDate before saving
    const labels = computeWeekLabels(startDate, currentConfig.totalWeeks, holidayDates);
    const updated = {
      ...configs,
      [selectedProjectId]: {
        ...currentConfig,
        startDate,
        weekLabels: labels,
        generatedAt: new Date().toISOString(),
      },
    };
    setConfigs(updated);
    adminStore.savePlanConfigs(updated);
    setDirty(false);
    // Marca el proyecto para que PlanDeTrabajo lo auto-seleccione al montar
    localStorage.setItem('timia_last_plan_project', selectedProjectId);
    // Avanza al paso 3 del flujo de creación
    if (inFlow) {
      localStorage.setItem('timia_setup_flow', '3');
    }
    onViewChange('plan-trabajo');
  }

  function updateEntregable(i: number, ent: typeof currentConfig.entregables[number]) {
    const next = [...currentConfig.entregables]; next[i] = ent;
    updateConfig({ entregables: next });
  }

  function deleteEntregable(i: number) {
    updateConfig({ entregables: currentConfig.entregables.filter((_, idx) => idx !== i) });
  }

  function addEntregable() {
    const idx = currentConfig.entregables.length + 1;
    updateConfig({
      entregables: [...currentConfig.entregables, {
        id: uid('ent'), label: `${idx}. Nuevo entregable`, activities: [],
      }],
    });
  }

  const proj  = allProjects.find(p => p.id === selectedProjectId);
  const color = proj?.color ?? '#64748b';

  // Start date: stored in config or today by default
  const today = new Date().toISOString().slice(0, 10);
  const startDate = currentConfig.startDate ?? today;

  const totalActivities = currentConfig.entregables.reduce((s, e) => s + e.activities.length, 0);
  const totalEtapas     = currentConfig.entregables.reduce((s, e) => s + e.activities.reduce((s2, a) => s2 + (a.etapas?.length ?? 0), 0), 0);

  return (
    <div style={{ minHeight: '100%' }}>

      {/* ── Flow stepper (solo cuando venimos del wizard) ────────────────── */}
      {inFlow && (
        <div style={{ marginBottom: 24 }}>
          <FlowStepper current={2} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#fafafa', border: '0.5px solid #e2e8f0', borderRadius: 10, marginTop: -12 }}>
            <button
              onClick={() => {
                localStorage.removeItem('timia_setup_flow');
                setInFlow(false);
                onBack?.();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 11, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', color: '#374151', fontWeight: 500 }}
            >
              <ArrowLeft size={12}/> Volver a configurar proyecto
            </button>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              Configura el plan de tu nuevo proyecto y haz clic en <strong>Generar Plan de Trabajo</strong> para continuar.
            </p>
          </div>
        </div>
      )}

    <div style={{ display: 'flex', gap: 16 }}>

      {/* ── Sidebar proyectos ───────────────────────────────────────────────── */}
      <div style={{ width: 140, flexShrink: 0 }}>
        <p style={{ margin: '0 0 8px', fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>Proyectos</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {visibleProjects.map(p => {
            const isActive   = p.id === selectedProjectId;
            const hasConfig  = !!configs[p.id];
            return (
              <button key={p.id} onClick={() => setSelectedProjectId(p.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
                background: isActive ? `${p.color}15` : 'transparent',
                border: isActive ? `0.5px solid ${p.color}50` : '0.5px solid transparent',
                borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, color: isActive ? p.color : '#374151', flex: 1 }}>
                  {p.id}
                </span>
                {hasConfig
                  ? <span style={{ fontSize: 8, color: '#15803d' }}>✓</span>
                  : <span style={{ fontSize: 8, color: '#94a3b8' }}>—</span>
                }
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div style={{ marginTop: 16, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '0.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: '#15803d' }}>✓</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>Plan guardado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>—</span>
            <span style={{ fontSize: 9, color: '#64748b' }}>Sin plan</span>
          </div>
        </div>
      </div>

      {/* ── Editor principal ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: '14px 18px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color }}>{selectedProjectId.slice(0,2)}</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>Estimaciones · {selectedProjectId}</h3>
              <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                {currentConfig.entregables.length} entregables · {totalActivities} actividades · {totalEtapas} etapas definidas
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Start date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <CalendarDays size={12} color="#64748b"/>
              <label style={{ fontSize: 10, color: '#64748b' }}>Inicio:</label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  const newStart = e.target.value;
                  const labels = computeWeekLabels(newStart, currentConfig.totalWeeks, holidayDates);
                  updateConfig({ startDate: newStart, weekLabels: labels });
                }}
                style={{ padding: '2px 6px', fontSize: 11, fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            {/* Weeks editor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <Clock size={12} color="#64748b"/>
              <label style={{ fontSize: 10, color: '#64748b' }}>Semanas:</label>
              <input
                type="number" min={4} max={52} value={currentConfig.totalWeeks}
                onChange={e => {
                  const weeks = Math.max(4, Math.min(52, +e.target.value || 10));
                  const labels = computeWeekLabels(startDate, weeks, holidayDates);
                  updateConfig({ totalWeeks: weeks, weekLabels: labels });
                }}
                style={{ width: 40, padding: '2px 4px', fontSize: 11, fontWeight: 600, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none' }}
              />
            </div>

            <button onClick={saveConfig} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              fontSize: 12, background: saved ? '#f0fdf4' : dirty ? '#fff' : '#f8fafc',
              color: saved ? '#15803d' : dirty ? '#374151' : '#94a3b8',
              border: `1px solid ${saved ? '#86efac' : dirty ? '#d1d5db' : '#e2e8f0'}`,
              borderRadius: 8, cursor: 'pointer', fontWeight: 500, transition: 'all .2s',
            }}>
              <Save size={13}/> {saved ? '¡Guardado!' : 'Guardar'}
            </button>

            <button onClick={generatePlan} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
              fontSize: 12, background: '#dc2626', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
            }}>
              <ArrowRight size={14}/> Generar Plan de Trabajo
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Entregables', val: currentConfig.entregables.length, icon: <CheckSquare size={16} color="#7c3aed"/>, bg: '#f5f3ff' },
            { label: 'Actividades', val: totalActivities, icon: <LayoutList size={16} color="#0369a1"/>, bg: '#eff6ff' },
            { label: 'Con etapas',  val: totalEtapas > 0 ? currentConfig.entregables.reduce((s,e) => s + e.activities.filter(a=>(a.etapas?.length??0)>0).length,0) : 0, icon: <Settings2 size={16} color="#0d9488"/>, bg: '#f0fdfa' },
            { label: 'Semanas',     val: currentConfig.totalWeeks, icon: <CalendarDays size={16} color="#d97706"/>, bg: '#fffbeb' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {s.icon}
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{s.val}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11 }}>💡</span>
          <p style={{ margin: 0, fontSize: 11, color: '#92400e' }}>
            <strong>Tip:</strong> expande una actividad para definir sus etapas de avance. Los pesos deben sumar 100% — esto controla la propagación del % en el Plan de Trabajo.
          </p>
        </div>

        {/* Entregables */}
        {currentConfig.entregables.map((ent, i) => (
          <EntregablePanel
            key={ent.id} ent={ent} entIdx={i} totalWeeks={currentConfig.totalWeeks}
            onChange={e => updateEntregable(i, e)}
            onDelete={() => deleteEntregable(i)}
          />
        ))}

        {/* Add entregable */}
        <button onClick={addEntregable} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          width: '100%', marginTop: 4, borderRadius: 10, cursor: 'pointer',
          background: '#f8fafc', border: '1.5px dashed #d1d5db',
          fontSize: 12, color: '#64748b', justifyContent: 'center',
          fontWeight: 500,
        }}>
          <Plus size={14}/> Agregar entregable
        </button>

        {/* Bottom CTA */}
        <div style={{ marginTop: 24, padding: '16px 20px', background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              ¿Listo para generar el plan?
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
              Se guardará la configuración y podrás ver el Gantt en Plan de Trabajo.
            </p>
          </div>
          <button onClick={generatePlan} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px',
            fontSize: 13, background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700,
            flexShrink: 0,
          }}>
            Generar Plan de Trabajo <ArrowRight size={15}/>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
