// Estatus de la fábrica: el modelo tiene que reproducir el Excel de David.
//
// Cifras de referencia leídas de "Status Fábrica - Interno.xlsx", hoja Estatus Global.

import { PASOS, FASES, pasosDeFase, avance, faseActual, frenos,
         codigoProyecto, nombreProyecto, type ObjetoFabrica } from '../src/lib/fabrica';
import { readFileSync } from 'node:fs';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const objetos: ObjetoFabrica[] = JSON.parse(readFileSync('public/db.json','utf8')).timia_fabrica_objetos;

console.log('── Los datos del Excel ──');
ok(objetos.length === 55, `55 objetos (hay ${objetos.length})`);
ok(PASOS.length === 28, `28 pasos en el catálogo (hay ${PASOS.length})`);
ok(new Set(objetos.map(o => o.proyecto)).size === 14, '14 proyectos distintos');
ok(FASES.reduce((s, x) => s + pasosDeFase(x).length, 0) === 28, 'las 5 fases cubren los 28 pasos, sin solapes');
ok(new Set(PASOS.map(p => p.id)).size === 28, 'los ids de paso no se repiten');

const pasosUsados = new Set(objetos.flatMap(o => Object.keys(o.pasos)));
const catalogo = new Set(PASOS.map(p => p.id));
const huerfanos = [...pasosUsados].filter(p => !catalogo.has(p));
ok(huerfanos.length === 0, `ningún paso de los datos queda fuera del catálogo${huerfanos.length ? ': ' + huerfanos.slice(0,3) : ''}`);

console.log('\n── Reparto de estados, contra el Excel ──');
const est = objetos.reduce<Record<string,number>>((m,o) => (m[o.estado]=(m[o.estado]??0)+1, m), {});
ok(est['Finalizado'] === 25, `25 finalizados (hay ${est['Finalizado']})`);
ok(est['En curso'] === 10,   `10 en curso (hay ${est['En curso']})`);
ok(est['Bloqueado'] === 6,   `6 bloqueados (hay ${est['Bloqueado']})`);
ok(est['Por iniciar'] === 7, `7 por iniciar (hay ${est['Por iniciar']})`);

console.log('\n── El avance no cuenta los NA ──');
// Un objeto que no pasa por Kirby/Hammurabi/Control-M no puede quedarse eternamente por debajo del 100%
const finalizados = objetos.filter(o => o.estado === 'Finalizado');
const alCien = finalizados.filter(o => avance(o).pct === 100).length;
// Los que no llegan al 100% no son un fallo del cálculo: son objetos que David
// marcó Finalizado pero cuya última casilla sigue describiendo un problema
// ("Falla PROD datax no desplegado"). Eso debe seguir viéndose, no taparse.
const sueltos = finalizados.filter(o => avance(o).pct < 100);
ok(sueltos.every(o => frenos(o).every(p => o.pasos[p.id]?.nota)),
   `${alCien} de ${finalizados.length} finalizados llegan al 100%; los ${sueltos.length} restantes tienen una nota de incidencia abierta`);
for (const o of sueltos) {
  const f = frenos(o)[0];
  console.log(`     ↳ ${o.objetoInsumo.slice(0,34)} · ${f.label}: ${o.pasos[f.id].nota}`);
}
const conNA = objetos.filter(o => Object.values(o.pasos).some(p => p.estado === 'na'));
ok(conNA.length > 0, `${conNA.length} objetos tienen pasos que no les aplican`);
const ej = conNA[0];
const a = avance(ej);
ok(a.aplican < 28, `ejemplo: a «${ej.objetoInsumo.slice(0,28)}» le aplican ${a.aplican} de 28 pasos`);

console.log('\n── Fase actual y frenos ──');
for (const o of objetos.filter(x => !['Finalizado','Desestimado'].includes(x.estado)).slice(0,4)) {
  const fa = faseActual(o), fr = frenos(o);
  const coherente = fr.every(p => pasosDeFase(fa).some(x => x.id === p.id));
  ok(coherente, `«${o.objetoInsumo.slice(0,26)}» está en ${fa}; sus frenos son de esa fase`);
}
const todos100 = objetos.filter(o => avance(o).pct === 100);
ok(todos100.every(o => frenos(o).length === 0), 'un objeto al 100% no tiene frenos');

console.log('\n── Nombres de proyecto ──');
ok(codigoProyecto('SDATOOL-51117 SDM1') === 'SDATOOL-51117', 'extrae el código del proyecto');
ok(nombreProyecto('SDATOOL-51117 SDM1') === 'SDM1', 'y el nombre sin el código');
ok(codigoProyecto('MURIC') === 'MURIC', 'un proyecto sin código SDATOOL se queda como está');

console.log(f === 0 ? '\nfábrica OK' : `\n${f} fallas`);
if (f) process.exit(1);
