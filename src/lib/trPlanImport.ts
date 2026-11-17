// ─── Lectura de la plantilla de carga de horas ───────────────────────────────
// Lee «Plantilla_carga_horas.xlsx» tal como la manejan hoy los líderes.
//
// La forma, verificada sobre el archivo real:
//
//   fila 2:  SDA | Tipo | Nombre | Proyecto | # | Líder | ‹mes›········‹mes›···
//   fila 3:                                                  1  2  5  6  7 …
//   fila 4+: 54789 | Anexo       | DATA ENGINEER SENIOR | … | 1 | … | 8  8  8 …
//            54789 | Imputado TR | JULIANA GARZON DUQUE | … | 1 | … | 8  8  8 …
//
// Las cabeceras de mes están combinadas y guardan una fecha con formato
// «mmmm d», así que de ahí sale el mes; el día sale de la fila de abajo.
//
// Las columnas son los días hábiles del trimestre descontando festivos
// colombianos: lo comprobamos contra el archivo real y no sobraba ni faltaba
// ninguno. Aun así no se asume — se leen los días que traiga el archivo.

import type { PuestoAnexo, Cobertura } from './trPlan';

/** Una celda tal como la devuelve la hoja: texto, número, fecha o vacío. */
export type Celda = string | number | Date | null | undefined;
export type Hoja = Celda[][];

export interface ResultadoLectura {
  puestos: PuestoAnexo[];
  /** Nombres del Excel que hay que emparejar con un correo. */
  nombres: string[];
  dias: string[];
  avisos: string[];
}

const TIPO_ANEXO = 'anexo';
const TIPO_COBERTURA = 'cubierto';

const texto = (c: Celda) => (c === null || c === undefined ? '' : String(c)).trim();
const norm = (c: Celda) => texto(c).toLowerCase();

/** '54789', 54789 o 'SDATOOL-54789' → 'SDATOOL-54789'. */
export function normalizaSda(v: Celda): string {
  const t = texto(v).toUpperCase();
  const m = t.match(/(\d{4,})/);
  return m ? `SDATOOL-${m[1]}` : t;
}

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

/**
 * Dónde empieza la tabla. No se fija por número de fila porque el lector de
 * Excel se salta las filas vacías de arriba y eso cambia según el archivo: se
 * busca la fila que tiene «SDA» y «Tipo», que es la cabecera de verdad.
 */
export function ubicaCabecera(hoja: Hoja): { filaMes: number; filaDia: number; primeraCol: number } | null {
  for (let r = 0; r < Math.min(hoja.length, 15); r++) {
    const fila = hoja[r] ?? [];
    const iSda  = fila.findIndex(c => norm(c) === 'sda');
    const iTipo = fila.findIndex(c => norm(c) === 'tipo');
    if (iSda < 0 || iTipo < 0) continue;
    // Las columnas de día empiezan donde acaban las de texto: tras «Líder».
    const iLider = fila.findIndex(c => norm(c).startsWith('l') && norm(c).includes('der'));
    const primeraCol = (iLider >= 0 ? iLider : iTipo + 4) + 1;
    return { filaMes: r, filaDia: r + 1, primeraCol };
  }
  return null;
}

/**
 * Las fechas de cada columna. El mes viene de la cabecera combinada —que solo
 * aparece en su primera columna— y el día de la fila de abajo.
 */
