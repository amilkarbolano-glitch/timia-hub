// ─── Fábrica — estatus interno por objeto ────────────────────────────────────
// El seguimiento de la fábrica no es un cronograma: es una tubería. Cada objeto
// que entra recorre los mismos 28 pasos, y lo que importa es en cuál está y qué
// lo tiene parado. Un objeto puede pertenecer a cualquier SDATOOL, así que la
// vista es transversal a los proyectos — al revés que el Plan de Trabajo.
//
// Modelado desde "Status Fábrica - Interno.xlsx", hoja Estatus Global.

import { persistSet, persistGet } from './persist';

export type EstadoPaso = 'ok' | 'pte' | 'na' | 'otro';

export interface PasoObjeto {
  estado: EstadoPaso;
  /**
   * Fecha de cierre del paso (dd/mm/aaaa), tal como la anota la fábrica.
   * Se llama `fecha` y no `fin` porque así venían las celdas del Excel y así
   * están los 1128 pasos ya cargados; renombrarla obligaría a migrar todo
   * para no ganar nada.
   */
  fecha?: string;
  /** Cuándo se empezó. El Excel no la traía: se llena desde la herramienta. */
  inicio?: string;
  /** Algunas celdas traen el enlace al repo o al documento en vez de un estado. */
  link?: string;
  /** Texto libre cuando la celda no es OK/NA/PTE. */
  nota?: string;
}

/** Cuántos días hábiles tomó un paso, si tiene las dos fechas. */
export function duracion(p: PasoObjeto | undefined): number | null {
  const a = fechaCol(p?.inicio), b = fechaCol(p?.fecha);
  if (!a || !b || b < a) return null;
  // Empezar y terminar el mismo día son 0 días, no 1: lo que se mide es cuánto
  // esperó el objeto, y si entró y salió el martes no esperó nada.
  let dias = 0;
  for (const d = new Date(a); d < b; d.setDate(d.getDate() + 1)) {
    const s = d.getDay();
    if (s !== 0 && s !== 6) dias++;
  }
  return dias;
}

