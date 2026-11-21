# App IPTV · Guía de instalación desde cero

Esta guía deja funcionando la **etapa 1** de la app:
- Entrar con Google y luego con Face ID, huella o PIN.
- Inicio, alertas, clientes con buscador, ficha con la contraseña protegida, registrar cobro, comprobante como foto, mensaje de WhatsApp, nuevo cliente y finanzas.
- Las tareas automáticas: tipo de cambio del BCR, alertas, exclientes a los 30 días, aviso de Adobe y respaldo semanal.

Tiempo aproximado: **1 a 2 horas**, una sola vez. Háganlo con calma y en orden.

---

## Qué hay en el paquete

| Carpeta / archivo | Qué es | ¿Va a GitHub? |
|---|---|---|
| `docs/` | La app (las pantallas). GitHub Pages la publica desde aquí. | ✅ Sí, **menos `demo-data.js`** |
| `apps-script/` | El motor que va pegado a la hoja de Google. | ✅ Sí (no lleva secretos) |
| `tools/` | Herramientas para convertir el Excel y para probar. | ✅ Sí |
| `INSTALACION.md` | Esta guía. | ✅ Sí |
| `IPTV-Base-de-datos.xlsx` (aparte) | **Sus datos**, con contraseñas. Se importa a Google Sheets. | ❌ **NUNCA** |

El archivo `.gitignore` ya impide que se suban por error los datos privados.

---

## Paso 0 · Antes de empezar

1. **Verificación en dos pasos** en los dos Gmail (jonacerros@gmail.com y fval85@gmail.com): en Google, vayan a *Cuenta → Seguridad → Verificación en dos pasos*. El correo es la llave de la app, así que este paso es obligatorio.
2. Todo lo siguiente se hace con la **cuenta de Jonathan**, que es la dueña.

---

## Paso 1 · La hoja de Google Sheets (la base de datos)

1. En Google Drive (cuenta de Jonathan), creen una carpeta **"IPTV App"**.
2. Suban dentro el archivo **IPTV-Base-de-datos.xlsx**.
3. Ábranlo y vayan a **Archivo → Guardar como hoja de cálculo de Google**. Se crea la versión de Google Sheets.
4. **Borren el .xlsx original** de Drive, porque tiene las contraseñas sin proteger. Vacíen también la papelera.
5. Compartan la carpeta con **fval85@gmail.com** como **Editor**.

La hoja tiene estas pestañas. **No cambien sus nombres ni los de las columnas.**
- **Resumen:** totales para revisar a mano.
- **Clientes, Cobros y Movimientos:** sus datos.
- **Config:** precios, regalías, margen de ₡1.000, teléfonos, correos y Adobe. Desde aquí cambian precios sin programar.
- **Controles:** lo que hay en el banco y en el panel cada vez que revisan.
- **TipoCambio, Accesos y Notificaciones:** las llena la app sola.

---

## Paso 2 · El motor (Apps Script)

1. En la hoja de Google, vayan a **Extensiones → Apps Script**.
2. Borren el contenido del archivo `Código.gs` que aparece.
3. Creen **4 archivos** con el botón **+ → Secuencia de comandos** y copien en cada uno el contenido de la carpeta `apps-script/`:
   - `Codigo` ← `Codigo.gs`
   - `Logica` ← `Logica.gs`
   - `Tareas` ← `Tareas.gs`
   - `Instalar` ← `Instalar.gs`
4. Vayan a **Configuración del proyecto** (el engranaje), activen **"Mostrar el archivo de manifiesto appsscript.json"**, vuelvan al editor y reemplacen el contenido de `appsscript.json` por el del paquete.
5. Pongan nombre al proyecto, por ejemplo "IPTV Motor", y guarden.

---

## Paso 3 · El ID de inicio de sesión de Google (Google Cloud)

Esto permite el botón "Iniciar sesión con Google" en la app. Es gratis.

1. Entren a **console.cloud.google.com** con la cuenta de Jonathan y creen un proyecto: **"IPTV App"**.
2. Vayan a **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo: **Externo**.
   - Nombre: "App IPTV". Correo de soporte: el de Jonathan.
   - En **Usuarios de prueba**, agreguen **jonacerros@gmail.com** y **fval85@gmail.com**.
   - Pueden dejarla en modo **Prueba**: solo esos dos correos podrán entrar, que es justo lo que queremos.
3. Vayan a **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - En **Orígenes de JavaScript autorizados** agreguen la dirección de GitHub Pages, **sin** el nombre del repositorio: `https://SU-USUARIO.github.io`
   - Creen y **copien el ID de cliente**. Termina en `.apps.googleusercontent.com`.

---

## Paso 4 · Datos privados del motor

En Apps Script, vayan a **Configuración del proyecto → Propiedades del script → Agregar propiedad**:

| Propiedad | Valor |
|---|---|
| `CLIENT_ID` | El ID de cliente del paso 3 |
| `APP_URL` | `https://SU-USUARIO.github.io/iptv-app/` |

`CLAVE_CIFRADO` se crea sola en el paso siguiente. **No la borren nunca**: sin ella no se pueden leer las contraseñas guardadas.

---

## Paso 5 · Correr la instalación

1. En el editor de Apps Script, abran el archivo **Instalar**, escojan la función **`instalar`** arriba y toquen **Ejecutar**.
2. Google pedirá permisos. Acepten con la cuenta de Jonathan. Si aparece *"Google no verificó esta app"*, toquen **Configuración avanzada → Ir a IPTV Motor**. Es normal: la app es de ustedes.
3. En el registro de ejecución debe aparecer algo como:
   > Listo. Contraseñas cifradas: 38. Tipo de cambio BCR: 460.
