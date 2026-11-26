// ─── De lo que leyó el lector a algo que se pueda contrastar ─────────────────
//
// El lector de capturas devuelve lo que devuelva: hoy no hay contrato con él,
// así que aquí no se asume una forma, se busca. Lo que salga se convierte en
// `ImputacionReal` —persona, fecha, SDA, horas— que es el idioma que ya habla
// `desvios()` contra el anexo.
//
// Cuando el contrato exista (Sergio mandando un JSON acordado), esto se cambia
// en un sitio y lo demás sigue igual. Esa es la razón de que viva aparte.

import { normalizaSda } from './trPlanImport';
import { mismaPersona, type ImputacionReal, type PuestoAnexo, type TrimestreHoras,
         diasHabiles, esperadoDia, desvios } from './trPlan';

/** Un registro de carga tal como lo guarda la API en `timia_tr_registros`. */
export interface RegistroTr {
  id: string;
  correo: string;
  persona?: string;
  envio?: string | null;
  fecha?: string | null;
  enviadoEn?: string;
  capturas?: string[];
  resultados?: { captura: string; estado: string; respuesta?: unknown; detalle?: string }[];
}

// ─── Sacar los datos de donde estén ──────────────────────────────────────────

const SDA = /SDATOOL[-\s]?(\d{4,})/i;

/**
 * El SDA que haya dentro de un texto, venga solo o perdido en una línea larga.
 *
 * En la hoja el SDA no viene limpio: viene como «SDATOOL-53017 - Estrategia
 * campañas preaprobados - FICO - Pruebas - DECRONOS-1537 - Implementación…».
 * Hay más de un código en esa línea (DECRONOS también lleva número), así que
 * no vale agarrar el primer número que aparezca: tiene que decir SDATOOL.
 */
export function sdaDe(texto: unknown): string | null {
  const m = String(texto ?? '').match(SDA);
  return m ? `SDATOOL-${m[1]}` : null;
}

/**
 * Una fecha en ISO, venga como venga.
 *
 * El lector puede devolver «2026-11-12», «12/11/2026» o «12-11-26». Lo que no
 * se hace es adivinar entre día y mes: si el primer número pasa de 12 es el
 * día, y si no, se respeta el orden latino (día primero), que es el de la
 * plantilla y el de quien llena el TR.
 */
export function fechaDe(valor: unknown, anioPorDefecto?: number): string | null {
  const t = String(valor ?? '').trim();
  if (!t) return null;

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const suelta = t.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?$/);
  if (suelta) {
    // Orden latino, día primero: es el de la plantilla y el de quien llena el
    // TR. Si el segundo número pasa de 12 vendría en orden gringo, y eso no se
    // adivina: se devuelve nada. Una fecha mal adivinada mete las horas en el
    // día equivocado y nadie lo nota.
    const dia = +suelta[1], mes = +suelta[2];
    let anio = suelta[3] ? +suelta[3] : (anioPorDefecto ?? new Date().getFullYear());
    if (anio < 100) anio += 2000;
    if (mes < 1 || mes > 12 || dia < 1) return null;
    // Que el día exista en ese mes: un 31 de noviembre no es una fecha.
    if (dia > new Date(anio, mes, 0).getDate()) return null;
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  return null;
}

