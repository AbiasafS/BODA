/**
 * RSVP — Pablo & Gesuri
 * ---------------------------------------------------------
 * Este archivo se pega en el editor de Apps Script de la hoja
 * de cálculo (Extensiones → Apps Script). No se ejecuta desde
 * el sitio: se publica como aplicación web y el sitio lo llama.
 *
 * Estructura de la hoja "Invitados" (una fila por invitación):
 *   A Token | B Invitación | C Pases | D Teléfono | E Enlace | F Mensaje
 *   G Asistencia | H Personas | I Nombres | J Comentario | K Fecha
 */

const CONFIG = {
  HOJA: 'Invitados',
  // Solo hace falta si getActiveSpreadsheet() devolviera null en la web.
  SHEET_ID: '',
  BASE_URL: 'https://boda.abiasafsalazar.com/',
  EMAIL_AVISOS: 'salazarabiasaf@gmail.com',
  ZONA: 'America/Mexico_City',
  COL: {
    TOKEN: 1,
    NOMBRE: 2,
    PASES: 3,
    TELEFONO: 4,
    ENLACE: 5,
    MENSAJE: 6,
    ASISTENCIA: 7,
    PERSONAS: 8,
    NOMBRES: 9,
    COMENTARIO: 10,
    FECHA: 11,
    ENVIAR: 12
  }
};

/** Menú que aparece al abrir la hoja. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Boda')
    .addItem('Generar tokens y enlaces', 'generarTokensYEnlaces')
    .addItem('Crear/actualizar resumen', 'crearResumen')
    .addToUi();
}

function libro_() {
  const activo = SpreadsheetApp.getActiveSpreadsheet();
  if (activo) return activo;
  if (CONFIG.SHEET_ID) return SpreadsheetApp.openById(CONFIG.SHEET_ID);
  throw new Error('No se encontró la hoja. Pega su ID en CONFIG.SHEET_ID.');
}

function hoja_() {
  const hoja = libro_().getSheetByName(CONFIG.HOJA);
  if (!hoja) throw new Error('No existe la pestaña "' + CONFIG.HOJA + '".');
  return hoja;
}

/**
 * Rellena Token, Enlace y Mensaje en las filas que tengan invitación.
 * Se puede ejecutar varias veces: respeta los tokens que ya existan.
 */
function generarTokensYEnlaces() {
  const hoja = hoja_();
  const ultima = hoja.getLastRow();
  if (ultima < 2) {
    libro_().toast('No hay invitados en la hoja.', 'Boda', 5);
    return;
  }

  const rango = hoja.getRange(2, 1, ultima - 1, CONFIG.COL.MENSAJE);
  const datos = rango.getValues();
  const usados = {};

  hoja.getRange(1, CONFIG.COL.ENVIAR).setValue('Enviar');

  datos.forEach(function (fila) {
    const token = String(fila[CONFIG.COL.TOKEN - 1] || '').trim().toUpperCase();
    if (token) usados[token] = true;
  });

  for (let i = 0; i < datos.length; i++) {
    const nombre = String(datos[i][CONFIG.COL.NOMBRE - 1] || '').trim();
    if (!nombre) continue;

    let token = String(datos[i][CONFIG.COL.TOKEN - 1] || '').trim().toUpperCase();
    if (!token) {
      do {
        token = nuevoToken_();
      } while (usados[token]);
      usados[token] = true;
      datos[i][CONFIG.COL.TOKEN - 1] = token;
    }

    const pases = Number(datos[i][CONFIG.COL.PASES - 1]) || 1;
    const enlace = CONFIG.BASE_URL + '?inv=' + encodeURIComponent(token);
    const mensaje = textoMensaje_(nombre, pases, enlace);
    datos[i][CONFIG.COL.ENLACE - 1] = enlace;
    datos[i][CONFIG.COL.MENSAJE - 1] = mensaje;

    // Enlace "Enviar por WhatsApp": abre WhatsApp con el mensaje y deja elegir el contacto.
    const compartir = 'https://wa.me/?text=' + encodeURIComponent(mensaje);
    hoja.getRange(i + 2, CONFIG.COL.ENVIAR).setRichTextValue(
      SpreadsheetApp.newRichTextValue()
        .setText('Enviar por WhatsApp')
        .setLinkUrl(compartir)
        .build()
    );
  }

  rango.setValues(datos);
  libro_().toast('Enlaces y mensajes generados.', 'Boda', 5);
}

function nuevoToken_() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const hex = Utilities.getUuid().replace(/-/g, '');
  let token = '';
  for (let i = 0; i < 10; i++) {
    token += abc[parseInt(hex.substr(i * 2, 2), 16) % abc.length];
  }
  return token;
}

function textoMensaje_(nombre, pases, enlace) {
  const cuantas = pases === 1 ? '1 persona' : pases + ' personas';
  return 'Hola ' + nombre + ' 💚\n\n'
    + 'Con mucha alegría los invitamos a nuestra boda el 26 de diciembre de 2026.\n\n'
    + 'Su invitación es para ' + cuantas + '.\n\n'
    + 'Confirma aquí: ' + enlace + '\n\n'
    + 'Pablo & Gesuri';
}

