// Simular el esperado a una fecha distinta de hoy.
//
// El seguimiento se arma dos o tres días antes de la reunión, así que hay que
// poder ver contra qué número te van a comparar ese día. El plan MIGBD arranca
// el martes 13/10/2026; S1 = 13–19/10, S2 = 20–26/10, y así.

import { computeBusinessWeekIdx, diaHabilDeSemana } from '../src/lib/businessDays';
import { seriePlanConsolidada, enDia, enSemana, type AvanceFase } from '../src/lib/avance';
import { readFileSync } from 'node:fs';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };
const cerca = (a: number, b: number, tol = 0.35) => Math.abs(a - b) <= tol;

const INICIO = '2026-10-13';
const sinFestivos = new Set<string>();
const d = (s: string) => new Date(s + 'T12:00:00');

console.log('── Situar una fecha dentro del plan ──');
// Semana en base 0; día hábil de 1 a 5.
const casos: [string, number, number, string][] = [
  ['2026-10-13', 0, 1, 'martes 13, primer día del plan'],
  ['2026-10-16', 0, 4, 'viernes 16, cuarto día de S1'],
  ['2026-10-19', 0, 5, 'lunes 19, quinto y último día de S1'],
  ['2026-10-20', 1, 1, 'martes 20, primer día de S2'],
  ['2026-10-22', 1, 3, 'jueves 22, mitad de S2'],
  ['2026-11-05', 3, 3, 'jueves 5 de noviembre, dentro de S4 (04/11-10/11)'],
];
for (const [fecha, semana, dia, texto] of casos) {
  const w = computeBusinessWeekIdx(INICIO, sinFestivos, d(fecha));
  const dd = diaHabilDeSemana(INICIO, sinFestivos, d(fecha));
  ok(w === semana && dd === dia, `${texto.padEnd(34)} → S${w + 1}, día ${dd}`);
}
ok(computeBusinessWeekIdx(INICIO, sinFestivos, d('2026-10-17')) === 0,
   'un sábado no adelanta la cuenta de días hábiles');
ok(computeBusinessWeekIdx(INICIO, sinFestivos, d('2026-10-01')) === -1,
   'una fecha anterior al arranque devuelve -1 y no rompe nada');

console.log('\n── Sin fecha de corte se comporta igual que antes ──');
const hoyW = computeBusinessWeekIdx(INICIO, sinFestivos);
ok(hoyW === computeBusinessWeekIdx(INICIO, sinFestivos, new Date()),
   'pasar la fecha de hoy da lo mismo que no pasar ninguna');
ok(diaHabilDeSemana(INICIO, sinFestivos) === diaHabilDeSemana(INICIO, sinFestivos, new Date()),
   'y lo mismo con el día hábil');

console.log('\n── El esperado del Q4.2 a distintas fechas ──');
const plan = JSON.parse(readFileSync(
  '/sessions/charming-trusting-franklin/mnt/Tim governance/MIGBD/plan-Q4-2.json','utf8')).timia_plan_configs.MIGBD;
const fases: AvanceFase[] = plan.entregables.map((e: any) => ({
  id: e.id, label: e.label,
  activities: e.activities.map((a: any) => ({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek })),
}));
const serie = seriePlanConsolidada(fases, 14);

// Columna T del Excel: S1 5.82 · S2 11.63 · S3 16.28
const esperadoEn = (fecha: string) => {
  const w = computeBusinessWeekIdx(INICIO, sinFestivos, d(fecha)) + 1;
  return enDia(serie, w, diaHabilDeSemana(INICIO, sinFestivos, d(fecha)));
};
ok(cerca(esperadoEn('2026-10-19'), 5.82), `al cierre de S1 (lun 19) = ${esperadoEn('2026-10-19').toFixed(2)} — el 5.82 del Excel`);
ok(cerca(esperadoEn('2026-10-26'), 11.63), `al cierre de S2 (lun 26) = ${esperadoEn('2026-10-26').toFixed(2)} — el 11.63 del Excel`);
ok(cerca(esperadoEn('2026-10-22'), 9.3, 0.4), `a mitad de S2 (jue 22) = ${esperadoEn('2026-10-22').toFixed(2)} — entre 5.82 y 11.63`);

// Lo que de verdad le sirve: mirar hacia adelante.
const hoy = esperadoEn('2026-11-05'), enTresDias = esperadoEn('2026-11-10');
ok(enTresDias > hoy, `el esperado sube con la fecha: ${hoy.toFixed(2)} → ${enTresDias.toFixed(2)}`);
ok(cerca(esperadoEn('2027-03-01'), enSemana(serie, 14), 0.01),
   'una fecha más allá del plan se queda en el 100% final, no se dispara');

console.log('\n── Nunca retrocede ──');
let sube = true, prev = -1;
for (const fecha of ['2026-10-13','2026-10-16','2026-10-20','2026-10-26','2026-11-05','2026-12-01','2027-01-20']) {
  const v = esperadoEn(fecha);
  if (v < prev) sube = false;
  prev = v;
}
ok(sube, 'avanzar la fecha nunca baja el esperado');

console.log(f ? `\n${f} fallas` : '\nsimulación OK');
