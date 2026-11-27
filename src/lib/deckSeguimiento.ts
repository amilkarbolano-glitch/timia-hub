/**
 * La presentación de seguimiento, dibujada desde cero.
 *
 * Antes se rellenaba la .pptx que envía Juan: funcionaba, pero obligaba a que
 * alguien cargara esa plantilla en cada proyecto y lo que no estuviera dibujado
 * en ella —los iconos de alerta por actividad, por ejemplo— no había forma de
 * añadirlo. Aquí se arma la lámina entera: los fondos son los PNG de la propia
 * plantilla (van en public/deck) y el resto son formas y texto con las medidas
 * sacadas del archivo original, en pulgadas sobre una lámina de 13,333 × 7,5.
 *
 * Las medidas no son aproximadas ni están a ojo: salen de leer el XML de la
 * plantilla pieza por pieza, así que la lámina generada y la que se venía
 * enviando se superponen.
 */

import { difTexto } from './utils';

export interface ActividadDeck {
  nombre: string;
  pct: number;
  ini: number;
  fin: number;
  /** Los números que esa actividad arrastra en la lista de alertas. */
  alertas?: number[];
  bloqueantes?: number[];
  /** Hubo bloqueo aunque ya esté cerrado y no tenga número en el resumen. */
  huboBloqueo?: boolean;
}

export interface EntregableDeck {
  titulo: string;
  real: number;
  esp: number;
  actividades: ActividadDeck[];
}

export interface DatosDeck {
  fecha: string;                                   // "25 Noviembre 2026"
  titulo: string;                                  // SDATOOL-… · nombre del proyecto
  real: number;
  esp: number;
  alertas: string[];
  bloqueantes: string[];
  resumen: { label: string; pct: string }[];       // la tabla de entregables
  respBBVA: string;
  respTimia: string;
  gantt?: {
    semanas: number;
    semanaHoy: number;
    /** Día hábil en curso, 1..5. Sitúa la raya de hoy dentro de su semana. */
    diaHoy?: number;
    /** Las fechas de cada semana tal y como las pinta la rejilla de pantalla. */
    semanasFechas?: { ini: string; fin: string }[];
    inicio?: Date;
    entregables: EntregableDeck[];
  };
}

// ── la paleta del tema de la plantilla (theme2.xml) ──────────────────────────
const MAGENTA = '9B003E';   // accent1 — la barra, la cabecera de semanas
const DK1     = '99003D';   // el recuadro "Actividades / Avance"
const TAUPE   = '6F5D58';   // dk2 — pastillas de nombre y de avance real
const TAUPE2  = '706259';   // la pastilla del esperado
const HUMO    = 'F8F7F7';   // el blanco roto del texto sobre color
const FONDO   = 'FAF9F9';
const NEGRO   = '000000';
const TURQ    = '00A7B5';   // accent4 — planificado
const AZUL    = '335997';   // accent5 — ejecutado
const GRIS    = 'D5D0CE';   // las rayas de la rejilla
const VERDE   = '15803D';
const AMBAR   = 'D97706';
const ROJO    = 'DC2626';
const ARIAL   = 'Arial';

// ── la lámina ────────────────────────────────────────────────────────────────
const W = 13.333, H = 7.5;

// ── el Gantt, tal y como está dibujado en la plantilla ───────────────────────
const X_NOM = 0.08, W_NOM = 3.44;          // pastilla con el nombre
const X_PCT = 3.55, W_PCT = 0.47;          // pastilla con el porcentaje
const X_ICO = 3.12, W_ICO = 0.165;         // los iconos de alerta y bloqueante
const X_SEM = 4.443;                       // donde empieza la rejilla
const ANCHO_REJILLA = 8.834;               // 14 semanas × 0,631 en el original
const Y_TABLA = 1.604, ALTO_CAB = 0.666;
const PASO = 0.3615, ALTO_FILA = 0.329, ALTO_BARRA = 0.081;
const Y_PRIMERA = 2.340;                   // la primera fila del original
const ABAJO = 6.50;                        // por debajo empieza la leyenda

