# Versiones de la App IPTV

Cada zip trae el número de versión en el nombre (iptv-app-vX.X.zip).
"Motor" = Apps Script. Si dice "sí", hay que copiar el archivo indicado a Apps Script y hacer
Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar.

## 3.8 · 24 nov 2026
- Finanzas: el monto del sobre (₡192.762,92) queda siempre en una sola línea; los céntimos se
  ven más pequeños y el tamaño se ajusta al ancho de cada celular.
- Motor: no.

## 3.7 · 23 nov 2026
- Notificaciones al celular con OneSignal (App ID 5c2da857-…). Ajustes → Notificaciones →
  "Activar en este celular". Cuando están activas aparece "Enviar prueba".
- Ajustes muestra el estado: activas, apagadas, bloqueadas o "instale la app primero".
- Motor: SÍ → copiar Codigo.gs a Apps Script y hacer Nueva versión. Además, en Propiedades del
  script deben estar ONESIGNAL_APP_ID y ONESIGNAL_API_KEY.

## 3.6 · 23 nov 2026
- Revisadas todas las pantallas en iPhone SE (320), Android chico (360), Android (393),
  iPhone Pro Max (430) y tablet (768), en tema claro y oscuro. Se corrigió Finanzas y el
  Listado general, que se salían del ancho en pantallas chicas.
- Android: el teclado numérico trae punto en vez de coma; ahora el punto que se escribe se toma
  como céntimos (9095.45 → ₡9.095,45).
- Motor: no (si no instaló la 3.5, pegue Codigo.gs, Logica.gs y Tareas.gs de la 3.5).

## 3.5 · 23 nov 2026
- Nuevo: Reparto 50/50 con aprobación (Finanzas → "Para repartir" → "Proponer reparto").
  Uno propone el monto (máximo lo disponible, ya descontada la reserva de créditos) y el otro
  lo aprueba o no desde su celular (con Face ID / huella). Al aprobar se registra la salida del
  sobre como "Reparto 50/50"; luego se saca del sobre en el banco. Quien propuso puede cancelar.
  La propuesta aparece de primera en Alertas del otro socio.
- Motor: SÍ → copiar Codigo.gs, Logica.gs y Tareas.gs a Apps Script y hacer Nueva versión.

## 3.4 · 23 nov 2026
- Guardar cobros, abonos, depósitos y gastos es más rápido: el motor escribe todo de una sola
  vez en vez de celda por celda, y no vuelve a leer la configuración en cada llamada.
- Finanzas, Movimientos y Depositar muestran céntimos como el banco (₡192.762,92).
- El aviso de versión nueva se revisa también cada 2 minutos con la app abierta.
- Motor: SÍ → copiar Codigo.gs a Apps Script y hacer Nueva versión.

## 3.3 · 23 nov 2026
- Nuevo: Depositar en el sobre. En Finanzas, tocar "₡X sin depositar ›" (o la alerta naranja)
  muestra los cobros que no están en el sobre; se marcan y "Ya lo pasé al sobre".
  "En el sobre BCR" sube ese monto y la alerta desaparece. Queda anotado quién y cuándo.
- Motor: SÍ → copiar Codigo.gs y Logica.gs a Apps Script y hacer Nueva versión.

## 3.2 · 23 nov 2026
- Los montos se van formateando mientras se escriben: ₡1 → ₡10 → ₡100 → ₡1.000 → ₡10.000.
  La coma del teclado es para céntimos (₡9.095,45).
- Motor: no.

## 3.1 · 23 nov 2026
- Los campos de dinero muestran el separador de miles (₡20.880; con céntimos ₡9.095,45).
  Al tocar el campo se selecciona todo para escribir encima.
- Pago de deuda: debajo del monto se ve en vivo qué pasa con ese pago
  ("Es un abono: queda debiendo ₡10.880", "✓ Salda toda la deuda", etc.).
- Incluye la 3.0.
- Motor: no (si no instaló la 3.0, pegue Codigo.gs, Logica.gs y Tareas.gs de la 3.0).

## 3.0 · 23 nov 2026
- Tema oscuro: Ajustes → Apariencia → Automático (sigue al celular), Claro u Oscuro.
- Nuevo: Registrar gasto (Finanzas → "+ Gasto", o tocando la alerta de Adobe).
  · Adobe: se guarda en dólares ($19.99, clave "adobe_usd" en Config). La app propone el monto
    en colones con el cambio del día; se escribe lo que de verdad cobró el banco. La fecha del
    próximo pago se corre sola 2 meses.
  · Otro gasto: descripción y monto libres.
- La alerta y la notificación de Adobe dicen "$19.99 ≈ ₡9.079 con el cambio de hoy".
- Los montos se leen bien con punto o coma decimal (9095,45 · 9095.45 · 9.095,45), también en
  el cuadre del sobre y el tipo de cambio.
- Motor: SÍ → copiar Codigo.gs, Logica.gs y Tareas.gs a Apps Script y hacer Nueva versión.

## 2.9 · 23 nov 2026
- La app tiene su propio identificador ("id": "/iptv-app/"), para que Android no la confunda
  con otras apps web publicadas en la misma cuenta de GitHub.
- Motor: no.

## 2.8 · 23 nov 2026
- Al tocar "Actualizar" en el aviso de versión nueva, la app se recarga sin volver a pedir
  Face ID / huella (si ya estaba desbloqueada).
- Incluye la 2.7.
- Motor: no (si no instaló la 2.7, pegue el Codigo.gs de la 2.7).

## 2.7 · 23 nov 2026
- Finanzas: "Últimos movimientos" y "Últimos cobros" se unieron en "Movimientos del sobre":
  entradas (cobros, pagos de deuda, aportes) en verde con "+" y salidas (gastos, créditos,
  repartos) en rojo con "−". Se ven los 12 más recientes.
- "Ver todos ›": todos los movimientos por periodo (este mes, mes anterior, este año, todo o
  escoger mes), con total de entradas, salidas y la diferencia. Se puede filtrar solo entradas
  o solo salidas tocando esos cuadros.
- Motor: SÍ → copiar Codigo.gs a Apps Script y hacer Nueva versión.

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
