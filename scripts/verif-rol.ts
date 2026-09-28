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
if (f) process.exit(1);

// ── Roles personalizados: no pueden romper nada ────────────────────────────
import { customRoles, saveCustomRoles, allRoleMeta, idRolValido, currentMatrix } from '../src/lib/permissions';
import { normalizeRole } from '../src/contexts/AuthContext';

console.log('\n── Roles personalizados ──');
{
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  let cf = 0;
  const c = (cond: boolean, s: string) => { if (!cond) cf++; console.log(`${cond ? '✓' : '✗'} ${s}`); };

  store.timia_custom_roles = JSON.stringify([
    { id: 'auditor', name: 'Auditor', permissions: ['plan.view', 'audit.view'] },
    { id: 'pm', name: 'Pisar un rol de fábrica', permissions: [] },
    { id: 'con espacios', name: 'Id inválido', permissions: ['plan.view'] },
    { id: 'roto', name: 'Permiso inventado', permissions: ['no.existe', 'plan.view'] },
  ]);

  const ids = customRoles().map(r => r.id);
  c(ids.includes('auditor'), 'el rol válido se carga');
  c(!ids.includes('pm'), 'no puede pisar un rol de fábrica');
  c(!ids.includes('con espacios'), 'los ids inválidos se descartan');
  c(customRoles().find(r => r.id === 'roto')?.permissions.join() === 'plan.view',
    'los permisos inventados se filtran');

  const m = currentMatrix();
  c(m.auditor?.join() === 'plan.view,audit.view', 'entra en la matriz con sus permisos');
  c(m.pm?.length > 5, 'el rol de fábrica conserva los suyos');

  c(!!allRoleMeta().auditor, 'aparece en el catálogo de roles asignables');
  c(String(normalizeRole('auditor')) === 'auditor', 'un usuario puede tenerlo asignado');
  c(String(normalizeRole('borrado')) === 'developer', 'si el rol no existe, el usuario cae a developer');
  c(!idRolValido('pm') && idRolValido('qa'), 'validación de id nuevo');

  console.log(cf === 0 ? 'roles personalizados OK' : `${cf} fallas`);
  if (cf) process.exit(1);
}

// ── Etiqueta de rol en el header ───────────────────────────────────────────
// Una cadena de ifs con tres roles hacía que platform_admin y los roles
// personalizados se mostraran como "Desarrollador".
console.log('\n── Etiqueta del badge de rol ──');
{
  const etiqueta = (rol: string) => allRoleMeta()[rol]?.name ?? 'Sin rol';
  let ef = 0;
  const c = (got: string, esp: string, s: string) => { if (got !== esp) ef++; console.log(`${got === esp ? '✓' : '✗'} ${s} → "${got}"`); };
  c(etiqueta('platform_admin'), 'Administrador de la plataforma', 'platform_admin');
  c(etiqueta('tech_lead'), 'Líder / Referente técnico', 'tech_lead');
  c(etiqueta('account_manager'), 'Gerente de cuenta', 'account_manager');
  c(etiqueta('developer'), 'Desarrollador', 'developer');
  c(etiqueta('auditor'), 'Auditor', 'un rol personalizado');
  c(etiqueta('no_existe'), 'Sin rol', 'un rol inexistente no dice "Desarrollador"');
  console.log(ef === 0 ? 'etiquetas OK' : `etiquetas: ${ef} fallas`);
  if (ef) process.exit(1);
}

// ── Rol que muestra el badge: el más alto entre los proyectos ──────────────
console.log('\n── Rol principal del badge ──');
{
  const { rolPrincipal, esAdminPlataforma } = await import('../src/lib/permissions');
  (globalThis as any).localStorage.setItem('timia_project_roles', JSON.stringify({
    'u-amilkar:MIGBD': 'tech_lead',   // administra la plataforma, pero acá es líder técnico
    'u-ana:FICO': 'tech_lead',
    'u-ana:MIGBD': 'developer',
  }));
  let bf = 0;
  const c = (got: string, esp: string, s: string) => { if (got !== esp) bf++; console.log(`${got === esp ? '✓' : '✗'} ${s} → ${got}`); };

  c(rolPrincipal({ id: 'u-amilkar', role: 'platform_admin', projectIds: ['MIGBD'] }), 'tech_lead',
    'admin de plataforma con MIGBD como líder técnico');
  c(rolPrincipal({ id: 'u-ana', role: 'developer', projectIds: ['FICO', 'MIGBD'] }), 'tech_lead',
    'líder técnico en uno y developer en otro → gana el más alto');
  c(rolPrincipal({ id: 'u-luis', role: 'developer', projectIds: ['MIGBD'] }), 'developer',
    'developer sin ningún liderazgo');
  c(rolPrincipal({ id: 'u-rodo', role: 'account_manager', projectIds: [] }), 'account_manager',
    'el gerente de cuenta lo es sobre toda la cuenta');
  c(rolPrincipal({ id: 'u-nuevo', role: 'platform_admin', projectIds: [] }), 'platform_admin',
    'sin proyectos se muestra el rol base, no se inventa uno');

  const adm = esAdminPlataforma({ id: 'u-amilkar', role: 'platform_admin' });
  const noAdm = esAdminPlataforma({ id: 'u-luis', role: 'developer' });
  if (!adm || noAdm) bf++;
  console.log(`${adm && !noAdm ? '✓' : '✗'} el escudo aparece solo para quien administra`);
  console.log(bf === 0 ? 'rol principal OK' : `rol principal: ${bf} fallas`);
  if (bf) process.exit(1);
}
