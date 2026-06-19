import React, { useState } from 'react';
import { X, Calendar, User, Clock, AlertTriangle, TrendingUp, Users, Activity, FileText, Mail, Copy, Check, ExternalLink, ChevronDown } from 'lucide-react';
import PlanDeTrabajo from './PlanDeTrabajo';
import { addWorkingDays, workingDaysBetween, formatCODate, ANS_MAX_DAYS, isHoliday, isWorkingDay } from '../utils/colombiaCalendar';
import { PROJECTS } from '../contexts/AuthContext';

// ─── Datos mock ───────────────────────────────────────────────────────────────

const JIRA_BASE = 'https://jira.globaldevtools.bbva.com/browse/';

const PROJ_DATA = [
  { id:'FICO',     pct:62, tasks:18, done:11, risk:2,  members:['Juan Pablo Arévalo','Juliana Garzón','Sergio David Rodriguez','Fabrizio Atiquipa'],   lead:'Juan Pablo Arévalo', ref:'Juliana Garzón',  area:'Juan Pablo Arévalo',  jira:'DECRONOS-1997', priority:'Alta',    startDate:'2026-01-15', desc:'Gobierno y calidad de datos · plataforma FICO LIVE/WORK' },
  { id:'NGA',      pct:91, tasks:12, done:11, risk:0,  members:['Juan Pablo Arévalo','Juliana Garzón','Sergio David Rodriguez','Fabrizio Atiquipa'], lead:'Juan Pablo Arévalo', ref:'Juliana Garzón', area:'Juan Pablo Arévalo',  jira:'DECRONOS-1400', priority:'Media',   startDate:'2026-02-01', desc:'Ingesta y transformación de datos NGA · ETL campos' },
  { id:'CRONOS',   pct:80, tasks:22, done:18, risk:1,  members:['Juan Pablo Arévalo','Sergio David Rodriguez','Fabrizio Atiquipa','Ana Restrepo'], lead:'Juan Pablo Arévalo', ref:null,              area:'Juan Pablo Arévalo',  jira:'DECRONOS-1682', priority:'Alta',    startDate:'2026-01-10', desc:'Reglas Hammurabi · pipeline Spark · control-m' },
  { id:'SDM1',     pct:55, tasks:14, done:8,  risk:2,  members:['Omar Bonilla','Mónica Mejía','Javier Moreno','Yurany Benavides'],          lead:'Omar Bonilla',     ref:null,              area:'Diego Sánchez', jira:'SDM-0412',     priority:'Alta',    startDate:'2026-03-01', desc:'Calidad datos SDM · entorno Work certificación' },
  { id:'SDM2',     pct:70, tasks:20, done:14, risk:1,  members:['Gustavo Sandoval','Felipe Cárdenas','Jorge Gil','Juan Muñoz'],             lead:'Gustavo Sandoval', ref:'Daniel Gómez',   area:'Diego Sánchez', jira:'SDM-0488',     priority:'Media',   startDate:'2026-02-15', desc:'Procesamiento SDM2 · reglas calidad · pruebas entorno' },
  { id:'MURIC',    pct:72, tasks:16, done:12, risk:1,  members:['Edson Huerta','Juan Jiménez','Camilo García','Carlos Bolaño'],             lead:'Edson Huerta',     ref:'Daniel Gómez',   area:'Diego Sánchez', jira:'MUR-0231',     priority:'Media',   startDate:'2026-02-01', desc:'Mutuos y recursos IC · certificación QA · ANS' },
  { id:'BCBS239',  pct:48, tasks:25, done:12, risk:3,  members:['Mauricio Pajoy','Diego Arango','Yolanda Méndez','Santiago Soto'],          lead:'Mauricio Pajoy',   ref:null,              area:'Diego Sánchez', jira:'BCB-0189',     priority:'Crítica', startDate:'2025-11-01', desc:'Regulatorio BCBS239 · despliegue Control-M producción' },
  { id:'BRICKELL', pct:88, tasks:8,  done:7,  risk:0,  members:['Emanuel Arteaga'],                                                         lead:'Emanuel Arteaga',  ref:null,              area:'Diego Sánchez', jira:'BRK-0044',     priority:'Baja',    startDate:'2026-04-01', desc:'Integración Brickell · validación campos iniciales' },
  { id:'OPTIM',    pct:85, tasks:10, done:9,  risk:0,  members:['Bryan Fuertes','Paula Andrade'],                                           lead:'Bryan Fuertes',    ref:null,              area:'David Huamán',  jira:'OPT-0055',     priority:'Media',   startDate:'2026-03-15', desc:'Optimización fábrica de datos · Credicorp capital' },
];

const ANS_TASKS = [
  { id:'a1', project:'FICO',    task:'Validación calidad datos · LIVE',           priority:'Alta',    responsable:'Juliana Garzón',    initials:'JG', color:'#0f766e', startDate:'2026-05-20', jira:'DECRONOS-1997' },
  { id:'a2', project:'BCBS239', task:'Despliegue Control-M producción',           priority:'Crítica', responsable:'Mauricio Pajoy',    initials:'MP', color:'#7e22ce', startDate:'2026-05-28', jira:'BCB-0189' },
  { id:'a3', project:'SDM1',    task:'Pruebas entorno Work · t_sdm1_output',      priority:'Alta',    responsable:'Omar Bonilla',      initials:'OB', color:'#2563eb', startDate:'2026-05-26', jira:'SDM-0412' },
  { id:'a4', project:'CRONOS',  task:'Construcción reglas Hammurabi',             priority:'Media',   responsable:'Eric Buitrago',     initials:'EB', color:'#0891b2', startDate:'2026-05-15', jira:'DECRONOS-1682' },
  { id:'a5', project:'NGA',     task:'Documentación técnica ETL campos',          priority:'Media',   responsable:'Juliana Garzón',    initials:'JG', color:'#0f766e', startDate:'2026-05-10', jira:'DECRONOS-1400' },
  { id:'a6', project:'MURIC',   task:'Certificación calidad QA',                  priority:'Baja',    responsable:'Daniel Gómez',      initials:'DG', color:'#0891b2', startDate:'2026-05-01', jira:'MUR-0231' },
];