const IMAGENES = {
  marca: '/deck/marca.png',
  portada: '/deck/portada-a.png',
  wordmark: '/deck/wordmark.png',
  tituloFondo: '/deck/titulo-fondo.png',
  resumenA: '/deck/resumen-a.png',
  alerta: '/deck/alerta.png',
  bloqueante: '/deck/bloqueante.png',
} as const;

type Imagenes = Record<keyof typeof IMAGENES, string>;
let cache: Imagenes | null = null;

/** Los PNG de la plantilla, en base64. Se leen una vez por sesión. */
export async function cargarImagenes(base = ''): Promise<Imagenes> {
  if (cache) return cache;
  const pares = await Promise.all(
    (Object.keys(IMAGENES) as (keyof typeof IMAGENES)[]).map(async k => {
      const r = await fetch(base + IMAGENES[k]);
      if (!r.ok) throw new Error(`No se pudo leer ${IMAGENES[k]}`);
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      return [k, 'image/png;base64,' + btoa(bin)] as const;
    }),
  );
  cache = Object.fromEntries(pares) as Imagenes;
  return cache;
}

const uno = (n: number) => difTexto(n);
const colorDif = (d: number) => (d >= 0 ? VERDE : d < -5 ? ROJO : AMBAR);

/**
 * El tamaño de letra más grande con el que un texto cabe en una caja.
 * Arial ronda media eme por carácter, que para estas cajas basta: lo que se
 * busca es que no se salga, no cuadrar la tipografía al punto.
 */
function tamanoQueCabe(texto: string, ancho: number, alto: number, candidatos: number[]): number {
  const parrafos = texto.split('\n');
  for (const sz of candidatos) {
    const porLinea = Math.max(8, Math.floor(((ancho - 0.1) * 72) / (sz * 0.5)));
    const lineas = parrafos.reduce((s, p) => s + Math.max(1, Math.ceil(p.length / porLinea)), 0);
    if (lineas * sz * 1.25 <= (alto - 0.06) * 72) return sz;
  }
  return candidatos[candidatos.length - 1];
}

/**
 * El tamaño del nombre de una actividad.
 *
 * Todas salen al mismo tamaño mientras quepan en dos renglones, que es como se
 * lee una lista; solo baja cuando el nombre no entra. Antes se exigía que
 * cupiera en uno, así que en la misma lámina convivían nombres a 9 puntos con
 * otros a 6 y parecía un error de maquetación.
 */
function tamanoNombre(texto: string, ancho: number, alto: number): number {
  const utilW = (ancho - 0.06) * 72;
  const utilH = (alto - 0.03) * 72;
  for (const sz of [9, 8, 7, 6]) {
    const porLinea = Math.max(8, Math.floor(utilW / (sz * 0.5)));
    const lineas = Math.max(1, Math.ceil(texto.length / porLinea));
    if (lineas <= 2 && lineas * sz * 1.05 <= utilH) return sz;
  }
  return 6;
}

/**
 * "S3", "27/10-", "02/11" — las tres líneas de una columna de semana.
 *
 * Las fechas vienen calculadas desde el plan, con sus días hábiles y sus
 * festivos. Contarlas aquí de siete en siete desde el arranque desplazaba las
 * columnas en cuanto había un festivo de por medio, y la presentación salía con
 * el corte en otra semana que la pantalla.
 */
function etiquetaSemana(g: { inicio?: Date; semanasFechas?: { ini: string; fin: string }[] }, k: number): string {
  const f = g.semanasFechas?.[k];
  if (f?.ini) return `S${k + 1}\n${f.ini}-\n${f.fin}`;
  if (!g.inicio) return `S${k + 1}`;
  const d0 = new Date(g.inicio); d0.setDate(d0.getDate() + k * 7);
  const d1 = new Date(d0);       d1.setDate(d1.getDate() + 6);
  const dd = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `S${k + 1}\n${dd(d0)}-\n${dd(d1)}`;
}

export async function construirDeck(d: DatosDeck, base = ''): Promise<Blob> {
  const pptx = await armarDeck(d, base);
  return (await pptx.write({ outputType: 'blob' })) as Blob;
}

