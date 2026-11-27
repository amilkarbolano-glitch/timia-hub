// El signo de la diferencia.
//
// Un «+0.0%» es ruido: el más no dice nada que el número no diga ya. El signo
// está para avisar, así que solo lo lleva el negativo. Y como esa diferencia
// se pinta en cinco sitios —la lámina, el correo, el plan, el tablero y el
// estado del banco—, aquí se comprueba además que ninguno se la invente por
// su cuenta.

import { readFileSync, readdirSync } from 'node:fs';
import { difTexto } from '../src/lib/utils';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

console.log('── Cómo se escribe la diferencia ──');
ok(difTexto(0) === '0.0%',      'cero no lleva signo');
ok(difTexto(3.5) === '3.5%',    'positivo tampoco');
ok(difTexto(-3.5) === '-3.5%',  'negativo sí: para eso está');
ok(difTexto(-0.04) === '0.0%',  'un negativo que redondea a cero no sale como «-0.0%»');
ok(difTexto(12.34) === '12.3%', 'redondea a un decimal');
ok(difTexto(12.34, 0) === '12%', 'y acepta otra precisión');
ok(difTexto(-3.5, 1, true) === '−3.5%', 'con el menos tipográfico cuando se pide, para alinear en el deck');
ok(difTexto(3.5, 1, true) === '3.5%',   'que tampoco aparece en el positivo');

console.log('\n── Nadie se la escribe por su cuenta ──');
const fuentes = ['src/lib', 'src/components']
  .flatMap(d => readdirSync(d).filter(n => /\.tsx?$/.test(n)).map(n => `${d}/${n}`))
  .filter(p => !p.endsWith('utils.ts'));

const sospechosos = fuentes.filter(p => /\?\s*'\+'|\?\s*"\+"/.test(readFileSync(p, 'utf8')));
ok(sospechosos.length === 0,
   sospechosos.length ? `siguen anteponiendo el «+» a mano: ${sospechosos.join(', ')}` : 'ningún archivo antepone el «+» a mano');

console.log(f ? `\n✗ ${f} fallo(s)` : '\nsigno OK');
process.exit(f ? 1 : 0);
