import React, { useState } from 'react';
import { X, Calendar, User, Clock, AlertTriangle, CheckCircle, TrendingUp, Users, Activity, FileText, ShieldAlert, Mail } from 'lucide-react';
import PlanDeTrabajo from './PlanDeTrabajo';
import { addWorkingDays, workingDaysBetween, formatCODate, ANS_MAX_DAYS, isHoliday, isWorkingDay } from '../utils/colombiaCalendar';
import { PROJECTS } from '../contexts/AuthContext';

// ─── Datos mock ───────────────────────────────────────────────────────────────

const PROJ_DATA = [
  { id:'FICO',     pct:62, tasks:18, done:11, risk:2,  members:['DH','JG','SR','FA'],   lead:'David Huamán', ref:'Juliana Garzón',  area:'Juan Arévalo', jira:'DECRONOS-1997', lastCommit:'2026-06-03', priority:'Alta',    startDate:'2026-01-15' },
  { id:'NGA',      pct:91, tasks:12, done:11, risk:0,  members:['JG','CS','CC','JV'],   lead:'Juliana Garzón', ref:null,             area:'Juan Arévalo', jira:'DECRONOS-1400', lastCommit:'2026-06-02', priority:'Media',   startDate:'2026-02-01' },
  { id:'CRONOS',   pct:80, tasks:22, done:18, risk:1,  members:['EB','JA2','LB','AU'],  lead:'Eric Buitrago', ref:null,             area:'Juan Arévalo', jira:'DECRONOS-1682', lastCommit:'2026-06-03', priority:'Alta',    startDate:'2026-01-10' },
  { id:'SDM1',     pct:55, tasks:14, done:8,  risk:2,  members:['OB','MM','JM','YB'],   lead:'Omar Bonilla',  ref:null,             area:'Diego Sánchez', jira:'SDM-0412',     lastCommit:'2026-06-01', priority:'Alta',    startDate:'2026-03-01' },
  { id:'SDM2',     pct:70, tasks:20, done:14, risk:1,  members:['GS','FC','JG2','JM2'], lead:'Gustavo Sandoval', ref:'Daniel Gómez', area:'Diego Sánchez', jira:'SDM-0488',   lastCommit:'2026-06-02', priority:'Media',   startDate:'2026-02-15' },
  { id:'MURIC',    pct:72, tasks:16, done:12, risk:1,  members:['EH','JJ','CG','CB'],   lead:'Edson Huerta',  ref:'Daniel Gómez',  area:'Diego Sánchez', jira:'MUR-0231',     lastCommit:'2026-06-01', priority:'Media',   startDate:'2026-02-01' },
  { id:'BCBS239',  pct:48, tasks:25, done:12, risk:3,  members:['MP','DA','YM','SS'],   lead:'Mauricio Pajoy', ref:null,            area:'Diego Sánchez', jira:'BCB-0189',     lastCommit:'2026-05-30', priority:'Crítica', startDate:'2025-11-01' },
  { id:'BRICKELL', pct:88, tasks:8,  done:7,  risk:0,  members:['EA'],                  lead:'Emanuel Arteaga', ref:null,           area:'Diego Sánchez', jira:'BRK-0044',     lastCommit:'2026-06-03', priority:'Baja',    startDate:'2026-04-01' },
  { id:'OPTIM',    pct:85, tasks:10, done:9,  risk:0,  members:['BF','PA'],             lead:'Bryan Fuertes', ref:null,             area:'David Huamán',  jira:'OPT-0055',     lastCommit:'2026-06-02', priority:'Media',   startDate:'2026-03-15' },
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
  { who:'Juan Arévalo',   action:'creó tarea',              detail:'Solicitud ACLs Live FICO Q2-II',            time:'4 h',    color:'#dc2626', initials:'JA' },
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

        {/* Jira */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#eff6ff', borderRadius:8 }}>
          <span style={{ fontSize:11, color:'#1d4ed8' }}>Jira:</span>
          <span style={{ fontSize:11, fontWeight:500, color:'#1d4ed8' }}>{proj.jira}</span>
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
  const teams = [
    { lead:'Juan Arévalo', initials:'JA', color:'#dc2626', projs:'NGA · CRONOS · FICO · PINTO · QA', n:19, pct:78 },
    { lead:'Diego Sánchez', initials:'DS', color:'#2563eb', projs:'SDM1 · SDM2 · MURIC · BRICKELL · BCBS239', n:25, pct:68 },
    { lead:'David Huamán', initials:'DH', color:'#0369a1', projs:'Optimización · Fábrica · Credicorp', n:9, pct:85 },
  ];
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        {[['50','Personas activas','#dc2626','↑ 3 este mes'],['13','Proyectos activos','#111','2 con riesgo ANS'],['74%','Avance global','#059669','Estimado: 75%'],['6','Tareas en riesgo','#d97706','De 47 en progreso']].map(([v,l,c,d])=>(
          <div key={String(l)} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
            <p style={{ margin:'0 0 2px', fontSize:22, fontWeight:500, color:String(c) }}>{v}</p>
            <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{l}</p>
            <p style={{ margin:'4px 0 0', fontSize:11, color:'#64748b' }}>{d}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize:11, fontWeight:500, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 8px' }}>Estado por equipo</p>
      {teams.map(t => (
        <div key={t.lead} style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
          <Avatar initials={t.initials} color={t.color} size={34}/>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:'0 0 1px', fontSize:12, fontWeight:500, color:'#111' }}>{t.lead}</p>
            <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{t.projs} · {t.n} personas</p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:500, color: t.pct>=80?'#059669':t.pct>=65?'#d97706':'#dc2626' }}>{t.pct}%</p>
            <div style={{ width:80, height:4, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${t.pct}%`, height:'100%', background:t.pct>=80?'#059669':t.pct>=65?'#d97706':'#dc2626' }}/>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ViewProyectos({ onSelect }: { onSelect:(p:typeof PROJ_DATA[0])=>void }) {
  return (
    <div>
      <p style={{ fontSize:11, fontWeight:500, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', margin:'0 0 10px' }}>Click en un proyecto para ver detalle</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10 }}>
        {PROJ_DATA.map(p => {
          const color = getProjectColor(p.id);
          const status = p.risk > 0 ? (p.risk > 1 ? 'riesgo' : 'alerta') : 'ok';
          return (
            <button key={p.id} onClick={()=>onSelect(p)} style={{ background:'#fff', border:`0.5px solid ${p.risk>1?'#fecaca':p.risk>0?'#fde68a':'#e2e8f0'}`, borderRadius:10, padding:12, textAlign:'left', cursor:'pointer', transition:'border .15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:500, color:'#111' }}>{p.id}</span>
                <span style={{ fontSize:11, fontWeight:500, color }}>{p.pct}%</span>
              </div>
              <div style={{ height:4, background:'#f1f5f9', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
                <div style={{ width:`${p.pct}%`, height:'100%', background:color }}/>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:status==='riesgo'?'#fef2f2':status==='alerta'?'#fefce8':'#f0fdf4', color:status==='riesgo'?'#991b1b':status==='alerta'?'#a16207':'#15803d' }}>
                  {status==='riesgo'?`⚠ ${p.risk} riesgo`:status==='alerta'?'⚠ leve':'✓ en tiempo'}
                </span>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:8, background:'#f1f5f9', color:'#64748b' }}>{p.members.length} dev</span>
              </div>
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

// ─── Standup mailer ───────────────────────────────────────────────────────────

function StandupModal({ onClose }: { onClose: () => void }) {
  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const vencidos = ANS_TASKS.filter(t => semaforo(t).remaining < 0);
  const alertas  = ANS_TASKS.filter(t => { const s = semaforo(t); return s.remaining >= 0 && s.remaining <= 1; });
  const bloqueados = PROJ_DATA.filter(p => p.risk > 0);
  const promedio = Math.round(PROJ_DATA.reduce((a, p) => a + p.pct, 0) / PROJ_DATA.length);

  const standupText = `[TIMIA HUB] Standup diario — ${today}

📊 RESUMEN GENERAL
• Avance global: ${promedio}% (${PROJ_DATA.length} proyectos activos)
• Proyectos con riesgo: ${bloqueados.length}/${PROJ_DATA.length}

${vencidos.length > 0 ? `🔴 ANS VENCIDOS (${vencidos.length})
${vencidos.map(t => `• ${t.project} — ${t.task} (${t.responsable})`).join('\n')}

` : ''}${alertas.length > 0 ? `⚠️ ANS EN ALERTA (${alertas.length})
${alertas.map(t => `• ${t.project} — ${t.task} (${t.responsable})`).join('\n')}

` : ''}📋 ESTADO POR PROYECTO
${PROJ_DATA.map(p => `• ${p.id}: ${p.pct}%${p.risk > 0 ? ` ⚠ ${p.risk} bloqueante${p.risk > 1 ? 's' : ''}` : ' ✓'}`).join('\n')}

${bloqueados.length > 0 ? `🚧 BLOQUEANTES ACTIVOS
${bloqueados.map(p => `• ${p.id} (${p.area}): ${p.risk} ítem${p.risk > 1 ? 's' : ''} bloqueado${p.risk > 1 ? 's' : ''}`).join('\n')}

` : ''}— Generado por Timia Hub · ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  const mailtoHref = `mailto:?subject=${encodeURIComponent(`[TIMIA] Standup ${today}`)}&body=${encodeURIComponent(standupText)}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Standup diario</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{today}</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
        </div>
        <div style={{ padding: '16px 22px' }}>
          <pre style={{ margin: 0, fontSize: 11, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '14px 16px', borderRadius: 10, fontFamily: 'monospace', border: '0.5px solid #e2e8f0', maxHeight: 380, overflowY: 'auto' }}>
            {standupText}
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => { navigator.clipboard?.writeText(standupText); }}
              style={{ padding: '8px 14px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: 'pointer' }}>
              Copiar
            </button>
            <a href={mailtoHref} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, background: '#dc2626', color: '#fff', borderRadius: 7, textDecoration: 'none', fontWeight: 500 }}>
              <Mail size={13}/> Abrir en correo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

type Tab = 'resumen'|'proyectos'|'equipos'|'ans'|'actividad'|'plan'|'riesgo';

const TABS: { id:Tab; label:string; icon:React.ReactNode; highlight?:boolean }[] = [
  { id:'resumen',    label:'Resumen',         icon:<TrendingUp size={13}/> },
  { id:'proyectos',  label:'Proyectos',       icon:<Activity size={13}/> },
  { id:'equipos',    label:'Equipos',         icon:<Users size={13}/> },
  { id:'ans',        label:'ANS · Alertas',   icon:<AlertTriangle size={13}/> },
  { id:'actividad',  label:'Actividad',       icon:<CheckCircle size={13}/> },
  { id:'plan',       label:'Plan de trabajo', icon:<FileText size={13}/>, highlight: true },
  { id:'riesgo',     label:'Risk Score',      icon:<ShieldAlert size={13}/> },
];

interface PMDashboardProps { onViewChange?: (v: string) => void; }

export default function PMDashboard({ onViewChange }: PMDashboardProps) {
  const [tab, setTab] = useState<Tab>('resumen');
  const [projModal, setProjModal] = useState<typeof PROJ_DATA[0]|null>(null);
  const [ansModal, setAnsModal]   = useState<typeof ANS_TASKS[0]|null>(null);
  const [showStandup, setShowStandup] = useState(false);

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: '#111' }}>Dashboard ejecutivo</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94a3b8' }}>Vista global · BBVA CO &amp; Credicorp Capital · {new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <button onClick={() => setShowStandup(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
          <Mail size={14}/> Generar standup
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'0.5px solid #e2e8f0', marginBottom:20, overflowX:'auto', alignItems:'flex-end' }}>
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

      {/* Contenido */}
      {tab==='resumen'   && <ViewResumen/>}
      {tab==='proyectos' && <ViewProyectos onSelect={setProjModal}/>}
      {tab==='equipos'   && <ViewEquipos/>}
      {tab==='ans'       && <ViewAns onSelect={setAnsModal}/>}
      {tab==='actividad' && <ViewActividad/>}
      {tab==='plan'      && <PlanDeTrabajo onGoEstimaciones={onViewChange ? () => onViewChange('estimaciones') : undefined}/>}
      {tab==='riesgo'    && <ViewRiesgo/>}

      {/* Modales */}
      {projModal    && <ProjectModal proj={projModal} onClose={()=>setProjModal(null)}/>}
      {ansModal     && <AnsModal task={ansModal} onClose={()=>setAnsModal(null)}/>}
      {showStandup  && <StandupModal onClose={() => setShowStandup(false)}/>}
    </div>
  );
}