/** Monta la presentación y la devuelve sin escribir, para poder revisarla. */
export async function armarDeck(d: DatosDeck, base = ''): Promise<any> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const img = await cargarImagenes(base);
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'TIMIA', width: W, height: H });
  pptx.layout = 'TIMIA';
  pptx.author = 'TIMIA';
  pptx.title = d.titulo;

  portadilla(pptx, img, d);
  laminaTitulo(pptx, img, d);
  resumen(pptx, img, d);
  for (const e of d.gantt?.entregables ?? []) {
    laminaGantt(pptx, img, d.gantt!, e);
  }
  cierre(pptx, img);
  return pptx;
}

/**
 * El color de fondo, pintado como un rectángulo a sangre y no con el fondo de
 * lámina. Es lo que hace la plantilla original, y además el <p:bg> que escribe
 * pptxgenjs sale sin el <a:effectLst/> que pide el esquema: PowerPoint lo da
 * por dañado y repara el archivo, que es cuando aparecen láminas en blanco.
 */
function fondo(slide: any, color: string) {
  slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color }, line: { color, width: 0 } });
}

/** El logotipo de arriba y la barra de abajo, que la plantilla pone en todas. */
function sello(slide: any, img: Imagenes) {
  slide.addImage({ data: img.marca, x: 0.313, y: 0.279, w: 1.981, h: 0.316 });
  slide.addShape('rect', { x: 0, y: 7.349, w: 2.304, h: 0.151, fill: { color: MAGENTA }, line: { color: MAGENTA, width: 0 } });
}

function portadilla(pptx: any, img: Imagenes, d: DatosDeck) {
  const s = pptx.addSlide();
  fondo(s, NEGRO);
  s.addImage({ data: img.portada, x: 0, y: 1.013, w: W, h: 6.487 });
  s.addImage({ data: img.wordmark, x: 1.004, y: 0.402, w: 5.63, h: 0.904 });
  s.addText('Seguimiento', {
    x: 0.671, y: 1.825, w: 12.419, h: 2.144,
    fontFace: ARIAL, fontSize: 54, bold: true, color: HUMO, align: 'left', valign: 'bottom', margin: 0,
  });
  s.addText(d.fecha, {
    x: 10.59, y: 6.742, w: 2.297, h: 0.4,
    fontFace: ARIAL, fontSize: 14, color: HUMO, align: 'right', valign: 'middle', margin: 0,
  });
}

function laminaTitulo(pptx: any, img: Imagenes, d: DatosDeck) {
  const s = pptx.addSlide();
  fondo(s, TAUPE);
  // La plantilla lo pone al 33 % de opacidad: a plena tinta tapa la lámina.
  s.addImage({ data: img.tituloFondo, x: -0.085, y: 4.56, w: 13.418, h: 2.997, transparency: 67 });
  s.addText(d.titulo, {
    x: 1.245, y: 1.711, w: 11.423, h: 2.4,
    fontFace: ARIAL, fontSize: tamanoQueCabe(d.titulo, 11.423, 2.4, [66, 54, 44, 36, 30]),
    bold: true, color: HUMO, align: 'center', valign: 'top', margin: 0,
  });
}

function cierre(pptx: any, img: Imagenes) {
  const s = pptx.addSlide();
  fondo(s, NEGRO);
  s.addImage({ data: img.wordmark, x: 0.865, y: 2.286, w: 11.603, h: 1.864 });
}

/** Las tres pastillas de real / esperado / diferencia, que van en dos láminas. */
function pastillasKpi(s: any, real: number, esp: number, xs: number[], y: number, w: number, h: number, sz: number) {
  const dif = parseFloat((real - esp).toFixed(1));
  const trio = [
    { v: `${real.toFixed(1)}%`, c: TAUPE },
    { v: `${esp.toFixed(1)}%`, c: TAUPE2 },
    { v: uno(dif), c: colorDif(dif) },
  ];
  trio.forEach((t, i) => {
    s.addShape('roundRect', {
      x: xs[i], y, w, h, rectRadius: 0.06,
      fill: { color: t.c }, line: { color: NEGRO, width: 0.75 },
    });
    s.addText(t.v, {
      x: xs[i], y, w, h,
      fontFace: ARIAL, fontSize: sz, bold: true, color: HUMO, align: 'center', valign: 'middle', margin: 0,
    });
  });
}

