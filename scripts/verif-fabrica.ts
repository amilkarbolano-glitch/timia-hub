// Estatus de la fábrica: el modelo tiene que reproducir el Excel de David.
//
// Cifras de referencia leídas de "Status Fábrica - Interno.xlsx", hoja Estatus Global.

import { PASOS_SEMILLA as PASOS, fases, pasosDeFase, avance, faseActual, frenos, nuevoId, mover,
         duracion, fechaCol, codigoProyecto, nombreProyecto,
         type ObjetoFabrica, type PasoCatalogo } from '../src/lib/fabrica';

// El catálogo vive en la base; en pruebas se pasa explícito para no depender
// de lo que haya guardado el navegador.
const FASES = fases(PASOS);
import { readFileSync } from 'node:fs';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const objetos: ObjetoFabrica[] = JSON.parse(readFileSync('public/db.json','utf8')).timia_fabrica_objetos;

console.log('── Los datos del Excel ──');
ok(objetos.length === 55, `55 objetos (hay ${objetos.length})`);
ok(PASOS.length === 26, `26 pasos en el catálogo (hay ${PASOS.length})`);
ok(pasosDeFase('Gobierno', PASOS)[0].id === 'generaci-n-diccionario',
   'Gobierno arranca en Generación Diccionario, no en lo que pasa antes de la fábrica');
ok(PASOS.some(p => p.id === 'despliegue-a-work'), 'existe el paso Despliegue a Work');
ok(PASOS.findIndex(p => p.id === 'despliegue-a-work') < PASOS.findIndex(p => p.id === 'pruebas-en-work'),
   'y va antes de Pruebas en Work: primero se despliega, luego se prueba');
ok(new Set(objetos.map(o => o.proyecto)).size === 14, '14 proyectos distintos');
ok(FASES.reduce((s, x) => s + pasosDeFase(x, PASOS).length, 0) === 26, 'las 5 fases cubren los 26 pasos, sin solapes');
ok(new Set(PASOS.map(p => p.id)).size === 26, 'los ids de paso no se repiten');

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
ok(a.aplican < 26, `ejemplo: a «${ej.objetoInsumo.slice(0,28)}» le aplican ${a.aplican} de 26 pasos`);

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
ok(conNuevo.length === 27 && conNuevo[26].id === 'cierre-formal', 'se agrega un paso con id derivado del nombre');
// Consecuencia de que un paso sin marcar cuente como pendiente: agregar un
// paso al catálogo baja el % de todos, porque es trabajo que nadie ha hecho.
// Es correcto, pero conviene saberlo antes de agregar uno con los 55 cargados.
ok(objetos.every(o => avance(o, undefined, conNuevo).pct <= avance(o, undefined, PASOS).pct),
   'agregar un paso al catálogo baja el % de los objetos: es trabajo nuevo que nadie hizo');
ok(objetos.some(o => avance(o, undefined, conNuevo).pct < avance(o, undefined, PASOS).pct),
   'y se nota de verdad, no es un cambio cosmético');

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


console.log('\n── Los botones Iniciado / Finalizado ──');
// Réplica de marcarInicio/marcarFin/marcarNA del panel. Antes el estado se
// rotaba con un solo clic y al desmarcar un paso hecho quedaba en «pendiente»
// con la fecha de cierre puesta; eso es lo que estos checks impiden que vuelva.
type P = { estado: string; inicio?: string; fecha?: string; nota?: string; link?: string } | null;
const HOY = '21/10/2026';

function inicio(v: P): P {
  if (v?.inicio) {
    const r = { ...v, inicio: undefined };
    return v.estado === 'ok' ? r : (r.nota || r.link ? { ...r, estado: 'pte' } : null);
  }
  return { ...(v ?? {}), estado: v?.estado === 'ok' ? 'ok' : 'pte', inicio: HOY };
}
function fin(v: P): P {
  if (v?.estado === 'ok') {
    const r = { ...v, estado: 'pte', fecha: undefined };
    return r.inicio || r.nota || r.link ? r : null;
  }
  return { ...(v ?? {}), estado: 'ok', fecha: v?.fecha ?? HOY };
}
const na = (v: P): P => v?.estado === 'na' ? null : { estado: 'na', nota: v?.nota, link: v?.link };

ok(inicio(null)?.estado === 'pte' && inicio(null)?.inicio === HOY, 'Iniciado pone pendiente con la fecha de hoy');
ok(fin(null)?.estado === 'ok' && fin(null)?.fecha === HOY, 'Finalizado pone hecho con la fecha de hoy');
ok(fin(null)?.inicio === undefined, 'finalizar sin haber iniciado no inventa una fecha de inicio');