/** Crea o actualiza la pestaña Resumen con los totales. */
function crearResumen() {
  const libro = libro_();
  let hoja = libro.getSheetByName('Resumen');
  if (!hoja) hoja = libro.insertSheet('Resumen');
  hoja.clear();

  hoja.getRange('A1')
    .setValue('Resumen de confirmaciones')
    .setFontWeight('bold')
    .setFontSize(14);

  const filas = [
    ['Pases invitados', '=SUM(Invitados!C2:C)'],
    ['Invitaciones', '=COUNTA(Invitados!B2:B)'],
    ['Confirmadas (sí)', '=COUNTIF(Invitados!G2:G,"Sí")'],
    ['No asistirán', '=COUNTIF(Invitados!G2:G,"No")'],
    ['Sin responder', '=COUNTA(Invitados!B2:B)-COUNTIF(Invitados!G2:G,"Sí")-COUNTIF(Invitados!G2:G,"No")'],
    ['Personas confirmadas', '=SUM(Invitados!H2:H)'],
    ['Lugares disponibles', '=SUM(Invitados!C2:C)-SUM(Invitados!H2:H)']
  ];

  hoja.getRange(3, 1, filas.length, 2).setValues(filas);
  hoja.getRange('A3:B3').setFontWeight('bold');
  hoja.autoResizeColumns(1, 2);
  libro.toast('Resumen actualizado.', 'Boda', 5);
}

// ---------------------------------------------------------
// API que consume el sitio
// ---------------------------------------------------------

function doGet(e) {
  const params = (e && e.parameter) || {};
  let callback = params.callback || null;
  // Solo se aceptan nombres de función válidos (JSONP seguro).
  if (callback && !/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) callback = null;
  try {
    const token = String(params.token || '').trim().toUpperCase();
    const invitado = buscarInvitado_(token);
    if (!invitado) return salida_({ ok: false, error: 'TOKEN' }, callback);

    return salida_({
      ok: true,
      familia: invitado.familia,
      pases: invitado.pases,
      asistencia: invitado.asistencia,
      personas: invitado.personas,
      nombres: invitado.nombres,
      comentario: invitado.comentario
    }, callback);
  } catch (err) {
    return salida_({ ok: false, error: String(err) }, callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const token = String(body.token || '').trim().toUpperCase();
    const invitado = buscarInvitado_(token);
    if (!invitado) return salida_({ ok: false, error: 'TOKEN' }, null);

    const esSi = body.asistencia === 'si';
    const esNo = body.asistencia === 'no';
    if (!esSi && !esNo) return salida_({ ok: false, error: 'ASISTENCIA' }, null);

    let personas = esSi ? parseInt(body.personas, 10) : 0;
    if (isNaN(personas) || personas < 0) personas = 0;
    if (personas > invitado.pases) personas = invitado.pases;

    const nombres = String(body.nombres || '').slice(0, 300).trim();
    const comentario = String(body.comentario || '').slice(0, 1000).trim();
    const fecha = Utilities.formatDate(new Date(), CONFIG.ZONA, 'dd/MM/yyyy HH:mm');

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const hoja = hoja_();
      const fila = filaDeToken_(hoja, token);
      if (!fila) return salida_({ ok: false, error: 'TOKEN' }, null);

      hoja.getRange(fila, CONFIG.COL.ASISTENCIA, 1, 5)
        .setValues([[esSi ? 'Sí' : 'No', personas, nombres, comentario, fecha]]);
    } finally {
      lock.releaseLock();
    }

    try {
      notificar_(invitado, esSi ? 'Sí' : 'No', personas, nombres, comentario, fecha);
    } catch (err) {
      // Si falla el correo, la confirmación ya quedó guardada.
    }

    return salida_({ ok: true }, null);
  } catch (err) {
    return salida_({ ok: false, error: String(err) }, null);
  }
}

function buscarInvitado_(token) {
  if (!token) return null;
  const hoja = hoja_();
  const ultima = hoja.getLastRow();
  if (ultima < 2) return null;

  const datos = hoja.getRange(2, 1, ultima - 1, CONFIG.COL.FECHA).getValues();
  for (let i = 0; i < datos.length; i++) {
    if (String(datos[i][CONFIG.COL.TOKEN - 1]).trim().toUpperCase() === token) {
      return {
        familia: String(datos[i][CONFIG.COL.NOMBRE - 1] || '').trim(),
        pases: Number(datos[i][CONFIG.COL.PASES - 1]) || 1,
        asistencia: String(datos[i][CONFIG.COL.ASISTENCIA - 1] || '').trim(),
        personas: Number(datos[i][CONFIG.COL.PERSONAS - 1]) || 0,
        nombres: String(datos[i][CONFIG.COL.NOMBRES - 1] || '').trim(),
        comentario: String(datos[i][CONFIG.COL.COMENTARIO - 1] || '').trim()
      };
    }
  }
  return null;
}

function filaDeToken_(hoja, token) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return 0;
  const tokens = hoja.getRange(2, CONFIG.COL.TOKEN, ultima - 1, 1).getValues();
  for (let i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]).trim().toUpperCase() === token) return i + 2;
  }
  return 0;
}

function notificar_(invitado, asistencia, personas, nombres, comentario, fecha) {
  const asunto = 'RSVP: ' + invitado.familia + ' — '
    + (asistencia === 'Sí' ? personas + ' de ' + invitado.pases + ' personas' : 'no asistirá');

  const cuerpo = [
    'Nueva confirmación de asistencia',
    '',
    'Invitación: ' + invitado.familia,
    'Respuesta: ' + asistencia,
    'Personas: ' + personas + ' de ' + invitado.pases,
    'Nombres: ' + (nombres || '—'),
    'Comentario: ' + (comentario || '—'),
    'Fecha: ' + fecha
  ].join('\n');

  MailApp.sendEmail(CONFIG.EMAIL_AVISOS, asunto, cuerpo);
}

function salida_(objeto, callback) {
  const json = JSON.stringify(objeto);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