export function fechasDeColumnas(hoja: Hoja, filaMes = 0, filaDia = 1, desde = 6): Record<number, string> {
  const out: Record<number, string> = {};
  let mesActual: { y: number; m: number } | null = null;
  const ancho = Math.max(...hoja.slice(0, 3).map(f => f?.length ?? 0));

  for (let c = desde; c < ancho; c++) {
    const cab = hoja[filaMes]?.[c];
    if (cab instanceof Date) mesActual = { y: cab.getFullYear(), m: cab.getMonth() + 1 };
    else if (texto(cab)) {
      // Por si alguien escribe el mes a mano en vez de usar una fecha.
      const d = new Date(texto(cab));
      if (!isNaN(d.getTime())) mesActual = { y: d.getFullYear(), m: d.getMonth() + 1 };
    }
    const dia = hoja[filaDia]?.[c];
    const n = typeof dia === 'number' ? dia : parseInt(texto(dia), 10);
    if (!mesActual || !n || n < 1 || n > 31) continue;
    out[c] = `${mesActual.y}-${String(mesActual.m).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
  }
  return out;
}

/**
 * Lee la hoja y devuelve los puestos del anexo con sus coberturas.
 *
 * Solo se importan «Anexo» y «Cubierto - …»: lo imputado lo calcula la
 * herramienta de las capturas del TR, y tenerlo dos veces solo crearía dos
 * versiones del mismo número. Las filas de «Imputado TR» y «Real ejecutado»
 * se cuentan en los avisos para que se vea que no se perdieron por error.
 */
export function leerPlantilla(hoja: Hoja, trimestreId: string): ResultadoLectura {
  const avisos: string[] = [];
  const cab = ubicaCabecera(hoja);
  if (!cab) {
    return { puestos: [], nombres: [], dias: [],
             avisos: ['No encontré la cabecera con «SDA» y «Tipo». ¿Es la plantilla de carga de horas?'] };
  }
  const cols = fechasDeColumnas(hoja, cab.filaMes, cab.filaDia, cab.primeraCol);
  const dias = [...new Set(Object.values(cols))].sort();
  if (!dias.length) {
    return { puestos: [], nombres: [], dias: [],
             avisos: ['Encontré la cabecera pero ninguna columna de día con fecha reconocible.'] };
  }

  // Un puesto por (SDA, #). Las coberturas suelen venir sin número: se cuelgan
  // del último puesto leído de ese SDA, que es como están escritas en el archivo.
  const puestos = new Map<string, PuestoAnexo>();
  const nombres = new Set<string>();
  let ultimoDelSda = new Map<string, string>();
  let ignoradas = 0;

  for (let r = cab.filaDia + 1; r < hoja.length; r++) {
    const fila = hoja[r];
    if (!fila) continue;
    const tipo = norm(fila[1]);
    if (!tipo) continue;
    const sda = normalizaSda(fila[0]);
    const nombre = texto(fila[2]);
    const proyecto = texto(fila[3]);
    const numRaw = fila[4];
    const lider = texto(fila[5]);

    const valores: Record<string, number> = {};
    const diasConGuion: string[] = [];
    for (const [cStr, fecha] of Object.entries(cols)) {
      const v = fila[Number(cStr)];
      if (typeof v === 'number') { if (v > 0) valores[fecha] = v; }
      else if (texto(v) === '-') diasConGuion.push(fecha);
    }

    if (tipo.startsWith(TIPO_ANEXO)) {
      const numero = typeof numRaw === 'number' ? numRaw : parseInt(texto(numRaw), 10) || 1;
      const clave = `${sda}#${numero}`;
      puestos.set(clave, {
        id: `pu-${trimestreId}-${sda}-${numero}`.toLowerCase(),
        trimestreId, sda, numero, rol: nombre, proyecto, lider,
        horasPorDia: valores, coberturas: [],
      });
      ultimoDelSda.set(sda, clave);
      continue;
    }

    if (tipo.startsWith(TIPO_COBERTURA)) {
      const clave = ultimoDelSda.get(sda);
      const p = clave ? puestos.get(clave) : undefined;
      if (!p) { avisos.push(`«${nombre}» cubre en ${sda} pero no encontré su puesto.`); continue; }
      if (nombre) nombres.add(nombre);

      // Los días solo se toman cuando vienen con HORAS. El guion «-» no se
      // interpreta como «cubrió ese día»: en el archivo real una persona tiene
      // los 21 días de octubre con guion, y leerlo así dejaría al titular sin
      // deber una sola hora en todo el mes. Un guion es «sin datos», y quien
      // cubre queda registrado como suplente del puesto hasta que se marquen
      // los días de verdad.
      const dias = Object.keys(valores);
      if (!dias.length && diasConGuion.length) {
        avisos.push(`«${nombre}» figura cubriendo ${p.sda} #${p.numero} con guiones en `
          + `${diasConGuion.length} días, sin horas. Queda como suplente; marca las horas de los días que cubra.`);
      }
      const cobertura: Cobertura = { persona: nombre, dias };
      p.coberturas = [...(p.coberturas ?? []), cobertura];
      continue;
    }

    // Imputado TR / Real ejecutado: de aquí sale quién ocupa el puesto, pero no
    // sus horas — esas las calculamos de las capturas.
    if (nombre) {
      nombres.add(nombre);
      const clave = ultimoDelSda.get(sda);
      const p = clave ? puestos.get(clave) : undefined;
      if (p && !p.persona) p.persona = nombre;   // se cambia por el correo al emparejar
    }
    ignoradas++;
  }

  if (ignoradas) {
    avisos.push(`${ignoradas} filas de «Imputado TR» y «Real ejecutado» no se importan: esas horas salen de las capturas del TR.`);
  }
  for (const p of puestos.values()) {
    const sinHoras = dias.filter(d => !(d in p.horasPorDia)).length;
    if (sinHoras) avisos.push(`${p.sda} #${p.numero}: ${sinHoras} de ${dias.length} días sin horas en el anexo.`);
  }

  return { puestos: [...puestos.values()], nombres: [...nombres], dias, avisos };
}

/**
 * Cambia los nombres del Excel por los correos ya emparejados. Lo que no tenga
 * correo se deja como está: es mejor que el líder lo vea a que desaparezca.
 */
export function aplicarCorreos(puestos: PuestoAnexo[], porNombre: Record<string, string>): PuestoAnexo[] {
  const correo = (n?: string) => (n && porNombre[n]) || n;
  return puestos.map(p => ({
    ...p,
    persona: correo(p.persona),
    coberturas: (p.coberturas ?? []).map(c => ({ ...c, persona: correo(c.persona) ?? c.persona })),
  }));
}
