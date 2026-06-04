// Festivos Colombia 2026 (Ley 51/1983 — lunes festivos)
const HOLIDAYS_2026 = new Set([
  '2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03',
  '2026-05-01','2026-05-18','2026-06-08','2026-06-15','2026-07-03',
  '2026-07-20','2026-08-07','2026-08-17','2026-10-12','2026-11-02',
  '2026-11-16','2026-12-08','2026-12-25',
]);

function pad(n: number) { return n.toString().padStart(2,'0'); }
function toKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

export function isHoliday(d: Date): boolean { return HOLIDAYS_2026.has(toKey(d)); }
export function isWorkingDay(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6 && !isHoliday(d);
}

export function addWorkingDays(start: Date, days: number): Date {
  let cur = new Date(start); let count = 0;
  while (count < days) { cur.setDate(cur.getDate()+1); if (isWorkingDay(cur)) count++; }
  return cur;
}

export function workingDaysBetween(start: Date, end: Date): number {
  let cur = new Date(start); let count = 0;
  while (cur < end) { cur.setDate(cur.getDate()+1); if (isWorkingDay(cur)) count++; }
  return count;
}

export function workingDaysRemaining(end: Date): number {
  return workingDaysBetween(new Date(), end);
}

export const ANS_MAX_DAYS: Record<string, number> = {
  Baja: 2, Media: 5, Alta: 10, Crítica: 15,
};

export function formatCODate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric', timeZone:'America/Bogota' });
}
