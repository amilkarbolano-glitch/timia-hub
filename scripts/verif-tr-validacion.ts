// El cruce entre lo que lee el lector de capturas y el anexo de los líderes.
//
// Esto decide si a alguien se le dice «cargaste horas a un SDA que no es
// tuyo», así que lo que se prueba sobre todo es que no acuse de más: un falso
// positivo aquí es señalar a un compañero por un error del OCR.

import { sdaDe, fechaDe, horasDe, imputacionesDe, imputacionesDeRegistros, nombreLeido,
         validar, resumenHallazgos, type RegistroTr } from '../src/lib/trLectura';
import type { PuestoAnexo, TrimestreHoras } from '../src/lib/trPlan';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const Q: TrimestreHoras = { id:'2026-Q4', label:'Q4 2026', inicio:'2026-11-09', fin:'2026-11-13' };
const FESTIVOS = new Set(['2026-11-16']);
const YO = 'amilkar.bolano@timia.ai';

const puesto = (sda: string, persona: string, dias: string[], horas = 8): PuestoAnexo => ({
  id: `p-${sda}-${persona}`, trimestreId: Q.id, sda, numero: 1, rol: 'DATA ENGINEER SENIOR',
  horasPorDia: Object.fromEntries(dias.map(d => [d, horas])), persona,
});

const registro = (resp: unknown, correo = YO, persona = 'Amilkar Bolaño'): RegistroTr => ({
  id:'tr-1', correo, persona, resultados:[{ captura:'tr.png', estado:'OK', respuesta: resp }],
});

// ─── Sacar el SDA de la línea real de la hoja ────────────────────────────────

console.log('── El SDA sale de la línea larga, no del primer número ──');
const LINEA = 'SDATOOL-53017 - Estrategia campañas preaprobados - FICO - Pruebas - '
            + 'DECRONOS-1537 - Implementación de estrategia de Optimización FICO en Cronos ADA';
ok(sdaDe(LINEA) === 'SDATOOL-53017', 'de la línea completa saca SDATOOL-53017');
ok(sdaDe('DECRONOS-1537 - algo') === null,
   'y no confunde DECRONOS-1537 con un SDA: tiene que decir SDATOOL');
ok(sdaDe('SDATOOL 54364') === 'SDATOOL-54364', 'aguanta que venga sin guion');
ok(sdaDe('sdatool-53017') === 'SDATOOL-53017', 'y en minúscula');
ok(sdaDe('') === null && sdaDe(null) === null, 'sin texto, nada: no inventa un SDA');

console.log('\n── Fechas y horas como las devuelva ──');
ok(fechaDe('2026-11-12') === '2026-11-12', 'ISO');
ok(fechaDe('12/11/2026') === '2026-11-12', 'formato latino: día primero');
ok(fechaDe('12-11-26') === '2026-11-12', 'con año de dos cifras');
ok(fechaDe('31/11/2026') === null, 'un 31 de noviembre no es una fecha: la descarta');
ok(fechaDe('29/02/2028') === '2028-02-29' && fechaDe('29/02/2026') === null,
   'y sabe de años bisiestos');
ok(fechaDe('11/25/2026') === null,
   'en orden gringo no adivina: una fecha mal adivinada mete las horas en otro día');
ok(fechaDe('cualquier cosa') === null, 'lo que no es fecha no se fuerza');
ok(horasDe(8) === 8 && horasDe('8,5') === 8.5 && horasDe('8.5 h') === 8.5, 'horas con coma, punto y unidad');
ok(horasDe('') === null, 'sin horas, nada');

console.log('\n── De la respuesta del lector a imputaciones ──');
const filas = imputacionesDe({ actividad: LINEA,
  dias: [{ fecha:'2026-11-09', horas:8 }, { fecha:'2026-11-10', horas:4 }] }, YO);
ok(filas.length === 2, 'saca las dos filas');
ok(filas.every(x => x.sda === 'SDATOOL-53017'),
   'y el SDA lo heredan del nivel de arriba, que es donde viene en las tablas');
ok(filas[0].horas === 8 && filas[1].horas === 4, 'con sus horas');

const porColumnas = imputacionesDe({ sda: LINEA, '2026-11-09': 8, '2026-11-10': 0 }, YO);
ok(porColumnas.length === 1 && porColumnas[0].fecha === '2026-11-09',
   'también entiende la tabla con la fecha de cabecera, y se salta los ceros');

ok(imputacionesDe({ cualquier: 'cosa', anidado: { otra: 'cosa' } }, YO).length === 0,
   'si no reconoce la forma devuelve vacío en vez de inventar imputaciones');
ok(imputacionesDeRegistros([{ id:'x', correo:YO,
     resultados:[{ captura:'a.png', estado:'TIMEOUT' }] }]).length === 0,
   'una captura que no se leyó no aporta imputaciones');

