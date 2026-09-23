import React, { useState } from 'react';
import {
  GitBranch, Plus, Edit2, Trash2, ChevronRight, Cloud, Cpu, Database, Layout,
  CheckCircle2, X, Save, PlusCircle, GripVertical, BarChart3, FileText, Shield,
  Layers, Settings, Activity, Box, Zap, Globe, Code2, HardDrive, Network,
  AlertTriangle, ClipboardList, ChevronDown, CalendarDays, Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectTemplate, TemplateTask } from '../types';
import { PLAN_PREVIEWS, countActivities, type PlanTemplatePreview } from '../lib/planTemplates';
import { PLANTILLAS, BLOQUES, resumenBloque, generarDesdePlantilla, insertarBloque } from '../lib/plantillas';
import {
  adminStore, alcanceDe, puedeVerPlantilla, puedeEditarPlantilla,
  type PlantillaPropia, type PlanEntregableConfig, type SolicitudPlantilla,
} from '../lib/adminStore';
import { useAuth } from '../contexts/AuthContext';
import EditorPlantilla from './EditorPlantilla';

interface ProjectTemplatesProps {
  templates: ProjectTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<ProjectTemplate[]>>;
}

// ─── Icon registry (20 opciones) ─────────────────────────────────────────────

const ICON_LIST = [
  { id:'Layout',       label:'Layout',      El: Layout      },
  { id:'GitBranch',    label:'Rama',        El: GitBranch   },
  { id:'Cloud',        label:'Cloud',       El: Cloud       },
  { id:'Cpu',          label:'CPU',         El: Cpu         },
  { id:'Database',     label:'Datos',       El: Database    },
  { id:'BarChart3',    label:'Métricas',    El: BarChart3   },
  { id:'FileText',     label:'Documento',   El: FileText    },
  { id:'Shield',       label:'Seguridad',   El: Shield      },
  { id:'Layers',       label:'Capas',       El: Layers      },
  { id:'Settings',     label:'Config',      El: Settings    },
  { id:'Activity',     label:'Actividad',   El: Activity    },
  { id:'Box',          label:'Módulo',      El: Box         },
  { id:'Zap',          label:'Pipeline',    El: Zap         },
  { id:'Globe',        label:'Global',      El: Globe       },
  { id:'Code2',        label:'Código',      El: Code2       },
  { id:'HardDrive',    label:'Storage',     El: HardDrive   },
  { id:'Network',      label:'Red',         El: Network     },
  { id:'AlertTriangle',label:'Alerta',      El: AlertTriangle },
  { id:'ClipboardList',label:'Checklist',   El: ClipboardList },
  { id:'CheckCircle2', label:'Certificado', El: CheckCircle2 },
];

function getIcon(name: string, size = 20) {
  const found = ICON_LIST.find(i => i.id === name);
  if (!found) return <Layout size={size}/>;
  const { El } = found;
  return <El size={size}/>;
}

// ─── Predefined task starters (item 9) ───────────────────────────────────────