// El caso que confundió al jefe: desmarcar dejaba naranja y con fecha de fin.
const hecho = fin(inicio(null));
ok(hecho?.estado === 'ok' && hecho?.inicio === HOY && hecho?.fecha === HOY, 'iniciar y finalizar deja las dos fechas');
const desmarcado = fin(hecho);
ok(desmarcado?.estado === 'pte', 'quitar Finalizado lo devuelve a iniciado');
ok(desmarcado?.fecha === undefined, 'y borra la fecha de fin, que era lo que confundía');
ok(desmarcado?.inicio === HOY, 'pero conserva la fecha de inicio');

ok(fin(fin(null)) === null, 'poner y quitar Finalizado sin más datos deja el paso limpio');
ok(inicio(inicio(null)) === null, 'poner y quitar Iniciado deja el paso limpio');
ok(inicio(hecho)?.estado === 'ok', 'quitar Iniciado en un paso finalizado no lo desfinaliza');

// Una nota no se pierde por apagar un botón: es lo único que no se puede rehacer.
const conNota: P = { estado: 'pte', inicio: HOY, nota: 'esperando al banco' };
ok(inicio(conNota)?.nota === 'esperando al banco', 'quitar Iniciado conserva la nota');
ok(na(conNota)?.nota === 'esperando al banco', 'marcar N/A conserva la nota');

ok(na(null)?.estado === 'na', 'N/A marca el paso como no aplicable');
ok(na({ estado:'ok', fecha: HOY })?.fecha === undefined, 'N/A borra las fechas: un paso que no se hace no tiene cuándo');
ok(na({ estado:'na' }) === null, 'volver a pulsar N/A lo deja sin marcar');

console.log('\n── Una fase vacía no es una fase superada ──');
// Lo que reportó David: marcaba los 4 pasos de Gobierno y el objeto saltaba a
// Producción. La causa: una fase sin ninguna marca daba aplican=0, y faseActual
// la saltaba como si no aplicara, cayendo hasta la última. Un objeto recién
// creado aparecía en Producción desde el primer día.
function nuevo(): ObjetoFabrica {
  return { id:'t', proyecto:'P', objetoInsumo:'t', objeto:'', responsable:'', contactoBanco:'',
           periodicidad:'', estado:'Por iniciar', comentarios:'', fechaRecepcion:'', pasos:{} };
}
ok(faseActual(nuevo(), PASOS) === 'Gobierno', 'un objeto recién creado está en Gobierno, no en Producción');
ok(avance(nuevo(), undefined, PASOS).pct === 0, 'y va en 0%');
ok(avance(nuevo(), undefined, PASOS).aplican === 26, 'con los 26 pasos por delante, no con cero');

const conGobierno = nuevo();
for (const p of pasosDeFase('Gobierno', PASOS)) conGobierno.pasos[p.id] = { estado: 'ok' };
ok(faseActual(conGobierno, PASOS) === 'Desarrollo', 'terminar Gobierno lleva a Desarrollo, no a Producción');
const aG = avance(conGobierno, undefined, PASOS);
ok(aG.pct === 15, `con Gobierno hecho va en ${aG.pct}%, no en 100% (4 de 26)`);
ok(frenos(conGobierno, PASOS).length === 6, 'y los frenos son los 6 pasos de Desarrollo, aunque nadie los haya tocado');

// Una fase entera en NA sí se salta: ese objeto no pasa por ahí.
const saltaDesarrollo = nuevo();
for (const p of pasosDeFase('Gobierno', PASOS))   saltaDesarrollo.pasos[p.id] = { estado: 'ok' };
for (const p of pasosDeFase('Desarrollo', PASOS)) saltaDesarrollo.pasos[p.id] = { estado: 'na' };
ok(faseActual(saltaDesarrollo, PASOS) === 'Pruebas',
   'una fase marcada entera como no aplica sí se salta: esa es la diferencia con estar vacía');

console.log('\n── Las cifras del Excel no se mueven ──');
// Los blancos del Excel se congelaron como NA al cargar, así que el % que
// David reporta sigue siendo el mismo pese al cambio de cálculo.
const finali = objetos.filter(o => o.estado === 'Finalizado');
ok(finali.filter(o => avance(o, undefined, PASOS).pct === 100).length === 23,
   '23 de 25 finalizados siguen al 100%, igual que antes del cambio');
ok(Math.round(objetos.reduce((s,o) => s + avance(o, undefined, PASOS).pct, 0) / objetos.length) === 87,
   'el avance medio de los 55 sigue en 87%');
ok(objetos.every(o => Object.keys(o.pasos).length === 26),
   'los 55 objetos tienen los 26 pasos resueltos, sin casillas en blanco');

console.log(f ? `\n${f} fallas` : '\nfábrica OK');
