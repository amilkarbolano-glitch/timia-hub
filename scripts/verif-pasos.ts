// Escalar una alerta a bloqueante, y los siguientes pasos que se resuelven.
//
// Las dos cosas comparten la misma idea: un registro que se cierra cuenta algo
// —cuándo, quién, con qué resultado— y borrarlo pierde justo eso.

import { readFileSync } from 'node:fs';
import { escalarAlerta, migrarPasos, issueImpacts, type PlanIssue, type PasoPlan } from '../src/lib/adminStore';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const alerta: PlanIssue = {
  id: 'is-7', planKey: 'MIGBD', type: 'alerta',
  title: 'Gobierno no responde el diccionario',
  detail: 'Van tres recordatorios',
  startDate: '2026-11-03',
  impacts: [{ planKey:'MIGBD', entregableId:'documentaci-n-', actIdx:1 },
            { planKey:'MIGBD', entregableId:'documentaci-n-', actIdx:5 }],
  createdBy: 'Amilkar Bolaño', createdAt: '2026-11-03T14:00:00.000Z',
};

console.log('── Escalar deja dos registros, no uno repintado ──');
const [cerrada, bloq] = escalarAlerta(alerta, 'Ya frena los MSD', 'David', '2026-11-10', '2026-11-10T16:00:00.000Z');
ok(cerrada.id === alerta.id && cerrada.type === 'alerta', 'la alerta sigue siendo alerta');
ok(cerrada.endDate === '2026-11-10', 'y queda cerrada el día que escaló');
ok(cerrada.notaCierre === 'Ya frena los MSD', 'con la nota de por qué');
ok(bloq.type === 'bloqueante' && bloq.id !== alerta.id, 'el bloqueante es un registro nuevo');
ok(bloq.startDate === '2026-11-10', 'que empieza el día que empezó a frenar, no el de la alerta');

console.log('\n── Lo que hereda y lo que no ──');
ok(issueImpacts(bloq).length === 2, 'hereda las 2 tareas afectadas: no hay que volver a elegirlas');
ok(bloq.title === alerta.title && bloq.detail === alerta.detail, 'hereda título y detalle');
ok(bloq.origenId === alerta.id, 'y queda enlazado a la alerta de la que viene');
ok(bloq.endDate === undefined, 'nace abierto');
ok(bloq.createdBy === 'David', 'lo abre quien escala, no quien abrió la alerta');

console.log('\n── La duración de cada tramo se puede leer ──');
// 3 → 10 de noviembre como alerta; a partir del 10, como bloqueante. Eso es lo
// que explica por qué no se actuó antes, y se perdería cambiando solo el tipo.
const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
ok(dias(cerrada.startDate, cerrada.endDate!) === 7, `la alerta duró 7 días antes de escalar (${dias(cerrada.startDate, cerrada.endDate!)})`);

console.log('\n── Nota de cierre sin escalar ──');
const sinNota = escalarAlerta(alerta, '', 'David', '2026-11-10')[0];
ok(!!sinNota.notaCierre, 'si no se escribe nota al escalar, se deja constancia igual');

console.log('\n── Siguientes pasos: migración de los textos viejos ──');
const previos: PasoPlan[] = [];
const nuevos = migrarPasos('MIGBD', ['Subir diccionarios', '  ', 'Agendar comité'], 'Amilkar', previos, [], '2026-11-11T09:00:00.000Z');
ok(nuevos !== null && nuevos.length === 2, `los textos se convierten en registros, sin los vacíos (${nuevos?.length})`);
ok(nuevos![0].texto === 'Subir diccionarios' && !nuevos![0].hechoEn, 'cada uno nace pendiente');
ok(nuevos!.every(p => p.planKey === 'MIGBD' && p.creadoPor === 'Amilkar'), 'con su cronograma y su autor');

console.log('\n── La migración no se repite ──');
ok(migrarPasos('MIGBD', ['Subir diccionarios'], 'Amilkar', nuevos!, []) === null,
   'si el cronograma ya tiene pasos, no se vuelven a crear');
ok(migrarPasos('MIGBD', ['Subir diccionarios'], 'Amilkar', [], ['MIGBD']) === null,
   'y si se resolvieron y borraron todos, tampoco reaparecen');
ok(migrarPasos('OTRO', ['Algo'], 'Amilkar', nuevos!, ['MIGBD']) !== null,
   'otro cronograma sí migra lo suyo');
