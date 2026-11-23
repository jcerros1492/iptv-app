# Versiones de la App IPTV

Cada zip trae el número de versión en el nombre (iptv-app-vX.X.zip).
"Motor" = Apps Script. Si dice "sí", hay que copiar el archivo indicado a Apps Script y hacer
Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar.

## 2.6 · 22 nov 2026
- Reportes (Pagos y Por cliente): buscador fijo por nombre, usuario o teléfono.
- Al tocar un cliente se ve su reporte: cuánto pagó, pagos, meses, si debe (con botón para
  registrar el pago) y la lista de sus pagos en el periodo. "Quitar" vuelve a la lista.
- La imagen respeta lo que se está viendo (un cliente, una búsqueda o todo).
- Incluye la 2.5.
- Motor: no (si no instaló la 2.5, pegue el Codigo.gs de la 2.5).

## 2.5 · 22 nov 2026
- Reportes: los datos se bajan una sola vez (al entrar a Finanzas) y cada cambio de periodo o
  pestaña es instantáneo.
- Botón "Imagen": el reporte se envía como una imagen con el diseño azul/naranja (resumen +
  lista de pagos, clientes o gastos según la pestaña), por WhatsApp u otra app.
- Motor: SÍ → copiar Codigo.gs a Apps Script y hacer Nueva versión.

## 2.4 · 22 nov 2026
- Finanzas: arriba en grande los créditos disponibles (con cuántos se usaron en 30 días y para
  cuántos meses alcanzan) y el dinero en el sobre. Aviso si quedan menos de 30 créditos.
- El cuadre con el banco y el panel queda en una sola línea ("Cuadra ✓"); se toca para ver el
  detalle. Se abre solo si algo no cuadra.
- Incluye la 2.3.
- Motor: no (si no instaló la 2.3, pegue Codigo.gs y Logica.gs de la 2.3).

## 2.3 · 22 nov 2026
- Nuevo: Reportes (Finanzas → "Reportes"). Periodos: este mes, mes anterior, este año,
  año anterior, todo, o escoger un mes.
  · Pagos: cobrado, pendiente y cantidad de cobros, con la lista de cada pago.
  · Por cliente: cuánto pagó cada cliente en el periodo, de mayor a menor.
  · Negocio: ingresos, gastos por tipo, ganancia, repartos 50/50, créditos usados y clientes nuevos.
  · Descargar en PDF o Excel, o enviar el resumen por WhatsApp.
- Motor: SÍ → copiar Codigo.gs y Logica.gs a Apps Script y hacer Nueva versión.

## 2.2 · 22 nov 2026
- Las contraseñas (ver, copiar, enviar por WhatsApp y Listado general) solo se pueden usar si el
  celular tiene activado Face ID (iPhone) o huella (Android). Si no, la app lleva a Ajustes
  para activarlo. El PIN queda solo como respaldo cuando Face ID / huella falla.
- Incluye la 2.1.
- Motor: no (si no instaló la 2.1, pegue el Codigo.gs de la 2.1).

## 2.1 · 22 nov 2026
- Nuevo: Listado general (Clientes → "Listado general"). Todos los clientes en el orden en que
  les toca renovar, con vencimiento, dispositivos y botón para copiar el usuario.
  "Mostrar contraseñas" pide Face ID una vez y las muestra todas durante 1 minuto, con botón
  para copiar cada una. Queda anotado en la pestaña Accesos.
- Motor: SÍ → copiar Codigo.gs a Apps Script y hacer Nueva versión.

## 2.0 · 21 nov 2026
- Antes de guardar "No renueva", "Sin respuesta" o "Va a renovar" la app pregunta si está seguro.
- Ficha de un excliente: botón "Reactivar" para devolverlo a activo (si se pasó por error).
- Incluye todo lo de la 1.8 y 1.9.
- Motor: SÍ → copiar Codigo.gs y Logica.gs a Apps Script y hacer Nueva versión.

## 1.9 · 21 nov 2026
- iPhone: los botones de WhatsApp abren la app de WhatsApp directo. Al volver ya no queda
  una pestaña en blanco que haya que cerrar.
- Incluye todo lo de la 1.8 (Promo).
- Motor: no.

## 1.8 · 21 nov 2026
- Nuevo: Compartir promoción. En Clientes, botón "Promo" (y en Nuevo cliente). La imagen se arma
  sola con los precios en colones del día y se envía por WhatsApp u otra app, o se guarda.
- El comprobante se comparte mejor en iPhone (la imagen se prepara antes de tocar el botón).
- Motor: no.

## 1.7 · 21 nov 2026
- Pago de deuda: se marcan los meses que paga (ej. 2 de 3). El monto se suma solo; queda
  debiendo lo que no marcó.
- Ficha del cliente: botón para copiar el usuario (sin Face ID).
- Contraseñas: después de confirmar con Face ID, durante 5 minutos se pueden ver o copiar
  otras sin volver a pedirlo. La contraseña se vuelve a ocultar sola a los 30 segundos.
- Copiar contraseña funciona bien en iPhone.
- Motor: SÍ → copiar Logica.gs a Apps Script y hacer Nueva versión.

## 1.6 · 21 nov 2026
- iPhone: al volver a la app, el botón de Face ID a veces no hacía nada (quedaba una solicitud
  colgada). Ahora se cancela la anterior y Face ID se pide solo al tocar el botón.
- Si Face ID falla, aparece un mensaje visible (antes era oscuro sobre fondo oscuro).
- Botón "Entrar con Face ID" más visible (blanco). La pantalla ya no se agranda con dos toques.
- Motor: no.

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
