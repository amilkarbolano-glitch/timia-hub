// Comprobación de tipos que sí se puede mirar.
//
// `tsc --noEmit` lleva 20 errores heredados (el ruido de React 19 con la prop `key`
// y tres conversiones de CSSStyleDeclaration), así que estaba siempre en rojo y
// nadie lo leía. Costó un bug real: planTablero creaba las tarjetas con
// priority:'media' en vez de 'Media' y eso dejaba el tablero en blanco. tsc lo
// decía — "Did you mean 'Media'?" — pero el aviso estaba enterrado.
//
// Esto fija la foto conocida y falla solo si aparece algo nuevo. Al arreglar
// alguno de los heredados, baja el número aquí.

import { execSync } from 'node:child_process';

/** Errores que ya estaban y no son de este trabajo. Bajar al arreglarlos. */
const HEREDADOS: { patron: RegExp; cuantos: number; nota: string }[] = [
  { patron: /TS2322.*Property 'key' does not exist/s, cuantos: 16,
    nota: "React 19: `key` no va en el tipo de props; es ruido del JSX, no un fallo real" },
  { patron: /TS2352.*CSSStyleDeclaration/s, cuantos: 3,
    nota: 'PlanDeTrabajo convierte CSSStyleDeclaration a Record<string,string> al exportar a PPTX' },
  { patron: /TS2339.*'env' does not exist on type 'ImportMeta'/s, cuantos: 1,
    nota: 'adminStore lee import.meta.env sin los tipos de Vite cargados' },
];

let salida = '';
try {
  execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
} catch (e: any) {
  salida = (e.stdout ?? '') + (e.stderr ?? '');
}

// tsc parte los errores en varias líneas; se agrupan por la línea que abre con el archivo
const errores = salida.split('\n').reduce<string[]>((acc, linea) => {
  if (/^\S.*\(\d+,\d+\): error TS/.test(linea)) acc.push(linea);
  else if (acc.length && linea.trim()) acc[acc.length - 1] += '\n' + linea;
  return acc;
}, []);

const nuevos: string[] = [];
const cuenta = HEREDADOS.map(h => ({ ...h, visto: 0 }));

for (const err of errores) {
  const h = cuenta.find(x => x.patron.test(err));
  if (h) h.visto++;
  else nuevos.push(err);
}

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

console.log(`${errores.length} errores de tipos en total\n`);
for (const h of cuenta) {
  ok(h.visto <= h.cuantos, `heredados: ${h.visto}/${h.cuantos} — ${h.nota}`);
  if (h.visto < h.cuantos) console.log(`  ↳ bajaron a ${h.visto}: actualiza el número en scripts/verif-tipos.ts`);
}

ok(nuevos.length === 0, nuevos.length === 0
  ? 'ningún error de tipos nuevo'
  : `${nuevos.length} error(es) de tipos nuevos`);
if (nuevos.length) {
  console.log('');
  nuevos.forEach(n => console.log('  ' + n.replace(/\n/g, '\n  ')));
}

console.log(f === 0 ? '\ntipos OK' : `\n${f} fallas`);
if (f) process.exit(1);
