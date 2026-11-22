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

export const LADO_MAX = 2000;
export const CALIDAD = 0.9;

/** Un PNG pequeño o con transparencia se sube tal cual: convertirlo no ahorra
 *  nada y sí puede perder nitidez. */
const PNG_INTOCABLE = 200 * 1024;

export interface ImagenSubida { id: string; url: string; len: number }

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
 * Sube la imagen y devuelve su URL. El id es el SHA-256 del contenido, así que
 * la misma captura pegada dos veces se guarda una sola vez.
 */
export async function subirImagen(file: File | Blob): Promise<ImagenSubida> {
  const { blob, mime } = await prepararImagen(file);
  const base = apiBase();
  if (base === null) throw new Error('sin API: las imágenes necesitan sesión en el servidor');
  const r = await fetch(`${base}/api/notas/imagenes`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': mime },
    body: blob,
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => '');
    throw new Error(r.status === 413 ? 'la imagen es demasiado grande' : `no se pudo subir (${r.status}) ${detalle.slice(0, 120)}`);
  }
  const j = await r.json();
  return { id: j.id, url: j.url as string, len: j.len as number };
}

/** El markdown que se inserta en la nota. */
export function marcaDeImagen(url: string, pie = ''): string {
  return `\n![${pie}](${url})\n`;
}