ok(migrarPasos('VACIO', [], 'Amilkar', [], []) === null, 'sin textos no hay nada que migrar');

console.log('\n── La pantalla ──');
const fuente = readFileSync(new URL('../src/components/PlanDeTrabajo.tsx', import.meta.url), 'utf8');
ok(/function PasosPanel/.test(fuente), 'los pasos tienen su propio panel');
ok(/Escalar a bloqueante/.test(fuente), 'el botón de escalar está en el formulario de resolución');
ok(/placeholder="¿Cómo se resolvió\?/.test(fuente), 'al resolver se pide la nota');
ok(/i\.notaCierre && \(/.test(fuente), 'la nota se muestra en el registro cerrado');
ok(/escaló a bloqueante/.test(fuente) && /escalado de una alerta/.test(fuente),
   'los dos registros se señalan entre sí en pantalla');
ok(/Volver a pendiente/.test(fuente), 'un paso resuelto se puede reabrir');
ok(/const pasosVivos = adminStore\.getPlanPasos\(\)/.test(fuente),
   'la lámina final del PPTX sale de lo que está abierto hoy, no del texto congelado del plan');
ok(!/PlanNotesModal/.test(fuente), 'el modal de notas viejo ya no queda dando vueltas');

console.log('\n── Notas y pasos en el mismo recuadro ──');
// Dos cosas distintas que se leen juntas en la reunión: un paso es trabajo que
// alguien hará; una nota es contexto que no se «resuelve», se archiva.
ok(/const esNota = \(p: PasoPlan\)/.test(fuente), 'cada registro sabe si es paso o nota');
ok(/p\.tipo \?\? 'paso'/.test(fuente), 'lo que ya existía sigue siendo un paso: nada que migrar');
ok(/nota_ \? '✎' : abierto \? '•' : '✓'/.test(fuente), 'el distintivo es la viñeta, no una etiqueta por fila');
ok(/borderLeftColor: nota_ \? '#cbd5e1' : '#86efac'/.test(fuente), 'y el borde izquierdo, que se lee de reojo');
ok(/nota_ \? 'Archivar' : 'Resolver'/.test(fuente), 'una nota se archiva, no se resuelve');
ok(/Siguientes pasos y notas/.test(fuente), 'el recuadro es uno solo');
ok(/setTipo\(tipo === 'nota' \? 'paso' : 'nota'\)/.test(fuente), 'una nota que genera trabajo puede pasar a paso');

console.log('\n── Responsable de la alerta ──');
ok(/Responsable de destrabarlo/.test(fuente), 'el formulario pide de quién depende');
ok(/responsable: form\.responsable\.trim\(\) \|\| undefined/.test(fuente), 'y se guarda sin espacios sueltos');
ok(/sin responsable/.test(fuente), 'si falta en una abierta, la fila lo dice en vez de callarlo');
const escalado2 = escalarAlerta({ ...alerta, responsable: 'Gobierno del Dato BBVA' }, 'x', 'David', '2026-11-12')[1];
ok(escalado2.responsable === 'Gobierno del Dato BBVA', 'al escalar, el bloqueante hereda el responsable');

console.log('\n── Etapas que dependen del banco ──');
ok(/etapa\.resp !== \(act\.bbva \? 'bbva' : 'timia'\)/.test(fuente),
   'la insignia solo sale si la etapa difiere de su actividad: repetirla no informa');
const est = readFileSync(new URL('../src/components/Estimaciones.tsx', import.meta.url), 'utf8');
ok(/etapa\.resp \?\? ''/.test(est), 'el editor de etapas tiene el selector de responsable');
ok(/<option value="bbva">BBVA<\/option>/.test(est), 'con BBVA entre las opciones');
ok(/— resp\./.test(est), 'y vacío = hereda el de la actividad, que es lo normal');

console.log('\n── Finalizada se ve finalizada ──');
ok(/const finalizada = effectivePct >= 100/.test(fuente), 'el 100% marca la barra como cerrada');
ok(/finalizada \? \(isSubtask \? 'rgba\(22,163,74,0\.6\)' : '#16a34a'\)/.test(fuente),
   'en verde, no en el mismo verde azulado del avance');
ok(/finalizada && isLast &&/.test(fuente), 'con la palomita al final del tramo');
ok(/l:'Finalizada'/.test(fuente), 'y la leyenda lo explica');

console.log(f ? `\n${f} fallo(s)` : '\nTodo bien');
process.exit(f ? 1 : 0);
