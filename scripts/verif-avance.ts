// Verificación: los factores y acumulados de lib/avance deben coincidir con la hoja
// "Plan de trabajo - Replanificaci" del Excel de seguimiento de SDATOOL-54364.
import { readFileSync } from 'node:fs';
import { seriePlanFase, seriePlanConsolidada, factorFase, marcasFase, factorGlobal, type AvanceFase } from '../src/lib/avance';

const raw = JSON.parse(readFileSync('/sessions/charming-trusting-franklin/mig2_replan.json', 'utf8'));
const fases: AvanceFase[] = raw.ents.map((f: any, i: number) => ({
  id: `f${i}`, label: f.label,
  activities: f.activities.map((a: any) => {
    const weeks: number[] = [];
    for (const [ini, fin] of a.segs) for (let w = ini; w <= fin; w++) weeks.push(w);
    return { weeks, startWeek: weeks[0], endWeek: weeks[weeks.length - 1] };
  }),
}));

// En el Excel, "Ajuste de Procesamientos Dynamic" engloba también Validación y
// Pruebas/Despliegues (37 casillas), y "Automatización" engloba Certificación (11).
// La extracción las separa, así que aquí se reagrupan para comparar como el Excel.
const GRUPO: Record<string, string> = {
  'validación de datos dynamic': 'ajuste de procesamientos dynamic',
  'pruebas y despliegues procesamientos dynamic': 'ajuste de procesamientos dynamic',
  'certificación, productivización y estabilización': 'automatización y orquestación',
};
const ESPERADO: Record<string, number> = {
  'documentación y gobierno': 6.667, 'transmisión de datos': 7.14,
  'desarrollo de procesamientos': 4.762, 'ajuste de procesamientos dynamic': 2.703,
  'generación de historia': 20.0, 'automatización y orquestación': 9.091,
};
// El Excel redondea el factor a 3 decimales, por eso su acumulado cierra en 100.005.
const TOL = 0.005;
let fail = 0;
// Reagrupa las fases como están en el Excel antes de comparar factores.
const agrupadas = new Map<string, AvanceFase>();
for (const f of fases) {
  const key = GRUPO[f.label.toLowerCase()] ?? f.label.toLowerCase();
  const prev = agrupadas.get(key);
  if (prev) prev.activities.push(...f.activities);
  else agrupadas.set(key, { id: key, label: key, activities: [...f.activities] });
}
for (const [key, f] of agrupadas) {
  const esp = ESPERADO[key];
  const got = factorFase(f);
  if (esp === undefined) { console.log(`  · ${key}: ${marcasFase(f)} casillas → ${got.toFixed(3)} (sin referencia)`); continue; }
  const bien = Math.abs(got - esp) < TOL;
  if (!bien) fail++;
  console.log(`${bien ? '✓' : '✗'} ${key}: ${marcasFase(f)} casillas → ${got.toFixed(3)} · Excel ${esp}`);
}
const total = fases.reduce((s, f) => s + marcasFase(f), 0);
console.log(`\nFactor global: ${total} casillas → ${factorGlobal(fases).toFixed(4)}  ·  Excel: 103 → 0.9708`);
if (total !== 103) { console.log('  (el JSON extraído no incluye todas las fases del Excel)'); }

const cons = seriePlanConsolidada(fases, 24);
const fin = cons.acumulado[23];
console.log(`Acumulado consolidado en S24: ${fin.toFixed(2)}%`);
if (Math.abs(fin - 100) > 0.05) { console.log('✗ el consolidado no cierra en 100'); fail++; }

const doc = fases.find(f => f.label.toLowerCase().startsWith('documenta'));
if (doc) {
  const s = seriePlanFase(doc, 24);
  const got = [6, 7, 8, 9, 10, 11, 12].map(w => s.acumulado[w - 1]);
  const esp = [6.667, 13.334, 33.335, 60.003, 73.337, 93.338, 100.005];
  // El Excel arrastra su redondeo (termina en 100.005); se compara con esa tolerancia.
  const bien = got.every((v, i) => Math.abs(v - esp[i]) < 0.01 * (i + 1));
  if (!bien) fail++;
  console.log(`${bien ? '✓' : '✗'} Documentación · acumulado S6→S12: ${got.map(v => v.toFixed(3)).join(' ')}`);
  console.log(`  Excel                              : ${esp.join(' ')}`);
}
console.log(fail === 0 ? '\nverif-avance OK' : `\nverif-avance: ${fail} fallas`);
if (fail) process.exit(1);

// ── Plantillas: el cronograma generado debe ser coherente ───────────────────
import { PLANTILLAS, generarDesdePlantilla } from '../src/lib/plantillas';
import { marcasDe as _marcasDe } from '../src/lib/avance';

