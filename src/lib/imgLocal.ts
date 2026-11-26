/**
 * Guardado local de las imágenes de las notas, en IndexedDB.
 *
 * Existe porque el front se publica también sin API detrás (en Pages, con
 * `TIMIA_API_URL` vacío, el POST va al propio host estático y devuelve 405).
 * Sin este respaldo, pegar una captura ahí no haría nada.
 *
 * IndexedDB y no localStorage: localStorage son unos 5 MB por origen y lo
 * comparte con TODO el estado de la aplicación, así que una imagen ahí deja
 * sin espacio al resto y el `setItem` falla en silencio. IndexedDB guarda
 * blobs, tiene cientos de megas y es asíncrono.
 *
 * La clave es el mismo SHA-256 que usa el API, así que una nota escrita sin
 * API ya queda apuntando a la URL definitiva: el día que el API esté arriba,
 * la imagen se sube y la nota no cambia ni una letra.
 */

const DB = 'timia-notas';
const STORE = 'imagenes';
const VERSION = 1;

function abrir(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(res => {
    try {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    } catch { res(null); }
  });
}

function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return abrir().then(d => {
    if (!d) return null;
    return new Promise<T | null>(res => {
      try {
        const t = d.transaction(STORE, modo);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => res(req.result ?? null);
        req.onerror = () => res(null);
      } catch { res(null); }
    });
  });
}

export async function guardarLocal(sha: string, blob: Blob): Promise<boolean> {
  const r = await tx('readwrite', s => s.put(blob, sha) as unknown as IDBRequest<IDBValidKey>);
  return r !== null;
}

export async function leerLocal(sha: string): Promise<Blob | null> {
  const r = await tx('readonly', s => s.get(sha) as IDBRequest<Blob | undefined>);
  return (r as Blob | null) ?? null;
}

export async function shasLocales(): Promise<string[]> {
  const r = await tx('readonly', s => s.getAllKeys() as IDBRequest<IDBValidKey[]>);
  return ((r as IDBValidKey[] | null) ?? []).map(String);
}

/** El SHA-256 del contenido, en hexadecimal: la misma clave que calcula el API. */
export async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
