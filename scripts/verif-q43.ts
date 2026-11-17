// El plan Q4.3 de MIGBD, contra la hoja del PM.
//
// No basta con que el plan «se vea bien»: las cifras de la herramienta tienen
// que ser las mismas que las del Excel, casilla por casilla y semana por
// semana. Si alguna vez dejan de serlo, esto lo dice antes que la reunión.

import { readFileSync } from 'node:fs';
import { seriePlanFase, seriePlanConsolidada, factorFase, factorGlobal, marcasFase,
         realFase, realPlan, enDia, type AvanceFase } from '../src/lib/avance';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const plan = JSON.parse(readFileSync(new URL('./plan-Q4-3.json', import.meta.url), 'utf8'));
const T: Record<string, number[]> = JSON.parse(readFileSync(new URL('./excel-T.json', import.meta.url), 'utf8'));

const fases: AvanceFase[] = plan.entregables.map((e: any) => ({
  id: e.id, label: e.label,
  activities: e.activities.map((a: any) => ({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek, pct: 0 })),
}));

console.log('── Estructura ──');
ok(fases.length === 7, `7 entregables (${fases.length})`);
const casillas = fases.reduce((s, x) => s + marcasFase(x), 0);
ok(casillas === 96, `96 casillas en total (${casillas})`);
ok(Math.abs(factorGlobal(fases) - 1.041666) < 1e-4,
   `factor global 1.0417 — el «factor variable» del Excel (${factorGlobal(fases).toFixed(4)})`);

console.log('\n── Factor de cada fase ──');
const FACTOR: Record<string, number> = {
  'DOCUMENTACIÓN Y GOBIERNO': 4.545, 'TRANSMISIÓN DE DATOS': 5.882,
  'Componentes ADA - Oper Tesorería': 6.667, 'VALIDACION DE DATOS': 7.143,
  'AJUSTE DE PROCESAMIENTOS DYNAMIC': 6.667, 'GENERACIÓN DE HISTORIA': 33.33,
  'AUTOMATIZACIÓN Y ORQUESTACIÓN': 10.0,
};
for (const fase of fases) {
  const esperado = FACTOR[fase.label];
  const real = factorFase(fase);
  ok(Math.abs(real - esperado) < 0.01, `${fase.label.slice(0,36).padEnd(38)} ${real.toFixed(3)} (Excel ${esperado})`);
}

console.log('\n── Acumulado semana a semana, contra la fila «T» del Excel ──');
// El Excel redondea el factor a 3 decimales, así que su 99.99 es nuestro 100.
const TOL = 0.06;
for (const fase of fases) {
  const serie = seriePlanFase(fase, 16);
  const excel = T[fase.label];
  if (!excel) { ok(false, `sin fila T para ${fase.label}`); continue; }
  const malas = excel.map((v, i) => [i + 1, Number(v), serie.acumulado[i]] as const)
    .filter(([, v, n]) => Math.abs(n - v) > Math.max(TOL, Math.abs(v) * 0.0002));
  ok(malas.length === 0, `${fase.label.slice(0,36).padEnd(38)} 16/16 semanas`
     + (malas.length ? ` — difieren: ${malas.map(([s,v,n]) => `S${s} ${v}≠${n.toFixed(2)}`).join(', ')}` : ''));
}

console.log('\n── Consolidado ──');
// Ojo: el «Factor estatico» del consolidado en el Excel (1.075) cierra en 103.2,
// no en 100. El bueno es el «Factor variable» (1.0417), que es el que usa la
// herramienta: 96 casillas × 1.0417 = 100.
const cons = seriePlanConsolidada(fases, 16);
const excelCons = T['__CONSOLIDADO__'].map(Number);
const ratio = 100 / 103.2;
const difs = excelCons.map((v, i) => Math.abs(cons.acumulado[i] - v * ratio));
ok(Math.max(...difs) < 0.1, `la curva coincide con la del Excel reescalada a 100 (máx. ${Math.max(...difs).toFixed(3)})`);
ok(Math.abs(cons.acumulado[14] - 100) < 0.01, `cierra en 100% al final de S15 (${cons.acumulado[14].toFixed(2)})`);
ok(Math.abs(excelCons[14] - 103.2) < 0.01, 'el Excel cierra en 103.2 porque su factor estático está redondeado');

console.log('\n── La regla de tres del real ──');
// Una fase con todo al 100% vale 100; con la mitad de las casillas, 50.
const doc = fases[0];
const todo = realFase({ ...doc, activities: doc.activities.map(a => ({ ...a, pct: 100 })) }, 'actividad-semana');
ok(Math.abs(todo - 100) < 0.01, `todo al 100% da 100% (${todo.toFixed(2)})`);
const mitad = realFase({ ...doc, activities: doc.activities.map(a => ({ ...a, pct: 50 })) }, 'actividad-semana');
ok(Math.abs(mitad - 50) < 0.01, `todo al 50% da 50% (${mitad.toFixed(2)})`);
// Una actividad de 4 casillas al 80% aporta 3.2 de 22 = 14.55
const uno = realFase({ ...doc, activities: doc.activities.map((a, i) => ({ ...a, pct: i === 0 ? 80 : 0 })) }, 'actividad-semana');
ok(Math.abs(uno - 4 * 0.8 * (100/22)) < 0.01,
   `el diagnóstico (4 casillas) al 80% aporta ${uno.toFixed(2)}% del total de la fase`);

console.log('\n── El plan nuevo frente al anterior ──');
ok(plan.totalWeeks === 15, `el plan llega a S15 (${plan.totalWeeks})`);
ok(plan.weekLabels.length === 15, '15 etiquetas de semana');
ok(plan.startDate === '2026-10-13', 'la fecha de inicio no cambia: sigue siendo el 13/10');
ok(plan.pesoModo === 'actividad-semana', 'se mantiene la ponderación por casillas');
const conEtapas = plan.entregables.flatMap((e: any) => e.activities).filter((a: any) => a.etapas?.length).length;
ok(conEtapas >= 40, `${conEtapas} actividades conservan sus etapas`);

console.log(f ? `\n${f} fallo(s)` : '\nTodo bien');
process.exit(f ? 1 : 0);
