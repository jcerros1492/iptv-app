# Versiones de la App IPTV

Cada zip trae el número de versión en el nombre (iptv-app-vX.X.zip).
"Motor" = Apps Script. Si dice "sí", hay que copiar el archivo indicado a Apps Script y hacer
Implementar → Gestionar implementaciones → ✏️ → Nueva versión → Implementar.

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
