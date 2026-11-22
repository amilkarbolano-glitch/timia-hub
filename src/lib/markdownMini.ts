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
 * (solo http y https), listas, casillas, citas y líneas. No soporta tablas ni
 * HTML embebido; si hacen falta tablas, se añaden aquí.
 */

function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Solo http y https: un `javascript:` en un enlace es ejecución de código. */
function urlSegura(u: string): string | null {
  const limpio = u.trim();
  return /^https?:\/\/[^\s<>"]+$/i.test(limpio) ? limpio : null;
}

function enLinea(texto: string): string {
  let t = escapar(texto);
  // El código en línea va primero: lo que hay dentro no se vuelve a formatear.
  const codigos: string[] = [];
  t = t.replace(/`([^`]+)`/g, (_m, c) => {
    codigos.push(c);
    return `\u0000${codigos.length - 1}\u0000`;
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

export function markdownAHtml(src: string): string {
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
      out.push(`<h${n}>${enLinea(titulo[2])}</h${n}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(linea.trim())) { cerrarLista(); out.push('<hr>'); continue; }

    const cita = /^>\s?(.*)$/.exec(linea);
    if (cita) { cerrarLista(); out.push(`<blockquote>${enLinea(cita[1])}</blockquote>`); continue; }

    const tarea = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(linea);
    if (tarea) {
      if (lista !== 'ul') { cerrarLista(); out.push('<ul class="md-tareas">'); lista = 'ul'; }
      const hecha = tarea[1].toLowerCase() === 'x';
      out.push(`<li class="${hecha ? 'md-hecha' : ''}"><input type="checkbox" disabled${hecha ? ' checked' : ''}> ${enLinea(tarea[2])}</li>`);
      continue;
    }

    const punto = /^\s*[-*]\s+(.*)$/.exec(linea);
    if (punto) {
      if (lista !== 'ul') { cerrarLista(); out.push('<ul>'); lista = 'ul'; }
      out.push(`<li>${enLinea(punto[1])}</li>`);
      continue;
    }

    const num = /^\s*\d+[.)]\s+(.*)$/.exec(linea);
    if (num) {
      if (lista !== 'ol') { cerrarLista(); out.push('<ol>'); lista = 'ol'; }
      out.push(`<li>${enLinea(num[1])}</li>`);
      continue;
    }

    cerrarLista();
    out.push(`<p>${enLinea(linea)}</p>`);
  }

  if (enCodigo && codigo.length) out.push(`<pre><code>${escapar(codigo.join('\n'))}</code></pre>`);
  cerrarLista();
  return out.join('\n');
}

/** Primeras palabras del cuerpo, sin marcas, para la lista de notas. */
export function resumenDeNota(src: string, max = 90): string {
  const plano = (src ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/[*_`>~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+\[[ xX]\]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plano.length > max ? `${plano.slice(0, max)}…` : plano;
}
