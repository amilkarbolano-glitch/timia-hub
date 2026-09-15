// ─── Imputaciones: plantilla Excel e importación ─────────────────────────────
import * as XLSX from 'xlsx';
import type { ImputacionEntry, JiraStatus, AdminUser } from './adminStore';

export const IMP_STATUSES: JiraStatus[] = ['New', 'Analysing', 'In Progress', 'Ready', 'Ready to Verify', 'Ready to Deploy', 'Deployed', 'Blocked', 'Discarded', 'Test', 'Accepted'];
export const IMP_TYPES = ['Enabler Delivery', 'Deployment', 'Bug', 'Story', 'Task'];
export const IMP_PHASES = ['Análisis y Diseño', 'Codificación', 'Pruebas', 'UAT', 'Despliegue', 'Soporte'];

export const COLUMNS = [
  ['ID Feature', 'Obligatorio. Ej: DECIBCUMPL-727'],
  ['Descripción', 'Resumen de la feature'],
  ['Tipo', `Uno de: ${IMP_TYPES.join(' | ')}`],
  ['Estado', `Obligatorio. Uno de: ${IMP_STATUSES.join(' | ')}`],
  ['Fecha estado', 'AAAA-MM-DD en que entró a ese estado (opcional; si falta se usa hoy)'],
  ['Q', 'Ej: Q3-2026'],
  ['Mes', 'Ej: Septiembre'],
  ['Semanas', 'Ej: 1-3 o 12'],
  ['Fase', `Uno de: ${IMP_PHASES.join(' | ')}`],
  ['Responsables', 'Correos del equipo separados por ; (o "todos")'],
  ['Horas estimadas', 'Número'],
  ['Horas imputadas', 'Número'],
  ['Contexto', 'Texto libre (feature padre, notas, referencia del TR)'],
] as const;

