// Editar una alerta o un bloqueante ya registrado.
//
// Antes solo se podía resolver, reabrir o borrar. Si la tarea impactada estaba
// mal —o aparecía otra— había que borrar y volver a crear, y eso pierde quién
// la abrió y cuándo, que es justo lo que se mira después.

import { readFileSync } from 'node:fs';
import { aplicarEdicionIssue, issueImpacts, type PlanIssue, type PlanImpact } from '../src/lib/adminStore';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const imp = (act: number): PlanImpact => ({ planKey: 'MIGBD', entregableId: 'documentaci-n-', actIdx: act });

const base: PlanIssue = {
  id: 'is-1', planKey: 'MIGBD', type: 'alerta',
  title: 'Gobierno no responde el diccionario',
  startDate: '2026-11-03',
  impacts: [imp(1)],
  createdBy: 'Amilkar Bolaño', createdAt: '2026-11-03T14:00:00.000Z',
};

console.log('── Agregar y quitar tareas afectadas ──');
const conDos = aplicarEdicionIssue(base, { type:'alerta', title:base.title, startDate:base.startDate,
  impacts:[imp(1), imp(5)] }, 'David');
ok(issueImpacts(conDos).length === 2, `pasa de 1 a 2 tareas afectadas (${issueImpacts(conDos).length})`);
ok(issueImpacts(conDos)[1].actIdx === 5, 'la nueva es la que se eligió');

const sinNinguna = aplicarEdicionIssue(base, { type:'alerta', title:base.title, startDate:base.startDate,
  impacts:[] }, 'David');
ok(issueImpacts(sinNinguna).length === 0, 'quitarlas todas deja el issue sin tarea, no con la vieja');

console.log('\n── El formato viejo no revive ──');
// Un issue antiguo guarda la tarea en entregableId/actIdx; si se dejaran puestos,
// issueImpacts los devolvería y la edición no se vería.
const viejo: PlanIssue = { ...base, impacts: undefined, entregableId: 'documentaci-n-', actIdx: 0 };
ok(issueImpacts(viejo).length === 1 && issueImpacts(viejo)[0].actIdx === 0, 'el issue viejo trae su tarea por el formato antiguo');
const migrado = aplicarEdicionIssue(viejo, { type:'alerta', title:viejo.title, startDate:viejo.startDate, impacts:[imp(7)] }, 'David');
ok(issueImpacts(migrado).length === 1 && issueImpacts(migrado)[0].actIdx === 7, 'al editarlo manda la selección nueva');
ok(migrado.entregableId === undefined && migrado.actIdx === undefined, 'y los campos antiguos quedan limpios');
const vaciado = aplicarEdicionIssue(viejo, { type:'alerta', title:viejo.title, startDate:viejo.startDate, impacts:[] }, 'David');
ok(issueImpacts(vaciado).length === 0, 'vaciarlo en un issue viejo también funciona');

console.log('\n── Tipo, título y fechas ──');
const escalado = aplicarEdicionIssue(base, { type:'bloqueante', title:'Gobierno no responde: frena MSD',
  detail:'Escalado al comité', startDate:'2026-11-02', impacts:[imp(1)] }, 'David');
ok(escalado.type === 'bloqueante', 'una alerta puede pasar a bloqueante');
ok(escalado.title.endsWith('frena MSD') && escalado.detail === 'Escalado al comité', 'título y detalle se guardan');
ok(escalado.startDate === '2026-11-02', 'la fecha de inicio se corrige');

console.log('\n── Quién la abrió no se toca ──');
ok(escalado.createdBy === 'Amilkar Bolaño' && escalado.createdAt === base.createdAt,
   'el autor y la fecha de apertura sobreviven a la edición');
ok(escalado.id === base.id && escalado.planKey === base.planKey, 'el id y el cronograma no cambian');

console.log('\n── Cerrar y reabrir desde la edición ──');
const cerrado = aplicarEdicionIssue(base, { type:'alerta', title:base.title, startDate:base.startDate,
  endDate:'2026-11-09', impacts:[imp(1)] }, 'David', '2026-11-09T10:00:00.000Z');
ok(cerrado.endDate === '2026-11-09' && cerrado.closedBy === 'David', 'poner fecha de fin la cierra y firma quién');
const corregido = aplicarEdicionIssue(cerrado, { type:'alerta', title:base.title, startDate:base.startDate,
  endDate:'2026-11-10', impacts:[imp(1)] }, 'Otra persona');
ok(corregido.closedBy === 'David', 'corregir la fecha de cierre no cambia quién cerró');
const reabierto = aplicarEdicionIssue(cerrado, { type:'alerta', title:base.title, startDate:base.startDate,
  endDate:'', impacts:[imp(1)] }, 'David');
ok(reabierto.endDate === undefined, 'borrar la fecha de fin la reabre');
ok(reabierto.closedBy === undefined && reabierto.closedAt === undefined,
   'y no queda abierta con firma de cerrada');

console.log('\n── El botón está donde se usa ──');
const fuente = readFileSync(new URL('../src/components/PlanDeTrabajo.tsx', import.meta.url), 'utf8');
ok(/function editar\(i: PlanIssue\)/.test(fuente), 'cada fila puede abrirse a editar');
ok(/aplicarEdicionIssue/.test(fuente), 'guarda con la función probada arriba, no con lógica suelta');
ok(/\{picker && formAbierto &&/.test(fuente), 'el selector de tareas sirve también editando, no solo creando');
ok(/Guardar cambios/.test(fuente), 'el botón dice guardar, no registrar, cuando se edita');
ok(/\{!readOnly && <div style=\{\{ display:'flex', gap:3, flexShrink:0 \}\}>/.test(fuente),
   'editar queda detrás del mismo permiso que borrar: quien solo mira, no edita');

console.log(f ? `\n${f} fallo(s)` : '\nTodo bien');
process.exit(f ? 1 : 0);
