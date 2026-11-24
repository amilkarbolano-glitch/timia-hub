// ─── Rellenar la plantilla de seguimiento ────────────────────────────────────
// Un .pptx es un zip de XML. En vez de redibujar la presentación —que nunca se
// va a parecer a la de diseño— abrimos la plantilla real, cambiamos el texto de
// los marcadores {{…}} y la volvemos a cerrar. El resultado conserva fondos,
// fuentes y maquetación porque nunca se tocaron.
//
// La plantilla no vive en el repositorio: es la presentación del banco y el
// repositorio es público. Se sube una vez desde la app y se guarda en este
// navegador.
import JSZip from 'jszip';
import { persistSet } from './persist';

const MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const BD = 'timia-plantillas', ALMACEN = 'pptx';
/** Una plantilla por proyecto: cada uno tiene su portada, su código y sus
 *  entregables, así que compartir una sola no sirve. */
const clave = (projectId: string) => `seguimiento:${projectId}`;

export interface PlantillaGuardada { nombre: string; guardadaEn: string; datos: ArrayBuffer; compartida?: boolean }

// ── Plantilla compartida ─────────────────────────────────────────────────────
// Guardada en el estado del proyecto, que el API ya sincroniza entre todos: así
// la sube una persona y el resto la tiene sin hacer nada. No va en public/
// porque el sitio es público y eso dejaría la presentación del banco al alcance
// de cualquiera con la URL, ni en el repositorio por lo mismo.
//
// Lo suyo sería un endpoint binario, como el de las imágenes de notas, en vez
// de base64 dentro del estado —que se descarga entero al entrar—. Eso espera
// al despliegue del API; mientras tanto, 414 KB en base64 caben.
const claveEstado = (projectId: string) => `timia_plantilla_${projectId}`;

export interface PlantillaCompartida { nombre: string; guardadaEn: string; b64: string }

function deBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function aBase64(datos: ArrayBuffer): string {
  const bytes = new Uint8Array(datos);
  let bin = '';
  // De a trozos: pasar 400 KB de golpe a String.fromCharCode revienta la pila.
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}

export function leerCompartida(projectId: string): PlantillaGuardada | null {
  try {
    const crudo = localStorage.getItem(claveEstado(projectId));
    if (!crudo) return null;
    const v = JSON.parse(crudo) as PlantillaCompartida;
    if (!v?.b64) return null;
    return { nombre: v.nombre, guardadaEn: v.guardadaEn, datos: deBase64(v.b64), compartida: true };
  } catch { return null; }
}

export function guardarCompartida(projectId: string, nombre: string, datos: ArrayBuffer): void {
  const v: PlantillaCompartida = { nombre, guardadaEn: new Date().toISOString(), b64: aBase64(datos) };
  persistSet(claveEstado(projectId), v);
}



function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const req = indexedDB.open(BD, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(ALMACEN)) req.result.createObjectStore(ALMACEN); };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

export async function guardarPlantilla(projectId: string, nombre: string, datos: ArrayBuffer): Promise<void> {
  const db = await abrir();
  await new Promise<void>((ok, mal) => {
    const tx = db.transaction(ALMACEN, 'readwrite');
    tx.objectStore(ALMACEN).put({ nombre, guardadaEn: new Date().toISOString(), datos }, clave(projectId));
    tx.oncomplete = () => ok(); tx.onerror = () => mal(tx.error);
  });
  db.close();
}

export async function leerPlantilla(projectId: string): Promise<PlantillaGuardada | null> {
  try {
    const db = await abrir();
    const v = await new Promise<PlantillaGuardada | undefined>((ok, mal) => {
      const req = db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).get(clave(projectId));
      req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error);
    });
    db.close();
    return v ?? null;
  } catch { return null; }
}

export async function borrarPlantilla(projectId: string): Promise<void> {
  const db = await abrir();
  await new Promise<void>(ok => {
    const tx = db.transaction(ALMACEN, 'readwrite');
    tx.objectStore(ALMACEN).delete(clave(projectId));
    tx.oncomplete = () => ok();
  });
  db.close();
}

