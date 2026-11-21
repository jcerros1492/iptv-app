# Versiones de la App IPTV

Cada zip trae el número de versión en el nombre (iptv-app-vX.X.zip).
"Motor" = Apps Script. Si dice "sí", hay que copiar el archivo indicado a Apps Script y hacer
Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar.

## 1.5 · 21 nov 2026
- Inicio muestra "Actualizado a las 2:34 p. m." debajo del título. Mientras trae datos dice
  "Actualizando…". Tocar ese texto actualiza en el momento.
- Motor: no.

## 1.4 · 21 nov 2026
- Al anotar una respuesta ("Sin respuesta" o "Va a renovar") la alerta del vencido se quita
  y vuelve a aparecer a los 3 días si todavía no ha pagado (con notificación ese día).
  Los días se cambian en la hoja Config, clave "dias_reaviso".
- Incluye todo lo de la 1.3.
- Motor: SÍ → copiar Codigo.gs, Logica.gs y Tareas.gs a Apps Script y hacer Nueva versión.

## 1.3 · 21 nov 2026
- Nuevo: registrar el pago de una deuda. En Alertas, tocar "X debe ₡…" abre la pantalla de pago.
  Si paga todo, la alerta desaparece; si abona, queda debiendo el resto. La plata entra al sobre.
- Face ID / huella: ahora se activa bien en iPhone (antes quedaba solo el PIN).
  Si ya tenía el PIN: Ajustes → "Activar Face ID".
- La pantalla de bloqueo muestra el botón grande de Face ID; el PIN queda como respaldo en "Usar PIN".
- La barra de abajo ya no aparece en la pantalla de bloqueo ni en la de entrar.
- Motor: SÍ → copiar Codigo.gs y Logica.gs a Apps Script y hacer Nueva versión.

## 1.2 · 21 nov 2026
- Se entra con Google una sola vez: la sesión dura 6 meses y se renueva sola con el uso
  (antes vencía cada hora). El celular sigue protegido con Face ID / huella / PIN.
- Si se pierde un celular: en la hoja Config agregar "cerrar_sesiones_antes" con la fecha de hoy
  y todos tendrán que volver a entrar con Google.
- Motor: SÍ → copiar apps-script/Codigo.gs a Apps Script y hacer Nueva versión.

## 1.1 · 21 nov 2026
- La app abre al instante con los últimos datos y se actualiza por detrás.
- Guardar cobros, clientes y respuestas es más rápido (un solo viaje al motor).
- Tipo de cambio automático: referencia del BCCR + ajuste (hoja Config, "ajuste_tc_referencia").
- Aviso en la app cuando hay una versión nueva, con botón "Actualizar".
- Número de versión visible en Ajustes.
- Motor: sí (Codigo.gs y Tareas.gs) — ya instalado.

## 1.0 · 21 nov 2026
- Primera versión.
