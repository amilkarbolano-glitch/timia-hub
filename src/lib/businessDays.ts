// ─── Utilidades de días hábiles ───────────────────────────────────────────────
// Cada "semana" del plan = 5 días hábiles (lun-vie excluyendo festivos).

/** ¿Es fin de semana o festivo? */
export function isBusyDay(d: Date, holidays: Set<string>): boolean {
  const dow = d.getDay();
  const iso = d.toISOString().slice(0, 10);
  return dow === 0 || dow === 6 || holidays.has(iso);
}

/** Avanza al primer día hábil en o después de `from`. */
export function snapToBusinessDay(from: Date, holidays: Set<string>): Date {
  const d = new Date(from);
  while (isBusyDay(d, holidays)) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Añade `days` días hábiles a `from`.
 * Presupone que `from` ya es día hábil (usa snapToBusinessDay antes si hace falta).
 */
export function addBusinessDays(from: Date, days: number, holidays: Set<string>): Date {
  if (days === 0) return new Date(from);
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (!isBusyDay(d, holidays)) added++;
  }
  return d;
}

/**
 * Devuelve la fecha de inicio de una semana del plan (1-indexed).
 * S1 → startDate (snapped a día hábil), S2 → S1 + 5 días hábiles, etc.
 */
export function weekStartDate(
  planStartDate: string,
  weekIdx: number,
  holidays: Set<string>,
): Date {
  const s1 = snapToBusinessDay(new Date(planStartDate + 'T12:00:00'), holidays);
  return addBusinessDays(s1, (weekIdx - 1) * 5, holidays);
}

/**
 * Semana (0-indexed) en que cae hoy, contando días hábiles desde startDate.
 * Cada sprint = 5 días hábiles. Devuelve -1 si startDate no está definida
 * o si aún no ha llegado.
 */
export function computeBusinessWeekIdx(
  startDate: string | undefined,
  holidays: Set<string>,
): number {
  if (!startDate) return -1;
  const s1 = snapToBusinessDay(new Date(startDate + 'T12:00:00'), holidays);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (today < s1) return -1;
  const d = new Date(s1);
  let count = 0;
  while (d < today) {
    if (!isBusyDay(d, holidays)) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.floor(count / 5);
}
