// El "Esperado" de cada fase debe coincidir con el Excel del PM.
//
// La insignia de fase calculaba siempre por actividades —"¿cuántas deberían estar
// al 100% hoy?"— ignorando que el plan declara pesoModo 'actividad-semana'. En una
// fase cuyas tareas terminan todas más adelante daba 0% aunque ya hubiera semanas
// corridas: Componentes ADA marcaba 0% contra el 25% del Excel.
//
// Cifras de referencia leídas de "Plan de trabajo Q4 - 2026" del Seguimiento (6),
// fila T (acumulado) en la columna S1.

import { seriePlanFase, enSemana, type AvanceFase } from '../src/lib/avance';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const fase = (label: string, acts: number[][]): AvanceFase => ({
  id: label, label,
  activities: acts.map(w => ({ weeks: w, startWeek: w[0], endWeek: w[w.length - 1] })),
});

// Plan Q4 cargado en MIGBD
const DOC = fase('Documentación y gobierno', [
  [1,2],[1],[1],[2],[2,3],[3],[3,4],[5],[5],[5],[3,4]]);
const OPER = fase('Componentes ADA - Oper Tesorería', [
  [1,2],[1,2],[1,2],[3,4,5],[6,7],[7]]);
const VALID = fase('Validación de datos - Oper Tesorería', [
  [6],[6,7],[7,8],[8],[8],[8],[7],[9,10],[11],[12]]);

const SEMANAS = 14;
const esperado = (fa: AvanceFase, hoy: number) =>
  parseFloat(enSemana(seriePlanFase(fa, SEMANAS), hoy).toFixed(1));

/** El método viejo: una actividad cuenta 100 solo si su semana de fin ya pasó. */
const porActividades = (fa: AvanceFase, hoy: number) =>
  parseFloat((fa.activities.reduce((s, a) => s + (hoy >= a.endWeek ? 100 : 0), 0) / fa.activities.length).toFixed(1));

console.log('── En S1, contra el Excel ──');
ok(esperado(DOC, 1) === 20.0,  `Documentación y gobierno: ${esperado(DOC, 1)}% (Excel D16 = 20.001)`);
ok(esperado(OPER, 1) === 25.0, `Componentes ADA - Oper Tesorería: ${esperado(OPER, 1)}% (Excel D24 = 24.999)`);
ok(esperado(VALID, 1) === 0.0, `Validación de datos: ${esperado(VALID, 1)}% (Excel D36 = 0)`);

console.log('\n── Lo que daba antes ──');
ok(porActividades(DOC, 1) === 18.2,  `Documentación: el método viejo daba ${porActividades(DOC, 1)}%`);
ok(porActividades(OPER, 1) === 0.0,  `Componentes ADA: el método viejo daba ${porActividades(OPER, 1)}% — el fallo reportado`);
ok(esperado(OPER, 1) !== porActividades(OPER, 1), 'los dos métodos difieren: por eso no cuadraba');

console.log('\n── Más semanas, contra el Excel ──');
ok(esperado(DOC, 2) === 40.0,  `Documentación en S2: ${esperado(DOC, 2)}% (Excel E16 = 40.002)`);
ok(esperado(DOC, 3) === 66.7,  `Documentación en S3: ${esperado(DOC, 3)}% (Excel F16 = 66.67)`);
ok(esperado(DOC, 5) === 100.0, `Documentación en S5: ${esperado(DOC, 5)}% (Excel H16 = 100.005)`);
ok(esperado(OPER, 2) === 50.0, `Componentes ADA en S2: ${esperado(OPER, 2)}% (Excel E24 = 49.998)`);
ok(esperado(OPER, 6) === 83.3, `Componentes ADA en S6: ${esperado(OPER, 6)}% (Excel I24 = 83.33)`);
ok(esperado(OPER, 7) === 100.0,`Componentes ADA en S7: ${esperado(OPER, 7)}% (Excel J24 = 99.996)`);
ok(esperado(VALID, 6) === 15.4,`Validación en S6: ${esperado(VALID, 6)}% (Excel I36 = 15.384)`);
ok(esperado(VALID, 8) === 69.2,`Validación en S8: ${esperado(VALID, 8)}% (Excel K36 = 69.228)`);

console.log('\n── Nunca pasa de 100 ──');
ok(esperado(DOC, 14) === 100.0 && esperado(OPER, 14) === 100.0, 'al final todas cierran en 100%');

console.log(f === 0 ? '\nesperado por fase OK' : `\n${f} fallas`);
if (f) process.exit(1);
