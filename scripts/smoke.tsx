// Smoke test: monta PlanDeTrabajo y Estimaciones en jsdom con db.json + datos viejos
// y simula clicks. Uso: npm run smoke
import fs from 'fs';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const w: any = dom.window;
for (const k of ['window','document','HTMLElement','Node','Element','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','MutationObserver','localStorage','MouseEvent','Event']) { try { (globalThis as any)[k] = w[k]; } catch {} }
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
// jsdom no trae ResizeObserver y la matriz del cronograma lo usa para medirse.
// Sin esto, Estimaciones reventaba en cada corrida y el fallo se daba por
// normal, que es la peor forma de tener una prueba.
w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
(globalThis as any).ResizeObserver = w.ResizeObserver;
w.confirm = () => true;
w.prompt = () => null;
const db = JSON.parse(fs.readFileSync('public/db.json','utf8'));
for (const [k,v] of Object.entries(db)) if (k.startsWith('timia_')) w.localStorage.setItem(k, JSON.stringify(v));
// Restos de versiones anteriores que pueden quedar en el navegador
w.localStorage.setItem('timia_notes_MIGBD', JSON.stringify({ pasos:['x'] }));
w.localStorage.setItem('timia_notes_OTRO', 'garbage{');
// Un proyecto abierto con tareas, para que la vista T&M se monte con contenido
// y el click en la fila abra el panel de avance.
w.localStorage.setItem('timia_tym_planes', JSON.stringify({ MIGBD: {
  projectId: 'MIGBD', bloques: ['Incidencias'],
  tareas: [
    { id: 't1', nombre: 'Atención de incidencias', bloque: 'Incidencias', responsable: 'Juliana Garzón', estado: 'en-curso', pct: 60, creada: '2026-11-01T12:00:00Z' },
    { id: 't2', nombre: 'Ajustes de validación', bloque: 'Incidencias', estado: 'finalizada', pct: 100, creada: '2026-11-02T12:00:00Z' },
  ],
  historial: { t1: [{ fecha: '2026-11-20T12:00:00Z', de: 40, a: 60, quien: 'Amilkar', nota: 'reglas validadas' }] },
} }));
// Un proyecto cerrado con su plan generado. Sin esto, la vista del plan se
// montaba vacía y todo lo que cuelga de ella —el panel de la tarea, los
// correos, las alertas— no se probaba nunca.
w.localStorage.setItem('timia_projects', JSON.stringify([
  { id:'MIGBD', name:'Migración BD a ADA', area:'Juan Pérez', color:'#7c3aed', priority:'Alta',
    client:'BBVA Colombia', startDate:'2026-09-01', active:true, sda:'SDATOOL-54364' },
]));
w.localStorage.setItem('timia_plan_configs', JSON.stringify({
  MIGBD: {
    projectId:'MIGBD', totalWeeks:12, startDate:'2026-09-01', generatedAt:'2026-09-01T12:00:00Z',
    entregables: [
      { id:'e1', label:'Documentación y gobierno', activities: [
        { label:'Diccionario de datos', startWeek:1, endWeek:3,
          etapas:[{ id:'et1', label:'Borrador', peso:50 }, { id:'et2', label:'Aprobación', peso:50 }] },
        { label:'Envío a gobierno', startWeek:3, endWeek:5, resp:'bbva' },
      ]},
      { id:'e2', label:'Ingesta', activities: [
        { label:'Schemas Work', startWeek:4, endWeek:7 },
        { label:'Construcción del proceso', startWeek:6, endWeek:11 },
      ]},
    ],
  },
}));
w.localStorage.setItem('timia_plan_pcts', JSON.stringify({
  'MIGBD-e1-0': 100, 'MIGBD-e1-1': 40, 'MIGBD-e2-0': 60, 'MIGBD-e2-1': 10,
}));
w.localStorage.setItem('timia_plan_pct_historial', JSON.stringify([
  { id:'h1', clave:'MIGBD-e2-0', planKey:'MIGBD', de:30, a:60, por:'Amilkar Bolaño',
    en: new Date(Date.now() - 2 * 86400000).toISOString() },
]));
w.localStorage.setItem('timia_plan_issues', JSON.stringify([
  { id:'is1', planKey:'MIGBD', type:'bloqueante', title:'Gobierno no aprueba el diccionario',
    startDate:'2026-11-10', createdBy:'Amilkar Bolaño', createdAt:'2026-11-10T12:00:00Z',
    responsable:'Gobierno del Dato BBVA', hiloIds:['hi1'],
    impacts:[{ planKey:'MIGBD', entregableId:'e1', actIdx:1 }] },
]));
w.localStorage.setItem('timia_mail_hilos', JSON.stringify([
  { id:'hi1', planKey:'MIGBD', projectId:'MIGBD', asunto:'Aprobación del diccionario MIGBD',
    estado:'abierto', responsable:'bbva', desde:'2026-11-10', abiertoEl:'2026-11-10',
    seguimiento:[], creadoPor:'Amilkar Bolaño', creadoEn:'2026-11-10T12:00:00Z' },
]));
w.localStorage.setItem('timia_links', JSON.stringify([
  { id:'l1', projectId:'MIGBD', title:'Repositorio del proceso', url:'https://example.com/repo',
    category:'Bitbucket', descripcion:'', fecha:'2026-11-01', quien:'Amilkar' },
]));
w.localStorage.setItem('timia_kanban_tasks', JSON.stringify([
  { id:'plan-MIGBD-main-e2-0', title:'Schemas Work', description:'Plan de trabajo · Ingesta',
    priority:'Media', startDate:'2026-09-21', endDate:'2026-10-16', status:'in-progress',
    assigneeIds:[], projectId:'MIGBD', entregableId:'e2', actIdx:0, fromPlan:true, isLocked:true,
    links:[], comments:[{ id:'c1', userId:'u-santi', userName:'Santiago Coronado', userInitials:'SC',
                          userColor:'#0369a1', text:'Los schemas de Work quedaron cargados.',
                          date:'20 nov 2026' }] },
]));