function resumen(pptx: any, img: Imagenes, d: DatosDeck) {
  const s = pptx.addSlide();
  fondo(s, FONDO);
  // Marca de agua: en la plantilla va al 17 %.
  s.addImage({ data: img.resumenA, x: 5.519, y: -0.02, w: 7.814, h: 7.538, transparency: 83 });
  sello(s, img);

  s.addText(d.fecha, {
    x: 8.995, y: 0.02, w: 3.833, h: 0.30,
    fontFace: ARIAL, fontSize: 18, color: MAGENTA, align: 'right', valign: 'middle', margin: 0,
  });
  s.addText('AVANCE GENERAL', {
    x: 9.391, y: 0.36, w: 3.436, h: 0.33,
    fontFace: ARIAL, fontSize: 16, bold: true, color: TAUPE, align: 'center', valign: 'top', margin: 0,
  });
  s.addShape('rect', {
    x: 9.399, y: 0.799, w: 3.436, h: 1.081,
    fill: { color: HUMO }, line: { color: NEGRO, width: 0.75 },
  });
  [['Avance real', 9.547, 0.941], ['Avance esperado', 10.605, 0.953], ['Diferencia', 11.674, 0.953]]
    .forEach(([t, x, w]) => s.addText(t as string, {
      x: x as number, y: 0.9, w: w as number, h: 0.3,
      fontFace: ARIAL, fontSize: 11, bold: true, color: NEGRO, align: 'center', valign: 'top', margin: 0,
    }));
  pastillasKpi(s, d.real, d.esp, [9.535, 10.605, 11.674], 1.228, 0.953, 0.574, 14);

  // ── alertas y bloqueantes ──────────────────────────────────────────────────
  const bloque = (
    titulo: string, icono: string, items: string[], vacio: string,
    yTit: number, yTexto: number, alto: number, xIcono: number, tamIcono: number,
  ) => {
    s.addText(titulo, {
      x: 0.656, y: yTit, w: 3.0, h: 0.42,
      fontFace: ARIAL, fontSize: 20, bold: true, color: MAGENTA, align: 'left', valign: 'middle', margin: 0,
    });
    s.addImage({ data: icono, x: xIcono, y: yTit + 0.1, w: tamIcono, h: tamIcono });
    const texto = items.length
      ? items.map((t, i) => `${i + 1}. ${t}`).join('\n\n')
      : vacio;
    s.addText(texto, {
      x: 0.589, y: yTexto, w: 5.597, h: alto,
      fontFace: ARIAL, fontSize: tamanoQueCabe(texto, 5.597, alto, [12, 11, 10, 9, 8]),
      color: NEGRO, align: 'justify', valign: 'top', margin: 0, lineSpacingMultiple: 1.05,
    });
  };
  bloque('Alertas', img.alerta, d.alertas, 'No se tienen alertas por el momento',
    1.866, 2.33, 2.85, 1.975, 0.185);
  bloque('Bloqueantes', img.bloqueante, d.bloqueantes, 'No se tienen bloqueantes por el momento',
    5.30, 5.78, 1.45, 2.80, 0.231);

  // ── la tabla de entregables ────────────────────────────────────────────────
  const filas = d.resumen.length;
  const altoDisponible = 3.60;                       // de 2,03 a 5,63
  const altoFila = Math.min(0.506, altoDisponible / (filas + 1));
  const szTabla = filas > 9 ? 9 : filas > 7 ? 10 : 11;
  s.addTable(
    [
      [
        { text: 'Entregable/Bloque', options: { bold: true, color: HUMO, fill: { color: TAUPE }, align: 'center' } },
        { text: 'Porcentaje', options: { bold: true, color: HUMO, fill: { color: TAUPE }, align: 'center' } },
      ],
      ...d.resumen.map(r => ([
        { text: r.label, options: { align: 'left' } },
        { text: r.pct, options: { align: 'center' } },
      ])),
    ],
    {
      x: 6.556, y: 2.030, w: 6.272, colW: [4.648, 1.624],
      rowH: altoFila, fontFace: ARIAL, fontSize: szTabla, color: NEGRO,
      valign: 'middle', margin: [0.02, 0.07, 0.02, 0.07],
      border: { type: 'solid', color: GRIS, pt: 0.5 },
      fill: { color: 'FFFFFF' },
    },
  );

  // ── la tabla de responsables ───────────────────────────────────────────────
  const lineas = (t: string) => Math.max(1, t.split('\n').length);
  const altoResp = (t: string) => Math.max(0.36, lineas(t) * 0.22 + 0.12);
  const yResp = Math.min(5.95, 2.030 + (filas + 1) * altoFila + 0.22);
  s.addTable(
    [
      [
        { text: 'Equipo', options: { bold: true, color: HUMO, fill: { color: TAUPE } } },
        { text: 'Responsable', options: { bold: true, color: HUMO, fill: { color: TAUPE } } },
      ],
      [{ text: 'Responsable BBVA' }, { text: d.respBBVA || '—' }],
      [{ text: 'Responsable Timia' }, { text: d.respTimia || '—' }],
    ],
    {
      x: 6.556, y: yResp, w: 6.272, colW: [3.136, 3.136],
      rowH: [0.36, altoResp(d.respBBVA), altoResp(d.respTimia)],
      fontFace: ARIAL, fontSize: 11, color: NEGRO, valign: 'middle',
      margin: [0.02, 0.08, 0.02, 0.08],
      border: { type: 'solid', color: GRIS, pt: 0.5 },
      fill: { color: 'FFFFFF' },
    },
  );
}

