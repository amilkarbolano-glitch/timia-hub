/**
 * Markdown mínimo para las notas.
 *
 * Por qué a mano y no `marked` + `DOMPurify`: pintar markdown de otra persona
 * sin sanear es XSS, y la forma barata de sanear no es filtrar HTML después
 * sino **no dejar entrar HTML nunca**. Aquí se escapa todo primero y solo
 * después se aplican las reglas, así que no hay camino por el que una etiqueta
 * del usuario llegue al DOM. De paso, el front no gana dos dependencias.
 *
 * Soporta: títulos, negrita, cursiva, código en línea y en bloque, enlaces
 * (solo http y https), imágenes del propio API, listas, casillas, citas y
 * líneas. No soporta tablas ni HTML embebido; si hacen falta tablas, se
 * añaden aquí.
 */

function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Solo http y https: un `javascript:` en un enlace es ejecución de código. */
function urlSegura(u: string): string | null {
  const limpio = u.trim();
  return /^https?:\/\/[^\s<>"]+$/i.test(limpio) ? limpio : null;
}

/**
 * Para las imágenes solo se admite la ruta del propio API, direccionada por
 * SHA. Permitir cualquier URL externa convertiría una nota compartida en un
 * rastreador: quien la abre pediría una imagen a un servidor ajeno y le
 * entregaría su IP y el momento en que la leyó.
 */
function urlDeImagen(u: string): string | null {
  const limpio = u.trim();
  return /^\/api\/notas\/imagenes\/[0-9a-f]{64}$/.test(limpio) ? limpio : null;
}

function enLinea(texto: string, baseApi: string): string {
  let t = escapar(texto);
  // El código en línea va primero: lo que hay dentro no se vuelve a formatear.
  const codigos: string[] = [];
  t = t.replace(/`([^`]+)`/g, (_m, c) => {
    codigos.push(c);
    return `\u0000${codigos.length - 1}\u0000`;
  });
  // Las imágenes van antes que los enlaces: `![pie](url)` contiene un enlace.
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt0: string, url: string) => {
    const ok = urlDeImagen(url);
    if (!ok) return m;
    // El ancho viaja al final del pie: `![pie|540](ruta)`. Solo dígitos, y
    // acotado, para que un ancho inventado no deforme la nota.
    const conAncho = /^(.*)\|(\d{2,4})$/.exec(alt0);
    const pie = conAncho ? conAncho[1] : alt0;
    const n = conAncho ? Math.min(2000, Math.max(80, Number(conAncho[2]))) : 0;
    const sha = ok.slice(ok.lastIndexOf('/') + 1);
    const alt = pie || 'Imagen de la nota';
    const estilo = n ? `width:${n}px;max-width:100%` : 'max-width:100%';
    // La nota guarda solo la ruta; la base del API se pone al pintar. Así una
    // nota no se rompe el día que el API cambie de dominio.
    return `<figure class="md-img"><img src="${baseApi}${ok}" alt="${alt}" loading="lazy"`
      + ` data-sha="${sha}"${n ? ` data-ancho="${n}"` : ''} style="${estilo}">`
      + (pie ? `<figcaption>${pie}</figcaption>` : '') + '</figure>';
  });
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
    const ok = urlSegura(url);
    return ok ? `<a href="${ok}" target="_blank" rel="noopener noreferrer">${txt}</a>` : m;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  t = t.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${codigos[Number(i)]}</code>`);
  return t;
}

export function markdownAHtml(src: string, baseApi = ''): string {
  const lineas = (src ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let lista: 'ul' | 'ol' | null = null;
  let enCodigo = false;
  let codigo: string[] = [];

  const cerrarLista = () => { if (lista) { out.push(`</${lista}>`); lista = null; } };

  for (const linea of lineas) {
    if (/^```/.test(linea.trim())) {
      if (enCodigo) { out.push(`<pre><code>${escapar(codigo.join('\n'))}</code></pre>`); codigo = []; enCodigo = false; }
      else { cerrarLista(); enCodigo = true; }
      continue;
    }
    if (enCodigo) { codigo.push(linea); continue; }

    if (!linea.trim()) { cerrarLista(); continue; }

    const titulo = /^(#{1,4})\s+(.*)$/.exec(linea);
    if (titulo) {
      cerrarLista();
      const n = Math.min(titulo[1].length + 1, 5);   // # → h2, para no competir con el título de la nota
      out.push(`<h${n}>${enLinea(titulo[2], baseApi)}</h${n}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(linea.trim())) { cerrarLista(); out.push('<hr>'); continue; }

    const cita = /^>\s?(.*)$/.exec(linea);
    if (cita) { cerrarLista(); out.push(`<blockquote>${enLinea(cita[1], baseApi)}</blockquote>`); continue; }

    const tarea = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(linea);
    if (tarea) {
      if (lista !== 'ul') { cerrarLista(); out.push('<ul class="md-tareas">'); lista = 'ul'; }
      const hecha = tarea[1].toLowerCase() === 'x';
      out.push(`<li class="${hecha ? 'md-hecha' : ''}"><input type="checkbox" disabled${hecha ? ' checked' : ''}> ${enLinea(tarea[2], baseApi)}</li>`);
      continue;
    }

    const punto = /^\s*[-*]\s+(.*)$/.exec(linea);
    if (punto) {
      if (lista !== 'ul') { cerrarLista(); out.push('<ul>'); lista = 'ul'; }
      out.push(`<li>${enLinea(punto[1], baseApi)}</li>`);
      continue;
    }

    const num = /^\s*\d+[.)]\s+(.*)$/.exec(linea);
    if (num) {
      if (lista !== 'ol') { cerrarLista(); out.push('<ol>'); lista = 'ol'; }
      out.push(`<li>${enLinea(num[1], baseApi)}</li>`);
      continue;
    }

    cerrarLista();
    // Una imagen sola en su línea va fuera del párrafo: <figure> dentro de <p>
    // es HTML inválido y el navegador cierra el <p> por su cuenta.
    if (/^!\[[^\]]*\]\([^)\s]+\)$/.test(linea.trim())) { out.push(enLinea(linea.trim(), baseApi)); continue; }
    out.push(`<p>${enLinea(linea, baseApi)}</p>`);
  }

  if (enCodigo && codigo.length) out.push(`<pre><code>${escapar(codigo.join('\n'))}</code></pre>`);
  cerrarLista();
  return out.join('\n');
}

/** Primeras palabras del cuerpo, sin marcas, para la lista de notas. */
export function resumenDeNota(src: string, max = 90): string {
  const plano = (src ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/[*_`>~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+\[[ xX]\]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plano.length > max ? `${plano.slice(0, max)}…` : plano;
}
