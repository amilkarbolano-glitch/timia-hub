// Lectura de la plantilla real de los líderes (Plantilla_carga_horas.xlsx).
// Se prueba contra el archivo que nos pasaron, no contra datos inventados.

import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { leerPlantilla, fechasDeColumnas, normalizaSda, aplicarCorreos, type Hoja } from '../src/lib/trPlanImport';
import { diasHabiles, esperadoDia, esperadoTrimestre, emparejar, normNombre, personasDelPlan,
         desvios, resumenPersona, diferencias, type TrimestreHoras, type ImputacionReal } from '../src/lib/trPlan';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const RUTA = '/sessions/charming-trusting-franklin/mnt/uploads/Plantilla_carga_horas.xlsx';
const wb = XLSX.read(readFileSync(RUTA), { cellDates: true });
const hoja = XLSX.utils.sheet_to_json<Celda[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null }) as Hoja;
type Celda = string | number | Date | null;

const Q: TrimestreHoras = { id:'2026-Q4', label:'Q4 2026', inicio:'2026-10-01', fin:'2026-12-31' };
const FESTIVOS = new Set(['2026-10-12','2026-11-02','2026-11-16','2026-12-08','2026-12-25']);

console.log('── Las columnas del archivo son los días hábiles del trimestre ──');
const cols = fechasDeColumnas(hoja);
const delArchivo = [...new Set(Object.values(cols))].sort();
ok(delArchivo.length === 61, `${delArchivo.length} columnas de día`);
ok(delArchivo[0] === '2026-10-01' && delArchivo[60] === '2026-12-31',
   `van del ${delArchivo[0]} al ${delArchivo[60]}`);

const calculados = diasHabiles(Q, FESTIVOS);
ok(calculados.length === delArchivo.length, `nuestro calendario da los mismos ${calculados.length}`);
const sobran = delArchivo.filter(d => !calculados.includes(d));
const faltan = calculados.filter(d => !delArchivo.includes(d));
ok(sobran.length === 0 && faltan.length === 0,
   `coinciden uno a uno${sobran.length||faltan.length ? ` (sobran ${sobran} · faltan ${faltan})` : ''}`);
ok(!delArchivo.includes('2026-12-25') && !delArchivo.includes('2026-10-12'),
   'los festivos colombianos no están en el archivo');

console.log('\n── Lo que se importa y lo que no ──');
const r = leerPlantilla(hoja, '2026-Q4');
ok(r.puestos.length === 2, `${r.puestos.length} puestos del anexo`);
ok(r.puestos.every(p => p.sda === 'SDATOOL-54789'), 'ambos del SDA 54789');
ok(r.puestos.map(p => p.numero).sort().join() === '1,2', 'puestos #1 y #2');
ok(r.puestos.every(p => p.rol === 'DATA ENGIENEER SENIOR'),
   'el rol sale del Anexo, que es donde está — no es una persona');
ok(r.avisos.some(a => a.includes('no se importan')),
   'avisa de las filas de Imputado TR y Real ejecutado que se dejan fuera');

const p1 = r.puestos.find(p => p.numero === 1)!;
ok(Object.keys(p1.horasPorDia).length === 61, 'el anexo del puesto 1 cubre los 61 días');
ok(Object.values(p1.horasPorDia).every(h => h === 8), 'todos a 8 horas');
ok(Object.values(p1.horasPorDia).reduce((s,h)=>s+h,0) === 488, '488 horas contratadas en el trimestre');

console.log('\n── Coberturas de vacaciones ──');
const conCobertura = r.puestos.filter(p => (p.coberturas ?? []).length);
ok(conCobertura.length > 0, `${conCobertura.length} puestos con cobertura`);
const p2 = r.puestos.find(p => p.numero === 2)!;
ok((p2.coberturas ?? []).length === 2, `el puesto 2 tiene ${(p2.coberturas ?? []).length} coberturas`);
// Los guiones no se cuentan como días cubiertos: ver el comentario del lector.
ok((p2.coberturas ?? []).every(c => c.dias.length === 0),
   'las coberturas quedan sin días: los guiones no son horas');
ok(r.avisos.some(a => a.includes('suplente')),
   'y se avisa de que figuran como suplentes hasta que se marquen horas');
ok((p2.coberturas ?? []).some(c => c.persona.startsWith('DAVID')), 'David aparece cubriendo');

console.log('\n── Emparejar nombres con correos ──');
const equipo = [
  { email:'juliana.garzon@timia.ai',   nombre:'Juliana Garzón' },
  { email:'david.huaman@timia.ai',     nombre:'David Huaman' },
  { email:'santiago.coronado@timia.ai',nombre:'Santiago Coronado' },
  { email:'amilkar.bolano@timia.ai',   nombre:'Amilkar José Bolaño' },
];
ok(normNombre('JULIANA GARZON DUQUE') === 'juliana garzon duque', 'se normaliza a minúsculas sin tildes');
ok(normNombre('Juliana Garzón') === 'juliana garzon', 'y las tildes no estorban');

