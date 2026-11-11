// Ver el plan como estaba en una fecha pasada.
//
// La presentación siempre es una foto a cierto corte, y hasta ahora el plan
// solo sabía cómo estaba hoy: la foto de la semana pasada no se podía volver a
// sacar. Con el registro de movimientos sí — deshaciendo desde hoy hacia atrás.
//
// Lo que más se prueba aquí es lo que NO debe hacer: inventar un día del que no
// tiene datos.

import { readFileSync } from 'node:fs';
import {
  nuevoCambio, pctsEnFecha, finDelDia, alcanzaElHistorial, desdeCuando,
  ultimoMovimiento, cambiosDelDia, diasConCambios, type CambioPct,
} from '../src/lib/historialPlan';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const K1 = 'MIGBD-documentaci-n--0';   // Diagnóstico experto
const K2 = 'MIGBD-documentaci-n--7';   // Solicitud y circuito de ACLs
const cuando = (iso: string) => `${iso}T15:00:00.000-05:00`;

// Una historia pequeña y real: el diagnóstico sube 0 → 50 → 80, y ACLs se marca
// al 100% el día 9.
const historial: CambioPct[] = [
  nuevoCambio(K1, 'MIGBD', undefined, 50, 'Amilkar', cuando('2026-11-02')),
  nuevoCambio(K2, 'MIGBD', undefined, 100, 'David',  cuando('2026-11-09')),
  nuevoCambio(K1, 'MIGBD', 50, 80, 'Amilkar',        cuando('2026-11-10')),
];
const hoy = { [K1]: 80, [K2]: 100 };

console.log('── Reconstruir una fecha ──');
const al10 = pctsEnFecha(hoy, historial, finDelDia('2026-11-10'));
ok(al10[K1] === 80 && al10[K2] === 100, 'el 10 por la noche: 80 y 100, como hoy');

const al9 = pctsEnFecha(hoy, historial, finDelDia('2026-11-09'));
ok(al9[K1] === 50, `el 9 el diagnóstico iba por 50, no por 80 (${al9[K1]})`);
ok(al9[K2] === 100, 'y ACLs ya estaba marcado ese día');

const al8 = pctsEnFecha(hoy, historial, finDelDia('2026-11-08'));
ok(al8[K1] === 50, 'el 8 el diagnóstico seguía en 50');
ok(!(K2 in al8), 'y ACLs no tenía valor: el día 8 nadie lo había tocado');

const al1 = pctsEnFecha(hoy, historial, finDelDia('2026-11-01'));
ok(Object.keys(al1).length === 0, 'antes del primer cambio no hay ningún % propio');

console.log('\n── Varios saltos en el mismo día ──');
// Si una actividad se mueve tres veces en una tarde, el corte del día anterior
// tiene que devolver el valor de antes de las tres, no el de en medio.
const mismoDia: CambioPct[] = [
  nuevoCambio(K1, 'MIGBD', 10, 20, 'A', '2026-11-10T09:00:00.000-05:00'),
  nuevoCambio(K1, 'MIGBD', 20, 60, 'A', '2026-11-10T13:00:00.000-05:00'),
  nuevoCambio(K1, 'MIGBD', 60, 80, 'A', '2026-11-10T17:00:00.000-05:00'),
];
ok(pctsEnFecha({ [K1]: 80 }, mismoDia, finDelDia('2026-11-09'))[K1] === 10,
   'el 9 por la noche valía 10, el valor anterior a los tres saltos');
ok(pctsEnFecha({ [K1]: 80 }, mismoDia, finDelDia('2026-11-10'))[K1] === 80,
   'y al cierre del 10 ya vale 80');

console.log('\n── Deshacer también una actividad que se quedó sin valor ──');
const conBorrado = [...historial, nuevoCambio(K2, 'MIGBD', 100, undefined, 'David', cuando('2026-11-11'))];
const sinValorHoy = { [K1]: 80 };
ok(pctsEnFecha(sinValorHoy, conBorrado, finDelDia('2026-11-10'))[K2] === 100,
   'si hoy ya no tiene valor propio, el día 10 lo recupera');