const PREDEFINED_SETS: { label: string; icon: string; tasks: TemplateTask[] }[] = [
  {
    label: 'Ingesta ADA básica', icon: 'Database',
    tasks: [
      { title: 'Levantamiento de requisitos y dudas',        description: 'Reuniones con BBVA para resolver dudas funcionales y técnicas.',          points: 5, peso: 10 },
      { title: 'Diccionario técnico de campos',              description: 'Documentar los 370+ campos con tipo, descripción y fuente.',              points: 8, peso: 15 },
      { title: 'Diseño lógico y físico de tablas ADA',       description: 'Definir tablas input, work y live con su esquema completo.',              points: 8, peso: 20 },
      { title: 'Construcción jobs Control-M',                description: 'Crear y configurar los jobs de orquestación en Control-M.',               points: 6, peso: 15 },
      { title: 'Construcción transformaciones Spark-Scala',  description: 'Desarrollar las transformaciones de procesamiento en ADA.',               points: 8, peso: 20 },
      { title: 'Pruebas de calidad de datos (LIVE)',         description: 'Validar reglas de calidad con datos reales de BBVA.',                    points: 5, peso: 10 },
      { title: 'Certificación y paso a producción',          description: 'Circuito de certificación con gobierno técnico BBVA y paso PRD.',        points: 5, peso: 10 },
    ],
  },
  {
    label: 'Gobierno de datos FICO', icon: 'Shield',
    tasks: [
      { title: 'Análisis funcional modelo FICO',             description: 'Entender variables, target y lógica de negocio del modelo.',             points: 5, peso: 15 },
      { title: 'Documentación en Confluence',                description: 'Crear y actualizar la documentación técnica en Confluence.',             points: 4, peso: 10 },
      { title: 'Diccionario y linaje de datos',              description: 'Mapear el linaje desde fuente hasta el score final.',                   points: 6, peso: 20 },
      { title: 'Validación gobierno técnico',                description: 'Presentar y aprobar con el comité de gobierno técnico de BBVA.',        points: 5, peso: 15 },
      { title: 'Reglas Hammurabi de calidad',                description: 'Definir e implementar reglas de validación de calidad de datos.',       points: 6, peso: 20 },
      { title: 'Monitoreo continuo post-producción',         description: 'Configurar alertas y reportes de seguimiento en producción.',           points: 4, peso: 20 },
    ],
  },
  {
    label: 'Pipeline ETL estándar', icon: 'Zap',
    tasks: [
      { title: 'Análisis de fuentes de datos',               description: 'Identificar y documentar todas las fuentes origen.',                    points: 4, peso: 10 },
      { title: 'Diseño del pipeline de ingesta',             description: 'Definir arquitectura del pipeline con stages y frecuencias.',           points: 5, peso: 15 },
      { title: 'Construcción extracción (Extract)',           description: 'Implementar lecturas desde Oracle/SQL Server/archivos planos.',         points: 6, peso: 25 },
      { title: 'Transformaciones y limpieza (Transform)',    description: 'Aplicar reglas de negocio, normalización y enriquecimiento.',           points: 7, peso: 25 },
      { title: 'Carga a destino (Load)',                     description: 'Insertar/actualizar datos en tablas ADA live o data warehouse.',        points: 5, peso: 15 },
      { title: 'Pruebas end-to-end y reconciliación',        description: 'Validar conteos, sumas de control y completitud.',                     points: 4, peso: 10 },
    ],
  },
  {
    label: 'Proyecto vacío', icon: 'Layout',
    tasks: [],
  },
];

// ─── Plan preview accordion ───────────────────────────────────────────────────

