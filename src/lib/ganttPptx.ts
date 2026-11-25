// ─── Construir las láminas de Gantt sobre la plantilla ───────────────────────
// Las láminas de Gantt de la plantilla no son rellenables: cada una está
// dibujada a mano con las filas de su entregable —nombre, porcentaje y barras
// puestos uno a uno en su coordenada—. Así que no se rellenan, se construyen:
// se toman las formas de la lámina como modelo, se borran las filas que traía y
// se dibujan las del plan.
//
// Todo esto es cirugía sobre el XML de la lámina. Se trabaja con texto y no con
// un DOM porque el navegador no trae uno para OOXML y traerse uno entero por
// esto no compensa.
const P = 914400;                       // EMU por pulgada
const X_NOM = 0.08, W_NOM = 3.44, X_PCT = 3.55, W_PCT = 0.47;
const X_SEM = 4.45, W_SEM = 0.631;
const PASO = 0.3725, H_FILA = 0.33, H_BARRA = 0.085;
const EJECUTADO = '335997';   // el azul de "Ejecutado" en la leyenda

const emu = (pulgadas: number) => Math.round(pulgadas * P);
const aPulg = (v: string) => parseInt(v, 10) / P;

export interface ActividadGantt { nombre: string; pct: number; ini: number; fin: number }
export interface EntregableGantt {
  titulo: string;
  real: number;
  esp: number;
  actividades: ActividadGantt[];
}

/** Los hijos directos del árbol de formas, con su posición en el texto. */
function hijos(xml: string, desde: number, hasta: number): { ini: number; fin: number; tag: string }[] {
  const tags = ['p:sp', 'p:pic', 'p:graphicFrame', 'p:cxnSp', 'p:grpSp'];
  // Ojo con buscar "<p:sp" a secas: también casa con "<p:spPr" y "<p:spTree",
  // y entonces la cuenta de anidamiento se va al garete. Hace falta que detrás
  // venga un espacio o el cierre del tag.
  const abreDe = (t: string) => new RegExp(`<${t.replace(':', ':')}(?=[\\s/>])`, 'g');
  const out: { ini: number; fin: number; tag: string }[] = [];
  let i = desde;
  while (i < hasta) {
    let sig: { t: string; p: number } | null = null;
    for (const t of tags) {
      const re = abreDe(t); re.lastIndex = i;
      const m = re.exec(xml);
      if (m && m.index < hasta && (!sig || m.index < sig.p)) sig = { t, p: m.index };
    }
    if (!sig) break;
    const abre = abreDe(sig.t), cierra = new RegExp(`</${sig.t}>`, 'g');
    let prof = 0, j = sig.p;
    while (j < hasta) {
      abre.lastIndex = j; cierra.lastIndex = j;
      const ma = abre.exec(xml), mc = cierra.exec(xml);
      if (!mc) break;
      if (ma && ma.index < mc.index) { prof++; j = ma.index + ma[0].length; }
      else { prof--; j = mc.index + mc[0].length; if (prof === 0) break; }
    }
    out.push({ ini: sig.p, fin: j, tag: sig.t });
    i = j;
  }
  return out;
}

const leer = (bloque: string, attr: string): number => {
  const m = new RegExp(`<a:(?:off|ext)\\b[^>]*\\b${attr}="(-?\\d+)"`).exec(bloque);
  return m ? aPulg(m[1]) : NaN;
};
const geo = (b: string) => ({ x: leer(b, 'x'), y: leer(b, 'y'), w: leer(b, 'cx'), h: leer(b, 'cy') });

/** Mueve y redimensiona una forma. */
function situar(b: string, x?: number, y?: number, w?: number, h?: number): string {
  let out = b;
  if (x !== undefined) out = out.replace(/(<a:off\b[^>]*\bx=")-?\d+(")/, `$1${emu(x)}$2`);
  if (y !== undefined) out = out.replace(/(<a:off\b[^>]*\by=")-?\d+(")/, `$1${emu(y)}$2`);
  if (w !== undefined) out = out.replace(/(<a:ext\b[^>]*\bcx=")\d+(")/, `$1${emu(w)}$2`);
  if (h !== undefined) out = out.replace(/(<a:ext\b[^>]*\bcy=")\d+(")/, `$1${emu(h)}$2`);
  return out;
}

/** El relleno de una forma, sin contar el color de su borde. */
function relleno(b: string): string {
  const pr = /<p:spPr\b[^>]*>[\s\S]*?<\/p:spPr>/.exec(b)?.[0] ?? '';
  const sinLinea = pr.replace(/<a:ln\b[\s\S]*?<\/a:ln>/g, '');
  return /<a:solidFill>[\s\S]*?<\/a:solidFill>/.exec(sinLinea)?.[0] ?? '';
}