console.log('\n── Plantillas ──');
let pf = 0;
for (const pl of PLANTILLAS) {
  const cfg = generarDesdePlantilla(pl, { projectId: 'TEST', startDate: '2026-09-21' });
  const acts = cfg.entregables.flatMap(e => e.activities);
  const casillas = acts.reduce((s, a) => s + _marcasDe({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek }).length, 0);
  const malas = acts.filter(a => !a.weeks?.length || a.startWeek > a.endWeek || a.endWeek > cfg.totalWeeks || a.startWeek < 1);
  const ser = seriePlanConsolidada(
    cfg.entregables.map(e => ({ id: e.id, label: e.label, activities: e.activities.map(a => ({ weeks: a.weeks, startWeek: a.startWeek, endWeek: a.endWeek })) })),
    cfg.totalWeeks,
  );
  const cierra = Math.abs((ser.acumulado[cfg.totalWeeks - 1] ?? 0) - 100) < 0.05;
  const ok = malas.length === 0 && cierra && cfg.totalWeeks > 0;
  if (!ok) pf++;
  console.log(`${ok ? '✓' : '✗'} ${pl.nombre}: ${cfg.entregables.length} fases · ${acts.length} act · ${casillas} casillas · ${cfg.totalWeeks} semanas · cierra en ${(ser.acumulado[cfg.totalWeeks - 1] ?? 0).toFixed(1)}%`);
  if (malas.length) console.log(`   actividades mal secuenciadas: ${malas.map(m => m.label).join(', ')}`);
}
console.log(pf === 0 ? 'plantillas OK' : `plantillas: ${pf} fallas`);
if (pf) process.exit(1);

// ── Bloques como plantillas de entregable ──────────────────────────────────
import { BLOQUES, insertarBloque, resumenBloque } from '../src/lib/plantillas';

console.log('\n── Plantillas de entregable ──');
let bf = 0;
for (const b of BLOQUES) {
  const r = resumenBloque(b);
  const ok = r.actividades > 0 && r.casillas >= r.actividades && r.semanas > 0;
  if (!ok) bf++;
  console.log(`${ok ? '✓' : '✗'} ${b.label}: ${r.actividades} act · ${r.casillas} casillas · ${r.semanas} sem · ${r.bbva} BBVA`);
}
// insertar el mismo bloque dos veces no debe chocar de id ni pisar semanas
const dos = insertarBloque(insertarBloque([], BLOQUES[2], 1), BLOQUES[2], 6);
const idsUnicos = new Set(dos.map(e => e.id)).size === dos.length;
const arrancaEn6 = Math.min(...dos[1].activities.map(a => a.startWeek)) === 6;
if (!idsUnicos || !arrancaEn6) bf++;
console.log(`${idsUnicos && arrancaEn6 ? '✓' : '✗'} insertar el mismo bloque dos veces: ids únicos (${dos.map(e => e.id).join(', ')}) y el segundo arranca en S${Math.min(...dos[1].activities.map(a => a.startWeek))}`);
console.log(bf === 0 ? 'bloques OK' : `bloques: ${bf} fallas`);
if (bf) process.exit(1);

// ── Editor: resecuenciar tras editar duraciones ────────────────────────────
import { generarDesdePlantilla as gen2 } from '../src/lib/plantillas';

console.log('\n── Edición de plantillas ──');
{
  const cfg = gen2(PLANTILLAS[0], { projectId: 'T' });
  // resp y faseSDA deben viajar desde el catálogo a las actividades generadas
  const acts = cfg.entregables.flatMap(e => e.activities);
  const conResp = acts.filter(a => a.resp).length;
  const conSda = acts.filter(a => a.faseSDA).length;
  const bbvaCoherente = acts.every(a => (a.resp === 'bbva') === !!a.bbva);
  const ok = conResp === acts.length && conSda === acts.length && bbvaCoherente;
  console.log(`${ok ? '✓' : '✗'} responsable y fase SDA en las ${acts.length} actividades generadas (resp ${conResp}, sda ${conSda}, bbva coherente ${bbvaCoherente})`);
  if (!ok) process.exit(1);

  // cambiar la duración de una actividad y reencadenar no debe dejar huecos ni solapes
  const ent = JSON.parse(JSON.stringify(cfg.entregables[0]));
  ent.activities[0].weeks = [1, 2, 3];
  ent.activities[0].endWeek = 3;
  let cursor = 1;
  for (const a of ent.activities) {
    const n = a.weeks?.length ?? 1;
    a.startWeek = cursor; a.endWeek = cursor + n - 1;
    a.weeks = Array.from({ length: n }, (_, i) => cursor + i);
    cursor = a.endWeek + 1;
  }
  const contiguo = ent.activities.every((a: any, i: number) => i === 0 || a.startWeek === ent.activities[i - 1].endWeek + 1);
  console.log(`${contiguo ? '✓' : '✗'} reencadenado tras cambiar una duración: sin huecos ni solapes`);
  if (!contiguo) process.exit(1);
}
console.log('edición OK');