function PlanPreviewAccordion({ preview }: { preview: PlanTemplatePreview }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const total = countActivities(preview);

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Plan de Estimaciones
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{total} actividades</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#94a3b8' }}>
            <CalendarDays size={10}/>{preview.totalWeeks} sem.
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {preview.entregables.map((ent, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} style={{ border: `1px solid ${ent.color}22`, borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', background: isOpen ? `${ent.color}10` : '#f8fafc',
                  cursor: 'pointer', border: 'none', textAlign: 'left',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: ent.color,
                  flexShrink: 0, boxShadow: `0 0 0 2px ${ent.color}22`,
                }}/>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#334155', lineHeight: 1.3 }}>
                  {ent.label}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, marginRight: 4 }}>
                  {ent.activities.length}
                </span>
                <ChevronDown size={12} style={{
                  color: '#94a3b8', flexShrink: 0,
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform .15s',
                }}/>
              </button>
              {isOpen && (
                <div style={{ padding: '6px 10px 8px 26px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ent.activities.map((act, aIdx) => (
                    <div key={aIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: ent.color, flexShrink: 0, marginTop: 5 }}/>
                      <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabPlantilla = 'proyecto' | 'entregable';

export default function ProjectTemplates({ templates, setTemplates }: ProjectTemplatesProps) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const role = (user?.role ?? 'developer') as 'account_manager' | 'pm' | 'tech_lead' | 'developer';
  const [tab, setTab] = useState<TabPlantilla>('proyecto');
  const [propias, setPropias] = useState<PlantillaPropia[]>(() => adminStore.getPlantillasPropias());
  const [solicitudes, setSolicitudes] = useState<SolicitudPlantilla[]>(() => adminStore.getSolicitudesPlantilla());
  const [editando, setEditando] = useState<PlantillaPropia | null>(null);

  function guardarSolicitudes(next: SolicitudPlantilla[]) {
    setSolicitudes(next); adminStore.saveSolicitudesPlantilla(next);
  }
  /** Solicitudes que le toca resolver a este usuario (es dueño de la plantilla). */
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente' && s.ownerId === userId);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [isModalOpen,     setIsModalOpen]     = useState(false);
  const [showPredefined,  setShowPredefined]  = useState(false);

  const handleDeleteTemplate = (id: string) => {
    if (confirm('¿Eliminar esta plantilla?')) setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleEditTemplate = (template: ProjectTemplate) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
    setIsModalOpen(true);
  };

  const handleNewTemplate = () => {
    setShowPredefined(true);
  };

  const handleSelectPredefined = (set: typeof PREDEFINED_SETS[0]) => {
    setEditingTemplate({
      id: `temp-${Date.now()}`,
      name: set.label !== 'Proyecto vacío' ? '' : '',
      description: '',
      icon: set.icon,
      tasks: JSON.parse(JSON.stringify(set.tasks)),
    });
    setShowPredefined(false);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    setTemplates(prev => {
      const exists = prev.find(t => t.id === editingTemplate.id);
      if (exists) return prev.map(t => t.id === editingTemplate.id ? editingTemplate : t);
      return [...prev, editingTemplate];
    });
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const addTask = () => {
    if (!editingTemplate) return;
    const newTask: TemplateTask = { title: '', description: '', points: 5, peso: 0 };
    setEditingTemplate({ ...editingTemplate, tasks: [...editingTemplate.tasks, newTask] });
  };

  const removeTask = (index: number) => {
    if (!editingTemplate) return;
    const newTasks = [...editingTemplate.tasks];
    newTasks.splice(index, 1);
    setEditingTemplate({ ...editingTemplate, tasks: newTasks });
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: any) => {
    if (!editingTemplate) return;
    const newTasks = [...editingTemplate.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setEditingTemplate({ ...editingTemplate, tasks: newTasks });
  };

  // ── Ponderation helpers ─────────────────────────────────────────────────────
  const totalPeso = (editingTemplate?.tasks ?? []).reduce((s, t) => s + (t.peso ?? 0), 0);
  const pesoColor = Math.abs(totalPeso - 100) < 1 ? '#15803d' : totalPeso > 100 ? '#dc2626' : '#d97706';

  const TABS: { id: TabPlantilla; label: string; sub: string }[] = [
    { id: 'proyecto',   label: 'Proyecto',   sub: 'Cronogramas completos: todas las fases con sus actividades y semanas.' },
    { id: 'entregable', label: 'Entregable', sub: 'Fases sueltas, para agregar a un cronograma que ya existe.' },
  ];
  const activa = TABS.find(x => x.id === tab)!;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <GitBranch className="text-primary" size={32} />
          Plantillas
        </h1>
        <p className="text-slate-500 mt-1">{activa.sub}</p>
        <div className="flex gap-1 mt-4 border-b border-slate-200">
          {TABS.map(x => (
            <button key={x.id} onClick={() => setTab(x.id)}
              className={`px-5 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${
                tab === x.id ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bandeja: solicitudes de acceso a mis plantillas privadas */}
      {pendientes.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
          <p className="text-sm font-bold text-amber-900 mb-2">
            {pendientes.length} {pendientes.length === 1 ? 'solicitud' : 'solicitudes'} de acceso a tus plantillas
          </p>
          <div className="space-y-2">
            {pendientes.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">
                    <b>{s.solicitanteNombre}</b> quiere ver <b>{s.plantillaNombre}</b>
                  </p>
                  {s.motivo && <p className="text-xs text-slate-400 truncate">{s.motivo}</p>}
                </div>
                <button onClick={() => guardarSolicitudes(solicitudes.map(x => x.id === s.id ? { ...x, estado: 'aprobada' as const, resueltaEn: new Date().toISOString() } : x))}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:opacity-90">Aprobar</button>
                <button onClick={() => guardarSolicitudes(solicitudes.map(x => x.id === s.id ? { ...x, estado: 'rechazada' as const, resueltaEn: new Date().toISOString() } : x))}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Rechazar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(
        <CatalogoCronograma
          tipo={tab}
          userId={userId}
          role={role}
          userName={user?.name ?? 'Alguien'}
          solicitudes={solicitudes}
          onSolicitar={(pl, motivo) => {
            const ya = solicitudes.find(s => s.plantillaId === pl.id && s.solicitanteId === userId && s.estado === 'pendiente');
            if (ya) { alert('Ya hay una solicitud pendiente para esa plantilla.'); return; }
            guardarSolicitudes([...solicitudes, {
              id: `sol-${Date.now().toString(36)}`,
              plantillaId: pl.id, plantillaNombre: pl.nombre,
              ownerId: pl.ownerId ?? '', solicitanteId: userId,
              solicitanteNombre: user?.name ?? 'Alguien', motivo,
              estado: 'pendiente', creadaEn: new Date().toISOString(),
            }]);
          }}
          onCambiarAlcance={(id, alcance) => {
            const next = propias.map(x => x.id === id ? { ...x, alcance } : x);
            setPropias(next); adminStore.savePlantillasPropias(next);
          }}
          onEditar={setEditando}
          onDuplicar={(nombre, entregables, totalWeeks, descripcion) => {
            const nueva: PlantillaPropia = {
              id: `plt-${Date.now().toString(36)}`,
              nombre: `${nombre} (copia)`, descripcion, tipo: tab,
              entregables: JSON.parse(JSON.stringify(entregables)),
              totalWeeks, creadaEn: new Date().toISOString(),
              alcance: 'privada', ownerId: userId, ownerName: user?.name,
            };
            const next = [...propias, nueva];
            setPropias(next); adminStore.savePlantillasPropias(next);
            setEditando(nueva);
          }}
          propias={propias}
          onDeletePropia={id => {
            if (!confirm('¿Borrar esta plantilla?')) return;
            const next = propias.filter(p => p.id !== id);
            setPropias(next); adminStore.savePlantillasPropias(next);
          }}
        />
      )}

      {editando && (
        <EditorPlantilla
          plantilla={editando}
          onCerrar={() => setEditando(null)}
          onGuardar={pl => {
            const next = propias.some(x => x.id === pl.id)
              ? propias.map(x => x.id === pl.id ? pl : x)
              : [...propias, pl];
            setPropias(next); adminStore.savePlantillasPropias(next);
            setEditando(null);
          }}
        />
      )}

    </div>
  );
}

// ─── Catálogo de plantillas de cronograma ───────────────────────────────────
// Solo lectura: se aplican desde Estimaciones, sobre un cronograma concreto.

function CatalogoCronograma({
  tipo, propias, userId, role, solicitudes,
  onDeletePropia, onEditar, onDuplicar, onSolicitar, onCambiarAlcance,
}: {
  tipo: 'proyecto' | 'entregable';
  propias: PlantillaPropia[];
  userId: string;
  role: 'account_manager' | 'pm' | 'tech_lead' | 'developer';
  userName: string;
  solicitudes: SolicitudPlantilla[];
  onDeletePropia: (id: string) => void;
  onEditar: (p: PlantillaPropia) => void;
  onDuplicar: (nombre: string, entregables: PlanEntregableConfig[], totalWeeks: number, descripcion: string) => void;
  onSolicitar: (p: PlantillaPropia, motivo: string) => void;
  onCambiarAlcance: (id: string, alcance: 'privada' | 'compartida' | 'catalogo') => void;
}) {
  const delTipo = propias.filter(p => p.tipo === tipo);
  // Lo que puedo abrir: mías, compartidas, del catálogo, o privadas con acceso aprobado.
  const mias = delTipo.filter(p => puedeVerPlantilla(p, userId, role, solicitudes));
  // Lo que existe pero no puedo abrir: se ve el nombre y el dueño, nada más.
  const bloqueadas = delTipo.filter(p => !puedeVerPlantilla(p, userId, role, solicitudes));

  const base = tipo === 'proyecto'
    ? PLANTILLAS.map(pl => {
        const cfg = generarDesdePlantilla(pl, { projectId: '—' });
        return {
          id: pl.id, nombre: pl.nombre, descripcion: pl.descripcion,
          fases: pl.bloques.length,
          actividades: pl.bloques.reduce((s, b) => s + b.actividades.length, 0),
          semanas: cfg.totalWeeks,
          casillas: cfg.entregables.reduce((s, e) => s + e.activities.reduce((x, a) => x + (a.weeks?.length ?? 0), 0), 0),
          bbva: pl.bloques.reduce((s, b) => s + b.actividades.filter(a => a.resp === 'bbva').length, 0),
          detalle: pl.bloques.map(b => b.label),
          entregables: cfg.entregables,
        };
      })
    : BLOQUES.map(b => {
        const r = resumenBloque(b);
        return {
          id: b.id, nombre: b.label, descripcion: `${r.actividades} actividades encadenadas desde la semana que elijas.`,
          fases: 1, actividades: r.actividades, semanas: r.semanas, casillas: r.casillas, bbva: r.bbva,
          detalle: b.actividades.map(a => a.label),
          entregables: insertarBloque([], b, 1),
        };
      });

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-violet-50 border border-violet-200 px-5 py-3 text-sm text-violet-800">
        Estas plantillas se aplican desde <b>Estimaciones → Plantillas</b>, sobre el cronograma que estés editando.
        Las duraciones salen de la mediana de los cronogramas reales de MIGBD y FICO.
        Las del catálogo no se editan: duplicá una con <b>⧉</b> y editá la copia.
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Del catálogo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {base.map(p => (
            <TarjetaPlantilla key={p.id}
              nombre={p.nombre} descripcion={p.descripcion} fases={p.fases}
              actividades={p.actividades} semanas={p.semanas} casillas={p.casillas}
              bbva={p.bbva} detalle={p.detalle}
              onDuplicar={() => onDuplicar(p.nombre, p.entregables, p.semanas, p.descripcion)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Del equipo {mias.length > 0 && <span className="text-slate-300">· {mias.length}</span>}
        </h2>
        {mias.length === 0 ? (
          <p className="text-sm text-slate-400 italic">
            Todavía no guardaste ninguna. En Estimaciones, usá <b>Guardar como plantilla</b> para el cronograma completo,
            o el ícono ✨ de un entregable en la vista Detalle.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mias.map(p => (
              <TarjetaPlantilla key={p.id}
                nombre={p.nombre}
                descripcion={p.descripcion ?? ''}
                fases={p.entregables.length}
                actividades={p.entregables.reduce((s, e) => s + e.activities.length, 0)}
                semanas={p.totalWeeks}
                casillas={p.entregables.reduce((s, e) => s + e.activities.reduce((x, a) => x + (a.weeks?.length ?? 0), 0), 0)}
                bbva={p.entregables.reduce((s, e) => s + e.activities.filter(a => a.bbva).length, 0)}
                detalle={p.entregables.flatMap(e => e.activities.map(a => a.label))}
                onDelete={puedeEditarPlantilla(p, userId, role) ? () => onDeletePropia(p.id) : undefined}
                onEditar={puedeEditarPlantilla(p, userId, role) ? () => onEditar(p) : undefined}
                onDuplicar={!puedeEditarPlantilla(p, userId, role)
                  ? () => onDuplicar(p.nombre, p.entregables, p.totalWeeks, p.descripcion ?? '')
                  : undefined}
                alcance={alcanceDe(p)}
                duenio={p.ownerId === userId ? 'vos' : p.ownerName}
                onAlcance={puedeEditarPlantilla(p, userId, role) ? a => onCambiarAlcance(p.id, a) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {bloqueadas.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Privadas de otros <span className="text-slate-300">· {bloqueadas.length}</span>
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Existen pero no podés abrirlas. Pedí acceso y le llega al dueño para que lo apruebe.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bloqueadas.map(p => {
              const sol = solicitudes.find(s => s.plantillaId === p.id && s.solicitanteId === userId);
              return (
                <div key={p.id} className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-5">
                  <div className="flex items-start gap-2 mb-1">
                    <Shield size={15} className="text-slate-400 mt-0.5 shrink-0"/>
                    <h3 className="text-base font-bold text-slate-600 leading-tight">{p.nombre}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    {p.entregables.length} {p.entregables.length === 1 ? 'fase' : 'fases'} · de {p.ownerName ?? 'otro PM'}
                  </p>
                  {sol?.estado === 'pendiente' ? (
                    <span className="text-xs font-bold text-amber-600">Solicitud enviada</span>
                  ) : sol?.estado === 'rechazada' ? (
                    <span className="text-xs font-bold text-slate-400">Acceso denegado</span>
                  ) : (
                    <button
                      onClick={() => {
                        const motivo = prompt(`¿Para qué la necesitás? (le llega a ${p.ownerName ?? 'el dueño'})`, '');
                        if (motivo === null) return;
                        onSolicitar(p, motivo);
                      }}
                      className="text-xs font-bold text-primary hover:underline">
                      Pedir acceso
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const ALCANCE_META = {
  privada:    { label: 'Privada',    clase: 'text-slate-500 bg-slate-100' },
  compartida: { label: 'Compartida', clase: 'text-emerald-700 bg-emerald-50' },
  catalogo:   { label: 'Catálogo',   clase: 'text-violet-700 bg-violet-50' },
} as const;

function TarjetaPlantilla({
  nombre, descripcion, fases, actividades, semanas, casillas, bbva, detalle,
  onDelete, onEditar, onDuplicar, alcance, duenio, onAlcance,
}: {
  nombre: string; descripcion: string; fases: number; actividades: number;
  semanas: number; casillas: number; bbva: number; detalle: string[];
  onDelete?: () => void; onEditar?: () => void; onDuplicar?: () => void;
  alcance?: 'privada' | 'compartida' | 'catalogo';
  duenio?: string;
  onAlcance?: (a: 'privada' | 'compartida' | 'catalogo') => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-base font-bold text-slate-900 leading-tight">{nombre}</h3>
        <div className="flex gap-1 shrink-0">
          {onEditar && (
            <button onClick={onEditar} title="Editar plantilla"
              className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
              <Edit2 size={14}/>
            </button>
          )}
          {onDuplicar && (
            <button onClick={onDuplicar} title="Duplicar y editar — el catálogo no se modifica"
              className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
              <Copy size={14}/>
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} title="Borrar plantilla"
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
              <Trash2 size={14}/>
            </button>
          )}
        </div>
      </div>
      {(alcance || duenio) && (
        <div className="flex items-center gap-2 mb-2">
          {alcance && (
            onAlcance ? (
              <select value={alcance} onChange={e => onAlcance(e.target.value as 'privada' | 'compartida' | 'catalogo')}
                title="Quién puede ver esta plantilla"
                className={`text-[10px] font-bold rounded-full px-2 py-0.5 cursor-pointer border-0 outline-none ${ALCANCE_META[alcance].clase}`}>
                <option value="privada">Privada</option>
                <option value="compartida">Compartida</option>
                <option value="catalogo">Catálogo</option>
              </select>
            ) : (
              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${ALCANCE_META[alcance].clase}`}>
                {ALCANCE_META[alcance].label}
              </span>
            )
          )}
          {duenio && <span className="text-[10px] text-slate-400">de {duenio}</span>}
        </div>
      )}
      <p className="text-sm text-slate-500 mb-4">{descripcion}</p>
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[[fases, fases === 1 ? 'fase' : 'fases'], [actividades, 'activid.'], [semanas, 'semanas'], [casillas, 'casillas']].map(([v, l]) => (
          <div key={l as string} className="bg-slate-50 rounded-lg py-2 text-center">
            <div className="text-lg font-bold text-slate-900 leading-none">{v as number}</div>
            <div className="text-[10px] text-slate-400 mt-1">{l as string}</div>
          </div>
        ))}
      </div>
      {bbva > 0 && (
        <p className="text-xs text-blue-700 mb-2">{bbva} {bbva === 1 ? 'actividad depende' : 'actividades dependen'} de BBVA</p>
      )}
      <button onClick={() => setAbierto(v => !v)} className="text-xs font-semibold text-primary hover:underline">
        {abierto ? 'Ocultar actividades' : 'Ver actividades'}
      </button>
      {abierto && (
        <ul className="mt-2 space-y-1 max-h-52 overflow-y-auto pr-1">
          {detalle.map((d, i) => (
            <li key={i} className="text-xs text-slate-500 leading-snug flex gap-2">
              <span className="text-slate-300 shrink-0">{i + 1}.</span>{d}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
