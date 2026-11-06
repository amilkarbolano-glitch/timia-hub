// Plan de horas del trimestre: lo que cada persona debería imputar.
//
// Las horas del Excel son POR DÍA: «S1 8h» son 8 horas cada día de esa semana.
// Y cuando alguien reparte la semana entre dos SDA vienen dos filas que suman 8.

import { diasHabiles, semanaDe, esperadoDia, esperadoTrimestre, desvios,
         resumenPersona, diferencias, mismaPersona, aISO,
         type TrimestreHoras, type AsignacionHoras, type ImputacionReal } from '../src/lib/trPlan';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

// Q4 arranca el jueves 1 de octubre de 2026; 13 semanas.
const Q: TrimestreHoras = { id:'2026-Q4', label:'Q4 2026', inicio:'2026-10-01', semanas:13 };
const sinFestivos = new Set<string>();

console.log('── El calendario del trimestre ──');
const dias = diasHabiles(Q, sinFestivos);
ok(dias.length === 65, `13 semanas son ${dias.length} días hábiles`);
ok(dias[0] === '2026-10-01', `arranca el ${dias[0]}`);
ok(!dias.includes('2026-10-03') && !dias.includes('2026-10-04'), 'los fines de semana no entran');
ok(semanaDe(Q, '2026-10-01', sinFestivos) === 1, 'el primer día es S1');
ok(semanaDe(Q, dias[4], sinFestivos) === 1, `el quinto día hábil (${dias[4]}) todavía es S1`);
ok(semanaDe(Q, dias[5], sinFestivos) === 2, `el sexto (${dias[5]}) ya es S2`);
ok(semanaDe(Q, '2026-09-30', sinFestivos) === null, 'una fecha anterior al trimestre está fuera');
ok(semanaDe(Q, '2026-10-03', sinFestivos) === null, 'un sábado no pertenece a ninguna semana');

// Un festivo quita un día de su semana, no corre el calendario.
const conFestivo = new Set(['2026-10-02']);
const dias2 = diasHabiles(Q, conFestivo);
ok(!dias2.includes('2026-10-02'), 'el festivo no es día hábil');
ok(dias2.length === 65, 'y el trimestre sigue teniendo 65 días hábiles: se corre el final');

console.log('\n── Las horas son por día, no por semana ──');
const A: AsignacionHoras[] = [
  { id:'a1', trimestreId:'2026-Q4', persona:'sergio.rodriguez@timia.ai', sda:'SDATOOL-53017', horasPorSemana:[8,8,4] },
  { id:'a2', trimestreId:'2026-Q4', persona:'sergio.rodriguez@timia.ai', sda:'SDATOOL-52913', horasPorSemana:[0,0,4] },
];
const e1 = esperadoDia(A, 'sergio.rodriguez@timia.ai', '2026-10-01', Q, sinFestivos);
ok(e1.total === 8, 'en S1 se esperan 8 horas en el día, no 8 en la semana');
ok(e1.porSda['SDATOOL-53017'] === 8, 'todas al SDA que tiene asignado');

const e3 = esperadoDia(A, 'sergio.rodriguez@timia.ai', dias[10], Q, sinFestivos);
ok(e3.total === 8, `en S3 (${dias[10]}) siguen siendo 8 horas al día`);
ok(e3.porSda['SDATOOL-53017'] === 4 && e3.porSda['SDATOOL-52913'] === 4,
   'pero repartidas: 4 a cada SDA, que es como viene el Excel');

ok(esperadoTrimestre(A, 'sergio.rodriguez@timia.ai', Q, sinFestivos) === 8*5 + 8*5 + 8*5,
   'tres semanas a 8 h/día son 120 horas');
ok(esperadoDia(A, 'otra.persona@timia.ai', '2026-10-01', Q, sinFestivos).total === 0,
   'alguien sin asignación no espera horas');
ok(esperadoDia(A, 'SERGIO.RODRIGUEZ@TIMIA.AI ', '2026-10-01', Q, sinFestivos).total === 8,
   'el correo se compara sin importar mayúsculas ni espacios');
ok(mismaPersona('A@timia.ai', ' a@TIMIA.ai '), 'y la comparación lo deja explícito');