/** Relleno sólido, quitando el que tuviera. */
function conRelleno(b: string, hex: string): string {
  const nuevo = `<a:solidFill><a:srgbClr val="${hex}"/></a:solidFill>`;
  const pr = /<p:spPr\b[^>]*>/.exec(b);
  if (!pr) return b;
  const ini = b.indexOf(pr[0]) + pr[0].length;
  const fin = b.indexOf('</p:spPr>');
  if (fin < 0) return b;
  let cuerpo = b.slice(ini, fin);
  const sinLinea = cuerpo.replace(/<a:ln\b[\s\S]*?<\/a:ln>/g, m => '\u0000'.repeat(m.length));
  const fill = /<a:(?:solid|gradi|patt|blip|no)Fill(?:\/>|[\s\S]*?<\/a:(?:solid|gradi|patt|blip|no)Fill>)/.exec(sinLinea);
  cuerpo = fill
    ? cuerpo.slice(0, fill.index) + nuevo + cuerpo.slice(fill.index + fill[0].length)
    : nuevo + cuerpo;
  return b.slice(0, ini) + cuerpo + b.slice(fin);
}

/** Todo el texto de una forma. Un valor como "61.7%" puede venir partido en
 *  varias ejecuciones, y leer solo la primera devuelve "61". */
const textoDe = (b: string) =>
  [...b.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join('').trim();

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Deja un solo texto en la forma, conservando el formato del primero. */
function conTexto(b: string, t: string): string {
  let primero = true;
  let out = b.replace(/<a:t>(?:(?!<\/a:t>)[\s\S])*?<\/a:t>/g, () => {
    if (primero) { primero = false; return `<a:t>${escapar(t)}</a:t>`; }
    return '<a:t></a:t>';
  });
  if (primero) out = b;                 // sin texto que sustituir
  return out;
}

/** Quita la viñeta automática del párrafo: el diseño numera solo y, si no se
 *  quita, el título sale con dos numerales. */
function sinVineta(b: string): string {
  let out = b.replace(/<a:bu(?:AutoNum|Char|Font|Clr|SzPct|SzPts|None)\b[^>]*\/>/g, '');
  out = out.replace(/<a:pPr\b([^>]*)\/>/g, '<a:pPr$1><a:buNone/></a:pPr>');
  out = out.replace(/(<a:pPr\b[^>]*>)(?!<a:buNone)/g, '$1<a:buNone/>');
  return out;
}

function etiquetaSemana(inicio: Date, k: number): string[] {
  const d0 = new Date(inicio.getTime() + k * 7 * 86400000);
  const d1 = new Date(d0.getTime() + 6 * 86400000);
  const dd = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return [`S${k + 1}`, `${dd(d0)}-`, dd(d1)];
}

/** Parte una etiqueta de la plantilla en sus líneas: "S3 15/09-21/09". */
function dividirEtiqueta(t: string): string[] {
  const m = /^(\S+)\s+(\S+?-)(\S+)$/.exec(t.replace(/\s+/g, ' ').trim());
  if (m) return [m[1], m[2], m[3]];
  const i = t.indexOf(' ');
  return i < 0 ? [t] : [t.slice(0, i), t.slice(i + 1).trim()];
}

/**
 * Pone cada línea en su propio párrafo, sin dejar que el texto se parta solo. Es lo que mantiene la cabecera a la altura que dice su XML: si la
 * etiqueta se parte sola, la fila crece al abrir el archivo, el cuerpo de la
 * tabla baja y las barras dejan de coincidir con sus filas.
 */
function conLineas(celda: string, lineas: string[]): string {
  const parrafos = [...celda.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)].map(m => m[0]);
  if (!parrafos.length || !lineas.length) return conTexto(celda, lineas.join(' '));
  const base = parrafos[0];
  const ini = celda.indexOf(base);
  const ultimo = parrafos[parrafos.length - 1];
  const fin = celda.lastIndexOf(ultimo) + ultimo.length;
  return celda.slice(0, ini) + lineas.map(l => conTexto(base, l)).join('') + celda.slice(fin);
}

/**
 * Pone el nombre de una actividad en su pastilla con un tamaño que quepa.
 *
 * La pastilla mide 3,44 × 0,33" y la plantilla trae 9 pt con 0,1" de margen por
 * lado: a esa altura solo cabe una línea de 9 pt, así que un nombre largo se
 * partía en dos y la segunda se salía por debajo. Aquí se recortan los márgenes
 * y se baja el tamaño hasta que el nombre entre, en una línea o en dos.
 */
