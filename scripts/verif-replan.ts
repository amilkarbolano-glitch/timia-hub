// El esperado replanificado y el avance real tienen que estar en la misma escala.
//
// Cuando un cambio de alcance o un bloqueante corren el fin de una tarea, el
// plan pasa a ocupar más casillas. Sumarlas sin más hacía dos cosas malas a la
// vez: subía el peso de la tarea retrasada —premiar el retraso— y crecía el
// denominador, así que el % de todas las demás actividades se movía por un
// motivo que no tenía nada que ver con ellas. Y el real, medido sobre las
// casillas originales, se comparaba contra un esperado medido sobre otro total.

import { readFileSync } from 'node:fs';
import {
  seriePlanConsolidada, seriePlanConExtension, seriePlanFaseConExtension,
  enDia, realPlan, factorGlobal, type AvanceFase,
} from '../src/lib/avance';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };
const cerca = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

// Dos actividades de 2 semanas. 4 casillas, 25% cada una.
// La primera está hecha; la segunda, bloqueada, corre de S3–S4 a S3–S6.
const base: AvanceFase[] = [{ id:'f', label:'f', activities: [
  { weeks:[1,2], startWeek:1, endWeek:2, pct:100 },
  { weeks:[3,4], startWeek:3, endWeek:4, pct:0   },
]}];
const ext: AvanceFase[] = [{ id:'f', label:'f', activities: [
  { weeks:[1,2], startWeek:1, endWeek:2, pct:100 },
  { weeks:[3,4,5,6], startWeek:3, endWeek:6, pct:0 },
]}];
const al = (s: ReturnType<typeof seriePlanConsolidada>, sem: number) => enDia(s, sem, 5);

console.log('── Extender no crea trabajo ──');
const serieExt = seriePlanConExtension(base, ext, 8);
ok(cerca(al(serieExt, 8), 100), `el plan replanificado sigue cerrando en 100% (${al(serieExt, 8).toFixed(1)})`);
ok(cerca(factorGlobal(base), 25), 'el factor es el de la línea base: 25% por casilla');

console.log('\n── El peso de cada actividad no cambia ──');
// La segunda vale 50% antes y después; lo que cambia es en qué semanas cae.
ok(cerca(al(serieExt, 2), 50), 'al cerrar S2 la primera aporta sus 50%');
ok(cerca(al(serieExt, 6) - al(serieExt, 2), 50), 'y la segunda aporta 50% repartidos entre S3 y S6');
ok(cerca(al(serieExt, 4) - al(serieExt, 2), 25), 'a mitad de su tramo lleva la mitad: 25%');

console.log('\n── Real y esperado, en la misma escala ──');
const real = realPlan(base, 'actividad-semana');
ok(cerca(real, 50), `el real es 50% (${real.toFixed(1)})`);
const espBase = al(seriePlanConsolidada(base, 8), 4);
const espReplan = al(serieExt, 4);
ok(cerca(espBase, 100), `esperado línea base al cerrar S4: 100% (${espBase.toFixed(1)})`);
ok(cerca(espReplan, 75), `esperado replanificado: 75% (${espReplan.toFixed(1)})`);
ok(espReplan < espBase, 'correr el fin baja lo exigible hoy, no lo sube');
ok(cerca(real - espReplan, -25), 'la diferencia contra el replan son 25 puntos, no un número de otra escala');

console.log('\n── Lo que hacía antes ──');
// El cálculo viejo usaba el factor de las casillas extendidas: 100/6 = 16.7.
const viejo = al(seriePlanConsolidada(ext, 8), 4);
ok(cerca(viejo, 66.7, 0.1), `con el factor extendido daba ${viejo.toFixed(1)}%`);
ok(Math.abs((real - viejo) - (real - espReplan)) > 8,
   'y la diferencia salía 8 puntos más pequeña de lo que era: el retraso se veía menor');
ok(!cerca(realPlan(ext, 'actividad-semana'), real),
   'además el mismo trabajo valía otro % según qué fases se usaran — señal de que las escalas no eran la misma');

console.log('\n── Sin extensiones, nada cambia ──');
ok(cerca(al(seriePlanConExtension(base, base, 8), 4), espBase),
   'si no se corrió ninguna fecha, el replanificado es idéntico a la línea base');

console.log('\n── Una sola fase ──');
ok(cerca(enDia(seriePlanFaseConExtension(base[0], ext[0], 8), 4, 5), 75),
   'la insignia de fase usa la misma regla que el encabezado');

console.log('\n── Un solo sitio de cálculo ──');
const fuente = readFileSync(new URL('../src/components/PlanDeTrabajo.tsx', import.meta.url), 'utf8');
ok(/function kpisDelPlan/.test(fuente), 'los números del encabezado salen de una sola función');
ok(/const kpis = kpisDelPlan\(plan, getActivityPct, holidays, issues, changes, corte\)/.test(fuente),
   'la pantalla la usa');
ok(/const kpis = kpisDelPlan\(plan, getActivityPct, _holidays, issues, changes\)/.test(fuente),
   'y el PPTX también, en vez de calcular los suyos');
ok(!/const overallExp  = parseFloat\(\(plan\.entregables\.reduce\(\(s,e\)=>s\+e\.pctExp/.test(fuente),
   'el deck ya no exporta el pctExp congelado de la configuración');
ok(/const overallDif = kpis\.dif;/.test(fuente), 'la diferencia que se reporta es contra la línea base');
ok(/DIF\. VS REPLAN/.test(fuente), 'y la del replanificado se enseña aparte, como explicación');

console.log(f ? `\n${f} fallo(s)` : '\nTodo bien');
process.exit(f ? 1 : 0);
