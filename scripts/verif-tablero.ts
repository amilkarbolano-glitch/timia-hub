// Comprobación del puente Plan de Trabajo → Tablero.
// El bug: asignar a alguien en el plan no le creaba tarjeta, así que no veía nada.

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

const { adminStore, PRIORIDADES, ESTADOS_KANBAN, normalizaTarea } = await import('../src/lib/adminStore');
const { sincronizarAsignados, sincronizarPlanDesdeTablero, reconciliarTablero, fechasDeActividad } =
  await import('../src/lib/planTablero');

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };
const reset = () => { Object.keys(store).forEach(k => delete store[k]); };

const HOL = new Set<string>(['2026-10-12']);          // festivo dentro de la ventana
const META = { titulo: 'Construcción de procesamiento', entregableName: 'Desarrollo',
               startWeek: 1, endWeek: 2, planStartDate: '2026-10-01' };
const tareas = () => adminStore.getKanbanTasks();

// ── 1. Asignar crea la tarjeta ───────────────────────────────────────────────
console.log('── Asignar desde el plan ──');
reset();
ok(tareas().length === 0, 'el tablero arranca vacío');
let r = sincronizarAsignados('MIGBD', 'ent-dev', 3, ['u-santiago'], META, HOL);
ok(r === 'creada', 'asignar a alguien crea la tarjeta');
const t = tareas()[0];
ok(!!t && t.assigneeIds.includes('u-santiago'), 'la tarjeta queda asignada a Santiago');
ok(t.fromPlan === true && t.isLocked === true, 'nace marcada fromPlan e isLocked');
ok(t.projectId === 'MIGBD' && t.entregableId === 'ent-dev' && t.actIdx === 3, 'queda vinculada a la actividad');
ok(t.title === META.titulo, 'toma el nombre de la actividad');
ok(t.status === 'backlog', 'entra al backlog');

// ── 1b. Los valores tienen que existir en el catálogo ───────────────────────
// Una tarjeta con priority:'media' (minúscula) dejaba el tablero en blanco:
// PRIORITY_COLORS['media'] es undefined y la vista leía .bg sobre undefined.
console.log('\n── Valores del catálogo ──');
ok(PRIORIDADES.includes(t.priority), `priority "${t.priority}" está en ${PRIORIDADES.join(' | ')}`);
ok(ESTADOS_KANBAN.includes(t.status), `status "${t.status}" está en ${ESTADOS_KANBAN.join(' | ')}`);

// y lo que ya esté guardado con un valor inválido se cura al leer
const sucia = normalizaTarea({ id:'x', priority:'media', status:'en_curso', assigneeIds:null });
ok(sucia.priority === 'Media', `normaliza "media" → "${sucia.priority}"`);
ok(sucia.status === 'backlog', `normaliza un estado desconocido → "${sucia.status}"`);
ok(Array.isArray(sucia.assigneeIds) && Array.isArray(sucia.links) && Array.isArray(sucia.comments),
   'rellena las listas que falten, para que la vista nunca itere sobre null');
ok(normalizaTarea({ id:'y', priority:'Alta', status:'done' }).priority === 'Alta',
   'no toca una prioridad que ya es válida');

// ── 2. Fechas reales, en días hábiles ────────────────────────────────────────
console.log('\n── Fechas ──');
// S1 arranca jue 01/10. 5 días hábiles por semana; el 12/10 es festivo.
const fe = fechasDeActividad(META, HOL);
ok(fe.startDate === '2026-10-01', `S1 empieza el 01/10 (dio ${fe.startDate})`);
ok(fe.endDate > fe.startDate, 'el fin es posterior al inicio');
// a mediodía local, como hace la librería: con 'YYYY-MM-DD' a secas el navegador
// parsea UTC y en Bogotá (-05) el día se corre hacia atrás
const local = (iso: string) => new Date(iso + 'T12:00:00');
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const habiles = (() => { let n = 0; const d = local(fe.startDate), fin = local(fe.endDate);
  while (d <= fin) { const w = d.getDay();
    if (w !== 0 && w !== 6 && !HOL.has(fmt(d))) n++; d.setDate(d.getDate()+1); } return n; })();
ok(habiles === 10, `dos semanas del plan son 10 días hábiles (dio ${habiles})`);
ok(fechasDeActividad({ ...META, planStartDate: undefined }, HOL).startDate === '',
   'sin fecha de inicio del plan, la tarjeta nace sin fechas en vez de inventarlas');

// ── 3. Idempotencia y segundo responsable ────────────────────────────────────
console.log('\n── Repetir y sumar ──');
ok(sincronizarAsignados('MIGBD', 'ent-dev', 3, ['u-santiago'], META, HOL) === 'sin-cambios',
   'volver a sincronizar lo mismo no cambia nada');
ok(tareas().length === 1, 'no se duplicó la tarjeta');
ok(sincronizarAsignados('MIGBD', 'ent-dev', 3, ['u-santiago', 'u-ana'], META, HOL) === 'actualizada',
   'sumar un responsable actualiza la tarjeta');