/** Texto seguro dentro de un <a:t>. */
function paraXml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Reemplaza un marcador por un texto de varias líneas, clonando el párrafo.
 *
 * El primer intento metía <a:br/> dentro del <a:t>, que además de ser XML
 * inválido —un run admite un solo <a:t>— dejaba todo en un párrafo: se perdía
 * el espaciado de la plantilla y las líneas quedaban pegadas unas a otras.
 * Clonando el <a:p> entero cada línea conserva sangría, viñeta y separación,
 * y las líneas en blanco del texto se vuelven párrafos vacíos, que es justo lo
 * que separaba las alertas en el original.
 */
export function ponerParrafos(xml: string, clave: string, texto: string): string {
  const re = new RegExp(`<a:p>(?:(?!</a:p>)[\\s\\S])*?\\{\\{${clave}\\}\\}(?:(?!</a:p>)[\\s\\S])*?</a:p>`);
  const marcador = new RegExp(`\\{\\{${clave}\\}\\}`, 'g');
  return xml.replace(re, par => texto.split(/\r?\n/).map(linea => {
    const limpio = par.replace(/<a:t>(?:(?!<\/a:t>)[\s\S])*?<\/a:t>/, `<a:t>${paraXml(linea)}</a:t>`);
    return limpio.replace(marcador, '');
  }).join(''));
}

/** Alto total de las filas de entregable, para repartirlo entre las que haya. */
const altoDe = (tr: string): number => {
  const m = /<a:tr\b[^>]*\bh="(\d+)"/.exec(tr);
  return m ? parseInt(m[1], 10) : 0;
};

/**
 * Ajusta la tabla de entregables al número real del plan.
 *
 * La plantilla trae un número fijo de filas. Con más entregables se perdían en
 * silencio y con menos quedaban filas vacías: las dos cosas descuadran la
 * lámina. Aquí se clona o se quita la fila patrón y, sobre todo, se reparte el
 * alto original entre las filas que queden, así la tabla ocupa exactamente el
 * mismo espacio y nada se corre.
 */
export function ajustarFilas(xml: string, cuantos: number): string {
  const tablas = xml.match(/<a:tbl>[\s\S]*?<\/a:tbl>/g);
  if (!tablas) return xml;
  const tabla = tablas.find(t => /\{\{E1\}\}/.test(t));
  if (!tabla) return xml;

  const filas = tabla.match(/<a:tr\b[^>]*>[\s\S]*?<\/a:tr>/g) ?? [];
  const esEnt = (tr: string) => /\{\{E\d+\}\}/.test(tr);
  const idx = filas.map((f, i) => (esEnt(f) ? i : -1)).filter(i => i >= 0);
  if (!idx.length) return xml;

  const altoTotal = idx.reduce((s, i) => s + altoDe(filas[i]), 0);
  const patron = filas[idx[idx.length - 1]];
  const n = Math.max(1, cuantos);
  const altoFila = Math.floor(altoTotal / n);

  // Con más filas de las que trae la plantilla, el alto de cada una baja. Si la
  // letra no baja con él, el nombre del entregable pasa a dos líneas, la fila
  // crece y la tabla empuja a la de responsables. Así que se encoge con ella.
  const szBase = 1200;
  const sz = idx.length && n > idx.length
    ? Math.max(800, Math.round((szBase * idx.length) / n / 50) * 50)
    : 0;
  const nuevas: string[] = [];
  for (let k = 1; k <= n; k++) {
    const base = k <= idx.length ? filas[idx[k - 1]] : patron;
    let fila = base.replace(/\{\{E\d+\}\}/g, `{{E${k}}}`)
                   .replace(/\{\{P\d+\}\}/g, `{{P${k}}}`)
                   .replace(/(<a:tr\b[^>]*\bh=")\d+(")/, `$1${altoFila}$2`);
    if (sz) {
      fila = /sz="\d+"/.test(fila)
        ? fila.replace(/sz="\d+"/g, `sz="${sz}"`)
        : fila.replace(/<a:rPr\b/g, `<a:rPr sz="${sz}"`);
    }
    nuevas.push(fila);
  }

  const antes = filas.slice(0, idx[0]);
  const despues = filas.slice(idx[idx.length - 1] + 1);
  let i = 0;
  const tablaNueva = tabla.replace(/<a:tr\b[^>]*>[\s\S]*?<\/a:tr>/g, () => {
    const pos = i++;
    if (pos < antes.length) return antes[pos];
    if (pos === antes.length) return nuevas.join('');   // todas las de entregable, de una
    if (pos > idx[idx.length - 1]) return despues[pos - idx[idx.length - 1] - 1];
    return '';                                          // las demás de entregable, fuera
  });
  return xml.replace(tabla, tablaNueva);
}

