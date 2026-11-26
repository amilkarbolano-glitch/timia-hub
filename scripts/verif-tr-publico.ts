// La vista pública de TR: lo que importa es que sea pública de verdad y que
// no se convierta en una puerta por la que entre cualquiera.

import { readFileSync } from 'node:fs';

let f = 0;
const ok = (c: boolean, s: string) => { if (!c) f++; console.log(`${c ? '✓' : '✗'} ${s}`); };

const app  = readFileSync('src/App.tsx', 'utf8');
const vist = readFileSync('src/components/TrPublico.tsx', 'utf8');
const api  = readFileSync('../timia-hub-api/app/routers/tr.py', 'utf8');

console.log('── La ruta se resuelve antes del login ──');
const iPublica = app.indexOf('const Publica = rutaPublica()');
const iAuth    = app.indexOf('<AuthProvider>');
ok(iPublica > 0 && iPublica < iAuth,
   'rutaPublica() se evalúa antes de montar AuthProvider: no pasa por el login');
ok(app.includes("'/tr': TrPublico"), 'la ruta /tr está registrada');
ok(/RUTAS_PUBLICAS[^}]*}/s.test(app) && (app.match(/':\s*\w+,/g) ?? []).length <= 2,
   'y es la única ruta pública: la lista no creció sin querer');
ok(app.includes('BASE_URL'), 'respeta el prefijo de GitHub Pages (/timia-hub)');

console.log('\n── El correo se confirma contra el equipo ──');
ok(vist.includes('/api/tr/persona'), 'la vista consulta si el correo existe');
ok(vist.includes('!!persona'), 'y no deja enviar hasta que lo confirme');
ok(api.includes('find_user_by_email'), 'el servidor también lo valida: no basta con el front');
ok(api.includes('status_code=403'), 'y rechaza con 403 a quien no esté en el equipo');

console.log('\n── Límites del endpoint abierto ──');
ok(api.includes('MAX_BYTES_IMAGEN') && api.includes('6 * 1024 * 1024'), 'tope de 6 MB por imagen');
ok(api.includes('MAX_IMAGENES') && api.includes('= 10'), 'tope de 10 capturas por envío');
ok(api.includes('rate_limit'), 'hay límite de peticiones por IP');
ok(api.includes('data:image/'), 'solo acepta imágenes');

console.log('\n── La URL del Apps Script no sale al navegador ──');
ok(!vist.includes('script.google.com') && !app.includes('script.google.com'),
   'el front no conoce la URL del lector');
ok(api.includes('settings.TR_SCRIPT_URL'), 'vive en el servidor, en una variable de entorno');
ok(api.includes('SIN_CONFIGURAR'),
   'y mientras no esté configurada lo dice en vez de fallar en silencio');

console.log('\n── Las imágenes no se guardan en la base ──');
const bloqueRegistro = api.slice(api.indexOf('registro = {'), api.indexOf('return {"ok": True'));
ok(!bloqueRegistro.includes('contenido'), 'el registro guarda nombres y lectura, no los bytes');

console.log('\n── Una captura por petición: el minuto de CloudFront ──');
ok(vist.includes('EN_VUELO'), 'el navegador parte la carga en varias peticiones');
ok(/capturas:\s*\[\{ nombre: c\.nombre/.test(vist),
   'y cada petición lleva una sola captura, no el lote entero');
ok(vist.includes('envio') && api.includes('envio'),
   'las peticiones de una misma carga van marcadas con el mismo envío');
ok(api.includes('asyncio.gather') && api.includes('Semaphore'),
   'el servidor lee en paralelo, con tope, en vez de una detrás de otra');
ok(/rate_limit\(request, limit=(?:[2-9]\d|\d{3})/.test(api.slice(api.indexOf('async def registrar'))),
   'el tope de peticiones cuenta imágenes, no cargas: 20 capturas no lo agotan');
ok(vist.includes('setResultados([...hechos])'),
   'los resultados se enseñan según llegan, no todos al final');

console.log('\n── Se ve lo que leyó el lector ──');
ok(vist.includes('function horasDe'), 'hay una lectura de las horas devueltas');
ok(vist.includes('return filas') && vist.includes('contrato'),
   'y si no reconoce la forma devuelve nada en vez de inventarla');

console.log('\n── Buscarse por nombre sin publicar el directorio ──');
ok(api.includes('_correo_tapado'), 'el buscador tapa el correo');
const bloqueBuscar = api.slice(api.indexOf('async def buscar'), api.indexOf('async def registrar'));
ok(bloqueBuscar.includes('len(texto) < 2'), 'pide dos letras como mínimo');
ok(bloqueBuscar.includes('len(encontradas) == 6'), 'y devuelve pocas');
ok(!/correo\.startswith|correo\.lower\(\)\.startswith/.test(bloqueBuscar),
   'busca por nombre, no por correo: adivinar correos es lo que no queremos');
ok(api.includes('find_user_by_id'), 'el registro resuelve la persona por identificador');
ok(!vist.includes('h.correo}</span>\n') || vist.includes('{h.correo}'),
   'la vista enseña el correo tapado que le dio el servidor, no lo reconstruye');

console.log('\n── La cuenta de Google solo rellena el campo ──');
ok(vist.includes('correoDeToken'), 'se saca el correo del token de One Tap');
ok(vist.includes('NO autentica'), 'y está escrito que eso no autentica a nadie');
ok(vist.includes("fetch('/api/auth/config')"),
   'el cliente de Google sale de la configuración, no está escrito en el código');
ok(vist.includes('comprobarCorreo(c)'),
   'el correo detectado pasa por la misma validación que el escrito a mano');

console.log('\n── Mensajes para la persona, no códigos ──');
for (const estado of ['SIN_CONFIGURAR', 'TIMEOUT', 'ERROR_SCRIPT', 'ERROR_RED']) {
  ok(vist.includes(`'${estado}'`), `«${estado}» tiene su explicación en la vista`);
}
ok(vist.includes('vuelve a enviarla'), 'un tiempo agotado le dice qué hacer, no solo que falló');

console.log('\n── El día sale de la captura, no se pregunta ──');
// Amilkar: «en teoría el api ya devuelve en el excel el día, no debería
// tomar de ahí?». Sí. Pedirlo era copiar la forma del Google Form.
ok(!vist.includes('Día que estás reportando'),
   'la vista ya no pide la fecha como campo obligatorio');
ok(vist.includes("useState('')") && vist.includes('El día lo saca el lector'),
   'y se deja vacía a propósito, documentado');
ok(vist.includes('const listo = !!persona && capturas.length > 0'),
   'para enviar basta el correo confirmado y al menos una captura');
ok(vist.includes('...(fecha ? { fecha } : {})'),
   'solo se manda la fecha si alguien la escribió');
ok(vist.includes('días distintos'),
   'y se dice que puede subir varios días de una vez');
ok(api.includes('fecha: str | None'), 'el servidor la acepta vacía');
ok(api.includes('if fecha:'), 'y no se la pasa al lector cuando no la hay');

console.log('\n── La carga del anexo es una sola pantalla ──');
const carga = readFileSync('src/components/TrCargarHoras.tsx', 'utf8');
ok(carga.includes('onDrop'), 'se suelta el archivo encima');
ok(!carga.includes('paso 1') && !carga.includes('Paso ') && !/wizard/i.test(carga),
   'no hay asistente por pasos');
ok((carga.match(/<button/g) ?? []).length <= 4,
   'pocos botones: soltar, cargar, cancelar');
ok(carga.includes('trimestreDe'), 'el trimestre se deduce de las fechas, no se pregunta');
ok(carga.includes('sinResolver'), 'solo pregunta por los nombres que no pudo resolver');
ok(carga.includes('<details'), 'los avisos y los cambios van plegados, no estorbando');
ok(carga.includes('guardarAlias'), 'lo confirmado se recuerda para la próxima carga');
ok(carga.includes('sin cambiarle nada'), 'y se usa el mismo Excel que manejan hoy');

console.log('\n── Pero se ve lo que se va a guardar antes de guardarlo ──');
// Es un trimestre entero de horas: los contadores no bastan para confiar.
ok(carga.includes('Vista previa'), 'hay vista previa del archivo leído');
ok(carga.includes('horasPorDia[d]'), 'muestra las horas día a día, no solo totales');
ok(carga.includes('mesesDe'), 'con los meses en la cabecera para no perderse entre 61 columnas');
ok(carga.includes('position:\'sticky\'') || carga.includes("position:'sticky'"),
   'la columna del puesto queda fija al desplazarse de lado');
ok(carga.includes('c.dias.includes(d)'), 'y se ven los días de cada cobertura');
ok(carga.includes('sin días marcados'), 'incluida la advertencia de las coberturas sin días');
ok(carga.includes('Total del trimestre'), 'con el total de horas, que es lo que se revisa de un vistazo');
ok(carga.indexOf('Vista previa') < carga.indexOf('Cargar {leido.trimestre.label}'),
   'y va antes del botón de cargar, no después');

console.log(f ? `\n${f} fallas` : '\nvista pública OK');
