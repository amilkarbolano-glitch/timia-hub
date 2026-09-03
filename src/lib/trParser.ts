// ─── trParser — extrae registros del texto OCR de una captura del TR (BBVA) ──
// Estructura típica de la captura (Información diaria):
//   "Hoy, lunes 31 de agosto"
//   "SDATOOL-53017 - Estrategia campañas preaprobados - FICO"      ← SDA / proyecto
//   "DECRONOS-2169 - CRONOS-Q3 2026 DATCAL01 Disponibilizar …"   ← feature
//   "Tecnología 'DATIO (Dataproc)'"                               ← actividad/tecnología
//   "3:00"                                                        ← horas (a la derecha)
//   …  "8:00"                                                     ← total del día

export interface TrParsedEntry {
  featureId: string;
  title: string;
  sda?: string;
  actividad?: string;
  hours: number | null;
}
export interface TrParsed {
  date?: string;            // yyyy-mm-dd
  dateLabel?: string;       // texto original
  entries: TrParsedEntry[];
  total?: number;
  warnings: string[];
}

const MESES: Record<string, number> = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12 };
const FEATURE_RE = /\b([A-Z]{3,}[A-Z0-9]*-\d{2,6})\b/;      // DECRONOS-2169, SDATOOL-53017
const HOURS_RE   = /(?<![\d:])(\d{1,2})[:.](\d{2})(?![\d:])/g; // 3:00 · 2.30
const SDA_PREFIX = /^SDATOOL/i;

function normalize(t: string): string {
  return t.replace(/[|]/g, ' ').replace(/[“”"]/g, "'").replace(/\s+/g, ' ').trim();
}

export function parseTrText(rawText: string, fallbackYear = new Date().getFullYear()): TrParsed {
  const lines = rawText.split(/\r?\n/).map(normalize).filter(Boolean);
  const out: TrParsed = { entries: [], warnings: [] };

  // ── Fecha ────────────────────────────────────────────────────────────────
  for (const l of lines) {
    const m = l.match(/(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)[ ,]+(\d{1,2})\s+de\s+([a-záé]+)(?:\s+(?:de\s+)?(\d{4}))?/i);
    if (m) {
      const mes = MESES[m[3].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] ?? MESES[m[3].toLowerCase()];
      if (mes) {
        const y = m[4] ? parseInt(m[4]) : (lines.map(x => x.match(/\b(20\d{2})\b/)).find(Boolean)?.[1] ? parseInt(lines.map(x => x.match(/\b(20\d{2})\b/)).find(Boolean)![1]) : fallbackYear);
        out.date = `${y}-${String(mes).padStart(2, '0')}-${String(parseInt(m[2])).padStart(2, '0')}`;
        out.dateLabel = m[0];
        break;
      }
    }
  }
  if (!out.date) out.warnings.push('No se pudo leer la fecha de la captura; indícala manualmente.');

  // ── Entradas ─────────────────────────────────────────────────────────────
  let cur: TrParsedEntry | null = null;
  let lastSda: string | undefined;
  const hoursSeq: { value: number; entryIdx: number | null }[] = [];

  for (const l of lines) {
    const fm = l.match(FEATURE_RE);
    if (fm && SDA_PREFIX.test(fm[1])) { lastSda = fm[1]; continue; }
    if (fm) {
      // Nueva feature
      const rest = l.slice(l.indexOf(fm[1]) + fm[1].length).replace(/^\s*[-–—:]\s*/, '');
      cur = { featureId: fm[1].toUpperCase(), title: rest.replace(HOURS_RE, '').trim(), sda: lastSda, hours: null };
      out.entries.push(cur);
      for (const hm of l.matchAll(HOURS_RE)) hoursSeq.push({ value: parseInt(hm[1]) + parseInt(hm[2]) / 60, entryIdx: out.entries.length - 1 });
      continue;
    }
    // Línea de actividad/tecnología
    if (/tecnolog|actividad|dataproc|datio|spark|scala|control-?m|hammurabi/i.test(l) && cur && !cur.actividad) {
      cur.actividad = l.replace(HOURS_RE, '').replace(/^tecnolog[ií]a\s*/i, '').replace(/^['"]+|['"]+$/g, '').trim();
    }
    for (const hm of l.matchAll(HOURS_RE)) {
      const v = parseInt(hm[1]) + parseInt(hm[2]) / 60;
      if (v > 0 && v <= 24) hoursSeq.push({ value: v, entryIdx: cur ? out.entries.length - 1 : null });
    }
  }

  // ── Asignar horas: la última cifra suele ser el total del día ───────────
  const n = out.entries.length;
  const seq = hoursSeq.filter(h => h.value > 0);
  if (n > 0) {
    let candidates = seq;
    if (seq.length >= n + 1) {
      const last = seq[seq.length - 1];
      const sumOthers = seq.slice(0, -1).reduce((s, h) => s + h.value, 0);
      if (Math.abs(sumOthers - last.value) < 0.01 || seq.length === n + 1) { out.total = last.value; candidates = seq.slice(0, -1); }
    }
    // Preferir la cifra asociada a cada entrada; si no, repartir en orden
    out.entries.forEach((e, i) => {
      const own = candidates.find(h => h.entryIdx === i);
      if (own) e.hours = own.value;
    });
    const unassigned = candidates.filter(h => !out.entries.some((e, i) => e.hours === h.value && h.entryIdx === i));
    out.entries.forEach(e => { if (e.hours === null && unassigned.length) e.hours = unassigned.shift()!.value; });
    if (out.total === undefined) out.total = out.entries.reduce((s, e) => s + (e.hours ?? 0), 0);
  } else if (seq.length) {
    out.total = seq[seq.length - 1].value;
    out.warnings.push('No se detectaron features (DECRONOS-xxxx); revisa que la captura sea legible.');
  } else {
    out.warnings.push('No se detectaron registros en la captura.');
  }
  const sum = out.entries.reduce((s, e) => s + (e.hours ?? 0), 0);
  if (out.entries.some(e => e.hours === null)) out.warnings.push('Alguna entrada quedó sin horas; complétalas.');
  if (out.total !== undefined && Math.abs(sum - out.total) > 0.01) out.warnings.push(`La suma de entradas (${sum.toFixed(2)} h) no coincide con el total leído (${out.total.toFixed(2)} h).`);
  return out;
}

/** Horas decimal → "3:30" */
export function fmtHours(h: number): string {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh}:${String(mm).padStart(2, '0')}`;
}