/**
 * Encoge el texto de un marcador cuando es largo, para que no se salga de su
 * caja. PowerPoint solo recalcula su propio autoajuste al editar, así que el
 * tamaño se fija aquí y el archivo se ve igual se abra donde se abra.
 */
export function ajustarTamano(xml: string, clave: string, texto: string, baseP = 12, minP = 7.5): string {
  // La caja de alertas mide 5,6 × 3,33 pulgadas. A 12 pt entran unos 65
  // caracteres por línea y unas 14 líneas; a partir de ahí hay que encoger o
  // el texto se sale por abajo.
  const porLinea = 65, cabenSinEncoger = 14;
  const lineas = texto.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / porLinea)), 0);
  if (lineas <= cabenSinEncoger) return xml;
  const pt = Math.max(minP, Math.round((baseP * cabenSinEncoger / lineas) * 2) / 2);
  const sz = Math.round(pt * 100);
  const re = new RegExp(`<a:r>(?:(?!</a:r>)[\\s\\S])*\\{\\{${clave}\\}\\}(?:(?!</a:r>)[\\s\\S])*</a:r>`);
  return xml.replace(re, run => {
    if (/sz="\d+"/.test(run)) return run.replace(/sz="\d+"/, `sz="${sz}"`);
    if (/<a:rPr\b/.test(run)) return run.replace(/<a:rPr\b/, `<a:rPr sz="${sz}"`);
    // Los runs de la plantilla no traen rPr: el formato viene del párrafo. Hay
    // que crearlo para poder fijar el tamaño.
    return run.replace('<a:r>', `<a:r><a:rPr lang="es-CO" sz="${sz}" dirty="0"/>`);
  });
}

const PULGADA = 914400;
const emu = (pulgadas: number) => Math.round(pulgadas * PULGADA);
const aPulgadas = (v: string) => parseInt(v, 10) / PULGADA;

/** Cambia la posición y el alto de una forma dentro de su XML. */
function situar(bloque: string, y: number, alto?: number): string {
  let out = bloque.replace(/(<a:off\b[^>]*\by=")\d+(")/, `$1${emu(y)}$2`);
  if (alto !== undefined) out = out.replace(/(<a:ext\b[^>]*\bcy=")\d+(")/, `$1${emu(alto)}$2`);
  return out;
}
const yDe = (bloque: string) => {
  const m = /<a:off\b[^>]*\by="(\d+)"/.exec(bloque);
  return m ? aPulgadas(m[1]) : NaN;
};

/** Cuántas líneas ocupa un texto a un ancho dado. */
const lineasDe = (texto: string, porLinea: number) =>
  texto.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / porLinea)), 0);

/**
 * Recoloca la columna de alertas y bloqueantes.
 *
 * En la plantilla las cajas están mal de origen: el cuerpo de alertas empieza
 * 0,33" por encima de donde acaba su título —de ahí que el texto saliera pegado
 * a la palabra "Alertas"— y el de bloqueantes termina en 9,02" sobre una lámina
 * de 7,5". Aquí se reparte la altura disponible entre los dos cuerpos según lo
 * que tenga cada uno, y el título y el icono de bloqueantes bajan con ellos.
 */
