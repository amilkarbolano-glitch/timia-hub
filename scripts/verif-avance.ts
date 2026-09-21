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
process.exit(fail === 0 ? 0 : 1);