const errors: string[] = [];
let failed = false;
(async () => {
  const React = (await import('react')).default;
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react');
  const auth: any = await import('../src/contexts/AuthContext.tsx');
  const PlanDeTrabajo = (await import('../src/components/PlanDeTrabajo.tsx')).default;
  const PMDashboard = (await import('../src/components/PMDashboard.tsx')).default;
  const Estimaciones = (await import('../src/components/Estimaciones.tsx')).default;
  const Bitacora = (await import('../src/components/Bitacora.tsx')).default;
  const ActivityReport = (await import('../src/components/ActivityReport.tsx')).default;
  const ProyectoTym = (await import('../src/modules/tym/ProyectoTym.tsx')).default;
  const CrearTareas = (await import('../src/modules/tym/CrearTareas.tsx')).default;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  console.error = (...a:any[]) => { const s = a.join(' '); if (!s.includes('act(')) errors.push('console.error: ' + s.slice(0,300)); };
  for (const acc of auth.MOCK_ACCOUNTS) {
    w.localStorage.setItem('timia_hub_user', JSON.stringify(acc));
    for (const [name, C, props] of [['Plan', PlanDeTrabajo, {}], ['Estim', Estimaciones, { onViewChange:()=>{}, onBack:()=>{} }], ['Tareas', Bitacora, {}], ['TR', ActivityReport, { user: acc }], ['Dash', PMDashboard, { onViewChange: () => {} }], ['TymProy', ProyectoTym, { projectId: 'MIGBD' }], ['TymTareas', CrearTareas, { projectId: 'MIGBD', onListo: () => {} }]] as any) {
      const el = w.document.createElement('div'); w.document.body.appendChild(el);
      const root = createRoot(el, { onUncaughtError: (e:any) => errors.push('uncaught: ' + (e?.stack ?? e)), onCaughtError: (e:any) => errors.push('caught: ' + (e?.stack ?? e)) } as any);
      const click = async (label: string) => {
        const btn = Array.from(el.querySelectorAll('button')).find((b:any) => b.textContent.trim().startsWith(label));
        if (!btn) return;
        await act(async () => { (btn as any).dispatchEvent(new w.MouseEvent('click', { bubbles: true })); });
      };
      try {
        await act(async () => { root.render(React.createElement(auth.AuthProvider, null, React.createElement(C, props))); });
        for (const p of ['FICO','CRONOS','NGA','FICO','General','Ver cronogramas en el tiempo','Input','FICO 2.0','Randómico','Principal','+ Bloqueante','+ Seleccionar tareas','Confirmar','+ Alerta','+ Seleccionar tareas','Cancelar','+ Cronograma','Nuevo cambio','Cargar TR','Features y horas','Nueva feature','Cumplimiento','Validación','Generar standup','Correos','Links importantes','Horas del anexo']) await click(p);
        const row = el.querySelector('tbody tr'); if (row) await act(async () => { row.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); });
        // Que la vista monte no basta: lo que se agregó tiene que estar ahí.
        const debe: Record<string, string[]> = {
          Plan: ['Correos', 'Links importantes', 'Alertas y bloqueantes', 'Aprobación del diccionario'],
          Dash: ['Generar standup', 'Bloqueantes · alertas'],
        };
        for (const t of debe[name] ?? []) {
          if (!el.innerHTML.includes(t)) errors.push(`falta en ${name}: ${t}`);
        }
        console.log(acc.role.padEnd(13), name, errors.length ? 'ERRORS' : 'OK', el.innerHTML.length);
      } catch (e:any) { errors.push('act: ' + e.stack); console.log(acc.role, name, 'THROW'); }
      if (errors.length) { failed = true; console.log(errors.map(e => e.split('\n').slice(0,6).join('\n')).join('\n---\n')); errors.length = 0; }
      root.unmount(); el.remove();
    }
  }
  process.exit(failed ? 1 : 0);
})();
