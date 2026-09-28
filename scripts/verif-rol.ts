// Comprobación del rol platform_admin en el front (espejo de las pruebas del back)
import { DEFAULT_ROLE_PERMISSIONS, ADMIN_PERMISSIONS, effectiveRole, ROLE_META } from '../src/lib/permissions';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

ok(!!ROLE_META.platform_admin, 'platform_admin está en el catálogo de roles');
const p = DEFAULT_ROLE_PERMISSIONS.platform_admin;
ok(['team.manage','roles.manage','config.manage','projects.manage','audit.view'].every(x => p.includes(x)),
   'tiene los permisos de administración');
ok(!['plan.edit_progress','estimaciones.edit','tasks.manage'].some(x => p.includes(x)),
   'no tiene permisos operativos');

// effectiveRole usa localStorage; se simula
(globalThis as any).localStorage = {
  _d: { timia_project_roles: JSON.stringify({ 'u-amilkar:MIGBD': 'tech_lead' }) },
  getItem(k: string) { return this._d[k] ?? null; },
};
const u = { id: 'u-amilkar', role: 'platform_admin' };
ok(effectiveRole(u, 'MIGBD') === 'tech_lead', 'en MIGBD (con override) es tech_lead');
ok(effectiveRole(u, 'FICO') === 'developer', 'en FICO (sin override) cae a developer');
ok(effectiveRole(u) === 'platform_admin', 'sin proyecto, es platform_admin');

const gc = { id: 'u-rodolfo', role: 'account_manager' };
(globalThis as any).localStorage._d.timia_project_roles = JSON.stringify({ 'u-rodolfo:MIGBD': 'developer' });
ok(effectiveRole(gc, 'MIGBD') === 'account_manager', 'el gerente de cuenta ignora los overrides');

console.log(f === 0 ? '\nrol platform_admin OK' : `\n${f} fallas`);
process.exit(f ? 1 : 0);
