// El % real de una fase tiene que pesarse por casillas, no promediando actividades.
//
// El Excel del PM pone un «Factor estático» = 100 / casillas de la fase y escribe
// a mano, en el cuadro «Real», la fracción de cada casilla: una actividad de 3
// semanas al 80% aporta 2.4 casillas, no «80 entre 11 actividades». La insignia
// de fase de Timia Hub promediaba los % a secas mientras el esperado de al lado
// ya contaba por casillas, así que la diferencia restaba dos magnitudes distintas.
//
// Caso real: MIGBD · DOCUMENTACIÓN Y GOBIERNO, 11 actividades y 18 casillas.
//   antes:   media de los 11 % ............ 45.5%
//   ahora:   780 / 18 ..................... 43.3%
//   Excel:   6.6 casillas × 5.556 ......... 36.7%   (con ACLs en 0%, no en 100%)

import { realFase, factorFase, marcasFase, seriePlanFase, enDia, type AvanceFase } from '../src/lib/avance';

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
const PCTS = [80, 70, 100, 100, 0, 30, 0, 100, 0, 0, 20];

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
ok(cerca(media, 45.45), `el promedio simple daba ${media.toFixed(1)}% — lo que mostraba la insignia`);
ok(cerca(pesado, 43.33), `pesado por casillas da ${pesado.toFixed(1)}%`);
ok(!cerca(pesado, media, 1), 'son números distintos: el error valía 2.1 puntos en esta fase');

console.log('\n── Regla de tres, actividad por actividad ──');
// 3 casillas al 80% = 2.4 casillas; cada casilla vale 100/18.
const casillasEsperadas = 3*0.8 + 2*0.7 + 1*1 + 1*1 + 2*0 + 2*0.3 + 2*0 + 1*1 + 1*0 + 1*0 + 2*0.2;
ok(cerca(casillasEsperadas, 7.8, 0.001), `7.8 casillas ejecutadas (${casillasEsperadas})`);
ok(cerca(pesado, casillasEsperadas * (100/18)), 'el % es exactamente casillas × factor');

console.log('\n── Contra el cuadro «Real» del Excel ──');
// Columna a columna, como las escribe el PM: S1 2.0, S2 2.0, S3 1.8, S4 0.2, S5 0.6.
// Con ACLs en 0% —como está en el Excel y en la PPT— el método da 37.8%, y el
// 1.1 que falta hasta 36.7% es la casilla que el PM escribió a mano en ETL+DT
// (0.2 en vez de los 0.4 que salen de un 20% sobre 2 casillas).
const comoExcel = realFase({ ...fase, activities: fase.activities.map((a, i) => ({ ...a, pct: i === 7 ? 0 : a.pct })) }, 'actividad-semana');
ok(cerca(comoExcel, 37.78), `con ACLs en 0% da ${comoExcel.toFixed(1)}% contra el 36.7% del Excel`);
ok(Math.abs(comoExcel - 36.7) < 1.2, 'queda a poco más de un punto: la diferencia es un dato, no el método');

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

console.log(f ? `\n${f} fallo(s)` : '\nTodo bien');
process.exit(f ? 1 : 0);