ok(tareas()[0].assigneeIds.length === 2 && tareas().length === 1, 'sigue siendo una sola tarjeta, con dos asignados');

// ── 4. Quitar responsables ───────────────────────────────────────────────────
console.log('\n── Quitar responsables ──');
ok(sincronizarAsignados('MIGBD', 'ent-dev', 3, [], META, HOL) === 'borrada',
   'sin responsables y sin trabajo encima, la tarjeta se borra');
ok(tareas().length === 0, 'el tablero queda limpio');

// con trabajo encima no se borra: se queda sin asignados
sincronizarAsignados('MIGBD', 'ent-dev', 3, ['u-santiago'], META, HOL);
let conTrabajo = tareas();
conTrabajo[0] = { ...conTrabajo[0], status: 'in-progress' };
adminStore.saveKanbanTasks(conTrabajo);
ok(sincronizarAsignados('MIGBD', 'ent-dev', 3, [], META, HOL) === 'actualizada',
   'una tarjeta ya en curso no se borra');
ok(tareas().length === 1 && tareas()[0].assigneeIds.length === 0,
   'se queda sin asignados, pero no se pierde el avance ni los comentarios');

// ── 5. Cronogramas distintos no se pisan ─────────────────────────────────────
console.log('\n── Cronogramas ──');
reset();
sincronizarAsignados('MIGBD', 'ent-dev', 0, ['u-santiago'], META, HOL);
sincronizarAsignados('MIGBD::crono-2', 'ent-dev', 0, ['u-ana'], META, HOL);
ok(tareas().length === 2, 'la misma actividad en dos cronogramas son dos tarjetas');
ok(tareas()[1].cronoId === 'crono-2', 'la segunda guarda su cronoId');
ok(new Set(tareas().map(x => x.id)).size === 2, 'los ids no colisionan');

// ── 6. Camino inverso: del tablero al plan ───────────────────────────────────
console.log('\n── Tablero → plan ──');
reset();
ok(sincronizarPlanDesdeTablero('MIGBD', 'ent-dev', 3, ['u-ana']) === true,
   'cambiar los asignados en la tarjeta se refleja en el plan');
ok((adminStore.getActivityAssignees()['MIGBD__ent-dev__3'] ?? []).includes('u-ana'),
   'la asignación queda guardada en el plan');
ok(sincronizarPlanDesdeTablero('MIGBD', 'ent-dev', 3, ['u-ana']) === false,
   'repetirlo no vuelve a escribir');

// ── 7. Reparación de lo ya asignado ──────────────────────────────────────────
console.log('\n── Reparar lo asignado antes ──');
reset();
adminStore.saveActivityAssignees({
  'MIGBD__ent-dev__0':          ['u-santiago'],
  'MIGBD__ent-dev__1':          ['u-santiago', 'u-ana'],
  'MIGBD::crono-2__ent-doc__0': ['u-ana'],
  'MIGBD__ent-dev__9':          ['u-santiago'],   // actividad que ya no existe
  'MIGBD__ent-dev__2':          [],               // sin responsables
});
const planes = [
  { planKey: 'MIGBD', startDate: '2026-10-01', entregables: [
    { id: 'ent-dev', name: 'Desarrollo', activities: [
      { name: 'Act A', startWeek: 1, endWeek: 1 },
      { name: 'Act B', startWeek: 2, endWeek: 3 },
      { name: 'Act C', startWeek: 4, endWeek: 4 }] }] },
  { planKey: 'MIGBD::crono-2', startDate: '2026-11-02', entregables: [
    { id: 'ent-doc', name: 'Documentación', activities: [{ name: 'Act D', startWeek: 1, endWeek: 1 }] }] },
];
const n = reconciliarTablero(planes, HOL);
ok(n === 3, `crea una tarjeta por asignación viva (dio ${n})`);
ok(tareas().length === 3, 'quedan 3 tarjetas');
ok(!tareas().some(x => x.actIdx === 9), 'ignora la asignación a una actividad que ya no existe');
ok(!tareas().some(x => x.assigneeIds.length === 0), 'ignora las claves sin responsables');
ok(tareas().find(x => x.actIdx === 1)!.assigneeIds.length === 2, 'respeta los dos responsables');
ok(tareas().find(x => x.cronoId === 'crono-2')!.title === 'Act D', 'parsea bien el planKey con "::"');
ok(reconciliarTablero(planes, HOL) === 0, 'correrlo otra vez no crea nada (idempotente)');
ok(tareas().length === 3, 'sigue habiendo 3 tarjetas');

// no toca una tarjeta que el equipo ya movió
let movida = tareas();
movida[0] = { ...movida[0], status: 'done', title: 'renombrada a mano' };
adminStore.saveKanbanTasks(movida);
reconciliarTablero(planes, HOL);
ok(tareas().find(x => x.id === movida[0].id)!.title === 'renombrada a mano',
   'no sobreescribe una tarjeta existente');

console.log(f === 0 ? '\npuente plan → tablero OK' : `\n${f} fallas`);
if (f) process.exit(1);
