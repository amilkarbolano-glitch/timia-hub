// ─── persist — capa de persistencia del front ────────────────────────────────
// localStorage sigue siendo la caché de lectura síncrona (todo el app lee de ahí).
// Si hay API (FastAPI + Mongo), al arrancar se carga TODO el estado desde
// GET /api/state y cada escritura se replica con PUT /api/state/{key}.
// Si no hay API (GitHub Pages, sin red), se usa public/db.json como hasta ahora.
//
// Base de la API:
//   · VITE_API_URL en build (ej. https://api.midominio.com). Vacío/undefined ⇒ mismo
//     origen ("/api"), que es lo que usa el contenedor web (nginx hace proxy).
//   · window.TIMIA_API_URL inyectado en runtime (public/config.js) tiene prioridad.
//   · 'none' desactiva la API explícitamente.

export type PersistMode = 'api' | 'local';

declare global { interface Window { TIMIA_API_URL?: string; TIMIA_API_KEY?: string } }

function resolveBase(): string | null {
  const runtime = typeof window !== 'undefined' ? window.TIMIA_API_URL : undefined;
  const env = (import.meta as any).env?.VITE_API_URL as string | undefined;
  const raw = runtime ?? env ?? '';
  if (raw === 'none') return null;
  return raw.replace(/\/+$/, '');
}

const state = {
  mode: 'local' as PersistMode,
  base: resolveBase(),
  apiKey: (typeof window !== 'undefined' ? window.TIMIA_API_KEY : undefined) ?? ((import.meta as any).env?.VITE_API_KEY as string | undefined) ?? '',
  pending: new Map<string, ReturnType<typeof setTimeout>>(),
  queue: new Map<string, unknown>(),
  failures: 0,
  listeners: new Set<() => void>(),
};

export const persist = {
  get mode(): PersistMode { return state.mode; },
  get apiBase(): string | null { return state.base; },
  get pendingWrites(): number { return state.queue.size; },
  get failures(): number { return state.failures; },
  onChange(fn: () => void) { state.listeners.add(fn); return () => { state.listeners.delete(fn); }; },
};
function notify() { state.listeners.forEach(fn => { try { fn(); } catch {} }); }

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (state.apiKey) h['X-API-Key'] = state.apiKey;
  return h;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); }
  finally { clearTimeout(t); }
}

/** Intenta cargar todo el estado desde la API. Devuelve el mapa de keys o null si no hay API. */
export async function loadFromApi(): Promise<Record<string, unknown> | null> {
  if (state.base === null) return null;
  try {
    const res = await fetchWithTimeout(`${state.base}/api/state`, { headers: headers(), cache: 'no-store' }, 6000);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return null;   // p.ej. GitHub Pages devolviendo index.html
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    state.mode = 'api';
    notify();
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function flush(key: string) {
  const value = state.queue.get(key);
  state.queue.delete(key);
  state.pending.delete(key);
  if (state.mode !== 'api' || state.base === null) return;
  try {
    const res = await fetchWithTimeout(`${state.base}/api/state/${encodeURIComponent(key)}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ value }) }, 10000);
    if (!res.ok) throw new Error(String(res.status));
    state.failures = 0;
  } catch {
    state.failures++;
    // reintento único con backoff; si vuelve a fallar queda en localStorage (se reintenta al volver a escribir)
    if (!state.queue.has(key)) { state.queue.set(key, value); state.pending.set(key, setTimeout(() => flush(key), 4000)); }
  }
  notify();
}

/** Escribe una key: siempre en localStorage; si hay API, la replica (debounce 300 ms por key). */
export function persistSet(fullKey: string, value: unknown): void {
  try { localStorage.setItem(fullKey, JSON.stringify(value)); } catch {}
  if (state.mode !== 'api') return;
  state.queue.set(fullKey, value);
  const prev = state.pending.get(fullKey);
  if (prev) clearTimeout(prev);
  state.pending.set(fullKey, setTimeout(() => flush(fullKey), 300));
  notify();
}

/** Lee una key (JSON) de localStorage con default. */
export function persistGet<T>(fullKey: string, def: T): T {
  try { const v = localStorage.getItem(fullKey); return v ? (JSON.parse(v) as T) : def; } catch { return def; }
}

/** Vacía la cola antes de cerrar la pestaña. */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (state.mode !== 'api' || state.base === null || !state.queue.size) return;
    state.queue.forEach((value, key) => {
      try { navigator.sendBeacon?.(`${state.base}/api/state/${encodeURIComponent(key)}?beacon=1`, new Blob([JSON.stringify({ value })], { type: 'application/json' })); } catch {}
    });
  });
}
