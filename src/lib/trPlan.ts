// ─── Plan de horas del trimestre ─────────────────────────────────────────────
// Lo que cada persona DEBERÍA imputar. Hasta ahora el módulo TR comparaba
// contra «8 horas por día hábil» para todo el mundo: un supuesto plano que no
// sabe a qué SDA va cada hora ni quién está de vacaciones.
//
// La forma viene de la plantilla real de los líderes (Plantilla_carga_horas):
// no se organiza por persona sino por PUESTO del anexo del contrato. Cada SDA
// tiene puestos numerados, cada puesto trae sus horas contratadas por día, y
// encima se cuelga quién lo ocupa y quién lo cubre cuando esa persona falta.
//
// El líder carga solo el anexo y las coberturas. Lo imputado lo calcula la
// herramienta de las capturas del TR: tenerlo dos veces solo crea dos versiones
// del mismo número.

import { persistGet, persistSet } from './persist';
import { isBusyDay } from './businessDays';

export const JORNADA = 8;

/** El trimestre contra el que se imputa. */
export interface TrimestreHoras {
  id: string;        // '2026-Q4'
  label: string;     // 'Q4 2026'
  inicio: string;    // yyyy-mm-dd, primer día
  fin: string;       // yyyy-mm-dd, último día
}

/** Quién cubre un puesto mientras su titular no está. */
export interface Cobertura {
  persona: string;   // correo
  dias: string[];    // yyyy-mm-dd
}

/**
 * Un puesto del anexo. La unidad de contratación: «el SDA 54789 tiene dos
 * Data Engineer Senior a 8 horas diarias». Quién lo ocupa puede cambiar sin
 * que cambie lo contratado, y por eso son cosas separadas.
 */
export interface PuestoAnexo {
  id: string;
  trimestreId: string;
  sda: string;                          // 'SDATOOL-54789'
  numero: number;                       // # del anexo dentro del SDA
  rol: string;                          // 'DATA ENGINEER SENIOR'
  proyecto?: string;
  lider?: string;
  /** Horas contratadas por día hábil: { '2026-10-01': 8, … } */
  horasPorDia: Record<string, number>;
  /** Correo de quien ocupa el puesto. Vacío = puesto sin cubrir. */
  persona?: string;
  coberturas?: Cobertura[];
}

// ─── Calendario ──────────────────────────────────────────────────────────────

const aFecha = (iso: string) => new Date(iso + 'T12:00:00');
export const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

/**
 * Los días hábiles del trimestre. La plantilla trae exactamente estos: los
 * laborables descontando los festivos colombianos, ni uno más ni uno menos.
 */
