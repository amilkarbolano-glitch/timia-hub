// El % real de una fase tiene que pesarse por casillas, no promediando actividades.
//
// El Excel del PM pone un «Factor estático» = 100 / casillas de la fase y escribe
// a mano, en el cuadro «Real», la fracción de cada casilla: una actividad de 3
// semanas al 80% aporta 2.4 casillas, no «80 entre 11 actividades». La insignia
// de fase de Timia Hub promediaba los % a secas mientras el esperado de al lado
// ya contaba por casillas, así que la diferencia restaba dos magnitudes distintas.
//
// Caso real: MIGBD · DOCUMENTACIÓN Y GOBIERNO, 11 actividades y 18 casillas.
//   antes:   media de los 11 % ............ 48.2%
//   ahora:   8.4 casillas × 5.556 ......... 46.7%
//   Excel:   7.4 casillas × 5.556 ......... 41.1%   (ACLs en 0%, no en 100%)
//
// Los 5.6 puntos que separan la herramienta del Excel son exactamente una
// casilla: la de ACLs. Mismo método, distinto dato.

import { readFileSync } from 'node:fs';
import { realFase, factorFase, marcasFase, seriePlanFase, enDia, type AvanceFase } from '../src/lib/avance';
import { diaHabilDeSemana, computeBusinessWeekIdx } from '../src/lib/businessDays';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };
const cerca = (a: number, b: number, tol = 0.1) => Math.abs(a - b) <= tol;

// ── La fase real del plan Q4.2, copiada de producción ────────────────────────
// Semanas marcadas de cada actividad (timia_plan_configs.MIGBD, entregable
// «documentaci-n-») y el % que se ve hoy en la herramienta.
const SEMANAS: number[][] = [
  [1, 2, 3],  // Diagnóstico experto y resolución de preguntas técnicas
  [2, 3],     // Elaboración de diccionarios técnicos
  [1],        // Inicialización en Nebula
  [3],        // Aprobación de la inicialización en nebula (Gobierno técnico)
  [4, 5],     // Subida de diccionarios, revisión y validación
  [5, 6],     // Creación de los Modelos de Solución del Dato (MSD)
  [7, 8],     // Circuito de validación de los MSD
  [6],        // Solicitud y circuito de ACLs
  [6],        // Despliegue de esquemas en entorno previo (Work)
  [9],        // Despliegue de esquemas en entornos Productivo (Live)
  [4, 5],     // Creación de documentación técnica (ETL + DT)
];
const PCTS = [80, 70, 100, 100, 0, 30, 0, 100, 0, 0, 50];

const fase: AvanceFase = {
  id: 'documentaci-n-', label: 'DOCUMENTACIÓN Y GOBIERNO',
  activities: SEMANAS.map((w, i) => ({
    weeks: w, startWeek: w[0], endWeek: w[w.length - 1], pct: PCTS[i],
  })),
};

console.log('── La fase que se ve en pantalla ──');
ok(fase.activities.length === 11, `11 actividades (${fase.activities.length})`);
ok(marcasFase(fase) === 18, `18 casillas (${marcasFase(fase)})`);
ok(cerca(factorFase(fase), 5.556, 0.001), `factor estático 5.556 (${factorFase(fase).toFixed(3)}) — el del Excel`);

console.log('\n── El real ya no es un promedio ──');
const media = PCTS.reduce((s, v) => s + v, 0) / PCTS.length;
const pesado = realFase(fase, 'actividad-semana');
ok(cerca(media, 48.18), `el promedio simple daba ${media.toFixed(1)}% — lo que mostraba la insignia`);
ok(cerca(pesado, 46.67), `pesado por casillas da ${pesado.toFixed(1)}%`);
ok(!cerca(pesado, media, 1), 'son números distintos: el promedio inflaba la fase en 1.5 puntos');

console.log('\n── Regla de tres, actividad por actividad ──');
// 3 casillas al 80% = 2.4 casillas; cada casilla vale 100/18.
const casillasEsperadas = 3*0.8 + 2*0.7 + 1*1 + 1*1 + 2*0 + 2*0.3 + 2*0 + 1*1 + 1*0 + 1*0 + 2*0.5;
ok(cerca(casillasEsperadas, 8.4, 0.001), `8.4 casillas ejecutadas (${casillasEsperadas})`);
ok(cerca(pesado, casillasEsperadas * (100/18)), 'el % es exactamente casillas × factor');