console.log('\n── En festivo no se imputa ──');
ok(esperadoDia(A, 'sergio.rodriguez@timia.ai', '2026-10-02', Q, conFestivo).total === 0,
   'un festivo no espera horas de nadie');

console.log('\n── Contraste contra lo que llegó del TR ──');
const R: ImputacionReal[] = [
  { persona:'sergio.rodriguez@timia.ai', fecha:'2026-10-01', sda:'SDATOOL-53017', horas:8 },  // cuadra
  { persona:'sergio.rodriguez@timia.ai', fecha:'2026-10-02', sda:'SDATOOL-53017', horas:6 },  // faltan 2
  { persona:'sergio.rodriguez@timia.ai', fecha:'2026-10-05', sda:'SDATOOL-99999', horas:8 },  // SDA que no tenía
];
const d = desvios(A, R, 'sergio.rodriguez@timia.ai', Q, sinFestivos);
const del2 = d.find(x => x.fecha === '2026-10-02' && x.sda === 'SDATOOL-53017')!;
ok(del2.dif === -2, `el 2 de octubre faltan ${Math.abs(del2.dif)} horas`);
const raro = d.find(x => x.sda === 'SDATOOL-99999')!;
ok(!!raro && raro.esperado === 0 && raro.real === 8,
   'un SDA al que cargó sin tenerlo asignado aparece, no se esconde');
const dia5 = d.filter(x => x.fecha === '2026-10-05');
ok(dia5.length === 2, 'ese día salen dos líneas: la que esperaba y la que cargó de más');
ok(d.every(x => x.esperado > 0 || x.real > 0), 'no se listan días donde no hay nada que decir');

const res = resumenPersona(A, R, 'sergio.rodriguez@timia.ai', Q, sinFestivos);
ok(res.real === 22, `cargó ${res.real} horas en total`);
ok(res.dif < 0, `va corto por ${Math.abs(res.dif)} horas`);
ok(res.sdaNoAsignado.includes('SDATOOL-99999'), 'y se señala el SDA que no tenía asignado');
// Tiene 3 semanas asignadas = 15 días hábiles. Solo el 1 de octubre cuadra;
// los otros 14 están sin imputar o mal, y ese es justo el trabajo del líder.
ok(res.diasConDesvio === 14, `${res.diasConDesvio} de los 15 días asignados no cuadran`);
ok(!desvios(A, R, 'sergio.rodriguez@timia.ai', Q, sinFestivos)
     .some(x => x.fecha === '2026-10-01' && x.dif !== 0), 'el día que cuadra no cuenta como desvío');

console.log('\n── Qué cambia al volver a subir el Excel ──');
const nuevas: AsignacionHoras[] = [
  { ...A[0], horasPorSemana:[8,4,4] },                                   // S2 baja de 8 a 4
  { id:'a3', trimestreId:'2026-Q4', persona:'leidy.parrado@timia.ai', sda:'SDATOOL-53017', horasPorSemana:[8,8] },
];
const cambios = diferencias(A, nuevas);
const cambia = cambios.find(c => c.tipo === 'cambia')!;
ok(cambia.semanas.join() === '2', `a Sergio le cambia solo la semana ${cambia.semanas.join()}`);
ok(cambios.some(c => c.tipo === 'entra' && c.persona.startsWith('leidy')), 'Leidy entra como nueva');
ok(cambios.some(c => c.tipo === 'sale' && c.sda === 'SDATOOL-52913'), 'y el SDA que ya no está sale');
ok(diferencias(A, A).length === 0, 'subir el mismo archivo dos veces no reporta cambios');

console.log('\n── Nada revienta con datos vacíos ──');
ok(esperadoDia([], 'x@timia.ai', '2026-10-01', Q, sinFestivos).total === 0, 'sin asignaciones, cero');
ok(desvios([], [], 'x@timia.ai', Q, sinFestivos).length === 0, 'sin nada que comparar, lista vacía');
ok(diasHabiles({ ...Q, semanas: 0 }, sinFestivos).length === 0, 'un trimestre de cero semanas no tiene días');
ok(aISO(new Date(2026, 0, 5)) === '2026-01-05', 'las fechas se formatean sin desfase de zona horaria');

console.log(f ? `\n${f} fallas` : '\nplan de horas OK');
