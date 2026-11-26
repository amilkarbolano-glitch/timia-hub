// ─── Proyectos abiertos (T&M) ────────────────────────────────────────────────
// Todo lo propio de este tipo de proyecto vive bajo este módulo y se usa desde
// fuera solo por aquí. El camino de los proyectos cerrados no importa nada de
// este módulo, y este módulo no modifica nada suyo.
export { default as CrearTareas } from './CrearTareas';
export { default as ProyectoTym } from './ProyectoTym';
export { PasosTym, ChipTym } from './PasosTym';
export { esTym, leerPlan, guardarPlan } from './almacen';
export { avanceDe, cerradasDe, type PlanTym, type TareaTym, type EstadoTarea } from './tipos';
