// ─── Rutas por URL (history mode) ────────────────────────────────────────────
// Mapa vista ↔ ruta. nginx/Amplify/Pages redirigen todo a index.html, así que las
// rutas son "reales": enlaces compartibles y botón Atrás/Adelante del navegador.
import type { View } from '../components/Layout';

const BASE = ((import.meta as any).env?.BASE_URL ?? '/').replace(/\/+$/, '');   // '' en local, '/timia-hub' en Pages

export const VIEW_PATHS: Record<View, string> = {
  'analytics': '/', 'dashboard': '/tablero', 'plan-trabajo': '/plan', 'estimaciones': '/estimaciones',
  'bitacora': '/tareas', 'imputaciones': '/imputaciones', 'activity-report': '/activity-report',
  'inventario': '/inventario', 'links': '/links', 'circuitos-bbva': '/circuitos', 'proyectos': '/proyectos',
  'admin': '/admin', 'roles-permissions': '/admin/roles', 'audit': '/auditoria', 'bank-status': '/banco',
  'standards': '/estandares', 'notifications': '/notificaciones', 'project-templates': '/plantillas',
  'setup-project': '/nuevo-proyecto', 'setup-team': '/nuevo-proyecto/equipo', 'setup-tasks': '/nuevo-proyecto/tareas',
};
const PATH_VIEWS: [string, View][] = (Object.entries(VIEW_PATHS) as [View, string][]).map(([v, p]): [string, View] => [p, v]).sort((a, b) => b[0].length - a[0].length);

/** Construye la URL de una vista (con parámetro opcional, ej. proyecto del plan). */
export function pathFor(view: View, param?: string): string {
  const p = VIEW_PATHS[view] ?? '/';
  return BASE + (param ? `${p === '/' ? '' : p}/${encodeURIComponent(param)}` : p);
}

/** Interpreta la URL actual: vista + parámetro (segmento adicional). */
export function parsePath(pathname: string = window.location.pathname): { view: View | null; param?: string } {
  let path = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  path = path.replace(/\/+$/, '') || '/';
  for (const [p, v] of PATH_VIEWS) {
    if (p === '/') continue;
    if (path === p) return { view: v };
    if (path.startsWith(p + '/')) return { view: v, param: decodeURIComponent(path.slice(p.length + 1).split('/')[0]) };
  }
  return { view: path === '/' ? 'analytics' : null };
}
