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

const MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const BD = 'timia-plantillas', ALMACEN = 'pptx', CLAVE = 'seguimiento';

export interface PlantillaGuardada { nombre: string; guardadaEn: string; datos: ArrayBuffer }

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const req = indexedDB.open(BD, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(ALMACEN)) req.result.createObjectStore(ALMACEN); };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

export async function guardarPlantilla(nombre: string, datos: ArrayBuffer): Promise<void> {
  const db = await abrir();
  await new Promise<void>((ok, mal) => {
    const tx = db.transaction(ALMACEN, 'readwrite');
    tx.objectStore(ALMACEN).put({ nombre, guardadaEn: new Date().toISOString(), datos }, CLAVE);
    tx.oncomplete = () => ok(); tx.onerror = () => mal(tx.error);
  });
  db.close();
}

export async function leerPlantilla(): Promise<PlantillaGuardada | null> {
  try {
    const db = await abrir();
    const v = await new Promise<PlantillaGuardada | undefined>((ok, mal) => {
      const req = db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).get(CLAVE);
      req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error);
    });
    db.close();
    return v ?? null;
  } catch { return null; }
}

export async function borrarPlantilla(): Promise<void> {
  const db = await abrir();
  await new Promise<void>(ok => {
    const tx = db.transaction(ALMACEN, 'readwrite');
    tx.objectStore(ALMACEN).delete(CLAVE);
    tx.oncomplete = () => ok();
  });
  db.close();
}

/** Texto seguro dentro de un <a:t>. Los saltos de línea se convierten en saltos
 *  de PowerPoint: dejarlos crudos los perdería al abrir el archivo. */
function paraXml(v: string): string {
  return v
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\r?\n/g, '</a:t><a:br/><a:t>');
}

export interface ResultadoRelleno { blob: Blob; reemplazos: number; sinUsar: string[] }

/** Cambia los {{MARCADORES}} de todas las láminas por sus valores. */
export async function rellenarPlantilla(plantilla: ArrayBuffer, valores: Record<string, string>): Promise<ResultadoRelleno> {
  const zip = await JSZip.loadAsync(plantilla);
  const laminas = Object.keys(zip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  if (!laminas.length) throw new Error('Ese archivo no parece una presentación: no encontré láminas dentro.');

  const vistos = new Set<string>();
  let reemplazos = 0;
  for (const ruta of laminas) {
    const xml = await zip.file(ruta)!.async('string');
    const nuevo = xml.replace(/\{\{([A-Z_0-9]+)\}\}/g, (coincide, clave: string) => {
      vistos.add(clave);
      const v = valores[clave];
      if (v === undefined) return coincide;      // marcador que no sabemos llenar: se deja tal cual
      reemplazos++;
      return paraXml(v);
    });
    if (nuevo !== xml) zip.file(ruta, nuevo);
  }
  if (!vistos.size) {
    throw new Error('La plantilla no tiene marcadores {{…}}. Sube la que te pasé con los marcadores puestos.');
  }
  const blob = await zip.generateAsync({ type: 'blob', mimeType: MIME, compression: 'DEFLATE' });
  return { blob, reemplazos, sinUsar: [...vistos].filter(k => valores[k] === undefined) };
}
