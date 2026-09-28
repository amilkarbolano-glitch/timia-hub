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
  // Una plantilla de proyecto tiene 2+ fases: si tiene una sola es una fase y va en BLOQUES.
  const variasFases = pl.bloques.length >= 2;
  const ok = malas.length === 0 && cierra && cfg.totalWeeks > 0 && variasFases;
  if (!ok) pf++;
  if (!variasFases) console.log(`   "${pl.nombre}" tiene una sola fase: debería estar en BLOQUES, no en PLANTILLAS`);
  console.log(`${ok ? '✓' : '✗'} ${pl.nombre}: ${cfg.entregables.length} fases · ${acts.length} act · ${casillas} casillas · ${cfg.totalWeeks} semanas · cierra en ${(ser.acumulado[cfg.totalWeeks - 1] ?? 0).toFixed(1)}%`);
  if (malas.length) console.log(`   actividades mal secuenciadas: ${malas.map(m => m.label).join(', ')}`);
}
console.log(pf === 0 ? 'plantillas OK' : `plantillas: ${pf} fallas`);
if (pf) process.exit(1);

// ── Bloques como plantillas de entregable ──────────────────────────────────
import { BLOQUES, insertarBloque, resumenBloque } from '../src/lib/plantillas';

console.log('\n── Plantillas de entregable ──');
let bf = 0;
// Y ninguna fase debe aparecer también como plantilla de proyecto.
const dobles = BLOQUES.filter(b => PLANTILLAS.some(pl => pl.bloques.length === 1 && pl.bloques[0].id === b.id));
if (dobles.length) { console.log(`✗ aparecen en las dos pestañas: ${dobles.map(d => d.label).join(', ')}`); process.exit(1); }
console.log('✓ ninguna fase se repite como plantilla de proyecto');

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

// ── Visibilidad de plantillas: alcance y solicitudes ───────────────────────
import { puedeVerPlantilla, puedeEditarPlantilla, alcanceDe, type PlantillaPropia, type SolicitudPlantilla } from '../src/lib/adminStore';

console.log('\n── Visibilidad de plantillas ──');
{
  const base = { tipo: 'proyecto' as const, entregables: [], totalWeeks: 1, creadaEn: '' };
  const privJuan: PlantillaPropia = { ...base, id: 'p1', nombre: 'Privada de Juan', alcance: 'privada', ownerId: 'juan' };
  const compartida: PlantillaPropia = { ...base, id: 'p2', nombre: 'Compartida', alcance: 'compartida', ownerId: 'juan' };
  const vieja: PlantillaPropia = { ...base, id: 'p3', nombre: 'Sin alcance (legado)' };
  const aprobada: SolicitudPlantilla[] = [{
    id: 's1', plantillaId: 'p1', plantillaNombre: 'Privada de Juan', ownerId: 'juan',
    solicitanteId: 'amilkar', solicitanteNombre: 'Amilkar', estado: 'aprobada', creadaEn: '',
  }];
  const casos: [string, boolean, boolean][] = [
    ['Amilkar NO ve la privada de Juan', puedeVerPlantilla(privJuan, 'amilkar', 'pm', []), false],
    ['Amilkar SÍ ve la privada con acceso aprobado', puedeVerPlantilla(privJuan, 'amilkar', 'pm', aprobada), true],
    ['Juan ve su propia privada', puedeVerPlantilla(privJuan, 'juan', 'pm', []), true],
    ['El gerente de cuenta ve todo', puedeVerPlantilla(privJuan, 'rodolfo', 'account_manager', []), true],
    ['Cualquiera ve la compartida', puedeVerPlantilla(compartida, 'amilkar', 'pm', []), true],
    ['Una plantilla sin alcance es privada', alcanceDe(vieja) === 'privada', true],
    ['Pero una sin dueño la ve cualquiera (legado)', puedeVerPlantilla(vieja, 'amilkar', 'pm', []), true],
    ['Amilkar NO edita la de Juan', puedeEditarPlantilla(compartida, 'amilkar', 'pm'), false],
    ['Juan sí edita la suya', puedeEditarPlantilla(compartida, 'juan', 'pm'), true],
  ];
  let vf = 0;
  for (const [nombre, got, esp] of casos) {
    if (got !== esp) vf++;
    console.log(`${got === esp ? '✓' : '✗'} ${nombre}`);
  }
  console.log(vf === 0 ? 'visibilidad OK' : `visibilidad: ${vf} fallas`);
  if (vf) process.exit(1);
}