/** Horas como número, aceptando «8», «8,5», «8.5 h». */
export function horasDe(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const m = String(valor ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

const esFecha = (k: string) => /fecha|dia|día|day|date/i.test(k);
const esHoras = (k: string) => /hora|hour|cant|valor|imputad/i.test(k);
const esSda   = (k: string) => /sda|tool|proyecto|actividad|tarea|concepto|descrip/i.test(k);
const esNombre = (k: string) => /nombre|persona|empleado|recurso|usuario|name/i.test(k);

/**
 * Las imputaciones que haya dentro de la respuesta del lector.
 *
 * Recorre lo que llegue buscando objetos que tengan a la vez algo de fecha y
 * algo de horas; el SDA y el nombre se heredan del nivel de arriba si en la
 * fila no vienen, que es como suelen venir las tablas (el SDA una vez, arriba,
 * y debajo los días).
 *
 * Si no reconoce nada, devuelve vacío. No inventa: una imputación inventada
 * entra en la validación como si fuera real y acusa a alguien de algo que no
 * hizo.
 */
export function imputacionesDe(
  respuesta: unknown, correo: string, opciones: { anio?: number } = {},
): ImputacionReal[] {
  const out: ImputacionReal[] = [];

  const mirar = (v: unknown, sdaArriba: string | null, nombreArriba: string, hondo = 0): void => {
    if (!v || typeof v !== 'object' || hondo > 5) return;
    if (Array.isArray(v)) { v.forEach(x => mirar(x, sdaArriba, nombreArriba, hondo + 1)); return; }

    const o = v as Record<string, unknown>;
    const claves = Object.keys(o);

    // Lo que este nivel aporta, para los de abajo.
    let sdaAqui = sdaArriba;
    for (const k of claves.filter(esSda)) {
      const s = sdaDe(o[k]);
      if (s) { sdaAqui = s; break; }
    }
    const nombreAqui = claves.filter(esNombre).map(k => String(o[k] ?? '').trim()).find(Boolean)
                    ?? nombreArriba;

    const kFecha = claves.find(esFecha);
    const kHoras = claves.find(k => esHoras(k) && typeof o[k] !== 'object');
    if (kFecha && kHoras) {
      const fecha = fechaDe(o[kFecha], opciones.anio);
      const horas = horasDe(o[kHoras]);
      if (fecha && horas !== null && horas > 0) {
        out.push({ persona: correo, fecha, sda: sdaAqui ?? normalizaSda(''), horas });
        return;   // es una fila: lo de dentro no son más imputaciones
      }
    }

    // Tabla con la fecha de cabecera: { '2026-11-12': 8, '2026-11-13': 4 }
    let huboColumnas = false;
    for (const k of claves) {
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(k) ? k : null;
      if (!fecha) continue;
      const horas = horasDe(o[k]);
      if (horas !== null && horas > 0) {
        out.push({ persona: correo, fecha, sda: sdaAqui ?? normalizaSda(''), horas });
        huboColumnas = true;
      }
    }
    if (huboColumnas) return;

    Object.values(o).forEach(x => mirar(x, sdaAqui, nombreAqui, hondo + 1));
  };

  mirar(respuesta, null, '');
  return out;
}

/** Las imputaciones de una tanda de registros, ya aplanadas. */
export function imputacionesDeRegistros(registros: RegistroTr[], anio?: number): ImputacionReal[] {
  const out: ImputacionReal[] = [];
  for (const r of registros) {
    for (const res of r.resultados ?? []) {
      if (res.estado !== 'OK') continue;
      out.push(...imputacionesDe(res.respuesta, r.correo, { anio }));
    }
  }
  return out;
}

/** El nombre que el lector leyó en la captura, si lo devolvió. */
export function nombreLeido(respuesta: unknown): string | null {
  let hallado: string | null = null;
  const mirar = (v: unknown, hondo = 0): void => {
    if (hallado || !v || typeof v !== 'object' || hondo > 4) return;
    if (Array.isArray(v)) { v.forEach(x => mirar(x, hondo + 1)); return; }
    const o = v as Record<string, unknown>;
    for (const k of Object.keys(o)) {
      if (esNombre(k) && typeof o[k] === 'string' && o[k]) { hallado = String(o[k]).trim(); return; }
    }
    Object.values(o).forEach(x => mirar(x, hondo + 1));
  };
  mirar(respuesta);
  return hallado;
}

// ─── Los cuatro desajustes ───────────────────────────────────────────────────

export type Gravedad = 'bloquea' | 'avisa' | 'recuerda';

export interface Hallazgo {
  tipo: 'sda-ajeno' | 'horas-distintas' | 'dia-sin-capturar' | 'otra-persona';
  gravedad: Gravedad;
  persona: string;
  fecha?: string;
  sda?: string;
  esperado?: number;
  real?: number;
  detalle: string;
}

/** Si una persona tiene algún puesto en ese SDA durante el trimestre. */
function tieneSda(puestos: PuestoAnexo[], persona: string, sda: string, trimestreId: string): boolean {
  return puestos.some(p =>
    p.trimestreId === trimestreId && p.sda === sda &&
    (mismaPersona(p.persona, persona) ||
     (p.coberturas ?? []).some(c => mismaPersona(c.persona, persona))));
}

/**
 * Contrasta lo capturado contra el anexo y clasifica lo que no cuadra.
 *
 * Los cuatro casos no son el mismo problema y por eso no se mezclan:
 *
 * - SDA ajeno: son horas cargadas a un contrato que no es de esa persona. Eso
 *   no es un desvío, es un error de imputación, y se bloquea.
 * - Horas distintas: puede ser mala lectura del OCR o puede ser la realidad.
 *   Se enseñan los dos números y decide la persona.
 * - Día sin capturar: la plantilla esperaba horas y no llegó captura. Es un
 *   recordatorio, no un error: todavía puede subirla.
 * - Otra persona: el pantallazo es de alguien más. Solo vale si se usó a
 *   propósito «subir el TR de otra persona»; si no, es un archivo equivocado.
 */
export function validar(
  registros: RegistroTr[], puestos: PuestoAnexo[], persona: string,
  t: TrimestreHoras, festivos: Set<string>,
): Hallazgo[] {
  const anio = +t.inicio.slice(0, 4);
  const mios = registros.filter(r => mismaPersona(r.correo, persona));
  const reales = imputacionesDeRegistros(mios, anio);
  const out: Hallazgo[] = [];

  // Pantallazo de otra persona.
  for (const r of mios) {
    for (const res of r.resultados ?? []) {
      const leido = nombreLeido(res.respuesta);
      if (!leido) continue;
      const esperado = (r.persona ?? '').trim();
      if (esperado && !mismaPersona(leido, esperado)) {
        out.push({ tipo:'otra-persona', gravedad:'bloquea', persona,
                   detalle:`«${res.captura}» dice ${leido}, pero se subió a nombre de ${esperado}.` });
      }
    }
  }

  const d = desvios(puestos, reales, persona, t, festivos);
  const hayDia = new Set(reales.map(r => r.fecha));

  for (const x of d) {
    if (x.real > 0 && !tieneSda(puestos, persona, x.sda, t.id)) {
      out.push({ tipo:'sda-ajeno', gravedad:'bloquea', persona, fecha:x.fecha, sda:x.sda,
                 esperado:x.esperado, real:x.real,
                 detalle:`${x.sda} no está asignado a esta persona en ${t.label}.` });
      continue;
    }
    if (Math.abs(x.dif) > 0.01 && x.real > 0) {
      out.push({ tipo:'horas-distintas', gravedad:'avisa', persona, fecha:x.fecha, sda:x.sda,
                 esperado:x.esperado, real:x.real,
                 detalle:`La plantilla espera ${x.esperado} h y la captura dice ${x.real} h.` });
    }
  }

  // Días hábiles con horas esperadas y sin ninguna captura.
  for (const fecha of diasHabiles(t, festivos)) {
    if (hayDia.has(fecha)) continue;
    const esp = esperadoDia(puestos, persona, fecha, t.id);
    if (esp.total > 0) {
      out.push({ tipo:'dia-sin-capturar', gravedad:'recuerda', persona, fecha,
                 esperado:esp.total, real:0, detalle:`Sin captura. La plantilla espera ${esp.total} h.` });
    }
  }

  return out;
}

/** Cuántos hay de cada gravedad, para el encabezado. */
export function resumenHallazgos(hs: Hallazgo[]): Record<Gravedad, number> {
  return hs.reduce((a, h) => ({ ...a, [h.gravedad]: a[h.gravedad] + 1 }),
                   { bloquea: 0, avisa: 0, recuerda: 0 } as Record<Gravedad, number>);
}