console.log('\n── Nombre leído en la captura ──');
ok(nombreLeido({ nombre: 'Amilkar Bolaño' }) === 'Amilkar Bolaño', 'lo encuentra donde esté');
ok(nombreLeido({ nada: 1 }) === null, 'y si no viene, no se lo inventa');

// ─── Los cuatro desajustes ───────────────────────────────────────────────────

const MIO = 'SDATOOL-53017';
const AJENO = 'SDATOOL-54364';
const L = '2026-11-09', M = '2026-11-10';
const anexo = [puesto(MIO, YO, [L, M], 8)];

console.log('\n── SDA ajeno: frena ──');
const hAjeno = validar(
  [registro({ actividad:`${AJENO} - otra cosa`, dias:[{ fecha:L, horas:8 }] })],
  anexo, YO, Q, FESTIVOS);
const ajeno = hAjeno.filter(h => h.tipo === 'sda-ajeno');
ok(ajeno.length === 1, 'detecta las horas cargadas a un SDA que no es suyo');
ok(ajeno[0].gravedad === 'bloquea', 'y lo marca como algo que frena, no como aviso');
ok(ajeno[0].sda === AJENO, 'diciendo cuál es');
ok(!hAjeno.some(h => h.tipo === 'horas-distintas' && h.sda === AJENO),
   'sin duplicarlo además como diferencia de horas: es un problema, no dos');

console.log('\n── Horas distintas: avisa con los dos números ──');
const hDif = validar([registro({ actividad:LINEA, dias:[{ fecha:L, horas:6 }, { fecha:M, horas:8 }] })],
                     anexo, YO, Q, FESTIVOS);
const dif = hDif.filter(h => h.tipo === 'horas-distintas');
ok(dif.length === 1 && dif[0].fecha === L, 'solo el día que no cuadra');
ok(dif[0].esperado === 8 && dif[0].real === 6, 'con lo que esperaba la plantilla y lo que dijo la captura');
ok(dif[0].gravedad === 'avisa', 'y no frena: puede ser el OCR o puede ser la realidad');

console.log('\n── Día sin captura: recordatorio ──');
const hFalta = validar([registro({ actividad:LINEA, dias:[{ fecha:L, horas:8 }] })],
                       anexo, YO, Q, FESTIVOS);
const falta = hFalta.filter(h => h.tipo === 'dia-sin-capturar');
ok(falta.length === 1 && falta[0].fecha === M, 'el día que la plantilla esperaba y no llegó');
ok(falta[0].gravedad === 'recuerda', 'como recordatorio: todavía la puede subir');

console.log('\n── Pantallazo de otra persona: frena ──');
const hOtro = validar([registro({ nombre:'Juliana Garzón', actividad:LINEA, dias:[{ fecha:L, horas:8 }] })],
                      anexo, YO, Q, FESTIVOS);
ok(hOtro.some(h => h.tipo === 'otra-persona' && h.gravedad === 'bloquea'),
   'si el nombre de la captura no es el de quien la subió, frena');
ok(!validar([registro({ nombre:'Amilkar Bolaño', actividad:LINEA, dias:[{ fecha:L, horas:8 }] })],
            anexo, YO, Q, FESTIVOS).some(h => h.tipo === 'otra-persona'),
   'y con el nombre correcto no dice nada');

console.log('\n── Lo que cuadra no genera ruido ──');
const limpio = validar([registro({ actividad:LINEA, dias:[{ fecha:L, horas:8 }, { fecha:M, horas:8 }] })],
                       anexo, YO, Q, FESTIVOS);
ok(limpio.length === 0, 'una semana que cuadra no produce ni un hallazgo');

console.log('\n── Las capturas de otra persona no se le cuelgan a esta ──');
const deOtro = validar([registro({ actividad:`${AJENO} - x`, dias:[{ fecha:L, horas:8 }] },
                                 'juliana.garzon@timia.ai', 'Juliana Garzón')],
                       anexo, YO, Q, FESTIVOS);
ok(!deOtro.some(h => h.tipo === 'sda-ajeno'),
   'lo que subió otra persona no aparece como SDA ajeno de esta');

console.log('\n── Cobertura: las horas son de quien cubre ──');
const conCobertura: PuestoAnexo[] = [{ ...puesto(MIO, 'juliana.garzon@timia.ai', [L, M], 8),
                                       coberturas:[{ persona: YO, dias:[L] }] }];
const hCob = validar([registro({ actividad:LINEA, dias:[{ fecha:L, horas:8 }] })],
                     conCobertura, YO, Q, FESTIVOS);
ok(!hCob.some(h => h.tipo === 'sda-ajeno'),
   'quien cubre un día puede imputar a ese SDA sin que se le marque como ajeno');

console.log('\n── El marcador ──');
const r = resumenHallazgos(hAjeno);
ok(r.bloquea >= 1 && typeof r.avisa === 'number' && typeof r.recuerda === 'number',
   'cuenta por gravedad');

console.log(f ? `\n✗ ${f} fallo(s)` : '\nvalidación TR OK');
process.exit(f ? 1 : 0);
