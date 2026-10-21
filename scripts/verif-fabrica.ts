// Estatus de la fábrica: el modelo tiene que reproducir el Excel de David.
//
// Cifras de referencia leídas de "Status Fábrica - Interno.xlsx", hoja Estatus Global.

import { PASOS_SEMILLA as PASOS, fases, pasosDeFase, avance, faseActual, frenos, nuevoId, mover,
         codigoProyecto, nombreProyecto, type ObjetoFabrica, type PasoCatalogo } from '../src/lib/fabrica';

// El catálogo vive en la base; en pruebas se pasa explícito para no depender
// de lo que haya guardado el navegador.
const FASES = fases(PASOS);
import { readFileSync } from 'node:fs';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const objetos: ObjetoFabrica[] = JSON.parse(readFileSync('public/db.json','utf8')).timia_fabrica_objetos;

console.log('── Los datos del Excel ──');
ok(objetos.length === 55, `55 objetos (hay ${objetos.length})`);
ok(PASOS.length === 28, `28 pasos en el catálogo (hay ${PASOS.length})`);
ok(new Set(objetos.map(o => o.proyecto)).size === 14, '14 proyectos distintos');
ok(FASES.reduce((s, x) => s + pasosDeFase(x, PASOS).length, 0) === 28, 'las 5 fases cubren los 28 pasos, sin solapes');
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
const alCien = finalizados.filter(o => avance(o, undefined, PASOS).pct === 100).length;
// Los que no llegan al 100% no son un fallo del cálculo: son objetos que David
// marcó Finalizado pero cuya última casilla sigue describiendo un problema
// ("Falla PROD datax no desplegado"). Eso debe seguir viéndose, no taparse.
const sueltos = finalizados.filter(o => avance(o, undefined, PASOS).pct < 100);
ok(sueltos.every(o => frenos(o, PASOS).every(p => o.pasos[p.id]?.nota)),
   `${alCien} de ${finalizados.length} finalizados llegan al 100%; los ${sueltos.length} restantes tienen una nota de incidencia abierta`);
for (const o of sueltos) {
  const f = frenos(o, PASOS)[0];
  console.log(`     ↳ ${o.objetoInsumo.slice(0,34)} · ${f.label}: ${o.pasos[f.id].nota}`);
}
const conNA = objetos.filter(o => Object.values(o.pasos).some(p => p.estado === 'na'));
ok(conNA.length > 0, `${conNA.length} objetos tienen pasos que no les aplican`);
const ej = conNA[0];
const a = avance(ej, undefined, PASOS);
ok(a.aplican < 28, `ejemplo: a «${ej.objetoInsumo.slice(0,28)}» le aplican ${a.aplican} de 28 pasos`);

console.log('\n── Fase actual y frenos ──');
for (const o of objetos.filter(x => !['Finalizado','Desestimado'].includes(x.estado)).slice(0,4)) {
  const fa = faseActual(o, PASOS), fr = frenos(o, PASOS);
  const coherente = fr.every(p => pasosDeFase(fa, PASOS).some(x => x.id === p.id));
  ok(coherente, `«${o.objetoInsumo.slice(0,26)}» está en ${fa}; sus frenos son de esa fase`);
}
const todos100 = objetos.filter(o => avance(o, undefined, PASOS).pct === 100);
ok(todos100.every(o => frenos(o, PASOS).length === 0), 'un objeto al 100% no tiene frenos');

console.log('\n── Nombres de proyecto ──');
ok(codigoProyecto('SDATOOL-51117 SDM1') === 'SDATOOL-51117', 'extrae el código del proyecto');
ok(nombreProyecto('SDATOOL-51117 SDM1') === 'SDM1', 'y el nombre sin el código');
ok(codigoProyecto('MURIC') === 'MURIC', 'un proyecto sin código SDATOOL se queda como está');

if (f) process.exit(1);

console.log('\n── El catálogo es editable sin perder datos ──');
// Lo que importa aquí: David puede cambiar el proceso y lo ya marcado sigue valiendo.

// Renombrar conserva el id, que es de donde cuelgan los datos de los objetos.
const renombrado: PasoCatalogo[] = PASOS.map(p =>
  p.id === 'msd' ? { ...p, label: 'MSD (nuevo nombre)' } : p);
const conMsd = objetos.filter(o => o.pasos['msd']);
ok(conMsd.every(o => avance(o, undefined, renombrado).pct === avance(o, undefined, PASOS).pct),
   `renombrar un paso no mueve el avance de los ${conMsd.length} objetos que lo tienen marcado`);

// Agregar un paso al final: nadie lo tiene marcado, así que nadie cambia.
const conNuevo: PasoCatalogo[] = [...PASOS, { id: nuevoId('Cierre formal', PASOS), label:'Cierre formal', fase:'Producción' }];
ok(conNuevo.length === 29 && conNuevo[28].id === 'cierre-formal', 'se agrega un paso con id derivado del nombre');
ok(objetos.every(o => avance(o, undefined, conNuevo).pct === avance(o, undefined, PASOS).pct),
   'un paso nuevo que nadie marcó no altera ningún avance');

// Un id repetido se desambigua en vez de pisar al existente.
ok(nuevoId('MSD', PASOS) === 'msd-2', 'un nombre que ya existe recibe un id distinto, no pisa al otro');
ok(nuevoId('Certificación Spark', PASOS) === 'certificacion-spark',
   'el id nuevo normaliza acentos (y no choca con el id viejo del Excel)');

// Quitar un paso descuenta solo ese.
const sinSpark = PASOS.filter(p => p.id !== 'certificaci-n-spark');
const conSpark = objetos.filter(o => o.pasos['certificaci-n-spark'] &&
                                     o.pasos['certificaci-n-spark'].estado !== 'na');
ok(conSpark.length > 0 && conSpark.every(o =>
     avance(o, undefined, sinSpark).aplican === avance(o, undefined, PASOS).aplican - 1),
   `quitar un paso descuenta exactamente uno en los ${conSpark.length} objetos que lo tenían`);

console.log('\n── Reordenar y mover de fase ──');
const bajado = mover(PASOS, 'msd', -1);   // MSD es el último de Gobierno
ok(bajado.findIndex(p => p.id === 'msd') === PASOS.findIndex(p => p.id === 'msd') - 1,
   'subir un paso lo intercambia con el anterior de su fase');
const sacado = mover(PASOS, 'msd', 1);    // justo después empieza Desarrollo
ok(sacado.find(p => p.id === 'msd')!.fase === 'Desarrollo',
   'bajar el último paso de una fase lo pasa a la fase siguiente');
ok(mover(PASOS, 'vobo-gob-funcional', -1) === PASOS, 'el primer paso no se puede subir más');
ok(mover(PASOS, 'post-prod', 1) === PASOS, 'el último paso no se puede bajar más');

// Las fases salen del orden de los pasos, así que una fase nueva aparece sola.
const conFase: PasoCatalogo[] = [...PASOS, { id:'soporte-1', label:'Primer mes', fase:'Soporte' }];
ok(fases(conFase).join() === [...FASES, 'Soporte'].join(), 'una fase nueva aparece al final, sin configurarla aparte');
ok(faseActual({ ...objetos.find(o => avance(o, undefined, PASOS).pct === 100)!, pasos:
     { ...objetos.find(o => avance(o, undefined, PASOS).pct === 100)!.pasos, 'soporte-1': { estado:'pte' } } },
   conFase) === 'Soporte',
   'un objeto terminado pasa a la fase nueva cuando se le marca un paso ahí');

console.log(f ? `\n${f} fallas` : '\nfábrica OK');