/** Genera y descarga la plantilla para un proyecto, con ejemplos y listas válidas. */
export function downloadTemplate(projectId: string, projectName: string, users: AdminUser[], existing: ImputacionEntry[]) {
  const wb = XLSX.utils.book_new();
  const header = COLUMNS.map(c => c[0]);
  const byId = (ids: string[]) => ids.map(i => users.find(u => u.id === i)?.email ?? i).join('; ');
  const rows = existing.length
    ? existing.map(e => [e.jiraId, e.summary, e.type, e.status, e.history?.slice(-1)[0]?.date ?? e.createdAt, e.q, e.month, e.weeks, e.phase, e.assigneeIds.includes('todos') ? 'todos' : byId(e.assigneeIds), e.hoursEst, e.hoursImputed, e.context])
    : [['DECIBCUMPL-727', 'Análisis y diseño · ADA', 'Enabler Delivery', 'Analysing', new Date().toISOString().slice(0, 10), 'Q3-2026', 'Septiembre', '1-2', 'Análisis y Diseño', users[0]?.email ?? '', 48, 0, 'Ejemplo — borrar esta fila']];
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [16, 40, 16, 16, 12, 10, 12, 10, 18, 34, 10, 10, 34].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Imputaciones');
  const instr = [
    [`Plantilla de imputaciones · Proyecto ${projectName} (${projectId})`],
    ['Llena la hoja "Imputaciones" (una fila por feature) y súbela en Recursos › Imputaciones Jira › Importar Excel.'],
    ['Si el ID Feature ya existe en el proyecto se actualiza; si no, se crea. Un cambio de Estado queda en la línea de tiempo con la Fecha estado.'],
    [],
    ['Columna', 'Descripción'], ...COLUMNS.map(c => [c[0], c[1]]),
    [],
    ['Estados válidos', IMP_STATUSES.join(' | ')], ['Tipos válidos', IMP_TYPES.join(' | ')], ['Fases válidas', IMP_PHASES.join(' | ')],
    [],
    ['Correos del equipo'], ...users.map(u => [u.email, `${u.name} · ${u.role}`]),
  ];
  const wi = XLSX.utils.aoa_to_sheet(instr); wi['!cols'] = [{ wch: 22 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wi, 'Instrucciones');
  XLSX.writeFile(wb, `Imputaciones_${projectId}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface ParsedRow {
  row: number; jiraId: string; summary: string; type: string; status: JiraStatus | string; statusDate: string;
  q: string; month: string; weeks: string; phase: string; assigneeIds: string[]; unknownEmails: string[];
  hoursEst: number; hoursImputed: number; context: string; errors: string[]; warnings: string[]; existing?: ImputacionEntry;
}

function norm(v: unknown): string { return v === undefined || v === null ? '' : String(v).trim(); }
function toISO(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = norm(v); if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (d) return `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}`;
  if (/^\d+(\.\d+)?$/.test(s)) { const dt = XLSX.SSF.parse_date_code(Number(s)); if (dt) return `${dt.y}-${String(dt.m).padStart(2, '0')}-${String(dt.d).padStart(2, '0')}`; }
  return s;
}

/** Lee el archivo y devuelve filas validadas (no guarda nada). */
export async function parseImport(file: File, users: AdminUser[], existing: ImputacionEntry[]): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws = wb.Sheets['Imputaciones'] ?? wb.Sheets[wb.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!data.length) return [];
  const hdr = data[0].map((h: unknown) => norm(h).toLowerCase());
  const col = (name: string) => hdr.findIndex(h => h === name.toLowerCase());
  const idx = Object.fromEntries(COLUMNS.map(c => [c[0], col(c[0])])) as Record<string, number>;
  if (idx['ID Feature'] < 0 || idx['Estado'] < 0) throw new Error('El archivo no tiene las columnas "ID Feature" y "Estado". Usa la plantilla.');
  const byEmail = new Map(users.map(u => [u.email.toLowerCase(), u.id]));
  const out: ParsedRow[] = [];
  const seen = new Set<string>();
  data.slice(1).forEach((r, i) => {
    const g = (name: string) => idx[name] >= 0 ? r[idx[name]] : '';
    const jiraId = norm(g('ID Feature')).toUpperCase();
    if (!jiraId && !norm(g('Descripción'))) return;                      // fila vacía
    const errors: string[] = [], warnings: string[] = [];
    if (!jiraId) errors.push('Falta ID Feature');
    else if (!/^[A-Z][A-Z0-9]+-\d+$/.test(jiraId)) warnings.push(`ID poco usual: ${jiraId}`);
    if (seen.has(jiraId)) errors.push('ID repetido en el archivo'); seen.add(jiraId);
    const status = norm(g('Estado'));
    if (!status) errors.push('Falta Estado');
    else if (!IMP_STATUSES.includes(status as JiraStatus)) errors.push(`Estado inválido: "${status}"`);
    const type = norm(g('Tipo')) || 'Enabler Delivery'; if (!IMP_TYPES.includes(type)) warnings.push(`Tipo no estándar: "${type}"`);
    const phase = norm(g('Fase')) || 'Análisis y Diseño'; if (!IMP_PHASES.includes(phase)) warnings.push(`Fase no estándar: "${phase}"`);
    const emails = norm(g('Responsables')).split(/[;,]/).map(x => x.trim().toLowerCase()).filter(Boolean);
    const assigneeIds: string[] = [], unknownEmails: string[] = [];
    emails.forEach(e => { if (e === 'todos') assigneeIds.push('todos'); else if (byEmail.has(e)) assigneeIds.push(byEmail.get(e)!); else unknownEmails.push(e); });
    if (unknownEmails.length) warnings.push(`Correos no registrados: ${unknownEmails.join(', ')}`);
    const num = (v: unknown) => { const n = Number(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
    const statusDate = toISO(g('Fecha estado')) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(statusDate)) errors.push(`Fecha estado inválida: "${statusDate}"`);
    const existingEntry = existing.find(e => e.jiraId.toUpperCase() === jiraId);
    out.push({ row: i + 2, jiraId, summary: norm(g('Descripción')), type, status, statusDate, q: norm(g('Q')), month: norm(g('Mes')), weeks: norm(g('Semanas')), phase,
      assigneeIds, unknownEmails, hoursEst: num(g('Horas estimadas')), hoursImputed: num(g('Horas imputadas')), context: norm(g('Contexto')), errors, warnings, existing: existingEntry });
  });
  return out;
}

/** Aplica las filas válidas sobre las imputaciones del proyecto (upsert por ID). Devuelve el nuevo arreglo completo. */
export function applyImport(rows: ParsedRow[], projectId: string, all: ImputacionEntry[], by: string): { entries: ImputacionEntry[]; created: number; updated: number } {
  let created = 0, updated = 0;
  const entries = [...all];
  rows.filter(r => !r.errors.length).forEach(r => {
    const i = entries.findIndex(e => e.projectId === projectId && e.jiraId.toUpperCase() === r.jiraId);
    if (i >= 0) {
      const e = entries[i];
      const history = [...(e.history ?? [{ status: e.status, date: e.createdAt, by: e.createdBy }])];
      if (e.status !== r.status) history.push({ status: r.status as JiraStatus, date: r.statusDate, by, note: 'importación Excel' });
      entries[i] = { ...e, summary: r.summary || e.summary, type: r.type, status: r.status as JiraStatus, q: r.q || e.q, month: r.month || e.month, weeks: r.weeks || e.weeks, phase: r.phase,
        assigneeIds: r.assigneeIds.length ? r.assigneeIds : e.assigneeIds, hoursEst: r.hoursEst || e.hoursEst, hoursImputed: r.hoursImputed, context: r.context || e.context, history };
      updated++;
    } else {
      entries.push({ id: `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, projectId, jiraId: r.jiraId, summary: r.summary, type: r.type, status: r.status as JiraStatus,
        assigneeIds: r.assigneeIds, month: r.month, weeks: r.weeks, q: r.q, phase: r.phase, hoursEst: r.hoursEst, hoursImputed: r.hoursImputed, context: r.context,
        createdBy: by, createdAt: r.statusDate, history: [{ status: r.status as JiraStatus, date: r.statusDate, by, note: 'importación Excel' }] });
      created++;
    }
  });
  return { entries, created, updated };
}