const e1 = emparejar('JULIANA GARZON DUQUE', equipo);
ok(e1?.email === 'juliana.garzon@timia.ai', `«JULIANA GARZON DUQUE» → ${e1?.email} (${e1?.confianza})`);
const e2 = emparejar('DAVID ARTURO HUAMAN NIQUEN', equipo);
ok(e2?.email === 'david.huaman@timia.ai', `«DAVID ARTURO HUAMAN NIQUEN» → ${e2?.email} (${e2?.confianza})`);
ok(emparejar('CRISTIAN HORACIO SASTOQUE ISAZA', equipo) === null,
   'quien no está en el equipo no se empareja a la fuerza: se pregunta');
ok(emparejar('JUAN', equipo) === null, 'un solo nombre no basta para emparejar');
ok(r.nombres.length === 5, `${r.nombres.length} nombres del archivo esperan correo`);

console.log('\n── Con los correos puestos, el esperado sale solo ──');
const conCorreos = aplicarCorreos(r.puestos, {
  'JULIANA GARZON DUQUE': 'juliana.garzon@timia.ai',
  'DAVID ARTURO HUAMAN NIQUEN': 'david.huaman@timia.ai',
});
const juli = esperadoDia(conCorreos, 'juliana.garzon@timia.ai', '2026-10-01', '2026-Q4');
ok(juli.total === 8, 'Juliana debe 8 horas el 1 de octubre');
ok(juli.porSda['SDATOOL-54789'] === 8, 'todas al SDA 54789');
ok(esperadoDia(conCorreos, 'juliana.garzon@timia.ai', '2026-12-25', '2026-Q4').total === 0,
   'el 25 de diciembre no debe nada: no está en el anexo');
ok(esperadoTrimestre(conCorreos, 'juliana.garzon@timia.ai', Q, FESTIVOS) === 488,
   'y 488 horas en todo el trimestre');

// Cuando una cobertura SÍ trae días, manda sobre el titular ese día.
const conDias = conCorreos.map(p => p.numero === 2
  ? { ...p, coberturas: [{ persona:'david.huaman@timia.ai', dias:['2026-10-06'] }] } : p);
const titular = conDias.find(p => p.numero === 2)!.persona;
ok(!!titular, 'el puesto 2 tiene titular');
ok(esperadoDia(conDias, 'david.huaman@timia.ai', '2026-10-06', '2026-Q4').total === 8,
   'el día cubierto las 8 horas las debe quien cubre');
ok(esperadoDia(conDias, titular!, '2026-10-06', '2026-Q4').total === 0,
   'y ese día el titular no debe nada');

ok(personasDelPlan(conCorreos, '2026-Q4').includes('juliana.garzon@timia.ai'),
   'Juliana aparece entre las personas del plan');

console.log('\n── Contraste con lo imputado ──');
const reales: ImputacionReal[] = [
  { persona:'juliana.garzon@timia.ai', fecha:'2026-10-01', sda:'SDATOOL-54789', horas:8 },
  { persona:'juliana.garzon@timia.ai', fecha:'2026-10-02', sda:'SDATOOL-54789', horas:6 },
  { persona:'juliana.garzon@timia.ai', fecha:'2026-10-05', sda:'SDATOOL-99999', horas:8 },
];
const d = desvios(conCorreos, reales, 'juliana.garzon@timia.ai', Q, FESTIVOS);
ok(d.find(x => x.fecha==='2026-10-02' && x.sda==='SDATOOL-54789')!.dif === -2, 'el 2 de octubre faltan 2 horas');
ok(d.some(x => x.sda === 'SDATOOL-99999' && x.esperado === 0),
   'las horas a un SDA que no tenía asignado se muestran');
const res = resumenPersona(conCorreos, reales, 'juliana.garzon@timia.ai', Q, FESTIVOS);
ok(res.esperado === 488 && res.real === 22, `debía ${res.esperado} h y lleva ${res.real} h`);
ok(res.sdaNoAsignado.length === 1, 'y se señala el SDA que no le corresponde');

console.log('\n── Volver a subir el archivo ──');
ok(diferencias(r.puestos, r.puestos).length === 0, 'el mismo archivo dos veces no reporta cambios');
const movido = r.puestos.map(p => p.numero === 1 ? { ...p, persona: 'otro@timia.ai' } : p);
const cambios = diferencias(r.puestos, movido);
ok(cambios.length === 1 && cambios[0].tipo === 'cambia', 'cambiar quién ocupa un puesto se detecta');
ok(cambios[0].detalle.includes('ocupa'), `y se explica: «${cambios[0].detalle}»`);

console.log('\n── Detalles del formato ──');
ok(normalizaSda(54789) === 'SDATOOL-54789', 'un SDA numérico se normaliza');
ok(normalizaSda('SDATOOL-54789') === 'SDATOOL-54789', 'y uno que ya viene bien no se toca');
ok(leerPlantilla([[], [], []], '2026-Q4').avisos[0].includes('cabecera'),
   'una hoja que no es la plantilla lo dice en vez de reventar');

console.log(f ? `\n${f} fallas` : '\nplantilla OK');