export function acomodarResumen(xml: string, textoAlertas: string, textoBloq: string): string {
  const ARRIBA = 2.46, ABAJO = 7.20, HUECO = 0.18, ALTO_TIT = 0.51, TRAS_TIT = 0.06, MINIMO = 1.0;
  const disponible = ABAJO - ARRIBA - HUECO - ALTO_TIT - TRAS_TIT;
  const la = lineasDe(textoAlertas, 65), lb = lineasDe(textoBloq, 65);
  let altoA = Math.round((disponible * la / Math.max(1, la + lb)) * 100) / 100;
  altoA = Math.min(Math.max(altoA, MINIMO), disponible - MINIMO);
  const altoB = Math.round((disponible - altoA) * 100) / 100;
  const yTitB = ARRIBA + altoA + HUECO;
  const yCuerpoB = yTitB + ALTO_TIT + TRAS_TIT;

  const formas = xml.match(/<p:sp>[\s\S]*?<\/p:sp>|<p:pic>[\s\S]*?<\/p:pic>/g);
  if (!formas) return xml;
  const tituloB = formas.find(f => /<a:t>Bloqueantes<\/a:t>/.test(f));
  const yTitBviejo = tituloB ? yDe(tituloB) : NaN;

  let i = 0;
  return xml.replace(/<p:sp>[\s\S]*?<\/p:sp>|<p:pic>[\s\S]*?<\/p:pic>/g, f => {
    i++;
    if (/\{\{ALERTAS\}\}/.test(f)) return situar(f, ARRIBA, altoA);
    if (/\{\{BLOQUEANTES\}\}/.test(f)) return situar(f, yCuerpoB, altoB);
    if (/<a:t>Bloqueantes<\/a:t>/.test(f)) return situar(f, yTitB, ALTO_TIT);
    // El icono de bloqueantes viaja con su título: es el dibujo que está a su
    // altura, y si se queda quieto acaba suelto en mitad del texto.
    if (/^<p:pic>/.test(f) && !isNaN(yTitBviejo)) {
      const y = yDe(f);
      if (!isNaN(y) && Math.abs(y - yTitBviejo) < 0.35) return situar(f, y + (yTitB - yTitBviejo));
    }
    return f;
  });
}

export interface ResultadoRelleno {
  blob: Blob;
  reemplazos: number;
  sinUsar: string[];
  /** Cuántas filas de entregable tiene la plantilla. Si el plan trae más, las
   *  de más no caben y hay que decirlo: perderlas en silencio en un correo al
   *  banco es peor que no generarlo. */
  filasEntregable: number;
}

/** Cambia los {{MARCADORES}} de todas las láminas por sus valores. */
export async function rellenarPlantilla(plantilla: ArrayBuffer, valores: Record<string, string>, entregables?: number): Promise<ResultadoRelleno> {
  const zip = await JSZip.loadAsync(plantilla);
  const laminas = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  if (!laminas.length) throw new Error('Ese archivo no parece una presentación: no encontré láminas dentro.');

  const vistos = new Set<string>();
  let reemplazos = 0;
  for (const ruta of laminas) {
    const original = await zip.file(ruta)!.async('string');
    let xml = original;
    if (entregables !== undefined && /\{\{E1\}\}/.test(xml)) xml = ajustarFilas(xml, entregables);
    if (xml.includes('{{ALERTAS}}') && xml.includes('{{BLOQUEANTES}}')) {
      xml = acomodarResumen(xml, valores.ALERTAS ?? '', valores.BLOQUEANTES ?? '');
    }
    for (const [k, v] of Object.entries(valores)) {
      if (!xml.includes(`{{${k}}}`)) continue;
      if (k === 'ALERTAS' || k === 'BLOQUEANTES') xml = ajustarTamano(xml, k, v);
      if (/\r?\n/.test(v)) { xml = ponerParrafos(xml, k, v); vistos.add(k); reemplazos++; }
    }
    const nuevo = xml.replace(/\{\{([A-Z_0-9]+)\}\}/g, (coincide, clave: string) => {
      vistos.add(clave);
      const v = valores[clave];
      if (v === undefined) return coincide;      // marcador que no sabemos llenar: se deja tal cual
      reemplazos++;
      return paraXml(v);
    });
    // Contra el original, no contra el paso anterior: una lámina cuyo único
    // marcador se resolvió en el paso de párrafos no cambiaba aquí y se
    // guardaba sin tocar — así se quedó el título de la portadilla sin poner.
    if (nuevo !== original) zip.file(ruta, nuevo);
  }
  if (!vistos.size) {
    throw new Error('La plantilla no tiene marcadores {{…}}. Sube la que te pasé con los marcadores puestos.');
  }
  const blob = await zip.generateAsync({ type: 'blob', mimeType: MIME, compression: 'DEFLATE' });
  const filasEntregable = [...vistos].filter(k => /^E\d+$/.test(k)).length;
  return { blob, reemplazos, sinUsar: [...vistos].filter(k => valores[k] === undefined), filasEntregable };
}