function conNombre(forma: string, texto: string, ancho: number, alto: number): string {
  const INSET = 0.04;
  const utilW = (ancho - 2 * INSET) * 72;
  const utilH = (alto - 2 * INSET) * 72;
  let sz = 700;
  for (const s of [900, 800, 700]) {
    const porLinea = Math.max(8, Math.floor(utilW / ((s / 100) * 0.52)));
    const caben = Math.max(1, Math.floor(utilH / ((s / 100) * 1.2)));
    if (texto.length <= porLinea * caben) { sz = s; break; }
  }
  const ins = Math.round(INSET * P);
  return conTexto(forma, texto)
    .replace(/sz="\d+"/g, `sz="${sz}"`)
    .replace(/<a:bodyPr\b([^>]*?)(\/?)>/g, (_m, at: string, cierre: string) =>
      `<a:bodyPr${at.replace(/\s*[tblr]Ins="-?\d+"/g, '')} tIns="${ins}" bIns="${ins}" lIns="${ins}" rIns="${ins}"${cierre}>`);
}

/**
 * Reescribe la lámina de Gantt con los datos de un entregable.
 * Devuelve el XML completo de la lámina.
 */
export function construirGantt(
  xml: string,
  ent: EntregableGantt,
  semanas: number,
  semanaHoy: number,
  inicio?: Date,
): string {
  const ini = xml.indexOf('<p:spTree>');
  const fin = xml.indexOf('</p:spTree>');
  if (ini < 0 || fin < 0) return xml;
  const desde = ini + '<p:spTree>'.length;
  const partes = hijos(xml, desde, fin).map(h => ({ ...h, txt: xml.slice(h.ini, h.fin) }));

  const clase = (b: string, tag: string): string => {
    const { x, y, w, h } = geo(b);
    if (tag === 'p:graphicFrame') return 'tabla';
    if (isNaN(y) || y < 1.5) return 'cabecera';
    // La plantilla dibuja dos barras por actividad: la planificada (turquesa,
    // arriba) y la ejecutada (azul, justo debajo). Se clonan tal cual para que
    // el color sea exactamente el del diseño y no uno parecido.
    if (Math.abs(h - 0.08) < 0.03 && x >= 4.3) return /335997/i.test(b) ? 'barraEjec' : 'barraPlan';
    if (Math.abs(h - H_FILA) < 0.02 && w > 8) return 'banda';
    if (Math.abs(x - X_NOM) < 0.05 && Math.abs(w - W_NOM) < 0.2) return 'nombre';
    if (Math.abs(x - X_PCT) < 0.05) return 'pct';
    if (tag === 'p:pic') return 'icono';
    if (x > 3.0 && x < 4.3) return 'marca';
    if (tag === 'p:cxnSp') return 'lineaHoy';
    if (textoDe(b) === 'Hoy') return 'txtHoy';
    return 'otro';
  };
  const conClase = partes.map(p => ({ ...p, cls: clase(p.txt, p.tag) }));
  const modelo = (c: string) => conClase.find(p => p.cls === c)?.txt;
  const mNombre = modelo('nombre'), mPct = modelo('pct');
  const mPlan = modelo('barraPlan');
  if (!mNombre || !mPct || !mPlan) return xml;     // lámina que no es de Gantt
  // No todas las láminas de la plantilla traen barra de ejecutado dibujada: si
  // falta, se clona la planificada con el azul del diseño.
  const mEjec = modelo('barraEjec') ?? conRelleno(mPlan, EJECUTADO);
  // Las pastillas de nombre alternan dos tonos en la plantilla: se guardan los
  // dos primeros distintos para repetir esa alternancia.
  const nombres = conClase.filter(p => p.cls === 'nombre').map(p => p.txt);
  const mNombre2 = nombres.find(b => relleno(b) !== relleno(mNombre)) ?? mNombre;

  // ── la tabla de semanas ──
  // La plantilla está dibujada para el plan del que se sacó: doce semanas y
  // cuatro actividades. Con un plan más largo la tabla se salía por la derecha
  // y con más actividades se comía la leyenda, así que el ancho de semana y el
  // alto de fila se calculan para que todo quepa en el hueco de la plantilla.
  const ABAJO = 6.78;
  let tabla = conClase.find(p => p.cls === 'tabla')?.txt ?? '';
  let y0 = 2.27, altoCab = 0.666, yTabla = 1.604;
  let paso = PASO, hFila = H_FILA, hBarra = H_BARRA, wSem = W_SEM, xSem = X_SEM;
  const nAct = Math.max(1, ent.actividades.length);
  if (tabla) {
    const g = geo(tabla);
    yTabla = g.y;
    if (!isNaN(g.x)) xSem = g.x;
    const filas = [...tabla.matchAll(/<a:tr\b[^>]*>[\s\S]*?<\/a:tr>/g)].map(m => m[0]);
    if (filas.length >= 2) {
      const cab = filas[0], patron = filas[1];
      altoCab = aPulg(/<a:tr\b[^>]*\bh="(\d+)"/.exec(cab)?.[1] ?? '609600');
      let cabNueva = cab;
      // columnas: las del plan, clonando o quitando la última
      const grid = /<a:tblGrid>[\s\S]*?<\/a:tblGrid>/.exec(tabla)?.[0] ?? '';
      let cols = [...grid.matchAll(/<a:gridCol\b[^>]*(?:\/>|>[\s\S]*?<\/a:gridCol>)/g)].map(m => m[0]);
      const celdasDe = (tr: string) => [...tr.matchAll(/<a:tc\b[^>]*>[\s\S]*?<\/a:tc>/g)].map(m => m[0]);
      const ajustaCeldas = (tr: string) => {
        let cs = celdasDe(tr);
        while (cs.length > semanas) cs.pop();
        while (cs.length < semanas) cs.push(cs[cs.length - 1]);
        const antes = tr.slice(0, tr.indexOf('<a:tc'));
        const despues = tr.slice(tr.lastIndexOf('</a:tc>') + '</a:tc>'.length);
        return antes + cs.join('') + despues;
      };
      // El ancho total es el de la plantilla: se reparte entre las semanas que
      // tenga el plan en vez de clonar columnas, que es lo que desbordaba.
      const anchoTotal = cols.reduce((s2, c) => s2 + parseInt(/w="(\d+)"/.exec(c)?.[1] ?? '0', 10), 0) / P;
      wSem = anchoTotal / Math.max(1, semanas);
      paso = Math.min(PASO, (ABAJO - (yTabla + altoCab)) / nAct);
      hFila = Math.max(0.16, Math.min(H_FILA, paso - 0.035));
      hBarra = Math.min(H_BARRA, paso * 0.26);
      while (cols.length > semanas) cols.pop();
      while (cols.length < semanas) cols.push(cols[cols.length - 1]);
      cols = cols.map(c => c.replace(/(w=")\d+(")/, `$1${emu(wSem)}$2`));
      const gridNuevo = `<a:tblGrid>${cols.join('')}</a:tblGrid>`;
      cabNueva = ajustaCeldas(cabNueva);
      let k = 0;
      cabNueva = cabNueva
        .replace(/\s(?:rowSpan|gridSpan|vMerge|hMerge)="[^"]*"/g, '')
        .replace(/<a:tc\b[^>]*>[\s\S]*?<\/a:tc>/g, tc => {
          const lineas = inicio ? etiquetaSemana(inicio, k) : dividirEtiqueta(textoDe(tc));
          k++;
          return conLineas(tc, lineas);
        });
      // Sin márgenes a los lados cabe la fecha entera en una línea, y centrada
      // la cabecera se ve igual aunque ocupe menos de lo que mide la fila.
      // Tres líneas —"S1", "13/10-", "19/10"— como en la plantilla. El tamaño
      // es el mayor que cabe a lo ancho de la columna y a lo alto de la fila,
      // para que no se parta solo y la cabecera no crezca.
      const porAncho = (wSem * 72) / (6.5 * 0.534);
      const porAlto = ((altoCab - 0.2) * 72) / (3 * 1.2);
      const szCab = Math.max(500, Math.min(800, Math.floor(Math.min(porAncho, porAlto) * 2) * 50));
      cabNueva = cabNueva
        .replace(/sz="\d+"/g, `sz="${szCab}"`)
        .replace(/<a:tcPr\b([^>]*?)(\/?)>/g, (_m, at: string, cierre: string) =>
          `<a:tcPr${at.replace(/\s*mar[LR]="-?\d+"/g, '').replace(/\s*anchor="[^"]*"/g, '')} marL="0" marR="0" anchor="ctr"${cierre}>`)
        .replace(/(<a:tr\b[^>]*\bh=")\d+(")/, `$1${emu(altoCab)}$2`);
      // El cuerpo es UNA sola fila tan alta como todas las actividades juntas.
      // En la plantilla son ocho filas combinadas en vertical, que es lo que le
      // da el aspecto de rejilla con rayas solo verticales. Clonar la fila con
      // su rowSpan dejaba la tabla mal formada —cada copia decía abarcar ocho
      // filas que no existían— y a partir de nueve filas el documento se abría
      // con la tabla tirada a la esquina de la lámina.
      const n = ent.actividades.length;
      const nuevas = ajustaCeldas(patron)
        .replace(/(<a:tr\b[^>]*\bh=")\d+(")/, `$1${emu(n * paso)}$2`)
        .replace(/\s(?:rowSpan|gridSpan|vMerge|hMerge)="[^"]*"/g, '')
        .replace(/<a:tcPr\b([^>]*?)(\/?)>/g, (_m, at: string, cierre: string) =>
          `<a:tcPr${at.replace(/\s*mar[TBLR]="\d+"/g, '')} marT="0" marB="0" marL="0" marR="0"${cierre}>`)
        .replace(/sz="\d+"/g, 'sz="100"');
      const tbl = /<a:tbl>[\s\S]*<\/a:tbl>/.exec(tabla)?.[0] ?? '';
      const props = /<a:tblPr\b[^>]*(?:\/>|>[\s\S]*?<\/a:tblPr>)/.exec(tbl)?.[0] ?? '';
      const tblNueva = `<a:tbl>${props}${gridNuevo}${cabNueva}${nuevas}</a:tbl>`;
      tabla = tabla.replace(tbl, tblNueva);
      tabla = situar(tabla, undefined, undefined, wSem * semanas, altoCab + n * paso);
      y0 = yTabla + altoCab;
    }
  }

  // ── las filas ──
  const dibujadas: string[] = [];
  ent.actividades.forEach((a, i) => {
    const y = y0 + i * paso;
    const yc = y + (paso - hFila) / 2;
    const chapa = i % 2 === 0 ? mNombre : mNombre2;
    dibujadas.push(situar(conNombre(chapa, a.nombre, W_NOM, hFila), X_NOM, yc, W_NOM, hFila));
    // La pastilla del porcentaje mide 0,47" y la plantilla le pone 0,1" de
    // margen a cada lado: "100%" no cabía y se partía en dos líneas.
    dibujadas.push(situar(conNombre(mPct, `${Math.round(a.pct)}%`, W_PCT, hFila), X_PCT, yc, W_PCT, hFila));
    // Dos barras, como en la plantilla: la planificada arriba y la ejecutada
    // justo debajo, no una encima de otra.
    const xb = xSem + (a.ini - 1) * wSem;
    const ancho = Math.max(a.fin - a.ini + 1, 1) * wSem;
    dibujadas.push(situar(mPlan, xb, y + paso * 0.16, ancho, hBarra));
    if (a.pct > 0) {
      dibujadas.push(situar(mEjec, xb, y + paso * 0.57, Math.max(0.06, (ancho * a.pct) / 100), hBarra));
    }
  });

  // ── cabecera e hilo de Hoy ──
  const dif = ent.real - ent.esp;
  const n = ent.actividades.length;
  const xh = xSem + (semanaHoy - 1) * wSem;
  const quitar = new Set(['nombre', 'pct', 'barraPlan', 'barraEjec', 'banda', 'icono', 'marca']);
  const salida: string[] = [];
  for (const p of conClase) {
    if (quitar.has(p.cls)) continue;
    let b = p.txt;
    if (p.cls === 'tabla') { salida.push(tabla || b); continue; }
    if (p.cls === 'lineaHoy') { salida.push(situar(b, xh, y0, undefined, n * paso)); continue; }
    if (p.cls === 'txtHoy') { salida.push(situar(b, xh - 0.22, yTabla - 0.32)); continue; }
    if (p.cls === 'cabecera') {
      const t = textoDe(b);
      if (/^Avance acumulado/.test(t)) continue;      // se montaba sobre los indicadores
      if (/^\d+\.\d%$/.test(t) || /^-?\d+\.\d%$/.test(t)) {
        const g = geo(b);
        if (g.x < 10.4) b = conTexto(b, `${ent.real.toFixed(1)}%`);
        else if (g.x < 11.5) b = conTexto(b, `${ent.esp.toFixed(1)}%`);
        else b = conTexto(b, `${dif >= 0 ? '+' : ''}${dif.toFixed(1)}%`);
      } else if (t && geo(b).y < 1.1 && geo(b).x < 4 && geo(b).w > 6) {
        b = sinVineta(conTexto(b, ent.titulo));
      }
      salida.push(b); continue;
    }
    salida.push(b);
  }
  salida.push(...dibujadas);
  return xml.slice(0, desde) + salida.join('') + xml.slice(fin);
}
