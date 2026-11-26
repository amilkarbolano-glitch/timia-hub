// El esperado de una fase es uno solo, salga donde salga.
//
// La insignia del entregable lo calculaba contra la línea base y la tarjeta y
// la presentación contra la fase replanificada: el mismo entregable decía
// 83,3 % en la pantalla y 59 % en el reporte que se envía al cliente, y con él
// una diferencia que no era la que se estaba mirando.
//
// La fase es la de "Documentación y gobierno" del plan Q4 cargado en MIGBD.

import { esperadoFase, seriePlanFase, enDia, type AvanceFase } from '../src/lib/avance';

let fallos = 0;
const ok = (c: boolean, s: string) => { if (!c) fallos++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const fase = (label: string, acts: number[][]): AvanceFase => ({
  id: label, label,
  activities: acts.map(w => ({ weeks: w, startWeek: w[0], endWeek: w[w.length - 1] })),
});

const SEMANAS = [[1,2],[1],[1],[2],[2,3],[3],[3,4],[5],[5],[5],[3,4]];
const DOC = fase('Documentación y gobierno', SEMANAS);

// La misma fase con dos tareas corridas tres semanas, que es lo que hace un
// bloqueante: la línea base no se mueve, el replanificado sí.
const DOC_EXT = fase('Documentación y gobierno (replan)',
  SEMANAS.map((w, i) => (i === 0 || i === 4 ? [...w, w[w.length - 1] + 1, w[w.length - 1] + 2, w[w.length - 1] + 3] : w)));

const HORIZONTE = 10, SEMANA = 3, DIA = 3;

const base = esperadoFase(DOC, HORIZONTE, SEMANA, DIA);
const ext = esperadoFase(DOC_EXT, HORIZONTE, SEMANA, DIA);

ok(base === parseFloat(enDia(seriePlanFase(DOC, HORIZONTE), SEMANA, DIA).toFixed(1)),
  `esperadoFase devuelve el acumulado del plan al día (${base} %)`);
ok(ext < base,
  `la fase replanificada da menos que la base (${ext} % contra ${base} %): por eso no pueden mezclarse`);
ok(esperadoFase(DOC, HORIZONTE, SEMANA, DIA) === esperadoFase(DOC, Math.max(HORIZONTE, SEMANA), SEMANA, DIA),
  'el horizonte no cambia el número mientras hoy caiga dentro del plan');
ok(esperadoFase(DOC, HORIZONTE, 99, 5) === 100,
  'pasado el final del plan, el esperado es 100 %');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nEsperado por fase: una sola cuenta');
process.exit(fallos ? 1 : 0);
