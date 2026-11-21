/*
 * Configuración de la app.
 * Mientras API_URL esté vacío, la app funciona en MODO DEMOSTRACIÓN
 * (datos de ejemplo guardados solo en ese navegador, sin conexión a la hoja).
 *
 * Nada de esto es secreto: son direcciones públicas. Las claves privadas
 * van en las Propiedades del script de Apps Script, nunca aquí.
 */
window.APP_CONFIG = {
  // Dirección de la implementación de Apps Script (termina en /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycby15QdbWg3rH_BoJGAU7wsayAgKHBQqLq_bQwwirSp93bj8ZK0rixUiSe10KHQL7dkh/exec',
  // ID de cliente de Google (termina en .apps.googleusercontent.com)
  GOOGLE_CLIENT_ID: '803845879519-ptj8kbuh4t72gesbrp084ompk9lc8lgp.apps.googleusercontent.com',
  // ID de la app de OneSignal para notificaciones (opcional)
  ONESIGNAL_APP_ID: ''
};
