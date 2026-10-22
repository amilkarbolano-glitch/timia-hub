// El menú tiene que caber en 13" (1366×768), que es la pantalla del equipo.
//
// No se mide render real: se estima el ancho con las medidas de la barra
// —texto a 14px, gap de 16px a <1280 y 20px a ≥1280, chevron 12px— y se
// compara contra lo que queda libre tras el logo y el bloque de la derecha.

import { menuDe, esGrupo, type ItemMenu, type GrupoMenu } from '../src/components/Layout';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

/** Ancho aproximado de un texto a 14px en la fuente del sistema. */
const anchoTexto = (t: string) => t.length * 7.4;
const anchoEntrada = (e: ItemMenu | GrupoMenu) =>
  anchoTexto(e.label) + (esGrupo(e) ? 16 : 0);   // chevron + su gap

function anchoNav(rol: string, gap: number) {
  const m = menuDe(rol);
  return m.reduce((s, e) => s + anchoEntrada(e), 0) + Math.max(0, m.length - 1) * gap;
}

// Lo que ocupa el resto del header: logo + wordmark, buscador, badges, avatar.
const LOGO = 32 + 12 + 90;
const DERECHA_13 = 300;   // en 13" el buscador se oculta (hidden xl:block)
const DERECHA_HD = 460;

const ROLES = ['account_manager', 'pm', 'tech_lead', 'developer', 'platform_admin'];

console.log('── Cuántos ítems quedan arriba ──');
for (const rol of ROLES) {
  const m = menuDe(rol);
  const sueltos = m.filter(e => !esGrupo(e)).length;
  const grupos  = m.filter(esGrupo).length;
  ok(m.length <= 6, `${rol.padEnd(16)} ${m.length} ítems (${sueltos} directos, ${grupos} desplegables)`);
}

console.log('\n── Caben a 1366 (13") ──');
for (const rol of ROLES) {
  const libre = 1366 - 24 - LOGO - DERECHA_13;   // px-3 a cada lado
  const usa = anchoNav(rol, 16);
  ok(usa <= libre, `${rol.padEnd(16)} usa ~${Math.round(usa)}px de ${Math.round(libre)}px libres`);
}

console.log('\n── Y a 1280, que es el salto de breakpoint ──');
for (const rol of ROLES) {
  const libre = 1280 - 24 - LOGO - DERECHA_13;
  ok(anchoNav(rol, 16) <= libre, `${rol.padEnd(16)} usa ~${Math.round(anchoNav(rol,16))}px de ${Math.round(libre)}px`);
}

console.log('\n── A 1920 sobra sitio de todos modos ──');
ok(anchoNav('account_manager', 20) <= 1920 - 48 - LOGO - DERECHA_HD, 'el rol con más accesos entra holgado en Full HD');

console.log('\n── Nada se perdió por el camino ──');
// Las pantallas que existían antes tienen que seguir alcanzables desde el menú.
const DEBEN_ESTAR = ['dashboard','analytics','proyectos','plan-trabajo','estimaciones','bitacora',
                     'imputaciones','activity-report','inventario','fabrica','links',
                     'admin','roles-permissions','audit','project-templates'];
const alcanzables = new Set(
  ROLES.flatMap(r => menuDe(r).flatMap(e => esGrupo(e) ? e.items.map(i => i.view) : [e.view])));
const faltan = DEBEN_ESTAR.filter(v => !alcanzables.has(v as never));
ok(faltan.length === 0, `las ${DEBEN_ESTAR.length} pantallas siguen llegando desde el menú${faltan.length ? ': faltan ' + faltan : ''}`);

// Un developer no puede ver administración por error.
const dev = new Set(menuDe('developer').flatMap(e => esGrupo(e) ? e.items.map(i => i.view) : [e.view]));
ok(!dev.has('roles-permissions' as never) && !dev.has('audit' as never),
   'un developer no ve Roles ni Auditoría en el menú');
ok(dev.has('bitacora' as never), 'pero sí ve sus Tareas');

// Ningún grupo vacío: un desplegable sin nada dentro es un callejón sin salida.
for (const rol of ROLES) {
  const vacios = menuDe(rol).filter(e => esGrupo(e) && e.items.length === 0);
  ok(vacios.length === 0, `${rol.padEnd(16)} no tiene desplegables vacíos`);
}

console.log(f ? `\n${f} fallas` : '\nmenú OK');