const ACTIVITY = [
  { who:'Juliana Garzón', action:'movió a Revisión',        detail:'Construcción prediccionario · FICO',       time:'12 min', color:'#0f766e', initials:'JG' },
  { who:'Sergio Rodriguez', action:'comentó en',            detail:'Mapeo SQL t_kbrb_output · FICO',            time:'45 min', color:'#b45309', initials:'SR' },
  { who:'Sistema ANS',    action:'alertó vencimiento',      detail:'Validación calidad datos LIVE · FICO ⚠',    time:'1 h',    color:'#ef4444', initials:'⚠' },
  { who:'Eric Buitrago',  action:'completó',                detail:'Gestión repositorios Bitbucket · CRONOS',   time:'2 h',    color:'#0891b2', initials:'EB' },
  { who:'Juliana Garzón', action:'cerró',                   detail:'Despliegue esquemas Work · NGA',            time:'3 h',    color:'#0f766e', initials:'JG' },
  { who:'Juan Pablo Arévalo',   action:'creó tarea',              detail:'Solicitud ACLs Live FICO Q2-II',            time:'4 h',    color:'#7c3aed', initials:'JA' },
  { who:'Fabrizio Atiquipa', action:'subió commit',         detail:'t_kbrb_output_data_co_proactivo · FICO',   time:'ayer',   color:'#059669', initials:'FA' },
  { who:'Juliana Garzón',   action:'asignada como ref.',    detail:'Validación calidad LIVE · FICO',            time:'ayer',   color:'#0f766e', initials:'JG' },
  { who:'Daniel Gómez',     action:'asignado a',            detail:'Pruebas entorno Work · SDM2',               time:'2 días', color:'#0891b2', initials:'DG' },
];

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function getProjectColor(id: string) { return PROJECTS.find(p=>p.id===id)?.color ?? '#64748b'; }

function semaforo(task: typeof ANS_TASKS[0]) {
  const start = new Date(task.startDate);
  const max = ANS_MAX_DAYS[task.priority] ?? 5;
  const deadline = addWorkingDays(start, max);
  const today = new Date();
  const remaining = workingDaysBetween(today, deadline);
  if (remaining < 0) return { label:'Vencido', bg:'#fef2f2', text:'#dc2626', dot:'#dc2626', remaining, deadline, max };
  if (remaining <= 1) return { label:'Crítico', bg:'#fef9c3', text:'#a16207', dot:'#d97706', remaining, deadline, max };
  return { label:'En tiempo', bg:'#f0fdf4', text:'#15803d', dot:'#059669', remaining, deadline, max };
}

