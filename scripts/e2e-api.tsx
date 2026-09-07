// E2E front ↔ API: usa el código real del front (persist/adminStore/permissions) contra la API en :8000.
// Uso: (en ../timia-hub-api) python dev_mock.py   →   npm run e2e:api
import { JSDOM } from 'jsdom';
import { CookieJar } from 'tough-cookie';
const API = process.env.API_URL ?? 'http://localhost:8000';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const w: any = dom.window;
for (const k of ['window','document','HTMLElement','Node','Element','localStorage','MouseEvent','Event']) { try { (globalThis as any)[k] = w[k]; } catch {} }
Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
const jar = new CookieJar(); const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any = {}) => {
  const u = String(url); const cookie = await jar.getCookieString(u);
  const res = await realFetch(u, { ...init, headers: { ...(init.headers ?? {}), ...(cookie ? { cookie } : {}) } });
  for (const sc of (res.headers as any).getSetCookie?.() ?? []) await jar.setCookie(sc, u);
  return res;
}) as any;
w.TIMIA_API_URL = API;
let failed = 0;
const check = (name: string, ok: boolean, extra = '') => { console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failed++; };
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const apiGet = async (p: string) => { const r = await fetch(`${API}${p}`); return { status: r.status, data: r.ok ? await r.json() : null }; };

(async () => {
  const { seedFromRemote, adminStore } = await import('../src/lib/adminStore.ts');
  const { persist, apiMe, apiLoginDemo, apiLogout, loadStateFromApi } = await import('../src/lib/persist.ts');
  const { hasPermission, currentMatrix, saveMatrix } = await import('../src/lib/permissions.ts');

  await seedFromRemote();
  check('arranque en modo API sin sesión', persist.mode === 'api' && (await apiMe()) === null);
  check('login inválido rechazado', !!(await apiLoginDemo('nadie')).error);

  // ── developer ──
  const dev = (await apiLoginDemo('u-sergio')).user!;
  check('login demo developer', dev?.role === 'developer');
  check('estado cargado desde Mongo', await loadStateFromApi() && adminStore.getPlanIssues().length > 0);
  check('front: developer sin team.manage / con tasks.update_status', !hasPermission('developer', 'team.manage') && hasPermission('developer', 'tasks.update_status'));

  const issues0 = adminStore.getPlanIssues();
  adminStore.savePlanIssues([...issues0, { id:'e2e-ok', planKey:'CRONOS', type:'alerta', title:'propio proyecto', startDate:'2026-09-07', impacts:[], createdBy:'e2e', createdAt:new Date().toISOString() }]);
  await wait(900);
  check('issue en proyecto propio → guardado en Mongo', persist.failures === 0 && (await apiGet('/api/state/timia_plan_issues')).data.some((i: any) => i.id === 'e2e-ok'));

  const other = ['BCBS239','MURIC','SDM1','OPTIM'].find(p => !dev.projectIds.includes(p))!;
  adminStore.savePlanIssues([...adminStore.getPlanIssues(), { id:'e2e-bad', planKey: other, type:'alerta', title:'otro proyecto', startDate:'2026-09-07', impacts:[], createdBy:'e2e', createdAt:new Date().toISOString() }]);
  await wait(900);
  check(`issue en ${other} (sin acceso) → rechazado por el servidor`, persist.failures > 0 && !(await apiGet('/api/state/timia_plan_issues')).data.some((i: any) => i.id === 'e2e-bad'));
  await loadStateFromApi();   // resincronizar caché con lo que realmente quedó

  const tasks = adminStore.getKanbanTasks(); const mine = tasks.find(t => dev.projectIds.includes(t.projectId ?? ''))!;
  adminStore.saveKanbanTasks(tasks.map(t => t.id === mine.id ? { ...t, status: t.status === 'done' ? 'backlog' : 'done' } : t)); await wait(900);
  check('developer mueve su tarea de estado → ok', (await apiGet('/api/state/timia_kanban_tasks')).data.find((t: any) => t.id === mine.id).status !== mine.status);
  const f0 = persist.failures;
  adminStore.saveKanbanTasks(adminStore.getKanbanTasks().map(t => t.id === mine.id ? { ...t, title: 'hackeado' } : t)); await wait(900);
  check('developer edita título → rechazado', persist.failures > f0 && (await apiGet('/api/state/timia_kanban_tasks')).data.find((t: any) => t.id === mine.id).title !== 'hackeado');
  await loadStateFromApi();

  const f1 = persist.failures;
  adminStore.saveUsers(adminStore.getUsers().map(u => u.id === 'u-sergio' ? { ...u, role: 'pm' as any } : u)); await wait(900);
  check('developer se auto-asciende a pm → rechazado', persist.failures > f1 && (await apiGet('/api/state/timia_admin_users')).data.find((u: any) => u.id === 'u-sergio').role === 'developer');
  await loadStateFromApi();
  await apiLogout(); check('logout', (await apiMe()) === null);

  // ── PM edita la matriz y el servidor la aplica ──
  const pm = (await apiLoginDemo('u-rodolfo')).user!; await loadStateFromApi();
  check('login PM', pm.role === 'pm' && hasPermission('pm', 'roles.manage'));
  const mx = currentMatrix(); mx.developer = mx.developer.filter(p => p !== 'tasks.update_status');
  saveMatrix(mx); await wait(900);
  check('PM guarda matriz → en Mongo', (await apiGet('/api/state/timia_role_permissions')).data.developer.indexOf('tasks.update_status') < 0);
  await apiLogout();
  await apiLoginDemo('u-sergio'); await loadStateFromApi();
  check('front: developer ya no puede mover tareas (matriz recargada)', !hasPermission('developer', 'tasks.update_status'));
  const f2 = persist.failures; const t2 = adminStore.getKanbanTasks().find(t => dev.projectIds.includes(t.projectId ?? ''))!;
  adminStore.saveKanbanTasks(adminStore.getKanbanTasks().map(t => t.id === t2.id ? { ...t, status: t.status === 'done' ? 'backlog' : 'done' } : t)); await wait(900);
  check('servidor: developer mover tarea → 403 tras el cambio de matriz', persist.failures > f2);
  await apiLogout();
  const pm2 = await apiLoginDemo('u-rodolfo'); await loadStateFromApi(); saveMatrix({ ...currentMatrix(), developer: [...currentMatrix().developer, 'tasks.update_status'] }); await wait(900);
  check('PM restaura la matriz', !!pm2.user && (await apiGet('/api/state/timia_role_permissions')).data.developer.includes('tasks.update_status'));

  console.log(failed ? `\n${failed} prueba(s) fallida(s)` : '\nTODO OK');
  process.exit(failed ? 1 : 0);
})();
