// ─── Inventarios del proyecto ────────────────────────────────────────────────
// Tres inventarios que antes vivían en el Excel de seguimiento:
//   · Objetos      → una fila por tabla/objeto a migrar, con sus etapas y enlaces
//   · DataX        → configuración de namespaces/adapters + un bloque por objeto
//   · Transmisión  → automatización del movimiento del archivo (rutas, horarios)
//
// Las tres colecciones se guardan con persistSet, así que viajan a Mongo por
// PUT /api/state/{key}. Las reglas de escritura están en permissions.py.

import { persistSet, persistGet } from './persist';

// ─── Catálogo de enlaces por objeto ──────────────────────────────────────────
// Fijo a propósito: así todos los objetos tienen los mismos enlaces y se puede
// ver de un golpe a cuál le falta el MSD o el diccionario.
export const ENLACES: { id: string; label: string; hint: string }[] = [
  { id: 'msd',         label: 'MSD',         hint: 'Modelo semántico de datos enviado a gobierno' },
  { id: 'diccionario', label: 'Diccionario', hint: 'Diccionario de datos del objeto' },
  { id: 'sfi',         label: 'SFI',         hint: 'Solicitud de flujo de información' },
  { id: 'muestra',     label: 'Muestra',     hint: 'Muestra de datos generada' },
  { id: 'transfer',    label: 'Transfer',    hint: 'Transferencia en DataX' },
  { id: 'dataObject',  label: 'DO',          hint: 'Data Object nuevo' },
  { id: 'dataX',       label: 'DataX',       hint: 'Enlace al DataX del objeto' },
  { id: 'documentacion', label: 'Doc.',      hint: 'Documentación funcional o técnica' },
];
export type EnlaceId = typeof ENLACES[number]['id'];

// ─── Inventario de objetos ───────────────────────────────────────────────────
export interface InvRow {
  id: string;
  projectId: string;
  objeto: string;              // t_crdc_… (nombre destino)
  descripcion: string;
  // Identidad en origen
  alias: string;
  nombreLegacy: string;
  origen: string;              // Tantia (Distribuido), Host, …
  // Clasificación
  nivelSeguridad: string;      // Alto / Medio / Bajo
  haceDataX: string;           // Sí / No
  uuaaRaw: string;
  uuaaMaster: string;
  // Formato del archivo
  cantidadCampos: string;
  separador: string;
  encabezado: string;          // Sí / No
  periodicidad: string;        // Diaria / Mensual / …
  nombreArchivoTantia: string;
  nombreArchivoAda: string;
  // Versionado
  versionModelo: string;
  versionObjeto: string;
  // Enlaces (clave del catálogo ENLACES → URL)
  enlaces: Record<string, string>;
  // Etapas del tracking (stageId → '' | 'Sí' | 'N/A' | '0'-'100' | texto)
  stages: Record<string, string>;
  // Quién ejecuta cada etapa (stageId → 'Fábrica', 'Gobierno', un nombre…).
  // En el Excel esto venía en la misma celda que la etapa; separarlo permite
  // ver a la vez de quién depende el paso y si ya está hecho.
  responsables: Record<string, string>;

  /** @deprecated usar enlaces.documentacion — se migra solo al leer */
  documentacion?: string;
  /** @deprecated usar enlaces.diccionario — se migra solo al leer */
  diccionario?: string;
}
export interface InvStage { id: string; label: string; type?: 'check' | 'percent'; }

/** Columnas de texto del inventario de objetos, en el orden en que se muestran. */
export const COLS_OBJETO: { key: keyof InvRow & string; label: string; width: number; mono?: boolean; opciones?: string[] }[] = [
  { key: 'alias',               label: 'Alias',          width: 100, mono: true },
  { key: 'nombreLegacy',        label: 'Nombre legacy',  width: 160, mono: true },
  { key: 'origen',              label: 'Origen',         width: 110 },
  { key: 'nivelSeguridad',      label: 'Nivel seg.',     width: 78,  opciones: ['L1', 'L2', 'L3'] },
  { key: 'haceDataX',           label: 'DataX',          width: 56,  opciones: ['Sí', 'No'] },
  { key: 'uuaaRaw',             label: 'UUAA Raw',       width: 72,  mono: true },
  { key: 'uuaaMaster',          label: 'UUAA Master',    width: 80,  mono: true },
  { key: 'cantidadCampos',      label: '# Campos',       width: 60 },
  { key: 'separador',           label: 'Sep.',           width: 46 },
  { key: 'encabezado',          label: 'Encab.',         width: 54,  opciones: ['Sí', 'No'] },
  { key: 'periodicidad',        label: 'Periodicidad',   width: 88 },
  { key: 'nombreArchivoTantia', label: 'Archivo origen', width: 170, mono: true },
  { key: 'nombreArchivoAda',    label: 'Archivo ADA',    width: 170, mono: true },
  { key: 'versionModelo',       label: 'V. Modelo',      width: 66 },
  { key: 'versionObjeto',       label: 'V. Objeto',      width: 66 },
];

