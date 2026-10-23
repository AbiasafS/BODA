# RSVP con Google Sheets + Apps Script

Guía para activar la confirmación personalizada. Son 6 pasos y se hacen una sola vez.

## 1. Crear la hoja

1. Abre <https://sheets.new> y ponle nombre: **Boda – Invitados**.
2. **Archivo → Importar → Subir** y elige `scripts/invitados.csv`.
3. En "Importar ubicación" elige **Reemplazar la hoja de cálculo**.
4. Renombra la pestaña (abajo) a **Invitados**. Debe quedar exactamente así.

La hoja ya trae las columnas:

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Token | Invitación | Pases | Teléfono | Enlace | Mensaje | Asistencia | Personas | Nombres | Comentario | Fecha | Enviar |

## 2. Abrir Apps Script

1. En la hoja: **Extensiones → Apps Script**.
2. Borra el `function myFunction() {}` que aparece.
3. Pega todo el contenido de `apps-script/rsvp.gs`.
4. Guarda (💾).

## 3. Publicar como aplicación web

1. **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. **Ejecutar como:** Yo.
4. **Quién tiene acceso:** Cualquier persona.
5. **Implementar → Autorizar acceso**.
   - Si Google avisa "no ha verificado esta aplicación": **Avanzado → Ir a …**. Es normal en scripts propios.
6. Copia la URL que termina en `/exec`.

## 4. Conectar el sitio

En `js/main.js`, pega la URL en la constante del inicio de la sección 4:

```js
const RSVP_API = 'https://script.google.com/macros/s/.../exec';
```

Avísame y lo dejo puesto yo, o edítalo tú.

## 5. Generar enlaces (solo si agregas invitados)

Recarga la hoja para que aparezca el menú **Boda**.

En la hoja: menú **Boda → Generar tokens y enlaces**.

La columna **Enlace** queda lista y la columna **Mensaje** trae el texto completo para copiar y pegar en WhatsApp. Los tokens que ya existen no se cambian.

## Actualizar la lista (cambios de nombres o pases)

Cuando cambie el Excel:

1. Corre el actualizador, que **conserva los tokens** de las invitaciones que ya existían:

   ```bash
   cd ~/Documentos/boda
   python3 scripts/actualizar_invitaciones.py --xlsx "/ruta/Lista actualizada.xlsx"
   ```

   Deja el CSV anterior en `scripts/invitados.antes.csv` (respaldo local, no se sube).

2. En la hoja, renombra la pestaña `Invitados` a `Invitados_viejo` (respaldo).
3. **Archivo → Importar → Subir** y elige `scripts/invitados.csv`; en "Importar ubicación" elige **Insertar nueva hoja**.
4. Renombra la pestaña nueva a **Invitados** (exacto).
5. Menú **Boda → Generar tokens y enlaces** y luego **Crear/actualizar resumen**.
6. Revisa las filas nuevas y los pases; borra `PRUEBA01` cuando termines las pruebas.

Los invitados que no cambiaron conservan su token y su enlace. Las invitaciones nuevas reciben token nuevo; las que quitas dejan de funcionar.

**Si ya hay teléfonos o confirmaciones reales**, no reemplaces la pestaña: copia las columnas D y G–K de `Invitados_viejo` a la nueva o pásamelas y lo hacemos sin perder nada.

## 6. Probar

1. Abre `http://127.0.0.1:5500/?inv=PRUEBA01`.
2. Confirma con 2 personas.
3. Revisa la fila **Familia de Prueba** en la hoja y el correo de `salazarabiasaf@gmail.com`.
4. Cuando termines, borra la fila de prueba.

## Cómo enviar las invitaciones

- En la columna **L (Enviar)** hay un botón **Enviar por WhatsApp**: ábrelo, elige el contacto y envía. El mensaje y el enlace ya van escritos.
- O copia la celda de **Mensaje** y pégala en WhatsApp (el enlace ya va incluido).
- O manda solo el **Enlace**; la página muestra el nombre y los pases.
- Cuando tengas los teléfonos, se capturan en la columna **D** para tenerlos a mano.

El botón de la columna L aparece después de ejecutar **Boda → Generar tokens y enlaces**.

## Notas

- **No compartas la hoja**: tiene nombres y pases.
- El token es la llave: quien tenga el enlace puede responder por esa invitación. No lo publiques.
- Si cambias el dominio del sitio, actualiza `BASE_URL` en el script y vuelve a generar.
- Si al abrir el enlace sale "No encontramos tu invitación", revisa que la hoja se llame `Invitados` y que el token esté en la columna A.
- Si Apps Script falla con "No se encontró la hoja", copia el ID de la URL de la hoja y pégalo en `CONFIG.SHEET_ID`.
- Límite de Gmail normal: 100 correos al día. Alcanza de sobra; las confirmaciones llegan repartidas.
