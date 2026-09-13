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

  // ── developer (Santiago) ──
  const dev = (await apiLoginDemo('u-santiago')).user!;
  check('login demo developer', dev?.role === 'developer');
  check('estado cargado desde Mongo', await loadStateFromApi() && adminStore.getProjects().length === 1 && adminStore.getProjects()[0].id === 'MIGBD');
  check('front: developer sin plan.view ni team.manage', !hasPermission('developer', 'plan.view') && !hasPermission('developer', 'team.manage') && hasPermission('developer', 'tasks.update_status'));
  adminStore.savePlanIssues([...adminStore.getPlanIssues(), { id:'e2e-ok', planKey:'MIGBD', type:'bloqueante', title:'reportado por dev', startDate:'2026-09-13', impacts:[], createdBy:'e2e', createdAt:new Date().toISOString() }]);
  await wait(900);
  check('dev reporta bloqueante en su proyecto → en Mongo', persist.failures === 0 && (await apiGet('/api/state/timia_plan_issues')).data.some((i: any) => i.id === 'e2e-ok'));
  const f0 = persist.failures;
  adminStore.saveUsers(adminStore.getUsers().map(u => u.id === 'u-santiago' ? { ...u, role: 'pm' as any } : u)); await wait(900);
  check('dev se auto-asciende → rechazado', persist.failures > f0 && (await apiGet('/api/state/timia_admin_users')).data.find((u: any) => u.id === 'u-santiago').role === 'developer');
  await loadStateFromApi(); await apiLogout(); check('logout', (await apiMe()) === null);

  // ── PM (Juan) crea tarea; dev la mueve pero no la edita ──
  await apiLoginDemo('u-juan'); await loadStateFromApi();
  adminStore.saveKanbanTasks([{ id:'kt-e2e', title:'Tarea piloto', description:'', priority:'Media', startDate:'2026-09-13', endDate:'2026-09-20', status:'backlog', assigneeIds:['u-santiago'], projectId:'MIGBD', links:[], comments:[] }]); await wait(900);
  check('PM crea tarea en MIGBD', (await apiGet('/api/state/timia_kanban_tasks')).data.some((t: any) => t.id === 'kt-e2e'));
  await apiLogout(); await apiLoginDemo('u-santiago'); await loadStateFromApi();
  adminStore.saveKanbanTasks(adminStore.getKanbanTasks().map(t => t.id === 'kt-e2e' ? { ...t, status: 'in-progress' as any } : t)); await wait(900);
  check('dev mueve su tarea → ok', (await apiGet('/api/state/timia_kanban_tasks')).data.find((t: any) => t.id === 'kt-e2e').status === 'in-progress');
  const f1 = persist.failures; adminStore.saveKanbanTasks(adminStore.getKanbanTasks().map(t => t.id === 'kt-e2e' ? { ...t, title: 'hackeado' } : t)); await wait(900);
  check('dev edita título → rechazado', persist.failures > f1);
  await loadStateFromApi(); await apiLogout();

  // ── Gerente edita la matriz y el servidor la aplica ──
  const pm = (await apiLoginDemo('u-rodolfo')).user!; await loadStateFromApi();
  check('login gerente de cuenta', pm.role === 'account_manager' && hasPermission('account_manager', 'roles.manage'));
  const mx = currentMatrix(); mx.developer = mx.developer.filter(p => p !== 'tasks.update_status'); saveMatrix(mx); await wait(900);
  check('Gerente guarda matriz → en Mongo', (await apiGet('/api/state/timia_role_permissions')).data.developer.indexOf('tasks.update_status') < 0);
  await apiLogout(); await apiLoginDemo('u-santiago'); await loadStateFromApi();
  check('front: dev ya no puede mover tareas', !hasPermission('developer', 'tasks.update_status'));
  const f2 = persist.failures; adminStore.saveKanbanTasks(adminStore.getKanbanTasks().map(t => t.id === 'kt-e2e' ? { ...t, status: 'done' as any } : t)); await wait(900);
  check('servidor: dev mover tarea → 403', persist.failures > f2);
  await loadStateFromApi(); await apiLogout();
  await apiLoginDemo('u-rodolfo'); await loadStateFromApi(); saveMatrix({ ...currentMatrix(), developer: [...currentMatrix().developer, 'tasks.update_status'] }); await wait(900);
  check('Gerente restaura la matriz', (await apiGet('/api/state/timia_role_permissions')).data.developer.includes('tasks.update_status'));

  // ── Rol por proyecto: Amilkar líder base, developer en MIGBD por override ──
  adminStore.saveProjects(adminStore.getProjects()); // noop
  const { persistSet } = await import('../src/lib/persist.ts');
  persistSet('timia_project_roles', { 'u-amilkar:MIGBD': 'developer' }); await wait(900);
  await apiLogout(); const am = (await apiLoginDemo('u-amilkar')).user!; await loadStateFromApi();
  const { canInProject, effectiveRole } = await import('../src/lib/permissions.ts');
  check('front: Amilkar es developer EN MIGBD (override) y no ve el plan', effectiveRole(am, 'MIGBD') === 'developer' && !canInProject(am, 'plan.view', 'MIGBD'));
  const f3 = persist.failures; adminStore.savePlanPcts({ ...adminStore.getPlanPcts(), 'MIGBD-documentacion-y-0': 30 }); await wait(900);
  check('servidor: Amilkar (dev en MIGBD) no marca avance → 403', persist.failures > f3);
  await loadStateFromApi(); await apiLogout(); await apiLoginDemo('u-rodolfo'); await loadStateFromApi(); persistSet('timia_project_roles', {}); await wait(900);
  await apiLogout(); await apiLoginDemo('u-amilkar'); await loadStateFromApi();
  check('sin override: Amilkar líder técnico ve el plan', canInProject(am, 'plan.view', 'MIGBD'));
  adminStore.savePlanPcts({ ...adminStore.getPlanPcts(), 'MIGBD-documentacion-y-0': 30 }); await wait(900);
  check('líder técnico marca avance → ok', (await apiGet('/api/state/timia_plan_pcts')).data['MIGBD-documentacion-y-0'] === 30);
  await apiLogout();

  console.log(failed ? `\n${failed} prueba(s) fallida(s)` : '\nTODO OK');
  process.exit(failed ? 1 : 0);
})();