export function diasHabiles(t: TrimestreHoras, festivos: Set<string>): string[] {
  const dias: string[] = [];
  const d = aFecha(t.inicio), fin = aFecha(t.fin);
  let vueltas = 0;
  while (d <= fin && vueltas++ < 500) {
    if (!isBusyDay(d, festivos)) dias.push(aISO(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

// ─── Lo esperado ─────────────────────────────────────────────────────────────

/** Los correos vienen de sitios distintos y no siempre con el mismo formato. */
export const mismaPersona = (a?: string, b?: string) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/**
 * Lo que una persona debería imputar un día, abierto por SDA.
 *
 * Incluye los puestos que ocupa y los días en que cubre a otro. Un día cubierto
 * cuenta para quien cubre, no para el titular: si Juliana está de vacaciones,
 * esas horas las debe Sebastián.
 */
export function esperadoDia(
  puestos: PuestoAnexo[], persona: string, fecha: string, trimestreId: string,
): { porSda: Record<string, number>; total: number } {
  const porSda: Record<string, number> = {};
  let total = 0;
  for (const p of puestos) {
    if (p.trimestreId !== trimestreId) continue;
    const h = p.horasPorDia[fecha] ?? 0;
    if (h <= 0) continue;

    const cubre = (p.coberturas ?? []).find(c => c.dias.includes(fecha));
    const quienDebe = cubre ? cubre.persona : p.persona;
    if (!mismaPersona(quienDebe, persona)) continue;

    porSda[p.sda] = (porSda[p.sda] ?? 0) + h;
    total += h;
  }
  return { porSda, total };
}

/** Total esperado de una persona en todo el trimestre. */
export function esperadoTrimestre(
  puestos: PuestoAnexo[], persona: string, t: TrimestreHoras, festivos: Set<string>,
): number {
  return diasHabiles(t, festivos)
    .reduce((s, d) => s + esperadoDia(puestos, persona, d, t.id).total, 0);
}

/** Todas las personas que aparecen en el plan, titulares y quienes cubren. */
export function personasDelPlan(puestos: PuestoAnexo[], trimestreId: string): string[] {
  const s = new Set<string>();
  for (const p of puestos) {
    if (p.trimestreId !== trimestreId) continue;
    if (p.persona) s.add(p.persona.trim().toLowerCase());
    for (const c of p.coberturas ?? []) if (c.persona) s.add(c.persona.trim().toLowerCase());
  }
  return [...s].sort();
}

// ─── Contraste contra lo imputado ────────────────────────────────────────────

export interface ImputacionReal { persona: string; fecha: string; sda: string; horas: number }

export interface Desvio {
  fecha: string;
  sda: string;
  esperado: number;
  real: number;
  /** real − esperado. Negativo = falta imputar. */
  dif: number;
}

/**
 * Compara día a día lo contratado contra lo imputado, por SDA.
 *
 * Incluye los SDA que solo aparecen en uno de los dos lados: si alguien cargó
 * horas a un SDA que no tenía asignado, eso es justo lo que hay que ver.
 */
export function desvios(
  puestos: PuestoAnexo[], reales: ImputacionReal[], persona: string,
  t: TrimestreHoras, festivos: Set<string>,
): Desvio[] {
  const out: Desvio[] = [];
  const porFecha = new Map<string, ImputacionReal[]>();
  for (const r of reales) {
    if (!mismaPersona(r.persona, persona)) continue;
    porFecha.set(r.fecha, [...(porFecha.get(r.fecha) ?? []), r]);
  }
  for (const fecha of diasHabiles(t, festivos)) {
    const esp = esperadoDia(puestos, persona, fecha, t.id).porSda;
    const real: Record<string, number> = {};
    for (const r of porFecha.get(fecha) ?? []) real[r.sda] = (real[r.sda] ?? 0) + r.horas;
    for (const sda of new Set([...Object.keys(esp), ...Object.keys(real)])) {
      const e = esp[sda] ?? 0, v = real[sda] ?? 0;
      if (e || v) out.push({ fecha, sda, esperado: e, real: v, dif: +(v - e).toFixed(2) });
    }
  }
  return out;
}

/** Resumen por persona: cuánto debía, cuánto cargó y en cuántos días no cuadra. */
export function resumenPersona(
  puestos: PuestoAnexo[], reales: ImputacionReal[], persona: string,
  t: TrimestreHoras, festivos: Set<string>,
) {
  const d = desvios(puestos, reales, persona, t, festivos);
  const esperado = d.reduce((s, x) => s + x.esperado, 0);
  const real = d.reduce((s, x) => s + x.real, 0);
  const diasConDesvio = new Set(d.filter(x => Math.abs(x.dif) > 0.01).map(x => x.fecha)).size;
  const sdaNoAsignado = [...new Set(d.filter(x => x.esperado === 0 && x.real > 0).map(x => x.sda))];
  return { esperado, real, dif: +(real - esperado).toFixed(2), diasConDesvio, sdaNoAsignado };
}

// ─── Emparejar nombres con correos ───────────────────────────────────────────

/** Sin tildes, sin mayúsculas, sin dobles espacios. */
export function normNombre(s: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export interface Candidato { email: string; nombre: string }

/**
 * Empareja «JULIANA GARZON DUQUE» con el correo de Juliana.
 *
 * El Excel trae nombre completo con segundos apellidos y el equipo está dado de
 * alta con nombres más cortos, así que no basta comparar cadenas: se exige que
 * coincidan al menos dos palabras —nombre y un apellido— y se devuelve la
 * confianza para que lo dudoso se confirme a mano en vez de adivinar.
 */
export function emparejar(nombre: string, candidatos: Candidato[]):
  { email: string; confianza: 'alta' | 'media' } | null {
  const palabras = new Set(normNombre(nombre).split(' ').filter(w => w.length > 2));
  if (!palabras.size) return null;

  let mejor: { email: string; comunes: number; total: number } | null = null;
  for (const c of candidatos) {
    const suyas = new Set(normNombre(c.nombre).split(' ').filter(w => w.length > 2));
    // El correo también ayuda: juliana.garzon@timia.ai trae nombre y apellido.
    for (const w of normNombre(c.email.split('@')[0].replace(/[._-]/g, ' ')).split(' ')) {
      if (w.length > 2) suyas.add(w);
    }
    const comunes = [...palabras].filter(w => suyas.has(w)).length;
    if (comunes >= 2 && (!mejor || comunes > mejor.comunes)) {
      mejor = { email: c.email, comunes, total: suyas.size };
    }
  }
  if (!mejor) return null;
  // Dos palabras en común bastan para proponerlo; tres o más es casi seguro.
  return { email: mejor.email, confianza: mejor.comunes >= 3 ? 'alta' : 'media' };
}

// ─── Comparar dos cargas del mismo trimestre ─────────────────────────────────

export interface CambioPuesto {
  sda: string;
  numero: number;
  tipo: 'entra' | 'sale' | 'cambia';
  detalle: string;
}

/**
 * Qué cambiaría al subir un Excel nuevo sobre uno ya cargado. Replanificar es
 * normal; pisar sin mirar no, así que el líder lo ve antes de que se escriba.
 */
export function diferencias(viejos: PuestoAnexo[], nuevos: PuestoAnexo[]): CambioPuesto[] {
  const clave = (p: PuestoAnexo) => `${p.sda}#${p.numero}`;
  const antes = new Map(viejos.map(p => [clave(p), p]));
  const despues = new Map(nuevos.map(p => [clave(p), p]));
  const out: CambioPuesto[] = [];

  for (const [k, n] of despues) {
    const v = antes.get(k);
    if (!v) { out.push({ sda: n.sda, numero: n.numero, tipo: 'entra', detalle: `${n.rol}${n.persona ? ` · ${n.persona}` : ''}` }); continue; }
    const notas: string[] = [];
    if (!mismaPersona(v.persona, n.persona)) notas.push(`ocupa ${n.persona || '—'} en vez de ${v.persona || '—'}`);
    const dias = new Set([...Object.keys(v.horasPorDia), ...Object.keys(n.horasPorDia)]);
    const cambian = [...dias].filter(d => (v.horasPorDia[d] ?? 0) !== (n.horasPorDia[d] ?? 0));
    if (cambian.length) notas.push(`${cambian.length} día${cambian.length>1?'s':''} con horas distintas`);
    const cv = (v.coberturas ?? []).length, cn = (n.coberturas ?? []).length;
    if (cv !== cn) notas.push(`${cn} cobertura${cn!==1?'s':''} en vez de ${cv}`);
    if (notas.length) out.push({ sda: n.sda, numero: n.numero, tipo: 'cambia', detalle: notas.join(' · ') });
  }
  for (const [k, v] of antes) {
    if (!despues.has(k)) out.push({ sda: v.sda, numero: v.numero, tipo: 'sale', detalle: `${v.rol}${v.persona ? ` · ${v.persona}` : ''}` });
  }
  return out;
}

// ─── Persistencia ────────────────────────────────────────────────────────────
export const K_TRIMESTRES = 'timia_tr_trimestres';
export const K_PUESTOS    = 'timia_tr_puestos';
/** Nombre del Excel → correo, confirmado una vez y reutilizado. */
export const K_ALIAS      = 'timia_tr_alias_personas';

export const trPlanStore = {
  trimestres: (): TrimestreHoras[] => persistGet<TrimestreHoras[]>(K_TRIMESTRES, []),
  puestos:    (): PuestoAnexo[]    => persistGet<PuestoAnexo[]>(K_PUESTOS, []),
  alias:      (): Record<string,string> => persistGet<Record<string,string>>(K_ALIAS, {}),
  guardarTrimestres: (v: TrimestreHoras[]) => persistSet(K_TRIMESTRES, v),
  guardarPuestos:    (v: PuestoAnexo[])    => persistSet(K_PUESTOS, v),
  guardarAlias:      (v: Record<string,string>) => persistSet(K_ALIAS, v),
};
