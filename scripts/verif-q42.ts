// El plan Q4.2 contra la hoja «Plan de trabajo Q4-2 - 2026» del PM.
//
// Columna T del Excel (esperado acumulado):
//   S1 5.82 · S2 11.63 · S3 16.28 · S4 20.93 · S5 31.40 · S6 38.38 · S7 46.52
//   S8 51.17 · S9 60.48 · S10 67.45 · S11 79.08 · S12 88.39 · S13 93.04 · S14 100.02

import { seriePlanConsolidada, seriePlanFase, enSemana, type AvanceFase } from '../src/lib/avance';
import { readFileSync } from 'node:fs';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };
const cerca = (a: number, b: number, tol = 0.35) => Math.abs(a - b) <= tol;

const plan = JSON.parse(readFileSync('/sessions/charming-trusting-franklin/mnt/Tim governance/MIGBD/plan-Q4-2.json','utf8')).timia_plan_configs.MIGBD;
const fases: AvanceFase[] = plan.entregables.map((e: any) => ({
  id: e.id, label: e.label,
  activities: e.activities.map((a: any) => ({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek })),
}));

console.log('── Estructura ──');
ok(plan.entregables.length === 7, `7 bloques (hay ${plan.entregables.length})`);
ok(fases.flatMap(x => x.activities).length === 60, '60 actividades');
ok(plan.totalWeeks === 14, '14 semanas, sin columnas vacías al final');
ok(plan.entregables[1].label === 'TRANSMISIÓN DE DATOS', 'TRANSMISIÓN va en segundo lugar, como en el Excel');
const maxW = Math.max(...fases.flatMap(x => x.activities.flatMap((a: any) => a.weeks)));
ok(maxW === 14, `la última casilla marcada es S${maxW}`);

console.log('\n── Los ids no cambian: los %, asignaciones y subtareas cuelgan de ellos ──');
const previos = ['documentaci-n-','desarrollo-de--2','ent-1790622977234-gp5u',
                 'ent-1790623371472-ipk4','ent-1790623981319-l1xt','ent-1790624113441-jerv'];
const ids = plan.entregables.map((e: any) => e.id);
ok(previos.every(p => ids.includes(p)), 'los 6 ids del Q4 siguen ahí');
const base = JSON.parse(readFileSync(
  '/sessions/charming-trusting-franklin/mnt/Tim governance/MIGBD/plan-Q4-sync-excel.json','utf8')).timia_plan_configs.MIGBD;
for (const e of base.entregables) {
  const n = plan.entregables.find((x: any) => x.id === e.id);
  ok(!!n && n.activities.length === e.activities.length,
     `${e.id.slice(0,22).padEnd(24)} conserva sus ${e.activities.length} actividades, en el mismo orden`);
  if (n) ok(n.activities.every((a: any, i: number) => a.label === e.activities[i].label),
     `   y cada índice sigue apuntando a la misma actividad`);
}
const conEtapas = plan.entregables.flatMap((e: any) => e.activities).filter((a: any) => a.etapas?.length).length;
ok(conEtapas === 50, `las ${conEtapas} actividades que tenían subtareas las conservan`);

console.log('\n── Esperado acumulado, contra la columna T del Excel ──');
const T = [5.82,11.63,16.28,20.93,31.40,38.38,46.52,51.17,60.48,67.45,79.08,88.39,93.04,100.02];
const cons = seriePlanConsolidada(fases, 14);
T.forEach((esperado, i) => {
  const mio = enSemana(cons, i + 1);
  ok(cerca(mio, esperado), `S${String(i+1).padEnd(2)} ${mio.toFixed(2).padStart(6)}  (Excel ${esperado.toFixed(2)})`);
});
ok(cerca(enSemana(cons, 14), 100, 0.4), 'y cierra en 100%');

console.log('\n── Factores por bloque, contra los del Excel ──');
const FACT: Record<string, number> = { 'DOCUMENTACIÓN Y GOBIERNO':5.556, 'TRANSMISIÓN DE DATOS':9.091,
  'Componentes ADA - Oper Tesorería':6.667, 'VALIDACION DE DATOS':7.143,
  'AJUSTE DE PROCESAMIENTOS DYNAMIC':6.667, 'GENERACIÓN DE HISTORIA':33.33, 'AUTOMATIZACIÓN Y ORQUESTACIÓN':10 };
for (const fa of fases) {
  const casillas = fa.activities.reduce((s: number, a: any) => s + a.weeks.length, 0);
  const factor = 100 / casillas;
  const esp = FACT[fa.label!];
  ok(cerca(factor, esp, 0.01), `${fa.label!.slice(0,32).padEnd(34)} ${factor.toFixed(3)} (Excel ${esp})`);
  ok(cerca(enSemana(seriePlanFase(fa, 14), 14), 100, 0.4), `   y la fase cierra en 100%`);
}

console.log(f ? `\n${f} fallas` : '\nQ4.2 OK');