/** Columnas que se ven sin desplegar el detalle. El resto va en el panel lateral. */
export const COLS_OBJETO_RESUMEN = new Set(['alias', 'origen', 'nivelSeguridad', 'haceDataX', 'periodicidad']);

export function filaObjetoVacia(projectId: string): InvRow {
  return {
    id: 'r' + Date.now(), projectId,
    objeto: '', descripcion: '', alias: '', nombreLegacy: '', origen: '',
    nivelSeguridad: '', haceDataX: '', uuaaRaw: '', uuaaMaster: '',
    cantidadCampos: '', separador: '', encabezado: '', periodicidad: '',
    nombreArchivoTantia: '', nombreArchivoAda: '',
    versionModelo: '', versionObjeto: '',
    enlaces: {}, stages: {}, responsables: {},
  };
}

/** Normaliza filas viejas: enlaces sueltos → enlaces{}, campos nuevos en blanco. */
export function normalizaObjeto(r: any): InvRow {
  const base = filaObjetoVacia(r?.projectId ?? '');
  const enlaces: Record<string, string> = { ...(r?.enlaces ?? {}) };
  if (r?.documentacion && !enlaces.documentacion) enlaces.documentacion = r.documentacion;
  if (r?.diccionario   && !enlaces.diccionario)   enlaces.diccionario   = r.diccionario;
  return { ...base, ...r, id: r?.id ?? base.id, enlaces,
           stages: r?.stages ?? {}, responsables: r?.responsables ?? {} };
}

// ─── Inventario de transmisión / automatización ──────────────────────────────
export interface InvTransmision {
  id: string;
  projectId: string;
  objeto: string;
  nombreLegacy: string;
  origen: string;
  // Origen (Tantia)
  rutaTantiaWork: string;
  rutaTantiaLive: string;
  archivoTantia: string;
  encabezadoOrigen: string;
  separadorOrigen: string;
  formatoTantia: string;
  // Destino (ADA)
  rutaAda: string;
  archivoAda: string;
  encabezadoDestino: string;
  separadorDestino: string;
  // Programación
  periodicidad: string;
  diasEjecucion: string;
  horaEjecucion: string;
  frecuencia: string;
  corteLectura: string;
  corteEscritura: string;
}

export const GRUPOS_TRANSMISION: { titulo: string; campos: { key: keyof InvTransmision & string; label: string; width: number; mono?: boolean }[] }[] = [
  { titulo: 'Objeto', campos: [
    { key: 'objeto',        label: 'Objeto',        width: 200, mono: true },
    { key: 'nombreLegacy',  label: 'Nombre legacy', width: 180, mono: true },
    { key: 'origen',        label: 'Origen',        width: 120 },
  ]},
  { titulo: 'Origen · Tantia', campos: [
    { key: 'rutaTantiaWork',  label: 'Ruta Work',  width: 260, mono: true },
    { key: 'rutaTantiaLive',  label: 'Ruta Live',  width: 260, mono: true },
    { key: 'archivoTantia',   label: 'Archivo',    width: 220, mono: true },
    { key: 'formatoTantia',   label: 'Formato',    width: 70 },
    { key: 'separadorOrigen', label: 'Separador',  width: 70 },
    { key: 'encabezadoOrigen',label: 'Encabezado', width: 80 },
  ]},
  { titulo: 'Destino · ADA', campos: [
    { key: 'rutaAda',           label: 'Ruta',       width: 260, mono: true },
    { key: 'archivoAda',        label: 'Archivo',    width: 220, mono: true },
    { key: 'separadorDestino',  label: 'Separador',  width: 70 },
    { key: 'encabezadoDestino', label: 'Encabezado', width: 80 },
  ]},
  { titulo: 'Programación', campos: [
    { key: 'periodicidad',   label: 'Periodicidad',     width: 90 },
    { key: 'diasEjecucion',  label: 'Días',             width: 130 },
    { key: 'horaEjecucion',  label: 'Hora',             width: 70 },
    { key: 'frecuencia',     label: 'Cada cuánto',      width: 100 },
    { key: 'corteLectura',   label: 'Corte lectura',    width: 140 },
    { key: 'corteEscritura', label: 'Corte escritura',  width: 140 },
  ]},
];