/** dd/mm/aaaa → Date. La fábrica escribe en ese formato, no en ISO. */
export function fechaCol(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const año = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  const d = new Date(año, +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? null : d;
}

export interface ObjetoFabrica {
  id: string;
  proyecto: string;
  objetoInsumo: string;
  objeto: string;
  responsable: string;
  contactoBanco: string;
  periodicidad: string;
  estado: string;
  comentarios: string;
  /**
   * Cuándo quedó registrado el objeto. En los 55 que vinieron del Excel es la
   * fecha de recepción que anotó David; en los nuevos se pone sola al crear.
   * No se edita a mano: es el «cuándo entró esto», no un campo de gestión.
   */
  fechaRecepcion: string;
  pasos: Record<string, PasoObjeto>;
}

export interface PasoCatalogo { id: string; label: string; fase: string; }

/**
 * Las 5 fases con que arranca el catálogo. No son fijas: salen de los pasos
 * guardados, así que si David agrega una fase nueva aparece sola.
 */
export const FASES_SEMILLA = ['Gobierno', 'Desarrollo', 'Pruebas', 'Certificación', 'Producción'];

/**
 * Los 28 pasos del Excel son la semilla, no la ley. El proceso de la fábrica
 * cambia — se agrega una certificación, se deja de usar una herramienta — y
 * eso no puede obligar a tocar el código. El catálogo vive en la base; esto
 * es solo con qué empieza si nunca se ha editado.
 */
export const PASOS_SEMILLA: PasoCatalogo[] = [
  // Gobierno arranca en el diccionario. Lo anterior —VoBo Gob Funcional,
  // Inicialización Nébula, GT Revisión Prediccionario— ocurre antes de que el
  // objeto llegue a la fábrica, así que seguirlo aquí solo movía porcentajes
  // sobre trabajo que no es de David.
  { id: 'generaci-n-diccionario',      label: 'Generación Diccionario',      fase: 'Gobierno' },
  { id: 'gt-revisi-n-diccionario',     label: 'GT Revisión Diccionario',     fase: 'Gobierno' },
  { id: 'schemas-work',                label: 'Schemas Work',                fase: 'Gobierno' },
  { id: 'msd',                         label: 'MSD',                         fase: 'Gobierno' },

  { id: 'acceso-rw-repo',              label: 'Acceso RW Repo',              fase: 'Desarrollo' },
  { id: 'feature-hu',                  label: 'Feature + HU',                fase: 'Desarrollo' },
  { id: 'componentes-kirby',           label: 'Componentes Kirby',           fase: 'Desarrollo' },
  { id: 'componentes-hammurabi',       label: 'Componentes Hammurabi',       fase: 'Desarrollo' },
  { id: 'componentes-smartcleaner',    label: 'Componentes Smartcleaner',    fase: 'Desarrollo' },

  { id: 'despliegue-a-work',           label: 'Despliegue a Work',           fase: 'Pruebas' },
  { id: 'pruebas-en-work',             label: 'Pruebas en Work',             fase: 'Pruebas' },
  { id: 'creaci-n-de-mallas-control-m',label: 'Creación de mallas Control-M',fase: 'Pruebas' },
  { id: 'pruebas-control-m',           label: 'Pruebas Control-M',           fase: 'Pruebas' },
  { id: 'documentaci-n-control-m',     label: 'Documentación Control-M',     fase: 'Pruebas' },

  { id: 'schemas-live',                label: 'Schemas Live',                fase: 'Certificación' },
  { id: 'certificaci-n-kirby',         label: 'Certificación Kirby',         fase: 'Certificación' },
  { id: 'certificaci-n-hammurabi',     label: 'Certificación Hammurabi',     fase: 'Certificación' },
  { id: 'certificaci-n-smartcleaner',  label: 'Certificación Smartcleaner',  fase: 'Certificación' },

  { id: 'creaci-n-job-kirby-live',       label: 'Job Kirby LIVE',            fase: 'Producción' },
  { id: 'creaci-n-job-hammurabi-live',   label: 'Job Hammurabi LIVE',        fase: 'Producción' },
  { id: 'creaci-n-job-smartcleaner-live',label: 'Job Smartcleaner LIVE',     fase: 'Producción' },
  { id: 'certificaci-n-mallas-control-m',label: 'Certificación Mallas Control-M', fase: 'Producción' },
  { id: 'post-prod',                     label: 'POST PROD',                 fase: 'Producción' },
];

// ─── El catálogo vivo ────────────────────────────────────────────────────────
export const K_PASOS = 'timia_fabrica_pasos';

/** Los pasos tal como están hoy en la base; si nunca se tocaron, la semilla. */
export function pasos(): PasoCatalogo[] {
  const g = persistGet<PasoCatalogo[]>(K_PASOS, []);
  return g.length ? g : PASOS_SEMILLA;
}

/** Las fases, en el orden en que aparecen los pasos: el orden ES el proceso. */
export function fases(ps: PasoCatalogo[] = pasos()): string[] {
  const vistas: string[] = [];
  for (const p of ps) if (!vistas.includes(p.fase)) vistas.push(p.fase);
  return vistas;
}

export const pasosDeFase = (f: string, ps: PasoCatalogo[] = pasos()) => ps.filter(p => p.fase === f);

/**
 * Id a partir del nombre, evitando chocar con uno existente. Los ids viejos
 * vienen de los encabezados del Excel ('certificaci-n-kirby', con la ñ y los
 * acentos ya perdidos) y no se tocan: los datos cargados dependen de ellos.
 */
export function nuevoId(label: string, ps: PasoCatalogo[]): string {
  const base = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'paso';
  if (!ps.some(p => p.id === base)) return base;
  let n = 2;
  while (ps.some(p => p.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Mueve un paso dentro de su fase, o a la fase vecina si se sale por un
 * extremo. Así reordenar y cambiar de fase son el mismo gesto.
 */
export function mover(ps: PasoCatalogo[], id: string, dir: -1 | 1): PasoCatalogo[] {
  const i = ps.findIndex(p => p.id === id);
  if (i < 0) return ps;
  const j = i + dir;
  const copia = [...ps];
  if (j < 0 || j >= ps.length) return ps;
  if (ps[j].fase !== ps[i].fase) { copia[i] = { ...copia[i], fase: ps[j].fase }; return copia; }
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

/** Colores de los estados del objeto, tal como los usa la fábrica. */
export const ESTADOS: Record<string, { bg: string; text: string; borde: string }> = {
  'Finalizado':    { bg:'#ecfdf5', text:'#047857', borde:'#a7f3d0' },
  'En curso':      { bg:'#eff6ff', text:'#1d4ed8', borde:'#bfdbfe' },
  'Certificación': { bg:'#f5f3ff', text:'#6d28d9', borde:'#ddd6fe' },
  'Por iniciar':   { bg:'#f8fafc', text:'#64748b', borde:'#e2e8f0' },
  'Bloqueado':     { bg:'#fef2f2', text:'#b91c1c', borde:'#fecaca' },
  'Desestimado':   { bg:'#fafafa', text:'#a1a1aa', borde:'#e4e4e7' },
};
export const colorEstado = (e: string) => ESTADOS[e] ?? { bg:'#f8fafc', text:'#64748b', borde:'#e2e8f0' };

/**
 * Avance de un objeto. Los pasos marcados NA no cuentan: no todos los objetos
 * pasan por Kirby, Hammurabi o Control-M, y contarlos como pendientes haría que
 * nada llegara nunca al 100%.
 */
export function avance(o: ObjetoFabrica, fase?: string, ps: PasoCatalogo[] = pasos()) {
  const lista = fase ? pasosDeFase(fase, ps) : ps;
  let ok = 0, aplican = 0, pendientes = 0;
  for (const p of lista) {
    const v = o.pasos?.[p.id];
    // Solo los NA salen de la cuenta. Un paso sin marcar es trabajo que falta,
    // no trabajo que no existe: antes no contaba, y por eso un objeto con los
    // 4 pasos de Gobierno hechos mostraba 100% teniendo 26 pasos por delante.
    if (v?.estado === 'na') continue;
    aplican++;
    if (v?.estado === 'ok') ok++; else pendientes++;
  }
  return { ok, aplican, pendientes, pct: aplican ? Math.round(ok / aplican * 100) : 0 };
}

/** En qué fase está trabajando ahora: la primera que no esté completa. */
export function faseActual(o: ObjetoFabrica, ps: PasoCatalogo[] = pasos()): string {
  const fs = fases(ps);
  for (const f of fs) {
    const a = avance(o, f, ps);
    if (a.aplican > 0 && a.pct < 100) return f;
  }
  return fs[fs.length - 1] ?? '';
}

/**
 * El estado que escribió el PM a mano ¿concuerda con lo que dicen las casillas?
 * Si no, devuelve la fase que dicen las casillas, para avisarlo en la tarjeta.
 * No se corrige solo: la herramienta no sabe cuál de los dos está al día.
 */
export function desacuerdoDeFase(o: ObjetoFabrica, ps: PasoCatalogo[] = pasos()): string | null {
  const fs = fases(ps);
  // Solo aplica si el estado del objeto es el nombre de una fase; «En curso»,
  // «Bloqueado» o «Por iniciar» no dicen nada sobre en qué fase va.
  if (!fs.includes(o.estado)) return null;
  const real = faseActual(o, ps);
  return real === o.estado ? null : real;
}

/** Pasos de una fase que siguen pendientes: sin marcar o marcados pendientes. */
function pendientesDe(o: ObjetoFabrica, f: string, ps: PasoCatalogo[]): PasoCatalogo[] {
  return pasosDeFase(f, ps).filter(p => {
    const v = o.pasos?.[p.id];
    return v?.estado !== 'ok' && v?.estado !== 'na';
  });
}

/** Pasos que están frenando al objeto: pendientes en su fase actual. */
export function frenos(o: ObjetoFabrica, ps: PasoCatalogo[] = pasos()): PasoCatalogo[] {
  return pendientesDe(o, faseActual(o, ps), ps);
}

/** Código corto del proyecto: "SDATOOL-51117 SDM1" → "SDATOOL-51117". */
export function codigoProyecto(p: string): string {
  const m = p.match(/SDATOOL\s*-?\s*(\d+)/i);
  return m ? `SDATOOL-${m[1]}` : p.split(' ')[0];
}
/** Nombre sin el código, para mostrarlo debajo. */
export function nombreProyecto(p: string): string {
  return p.replace(/SDATOOL\s*-?\s*\d+\s*/i, '').replace(/^[-–\s]+/, '').trim();
}

/**
 * Mueve un objeto a una fase: da por hechas las casillas de las fases
 * anteriores y deja la de destino por empezar. Es lo que uno espera al
 * arrastrar la tarjeta de una columna a otra.
 *
 * No toca los NA —si el objeto no pasa por Kirby, sigue sin pasar— ni las
 * notas, ni las fechas que ya estuvieran puestas.
 */
export function moverAFase(o: ObjetoFabrica, destino: string, ps: PasoCatalogo[] = pasos()): ObjetoFabrica {
  const fs = fases(ps);
  const iDestino = fs.indexOf(destino);
  if (iDestino < 0) return o;
  const hoy = new Date().toLocaleDateString('es-CO');
  const nuevos = { ...o.pasos };
  for (const p of ps) {
    const i = fs.indexOf(p.fase);
    const v = nuevos[p.id];
    if (v?.estado === 'na') continue;              // no aplica: se respeta
    if (i < iDestino && v?.estado !== 'ok') {
      nuevos[p.id] = { ...(v ?? {}), estado: 'ok', fecha: v?.fecha ?? hoy };
    } else if (i >= iDestino && v?.estado === 'ok') {
      // Arrastrar hacia atrás desmarca lo de la fase destino en adelante.
      nuevos[p.id] = { ...v, estado: 'pte', fecha: undefined };
    }
  }
  return { ...o, pasos: nuevos };
}

// ─── Proyectos de la fábrica ─────────────────────────────────────────────────
// Son suyos, no los de la plataforma. Un objeto de la fábrica puede pertenecer
// a un SDATOOL que nadie dio de alta en Proyectos, y al revés: dar de alta algo
// aquí no debe aparecerle al resto del equipo en su tablero ni en sus planes.
// Por eso viven en su propia clave y no tocan PROJECTS.

export interface ProyectoFabrica {
  /** Código corto; es la identidad y lo que se guarda en cada objeto. */
  id: string;
  nombre: string;
  responsable?: string;
  nota?: string;
}

export const K_PROYECTOS = 'timia_fabrica_proyectos';

/**
 * Los proyectos registrados, más los que solo existen porque algún objeto los
 * menciona. Así la lista nunca pierde un proyecto que sí tiene trabajo, aunque
 * nadie lo haya dado de alta — que es como llegaron los 14 del Excel.
 */
export function proyectos(objs: ObjetoFabrica[] = []): ProyectoFabrica[] {
  const guardados = persistGet<ProyectoFabrica[]>(K_PROYECTOS, []);
  const porId = new Map(guardados.map(p => [p.id, p]));
  for (const o of objs) {
    const id = (o.proyecto ?? '').trim();
    if (id && !porId.has(id)) porId.set(id, { id, nombre: nombreProyecto(id) });
  }
  return [...porId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Cuántos objetos cuelgan de un proyecto; cero significa que se puede borrar. */
export const objetosDe = (objs: ObjetoFabrica[], id: string) =>
  objs.filter(o => (o.proyecto ?? '').trim() === id).length;

/**
 * ¿Se parece demasiado a uno que ya existe? Pensado para el dedazo clásico:
 * sobra un espacio, falta un guion, cambia una mayúscula.
 */
export function parecidoA(nombre: string, existentes: ProyectoFabrica[]): ProyectoFabrica | null {
  const limpio = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = limpio(nombre);
  if (!n) return null;
  return existentes.find(p => p.id !== nombre && limpio(p.id) === n) ?? null;
}

// ─── Persistencia ────────────────────────────────────────────────────────────
export const K_FABRICA = 'timia_fabrica_objetos';

export const fabricaStore = {
  objetos: (): ObjetoFabrica[] => persistGet<ObjetoFabrica[]>(K_FABRICA, []),
  guardar: (v: ObjetoFabrica[]) => persistSet(K_FABRICA, v),
  pasos,
  guardarPasos: (v: PasoCatalogo[]) => persistSet(K_PASOS, v),
  proyectos,
  guardarProyectos: (v: ProyectoFabrica[]) => persistSet(K_PROYECTOS, v),
};

/** Objeto nuevo: sin pasos marcados, que es justo lo que significa recién llegado. */
export function objetoNuevo(proyecto = ''): ObjetoFabrica {
  const hoy = new Date().toISOString().slice(0, 10);
  return { id: `fab-${Date.now().toString(36)}`, proyecto, objetoInsumo: '', objeto: '',
           responsable: '', contactoBanco: '', periodicidad: '', estado: 'Por iniciar',
           comentarios: '', fechaRecepcion: hoy, pasos: {} };
}