function Avatar({ initials, color, size=28 }: { initials:string; color:string; size?:number }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color+'20', color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:500, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose:()=>void; children:React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', position:'relative' }} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Modal Proyecto ───────────────────────────────────────────────────────────

function ProjectModal({ proj, onClose }: { proj:typeof PROJ_DATA[0]; onClose:()=>void }) {
  const color = getProjectColor(proj.id);
  const blocked = proj.tasks - proj.done - Math.floor((proj.tasks-proj.done)*0.6);
  return (
    <Modal onClose={onClose}>
      <div style={{ padding:'20px 22px', borderBottom:'0.5px solid #e2e8f0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:color+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:14, fontWeight:700, color }}>{proj.id.slice(0,2)}</span>
            </div>
            <div>
              <h3 style={{ margin:0, fontSize:16, fontWeight:500, color:'#111' }}>Proyecto {proj.id}</h3>
              <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>{proj.area}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}><X size={18}/></button>
        </div>
      </div>

      <div style={{ padding:'16px 22px' }}>
        {/* Métricas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
          {[['Total',proj.tasks,'#64748b'],['Hechas',proj.done,'#059669'],['En progreso',proj.tasks-proj.done-blocked,'#2563eb'],['Bloqueadas',blocked,'#dc2626']].map(([l,v,c])=>(
            <div key={String(l)} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
              <p style={{ margin:'0 0 2px', fontSize:20, fontWeight:500, color:String(c) }}>{v}</p>
              <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>{l}</p>
            </div>
          ))}
        </div>

        {/* Barra progreso */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>Avance general</span>
            <span style={{ fontSize:12, fontWeight:500, color }}>{proj.pct}%</span>
          </div>
          <div style={{ height:6, background:'#f1f5f9', borderRadius:6, overflow:'hidden' }}>
            <div style={{ width:`${proj.pct}%`, height:'100%', background:color, borderRadius:6, transition:'width .5s' }}/>
          </div>
        </div>

        {/* Detalles */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px' }}>
            <p style={{ margin:'0 0 4px', fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Líder de proyecto</p>
            <p style={{ margin:0, fontSize:12, fontWeight:500, color:'#111' }}>{proj.lead}</p>
          </div>
          {proj.ref && (
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px' }}>
              <p style={{ margin:'0 0 4px', fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Referente técnico</p>
              <p style={{ margin:0, fontSize:12, fontWeight:500, color:'#111' }}>{proj.ref}</p>
            </div>
          )}
          <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px' }}>
            <p style={{ margin:'0 0 4px', fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Prioridad</p>
            <p style={{ margin:0, fontSize:12, fontWeight:500, color }}>{proj.priority}</p>
          </div>
          <div style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px' }}>
            <p style={{ margin:'0 0 4px', fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Último commit</p>
            <p style={{ margin:0, fontSize:12, fontWeight:500, color:'#111' }}>{proj.lastCommit}</p>
          </div>
        </div>

        {/* Equipo completo */}
        <div style={{ marginBottom:14 }}>
          <p style={{ margin:'0 0 6px', fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Equipo del proyecto</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {proj.members.map((m,i) => (
              <span key={i} style={{ fontSize:11, padding:'3px 9px', borderRadius:8, background:'#f8fafc', color:'#374151', border:'0.5px solid #e2e8f0' }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Jira con copy */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'#eff6ff', borderRadius:8 }}>
          <span style={{ fontSize:11, color:'#1d4ed8', fontWeight:500 }}>Jira:</span>
          <CopyJira jira={proj.jira}/>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal ANS ────────────────────────────────────────────────────────────────

function AnsModal({ task, onClose }: { task:typeof ANS_TASKS[0]; onClose:()=>void }) {
  const color = task.color;
  const s = semaforo(task);
  const startDate = new Date(task.startDate);
  const elapsedDays = workingDaysBetween(startDate, new Date());
  const pctUsed = Math.min(100, Math.round((elapsedDays / s.max) * 100));

  // Mini calendario: muestra los 5 días alrededor del deadline
  const calDays: { date:Date; type:'holiday'|'weekend'|'past'|'today'|'future'|'deadline' }[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = addWorkingDays(s.deadline, i);
    const isToday = d.toDateString() === new Date().toDateString();
    const isDeadline = d.toDateString() === s.deadline.toDateString();
    const isPast = d < new Date() && !isToday;
    calDays.push({ date:d, type: isDeadline ? 'deadline' : isToday ? 'today' : isPast ? 'past' : 'future' });
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ padding:'20px 22px', borderBottom:'0.5px solid #e2e8f0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:color+'15', color, fontWeight:500 }}>{task.project}</span>
              <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:s.bg, color:s.text, fontWeight:500 }}>{s.label}</span>
            </div>
            <h3 style={{ margin:0, fontSize:14, fontWeight:500, color:'#111', lineHeight:1.4 }}>{task.task}</h3>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', color:'#94a3b8', padding:4, flexShrink:0 }}><X size={18}/></button>
        </div>
      </div>

      <div style={{ padding:'16px 22px', display:'grid', gap:12 }}>
        {/* Responsable */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f8fafc', borderRadius:10 }}>
          <User size={16} color="#94a3b8"/>
          <div>
            <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Responsable</p>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color:'#111' }}>{task.responsable}</p>
          </div>
        </div>

        {/* Fechas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <div style={{ padding:'10px 12px', background:'#f8fafc', borderRadius:10 }}>
            <p style={{ margin:'0 0 3px', fontSize:10, color:'#94a3b8', display:'flex', alignItems:'center', gap:4 }}><Calendar size={11}/>Inicio</p>
            <p style={{ margin:0, fontSize:12, fontWeight:500, color:'#111' }}>{formatCODate(startDate)}</p>
          </div>
          <div style={{ padding:'10px 12px', background:'#f8fafc', borderRadius:10 }}>
            <p style={{ margin:'0 0 3px', fontSize:10, color:'#94a3b8', display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>Máx. ANS</p>
            <p style={{ margin:0, fontSize:12, fontWeight:500, color:'#111' }}>{s.max} días hábiles</p>
          </div>
          <div style={{ padding:'10px 12px', background:s.bg, borderRadius:10 }}>
            <p style={{ margin:'0 0 3px', fontSize:10, color:s.text, display:'flex', alignItems:'center', gap:4 }}><AlertTriangle size={11}/>Vence</p>
            <p style={{ margin:0, fontSize:12, fontWeight:500, color:s.text }}>{formatCODate(s.deadline)}</p>
          </div>
        </div>

        {/* Barra consumo */}
        <div style={{ padding:'12px 14px', background:'#f8fafc', borderRadius:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:12, color:'#374151' }}>Consumo del ANS</span>
            <span style={{ fontSize:12, fontWeight:500, color:s.text }}>{pctUsed}% ({elapsedDays}/{s.max} días)</span>
          </div>
          <div style={{ height:8, background:'#e2e8f0', borderRadius:8, overflow:'hidden' }}>
            <div style={{ width:`${Math.min(pctUsed,100)}%`, height:'100%', background:s.dot, borderRadius:8, transition:'width .5s' }}/>
          </div>
          <p style={{ margin:'6px 0 0', fontSize:11, color:s.text }}>
            {s.remaining < 0 ? `Vencido hace ${Math.abs(s.remaining)} días hábiles` : s.remaining === 0 ? 'Vence hoy' : `Quedan ${s.remaining} días hábiles`}
          </p>
        </div>

        {/* Mini calendario */}
        <div>
          <p style={{ margin:'0 0 8px', fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em' }}>Línea de tiempo · calendario Colombia</p>
          <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
            {calDays.map((d,i) => {
              const isHol = isHoliday(d.date);
              const bgMap: Record<string,string> = { deadline: s.dot, today:'#1d4ed8', past:'#f1f5f9', future:'#f8fafc' };
              const txMap: Record<string,string> = { deadline:'#fff', today:'#fff', past:'#94a3b8', future:'#374151' };
              const bg = isHol ? '#fef9c3' : bgMap[d.type];
              const tx = isHol ? '#a16207' : txMap[d.type];
              return (
                <div key={i} style={{ textAlign:'center', minWidth:48 }}>
                  <div style={{ fontSize:9, color:'#94a3b8', marginBottom:3 }}>
                    {d.date.toLocaleDateString('es-CO',{weekday:'short'}).toUpperCase()}
                  </div>
                  <div style={{ width:44, height:44, borderRadius:10, background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                    <span style={{ fontSize:14, fontWeight:500, color:tx }}>{d.date.getDate()}</span>
                    {d.type==='deadline' && <span style={{ fontSize:7, color:tx, fontWeight:600 }}>LÍMITE</span>}
                    {d.type==='today' && <span style={{ fontSize:7, color:tx, fontWeight:600 }}>HOY</span>}
                    {isHol && <span style={{ fontSize:7, color:tx }}>FEST.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jira */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#eff6ff', borderRadius:8 }}>
          <span style={{ fontSize:11, color:'#1d4ed8' }}>Jira: {task.jira}</span>
        </div>
      </div>
    </Modal>
  );
}

// ─── Vistas ───────────────────────────────────────────────────────────────────

function ViewResumen() {
  const totalPct = Math.round(PROJ_DATA.reduce((a,p)=>a+p.pct,0)/PROJ_DATA.length);
  const conRiesgo = PROJ_DATA.filter(p=>p.risk>0).length;
  const criticos  = PROJ_DATA.filter(p=>p.risk>1).length;
  const totalDone = PROJ_DATA.reduce((a,p)=>a+p.done,0);
  const totalTasks = PROJ_DATA.reduce((a,p)=>a+p.tasks,0);

  const stats = [
    { v:'50',         label:'Personas activas',       sub:'↑ 3 incorporaciones este mes',          color:'#dc2626' },
    { v:String(PROJ_DATA.length), label:'Proyectos activos', sub:`${criticos} con bloqueantes · ${conRiesgo} en alerta`, color:'#111' },
    { v:`${totalPct}%`, label:'Avance global promedio', sub:`${totalDone} de ${totalTasks} tareas completadas`, color:'#059669' },
    { v:String(ANS_TASKS.filter(t=>semaforo(t).remaining<0).length + ANS_TASKS.filter(t=>{const s=semaforo(t); return s.remaining>=0&&s.remaining<=1;}).length),
      label:'Tareas ANS en riesgo', sub:`${ANS_TASKS.filter(t=>semaforo(t).remaining<0).length} vencidas · ${ANS_TASKS.filter(t=>{const s=semaforo(t);return s.remaining>=0&&s.remaining<=1;}).length} por vencer`,
      color:'#d97706' },
  ];

  const teams = [
    { lead:'Juan Pablo Arévalo', initials:'JA', color:'#7c3aed',
      projs: PROJ_DATA.filter(p=>p.area==='Juan Pablo Arévalo'),
      note: 'FICO · NGA · CRONOS · PINTO · QA' },
    { lead:'Diego Sánchez', initials:'DS', color:'#2563eb',
      projs: PROJ_DATA.filter(p=>p.area==='Diego Sánchez'),
      note: 'SDM1 · SDM2 · MURIC · BCBS239 · BRICKELL' },
    { lead:'David Huamán', initials:'DH', color:'#0369a1',
      projs: PROJ_DATA.filter(p=>p.area==='David Huamán'),
      note: 'OPTIM · Fábrica · Credicorp' },
  ];

  return (
    <div>
      {/* KPIs principales */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'14px 16px' }}>
            <p style={{ margin:'0 0 2px', fontSize:24, fontWeight:500, color:s.color, lineHeight:1 }}>{s.v}</p>
            <p style={{ margin:'4px 0 2px', fontSize:12, fontWeight:500, color:'#374151' }}>{s.label}</p>
            <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Avance por equipo */}
      <p style={{ fontSize:11, fontWeight:500, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Avance por área técnica</p>
      {teams.map(t => {
        const pct = t.projs.length > 0 ? Math.round(t.projs.reduce((a,p)=>a+p.pct,0)/t.projs.length) : 0;
        const personas = t.projs.reduce((a,p)=>a+p.members.length,0);
        return (
          <div key={t.lead} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'14px 16px', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Avatar initials={t.initials} color={t.color} size={36}/>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:'0 0 2px', fontSize:13, fontWeight:500, color:'#111' }}>{t.lead}</p>
                <p style={{ margin:'0 0 6px', fontSize:11, color:'#94a3b8' }}>{t.note} · {personas} personas · {t.projs.length} proyectos</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {t.projs.map(p => (
                    <span key={p.id} style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:p.risk>1?'#fef2f2':p.risk>0?'#fef9c3':'#f0fdf4', color:p.risk>1?'#991b1b':p.risk>0?'#a16207':'#15803d', fontWeight:500 }}>
                      {p.id} {p.pct}%
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0, minWidth:90 }}>
                <p style={{ margin:'0 0 5px', fontSize:15, fontWeight:500, color:pct>=80?'#059669':pct>=65?'#d97706':'#dc2626' }}>{pct}% prom.</p>
                <div style={{ width:90, height:5, background:'#f1f5f9', borderRadius:5, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:pct>=80?'#059669':pct>=65?'#d97706':'#dc2626', borderRadius:5 }}/>
                </div>
                <p style={{ margin:'4px 0 0', fontSize:10, color:'#94a3b8' }}>% tareas completadas</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CopyJira({ jira }: { jira: string }) {
  const [copied, setCopied] = useState(false);
  const url = JIRA_BASE + jira;
  function doCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(url).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }} onClick={e=>e.stopPropagation()}>
      <a href={url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
        style={{ fontSize:11, color:'#1d4ed8', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
        {jira} <ExternalLink size={10}/>
      </a>
      <button onClick={doCopy} title="Copiar URL Jira"
        style={{ border:'none', background:'none', cursor:'pointer', color:copied?'#059669':'#94a3b8', padding:2, display:'flex' }}>
        {copied ? <Check size={11}/> : <Copy size={11}/>}
      </button>
    </div>
  );
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  Crítica: { bg:'#fef2f2', color:'#991b1b' },
  Alta:    { bg:'#fef9c3', color:'#a16207' },
  Media:   { bg:'#eff6ff', color:'#1d4ed8' },
  Baja:    { bg:'#f0fdf4', color:'#15803d' },
};

function ViewProyectos({ onSelect }: { onSelect:(p:typeof PROJ_DATA[0])=>void }) {
  const [filterArea, setFilterArea] = useState('');
  const filtered = filterArea ? PROJ_DATA.filter(p=>p.area===filterArea) : PROJ_DATA;
  const areas = Array.from(new Set(PROJ_DATA.map(p=>p.area)));

  return (
    <div>
      {/* Filtro por área */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>Filtrar por área:</span>
        {['', ...areas].map(a => (
          <button key={a||'all'} onClick={()=>setFilterArea(a)}
            style={{ fontSize:11, padding:'3px 10px', borderRadius:6, border:'0.5px solid', cursor:'pointer',
              borderColor: filterArea===a ? '#dc2626':'#e2e8f0',
              background: filterArea===a ? '#fef2f2':'#fff',
              color: filterArea===a ? '#dc2626':'#64748b',
              fontWeight: filterArea===a ? 600 : 400 }}>
            {a || 'Todos'}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(310px, 1fr))', gap:12 }}>
        {filtered.map(p => {
          const color = getProjectColor(p.id);
          const ps = PRIORITY_STYLE[p.priority] ?? PRIORITY_STYLE.Media;
          return (
            <button key={p.id} onClick={()=>onSelect(p)} style={{
              background:'#fff', border:`0.5px solid ${p.risk>1?'#fecaca':p.risk>0?'#fde68a':'#e2e8f0'}`,
              borderRadius:12, padding:'14px 16px', textAlign:'left', cursor:'pointer',
              transition:'box-shadow .15s', boxShadow:'0 1px 3px rgba(0,0,0,.04)',
            }}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:11, fontWeight:700, color }}>{p.id.slice(0,2)}</span>
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#111' }}>{p.id}</p>
                    <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>{p.area}</p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:ps.bg, color:ps.color, fontWeight:600 }}>{p.priority}</span>
                  <span style={{ fontSize:14, fontWeight:600, color }}>{p.pct}%</span>
                </div>
              </div>

              {/* Descripción */}
              <p style={{ margin:'0 0 8px', fontSize:11, color:'#64748b', lineHeight:1.4 }}>{p.desc}</p>

              {/* Barra progreso */}
              <div style={{ height:5, background:'#f1f5f9', borderRadius:5, overflow:'hidden', marginBottom:10 }}>
                <div style={{ width:`${p.pct}%`, height:'100%', background:color, borderRadius:5 }}/>
              </div>

              {/* Personas */}
              <div style={{ marginBottom:10 }}>
                <p style={{ margin:'0 0 4px', fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em' }}>Equipo</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {p.members.map((m,i) => (
                    <span key={i} style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'#f8fafc', color:'#374151', border:'0.5px solid #e2e8f0' }}>
                      {m.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: líder + Jira + estado */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'0.5px solid #f1f5f9' }}>
                <div style={{ fontSize:10, color:'#64748b' }}>
                  <span style={{ color:'#94a3b8' }}>Líder: </span>{p.lead.split(' ')[0]}
                  {p.ref && <span> · <span style={{ color:'#94a3b8' }}>Ref: </span>{p.ref.split(' ')[0]}</span>}
                </div>
                <div onClick={e=>e.stopPropagation()}>
                  <CopyJira jira={p.jira}/>
                </div>
              </div>

              {/* Estado riesgo */}
              {p.risk > 0 && (
                <div style={{ marginTop:8, padding:'5px 8px', borderRadius:6, background:p.risk>1?'#fef2f2':'#fef9c3', display:'flex', alignItems:'center', gap:5 }}>
                  <AlertTriangle size={11} color={p.risk>1?'#dc2626':'#d97706'}/>
                  <span style={{ fontSize:10, color:p.risk>1?'#991b1b':'#a16207', fontWeight:500 }}>
                    {p.risk} bloqueante{p.risk>1?'s':''} activo{p.risk>1?'s':''}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ViewEquipos() {
  const rows = [
    { name:'Juliana Garzón',    ini:'JG', color:'#0f766e', proj:'FICO',    role:'Ref. Técnico', task:'Construcción prediccionario',   status:'En progreso', ans:'⚠' },
    { name:'Sergio Rodriguez',  ini:'SR', color:'#b45309', proj:'FICO',    role:'Desarrollador', task:'Mapeo SQL → t_kbrb_output',    status:'En progreso', ans:'✓' },
    { name:'Fabrizio Atiquipa', ini:'FA', color:'#059669', proj:'FICO',    role:'Desarrollador', task:'Reglas Hammurabi calidad',     status:'Revisión',    ans:'✓' },
    { name:'Eric Buitrago',     ini:'EB', color:'#0891b2', proj:'CRONOS',  role:'Desarrollador', task:'Procesamiento Spark pipeline', status:'En progreso', ans:'✓' },
    { name:'Daniel Gómez',      ini:'DG', color:'#0891b2', proj:'SDM2',    role:'Ref. Técnico',  task:'Pruebas entorno Work',         status:'En progreso', ans:'⚠' },
    { name:'Juliana Garzón',    ini:'JG', color:'#0f766e', proj:'NGA',     role:'Líder Proy.',   task:'Documentación técnica ETL',    status:'Revisión',    ans:'✓' },
  ];
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'160px 100px 1fr 90px 40px', gap:8, padding:'5px 10px', fontSize:10, color:'#94a3b8', fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>
        <span>Persona</span><span>Rol</span><span>Tarea activa</span><span style={{textAlign:'center'}}>Estado</span><span style={{textAlign:'center'}}>ANS</span>
      </div>
      {rows.map(r => (
        <div key={r.name} style={{ display:'grid', gridTemplateColumns:'160px 100px 1fr 90px 40px', gap:8, alignItems:'center', padding:'9px 10px', background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, marginBottom:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <Avatar initials={r.ini} color={r.color} size={26}/>
            <div>
              <p style={{ margin:0, fontSize:11, fontWeight:500, color:'#111', lineHeight:1.2 }}>{r.name.split(' ')[0]}</p>
              <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>{r.proj}</p>
            </div>
          </div>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:r.role.includes('Ref')?'#eff6ff':r.role.includes('Líder')?'#f0fdf4':'#f8fafc', color:r.role.includes('Ref')?'#1d4ed8':r.role.includes('Líder')?'#15803d':'#64748b', display:'inline-block' }}>{r.role}</span>
          <span style={{ fontSize:11, color:'#374151' }}>{r.task}</span>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:r.status==='Revisión'?'#eff6ff':'#fef2f2', color:r.status==='Revisión'?'#1d4ed8':'#dc2626', textAlign:'center' }}>{r.status}</span>
          <span style={{ textAlign:'center', fontSize:14, color:r.ans==='✓'?'#059669':'#d97706' }}>{r.ans}</span>
        </div>
      ))}
    </div>
  );
}

function ViewAns({ onSelect }: { onSelect:(t:typeof ANS_TASKS[0])=>void }) {
  return (
    <div>
      <p style={{ fontSize:11, fontWeight:500, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Click en una fila para ver detalle con calendario Colombia</p>
      <div style={{ display:'grid', gridTemplateColumns:'110px 1fr 60px 90px 52px', gap:8, padding:'5px 12px', fontSize:10, color:'#94a3b8', fontWeight:500, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>
        <span>Proyecto</span><span>Tarea</span><span style={{textAlign:'center'}}>Días</span><span>ANS</span><span style={{textAlign:'center'}}>Estado</span>
      </div>
      {ANS_TASKS.map(t => {
        const s = semaforo(t);
        const pct = Math.min(100, Math.round((workingDaysBetween(new Date(t.startDate), new Date()) / s.max)*100));
        return (
          <button key={t.id} onClick={()=>onSelect(t)} style={{ display:'grid', gridTemplateColumns:'110px 1fr 60px 90px 52px', gap:8, alignItems:'center', padding:'9px 12px', background:'#fff', border:`0.5px solid ${s.dot==='#dc2626'?'#fecaca':s.dot==='#d97706'?'#fde68a':'#e2e8f0'}`, borderRadius:10, marginBottom:6, width:'100%', textAlign:'left', cursor:'pointer', transition:'box-shadow .15s' }}>
            <span style={{ fontSize:12, fontWeight:500, color:'#111' }}>{t.project}</span>
            <span style={{ fontSize:11, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.task}</span>
            <span style={{ fontSize:11, color:s.text, textAlign:'center', fontWeight:500 }}>{s.remaining < 0 ? `${s.remaining}` : `+${s.remaining}`}</span>
            <div style={{ height:4, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${pct}%`, height:'100%', background:s.dot }}/>
            </div>
            <div style={{ textAlign:'center' }}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:s.bg, color:s.text, fontSize:9, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                {s.remaining < 0 ? '✕' : s.remaining <= 1 ? '!' : '✓'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ViewActividad() {
  return (
    <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
      {ACTIVITY.map((a,i) => (
        <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom: i<ACTIVITY.length-1 ? '0.5px solid #f1f5f9' : 'none' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:a.color, flexShrink:0, marginTop:5 }}/>
          <div>
            <p style={{ margin:0, fontSize:12, color:'#374151', lineHeight:1.5 }}><strong>{a.who}</strong> {a.action} <span style={{ color:'#64748b' }}>{a.detail}</span></p>
            <p style={{ margin:'2px 0 0', fontSize:10, color:'#94a3b8' }}>Hace {a.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Risk Score ───────────────────────────────────────────────────────────────
// Modelo EVM-inspirado (PMI PMBOK): SPI analogue + ANS health + impedimentos + velocidad

function calcRiskScore(proj: typeof PROJ_DATA[0]) {
  const today = new Date();

  // 1. Schedule performance (35%) — retraso real vs esperado por tiempo transcurrido
  const startDate = new Date(proj.startDate);
  const daysSinceStart = Math.max(0, (today.getTime() - startDate.getTime()) / 86400000);
  const projectDuration = 180; // duración asumida ~6 meses
  const pctExpected = Math.min(100, (daysSinceStart / projectDuration) * 100);
  const scheduleDelay = Math.max(0, pctExpected - proj.pct);
  const scheduleSc = Math.min(100, scheduleDelay * 1.8);

  // 2. ANS health (30%) — tareas vencidas / en alerta
  const projAns = ANS_TASKS.filter(t => t.project === proj.id);
  let vencidas = 0; let warnings = 0;
  projAns.forEach(t => {
    const s = semaforo(t);
    if (s.remaining < 0) vencidas++;
    else if (s.remaining <= 1) warnings++;
  });
  const ansSc = Math.min(100, vencidas * 50 + warnings * 20);

  // 3. Impedimentos (20%) — bloqueantes activos
  const blockSc = Math.min(100, proj.risk * 34);

  // 4. Inactividad (15%) — días sin commit
  const lastCommit = new Date(proj.lastCommit);
  const daysSinceCommit = Math.max(0, (today.getTime() - lastCommit.getTime()) / 86400000);
  const inactivitySc = Math.min(100, daysSinceCommit * 14);

  // Score ponderado
  const raw = scheduleSc * 0.35 + ansSc * 0.30 + blockSc * 0.20 + inactivitySc * 0.15;

  // Multiplicador de prioridad (proyectos críticos amplifican el riesgo)
  const mult: Record<string, number> = { Crítica: 1.30, Alta: 1.10, Media: 1.00, Baja: 0.80 };
  const score = Math.round(Math.min(100, raw * (mult[proj.priority] ?? 1.0)));

  const level   = score >= 70 ? 'CRÍTICO' : score >= 45 ? 'ALTO' : score >= 20 ? 'MEDIO' : 'BAJO';
  const lvColor = score >= 70 ? '#dc2626' : score >= 45 ? '#d97706' : score >= 20 ? '#2563eb' : '#059669';
  const lvBg    = score >= 70 ? '#fef2f2' : score >= 45 ? '#fef9c3' : score >= 20 ? '#eff6ff' : '#f0fdf4';

  return {
    score, level, lvColor, lvBg,
    spi: pctExpected, // expected %
    components: {
      schedule:   { sc: Math.round(scheduleSc), label: `Retraso ${scheduleDelay.toFixed(0)}%`,       w: 35 },
      ans:        { sc: Math.round(ansSc),       label: `${vencidas} venc. · ${warnings} alerta`,    w: 30 },
      blockers:   { sc: Math.round(blockSc),     label: `${proj.risk} bloqueante${proj.risk!==1?'s':''}`, w: 20 },
      inactivity: { sc: Math.round(inactivitySc),label: `${Math.round(daysSinceCommit)}d sin commit`,w: 15 },
    },
  };
}

function ViewRiesgo() {
  const scored = PROJ_DATA.map(p => ({ proj: p, ...calcRiskScore(p) }))
    .sort((a, b) => b.score - a.score);

  const criticos = scored.filter(s => s.score >= 70).length;
  const altos = scored.filter(s => s.score >= 45 && s.score < 70).length;

  return (
    <div>
      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {criticos > 0 && (
          <div style={{ padding: '8px 16px', background: '#fef2f2', borderRadius: 10, border: '0.5px solid #fecaca' }}>
            <span style={{ fontSize: 20, fontWeight: 500, color: '#dc2626' }}>{criticos}</span>
            <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 6 }}>proyecto{criticos>1?'s':''} CRÍTICO{criticos>1?'S':''}</span>
          </div>
        )}
        {altos > 0 && (
          <div style={{ padding: '8px 16px', background: '#fef9c3', borderRadius: 10, border: '0.5px solid #fde68a' }}>
            <span style={{ fontSize: 20, fontWeight: 500, color: '#d97706' }}>{altos}</span>
            <span style={{ fontSize: 11, color: '#d97706', marginLeft: 6 }}>ALTO riesgo</span>
          </div>
        )}
        <div style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: 10, border: '0.5px solid #e2e8f0', marginLeft: 'auto' }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>Modelo: SPI + ANS + Impedimentos + Inactividad (ponderación PMI)</span>
        </div>
      </div>

      {/* Tabla de riesgos */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 80px 70px 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 16px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', fontSize: 10, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          <span>Proyecto</span><span>Score</span><span>Nivel</span>
          <span>Cronograma (35%)</span><span>ANS (30%)</span><span>Bloqueantes (20%)</span><span>Inactividad (15%)</span>
        </div>
        {scored.map((s, i) => {
          const color = getProjectColor(s.proj.id);
          return (
            <div key={s.proj.id} style={{ display: 'grid', gridTemplateColumns: '70px 80px 70px 1fr 1fr 1fr 1fr', gap: 8, alignItems: 'center', padding: '13px 16px', borderBottom: i < scored.length-1 ? '0.5px solid #f1f5f9' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafe' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{s.proj.id}</span>
              {/* Score gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 36, height: 36 }}>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="4"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke={s.lvColor} strokeWidth="4"
                      strokeDasharray={`${s.score * 0.88} 88`} strokeLinecap="round"/>
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: s.lvColor }}>{s.score}</span>
                </div>
                <span style={{ fontSize: 11, color: '#374151' }}>{s.proj.priority}</span>
              </div>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 8, background: s.lvBg, color: s.lvColor, fontWeight: 600, display: 'inline-block' }}>{s.level}</span>
              {/* Componentes */}
              {([
                s.components.schedule,
                s.components.ans,
                s.components.blockers,
                s.components.inactivity,
              ] as { sc: number; label: string; w: number }[]).map((c, ci) => (
                <div key={ci}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{c.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: c.sc >= 70 ? '#dc2626' : c.sc >= 40 ? '#d97706' : '#94a3b8' }}>{c.sc}</span>
                  </div>
                  <div style={{ height: 3, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${c.sc}%`, height: '100%', background: c.sc >= 70 ? '#dc2626' : c.sc >= 40 ? '#d97706' : '#059669' }}/>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8' }}>
        ⓘ Fórmula: Score = (Retraso×35% + ANS×30% + Bloqueantes×20% + Inactividad×15%) × Multiplicador prioridad (Crítica:1.3× · Alta:1.1× · Media:1.0× · Baja:0.8×)
      </p>
    </div>
  );
}

// ─── Standup mailer (redesign PM-pro) ────────────────────────────────────────

function StandupModal({ onClose }: { onClose: () => void }) {
  const [scope, setScope] = useState<'all' | string>('all');
  const [copied, setCopied] = useState(false);

  const today    = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayFmt = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
  const hour     = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });

  const scopeProjs = scope === 'all' ? PROJ_DATA : PROJ_DATA.filter(p => p.id === scope);
  const scopeAns   = scope === 'all' ? ANS_TASKS  : ANS_TASKS.filter(t => t.project === scope);

  const vencidos    = scopeAns.filter(t => semaforo(t).remaining < 0);
  const alertasAns  = scopeAns.filter(t => { const s = semaforo(t); return s.remaining >= 0 && s.remaining <= 1; });
  const bloqueados  = scopeProjs.filter(p => p.risk > 0);
  const promedio    = scopeProjs.length > 0 ? Math.round(scopeProjs.reduce((a,p)=>a+p.pct,0)/scopeProjs.length) : 0;

  const scopeName = scope === 'all' ? 'Todos los proyectos' : `Proyecto ${scope}`;
  const proj1 = scope !== 'all' ? PROJ_DATA.find(p=>p.id===scope) : null;

  const standupText =
`[TIMIA HUB] Standup · ${todayFmt} — ${scopeName}
──────────────────────────────────────────────

📊 RESUMEN EJECUTIVO
  Avance ${scope==='all'?'global promedio':'del proyecto'}: ${promedio}%
  Proyectos / alcance: ${scopeProjs.length}${scope==='all'?' activos':''}
  Tareas con riesgo ANS: ${vencidos.length} vencidas · ${alertasAns.length} por vencer
  Bloqueantes activos: ${bloqueados.length}

${vencidos.length > 0 ? `🔴 ANS VENCIDOS (${vencidos.length})
${vencidos.map(t=>`  • [${t.project}] ${t.task}\n    → ${t.responsable} · Jira: ${t.jira}`).join('\n\n')}

` : ''}${alertasAns.length > 0 ? `⚠️  ANS EN ALERTA (${alertasAns.length})
${alertasAns.map(t=>`  • [${t.project}] ${t.task}\n    → ${t.responsable} · Jira: ${t.jira}`).join('\n\n')}

` : ''}📋 ESTADO POR PROYECTO
${scopeProjs.map(p=>`  ${p.risk>1?'🔴':p.risk>0?'🟡':'🟢'} ${p.id.padEnd(10)} ${String(p.pct).padStart(3)}%  ${p.risk>0?`⚠ ${p.risk} bloqueante${p.risk>1?'s':''}`:' ✓ En tiempo'}  ·  Líder: ${p.lead.split(' ')[0]}`).join('\n')}

${bloqueados.length > 0 ? `🚧 ACCIONES REQUERIDAS
${bloqueados.map(p=>`  • ${p.id}: ${p.risk} bloqueante${p.risk>1?'s':''} — escalar con ${p.area}`).join('\n')}

` : ''}──────────────────────────────────────────────
Generado por Timia Hub · ${hour} · ${today}`;

  const mailtoHref = `mailto:?subject=${encodeURIComponent(`[TIMIA] Standup ${todayFmt}${scope!=='all'?' — '+scope:''}`)}&body=${encodeURIComponent(standupText)}`;

  function doCopy() {
    navigator.clipboard?.writeText(standupText).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false), 2500);
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:1040, maxHeight:'94vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,.22)' }} onClick={e=>e.stopPropagation()}>

        {/* Header gradient */}
        <div style={{ background:'linear-gradient(135deg,#0f172a,#1e293b)', padding:'18px 28px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#dc2626' }}/>
              <span style={{ fontSize:10, color:'#94a3b8', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase' }}>TIMIA HUB · Status Report</span>
            </div>
            <button onClick={onClose} style={{ border:'none', background:'rgba(255,255,255,.1)', cursor:'pointer', color:'#94a3b8', padding:'5px 8px', borderRadius:8, display:'flex' }}>
              <X size={15}/>
            </button>
          </div>
          {/* KPIs row */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {[
              { v:`${promedio}%`, l:'Avance global',   c:'#34d399' },
              { v:String(scopeProjs.length), l:'Proyectos', c:'#60a5fa' },
              { v:String(vencidos.length),   l:'ANS vencidos', c:vencidos.length>0?'#f87171':'#34d399' },
              { v:String(alertasAns.length), l:'ANS en alerta', c:alertasAns.length>0?'#fbbf24':'#34d399' },
              { v:String(bloqueados.length), l:'Bloqueantes', c:bloqueados.length>0?'#fbbf24':'#34d399' },
            ].map(k => (
              <div key={k.l} style={{ background:'rgba(255,255,255,.07)', borderRadius:10, padding:'8px 14px', flex:1 }}>
                <p style={{ margin:0, fontSize:20, fontWeight:700, color:k.c, lineHeight:1 }}>{k.v}</p>
                <p style={{ margin:'3px 0 0', fontSize:9, color:'#64748b', textTransform:'uppercase', letterSpacing:'.05em' }}>{k.l}</p>
              </div>
            ))}
            {/* Scope filter */}
            <div style={{ marginLeft:8 }}>
              <select value={scope} onChange={e=>setScope(e.target.value)}
                style={{ fontSize:11, padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)',
                  background:'rgba(255,255,255,.08)', color:'#e2e8f0', cursor:'pointer', outline:'none' }}>
                <option value="all" style={{background:'#1e293b'}}>Todos los proyectos</option>
                {PROJ_DATA.map(p=><option key={p.id} value={p.id} style={{background:'#1e293b'}}>{p.id}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Body — 2 columns */}
        <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* LEFT: Visual status cards */}
          <div style={{ flex:'0 0 420px', overflowY:'auto', padding:'18px 20px', borderRight:'1px solid #f1f5f9' }}>

            {/* Projects */}
            <p style={{ margin:'0 0 8px', fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em' }}>Estado por proyecto</p>
            <div style={{ display:'grid', gap:5, marginBottom:16 }}>
              {scopeProjs.map(p => {
                const c = getProjectColor(p.id);
                const riskLvl = p.risk > 1 ? 'high' : p.risk > 0 ? 'med' : 'ok';
                return (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'#fff', borderRadius:10,
                    border:`1px solid ${riskLvl==='high'?'#fecaca':riskLvl==='med'?'#fde68a':'#e2e8f0'}`,
                    boxShadow: riskLvl!=='ok' ? `0 0 0 3px ${riskLvl==='high'?'#fef2f2':'#fffbeb'}` : 'none' }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:c+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:9, fontWeight:800, color:c }}>{p.id.slice(0,3)}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#111' }}>{p.id}</span>
                        <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:PRIORITY_STYLE[p.priority]?.bg, color:PRIORITY_STYLE[p.priority]?.color }}>{p.priority}</span>
                        {p.risk > 0 && <span style={{ fontSize:9, fontWeight:600, color:p.risk>1?'#dc2626':'#d97706', background:p.risk>1?'#fef2f2':'#fffbeb', padding:'1px 5px', borderRadius:4 }}>⚠ {p.risk} bloq.</span>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ flex:1, height:4, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ width:`${p.pct}%`, height:'100%', background:c, borderRadius:4, transition:'width .3s' }}/>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:c, minWidth:32, textAlign:'right' }}>{p.pct}%</span>
                      </div>
                      <p style={{ margin:'2px 0 0', fontSize:9, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Alerts & Blockers — always visible */}
            {(vencidos.length > 0 || alertasAns.length > 0 || bloqueados.length > 0) && (
              <div>
                {vencidos.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <p style={{ margin:'0 0 5px', fontSize:10, color:'#dc2626', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>🔴 ANS Vencidos ({vencidos.length})</p>
                    {vencidos.map(t => (
                      <div key={t.id} style={{ display:'flex', gap:8, padding:'7px 10px', marginBottom:3, background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#991b1b' }}>[{t.project}] {t.task}</p>
                          <p style={{ margin:0, fontSize:10, color:'#dc2626' }}>→ {t.responsable} · {t.jira}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {alertasAns.length > 0 && (
                  <div style={{ marginBottom:10 }}>
                    <p style={{ margin:'0 0 5px', fontSize:10, color:'#b45309', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>⚠️ ANS En alerta ({alertasAns.length})</p>
                    {alertasAns.map(t => (
                      <div key={t.id} style={{ display:'flex', gap:8, padding:'7px 10px', marginBottom:3, background:'#fffbeb', borderRadius:8, border:'1px solid #fde68a' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#92400e' }}>[{t.project}] {t.task}</p>
                          <p style={{ margin:0, fontSize:10, color:'#b45309' }}>→ {t.responsable} · {t.jira}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {bloqueados.length > 0 && (
                  <div>
                    <p style={{ margin:'0 0 5px', fontSize:10, color:'#7c3aed', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>🚧 Acciones requeridas</p>
                    {bloqueados.map(p => (
                      <div key={p.id} style={{ padding:'7px 10px', marginBottom:3, background:'#faf5ff', borderRadius:8, border:'1px solid #ede9fe' }}>
                        <p style={{ margin:0, fontSize:11, fontWeight:600, color:'#6d28d9' }}>• {p.id}: {p.risk} bloqueante{p.risk>1?'s':''} — escalar con {p.area}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Corporate email preview */}
          <div style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column' }}>
            <p style={{ margin:'0 0 10px', fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em' }}>Vista de correo corporativo</p>

            {/* Email shell */}
            <div style={{ flex:1, background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column' }}>
              {/* Email header bar */}
              <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'10px 16px' }}>
                <div style={{ display:'grid', gap:4 }}>
                  {[
                    { l:'De:', v:'Timia Hub <noreply@timia.ai>' },
                    { l:'Para:', v:'equipo.tecnico@timia.ai; liderazgo@timia.ai' },
                    { l:'Asunto:', v:`[TIMIA STATUS] Reporte diario — ${todayFmt}${scope!=='all'?' · '+scope:''}` },
                    { l:'Fecha:', v:`${today}, ${hour}` },
                  ].map(f => (
                    <div key={f.l} style={{ display:'flex', gap:8, fontSize:11 }}>
                      <span style={{ color:'#94a3b8', minWidth:52, flexShrink:0 }}>{f.l}</span>
                      <span style={{ color:'#374151', fontWeight: f.l==='Asunto:'?600:400 }}>{f.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email body */}
              <div style={{ flex:1, overflowY:'auto' }}>
                <pre style={{ margin:0, fontSize:10.5, color:'#1e293b', lineHeight:1.75, whiteSpace:'pre-wrap',
                  padding:'16px 20px', fontFamily:"'Courier New',Courier,monospace", background:'transparent' }}>
                  {standupText}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12, flexShrink:0 }}>
              <button onClick={doCopy}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 16px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:9, background:'#fff', cursor:'pointer', color:copied?'#059669':'#374151', fontWeight:500, transition:'all .15s' }}>
                {copied ? <Check size={13}/> : <Copy size={13}/>}
                {copied ? '¡Copiado!' : 'Copiar texto'}
              </button>
              <a href={mailtoHref} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', fontSize:12, background:'#dc2626', color:'#fff', borderRadius:9, textDecoration:'none', fontWeight:700 }}>
                <Mail size={13}/> Enviar por correo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

type Tab = 'proyectos'|'plan';

const TABS: { id:Tab; label:string; icon:React.ReactNode; highlight?:boolean }[] = [
  { id:'proyectos',  label:'Proyectos',       icon:<Activity size={13}/> },
  { id:'plan',       label:'Plan de trabajo', icon:<FileText size={13}/>, highlight: true },
];

type PMView = 'setup-project' | 'estimaciones' | 'plan-trabajo' | 'admin' | 'bitacora' | 'analytics';
interface PMDashboardProps { onViewChange?: (v: PMView) => void; }

export default function PMDashboard({ onViewChange }: PMDashboardProps) {
  const [tab, setTab] = useState<Tab>('proyectos');
  const [projModal, setProjModal] = useState<typeof PROJ_DATA[0]|null>(null);
  const [showStandup, setShowStandup] = useState(false);

  return (
    <div id="pm-dashboard-root" style={{ padding: '28px 36px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div data-print-hide style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#111' }}>Dashboard ejecutivo</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94a3b8' }}>Vista global · BBVA CO &amp; Credicorp Capital · {new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {onViewChange && (
            <button onClick={() => onViewChange('setup-project')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', background:'#f0fdf4', color:'#15803d', border:'0.5px solid #bbf7d0', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuevo proyecto
            </button>
          )}
          <button onClick={() => setShowStandup(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
            <Mail size={14}/> Generar standup
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div data-print-hide style={{ display:'flex', gap:4, borderBottom:'0.5px solid #e2e8f0', marginBottom:20, overflowX:'auto', alignItems:'flex-end' }}>
        {TABS.map(t => {
          const isActive = tab === t.id;
          const isHighlight = t.highlight;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:'flex', alignItems:'center', gap:5,
              padding: isHighlight ? '9px 18px' : '8px 14px',
              fontSize: isHighlight ? 13 : 12,
              fontWeight: isActive ? 600 : isHighlight ? 500 : 400,
              color: isActive ? '#dc2626' : isHighlight ? '#0d9488' : '#64748b',
              background: isHighlight && !isActive ? '#f0fdfa' : 'none',
              border: 'none',
              borderBottom: isActive ? '2px solid #dc2626' : isHighlight ? '2px solid #0d9488' : '2px solid transparent',
              borderRadius: isHighlight && !isActive ? '6px 6px 0 0' : undefined,
              cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s',
            }}>
              {t.icon}{t.label}
              {isHighlight && !isActive && <span style={{ fontSize:9, padding:'1px 5px', borderRadius:8, background:'#0d948820', color:'#0d9488', fontWeight:600, marginLeft:2 }}>FICO listo</span>}
            </button>
          );
        })}
      </div>

      {/* KPIs + áreas técnicas — siempre visibles */}
      <ViewResumen/>

      {/* Contenido de pestañas */}
      {tab==='proyectos' && <ViewProyectos onSelect={setProjModal}/>}
      {tab==='plan'      && <PlanDeTrabajo onGoEstimaciones={onViewChange ? () => onViewChange('estimaciones') : undefined}/>}

      {/* Modales */}
      {projModal    && <ProjectModal proj={projModal} onClose={()=>setProjModal(null)}/>}
      {showStandup  && <StandupModal onClose={() => setShowStandup(false)}/>}
    </div>
  );
}