export function filaTransmisionVacia(projectId: string): InvTransmision {
  const r: any = { id: 'tx' + Date.now(), projectId };
  GRUPOS_TRANSMISION.forEach(g => g.campos.forEach(c => { r[c.key] = ''; }));
  return r as InvTransmision;
}

// ─── Inventario DataX ────────────────────────────────────────────────────────
// En el Excel es una hoja de dos columnas (Tantia | ADA). Aquí se parte en
// configuración global del proyecto + un bloque por objeto.
export interface DataXEntorno {
  namespaceWork: string; namespaceLive: string;
  adapterWork: string;   adapterLive: string;
  rutaWork: string;      rutaLive: string;
}
export interface DataXConfig { id: string; projectId: string; tantia: DataXEntorno; ada: DataXEntorno; }

export interface InvDataX {
  id: string;
  projectId: string;
  objeto: string;
  // Lado Tantia (lectura)
  doReadWork: string;   doReadLive: string;
  transferWork: string; transferLive: string;
  rutaArchivoWork: string; rutaArchivoLive: string;
  // Lado ADA (escritura)
  doWriteWork: string;  doWriteLive: string;
  rutaArchivoAda: string;
}

export const CAMPOS_DATAX_ENTORNO: { key: keyof DataXEntorno & string; label: string }[] = [
  { key: 'namespaceWork', label: 'Namespace · Work' },
  { key: 'namespaceLive', label: 'Namespace · Live' },
  { key: 'adapterWork',   label: 'Adapter · Work' },
  { key: 'adapterLive',   label: 'Adapter · Live' },
  { key: 'rutaWork',      label: 'Ruta · Work' },
  { key: 'rutaLive',      label: 'Ruta · Live' },
];

export const GRUPOS_DATAX: { titulo: string; campos: { key: keyof InvDataX & string; label: string }[] }[] = [
  { titulo: 'Tantia · lectura', campos: [
    { key: 'doReadWork',      label: 'Data Object · Work' },
    { key: 'doReadLive',      label: 'Data Object · Live' },
    { key: 'transferWork',    label: 'Transfer · Work' },
    { key: 'transferLive',    label: 'Transfer · Live' },
    { key: 'rutaArchivoWork', label: 'Ruta archivo · Work' },
    { key: 'rutaArchivoLive', label: 'Ruta archivo · Live' },
  ]},
  { titulo: 'ADA · escritura', campos: [
    { key: 'doWriteWork',    label: 'Data Object · Work' },
    { key: 'doWriteLive',    label: 'Data Object · Live' },
    { key: 'rutaArchivoAda', label: 'Ruta archivo' },
  ]},
];

export function filaDataXVacia(projectId: string, objeto = ''): InvDataX {
  const r: any = { id: 'dx' + Date.now(), projectId, objeto };
  GRUPOS_DATAX.forEach(g => g.campos.forEach(c => { r[c.key] = ''; }));
  return r as InvDataX;
}
export function configDataXVacia(projectId: string): DataXConfig {
  const vacio = (): DataXEntorno => ({ namespaceWork:'', namespaceLive:'', adapterWork:'', adapterLive:'', rutaWork:'', rutaLive:'' });
  return { id: 'cfg-' + projectId, projectId, tantia: vacio(), ada: vacio() };
}

// ─── Persistencia ────────────────────────────────────────────────────────────
export const K_OBJETOS     = 'timia_inv_v2';
export const K_STAGES      = 'timia_inv_stages';
export const K_TRANSMISION = 'timia_inv_transmision';
export const K_DATAX       = 'timia_inv_datax';
export const K_DATAX_CFG   = 'timia_datax_config';

export const invStore = {
  objetos():     InvRow[]         { return persistGet<any[]>(K_OBJETOS, []).map(normalizaObjeto); },
  transmision(): InvTransmision[] { return persistGet<InvTransmision[]>(K_TRANSMISION, []); },
  datax():       InvDataX[]       { return persistGet<InvDataX[]>(K_DATAX, []); },
  dataxConfigs(): DataXConfig[]   { return persistGet<DataXConfig[]>(K_DATAX_CFG, []); },
  dataxConfig(projectId: string): DataXConfig {
    return invStore.dataxConfigs().find(c => c.projectId === projectId) ?? configDataXVacia(projectId);
  },

  setObjetos(v: InvRow[])         { persistSet(K_OBJETOS, v); },
  setTransmision(v: InvTransmision[]) { persistSet(K_TRANSMISION, v); },
  setDatax(v: InvDataX[])         { persistSet(K_DATAX, v); },
  setDataxConfig(cfg: DataXConfig) {
    const rest = invStore.dataxConfigs().filter(c => c.projectId !== cfg.projectId);
    persistSet(K_DATAX_CFG, [...rest, cfg]);
  },
};
