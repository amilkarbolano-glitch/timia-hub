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
  /** Fecha en que se completó, tal como la anota la fábrica (dd/mm/aaaa). */
  fecha?: string;
  /** Algunas celdas traen el enlace al repo o al documento en vez de un estado. */
  link?: string;
  /** Texto libre cuando la celda no es OK/NA/PTE. */
  nota?: string;
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
  fechaRecepcion: string;
  pasos: Record<string, PasoObjeto>;
}

export interface PasoCatalogo { id: string; label: string; fase: string; }

/** Las 5 fases salen de los propios nombres de los pasos del Excel. */
export const FASES = ['Gobierno', 'Desarrollo', 'Pruebas', 'Certificación', 'Producción'] as const;
export type Fase = typeof FASES[number];

export const PASOS: PasoCatalogo[] = [
  { id: 'vobo-gob-funcional',          label: 'VoBo Gob Funcional',          fase: 'Gobierno' },
  { id: 'inicializaci-n-n-bula',       label: 'Inicialización Nébula',       fase: 'Gobierno' },
  { id: 'gt-revisi-n-prediccionario',  label: 'GT Revisión Prediccionario',  fase: 'Gobierno' },
  { id: 'generaci-n-diccionario',      label: 'Generación Diccionario',      fase: 'Gobierno' },
  { id: 'gt-revisi-n-diccionario',     label: 'GT Revisión Diccionario',     fase: 'Gobierno' },
  { id: 'schemas-work',                label: 'Schemas Work',                fase: 'Gobierno' },
  { id: 'msd',                         label: 'MSD',                         fase: 'Gobierno' },

  { id: 'acceso-rw-repo',              label: 'Acceso RW Repo',              fase: 'Desarrollo' },
  { id: 'feature-hu',                  label: 'Feature + HU',                fase: 'Desarrollo' },
  { id: 'migration-tool',              label: 'Migration Tool',              fase: 'Desarrollo' },
  { id: 'componentes-kirby',           label: 'Componentes Kirby',           fase: 'Desarrollo' },
  { id: 'componentes-hammurabi',       label: 'Componentes Hammurabi',       fase: 'Desarrollo' },
  { id: 'componentes-smartcleaner',    label: 'Componentes Smartcleaner',    fase: 'Desarrollo' },

  { id: 'pruebas-en-work',             label: 'Pruebas en Work',             fase: 'Pruebas' },
  { id: 'creaci-n-de-mallas-control-m',label: 'Creación de mallas Control-M',fase: 'Pruebas' },
  { id: 'pruebas-control-m',           label: 'Pruebas Control-M',           fase: 'Pruebas' },
  { id: 'documentaci-n-control-m',     label: 'Documentación Control-M',     fase: 'Pruebas' },

  { id: 'schemas-live',                label: 'Schemas Live',                fase: 'Certificación' },
  { id: 'certificaci-n-kirby',         label: 'Certificación Kirby',         fase: 'Certificación' },
  { id: 'certificaci-n-hammurabi',     label: 'Certificación Hammurabi',     fase: 'Certificación' },
  { id: 'certificaci-n-smartcleaner',  label: 'Certificación Smartcleaner',  fase: 'Certificación' },
  { id: 'certificaci-n-spark',         label: 'Certificación Spark',         fase: 'Certificación' },

  { id: 'creaci-n-job-kirby-live',       label: 'Job Kirby LIVE',            fase: 'Producción' },
  { id: 'creaci-n-job-hammurabi-live',   label: 'Job Hammurabi LIVE',        fase: 'Producción' },
  { id: 'creaci-n-job-smartcleaner-live',label: 'Job Smartcleaner LIVE',     fase: 'Producción' },
  { id: 'creaci-n-job-spark-live',       label: 'Job Spark LIVE',            fase: 'Producción' },
  { id: 'certificaci-n-mallas-control-m',label: 'Certificación Mallas Control-M', fase: 'Producción' },
  { id: 'post-prod',                     label: 'POST PROD',                 fase: 'Producción' },
];

export const pasosDeFase = (f: string) => PASOS.filter(p => p.fase === f);

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
export function avance(o: ObjetoFabrica, fase?: string) {
  const pasos = fase ? pasosDeFase(fase) : PASOS;
  let ok = 0, aplican = 0, pendientes = 0;
  for (const p of pasos) {
    const v = o.pasos?.[p.id];
    if (!v || v.estado === 'na') continue;
    aplican++;
    if (v.estado === 'ok') ok++; else pendientes++;
  }
  return { ok, aplican, pendientes, pct: aplican ? Math.round(ok / aplican * 100) : 0 };
}

/** En qué fase está trabajando ahora: la primera que no esté completa. */
export function faseActual(o: ObjetoFabrica): string {
  for (const f of FASES) {
    const a = avance(o, f);
    if (a.aplican > 0 && a.pct < 100) return f;
  }
  return 'Producción';
}

/** Pasos que están frenando al objeto: pendientes en su fase actual. */
export function frenos(o: ObjetoFabrica): PasoCatalogo[] {
  const f = faseActual(o);
  return pasosDeFase(f).filter(p => {
    const v = o.pasos?.[p.id];
    return v && v.estado !== 'ok' && v.estado !== 'na';
  });
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

// ─── Persistencia ────────────────────────────────────────────────────────────
export const K_FABRICA = 'timia_fabrica_objetos';

export const fabricaStore = {
  objetos: (): ObjetoFabrica[] => persistGet<ObjetoFabrica[]>(K_FABRICA, []),
  guardar: (v: ObjetoFabrica[]) => persistSet(K_FABRICA, v),
};