function laminaGantt(pptx: any, img: Imagenes, g: NonNullable<DatosDeck['gantt']>, e: EntregableDeck) {
  const s = pptx.addSlide();
  fondo(s, FONDO);
  sello(s, img);

  s.addText(e.titulo, {
    x: 0.79, y: 0.642, w: 8.85, h: 0.6,
    fontFace: ARIAL, fontSize: tamanoQueCabe(e.titulo, 8.85, 0.6, [28, 24, 20, 17]),
    bold: true, color: MAGENTA, align: 'left', valign: 'middle', margin: 0,
  });

  s.addShape('rect', {
    x: 9.74, y: 0.340, w: 3.44, h: 0.834,
    fill: { color: HUMO }, line: { color: NEGRO, width: 0.75 },
  });
  [['Avance real', 9.89, 0.94], ['Avance esperado', 10.94, 0.95], ['Diferencia', 12.01, 0.95]]
    .forEach(([t, x, w]) => s.addText(t as string, {
      x: x as number, y: 0.40, w: w as number, h: 0.33,
      fontFace: ARIAL, fontSize: 11, bold: true, color: NEGRO, align: 'center', valign: 'top', margin: 0,
    }));
  pastillasKpi(s, e.real, e.esp, [9.87, 10.94, 12.01], 0.768, 0.95, 0.329, 14);

  s.addShape('rect', {
    x: 0.07, y: 1.594, w: 3.95, h: 0.670,
    fill: { color: DK1 }, line: { color: DK1, width: 0 },
  });
  s.addText('Actividades / Avance', {
    x: 0.07, y: 1.594, w: 3.95, h: 0.670,
    fontFace: ARIAL, fontSize: 14, bold: true, color: HUMO, align: 'center', valign: 'middle', margin: 0,
  });

  // ── la rejilla de semanas ──────────────────────────────────────────────────
  const n = Math.max(1, e.actividades.length);
  const wSem = ANCHO_REJILLA / Math.max(1, g.semanas);
  const paso = Math.min(PASO, (ABAJO - Y_PRIMERA) / n);
  const altoFila = Math.min(ALTO_FILA, paso - 0.03);
  const altoBarra = Math.min(ALTO_BARRA, paso * 0.23);
  const altoCuerpo = Y_PRIMERA - (Y_TABLA + ALTO_CAB) + n * paso;
  const szCab = Math.max(5, Math.min(8, Math.floor((wSem * 72) / (6.5 * 0.5))));

  for (let k = 0; k < g.semanas; k++) {
    s.addShape('rect', {
      x: X_SEM + k * wSem, y: Y_TABLA, w: wSem, h: ALTO_CAB,
      fill: { color: MAGENTA }, line: { color: 'FFFFFF', width: 0.75 },
    });
    s.addText(etiquetaSemana(g, k), {
      x: X_SEM + k * wSem, y: Y_TABLA, w: wSem, h: ALTO_CAB,
      fontFace: ARIAL, fontSize: szCab, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', margin: 0, lineSpacingMultiple: 1,
    });
  }
  s.addShape('rect', {
    x: X_SEM, y: Y_TABLA + ALTO_CAB, w: wSem * g.semanas, h: altoCuerpo,
    fill: { color: 'FFFFFF' }, line: { color: GRIS, width: 0.75 },
  });
  for (let k = 1; k < g.semanas; k++) {
    s.addShape('line', {
      x: X_SEM + k * wSem, y: Y_TABLA + ALTO_CAB, w: 0, h: altoCuerpo,
      line: { color: GRIS, width: 0.75 },
    });
  }

  // ── una fila por actividad ─────────────────────────────────────────────────
  e.actividades.forEach((a, i) => {
    const y = Y_PRIMERA + i * paso;
    s.addShape('rect', {
      x: X_SEM + 0.01, y, w: wSem * g.semanas - 0.02, h: altoFila,
      fill: { color: HUMO }, line: { color: HUMO, width: 0 },
    });
    s.addShape('roundRect', {
      x: X_NOM, y, w: W_NOM, h: altoFila, rectRadius: 0.05,
      fill: { color: i % 2 === 0 ? TAUPE : NEGRO }, line: { color: NEGRO, width: 0.5 },
    });
    const nIconos = (a.alertas?.length ? 1 : 0) + (a.huboBloqueo ? 1 : 0);
    const anchoNombre = W_NOM - 0.12 - nIconos * 0.2;
    s.addText(a.nombre, {
      x: X_NOM + 0.05, y, w: anchoNombre, h: altoFila,
      fontFace: ARIAL, fontSize: tamanoNombre(a.nombre, anchoNombre, altoFila),
      color: HUMO, align: 'left', valign: 'middle', margin: 0, lineSpacingMultiple: 0.9,
    });
    marcas(s, img, a, y, altoFila);
    s.addShape('roundRect', {
      x: X_PCT, y, w: W_PCT, h: altoFila, rectRadius: 0.05,
      fill: { color: '6AA84F' }, line: { color: NEGRO, width: 0.5 },
    });
    s.addText(`${Math.round(a.pct)}%`, {
      x: X_PCT, y, w: W_PCT, h: altoFila,
      fontFace: ARIAL, fontSize: 8, color: HUMO, align: 'center', valign: 'middle', margin: 0,
    });

    const ini = Math.max(1, Math.min(a.ini, g.semanas));
    const fin = Math.max(ini, Math.min(a.fin, g.semanas));
    const xb = X_SEM + (ini - 1) * wSem;
    const ancho = (fin - ini + 1) * wSem;
    s.addShape('roundRect', {
      x: xb, y: y + paso * 0.12, w: ancho, h: altoBarra, rectRadius: 0.04,
      fill: { color: TURQ }, line: { color: TURQ, width: 0 },
    });
    if (a.pct > 0) {
      s.addShape('roundRect', {
        x: xb, y: y + paso * 0.53, w: Math.max(0.06, (ancho * a.pct) / 100), h: altoBarra, rectRadius: 0.04,
        fill: { color: AZUL }, line: { color: AZUL, width: 0 },
      });
    }
  });

  // ── la línea de hoy ────────────────────────────────────────────────────────
  // Dentro de la semana, según el día hábil: un lunes y un viernes de la misma
  // semana no están en el mismo sitio, y así es como lo pinta la pantalla.
  const dentro = Math.max(0, Math.min(5, g.diaHoy ?? 5)) / 5;
  const xh = X_SEM + Math.max(0, Math.min(g.semanaHoy - 1 + dentro, g.semanas)) * wSem;
  s.addShape('line', {
    x: xh, y: Y_TABLA + ALTO_CAB, w: 0, h: altoCuerpo,
    line: { color: MAGENTA, width: 1.25, dashType: 'dash' },
  });
  s.addText('Hoy', {
    x: xh - 0.3, y: Y_TABLA - 0.26, w: 0.6, h: 0.24,
    fontFace: ARIAL, fontSize: 9, bold: true, color: MAGENTA, align: 'center', valign: 'middle', margin: 0,
  });

  leyenda(s, img);
}

