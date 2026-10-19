// El % manual manda sobre el que calculan las subtareas.
//
// Antes, una actividad con etapas ignoraba el valor puesto a mano: la suma de
// pesos era una camisa de fuerza y para llegar a la cifra real había que inventar
// marcas en las subtareas. Ahora el manual gana y se puede deshacer.

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

type Etapa = { id: string; peso: number };
type Act = { pct: number; etapas?: Etapa[] };

/** Réplica de la lógica de PlanDeTrabajo.getActivityPct */
function calcular(act: Act, marcadas: Set<string>, manual: number | undefined, tocado: boolean): number {
  if (manual !== undefined) return manual;                       // el manual manda
  if (act.etapas?.length && tocado) {
    return Math.min(100, act.etapas.reduce((s, e) => s + (marcadas.has(e.id) ? e.peso : 0), 0));
  }
  return act.pct;
}

const spark: Act = { pct: 0, etapas: [
  { id: 'spark-1', peso: 10 }, { id: 'spark-2', peso: 40 }, { id: 'spark-3', peso: 20 },
  { id: 'spark-4', peso: 20 }, { id: 'spark-5', peso: 10 }] };

console.log('── Actividad con subtareas ──');
ok(calcular(spark, new Set(), undefined, false) === 0, 'sin tocar nada parte del valor del plan (0%)');
ok(calcular(spark, new Set(['spark-1','spark-2']), undefined, true) === 50,
   'marcando ambientación + clases principales da 50% (10+40)');
ok(calcular(spark, new Set(['spark-1','spark-2']), 65, true) === 65,
   'el % puesto a mano (65) manda sobre el calculado (50)');
ok(calcular(spark, new Set(['spark-1','spark-2']), undefined, true) === 50,
   'al quitar el manual vuelve al calculado (50)');
ok(calcular(spark, new Set(), 35, false) === 35,
   'se puede fijar a mano aunque no se haya tocado ninguna subtarea');
ok(calcular(spark, new Set(['spark-1','spark-2','spark-3','spark-4','spark-5']), undefined, true) === 100,
   'todas marcadas dan 100%');
ok(calcular(spark, new Set(['spark-1','spark-2','spark-3','spark-4','spark-5']), 90, true) === 90,
   'y aun así el manual puede dejarlo en 90');

console.log('\n── Actividad sin subtareas (como siempre) ──');
const simple: Act = { pct: 20 };
ok(calcular(simple, new Set(), undefined, false) === 20, 'sin manual, el valor del plan');
ok(calcular(simple, new Set(), 70, false) === 70, 'con manual, el manual');

console.log('\n── El caso que lo motivó ──');
// 3 de 5 subtareas marcadas = 70%, pero el líder sabe que va por 60
const real = calcular(spark, new Set(['spark-1','spark-2','spark-3']), undefined, true);
ok(real === 70, `las subtareas dicen ${real}% (10+40+20)`);
ok(calcular(spark, new Set(['spark-1','spark-2','spark-3']), 60, true) === 60,
   'pero el líder puede dejarlo en 60 sin desmarcar nada');

console.log(f === 0 ? '\n% manual OK' : `\n${f} fallas`);
if (f) process.exit(1);