4. Revisen la hoja: en **Clientes**, la columna Contraseña ahora dice `enc:…`. Eso significa que están protegidas.
5. Opcional: corran **`probarCifrado`**. Debe mostrar "ok".

**Si el tipo de cambio dice "no se pudo leer":** no pasa nada. La app usa el valor de respaldo de **Config** y ustedes lo pueden corregir desde la app. Avísenme y ajusto la lectura.

Tareas que quedan programadas:
- **9:00 a. m.:** lee el tipo de cambio del BCR.
- **9:15 a. m.:** alertas de cobro, paso a exclientes después de 30 días y aviso de Adobe.
- **1:00 p. m.:** vuelve a leer el tipo de cambio.
- **Domingos 10:00 p. m.:** respaldo en la carpeta "IPTV · Respaldos", compartida con Fernando, guardando los últimos 12.

---

## Paso 6 · Publicar el motor

1. En Apps Script, toquen **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
   - Ejecutar como: **Yo** (Jonathan).
   - Quién tiene acceso: **Cualquier persona**. Tranquilos: el motor solo responde a los dos correos autorizados y revisa el inicio de sesión en cada petición.
3. Toquen **Implementar** y **copien la URL de la aplicación web**. Termina en `/exec`.

**Importante:** si un día cambian el código del motor, usen **Implementar → Administrar implementaciones → Editar (lápiz) → Versión nueva**. Así la URL no cambia.

---

## Paso 7 · La app en GitHub Pages

1. En GitHub, creen el repositorio **`iptv-app`**. Para usar GitHub Pages gratis, el repositorio debe ser **público**. El código no tiene datos ni contraseñas, y el `.gitignore` deja fuera lo privado.
2. Antes de subir, **borren `docs/demo-data.js`**. Tiene usuarios y montos de ejemplo sacados de su Excel.
3. Editen **`docs/config.js`**:
   ```js
   API_URL: 'https://script.google.com/macros/s/....../exec',   // paso 6
   GOOGLE_CLIENT_ID: '....apps.googleusercontent.com',            // paso 3
   ONESIGNAL_APP_ID: ''                                           // paso 8 (opcional)
   ```
4. Suban todo al repositorio.
5. En GitHub, vayan a **Settings → Pages → Build and deployment**. Escojan **Deploy from a branch**, rama **main** y carpeta **/docs**, y guarden.
6. En unos minutos la app queda en `https://SU-USUARIO.github.io/iptv-app/`.

---

## Paso 8 · Notificaciones en el celular (OneSignal, gratis)

1. Creen una cuenta en **onesignal.com**, luego **New App/Website**, con el nombre "App IPTV". Plataforma: **Web**.
2. Configuración:
   - Tipo: **Typical Site**.
   - Site URL: `https://SU-USUARIO.github.io`.
   - Escojan cualquier ícono.
   - En la parte del service worker: el archivo `OneSignalSDKWorker.js` ya viene en `docs/`, así que no hay que descargarlo.
3. En **Settings → Keys & IDs**, copien:
   - **App ID**: va en `docs/config.js` (`ONESIGNAL_APP_ID`) y en las Propiedades del script como `ONESIGNAL_APP_ID`.
   - **API Key**: va **solo** en las Propiedades del script como `ONESIGNAL_API_KEY`. **Nunca** en GitHub.
4. Suban el cambio de `config.js` a GitHub.
5. En la app, vayan a **Ajustes → Notificaciones → Activar en este celular**.
6. En Apps Script, corran **`probarNotificacion`**. Debe llegarles un aviso.

---

## Paso 9 · Instalar la app

- **iPhone:** abran la dirección en **Safari**, toquen **Compartir → Agregar a inicio**, y ábranla desde el ícono. Las notificaciones en iPhone solo funcionan si la app está agregada a la pantalla de inicio.
- **Android:** ábranla en **Chrome**, toquen **⋮ → Agregar a pantalla de inicio** (o "Instalar app").
- **Computadora:** ábranla en el navegador. Se puede instalar con el ícono de instalar de la barra de direcciones.

Después, dentro de la app:
1. **Inicien sesión con Google.**
2. Vayan a **Ajustes → Bloqueo con Face ID / huella → Activar**. Escojan un PIN de respaldo.
3. Revisen **Finanzas**: el sobre debe dar **₡176.762,92** y los créditos **287**, como el Excel.

---

## Paso 10 · Prueba en paralelo (2 a 4 semanas)

Registren los cobros en la app **y** en el Excel. Cada semana, en **Finanzas → Actualizar con el banco y el panel**, anoten lo que hay en el BCR y los créditos de XtreamAI. Si todo cuadra, dejan el Excel.

---

## Modo demostración

Si `docs/config.js` no tiene `API_URL`, la app funciona en **modo demostración**, con datos de ejemplo guardados solo en ese navegador. Sirve para probar sin tocar la hoja real. Para verla en la computadora, abran una terminal en la carpeta `docs/` y escriban:
```
python3 -m http.server 8000
```
Luego abran `http://localhost:8000`.

## Pruebas

- `node tools/probar.js`: prueba los cálculos con sus datos (sobre, créditos, reserva, regalías, fechas…).
- `node tools/simular-apps-script.js`: prueba el motor sin internet.

Las dos necesitan el archivo `datos/db.json`, que se genera con `python3 tools/convertir.py IPTV-para-cargar.xlsx`.

## Qué viene en la etapa 2

Cambiar paquete (con su pantalla propia), reportes, retiros con aprobación y reserva, compra de créditos, revendedor (Mcerros30), cuenta del proveedor, compartir promoción, ajustes completos y gastos fijos.
