// El esperado a día de hoy, contra la hoja "Plan de trabajo Q4 - 2026" del PM.
//
// Cifras de referencia leídas del Excel (filas T, columnas D..S):
//   ESPERADO T: S1=8.96  S2=17.92  S3=25.38
//   Gobierno T: S1=20.00 S2=40.00  |  ADA-Oper T: S1=25.00 S2=50.00
// El plan arranca el martes 13/10/2026; S1 = 13–19/10, S2 = 20–26/10.

import { seriePlanConsolidada, seriePlanFase, enSemana, enDia, realPlan,
         pesoRealPorSemana, serieRealConsolidada, type AvanceFase } from '../src/lib/avance';
import { readFileSync } from 'node:fs';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };
const cerca = (a: number, b: number, tol = 0.06) => Math.abs(a - b) <= tol;

// El plan vive en Mongo, no en db.json; se contrasta contra el JSON que se
// subió a la herramienta, que es exactamente lo que ve el PM en pantalla.
const RUTA = '/sessions/charming-trusting-franklin/mnt/Tim governance/MIGBD/plan-Q4-sync-excel.json';
const cfgs = JSON.parse(readFileSync(RUTA, 'utf8')).timia_plan_configs ?? {};
const plan = cfgs['MIGBD'] ?? Object.values(cfgs)[0] ?? null;

console.log('── La regla de tres del PM ──');
// «si esta está al 70% debería ser 1,4»: una actividad de 2 casillas al 70%.
const dos = { weeks: [1, 2], startWeek: 1, endWeek: 2, pct: 70 };
const peso = [...pesoRealPorSemana(dos).values()].reduce((s, v) => s + v, 0);
ok(cerca(peso, 1.4, 0.001), `2 casillas al 70% aportan ${peso.toFixed(2)} casillas, no 1 ni 2`);
ok(cerca([...pesoRealPorSemana({ weeks:[1,2,3], startWeek:1, endWeek:3, pct:50 }).values()]
     .reduce((s,v)=>s+v,0), 1.5, 0.001), '3 casillas al 50% aportan 1.5');
ok([...pesoRealPorSemana(dos).keys()].join() === '1,2', 'y se reparten en orden cronológico');
ok(pesoRealPorSemana(dos).get(1) === 1, 'la primera semana se llena entera');
ok(cerca(pesoRealPorSemana(dos).get(2)!, 0.4, 0.001), 'y la última recibe el resto: 0.4');
ok(pesoRealPorSemana({ ...dos, pct: 0 }).size === 0, 'al 0% no aporta ninguna casilla');
ok([...pesoRealPorSemana({ ...dos, pct: 100 }).values()].reduce((s,v)=>s+v,0) === 2, 'al 100% aporta las 2');

// El KPI de arriba (realPlan) y la curva de abajo tienen que dar lo mismo.
const unaFase: AvanceFase[] = [{ id:'x', label:'X', activities:[dos] }];
const porKpi   = realPlan(unaFase, 'actividad-semana');
const porCurva = enSemana(serieRealConsolidada(unaFase, 2), 2);
ok(cerca(porKpi, porCurva, 0.01), `el KPI (${porKpi.toFixed(1)}%) y la curva (${porCurva.toFixed(1)}%) coinciden`);

console.log('\n── El esperado se interpola dentro de la semana ──');
if (!plan) {
  console.log('  (no hay plan MIGBD cargado en db.json: se prueba con una serie sintética)');
}
// Serie sintética con los cortes del Excel, para probar enDia sin depender del plan.
const serie = { semanal: [8.96, 8.96, 7.46], acumulado: [8.96, 17.92, 25.38] };
ok(cerca(enDia(serie, 2, 5), 17.92), 'el viernes de S2 da el cierre de S2: 17.92');
ok(cerca(enDia(serie, 2, 0), 8.96),  'antes de empezar S2 da el cierre de S1: 8.96');
ok(cerca(enDia(serie, 2, 3), 14.34), `el jueves (día 3 de 5) da ${enDia(serie,2,3).toFixed(2)}: a 3/5 del camino`);
ok(cerca(enDia(serie, 1, 3), 5.38),  'en la primera semana parte de cero, no de un valor anterior');
ok(enDia(serie, 2, 3) > enSemana(serie, 1), 'y siempre queda por encima del cierre de la semana pasada');
ok(enDia(serie, 2, 3) < enSemana(serie, 2), 'y por debajo del cierre de la semana en curso');
// Monotonía: avanzar un día nunca puede bajar el esperado.
let sube = true;
for (let d = 1; d <= 5; d++) if (enDia(serie, 2, d) < enDia(serie, 2, d - 1)) sube = false;
ok(sube, 'el esperado nunca baja de un día al siguiente');

console.log('\n── Contra las columnas del Excel ──');
if (plan?.entregables?.length) {
  const fases: AvanceFase[] = plan.entregables.map((e: any) => ({
    id: e.id ?? String(e.name ?? ''), label: e.name ?? e.label ?? '',
    activities: e.activities.map((a: any) => ({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek, pct: a.pct })),
  }));
  const cons = seriePlanConsolidada(fases, plan.totalWeeks ?? 14);
  ok(cerca(enSemana(cons, 1), 8.96, 0.3),  `S1 esperado = ${enSemana(cons,1).toFixed(2)} (Excel 8.96)`);
  ok(cerca(enSemana(cons, 2), 17.92, 0.3), `S2 esperado = ${enSemana(cons,2).toFixed(2)} (Excel 17.92)`);
  ok(cerca(enDia(cons, 2, 3), 14.34, 0.4), `hoy (jueves de S2) = ${enDia(cons,2,3).toFixed(2)} (esperado 14.34)`);
  const gob = fases[0];
  ok(cerca(enSemana(seriePlanFase(gob, plan.totalWeeks ?? 14), 2), 40.0, 0.5),
     `${gob.label.slice(0,26)} S2 = ${enSemana(seriePlanFase(gob,14),2).toFixed(1)} (Excel 40.0)`);
} else {
  console.log('  (sin plan MIGBD en db.json, no se puede contrastar)');
}

console.log(f ? `\n${f} fallas` : '\nesperado OK');