/**
 * El icono de alerta o de bloqueante de una actividad, con los números de las
 * alertas que la afectan en pequeñito justo encima, como en la plantilla: si
 * la bloquean la 1 y la 2, sobre el icono se lee "1 2".
 */
function marcas(s: any, img: Imagenes, a: ActividadDeck, y: number, altoFila: number) {
  const cuales: { data: string; nums: number[] }[] = [];
  if (a.alertas?.length) cuales.push({ data: img.alerta, nums: a.alertas });
  if (a.huboBloqueo) cuales.push({ data: img.bloqueante, nums: a.bloqueantes ?? [] });
  if (!cuales.length) return;

  // Con filas apretadas no cabe el número encima: queda solo el icono, centrado.
  const conNumero = altoFila >= 0.26;
  const tam = Math.min(W_ICO, conNumero ? altoFila - 0.11 : altoFila - 0.06);
  const yIcono = conNumero ? y + altoFila - tam - 0.02 : y + (altoFila - tam) / 2;
  let x = X_ICO + (cuales.length === 1 ? 0.19 : 0);
  for (const c of cuales) {
    s.addImage({ data: c.data, x, y: yIcono, w: tam, h: tam });
    if (conNumero && c.nums.length) {
      s.addText(c.nums.join(' '), {
        x: x - 0.09, y: y + 0.005, w: tam + 0.18, h: yIcono - y - 0.01,
        fontFace: ARIAL, fontSize: 6, bold: true, color: HUMO,
        align: 'center', valign: 'bottom', margin: 0,
      });
    }
    x += 0.19;
  }
}