console.log('\n── No inventar días ──');
ok(alcanzaElHistorial(historial, finDelDia('2026-11-05'), 'MIGBD'),
   'el 5 está dentro del historial');
ok(!alcanzaElHistorial(historial, finDelDia('2026-10-20'), 'MIGBD'),
   'el 20 de octubre no: es anterior al primer movimiento y hay que decirlo');
ok(!alcanzaElHistorial([], finDelDia('2026-10-20'), 'MIGBD'),
   'sin historial, una fecha vieja tampoco se puede responder');
ok(alcanzaElHistorial([], new Date(), 'MIGBD'),
   'pero hoy sí: sin cambios que deshacer, hoy es hoy');

console.log('\n── Cada cronograma con lo suyo ──');
const mezclado = [...historial, nuevoCambio('FICO-x-0', 'FICO', undefined, 30, 'Otro', cuando('2026-10-01'))];
ok(desdeCuando(mezclado, 'MIGBD')!.toISOString().slice(0,10) === '2026-11-02',
   'el historial de MIGBD empieza el 2 de noviembre');
ok(desdeCuando(mezclado, 'FICO')!.toISOString().slice(0,10) === '2026-10-01',
   'el de FICO el 1 de octubre');
ok(!alcanzaElHistorial(mezclado, finDelDia('2026-10-15'), 'MIGBD'),
   'que FICO tenga datos de octubre no significa que MIGBD los tenga');

console.log('\n── El sello de corte ──');
const u = ultimoMovimiento(historial, 'MIGBD')!;
ok(u.en.startsWith('2026-11-10') && u.por === 'Amilkar',
   'el último movimiento es el del 10, de Amilkar');
ok(cambiosDelDia(historial, '2026-11-09', 'MIGBD').length === 1, 'el 9 se movió una actividad');
ok(diasConCambios(historial, 'MIGBD').join(',') === '2026-11-10,2026-11-09,2026-11-02',
   'los días con movimiento salen del más reciente al más antiguo');
ok(ultimoMovimiento([], 'MIGBD') === null, 'sin movimientos no hay sello que enseñar');

console.log('\n── No se toca el objeto de hoy ──');
const original = { [K1]: 80, [K2]: 100 };
pctsEnFecha(original, historial, finDelDia('2026-11-02'));
ok(original[K1] === 80 && original[K2] === 100, 'reconstruir el pasado no modifica el presente');

console.log('\n── La pantalla ──');
const fuente = readFileSync(new URL('../src/components/PlanDeTrabajo.tsx', import.meta.url), 'utf8');
ok(/const mirandoAtras = simulando && fechaCorte < hoyISO/.test(fuente),
   'el mismo selector decide la dirección según la fecha');
ok(/historialAlcanza \?/.test(fuente) && /sería mentirte/.test(fuente),
   'cuando el historial no llega, se dice en vez de enseñar los % de hoy');
ok(/const puedeEditar = canIssues && !mirandoAtras/.test(fuente),
   'mirando atrás no se edita nada');
ok(/Información a corte de/.test(fuente),
   'la pantalla lleva el sello de corte que la presentación siempre tiene');
ok(/i\.endDate && i\.endDate > fechaCorte/.test(fuente),
   'una alerta cerrada después del corte vuelve a verse abierta ese día');
ok(/p\.creadoEn\.slice\(0,10\) <= fechaCorte/.test(fuente),
   'y un paso creado después del corte no aparece');
ok(/anotarCambio\(k, pctOverrides\[k\], pct\)/.test(fuente),
   'cada % que se escribe a mano queda registrado');
ok(/nuevoCambio\(pctKey, projectId, pctOverrides\[pctKey\], newActPct, user\.name\)/.test(fuente),
   'y también el que se mueve al marcar una etapa');

console.log(f ? `\n${f} fallo(s)` : '\nTodo bien');
process.exit(f ? 1 : 0);
