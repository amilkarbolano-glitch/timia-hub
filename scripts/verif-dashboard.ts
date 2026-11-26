// El dashboard: a qué líder pertenece cada proyecto y qué cuenta el standup.
//
// Lo del líder no es cosmético: los dos proyectos de Juan salían en filas
// distintas porque la agrupación usaba el nombre que hubiera a mano, y el
// nombre venía de dos sitios que no siempre coinciden.

import { pmDelProyecto, plano, diasAbierta, textoStandup, type BloqueStandup } from '../src/components/PMDashboard';
import type { AdminProject, AdminUser, PlanIssue } from '../src/lib/adminStore';
import type { ActividadStandup } from '../src/components/PlanDeTrabajo';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const usuario = (id: string, name: string, role: AdminUser['role'], projectIds: string[] = []): AdminUser => ({
  id, name, email: `${id}@timia.ai`, role, projectIds,
  initials: name.slice(0, 2).toUpperCase(), avatarColor: '#7c3aed', active: true,
});
const proyecto = (id: string, name: string, area: string): AdminProject => ({
  id, name, area, color: '#7c3aed', priority: 'Media', client: 'BBVA',
  startDate: '2026-09-01', active: true,
});

const juan = usuario('u-juan', 'Juan Pérez', 'pm');
const otros = [juan, usuario('u-ami', 'Amilkar Bolaño', 'tech_lead')];

console.log('── A qué líder pertenece cada proyecto ──');

const pReporte = proyecto('REPORTE-RE', 'Reporte regulatorio FX', 'Juan Pérez');
const pMig     = proyecto('MIGBD', 'Migración BD a ADA', 'Juan Pérez');

ok(pmDelProyecto(pReporte, [juan], otros)?.id === 'u-juan',
   'lo encuentra cuando está en el equipo del proyecto');
ok(pmDelProyecto(pMig, [], otros)?.id === 'u-juan',
   'y también cuando solo figura como área');
ok(pmDelProyecto(pReporte, [juan], otros)?.id === pmDelProyecto(pMig, [], otros)?.id,
   'los dos proyectos del mismo líder dan el mismo identificador: por eso salían separados');

ok(pmDelProyecto(proyecto('X', 'X', 'juan pérez'), [], otros)?.id === 'u-juan',
   'no le importan las mayúsculas');
ok(pmDelProyecto(proyecto('X', 'X', 'Juan Perez'), [], otros)?.id === 'u-juan',
   'ni las tildes: «Perez» encuentra a «Pérez»');
ok(pmDelProyecto(proyecto('X', 'X', 'Juan'), [], otros)?.id === 'u-juan',
   'ni que el área traiga solo el nombre de pila');
ok(pmDelProyecto(proyecto('X', 'X', 'Finanzas'), [], otros) === undefined,
   'un área que no es una persona no inventa un líder');
ok(pmDelProyecto(proyecto('X', 'X', ''), [], otros) === undefined,
   'y sin área tampoco');
ok(pmDelProyecto(pReporte, [usuario('u-otro', 'Otro PM', 'pm')], otros)?.id === 'u-otro',
   'el PM del equipo manda sobre el del área: es quien lo lleva de verdad');

console.log('\n── Antigüedad de lo que frena ──');
const haceDias = (n: number) => {
  // En fecha local, que es como se guardan: toISOString corre el día cuando la
  // hora local y la UTC caen en días distintos.
  const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
ok(diasAbierta(haceDias(0)) === 0, 'lo de hoy lleva cero días');
ok(diasAbierta(haceDias(9)) === 9, 'y lo de hace nueve, nueve, sea la hora que sea');
ok(diasAbierta('no es fecha') === 0, 'una fecha ilegible no produce un número absurdo');

console.log('\n── Lo que cuenta el standup ──');

const act = (nombre: string, pct: number, extra: Partial<ActividadStandup> = {}): ActividadStandup => ({
  planKey: 'MIGBD', projectId: 'MIGBD', cronoName: 'Cronograma base',
  entregable: 'Ingesta', nombre, pct, inicio: null, fin: null,
  responsables: [], atrasada: false, ...extra,
});

const issue = (title: string, type: PlanIssue['type'], dias: number, responsable?: string): PlanIssue => ({
  id: `is-${title}`, planKey: 'MIGBD', type, title,
  startDate: haceDias(dias), createdBy: 'Amilkar', createdAt: haceDias(dias),
  responsable,
});

const bloque: BloqueStandup = {
  r: { p: pMig, plans: [], real: 68, exp: 75, dif: -7, nActs: 10, done: 4, late: 1,
       openBloq: 1, openAlert: 0, team: [], leads: [], tasksOpen: 2, tasksDone: 1,
       start: null, end: null, risk: 40, riskWhy: [], ultima: null } as any,
  cerradas: [act('Diccionario de datos', 100, { responsables: ['Juliana Garzón'] })],
  movidas:  [act('Schemas Work', 60, { de: 30 })],
  enCurso:  [act('Construcción del proceso', 20, { atrasada: true })],
  porVenir: [act('Pruebas de aceptación', 0, { inicio: new Date('2026-12-02T12:00:00') })],
  abiertas: [issue('Gobierno no aprueba el diccionario', 'bloqueante', 12, 'Gobierno del Dato')],
};

const texto = textoStandup([bloque], 7, false);
ok(texto.includes('Diccionario de datos'), 'nombra lo que se terminó, no solo cuántas');
ok(texto.includes('Juliana'), 'y quién lo hizo');
ok(texto.includes('30% → 60%'), 'de lo que avanzó dice de dónde a dónde');
ok(texto.includes('ATRASADA'), 'marca lo atrasado, que es de lo que hay que hablar');
ok(texto.includes('Pruebas de aceptación'), 'avisa de lo que arranca');
ok(texto.includes('12 d'), 'y cuántos días lleva frenado');
ok(texto.includes('Gobierno del Dato'), 'con el nombre de en qué mano está');
ok(texto.includes('68%') && texto.includes('75%'), 'sin perder el real contra el esperado');

const md = textoStandup([bloque], 7, true);
ok(md.includes('# Standup'), 'en markdown trae encabezado');
ok(md.includes('**Migración BD a ADA**'), 'y el proyecto en negrita, no en mayúsculas');
ok(!md.includes('MIGRACIÓN BD A ADA'), 'sin gritar');

console.log('\n── Un proyecto quieto no ensucia el standup ──');
const quieto: BloqueStandup = { ...bloque, cerradas: [], movidas: [], enCurso: [], porVenir: [], abiertas: [] };
ok(!textoStandup([quieto], 7, false).includes('Migración BD a ADA'),
   'si no se movió nada y nada frena, el proyecto no aparece');

console.log(f ? `\n✗ ${f} fallo(s)` : '\ndashboard OK');
process.exit(f ? 1 : 0);