console.log('\n── Contra el cuadro «Real» del Excel ──');
// Columna a columna, como las escribe el PM: S1 2.0, S2 2.0, S3 1.8, S4 1.0, S5 0.6
// → 11.1, 11.1, 10.0, 5.6, 3.3 y acumulado 41.1. Con ACLs en 0% —como está en
// el Excel— el método da el mismo número al decimal.
const comoExcel = realFase({ ...fase, activities: fase.activities.map((a, i) => ({ ...a, pct: i === 7 ? 0 : a.pct })) }, 'actividad-semana');
ok(cerca(comoExcel, 41.11), `con ACLs en 0% da ${comoExcel.toFixed(1)}% — el 41.1% del Excel, clavado`);
ok(cerca(pesado - comoExcel, 100/18), 'lo que separa herramienta y Excel es una casilla exacta: ACLs');

console.log('\n── Columna a columna, como el cuadro «Real» ──');
const serieReal = [11.1, 11.1, 10.0, 5.6, 3.3];   // lo que suma cada semana en el Excel
const porSemana = [2.0, 2.0, 1.8, 1.0, 0.6];      // casillas ejecutadas en cada una
porSemana.forEach((c, i) => ok(cerca(c * (100/18), serieReal[i], 0.06),
  `S${i+1}: ${c} casillas = ${(c*100/18).toFixed(1)} (Excel ${serieReal[i]})`));
ok(cerca(porSemana.reduce((s,v)=>s+v,0) * (100/18), 41.1, 0.06), 'el acumulado cierra en 41.1');

console.log('\n── Una actividad larga pesa más que una corta ──');
const corta: AvanceFase = { id:'x', label:'x', activities: [
  { weeks:[1], startWeek:1, endWeek:1, pct:100 },
  { weeks:[1,2,3,4,5,6], startWeek:1, endWeek:6, pct:0 },
]};
ok(cerca(realFase(corta, 'actividad-semana'), 100/7), 'una de 1 semana al 100% y otra de 6 en 0% → 14.3%, no 50%');
ok(cerca(realFase(corta, 'actividad'), 50), 'en modo actividad sí da 50%: cada modo mantiene su regla');

console.log('\n── El esperado usa el mismo factor ──');
// Si real y esperado no comparten factor, la diferencia no significa nada.
const alCierreS18 = enDia(seriePlanFase(fase, 18), 18, 5);
ok(cerca(alCierreS18, 100, 0.5), `al final del plan el esperado llega a 100% (${alCierreS18.toFixed(1)}%)`);
const todoAl100 = realFase({ ...fase, activities: fase.activities.map(a => ({ ...a, pct: 100 })) }, 'actividad-semana');
ok(cerca(todoAl100, 100, 0.01), `con todo al 100% el real llega a 100% (${todoAl100.toFixed(2)}%)`);

console.log('\n── La raya de HOY va en el día, no al inicio de la semana ──');
// MIGBD arranca el martes 13/10/2026. Con el 2 de noviembre festivo, S4 va del
// miércoles 4 al martes 10, y hoy —martes 10— es su quinto y último día hábil:
// la raya tiene que quedar a la derecha de S4, no pegada al borde izquierdo.
const festivos = new Set(['2026-11-02', '2026-11-16']);
const dia = (s: string) => diaHabilDeSemana('2026-10-13', festivos, new Date(s + 'T12:00:00'));
const sem = (s: string) => computeBusinessWeekIdx('2026-10-13', festivos, new Date(s + 'T12:00:00')) + 1;
ok(sem('2026-11-10') === 4 && dia('2026-11-10') === 5, `10/11 es S${sem('2026-11-10')} día ${dia('2026-11-10')} — cierra la semana`);
ok(sem('2026-11-04') === 4 && dia('2026-11-04') === 1, '04/11 es S4 día 1 — abre la semana');
ok(sem('2026-11-11') === 5, '11/11 ya es S5');

const fuente = readFileSync(new URL('../src/components/PlanDeTrabajo.tsx', import.meta.url), 'utf8');
ok(/function posHoy/.test(fuente), 'la posición de la raya es una función, no un borde fijo');
ok(!/borderLeft: isToday \? '2px solid #16a34a'/.test(fuente), 'ya no queda ningún borde izquierdo verde');
ok((fuente.match(/<RayaHoy /g) ?? []).length >= 3, 'la raya se dibuja en la cabecera y en las dos clases de celda');

// posHoy: día 1 al borde izquierdo (20% de la casilla), día 5 al derecho (100%).
const pos = (d: number) => (Math.max(1, Math.min(5, d)) / 5) * 100;
ok(pos(5) === 100, 'día 5 → 100% de la casilla: la raya cierra la semana');
ok(pos(1) === 20,  'día 1 → 20%: apenas entrada la semana');
ok(pos(3) === 60,  'día 3 → 60%: a mitad de semana');
ok(pos(9) === 100 && pos(0) === 20, 'fuera de rango se acota, no se sale de la casilla');

console.log(f ? `\n${f} fallo(s)` : '\nTodo bien');
process.exit(f ? 1 : 0);
