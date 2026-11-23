/**
 * Imágenes de las notas: reducir en el navegador y subir.
 *
 * La reducción se hace aquí, antes de subir, por dos razones: la captura de
 * pantalla que alguien pega pesa 2 MB y no hace falta ni un píxel de eso para
 * leerla, y hacerlo en el servidor obligaría a meter Pillow y trabajo de CPU
 * en el contenedor del API.
 *
 * WebP a calidad 0,9 y no JPEG: a calidad equivalente pesa entre un 25% y un
 * 35% menos y, sobre todo, no aplica submuestreo de color, así que el texto
 * fino de una captura —que es casi todo lo que se pega en una nota de trabajo—
 * sigue legible. Un JPEG al 0,8 ensucia las letras de 10 px.
 *
 * 2000 px de lado mayor alcanza para leer un Gantt completo en un monitor de
 * 1440 y para imprimir en A4.
 */
import { apiBase } from './persist';
import { guardarLocal, sha256 } from './imgLocal';

export const LADO_MAX = 2000;
export const CALIDAD = 0.9;

/** Un PNG pequeño o con transparencia se sube tal cual: convertirlo no ahorra
 *  nada y sí puede perder nitidez. */
const PNG_INTOCABLE = 200 * 1024;

export interface ImagenSubida {
  id: string;
  /** Siempre la ruta del API, con o sin API detrás: una nota escrita sin
   *  servidor queda apuntando a la URL definitiva. */
  url: string;
  len: number;
  /** true = quedó solo en este navegador porque el API no la aceptó. */
  local: boolean;
}

/** Ruta canónica de una imagen. La base del API se añade al pintar. */
export function rutaDeImagen(sha: string): string { return `/api/notas/imagenes/${sha}`; }

function leerComoImagen(file: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, err) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); err(new Error('no se pudo leer la imagen')); };
    img.src = url;
  });
}

function soportaWebp(): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch { return false; }
}

/** Devuelve los bytes a subir y su tipo, ya reducidos si hacía falta. */
export async function prepararImagen(file: File | Blob): Promise<{ blob: Blob; mime: string; w: number; h: number }> {
  const tipo = (file as File).type || '';
  if (!/^image\//.test(tipo)) throw new Error('eso no es una imagen');

  const img = await leerComoImagen(file);
  const { naturalWidth: w0, naturalHeight: h0 } = img;
  const cabe = Math.max(w0, h0) <= LADO_MAX;

  if (tipo === 'image/png' && file.size <= PNG_INTOCABLE && cabe) {
    return { blob: file, mime: 'image/png', w: w0, h: h0 };
  }
  if (tipo === 'image/gif') {
    // Un gif animado se rompe al pasarlo por canvas: se queda el primer
    // fotograma. Mejor subirlo tal cual y que pese lo que pese.
    return { blob: file, mime: 'image/gif', w: w0, h: h0 };
  }

  const escala = cabe ? 1 : LADO_MAX / Math.max(w0, h0);
  const w = Math.round(w0 * escala);
  const h = Math.round(h0 * escala);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('el navegador no permite redimensionar aquí');
  ctx.drawImage(img, 0, 0, w, h);

  const mime = soportaWebp() ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, mime, CALIDAD));
  if (!blob) throw new Error('no se pudo convertir la imagen');
  // Si la conversión no mejoró nada y el original ya era pequeño, se queda el original.
  if (blob.size >= file.size && cabe && /^image\/(png|jpeg|webp)$/.test(tipo)) {
    return { blob: file, mime: tipo, w: w0, h: h0 };
  }
  return { blob, mime, w, h };
}

/**
 * Guarda la imagen y devuelve su ruta. El id es el SHA-256 del contenido, así
 * que la misma captura pegada dos veces no se duplica.
 *
 * Intenta el API y, si no hay API detrás, cae a IndexedDB. Los códigos que
 * disparan el respaldo son los de «aquí no hay un API»: 404 y 405 los da un
 * host estático —Pages devuelve 405 a cualquier POST—, 501 un proxy sin ruta,
 * y un fetch que revienta es que no hay nada escuchando. Un 401 o un 413 NO
 * caen al respaldo: ahí el API sí existe y está diciendo algo que hay que
 * leer.
 */
export async function subirImagen(file: File | Blob): Promise<ImagenSubida> {
  const { blob, mime } = await prepararImagen(file);
  const sha = await sha256(blob);
  const base = apiBase();

  if (base !== null) {
    try {
      const r = await fetch(`${base}/api/notas/imagenes`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': mime },
        body: blob,
      });
      if (r.ok) {
        const j = await r.json();
        return { id: j.id, url: j.url as string, len: j.len as number, local: false };
      }
      if (r.status === 401) throw new Error('la sesión caducó: vuelve a entrar y repite');
      if (r.status === 413) throw new Error('la imagen es demasiado grande incluso reducida');
      if (r.status === 415) throw new Error('ese formato de imagen no se admite');
      if (![404, 405, 501].includes(r.status)) {
        const detalle = await r.text().catch(() => '');
        throw new Error(`el API respondió ${r.status} ${detalle.slice(0, 100)}`);
      }
      // 404 / 405 / 501: no hay API al otro lado. Sigue al respaldo local.
    } catch (e) {
      // Un Error que ya trae mensaje propio es del API y se respeta.
      if (e instanceof Error && /sesión|grande|formato|respondió/.test(e.message)) throw e;
    }
  }

  const ok = await guardarLocal(sha, blob);
  if (!ok) throw new Error('no se pudo guardar la imagen en este navegador');
  return { id: sha, url: rutaDeImagen(sha), len: blob.size, local: true };
}

/**
 * El markdown que se inserta en la nota. El ancho va dentro del pie, tras una
 * barra (`![pie|540](ruta)`), para no inventar sintaxis fuera del markdown:
 * cualquier otro visor lo seguirá leyendo como una imagen con un pie raro, no
 * como algo roto.
 */
export function marcaDeImagen(url: string, pie = '', ancho?: number): string {
  const alt = ancho ? `${pie}|${ancho}` : pie;
  return `\n![${alt}](${url})\n`;
}

/** Reescribe el ancho de la n-ésima imagen con ese sha dentro del cuerpo. */
export function conAnchoDeImagen(cuerpo: string, sha: string, indice: number, ancho: number | null): string {
  const re = new RegExp(`!\\[([^\\]]*)\\]\\((\\/api\\/notas\\/imagenes\\/${sha})\\)`, 'g');
  let i = -1;
  return cuerpo.replace(re, (m, alt: string, ruta: string) => {
    i++;
    if (i !== indice) return m;
    const pie = /\|\d{2,4}$/.test(alt) ? alt.replace(/\|\d{2,4}$/, '') : alt;
    return `![${ancho ? `${pie}|${ancho}` : pie}](${ruta})`;
  });
}