// ── Vista previa: construir el resultado antes de aplicarlo ────────────────
console.log('\n── Vista previa de plantillas ──');
{
  let pf = 0;
  // Agregar un bloque en la semana N: la fase nueva debe arrancar exactamente ahí
  // y las fases que ya estaban no se tocan.
  const actual = insertarBloque([], BLOQUES[0], 1);
  const antes = JSON.stringify(actual);
  for (const sem of [1, 5, 12]) {
    const res = insertarBloque(actual, BLOQUES[2], sem);
    const nueva = res[res.length - 1];
    const arranca = Math.min(...nueva.activities.map(a => a.startWeek));
    const intacto = JSON.stringify(res.slice(0, actual.length)) === antes;
    const ok = arranca === sem && intacto && res.length === actual.length + 1;
    if (!ok) pf++;
    console.log(`${ok ? '✓' : '✗'} agregar en S${sem}: la fase arranca en S${arranca}, las anteriores intactas (${intacto})`);
  }
  // Mover una fase guardada a otra semana conserva la forma (mismo nº de casillas y huecos)
  const base = insertarBloque([], BLOQUES[1], 1)[0];
  const delta = 7;
  const movida = base.activities.map(a => ({ ...a, startWeek: a.startWeek + delta, endWeek: a.endWeek + delta, weeks: (a.weeks ?? []).map(w => w + delta) }));
  const mismaForma = movida.every((a, i) =>
    (a.weeks?.length ?? 0) === (base.activities[i].weeks?.length ?? 0) &&
    a.startWeek === base.activities[i].startWeek + delta);
  if (!mismaForma) pf++;
  console.log(`${mismaForma ? '✓' : '✗'} mover una fase guardada +${delta} semanas conserva su forma`);
  console.log(pf === 0 ? 'vista previa OK' : `vista previa: ${pf} fallas`);
  if (pf) process.exit(1);
}

// ── Rango de semanas: el bug de los selects encadenados ────────────────────
// Elegir inicio S5 con fin S1 guardaba el rango invertido y la matriz lo
// normalizaba pintando S1–S5. Ahora los selects fijan el tramo completo.
console.log('\n── Rango de semanas ──');
{
  const conRango = (act: any, desde: number, hasta: number) => {
    const ini = Math.max(1, Math.min(desde, hasta));
    const fin = Math.max(desde, hasta);
    return { ...act, startWeek: ini, endWeek: fin, weeks: Array.from({ length: fin - ini + 1 }, (_, i) => ini + i) };
  };
  let rf = 0;
  const chk = (c: boolean, s: string) => { if (!c) rf++; console.log(`${c ? '✓' : '✗'} ${s}`); };

  // El caso reportado: actividad nueva (S1→S2) y se elige inicio S5.
  let a: any = { label: 'x', startWeek: 1, endWeek: 2 };
  a = conRango(a, 5, Math.max(a.endWeek, 5));
  chk(a.startWeek === 5 && a.endWeek === 5, 'elegir inicio S5 deja el tramo en S5–S5');
  chk(_marcasDe(a).join(',') === '5', `la matriz pinta solo S5 (pinta: ${_marcasDe(a).join(',')})`);

  // Extender el fin a S8
  a = conRango(a, Math.min(a.startWeek, 8), 8);
  chk(_marcasDe(a).join(',') === '5,6,7,8', 'extender el fin a S8 pinta S5–S8');

  // Elegir un fin anterior al inicio ordena los extremos
  a = conRango(a, Math.min(a.startWeek, 3), 3);
  chk(a.startWeek === 3 && a.endWeek === 3, 'elegir fin S3 con inicio S5 deja S3–S3');
  console.log(rf === 0 ? 'rango de semanas OK' : `rango: ${rf} fallas`);
  if (rf) process.exit(1);
}

// ── Densidad de la matriz: elegir el tamaño según el ancho disponible ───────
console.log('\n── Densidad de la matriz ──');
{
  const ZOOM = {
    compacto: { cell: 24, label: 260 },
    normal:   { cell: 34, label: 340 },
    amplio:   { cell: 46, label: 420 },
  } as const;
  type Z = keyof typeof ZOOM;
  const elegir = (disp: number, semanas: number): Z => {
    const cabe = (z: Z) => ZOOM[z].label + ZOOM[z].cell * semanas + 24 <= disp;
    return cabe('amplio') ? 'amplio' : cabe('normal') ? 'normal' : 'compacto';
  };
  let df = 0;
  const c = (got: string, esp: string, s: string) => { if (got !== esp) df++; console.log(`${got === esp ? '✓' : '✗'} ${s} → ${got}`); };

  // El caso reportado: 1685px de contenedor, 24 semanas. Antes quedaba en normal
  // y sobraban 528px.
  c(elegir(1685, 24), 'amplio',   '1685px con 24 semanas (monitor 1920)');
  c(elegir(1180, 24), 'normal',   '1180px con 24 semanas (portátil 1366)');
  c(elegir(900, 24),  'compacto', '900px con 24 semanas (pantalla chica)');
  // 40 semanas en normal pedirían 1724px y solo hay 1685: baja a compacto para
  // que el plan entre entero en vez de obligar a scrollear.
  c(elegir(1685, 40), 'compacto', '1685px con 40 semanas (plan largo)');
  c(elegir(1685, 8),  'amplio',   '1685px con 8 semanas (plan corto)');

  // Nunca debe elegir un tamaño que desborde
  const sinDesborde = [[1685,24],[1180,24],[900,24],[1685,40],[2400,52]].every(([d, s]) => {
    const z = elegir(d, s);
    return z === 'compacto' || ZOOM[z].label + ZOOM[z].cell * s + 24 <= d;
  });
  if (!sinDesborde) df++;
  console.log(`${sinDesborde ? '✓' : '✗'} el tamaño elegido nunca desborda el contenedor`);
  console.log(df === 0 ? 'densidad OK' : `densidad: ${df} fallas`);
  if (df) process.exit(1);
}