function leyenda(s: any, img: Imagenes) {
  const x = 0.17, y = 6.78, w = 4.28, h = 0.52;
  s.addText('Leyenda', {
    x, y: y - 0.22, w: 1, h: 0.2,
    fontFace: ARIAL, fontSize: 9, bold: true, color: MAGENTA, align: 'left', valign: 'middle', margin: 0,
  });
  s.addShape('rect', { x, y, w, h, fill: { color: 'FFFEFE' }, line: { color: GRIS, width: 0.75 } });
  const fila = (yy: number, color: string, texto: string) => {
    s.addShape('roundRect', { x: x + 0.12, y: yy + 0.055, w: 0.62, h: 0.055, rectRadius: 0.03, fill: { color }, line: { color, width: 0 } });
    s.addText(texto, { x: x + 0.82, y: yy, w: 1.1, h: 0.17, fontFace: ARIAL, fontSize: 8, color: NEGRO, align: 'left', valign: 'middle', margin: 0 });
  };
  fila(y + 0.06, TURQ, 'Planificado');
  fila(y + 0.27, AZUL, 'Ejecutado');
  const iconoFila = (yy: number, data: string, texto: string) => {
    s.addImage({ data, x: x + 2.15, y: yy + 0.015, w: 0.14, h: 0.14 });
    s.addText(texto, { x: x + 2.38, y: yy, w: 1.2, h: 0.17, fontFace: ARIAL, fontSize: 8, color: NEGRO, align: 'left', valign: 'middle', margin: 0 });
  };
  iconoFila(y + 0.06, img.alerta, 'Alertas');
  iconoFila(y + 0.27, img.bloqueante, 'Bloqueantes');
}
