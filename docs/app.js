/* App IPTV · pantallas (etapa 1)
 * - Sin API_URL en config.js funciona en modo demostración (datos de ejemplo en este navegador).
 * - Con API_URL habla con Google Apps Script, que guarda en Google Sheets.
 */
(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};
  var DEMO = !CFG.API_URL;
  var ZONA = 'America/Costa_Rica';
  var BLOQUEO_MIN = 5;

  var S = {                 // estado de la app
    sesion: null,           // { token, correo, nombre, exp }
    datos: null,            // respuesta de 'estado'
    filtro: 'Activos', busqueda: '',
    cobro: null,            // borrador del cobro en pantalla
    comprobante: null,
    desbloqueado: false
  };

  var $app = document.getElementById('app');
  var $nav = document.getElementById('nav');

  /* ---------------- Utilidades ---------------- */

  function esc(t) {
    return String(t === null || t === undefined ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hoyCR() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function fechaLarga() {
    var t = new Intl.DateTimeFormat('es-CR', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('ver');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('ver'); }, 2600);
  }
  function ir(ruta) { location.hash = ruta; }
  /**
   * Lee un monto escrito por la persona: acepta 9095,45 · 9095.45 · 9.095,45 · 9,095.45 · 176762.92 · ₡20.880
   * Regla: el último punto o coma seguido de 1 o 2 cifras es decimal; los demás son de miles.
   */
  /** Monto para escribir en un campo: ₡20.880 o ₡9.095,45 (con céntimos si los tiene). */
  function montoCampo(n) {
    n = Math.round(numero(n) * 100) / 100;
    var ent = Math.floor(Math.abs(n)), dec = Math.round((Math.abs(n) - ent) * 100);
    return (n < 0 ? '−' : '') + '₡' + String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + (dec < 10 ? '0' : '') + dec : '');
  }
  function leerMonto(v) {
    if (typeof v === 'number') return v;
    var t = String(v || '').replace(/[^\d.,-]/g, '');
    if (!t) return 0;
    var m = t.match(/^(-?[\d.,]*?)[.,](\d{1,2})$/);
    var n = m ? parseFloat(m[1].replace(/[.,]/g, '') + '.' + m[2]) : parseFloat(t.replace(/[.,]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function disp(n) { return plural(Number(n), 'dispositivo', 'dispositivos'); }
  var ICON = {
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    atras: '<path d="m15 18-6-6 6-6"/>', cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z"/>',
    ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    alerta: '<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/>',
    flecha: '<path d="m9 6 6 6-6 6"/>',
    llave: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    copiar: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    lapiz: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    face: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M9 9v1M15 9v1"/><path d="M12 9v4h-1"/><path d="M9 15.5c1.7 1.3 4.3 1.3 6 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', alerta: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
  };
  function ico(n, cls) { return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>'; }
  function barra(titulo, atras, icono) {
    return '<div class="barra"><a class="icon-btn plano" href="' + atras + '" aria-label="Volver">' + ico(icono || 'atras') + '</a><h1>' + esc(titulo) + '</h1></div>';
  }
  function banner() { return DEMO ? '<div class="demo-banner">Modo demostración: datos de ejemplo, no se guardan en la hoja.</div>' : ''; }

  /* ---------------- Conexión (demo o Apps Script) ---------------- */

  var demoDb = null;
  function cargarDemo() {
    if (demoDb) return demoDb;
    try { demoDb = JSON.parse(localStorage.getItem('iptv_demo_db')); } catch (e) { demoDb = null; }
    if (!demoDb) demoDb = JSON.parse(JSON.stringify(window.DEMO_DB || { clientes: [], cobros: [], movimientos: [], config: [], controles: [], tipocambio: [] }));
    return demoDb;
  }
  function guardarDemo() { try { localStorage.setItem('iptv_demo_db', JSON.stringify(demoDb)); } catch (e) { } }
  function tcDemo(db) {
    var f = (db.tipocambio || []).slice().sort(function (a, b) { return a.Fecha < b.Fecha ? -1 : 1; });
    return f.length ? numero(f[f.length - 1].Venta) : 455;
  }

  function api(accion, datos) {
    if (DEMO) {
      return new Promise(function (ok, mal) {
        setTimeout(function () {
          try {
            var db = cargarDemo(), config = leerConfig(db.config), hoy = hoyCR(), correo = S.sesion.correo, r;
            var tc = tcDemo(db);
            if (accion === 'estado') return ok(armarEstado(db, config, hoy, correo, tc));
            if (accion === 'verContrasena') {
              var c = db.clientes.filter(function (x) { return x.Usuario === datos.usuario; })[0];
              return ok({ usuario: datos.usuario, contrasena: c ? c['Contraseña'] : '' });
            }
            if (accion === 'reporte') return ok(reporte(db, config, datos.desde, datos.hasta));
            if (accion === 'datosReporte') return ok({ cobros: db.cobros, movimientos: db.movimientos, clientes: db.clientes });
            if (accion === 'verContrasenas') {
              var m = {}; db.clientes.forEach(function (x) { if (x.Estado !== 'Excliente') m[x.Usuario] = x['Contraseña']; });
              return ok({ contrasenas: m });
            }
            if (accion === 'tipoCambioManual') {
              db.tipocambio.push({ Fecha: hoy, Venta: numero(datos.venta), Fuente: 'Manual' }); guardarDemo(); return ok({ ok: true });
            }
            var fn = { guardarCobro: accionGuardarCobro, pagarDeuda: accionPagarDeuda, reactivar: accionReactivar, guardarGasto: accionGuardarGasto, guardarCliente: accionGuardarCliente, respuesta: accionRespuesta, guardarControl: accionGuardarControl }[accion];
            if (!fn) throw new Error('Acción desconocida');
            r = fn(db, config, datos, hoy, correo, tc);
            aplicarCambiosEnMemoria(db, r.cambios); guardarDemo();
            ok(r.resultado);
          } catch (e) { mal(e); }
        }, 150);
      });
    }
    return fetch(CFG.API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: accion, datos: datos || {}, token: S.sesion && S.sesion.token })
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) {
        if (/Sesión vencida|Debe iniciar/.test(r.error)) { cerrarSesion(true); }
        throw new Error(r.error);
      }
      if (r.sesion && S.sesion) {   // el motor entrega (o renueva) la sesión larga
        S.sesion.token = r.sesion.token; S.sesion.exp = r.sesion.exp; guardarSesion(S.sesion);
      }
      if (r.estado) { S.datos = r.estado; S.fresco = Date.now(); guardarCache(r.estado); marcarSync(); S.repBase = null; }
      return r.datos;
    });
  }

  function pintarSync() { var el = document.getElementById('sync'); if (el) el.textContent = textoSync(); }
  function marcarSync() { S.horaSync = Date.now(); try { localStorage.setItem('iptv_cache_hora', String(S.horaSync)); } catch (e) { } }
  function textoSync() {
    if (DEMO) return '';
    if (S.actualizando) return 'Actualizando…';
    var t = S.horaSync || Number(localStorage.getItem('iptv_cache_hora') || 0);
    if (!t) return '';
    var d = new Date(t), hoy = new Date();
    var h = d.toLocaleTimeString('es-CR', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s/g, ' ');
    var mismoDia = d.toDateString() === hoy.toDateString();
    return 'Actualizado ' + (mismoDia ? 'a las ' + h : 'el ' + d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + h);
  }
  function guardarCache(d) { if (DEMO) return; try { localStorage.setItem('iptv_cache', JSON.stringify(d)); } catch (e) { } }
  function leerCache() { if (DEMO) return null; try { return JSON.parse(localStorage.getItem('iptv_cache')); } catch (e) { return null; } }

  function refrescar() {
    // Si el servidor acaba de mandar los datos junto con lo guardado, no se piden otra vez
    if (S.fresco && Date.now() - S.fresco < 3000) { S.fresco = 0; return Promise.resolve(S.datos); }
    S.actualizando = true; pintarSync();
    return api('estado').then(function (d) { S.datos = d; guardarCache(d); marcarSync(); S.repBase = null; S.actualizando = false; pintarSync(); return d; },
      function (e) { S.actualizando = false; pintarSync(); throw e; });
  }

  /* ---------------- Sesión con Google ---------------- */

  function leerSesion() {
    try {
      var s = JSON.parse(localStorage.getItem('iptv_sesion'));
      if (s && (DEMO || s.exp > Date.now() / 1000 + 60)) return s;
    } catch (e) { }
    return null;
  }
  function guardarSesion(s) { S.sesion = s; localStorage.setItem('iptv_sesion', JSON.stringify(s)); }
  function cerrarSesion(silencioso) {
    localStorage.removeItem('iptv_sesion'); localStorage.removeItem('iptv_cache'); S.sesion = null; S.datos = null;
    if (!silencioso) toast('Sesión cerrada');
    render();
  }
  function decodificarJWT(t) {
    var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(p))));
  }
  function cargarGoogle(cb) {
    if (window.google && google.accounts) return cb();
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = cb;
    document.head.appendChild(s);
  }
  function pantallaEntrar() {
    $nav.hidden = true;
    $app.innerHTML = '<div class="entrar"><div class="logo">TV</div><h1>App IPTV</h1>' +
      '<p>Solo Jonathan y Fernando pueden entrar.</p><div id="g-btn" style="margin-top:20px"></div>' +
      (DEMO ? '<button class="btn" id="demo-j" style="max-width:300px">Entrar como Jonathan (demo)</button><button class="btn sec" id="demo-f" style="max-width:300px">Entrar como Fernando (demo)</button>' : '') +
      '</div>';
    if (DEMO) {
      document.getElementById('demo-j').onclick = function () { entrarDemo('jonacerros@gmail.com', 'Jonathan'); };
      document.getElementById('demo-f').onclick = function () { entrarDemo('fval85@gmail.com', 'Fernando'); };
      return;
    }
    cargarGoogle(function () {
      google.accounts.id.initialize({
        client_id: CFG.GOOGLE_CLIENT_ID, auto_select: true, cancel_on_tap_outside: false,
        callback: function (resp) {
          var info = decodificarJWT(resp.credential);
          guardarSesion({ token: resp.credential, correo: String(info.email).toLowerCase(), nombre: info.given_name || info.name, exp: info.exp });
          S.desbloqueado = true; marcarActividad();
          $app.innerHTML = '<div class="cargando">Entrando…</div>';
          api('entrar').then(function () {
            iniciarNotificaciones();
            render();
          }, function (e) {
            localStorage.removeItem('iptv_sesion'); S.sesion = null;
            toast(e.message); render();
          });
        }
      });
      google.accounts.id.renderButton(document.getElementById('g-btn'), { theme: 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es' });
      google.accounts.id.prompt();
    });
  }
  function entrarDemo(correo, nombre) {
    guardarSesion({ token: 'demo', correo: correo, nombre: nombre, exp: Date.now() / 1000 + 86400 * 365 });
    S.desbloqueado = true; marcarActividad(); render();
  }

  /* ---------------- Bloqueo con Face ID / huella / PIN ---------------- */

  function bloqueo() { try { return JSON.parse(localStorage.getItem('iptv_bloqueo')) || null; } catch (e) { return null; } }
  function marcarActividad() { localStorage.setItem('iptv_ultima', String(Date.now())); }
  function necesitaDesbloqueo() {
    var b = bloqueo(); if (!b) return false;
    if (S.desbloqueado) {
      var ult = Number(localStorage.getItem('iptv_ultima') || 0);
      if (Date.now() - ult < BLOQUEO_MIN * 60000) return false;
    }
    return true;
  }
  function aleatorio(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  function b64(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))); }
  function deB64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  function hashPin(pin) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('iptv:' + pin)).then(b64);
  }
  function biometriaDisponible() {
    return window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ?
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() : Promise.resolve(false);
  }
  /* En iPhone, Face ID solo se puede pedir directo al tocar un botón: por eso se pide PRIMERO,
     sin esperar nada antes, y el PIN se pide después. */
  function crearCredencial() {
    return navigator.credentials.create({ publicKey: {
      challenge: aleatorio(32), rp: { name: 'App IPTV' },
      user: { id: aleatorio(16), name: S.sesion.correo, displayName: S.sesion.nombre || S.sesion.correo },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000
    } }).then(function (c) { return b64(c.rawId); });
  }
  function activarBloqueo() {
    var bio = S.bioDisponible ? crearCredencial().then(null, function (e) { toast(nombreBiometria() + ' no se activó (' + (e && e.name || 'error') + '). Queda solo el PIN.'); return null; }) : Promise.resolve(null);
    return bio.then(function (cred) {
      var p = window.prompt('Escoja un PIN de 4 a 6 números (respaldo por si falla ' + nombreBiometria() + '):');
      if (!p || !/^\d{4,6}$/.test(p)) { if (p) toast('El PIN debe tener de 4 a 6 números'); throw new Error('cancelado'); }
      return hashPin(p).then(function (h) { return { pin: h, cred: cred }; });
    }).then(function (b) { localStorage.setItem('iptv_bloqueo', JSON.stringify(b)); return b; });
  }
  function agregarBiometria() {
    return crearCredencial().then(function (cred) {
      var b = bloqueo(); b.cred = cred; localStorage.setItem('iptv_bloqueo', JSON.stringify(b)); return b;
    });
  }
  function verificarBiometria() {
    var b = bloqueo();
    if (!b || !b.cred) return Promise.reject(new Error('sin biometría'));
    // Si quedó una solicitud anterior colgada (por ejemplo al volver a la app), se cancela primero.
    if (S.bioPendiente) { try { S.bioPendiente.abort(); } catch (e) { } }
    var ctl = window.AbortController ? new AbortController() : null;
    S.bioPendiente = ctl;
    var op = { publicKey: {
      challenge: aleatorio(32), allowCredentials: [{ type: 'public-key', id: deB64(b.cred) }],
      userVerification: 'required', timeout: 60000
    } };
    if (ctl) op.signal = ctl.signal;
    return navigator.credentials.get(op).then(function (r) { if (S.bioPendiente === ctl) S.bioPendiente = null; return r; },
      function (e) { if (S.bioPendiente === ctl) S.bioPendiente = null; throw e; });
  }
  var ES_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function nombreBiometria() { return ES_IOS || /Mac/.test(navigator.userAgent) ? 'Face ID' : 'huella'; }
  function pantallaBloqueo() {
    $nav.hidden = true;
    var b = bloqueo();
    $app.innerHTML = '<div class="entrar oscuro"><div class="logo">TV</div><h1>Hola, ' + esc(S.sesion.nombre || '') + '</h1>' +
      '<p>' + (b.cred ? 'Use ' + nombreBiometria() + ' para entrar' : 'Escriba su PIN para entrar') + '</p>' +
      (b.cred ? '<button class="faceid" id="bio" aria-label="Entrar con ' + nombreBiometria() + '">' + ico('face', '') + '</button>' +
        '<button class="btn" id="bio2" style="max-width:260px;margin-top:14px">Entrar con ' + nombreBiometria() + '</button>' +
        '<button class="enlace" id="usar-pin" style="margin-top:18px;background:none;border:0;color:inherit;opacity:.7;text-decoration:underline;font-size:15px">Usar PIN</button>' : '') +
      '<div id="zona-pin"' + (b.cred ? ' hidden' : '') + ' style="width:100%;display:' + (b.cred ? 'none' : 'flex') + ';flex-direction:column;align-items:center">' +
      '<label class="oculto" for="pin">PIN</label><input id="pin" class="pin" type="password" inputmode="numeric" maxlength="6" placeholder="PIN" style="margin-top:' + (b.cred ? '20px' : '40px') + '">' +
      '<button class="btn sec" id="pin-ok" style="max-width:220px">Entrar con PIN</button></div></div>';
    function listo() { S.desbloqueado = true; marcarActividad(); render(); }
    if (b.cred) {
      var bio = function () {
        verificarBiometria().then(listo, function (e) {
          if (e && e.name === 'AbortError') return;
          toast(nombreBiometria() + ' no funcionó' + (e && e.name ? ' (' + e.name + ')' : '') + '. Toque otra vez o use su PIN.');
        });
      };
      document.getElementById('bio').onclick = bio;
      document.getElementById('bio2').onclick = bio;
      document.getElementById('usar-pin').onclick = function () {
        var z = document.getElementById('zona-pin'); z.hidden = false; z.style.display = 'flex'; document.getElementById('pin').focus();
      };
      // En Android se intenta solo al abrir. En iPhone no: Apple lo bloquea sin tocar un botón
      // y deja la solicitud colgada, y entonces el botón no responde.
      if (!ES_IOS) verificarBiometria().then(listo, function () { });
    }
    document.getElementById('pin-ok').onclick = function () {
      hashPin(document.getElementById('pin').value).then(function (h) {
        if (h === b.pin) listo(); else toast('PIN incorrecto');
      });
    };
  }
  /** Pide Face ID / huella antes de algo delicado (ver contraseñas). */
  function confirmarIdentidad() {
    var b = bloqueo();
    // Sin Face ID / huella activado en este celular no se pueden ver contraseñas
    if (!b && !DEMO) {
      toast('Primero active ' + nombreBiometria() + ' en Ajustes');
      setTimeout(function () { ir('#/ajustes'); }, 900);
      return Promise.reject(new Error('cancelado'));
    }
    if (!b) return Promise.resolve(true);
    // Una vez confirmado, no se vuelve a pedir durante 5 minutos (para ver varias contraseñas seguidas)
    if (S.identidadHasta && Date.now() < S.identidadHasta) return Promise.resolve(true);
    var ok = function () { S.identidadHasta = Date.now() + 5 * 60000; return true; };
    if (b.cred) return verificarBiometria().then(ok, function () { return pedirPin(b).then(ok); });
    return pedirPin(b).then(ok);
  }
  /** Copiar texto. En iPhone hay que empezar a copiar en el mismo toque, aunque el texto llegue después. */
  function copiarTexto(textoOPromesa) {
    var p = Promise.resolve(textoOPromesa);
    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        return navigator.clipboard.write([new ClipboardItem({ 'text/plain': p.then(function (t) { return new Blob([t], { type: 'text/plain' }); }) })]);
      }
    } catch (e) { }
    return p.then(function (t) { return navigator.clipboard.writeText(t); });
  }
  function pedirPin(b) {
    var p = window.prompt('Escriba su PIN');
    if (!p) return Promise.reject(new Error('cancelado'));
    return hashPin(p).then(function (h) { if (h !== b.pin) throw new Error('PIN incorrecto'); return true; });
  }

  /* ---------------- Notificaciones (OneSignal) ---------------- */

  function iniciarNotificaciones() {
    if (DEMO || !CFG.ONESIGNAL_APP_ID || !S.sesion) return;
    if (!window.OneSignalDeferred) {
      window.OneSignalDeferred = [];
      var s = document.createElement('script');
      s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; s.defer = true;
      document.head.appendChild(s);
      window.OneSignalDeferred.push(function (OneSignal) {
        var base = location.pathname.replace(/[^/]*$/, '').replace(/^\//, '');
        return OneSignal.init({ appId: CFG.ONESIGNAL_APP_ID, serviceWorkerPath: base + 'OneSignalSDKWorker.js', serviceWorkerParam: { scope: '/' + base } });
      });
    }
    window.OneSignalDeferred.push(function (OneSignal) { return OneSignal.login(S.sesion.correo); });
  }
  function pedirPermisoNotificaciones() {
    if (DEMO || !CFG.ONESIGNAL_APP_ID) { toast('Las notificaciones se activan cuando la app esté conectada.'); return; }
    iniciarNotificaciones();
    window.OneSignalDeferred.push(function (OneSignal) {
      return OneSignal.Notifications.requestPermission().then(function () { toast('Listo, recibirá las alertas en este celular.'); });
    });
  }

  /* ---------------- Datos de apoyo ---------------- */

  function cliente(u) { return (S.datos.clientes || []).filter(function (c) { return c.usuario === u; })[0]; }
  function configLogica() {
    var c = S.datos.config, out = {};
    for (var k in CONFIG_POR_DEFECTO) out[k] = CONFIG_POR_DEFECTO[k];
    out.precio_1 = c.precios[1]; out.precio_2 = c.precios[2]; out.precio_3 = c.precios[3]; out.precio_5 = c.precios[5];
    out.regalia_3 = c.regalias[3]; out.regalia_6 = c.regalias[6]; out.regalia_12 = c.regalias[12];
    out.tolerancia = c.tolerancia; out.redondeo = c.redondeo; out.costo_credito = c.costo_credito;
    out.telefono_jonathan = c.telefono_jonathan; out.telefono_fernando = c.telefono_fernando;
    out.tipo_cambio_respaldo = c.tipo_cambio_respaldo;
    return out;
  }
  function chipEstado(c) {
    if (c.estado === 'Vencido') return '<span class="chip rojo">Vencido</span>';
    if (c.estado === 'Excliente') return '<span class="chip">Excliente</span>';
    if (c.estado === 'Revendedor') return '<span class="chip">Revendedor</span>';
    if (c.dias === null) return '<span class="chip">Sin fecha</span>';
    var t = c.dias === 0 ? 'Hoy' : plural(c.dias, 'día', 'días');
    return '<span class="chip ' + (c.dias <= 30 ? 'beige' : '') + '">' + t + '</span>';
  }
  function lineaCliente(c) {
    var partes = [c.dispositivos + ' disp.'];
    if (c.vence) partes.push((c.estado === 'Vencido' ? 'venció el ' : 'vence el ') + fechaCorta(c.vence).slice(0, 5));
    if (c.debe > 0) partes.push('debe ' + colones(c.debe));
    var rojo = c.estado === 'Vencido' || c.debe > 0;
    return '<a class="fila" href="#/cliente/' + encodeURIComponent(c.usuario) + '"><span class="txt"><span class="t1">' + esc(c.usuario) +
      (c.nombre ? ' · ' + esc(c.nombre) : '') + '</span><span class="t2' + (rojo ? ' rojo' : '') + '">' + esc(partes.join(' · ')) + '</span></span>' + chipEstado(c) + '</a>';
  }
  function activos() {
    return ordenarPorVencimiento(S.datos.clientes.filter(function (c) { return c.estado !== 'Excliente' && c.estado !== 'Revendedor'; }));
  }

  /* ---------------- Pantallas ---------------- */

  function pInicio() {
    var d = S.datos, lista = activos();
    var nVenc = lista.filter(function (c) { return c.estado === 'Vencido'; }).length;
    var nPor = lista.filter(function (c) { return c.estado === 'Por vencer'; }).length;
    return banner() +
      '<div class="top"><div><div class="fecha">' + esc(fechaLarga()) + '</div><h1>Inicio</h1>' +
      (DEMO ? '' : '<button id="sync" class="sync" aria-label="Actualizar ahora">' + esc(textoSync()) + '</button>') + '</div><div class="acciones-top">' +
      '<a class="icon-btn" href="#/ajustes" aria-label="Ajustes">' + ico('gear') + '</a>' +
      '<a class="icon-btn" href="#/alertas" aria-label="Alertas: ' + d.alertas.length + '">' + ico('bell') +
      (d.alertas.length ? '<span class="badge">' + d.alertas.length + '</span>' : '') + '</a></div></div>' +
      '<div class="tiles"><a class="tile" href="#/clientes"><span>Activos</span><b>' + (lista.length - nVenc) + '</b></a>' +
      '<a class="tile beige" href="#/clientes/porvencer"><span>Vencen en 30 días</span><b>' + nPor + '</b></a>' +
      '<a class="tile rojo" href="#/clientes/vencidos"><span>Vencidos</span><b>' + nVenc + '</b></a></div>' +
      '<div class="seccion"><h2>Usuarios por vencimiento</h2><a class="btn chico" href="#/nuevo">+ Nuevo cliente</a></div>' +
      '<div class="card">' + (lista.length ? lista.map(lineaCliente).join('') : '<div class="vacio">Sin clientes activos</div>') + '</div>';
  }

  function pAlertas() {
    var a = S.datos.alertas;
    return barra('Alertas', '#/inicio') + '<p class="nota" style="margin:0 0 10px">Cosas que revisar en el negocio</p>' +
      (a.length ? '<div class="card">' + a.map(function (x) {
        var href = x.usuario ? ((x.tipo === 'Vencido' || x.tipo === 'Por vencer') ? '#/mensaje/' : x.tipo === 'Cobro' ? '#/deuda/' : '#/cliente/') + encodeURIComponent(x.usuario) :
          x.tipo === 'Gasto fijo' ? '#/gasto/adobe' : (x.tipo === 'Créditos' || x.tipo === 'Depósito') ? '#/finanzas' : '#/inicio';
        return '<a class="fila" href="' + href + '"><span class="punto ' + x.nivel + '"></span><span class="txt"><span class="t2" style="font-weight:700;text-transform:uppercase;letter-spacing:.4px;font-size:11px">' +
          esc(x.tipo) + '</span><span class="t1">' + esc(x.titulo) + '</span><span class="t2">' + esc(x.detalle) + '</span></span></a>';
      }).join('') + '</div>' : '<div class="card"><div class="vacio">Todo en orden. No hay alertas.</div></div>');
  }

  function pClientes(filtroRuta) {
    if (filtroRuta === 'porvencer') S.filtro = 'Por vencer';
    if (filtroRuta === 'vencidos') S.filtro = 'Vencidos';
    var todos = S.datos.clientes;
    var grupos = {
      'Activos': todos.filter(function (c) { return c.estado === 'Activo' || c.estado === 'Por vencer'; }),
      'Por vencer': todos.filter(function (c) { return c.estado === 'Por vencer'; }),
      'Vencidos': todos.filter(function (c) { return c.estado === 'Vencido'; }),
      'Exclientes': todos.filter(function (c) { return c.estado === 'Excliente'; }),
      'Todos': todos
    };
    var lista = buscarClientes(S.busqueda ? todos : grupos[S.filtro], S.busqueda);
    lista = S.filtro === 'Exclientes' && !S.busqueda ? lista.slice().sort(function (a, b) { return a.ultimoPago < b.ultimoPago ? 1 : -1; }) : ordenarPorVencimiento(lista);
    return banner() + '<div class="top"><h1>Clientes</h1><div style="display:flex;gap:8px"><a class="btn chico sec" href="#/promo">Promo</a><a class="btn chico" href="#/nuevo">+ Nuevo</a></div></div>' +
      '<label class="oculto" for="q">Buscar por nombre, usuario o teléfono</label><div class="buscar">' + ico('buscar') +
      '<input id="q" type="search" autocomplete="off" placeholder="Buscar por nombre, usuario o teléfono" value="' + esc(S.busqueda) + '"></div>' +
      '<div class="filtros">' + Object.keys(grupos).map(function (k) {
        return '<button class="filtro' + (S.filtro === k && !S.busqueda ? ' sel' : '') + '" data-filtro="' + k + '">' + k + ' ' + grupos[k].length + '</button>';
      }).join('') + '</div>' +
      '<a class="aviso" href="#/lista" style="text-decoration:none;color:inherit;margin-top:8px;background:var(--gris-bg,#EFEEEC);color:var(--texto)">' + ico('lista') +
      '<div><b>Listado general</b>Todos los usuarios con contraseña y vencimiento</div></a>' +
      '<div class="card" style="margin-top:8px" id="lista">' + (lista.length ? lista.map(function (c) {
        if (c.estado === 'Excliente') {
          return '<div class="fila"><a class="txt" style="text-decoration:none;color:inherit" href="#/cliente/' + encodeURIComponent(c.usuario) + '"><span class="t1">' + esc(c.usuario) +
            (c.nombre ? ' · ' + esc(c.nombre) : '') + '</span><span class="t2">Último pago: ' + (c.ultimoPago ? fechaCorta(c.ultimoPago) : '—') + ' · ' + c.dispositivos + ' disp.</span></a>' +
            (c.telefono ? '<button class="btn chico verde" data-oferta="' + esc(c.usuario) + '">Enviar oferta</button>' : '<span class="chip">Sin teléfono</span>') + '</div>';
        }
        return lineaCliente(c);
      }).join('') : '<div class="vacio">No se encontró ningún cliente</div>') + '</div>';
  }

  function pCliente(u) {
    var c = cliente(u); if (!c) return barra('Cliente', '#/clientes') + '<div class="vacio">No se encontró ' + esc(u) + '</div>';
    var cfg = configLogica(), tc = S.datos.tipoCambio;
    var precio = calcularCobro(cfg, { dispositivos: c.dispositivos, meses: 1, tipoCambio: tc, hoy: S.datos.hoy, venceActual: c.vence }).esperado;
    var cobros = S.datos.cobros.filter(function (x) { return x.Usuario === u; }).slice(0, 12);
    var chipE = c.estado === 'Vencido' ? '<span class="chip rojo">Vencido desde ' + fechaCorta(c.vence) + '</span>' :
      c.vence ? '<span class="chip ' + (c.estado === 'Por vencer' ? 'beige' : '') + '">' + (c.estado === 'Excliente' ? 'Excliente · venció ' : 'Vence el ') + fechaCorta(c.vence) + '</span>' : '<span class="chip">' + esc(c.estado) + '</span>';
    return barra('Ficha del cliente', '#/clientes') +
      '<div class="ficha-nombre" style="display:flex;align-items:center;gap:6px">' + esc(c.usuario) +
        '<button class="icon-btn plano" id="usr-copiar" aria-label="Copiar usuario">' + ico('copiar') + '</button></div><div class="chips">' + chipE + (c.idPanel ? '<span class="chip">ID ' + esc(c.idPanel) + '</span>' : '') +
      (c.nombre ? '<span class="chip">' + esc(c.nombre) + '</span>' : '') + '</div>' +
      (c.debe > 0 ? '<div class="aviso rojo" style="margin-top:14px">' + ico('alerta') + '<div style="flex:1"><b>Debe ' + colones(c.debe) + '</b>Cobros pendientes registrados en la app.</div>' +
        '<a class="btn chico" style="align-self:center;white-space:nowrap" href="#/deuda/' + encodeURIComponent(u) + '">Registrar pago</a></div>' : '') +
      (c.estado === 'Excliente' ? '<div class="aviso" style="margin-top:14px">' + ico('alerta') + '<div style="flex:1"><b>Está en exclientes</b>¿Fue un error? Puede volver a dejarlo activo.</div>' +
        '<button class="btn chico" id="reactivar" style="align-self:center;white-space:nowrap">Reactivar</button></div>' : '') +
      '<div class="card" style="margin-top:14px">' +
      '<div class="dato"><span class="l">Dispositivos</span><span class="v">' + c.dispositivos + '</span></div>' +
      '<div class="dato"><span class="l">Precio por mes hoy</span><span class="v">' + colones(precio) + '</span></div>' +
      '<div class="dato"><span class="l">Teléfono</span><span class="v">' + esc(c.telefono || '—') + '</span></div>' +
      '<div class="dato"><span class="l">Revendedor</span><span class="v">' + esc(c.revendedor || '—') + '</span></div>' +
      '<div class="dato"><span class="l">Total pagado</span><span class="v">' + colones(c.totalPagado) + '</span></div>' +
      (c.tieneContrasena ? '<div class="dato"><span class="l">Contraseña<br><small>' + nombreBiometria() + ' o PIN</small></span><span class="v" style="display:flex;align-items:center">' +
        '<span class="secreto" id="pw">••••••••</span><button class="icon-btn plano" id="pw-ver" aria-label="Ver contraseña">' + ico('ojo') + '</button>' +
        '<button class="icon-btn plano" id="pw-copiar" aria-label="Copiar contraseña">' + ico('copiar') + '</button>' +
        (c.telefono ? '<button class="icon-btn plano" id="pw-enviar" aria-label="Enviar datos de acceso por WhatsApp" style="color:var(--verde)">' + ico('wa') + '</button>' : '') + '</span></div>' : '') +
      '</div>' +
      '<div class="dos" style="margin-top:14px">' +
      (c.telefono ? '<a class="btn verde" href="#/mensaje/' + encodeURIComponent(u) + '">' + ico('wa', '') + 'Cobrar por WhatsApp</a>' : '<span></span>') +
      '<a class="btn" href="#/cobro/' + encodeURIComponent(u) + '">Registrar cobro</a></div>' +
      '<div class="seccion"><h2>Historial de cobros</h2></div><div class="card">' +
      (cobros.length ? cobros.map(function (x) {
        var chip = x.Estado === 'Pagado' ? 'verde' : x.Estado === 'Pendiente' ? 'naranja' : '';
        var det = [x.Meses ? plural(numero(x.Meses), 'mes', 'meses') + (numero(x['Regalía']) ? ' +' + x['Regalía'] + ' gratis' : '') : x.Tipo, x['Forma de pago'], x['Cobró'] ? 'cobró ' + x['Cobró'] : ''].filter(Boolean).join(' · ');
        return '<div class="fila"><span class="txt"><span class="t1">' + fechaCorta(x.Fecha) + ' · ' + colones(numero(x.Monto)) + '</span><span class="t2">' + esc(det) + '</span></span>' +
          (x.Comprobante ? '<button class="btn chico sec" data-comp="' + esc(x.ID) + '">Comprobante</button>' : '') + '<span class="chip ' + chip + '">' + esc(x.Estado) + '</span></div>';
      }).join('') : '<div class="vacio">Sin cobros registrados</div>') + '</div>';
  }

  function pMensaje(u) {
    var c = cliente(u); if (!c) return pCliente(u);
    var texto = mensajeCobro(configLogica(), c, S.datos.tipoCambio, S.datos.hoy);
    return barra('Mensaje para ' + u, '#/cliente/' + encodeURIComponent(u)) +
      '<p class="nota" style="margin:0 0 10px">Puede editarlo antes de enviarlo. Se abre WhatsApp y usted solo toca enviar.</p>' +
      '<label class="oculto" for="msg">Mensaje</label><textarea id="msg" class="input">' + esc(texto) + '</textarea>' +
      '<button class="btn verde" id="enviar-wa" style="margin-top:12px"' + (c.telefono ? '' : ' disabled') + '>' + ico('wa', '') + 'Abrir WhatsApp y enviar</button>' +
      (c.telefono ? '' : '<p class="nota">Este cliente no tiene teléfono registrado.</p>') +
      '<div class="card pad" style="margin-top:16px"><b style="font-size:14px">¿Qué respondió?</b>' +
      '<div class="opciones c3" style="margin-top:10px"><a class="op" style="text-decoration:none;background:var(--verde-bg);color:var(--verde-txt)" href="#/cobro/' + encodeURIComponent(u) + '">Renueva</a>' +
      '<button class="op" data-resp="No renueva">No renueva</button><button class="op" data-resp="Sin respuesta">Sin respuesta</button></div>' +
      '<p class="nota" style="margin:10px 0 0">Renueva: abre el cobro. Sin respuesta: la alerta se quita y vuelve en ' + (numero(S.datos.config.dias_reaviso) || 3) + ' días si no ha pagado. No renueva: pasa a exclientes.</p></div>';
  }

  /* --- Registrar cobro --- */
  function nuevoBorrador(u) {
    var c = cliente(u);
    return { usuario: u, dispositivos: c ? c.dispositivos : 1, meses: 1, monto: null, forma: 'SINPE', enPanel: true, enSobre: true,
      estado: 'Pagado', tipoCambio: S.datos.tipoCambio, mas: false };
  }
  function pCobro(u) {
    if (!u) {
      return barra('Registrar cobro', '#/inicio', 'cerrar') + '<p class="nota" style="margin:0 0 10px">¿A quién le va a registrar el cobro?</p>' +
        '<label class="oculto" for="q2">Buscar cliente</label><div class="buscar">' + ico('buscar') + '<input id="q2" type="search" autocomplete="off" placeholder="Buscar por nombre, usuario o teléfono"></div>' +
        '<div class="card" style="margin-top:10px" id="lista-cobro">' + listaElegir('') + '</div>';
    }
    var c = cliente(u); if (!c) return pCobro(null);
    if (!S.cobro || S.cobro.usuario !== u) S.cobro = nuevoBorrador(u);
    var b = S.cobro, cfg = configLogica();
    var calc = calcularCobro(cfg, { dispositivos: b.dispositivos, meses: b.meses, tipoCambio: b.tipoCambio, hoy: S.datos.hoy, venceActual: c.vence });
    var monto = b.monto === null ? calc.esperado : b.monto;
    var ev = evaluarPago(cfg, calc.esperado, monto);
    var regs = S.datos.config.regalias;
    function opDisp(n) { return '<button class="op' + (Number(b.dispositivos) === n ? ' sel' : '') + '" data-disp="' + n + '">' + n + '</button>'; }
    function opMes(n) { var r = regs[n]; return '<button class="op' + (b.meses === n ? ' sel' : '') + '" data-mes="' + n + '">' + n + (r ? '<small>+' + r + ' gratis</small>' : '') + '</button>'; }
    var evTxt = ev.tipo === 'extra' ? '<span style="color:var(--verde-txt);font-weight:600">' + esc(ev.nota) + ' · entra al sobre como ingreso</span>' :
      ev.tipo === 'redondeo' ? '<span>' + esc(ev.nota) + ' · dentro del margen, sin alerta</span>' :
      ev.tipo === 'pendiente' ? '<span style="color:var(--rojo-txt);font-weight:600">' + esc(ev.nota) + ' · quedará pendiente</span>' : '';
    return barra('Registrar cobro', '#/cliente/' + encodeURIComponent(u), 'cerrar') +
      '<div class="form">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:17px;font-weight:700">' + esc(u) + '</div>' +
      '<div class="nota">' + (c.vence ? (calc.yaVencido ? 'Venció el ' : 'Vence el ') + fechaCorta(c.vence) : 'Sin fecha de vencimiento') + '</div></div>' +
      '<a class="btn chico sec" href="#/cobro">Cambiar cliente</a></div>' +
      '<div><div class="campo" style="font-size:13px;font-weight:600;color:var(--medio);margin-bottom:8px">Dispositivos' + (Number(b.dispositivos) !== Number(c.dispositivos) ? ' · cambia de ' + c.dispositivos + ' a ' + b.dispositivos : '') + '</div>' +
      '<div class="opciones c4">' + [1, 2, 3, 5].map(opDisp).join('') + '</div></div>' +
      '<div><div style="font-size:13px;font-weight:600;color:var(--medio);margin-bottom:8px">Meses</div><div class="opciones c4">' + [1, 3, 6, 12].map(opMes).join('') + '</div></div>' +
      '<div class="card pad" style="display:flex;flex-direction:column;gap:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><label for="monto" style="display:flex;flex-direction:column;gap:3px"><b style="font-size:15px">Monto que pagó</b><span class="nota">Precio: ' + colones(calc.esperado) + '</span></label>' +
      '<input id="monto" class="monto" inputmode="numeric" value="' + colones(monto) + '"></div>' +
      '<div class="nota">' + plural(calc.mesesPanel, 'mes', 'meses') + ' en el panel · nueva fecha <b style="color:var(--verde-txt)">' + fechaCorta(calc.venceNuevo) + '</b> · usa ' + plural(calc.creditos, 'crédito', 'créditos') + '</div>' +
      (evTxt ? '<div class="nota">' + evTxt + '</div>' : '') +
      '<button class="btn chico sec" id="tc" style="align-self:flex-start">Cambio BCR hoy: ' + colones(b.tipoCambio) + ' ' + ico('lapiz', '') + '</button></div>' +
      '<div class="opciones c2"><button class="op' + (b.forma === 'SINPE' ? ' sel' : '') + '" data-forma="SINPE">SINPE</button><button class="op' + (b.forma === 'Efectivo' ? ' sel' : '') + '" data-forma="Efectivo">Efectivo</button></div>' +
      '<label class="check"><input type="checkbox" id="en-panel"' + (b.enPanel ? ' checked' : '') + '>Ya renové en XtreamAI</label>' +
      '<label class="check" style="margin-top:-8px"><input type="checkbox" id="en-sobre"' + (b.enSobre ? ' checked' : '') + '>Ya está en el sobre BCR</label>' +
      (b.mas ? '<div><div style="font-size:13px;font-weight:600;color:var(--medio);margin-bottom:8px">Estado del cobro</div><div class="opciones c3">' +
        ['Pagado', 'Pendiente', 'Incobrable'].map(function (e) { return '<button class="op' + (b.estado === e ? ' sel' : '') + '" data-estado="' + e + '">' + e + '</button>'; }).join('') + '</div></div>' :
        '<button class="btn chico sec" id="mas" style="align-self:flex-start;border:none;padding:0;background:none;text-decoration:underline">Más opciones (pendiente, incobrable…)</button>') +
      '<div class="pie-fijo"><button class="btn" id="guardar">Guardar cobro</button><p class="nota" style="text-align:center;margin:8px 0 0">Cobrado por ' + esc(S.datos.socio) + '</p></div>' +
      '</div>';
  }
  function listaElegir(q) {
    var l = buscarClientes(S.datos.clientes.filter(function (c) { return c.estado !== 'Revendedor'; }), q);
    l = q ? l : ordenarPorVencimiento(l.filter(function (c) { return c.estado !== 'Excliente'; }));
    return l.slice(0, 30).map(function (c) {
      return '<a class="fila" href="#/cobro/' + encodeURIComponent(c.usuario) + '"><span class="txt"><span class="t1">' + esc(c.usuario) + (c.nombre ? ' · ' + esc(c.nombre) : '') +
        '</span><span class="t2">' + c.dispositivos + ' disp.' + (c.vence ? ' · vence ' + fechaCorta(c.vence) : '') + '</span></span>' + chipEstado(c) + '</a>';
    }).join('') || '<div class="vacio">No se encontró ningún cliente</div>';
  }

  /* --- Comprobante --- */
  function pComprobante() {
    var k = S.comprobante; if (!k) return pInicio();
    var regalia = k.regalia ? ' <span style="color:#FF7A4D">+' + k.regalia + ' gratis</span>' : '';
    return '<div class="top"><div style="display:flex;gap:12px;align-items:center"><span class="icon-btn" style="background:var(--verde-bg);border:none;color:var(--verde)">' + ico('check') + '</span>' +
      '<div><h1 style="font-size:20px">Cobro guardado</h1><div class="nota">Este es el comprobante para el cliente</div></div></div></div>' +
      '<div class="comp" id="comp"><div style="display:flex;justify-content:space-between"><div><div class="k">COMPROBANTE DE PAGO</div><div class="n">N.º ' + String(k.numero).padStart(4, '0') + ' · ' + fechaCorta(k.fecha) + '</div></div>' +
      '<span class="chip" style="background:#1F6B3A;color:#fff;align-self:flex-start">PAGADO</span></div>' +
      '<div class="m">' + colones(k.monto) + '</div>' +
      '<div class="r"><span>Usuario</span><span>' + esc(k.usuario) + '</span></div>' +
      '<div class="r"><span>Paquete</span><span>' + disp(k.dispositivos) + '</span></div>' +
      '<div class="r"><span>Pagó</span><span>' + plural(k.meses, 'mes', 'meses') + regalia + '</span></div>' +
      '<div class="r"><span>Vence el</span><span>' + fechaCorta(k.vence) + '</span></div>' +
      '<div class="r"><span>Forma de pago</span><span>' + esc(k.forma === 'SINPE' ? 'SINPE Móvil' : k.forma) + ' · recibió ' + esc(k.recibio) + '</span></div>' +
      '<div class="g">¡Gracias por su pago!<small>Jonathan ' + esc(k.telefonos.jonathan) + ' · Fernando ' + esc(k.telefonos.fernando) + '</small></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:18px">' +
      '<button class="btn verde" id="comp-wa">' + ico('wa', '') + 'Enviar foto por WhatsApp</button>' +
      '<div class="dos"><button class="btn sec" id="comp-guardar">Guardar imagen</button><a class="btn sec" href="#/inicio">Listo</a></div></div>';
  }
  function dibujarComprobante(k) {
    var W = 1080, H = 1200, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    var F = '-apple-system, "Segoe UI", Roboto, Inter, Arial, sans-serif';
    x.fillStyle = '#0E1330'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#FF7A4D'; x.font = '700 34px ' + F; x.fillText('COMPROBANTE DE PAGO', 90, 150);
    x.fillStyle = '#C9CEEA'; x.font = '400 32px ' + F; x.fillText('N.º ' + String(k.numero).padStart(4, '0') + ' · ' + fechaCorta(k.fecha), 90, 200);
    x.fillStyle = '#1F6B3A'; redondo(x, W - 290, 110, 200, 64, 32); x.fill();
    x.fillStyle = '#fff'; x.font = '700 30px ' + F; x.textAlign = 'center'; x.fillText('PAGADO', W - 190, 153); x.textAlign = 'left';
    x.fillStyle = '#fff'; x.font = '700 120px ' + F; x.fillText(colones(k.monto), 90, 370);
    var filas = [['Usuario', k.usuario], ['Paquete', disp(k.dispositivos)],
      ['Pagó', plural(k.meses, 'mes', 'meses') + (k.regalia ? ' +' + k.regalia + ' gratis' : '')],
      ['Vence el', fechaCorta(k.vence)], ['Forma de pago', (k.forma === 'SINPE' ? 'SINPE Móvil' : k.forma)], ['Recibió', k.recibio]];
    var y = 450;
    filas.forEach(function (f) {
      x.strokeStyle = '#2A3366'; x.lineWidth = 2; x.beginPath(); x.moveTo(90, y); x.lineTo(W - 90, y); x.stroke();
      x.fillStyle = '#C9CEEA'; x.font = '400 38px ' + F; x.fillText(f[0], 90, y + 70);
      x.fillStyle = f[0] === 'Pagó' && k.regalia ? '#FF7A4D' : '#fff'; x.font = '700 40px ' + F; x.textAlign = 'right'; x.fillText(f[1], W - 90, y + 70); x.textAlign = 'left';
      y += 110;
    });
    x.fillStyle = '#1A2250'; redondo(x, 90, y + 40, W - 180, 200, 30); x.fill();
    x.fillStyle = '#fff'; x.font = '700 46px ' + F; x.fillText('¡Gracias por su pago!', 140, y + 125);
    x.fillStyle = '#C9CEEA'; x.font = '400 34px ' + F; x.fillText('Jonathan ' + k.telefonos.jonathan + '  ·  Fernando ' + k.telefonos.fernando, 140, y + 190);
    return new Promise(function (ok) { cv.toBlob(ok, 'image/png'); });
  }
  function redondo(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }
  function enviarComprobante(soloGuardar) {
    var k = S.comprobante;
    dibujarComprobante(k).then(function (blob) {
      var nombre = 'Comprobante-' + String(k.numero).padStart(4, '0') + '-' + k.usuario + '.png';
      var file = new File([blob], nombre, { type: 'image/png' });
      if (!soloGuardar && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Comprobante de pago', text: 'Comprobante de pago · ' + k.usuario }).catch(function () { });
        return;
      }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; a.click();
      if (!soloGuardar && k.telefono) {
        toast('Imagen guardada. Adjúntela en el chat que se abre.');
        setTimeout(function () { abrirWhatsApp(k.telefono); }, 600);
      } else toast('Imagen guardada');
    });
  }

  /** Abre WhatsApp. En iPhone se abre la app directo (sin dejar una pestaña en blanco al volver). */
  function abrirWhatsApp(tel, texto) {
    var num = tel ? telefonoWhatsApp(tel) : '', t = texto ? encodeURIComponent(texto) : '';
    if (ES_IOS) { location.href = 'whatsapp://send?' + (num ? 'phone=' + num + '&' : '') + (t ? 'text=' + t : ''); return; }
    window.open('https://wa.me/' + num + (t ? '?text=' + t : ''), '_blank');
  }
  /* --- Promoción para clientes nuevos --- */
  var PROMO = { canales: '7.467', series: '1.521', peliculas: '12.132' };
  function preciosHoy() {
    var cfg = configLogica(), tc = S.datos.tipoCambio;
    return [1, 2, 3, 5].map(function (n) {
      return { d: n, p: calcularCobro(cfg, { dispositivos: n, meses: 1, tipoCambio: tc, hoy: S.datos.hoy, venceActual: '' }).esperado };
    });
  }
  function pPromo() {
    var pr = preciosHoy(), c = S.datos.config;
    return barra('Compartir promoción', '#/clientes') +
      '<p class="nota" style="margin:0 0 12px">La imagen se arma sola con los precios de hoy.</p>' +
      '<div id="promo-vista" style="border-radius:18px;overflow:hidden;background:#0E1330;min-height:200px;display:flex;align-items:center;justify-content:center;color:#C9CEEA">Preparando imagen…</div>' +
      '<div class="card" style="margin-top:14px">' +
      '<div class="dato"><span class="l">Precios calculados con el tipo de cambio de hoy</span><span class="v">' + colones(S.datos.tipoCambio) + '</span></div></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">' +
      '<button class="btn verde" id="promo-compartir" disabled>' + ico('wa', '') + 'Enviar por WhatsApp u otra app</button>' +
      '<button class="btn sec" id="promo-guardar" disabled>Guardar imagen</button></div>' +
      '<p class="nota" style="text-align:center">Sirve para un chat, estados de WhatsApp o Facebook.</p>';
  }
  function dibujarPromo() {
    var pr = preciosHoy(), c = S.datos.config, rg = c.regalias || { 3: 1, 6: 2, 12: 3 };
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    var F = '-apple-system, "Segoe UI", Roboto, Inter, Arial, sans-serif';
    var NAR = '#FF7A4D', AZ = '#0E1330', CARD = '#1A2250', TXT2 = '#C9CEEA';
    x.fillStyle = AZ; x.fillRect(0, 0, W, H);
    // Etiqueta y "Activación inmediata"
    x.strokeStyle = NAR; x.lineWidth = 3; redondo(x, 72, 72, 472, 54, 27); x.stroke();
    x.fillStyle = NAR; x.font = '700 24px ' + F; x.fillText('IPTV · TELEVISIÓN POR INTERNET', 96, 108);
    x.fillStyle = '#fff'; redondo(x, 704, 74, 304, 50, 25); x.fill();
    x.fillStyle = AZ; x.font = '700 24px ' + F; x.textAlign = 'center'; x.fillText('⚡ Activación inmediata', 856, 108); x.textAlign = 'left';
    // Título
    x.fillStyle = '#fff'; x.font = '800 80px ' + F;
    x.fillText('Toda su TV, en todas sus', 72, 220, W - 144); x.fillText('pantallas.', 72, 302);
    // Cifras
    x.fillStyle = '#2A3366'; x.fillRect(72, 337, W - 144, 2); x.fillRect(72, 485, W - 144, 2);
    [[PROMO.canales, 'canales'], [PROMO.series, 'series'], [PROMO.peliculas, 'películas']].forEach(function (k, i) {
      var cx = 220 + i * 320; x.textAlign = 'center';
      x.fillStyle = NAR; x.font = '800 62px ' + F; x.fillText('+' + k[0], cx, 413);
      x.fillStyle = TXT2; x.font = '400 28px ' + F; x.fillText(k[1], cx, 455);
    });
    x.textAlign = 'left';
    // Precios
    x.fillStyle = TXT2; x.font = '700 26px ' + F; x.fillText('PRECIO POR MES', 72, 535);
    pr.forEach(function (p, i) {
      var bx = 72 + i * 238, bw = 222;
      x.fillStyle = CARD; redondo(x, bx, 560, bw, 176, 18); x.fill();
      x.fillStyle = '#fff'; x.font = '700 38px ' + F; x.fillText(String(p.d), bx + 22, 615);
      x.fillStyle = TXT2; x.font = '400 24px ' + F; x.fillText(p.d === 1 ? 'dispositivo' : 'dispositivos', bx + 22, 655);
      x.fillStyle = '#fff'; x.font = '800 40px ' + F; x.fillText(colones(p.p), bx + 20, 708);
    });
    // Regalías
    x.fillStyle = NAR; redondo(x, 72, 762, W - 144, 174, 24); x.fill();
    x.fillStyle = AZ; x.font = '800 36px ' + F; x.fillText('Pague por adelantado y reciba meses gratis', 104, 822);
    [[3, rg[3]], [6, rg[6]], [12, rg[12]]].forEach(function (m, i) {
      var bx = 104 + i * 296, bw = 280;
      x.fillStyle = AZ; redondo(x, bx, 850, bw, 58, 14); x.fill();
      x.textAlign = 'center'; x.font = '700 26px ' + F;
      var a = m[0] + ' meses ', b = '+' + m[1] + ' gratis', wa = x.measureText(a).width, wb = x.measureText(b).width, sx = bx + bw / 2 - (wa + wb) / 2;
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.fillText(a, sx, 888); x.fillStyle = NAR; x.fillText(b, sx + wa, 888);
    });
    // Dispositivos e internet
    x.strokeStyle = '#2A3366'; x.lineWidth = 2; redondo(x, 72, 962, 528, 156, 20); x.stroke(); redondo(x, 618, 962, 390, 156, 20); x.stroke();
    x.fillStyle = TXT2; x.font = '700 22px ' + F; x.fillText('VÉALO EN', 96, 1001); x.fillText('INTERNET RECOMENDADO', 640, 1001);
    x.strokeStyle = '#fff'; x.lineWidth = 3; x.fillStyle = '#fff'; x.font = '600 20px ' + F; x.textAlign = 'center';
    var iconos = [
      function (cx, cy) { redondo(x, cx - 12, cy - 20, 24, 40, 5); x.stroke(); x.fillRect(cx - 3, cy + 13, 6, 2); },
      function (cx, cy) { redondo(x, cx - 17, cy - 21, 34, 42, 5); x.stroke(); x.fillRect(cx - 3, cy + 14, 6, 2); },
      function (cx, cy) { redondo(x, cx - 22, cy - 18, 44, 30, 4); x.stroke(); x.fillRect(cx - 10, cy + 18, 20, 3); },
      function (cx, cy) { redondo(x, cx - 18, cy - 17, 36, 25, 3); x.stroke(); x.fillRect(cx - 25, cy + 12, 50, 3); }
    ];
    ['Celular', 'Tablet', 'Apple TV', 'Computadora'].forEach(function (t, i) {
      var cx = 152 + i * 124; iconos[i](cx, 1042); x.fillText(t, cx, 1095);
    });
    x.textAlign = 'left'; x.font = '600 24px ' + F; x.fillText('Canales HD', 640, 1045); x.fillText('Películas 4K', 640, 1092);
    x.fillStyle = NAR; x.font = '700 30px ' + F; x.textAlign = 'right'; x.fillText('10 Mbps', 984, 1047); x.fillText('100 Mbps', 984, 1094); x.textAlign = 'left';
    // Contacto
    x.fillStyle = TXT2; x.font = '700 24px ' + F; x.fillText('ESCRÍBANOS POR WHATSAPP', 72, 1172);
    x.textAlign = 'right'; x.font = '400 22px ' + F; x.fillText('Pago por SINPE Móvil', 1008, 1172); x.textAlign = 'left';
    [['Jonathan', c.telefono_jonathan], ['Fernando', c.telefono_fernando]].forEach(function (p, i) {
      var bx = 72 + i * 476;
      x.fillStyle = CARD; redondo(x, bx, 1192, 460, 94, 18); x.fill();
      x.fillStyle = TXT2; x.font = '400 22px ' + F; x.fillText(p[0], bx + 40, 1228);
      x.fillStyle = '#fff'; x.font = '800 32px ' + F; x.fillText(p[1] || '', bx + 40, 1268);
    });
    return new Promise(function (ok) { cv.toBlob(function (b) { ok({ blob: b, url: cv.toDataURL('image/png') }); }, 'image/png'); });
  }
  /** Compartir una imagen ya preparada (en iPhone tiene que ser en el mismo toque). */
  function compartirArchivo(file, titulo, soloGuardar, telefono) {
    // En iPhone, "Guardar imagen" también está en el menú de compartir
    if ((!soloGuardar || ES_IOS) && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: titulo }).catch(function () { });
      return;
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    if (!soloGuardar && telefono) {
      toast('Imagen guardada. Adjúntela en el chat que se abre.');
      setTimeout(function () { abrirWhatsApp(telefono); }, 600);
    } else toast(/iPhone|iPad/.test(navigator.userAgent) ? 'Mantenga presionada la imagen para guardarla' : 'Imagen guardada');
  }

  /* --- Nuevo cliente --- */
  function pNuevo() {
    return barra('Nuevo cliente', '#/clientes', 'cerrar') +
      '<a class="aviso" href="#/promo" style="text-decoration:none;color:inherit;margin-bottom:14px">' + ico('wa') + '<div><b>¿Todavía no se decide?</b>Envíele la imagen con los precios de hoy</div></a>' +
      '<div class="form">' +
      '<label class="campo">Usuario (igual que en XtreamAI)<input class="input" id="n-usuario" autocomplete="off" autocapitalize="off"></label>' +
      '<div class="dos"><label class="campo">WhatsApp<input class="input" id="n-tel" inputmode="tel" placeholder="8888-8888"></label>' +
      '<label class="campo">ID del panel<input class="input" id="n-id" inputmode="numeric" placeholder="Opcional"></label></div>' +
      '<label class="campo">Nombre real (opcional)<input class="input" id="n-nombre" placeholder="Para saber quién es"></label>' +
      '<label class="campo">Contraseña (la de XtreamAI)<input class="input" id="n-pw" autocomplete="off" autocapitalize="off" placeholder="Se guarda protegida"></label>' +
      '<div><div style="font-size:13px;font-weight:600;color:var(--medio);margin-bottom:8px">Dispositivos</div><div class="opciones c4">' +
      [1, 2, 3, 5].map(function (n) { return '<button class="op' + (n === 1 ? ' sel' : '') + '" data-ndisp="' + n + '">' + n + '</button>'; }).join('') + '</div></div>' +
      '<label class="campo">¿Cómo nos conoció?<select class="input" id="n-como"><option>Recomendado por un cliente</option><option>Imagen de la promo</option><option>Facebook</option><option>WhatsApp</option><option>Otro</option></select></label>' +
      '<button class="btn" id="n-guardar">Guardar y registrar cobro</button></div>';
  }

  /* --- Finanzas --- */
  function pFinanzas() {
    var r = S.datos.resumen, ctrl = r.control;
    var cuadraS = ctrl && Math.abs(ctrl.difSobre) < 1, cuadraC = ctrl && ctrl.difCreditos === 0;
    // Cuántos créditos se gastaron en los últimos 30 días, para estimar cuánto alcanzan
    var hace30 = sumarDias(S.datos.hoy, -30), uso30 = 0;
    S.datos.cobros.forEach(function (x) { if (x.Fecha >= hace30 && x.Estado !== 'Incobrable') uso30 += numero(x['Créditos']); });
    var alcanza = uso30 > 0 ? Math.floor(r.creditos / uso30) : null;
    var todoCuadra = ctrl && cuadraS && cuadraC;
    return banner() + '<div class="top"><h1>Finanzas</h1><div style="display:flex;gap:8px"><a class="btn chico sec" href="#/gasto/otro">+ Gasto</a><a class="btn chico" href="#/reportes">Reportes</a></div></div>' +
      '<div class="tiles" style="grid-template-columns:repeat(2,1fr)">' +
      '<div class="tile" style="padding:16px"><span>Créditos disponibles</span><b style="font-size:44px;line-height:1.05;margin-top:4px;color:' + (r.creditos < 30 ? 'var(--rojo-txt)' : 'var(--texto)') + '">' + r.creditos + '</b>' +
        '<span style="font-size:12px;margin-top:4px">' + (uso30 ? uso30 + ' usados en 30 días' + (alcanza !== null ? ' · alcanzan ~' + plural(alcanza, 'mes', 'meses') : '') : '') + '</span></div>' +
      '<div class="tile" style="padding:16px"><span>En el sobre BCR</span><b style="font-size:26px;line-height:1.15;margin-top:10px">' + colones(r.sobreEnBanco) + '</b>' +
        '<span style="font-size:12px;margin-top:4px">' + (r.sinDepositar ? colones(r.sinDepositar) + ' sin depositar' : 'Todo depositado') + '</span></div></div>' +
      (r.creditos < 30 ? '<div class="aviso" style="margin-top:10px">' + ico('alerta') + '<div><b>Quedan pocos créditos</b>Conviene comprar más al proveedor.</div></div>' : '') +
      '<details class="card pad" style="margin-top:10px"' + (ctrl && !todoCuadra ? ' open' : '') + '><summary style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;list-style:none">' +
        '<b style="font-size:14px">Cuadre con el banco y el panel</b>' +
        (ctrl ? '<span class="chip ' + (todoCuadra ? 'verde' : 'naranja') + '">' + (todoCuadra ? 'Cuadra ✓' : 'Revisar') + '</span>' : '<span class="chip">Sin revisar</span>') + '</summary>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        (ctrl ? '<div class="nota" style="margin:0">Última revisión: ' + fechaCorta(ctrl.fecha) + '</div>' +
          '<div class="dato"><span class="l">Sobre según la app</span><span class="v">' + colones(r.sobreEnBanco) + '</span></div>' +
          '<div class="dato"><span class="l">Sobre real en el banco</span><span class="v">' + colones(ctrl.sobreReal) + '</span></div>' +
          '<div class="dato"><span class="l">Diferencia</span><span class="v" style="color:' + (cuadraS ? 'var(--verde-txt)' : 'var(--naranja-txt)') + '">' + colones(ctrl.difSobre) + '</span></div>' +
          '<div class="dato"><span class="l">Créditos según la app</span><span class="v">' + r.creditos + '</span></div>' +
          '<div class="dato"><span class="l">Créditos en el panel</span><span class="v">' + ctrl.creditosPanel + (cuadraC ? '' : ' <small style="color:var(--naranja-txt)">(' + (ctrl.difCreditos > 0 ? '+' : '') + ctrl.difCreditos + ')</small>') + '</span></div>' : '') +
        '<button class="btn sec" id="control">Actualizar con el banco y el panel</button></div></details>' +
      '<div class="card pad" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"><b style="font-size:14px;margin-bottom:4px">Para repartir (50/50)</b>' +
      '<div class="dato"><span class="l">Hay en el sobre</span><span class="v">' + colones(r.sobre) + '</span></div>' +
      '<div class="dato"><span class="l">Reserva para créditos</span><span class="v" style="color:var(--naranja-txt);white-space:nowrap">' + colones(-r.reserva) + '</span></div>' +
      '<div class="nota" style="margin-top:-4px">' + r.usadosDesdeCompra + ' créditos usados desde la última compra × $' + S.datos.config.costo_credito + ' × cambio BCR ' + colones(r.tipoCambio) + '</div>' +
      '<div class="dato"><span class="l"><b style="color:var(--texto)">Disponible para repartir</b></span><span class="v" style="color:var(--verde-txt)">' + colones(r.disponible) + '</span></div>' +
      '<div class="nota">' + colones(r.disponible / 2) + ' para cada uno. Los retiros con aprobación llegan en la etapa 2.</div></div>' +
      '<div class="tiles" style="grid-template-columns:repeat(2,1fr);margin-top:10px"><div class="tile"><span>Pendiente por cobrar</span><b style="font-size:18px;color:var(--naranja-txt)">' + colones(r.pendiente) + '</b></div>' +
      '<div class="tile"><span>Incobrable</span><b style="font-size:18px;color:var(--suave)">' + colones(r.incobrable) + '</b></div></div>' +
      '<div class="etq" style="display:flex;justify-content:space-between;align-items:center">Movimientos del sobre<a href="#/movimientos" style="text-transform:none;letter-spacing:0;font-size:14px;color:var(--texto);font-weight:600">Ver todos ›</a></div>' +
      '<div class="card">' + movimientosSobre(S.datos.cobros, S.datos.movimientos).slice(0, 12).map(filaMov).join('') + '</div>' +
      '<p class="nota">Entradas en verde (cobros y aportes) y salidas en rojo (gastos, créditos y repartos).</p>';
  }

  /** Entradas y salidas del sobre juntas, de la más nueva a la más vieja. */
  function movimientosSobre(cobros, movs) {
    var l = [];
    cobros.forEach(function (c) {
      if (c.Estado !== 'Pagado') return;
      l.push({ fecha: String(c.Fecha).slice(0, 10), titulo: (c.Tipo === 'Pago de deuda' ? 'Pago de deuda · ' : 'Cobro · ') + c.Usuario,
        detalle: [c['Forma de pago'], c['Cobró'], c['En sobre'] === 'No' ? 'sin depositar' : ''].filter(Boolean).join(' · '), monto: numero(c.Monto), usuario: c.Usuario });
    });
    movs.forEach(function (m) {
      if (m['Afecta sobre'] === 'No') return;
      l.push({ fecha: String(m.Fecha).slice(0, 10), titulo: m.Tipo, detalle: m.Nota || m['Descripción'] || '', monto: numero(m.Monto) });
    });
    return l.sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });
  }
  function filaMov(m) {
    var pos = m.monto >= 0;
    var tag = m.usuario ? 'a' : 'div';
    return '<' + tag + ' class="fila"' + (m.usuario ? ' href="#/cliente/' + encodeURIComponent(m.usuario) + '" style="text-decoration:none;color:inherit"' : '') + '><span class="txt"><span class="t1">' + esc(m.titulo) + '</span><span class="t2">' + fechaCorta(m.fecha) + (m.detalle ? ' · ' + esc(m.detalle) : '') + '</span></span>' +
      '<b style="font-size:15px;white-space:nowrap;color:' + (pos ? 'var(--verde-txt)' : 'var(--rojo-txt)') + '">' + (pos ? '+' : '−') + colones(Math.abs(m.monto)) + '</b></' + tag + '>';
  }
  /* --- Todos los movimientos --- */
  function pMovimientos() {
    if (!S.movs) S.movs = { periodo: 'mes', filtro: 'todos' };
    var M = S.movs, rg = rangoPeriodo(M.periodo);
    if (!S.repBase) { cargarBaseReportes(); return barra('Movimientos del sobre', '#/finanzas') + '<div class="cargando">Cargando movimientos…</div>'; }
    var todos = movimientosSobre(S.repBase.cobros.map(function (c) { return c; }), S.repBase.movimientos)
      .filter(function (m) { return m.fecha >= rg.desde && m.fecha <= rg.hasta; });
    var entradas = 0, salidas = 0; todos.forEach(function (m) { if (m.monto >= 0) entradas += m.monto; else salidas += m.monto; });
    var lista = todos.filter(function (m) { return M.filtro === 'todos' || (M.filtro === 'entradas' ? m.monto >= 0 : m.monto < 0); });
    var chips = [['mes', 'Este mes'], ['anterior', 'Mes anterior'], ['anio', 'Este año'], ['todo', 'Todo']];
    return barra('Movimientos del sobre', '#/finanzas') +
      '<div class="filtros">' + chips.map(function (c) { return '<button class="filtro' + (M.periodo === c[0] ? ' sel' : '') + '" data-mper="' + c[0] + '">' + c[1] + '</button>'; }).join('') +
      '<label class="filtro' + (/^\d{4}-\d{2}$/.test(M.periodo) ? ' sel' : '') + '" style="position:relative;display:inline-flex;align-items:center">' + (/^\d{4}-\d{2}$/.test(M.periodo) ? esc(rg.nombre) : 'Escoger mes…') +
      '<input type="month" id="mmes" style="position:absolute;inset:0;opacity:0"></label></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button class="card pad" data-mfil="entradas" style="flex:1;text-align:left;font:inherit;cursor:pointer;' + (M.filtro === 'entradas' ? 'border:2px solid var(--texto)' : '') + '"><div class="nota" style="margin:0">Entradas</div><b style="font-size:19px;color:var(--verde-txt)">+' + colones(entradas) + '</b></button>' +
      '<button class="card pad" data-mfil="salidas" style="flex:1;text-align:left;font:inherit;cursor:pointer;' + (M.filtro === 'salidas' ? 'border:2px solid var(--texto)' : '') + '"><div class="nota" style="margin:0">Salidas</div><b style="font-size:19px;color:var(--rojo-txt)">−' + colones(-salidas) + '</b></button></div>' +
      '<div class="card pad" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center"><span>Diferencia en ' + esc(rg.nombre) + '</span><b style="font-size:18px;color:' + (entradas + salidas >= 0 ? 'var(--verde-txt)' : 'var(--rojo-txt)') + '">' + (entradas + salidas >= 0 ? '+' : '−') + colones(Math.abs(entradas + salidas)) + '</b></div>' +
      (M.filtro !== 'todos' ? '<p class="nota">Mostrando solo ' + M.filtro + '. <a href="#" id="mfil-x" style="color:var(--texto)">Ver todo</a></p>' : '') +
      '<div class="card" style="margin-top:10px">' + (lista.length ? lista.map(filaMov).join('') : '<div class="vacio">Sin movimientos en ' + esc(rg.nombre) + '</div>') + '</div>';
  }

  /* --- Registrar gasto --- */
  function pGasto(arg) {
    var c = S.datos.config, tc = S.datos.tipoCambio;
    if (!S.gasto || (arg && S.gasto.desde !== arg)) S.gasto = { desde: arg || '', tipo: arg === 'adobe' ? 'adobe' : (arg === 'otro' ? 'otro' : 'adobe'), fecha: S.datos.hoy, monto: null, descripcion: '', afectaSobre: true };
    var g = S.gasto, usd = numero(c.adobe_usd) || 19.99, estimado = Math.round(usd * tc);
    var monto = g.monto != null ? g.monto : (g.tipo === 'adobe' ? estimado : '');
    return barra('Registrar gasto', '#/finanzas', 'cerrar') +
      '<div class="opciones c2"><button class="op' + (g.tipo === 'adobe' ? ' sel' : '') + '" data-gtipo="adobe">Adobe</button><button class="op' + (g.tipo === 'otro' ? ' sel' : '') + '" data-gtipo="otro">Otro gasto</button></div>' +
      (g.tipo === 'adobe' ?
        '<div class="card pad" style="margin-top:12px"><div class="dato" style="border:0;padding:0"><span class="l">Adobe cobra</span><span class="v">$' + usd + '</span></div>' +
        '<div class="dato" style="border:0;padding:6px 0 0"><span class="l">Con el cambio de hoy (' + colones(tc) + ')</span><span class="v">≈ ' + colones(estimado) + '</span></div>' +
        '<div class="dato" style="border:0;padding:6px 0 0"><span class="l">Próximo pago</span><span class="v">' + (c.adobe_proximo ? fechaCorta(c.adobe_proximo) : '—') + '</span></div></div>' +
        '<p class="nota">Escriba lo que <b>de verdad</b> cobró el banco (está en el estado de la tarjeta). Así el sobre queda exacto.</p>'
        : '<div class="etq">¿En qué fue?</div><input id="g-desc" class="input" type="text" placeholder="Ej.: curso, comisión, otro servicio" value="' + esc(g.descripcion) + '">') +
      '<div class="etq">Monto en colones</div><input id="g-monto" class="input campo-monto" type="text" inputmode="decimal" value="' + (monto === '' ? '' : montoCampo(monto)) + '" placeholder="₡">' +
      '<div class="etq">Fecha del cobro</div><input id="g-fecha" class="input" type="date" value="' + esc(g.fecha) + '">' +
      '<label class="check" style="margin-top:10px"><input type="checkbox" id="g-sobre"' + (g.afectaSobre ? ' checked' : '') + '>Sale del sobre BCR</label>' +
      '<button class="btn" id="g-ok" style="margin-top:10px">Guardar gasto</button>';
  }

  /* --- Reportes --- */
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
  function rangoPeriodo(p) {
    var h = S.datos.hoy, a = Number(h.slice(0, 4)), m = Number(h.slice(5, 7));
    var dosD = function (n) { return (n < 10 ? '0' : '') + n; };
    var finMes = function (y, mm) { return sumarDias(sumarMeses(y + '-' + dosD(mm) + '-01', 1), -1); };
    if (p === 'mes') return { desde: a + '-' + dosD(m) + '-01', hasta: h, nombre: MESES[m - 1] + ' ' + a };
    if (p === 'anterior') { var y = m === 1 ? a - 1 : a, mm = m === 1 ? 12 : m - 1; return { desde: y + '-' + dosD(mm) + '-01', hasta: finMes(y, mm), nombre: MESES[mm - 1] + ' ' + y }; }
    if (p === 'anio') return { desde: a + '-01-01', hasta: h, nombre: 'año ' + a };
    if (p === 'anioant') return { desde: (a - 1) + '-01-01', hasta: (a - 1) + '-12-31', nombre: 'año ' + (a - 1) };
    if (p === 'todo') return { desde: '2000-01-01', hasta: h, nombre: 'todo' };
    if (/^\d{4}-\d{2}$/.test(p)) { var yy = Number(p.slice(0, 4)), m2 = Number(p.slice(5)); return { desde: p + '-01', hasta: finMes(yy, m2), nombre: MESES[m2 - 1] + ' ' + yy }; }
    return rangoPeriodo('mes');
  }
  function pReportes() {
    if (!S.rep) S.rep = { tab: 'pagos', periodo: 'mes' };
    var R = S.rep, rg = rangoPeriodo(R.periodo), clave = rg.desde + '|' + rg.hasta;
    // Se bajan los datos una sola vez; después cada periodo se calcula al instante en el celular
    if (!S.repBase) {
      cargarBaseReportes();
    } else if (R.clave !== clave) {
      R.datos = reporte({ cobros: S.repBase.cobros, movimientos: S.repBase.movimientos, clientes: S.repBase.clientes }, configLogica(), rg.desde, rg.hasta);
      R.clave = clave;
    }
    var d = R.clave === clave ? R.datos : null;
    var chips = [['mes', 'Este mes'], ['anterior', 'Mes anterior'], ['anio', 'Este año'], ['anioant', 'Año anterior'], ['todo', 'Todo']];
    var h = barra('Reportes', '#/finanzas') +
      '<div class="seg">' + [['pagos', 'Pagos'], ['clientes', 'Por cliente'], ['negocio', 'Negocio']].map(function (t) {
        return '<button class="' + (R.tab === t[0] ? 'sel' : '') + '" data-rtab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="filtros" style="margin-top:12px">' + chips.map(function (c) {
        return '<button class="filtro' + (R.periodo === c[0] ? ' sel' : '') + '" data-rper="' + c[0] + '">' + c[1] + '</button>';
      }).join('') +
      '<label class="filtro' + (/^\d{4}-\d{2}$/.test(R.periodo) ? ' sel' : '') + '" style="position:relative;display:inline-flex;align-items:center">' + (/^\d{4}-\d{2}$/.test(R.periodo) ? esc(rg.nombre) : 'Escoger mes…') +
      '<input type="month" id="rmes" style="position:absolute;inset:0;opacity:0" value="' + (/^\d{4}-\d{2}$/.test(R.periodo) ? R.periodo : '') + '"></label></div>';
    if (!d) return h + '<div class="cargando">Armando el reporte…</div>';
    var t = d.totales, kpi = kpiR;
    if (R.tab === 'pagos' || R.tab === 'clientes') {
      h += '<div class="buscar" style="margin-top:12px">' + ico('buscar') + '<input id="rbuscar" type="search" placeholder="Buscar por nombre, usuario o teléfono" value="' + esc(R.buscar || '') + '" autocomplete="off"></div>' +
        '<div id="rep-cuerpo">' + cuerpoReporte(d, rg) + '</div>';
    } else {
      var n = d.negocio;
      h += '<div style="display:flex;gap:8px;margin-top:12px">' + kpi('Ingresos', colones(n.ingresos), 'var(--verde-txt)') + kpi('Gastos', colones(-n.gastos), 'var(--rojo-txt)') + '</div>' +
        '<div class="card pad" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center"><b>Ganancia</b><b style="font-size:22px;color:' + (n.ganancia >= 0 ? 'var(--verde-txt)' : 'var(--rojo-txt)') + '">' + colones(n.ganancia) + '</b></div>' +
        '<div class="etq">Gastos</div><div class="card">' + (Object.keys(n.gastosPorTipo).length ? Object.keys(n.gastosPorTipo).sort(function (a, b) { return n.gastosPorTipo[a] - n.gastosPorTipo[b]; }).map(function (k) {
          return '<div class="dato"><span class="l">' + esc(k) + '</span><span class="v">' + colones(-n.gastosPorTipo[k]) + '</span></div>';
        }).join('') : '<div class="vacio">Sin gastos</div>') + '</div>' +
        '<div class="etq">Repartido 50/50</div><div class="card">' + (n.repartos.length ? n.repartos.map(function (r) {
          return '<div class="dato"><span class="l">' + fechaCorta(r.fecha) + (r.nota ? '<br><small>' + esc(r.nota) + '</small>' : '') + '</span><span class="v">' + colones(r.monto) + '</span></div>';
        }).join('') + '<div class="dato"><span class="l"><b>Total · cada socio ' + colones(n.repartido / 2) + '</b></span><span class="v"><b>' + colones(n.repartido) + '</b></span></div>' : '<div class="vacio">No hubo repartos</div>') + '</div>' +
        '<div class="card pad" style="margin-top:8px"><div class="dato" style="border:0;padding:0"><span class="l">Créditos usados</span><span class="v">' + t.creditos + '</span></div>' +
        '<div class="dato" style="border:0;padding:8px 0 0"><span class="l">Clientes nuevos</span><span class="v">' + n.nuevos.length + '</span></div></div>' +
        '<p class="nota">La compra de créditos cuenta como gasto el día que se pagó al proveedor.</p>';
    }
    h += '<div class="etq" style="margin-top:18px">Descargar o enviar este reporte</div>' +
      '<div class="opciones c3"><button class="op" id="r-pdf">PDF</button><button class="op" id="r-excel">Excel</button><button class="op" id="r-wa" style="background:var(--verde-bg);color:var(--verde-txt)">Imagen</button></div>';
    return h;
  }
  function kpiR(l, v, c) { return '<div class="card pad" style="flex:1;min-width:0"><div class="nota" style="margin:0">' + l + '</div><div style="font-weight:800;font-size:20px;color:' + (c || 'inherit') + '">' + v + '</div></div>'; }
  function filaPago(p) {
    var est = p.estado === 'Pagado' ? 'verde' : p.estado === 'Pendiente' ? 'rojo' : '';
    return '<a class="fila" style="text-decoration:none;color:inherit" href="#/cliente/' + encodeURIComponent(p.usuario) + '"><div style="width:44px;text-align:center;flex:0 0 auto"><b style="font-size:18px">' + Number(p.fecha.slice(8, 10)) + '</b><div class="nota" style="margin:0;text-transform:uppercase">' + MESES[Number(p.fecha.slice(5, 7)) - 1].slice(0, 3) + '</div></div>' +
      '<span class="txt"><span class="t1">' + esc(p.usuario) + '</span><span class="t2">' + (p.tipo === 'Pago de deuda' ? 'Pago de deuda' : (p.dispositivos ? disp(p.dispositivos) + ' · ' : '') + plural(p.meses, 'mes', 'meses') + (p.regalia ? ' +' + p.regalia : '')) + '</span></span>' +
      '<span style="text-align:right;flex:0 0 auto"><b>' + colones(p.monto) + '</b><br><span class="chip ' + est + '">' + esc(p.estado) + '</span></span></a>';
  }
  /** Usuarios que coinciden con la búsqueda (null = sin búsqueda). */
  function usuariosBuscados() {
    var q = (S.rep.buscar || '').trim(); if (!q) return null;
    var m = {}; buscarClientes(S.datos.clientes, q).forEach(function (c) { m[c.usuario] = 1; });
    var qn = q.toLowerCase(); (S.repBase ? S.repBase.cobros : []).forEach(function (c) { if (String(c.Usuario).toLowerCase().indexOf(qn) >= 0) m[c.Usuario] = 1; });
    return m;
  }
  /** Reporte de un solo cliente en el periodo. */
  function reporteCliente(u, rg) {
    return reporte({ cobros: S.repBase.cobros.filter(function (c) { return c.Usuario === u; }), movimientos: [], clientes: [] }, configLogica(), rg.desde, rg.hasta);
  }
  function cuerpoReporte(d, rg) {
    var R = S.rep, t = d.totales, h = '', sel = usuariosBuscados();
    // Un cliente escogido: su propio reporte
    if (R.cliente) {
      var dc = reporteCliente(R.cliente, rg), c = cliente(R.cliente), pc = dc.porCliente[0] || { pagos: 0, meses: 0, total: 0, pendiente: 0 };
      var debeHoy = c ? c.debe : pc.pendiente;
      return '<div class="card pad" style="margin-top:12px;display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><b style="font-size:20px">' + esc(R.cliente) + '</b>' +
        (c ? '<div class="nota" style="margin:2px 0 0">' + esc(c.nombre || '') + (c.vence ? ' · vence ' + fechaCorta(c.vence) : '') + ' · ' + esc(c.estado) + '</div>' : '') + '</div>' +
        '<button class="btn chico sec" id="rcli-x">Quitar</button></div>' +
        '<div style="display:flex;gap:8px;margin-top:8px">' + kpiR('Pagó', colones(pc.total), 'var(--verde-txt)') + kpiR('Pagos', pc.pagos) + kpiR('Meses', pc.meses) + '</div>' +
        (debeHoy ? '<div class="aviso" style="margin-top:8px">' + ico('alerta') + '<div style="flex:1"><b>Debe ' + colones(debeHoy) + '</b>Cobros pendientes</div><a class="btn chico" style="align-self:center" href="#/deuda/' + encodeURIComponent(R.cliente) + '">Registrar pago</a></div>' : '') +
        '<div class="card" style="margin-top:10px">' + (dc.pagos.length ? dc.pagos.map(filaPago).join('') : '<div class="vacio">Sin pagos en ' + esc(rg.nombre) + '</div>') + '</div>' +
        '<a class="btn sec" style="margin-top:10px" href="#/cliente/' + encodeURIComponent(R.cliente) + '">Ver ficha del cliente</a>';
    }
    if (R.tab === 'pagos') {
      var pagos = sel ? d.pagos.filter(function (p) { return sel[p.usuario]; }) : d.pagos;
      var cob = 0, pen = 0, n = 0; pagos.forEach(function (p) { if (p.estado === 'Pagado') { cob += p.monto; n++; } if (p.estado === 'Pendiente') pen += p.monto; });
      h += '<div style="display:flex;gap:8px;margin-top:12px">' + kpiR('Cobrado', colones(cob), 'var(--verde-txt)') + kpiR('Pendiente', colones(pen), pen ? 'var(--rojo-txt)' : '') + kpiR('Cobros', n) + '</div>';
      var formas = Object.keys(t.porForma).filter(function (k) { return k !== 'Sin dato'; });
      if (formas.length && !sel) h += '<p class="nota">' + formas.map(function (k) { return esc(k) + ' ' + colones(t.porForma[k]); }).join(' · ') + '</p>';
      h += '<div class="card" style="margin-top:10px">' + (pagos.length ? pagos.map(filaPago).join('') : '<div class="vacio">' + (sel ? 'Nada con esa búsqueda en ' : 'No hay cobros en ') + esc(rg.nombre) + '</div>') + '</div>';
      return h;
    }
    var lista = d.porCliente.filter(function (c) { return !sel || sel[c.usuario]; });
    if (sel && !lista.length) {
      // Buscó a alguien que no pagó en el periodo: igual se puede abrir su reporte
      var cands = Object.keys(sel).slice(0, 8);
      return '<p class="nota">Nadie con esa búsqueda pagó en ' + esc(rg.nombre) + '.</p>' + (cands.length ? '<div class="card">' + cands.map(function (u) {
        return '<button class="fila" data-rcli="' + esc(u) + '" style="width:100%;background:none;border:0;text-align:left;font:inherit;color:inherit"><span class="txt"><span class="t1">' + esc(u) + '</span><span class="t2">Ver su historial</span></span>' + ico('flecha') + '</button>';
      }).join('') + '</div>' : '');
    }
    h += '<p class="nota">' + plural(lista.filter(function (c) { return c.pagos; }).length, 'cliente pagó', 'clientes pagaron') + ' en ' + esc(rg.nombre) + (sel ? ' (con esa búsqueda)' : ', de mayor a menor') + '. Toque uno para ver su detalle.</p>';
    h += '<div class="card">' + (lista.length ? lista.map(function (c) {
      return '<button class="fila" data-rcli="' + esc(c.usuario) + '" style="width:100%;background:none;border:0;text-align:left;font:inherit;color:inherit;cursor:pointer"><span class="txt"><span class="t1">' + esc(c.usuario) + '</span><span class="t2">' +
        plural(c.pagos, 'pago', 'pagos') + ' · ' + plural(c.meses, 'mes', 'meses') + (c.ultimo ? ' · último ' + fechaCorta(c.ultimo) : '') + (c.pendiente ? ' · <span style="color:var(--rojo-txt)">debe ' + colones(c.pendiente) + '</span>' : '') + '</span></span>' +
        '<b style="flex:0 0 auto">' + colones(c.total) + '</b></button>';
    }).join('') : '<div class="vacio">Nadie pagó en ' + esc(rg.nombre) + '</div>') + '</div>';
    return h;
  }
  function cargarBaseReportes() {
    if (S.repCargando) return S.repCargando;
    S.repCargando = api('datosReporte').then(function (b) {
      S.repBase = b; S.repCargando = null; if (S.rep) S.rep.clave = null;
      if (/^#\/(reportes|movimientos)/.test(location.hash)) render();
    }, function (e) { S.repCargando = null; toast(e.message); });
    return S.repCargando;
  }
  /** Imagen del reporte (mismo estilo de la promo), para enviar por WhatsApp. */
  function dibujarReporte(d, nombre, tab) {
    var t = d.totales, n = d.negocio;
    var filas = tab === 'clientes' ? d.porCliente.filter(function (c) { return c.pagos; }).slice(0, 8).map(function (c) { return [c.usuario, plural(c.pagos, 'pago', 'pagos') + ' · ' + plural(c.meses, 'mes', 'meses'), colones(c.total), '']; })
      : tab === 'negocio' ? Object.keys(n.gastosPorTipo).map(function (k) { return [k, 'Gasto', colones(-n.gastosPorTipo[k]), '']; }).concat(n.repartos.map(function (r) { return ['Reparto 50/50', fechaCorta(r.fecha), colones(r.monto), '']; }))
      : d.pagos.slice(0, tab === 'cliente' ? 12 : 8).map(function (p) { return [p.usuario, fechaCorta(p.fecha) + ' · ' + plural(p.meses, 'mes', 'meses'), colones(p.monto), p.estado]; });
    var extra = tab === 'cliente' ? Math.max(0, d.pagos.length - 12) : tab === 'pagos' ? Math.max(0, d.pagos.length - 8) : tab === 'clientes' ? Math.max(0, d.porCliente.filter(function (c) { return c.pagos; }).length - 8) : 0;
    var W = 1080, top = 600, rowH = 92, H = top + 90 + Math.max(1, filas.length) * rowH + (extra ? 60 : 0) + 120;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
    var F = '-apple-system, "Segoe UI", Roboto, Inter, Arial, sans-serif', NAR = '#FF7A4D', AZ = '#0E1330', CARD = '#1A2250', T2 = '#C9CEEA', VERDE = '#5BD38A', ROJO = '#FF8A80';
    x.fillStyle = AZ; x.fillRect(0, 0, W, H);
    x.fillStyle = NAR; x.font = '700 26px ' + F; x.fillText('REPORTE IPTV', 72, 100);
    x.fillStyle = '#fff'; x.font = '800 64px ' + F; x.fillText(tab === 'cliente' ? nombre : nombre.charAt(0).toUpperCase() + nombre.slice(1), 72, 175, W - 144);
    x.fillStyle = T2; x.font = '400 26px ' + F; x.fillText(fechaCorta(d.desde < '2001' ? (d.pagos.length ? d.pagos[d.pagos.length - 1].fecha : d.hasta) : d.desde) + ' al ' + fechaCorta(d.hasta), 72, 218);
    var kp = function (bx, by, bw, l, v, c) {
      x.fillStyle = CARD; redondo(x, bx, by, bw, 130, 20); x.fill();
      x.fillStyle = T2; x.font = '400 24px ' + F; x.fillText(l, bx + 28, by + 46);
      x.fillStyle = c || '#fff'; x.font = '800 42px ' + F; x.fillText(v, bx + 28, by + 100, bw - 50);
    };
    var bw3 = (W - 144 - 32) / 3;
    kp(72, 250, bw3, 'Cobrado', colones(t.cobrado), VERDE);
    kp(72 + bw3 + 16, 250, bw3, 'Pendiente', colones(t.pendiente), t.pendiente ? ROJO : '#fff');
    kp(72 + (bw3 + 16) * 2, 250, bw3, 'Cobros', String(t.cobros));
    if (tab === 'cliente') {
      var meses = d.pagos.reduce(function (a, p) { return a + (p.estado === 'Pagado' ? p.meses : 0); }, 0);
      var ult = d.pagos.filter(function (p) { return p.estado === 'Pagado'; })[0];
      kp(72, 396, bw3, 'Meses pagados', String(meses));
      kp(72 + bw3 + 16, 396, bw3, 'Último pago', ult ? fechaCorta(ult.fecha) : '—');
      kp(72 + (bw3 + 16) * 2, 396, bw3, 'Créditos usados', String(t.creditos));
    } else {
      kp(72, 396, bw3, 'Gastos', colones(-n.gastos), ROJO);
      kp(72 + bw3 + 16, 396, bw3, 'Ganancia', colones(n.ganancia), n.ganancia >= 0 ? VERDE : ROJO);
      kp(72 + (bw3 + 16) * 2, 396, bw3, 'Créditos usados', String(t.creditos));
    }
    x.fillStyle = T2; x.font = '700 24px ' + F;
    x.fillText(tab === 'clientes' ? 'CLIENTES QUE MÁS PAGARON' : tab === 'negocio' ? 'GASTOS Y REPARTOS' : 'PAGOS', 72, top + 20);
    if (n.repartido && tab !== 'cliente') { x.textAlign = 'right'; x.fillStyle = NAR; x.fillText('Repartido: ' + colones(n.repartido / 2) + ' c/u', W - 72, top + 20); x.textAlign = 'left'; }
    x.fillStyle = CARD; redondo(x, 72, top + 44, W - 144, Math.max(1, filas.length) * rowH + 16, 22); x.fill();
    if (!filas.length) { x.fillStyle = T2; x.font = '400 28px ' + F; x.fillText('Sin movimientos en este periodo', 108, top + 44 + 60); }
    filas.forEach(function (f, i) {
      var y = top + 44 + 8 + i * rowH;
      if (i) { x.fillStyle = '#2A3366'; x.fillRect(108, y, W - 216, 2); }
      x.fillStyle = '#fff'; x.font = '700 32px ' + F; x.fillText(f[0], 108, y + 42, 560);
      x.fillStyle = T2; x.font = '400 24px ' + F; x.fillText(f[1], 108, y + 76, 560);
      x.textAlign = 'right'; x.fillStyle = '#fff'; x.font = '800 32px ' + F; x.fillText(f[2], W - 108, y + (f[3] ? 42 : 56));
      if (f[3]) { x.font = '700 22px ' + F; x.fillStyle = f[3] === 'Pagado' ? VERDE : f[3] === 'Pendiente' ? ROJO : T2; x.fillText(f[3], W - 108, y + 76); }
      x.textAlign = 'left';
    });
    var yEnd = top + 44 + Math.max(1, filas.length) * rowH + 16;
    if (extra) { x.fillStyle = T2; x.font = '400 24px ' + F; x.fillText('… y ' + extra + ' más', 108, yEnd + 44); }
    x.fillStyle = '#5A6396'; x.font = '400 22px ' + F; x.textAlign = 'center'; x.fillText('Generado el ' + fechaCorta(S.datos.hoy) + ' · App IPTV', W / 2, H - 50); x.textAlign = 'left';
    return new Promise(function (ok) { cv.toBlob(ok, 'image/png'); });
  }
  function textoReporte(d, nombre) {
    var t = d.totales, n = d.negocio;
    return 'Reporte IPTV · ' + nombre + '\n\n' +
      'Cobrado: ' + colones(t.cobrado) + ' (' + plural(t.cobros, 'cobro', 'cobros') + ')\n' +
      (t.pendiente ? 'Pendiente: ' + colones(t.pendiente) + '\n' : '') +
      'Gastos: ' + colones(-n.gastos) + '\n' +
      'Ganancia: ' + colones(n.ganancia) + '\n' +
      (n.repartido ? 'Repartido 50/50: ' + colones(n.repartido) + ' (' + colones(n.repartido / 2) + ' c/u)\n' : '') +
      'Créditos usados: ' + t.creditos + '\n' +
      (n.nuevos.length ? 'Clientes nuevos: ' + n.nuevos.length + '\n' : '');
  }
  function csvReporte(d, tab) {
    var q = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var filas;
    if (tab === 'clientes') filas = [['Usuario', 'Pagos', 'Meses', 'Total pagado', 'Debe', 'Último pago']].concat(d.porCliente.map(function (c) { return [c.usuario, c.pagos, c.meses, Math.round(c.total), Math.round(c.pendiente), fechaCorta(c.ultimo)]; }));
    else if (tab === 'negocio') {
      var n = d.negocio;
      filas = [['Concepto', 'Monto']].concat([['Ingresos', Math.round(n.ingresos)]],
        Object.keys(n.gastosPorTipo).map(function (k) { return ['Gasto: ' + k, Math.round(n.gastosPorTipo[k])]; }),
        [['Ganancia', Math.round(n.ganancia)], ['Repartido 50/50', Math.round(n.repartido)], ['Créditos usados', d.totales.creditos], ['Clientes nuevos', n.nuevos.length]]);
    } else filas = [['Fecha', 'Usuario', 'Tipo', 'Dispositivos', 'Meses', 'Regalía', 'Monto', 'Estado', 'Forma de pago', 'Cobró']].concat(d.pagos.map(function (p) {
      return [fechaCorta(p.fecha), p.usuario, p.tipo, p.dispositivos || '', p.meses, p.regalia || '', Math.round(p.monto), p.estado, p.forma, p.cobro];
    }));
    return '﻿' + filas.map(function (f) { return f.map(q).join(';'); }).join('\r\n');
  }

  /* --- Listado general: usuarios, contraseñas y vencimientos --- */
  function pLista() {
    var incluirEx = !!S.listaEx;
    var lista = ordenarPorVencimiento(S.datos.clientes.filter(function (c) { return incluirEx || c.estado !== 'Excliente'; }));
    var pw = S.listaPw && Date.now() < S.listaPw.hasta ? S.listaPw.v : null;
    return barra('Listado general', '#/clientes') +
      '<p class="nota" style="margin:0 0 10px">' + lista.length + ' clientes, en el orden en que les toca renovar.</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px">' +
      '<button class="btn' + (pw ? ' sec' : '') + '" id="lista-pw" style="flex:1 1 0;width:auto;white-space:nowrap">' + (pw ? 'Ocultar contraseñas' : 'Mostrar contraseñas') + '</button>' +
      '<button class="btn sec" id="lista-ex" style="flex:0 0 auto;width:auto;padding:0 16px;white-space:nowrap">' + (incluirEx ? 'Sin exclientes' : '+ Exclientes') + '</button></div>' +
      '<div class="card">' + lista.map(function (c) {
        var color = c.estado === 'Vencido' ? 'var(--rojo-txt)' : c.estado === 'Por vencer' ? '#9A5B00' : c.estado === 'Excliente' ? 'var(--suave)' : 'var(--medio)';
        var clave = pw ? (pw[c.usuario] || '—') : '••••••';
        return '<div class="fila" style="align-items:center;gap:10px"><a class="txt" style="text-decoration:none;color:inherit;min-width:0" href="#/cliente/' + encodeURIComponent(c.usuario) + '">' +
          '<span class="t1">' + esc(c.usuario) + '</span>' +
          '<span class="t2" style="color:' + color + '">' + (c.estado === 'Excliente' ? 'Excliente' : 'Vence ' + fechaCorta(c.vence)) + ' · ' + c.dispositivos + ' disp.</span>' +
          '<span class="t2" style="font-family:ui-monospace,Menlo,monospace;color:var(--texto);word-break:break-all">' + esc(clave) + '</span></a>' +
          '<div style="display:flex;gap:4px;flex:0 0 auto">' +
          '<button class="icon-btn plano" data-copiar-u="' + esc(c.usuario) + '" aria-label="Copiar usuario" title="Copiar usuario">' + ico('copiar') + '</button>' +
          (pw && pw[c.usuario] ? '<button class="icon-btn plano" data-copiar-p="' + esc(c.usuario) + '" aria-label="Copiar contraseña" title="Copiar contraseña">' + ico('llave') + '</button>' : '') +
          '</div></div>';
      }).join('') + '</div>' +
      (pw ? '<p class="nota" style="text-align:center">Las contraseñas se ocultan solas en 1 minuto.</p>' : '');
  }

  /* --- Pago de deuda --- */
  function pDeuda(u) {
    var c = cliente(u); if (!c) return barra('Pago de deuda', '#/inicio') + '<div class="vacio">No se encontró ' + esc(u) + '</div>';
    var pend = S.datos.cobros.filter(function (x) { return x.Usuario === u && x.Estado === 'Pendiente'; })
      .sort(function (a, b) { return a.Fecha < b.Fecha ? -1 : 1; });
    if (!S.deuda || S.deuda.usuario !== u) S.deuda = { usuario: u, forma: 'SINPE', enSobre: true, ids: pend.map(function (x) { return x.ID; }), monto: null };
    var d = S.deuda;
    var sel = pend.filter(function (x) { return d.ids.indexOf(x.ID) >= 0; });
    var totalSel = sel.reduce(function (t, x) { return t + numero(x.Monto); }, 0);
    var monto = d.monto != null ? d.monto : totalSel;
    if (!(c.debe > 0)) return barra('Pago de deuda', '#/cliente/' + encodeURIComponent(u)) + '<div class="ficha-nombre">' + esc(u) + '</div><div class="card" style="margin-top:14px"><div class="vacio">' + esc(u) + ' no debe nada.</div></div>';
    return barra('Pago de deuda', '#/cliente/' + encodeURIComponent(u)) +
      '<div class="ficha-nombre">' + esc(u) + '</div>' +
      '<div class="etq">¿Qué va a pagar?</div><div class="card">' + pend.map(function (x) {
        var on = d.ids.indexOf(x.ID) >= 0;
        return '<label class="dato" style="cursor:pointer"><span class="l" style="display:flex;align-items:center;gap:12px">' +
          '<input type="checkbox" data-deuda="' + esc(x.ID) + '"' + (on ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--texto)">' +
          '<span>' + mesDeuda(x.Fecha) + '<br><small>' + fechaCorta(x.Fecha) + '</small></span></span><span class="v">' + colones(numero(x.Monto)) + '</span></label>';
      }).join('') +
      '<div class="dato"><span class="l"><b>A pagar ahora</b>' + (sel.length < pend.length ? '<br><small>Queda debiendo ' + colones(c.debe - totalSel) + '</small>' : '') + '</span><span class="v"><b>' + colones(totalSel) + '</b></span></div></div>' +
      '<div class="etq">¿Cuánto pagó?</div><input id="deuda-monto" class="input campo-monto" type="text" inputmode="decimal" value="' + montoCampo(monto) + '">' +
      '<p class="nota" id="deuda-queda" style="margin:6px 2px 0">' + textoQueda(c.debe, totalSel, numero(monto)) + '</p>' +
      '<div class="etq">Forma de pago</div><div class="opciones c2"><button class="op' + (d.forma === 'SINPE' ? ' sel' : '') + '" data-dforma="SINPE">SINPE</button><button class="op' + (d.forma === 'Efectivo' ? ' sel' : '') + '" data-dforma="Efectivo">Efectivo</button></div>' +
      '<label class="check"><input type="checkbox" id="deuda-sobre"' + (d.enSobre ? ' checked' : '') + '>Ya está en el sobre BCR</label>' +
      '<p class="nota">Marque los meses que paga. Si paga menos de lo marcado, queda debiendo la diferencia.</p>' +
      '<button class="btn" id="deuda-ok" style="margin-top:6px"' + (sel.length ? '' : ' disabled') + '>Guardar pago</button>';
  }
  function textoQueda(debeTodo, marcado, pago) {
    if (!(pago > 0)) return '';
    var tol = numero(S.datos.config.tolerancia) || 0;
    if (pago >= marcado - tol) {
      var resto = debeTodo - marcado;
      return pago > marcado + tol ? 'Paga ' + colones(pago - marcado) + ' de más (cuenta como ingreso extra).' + (resto > 0 ? ' Queda debiendo ' + colones(resto) + ' de lo no marcado.' : '')
        : (resto > 0 ? 'Salda lo marcado. Queda debiendo ' + colones(resto) + ' de lo no marcado.' : '✓ Salda toda la deuda.');
    }
    return 'Es un abono: queda debiendo <b>' + colones(debeTodo - pago) + '</b>. Se salda primero el mes más viejo.';
  }
  function mesDeuda(f) {
    var m = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
    var p = String(f).split('-'); return p.length === 3 ? 'Mes de ' + m[Number(p[1]) - 1] : esc(f);
  }

  /* --- Tema claro / oscuro --- */
  function temaElegido() { try { return localStorage.getItem('iptv_tema') || 'auto'; } catch (e) { return 'auto'; } }
  function aplicarTema() {
    var t = temaElegido();
    var osc = t === 'oscuro' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('oscuro', !!osc);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', osc ? '#0F0E0D' : '#FAFAF9');
  }
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema); } catch (e) { } }

  /* --- Ajustes --- */
  function pAjustes() {
    var b = bloqueo(), c = S.datos.config;
    return barra('Ajustes', '#/inicio') +
      '<div class="etq">Precios y cambio</div><div class="card">' +
      '<div class="dato"><span class="l">Precios por dispositivo</span><span class="v">$' + [c.precios[1], c.precios[2], c.precios[3], c.precios[5]].join(' · $') + '</span></div>' +
      '<div class="dato"><span class="l">Tipo de cambio de hoy</span><span class="v"><button class="btn chico sec" id="tc2">' + colones(S.datos.tipoCambio) + ' ' + ico('lapiz', '') + '</button></span></div>' +
      '<div class="dato"><span class="l">Margen si pagan de menos</span><span class="v">' + colones(c.tolerancia) + '</span></div>' +
      '<div class="dato"><span class="l">Adobe</span><span class="v">$' + (numero(c.adobe_usd) || 19.99) + ' cada ' + (numero(c.adobe_cada_meses) || 2) + ' meses<br><small style="font-weight:400;color:var(--suave)">próximo ' + fechaCorta(c.adobe_proximo) + '</small></span></div></div>' +
      '<p class="nota">Los precios y montos se cambian en la pestaña Config de la hoja de Google.</p>' +
      '<div class="etq">Apariencia</div><div class="opciones c3">' + [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(function (t) {
        return '<button class="op' + (temaElegido() === t[0] ? ' sel' : '') + '" data-tema="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div><p class="nota">Automático sigue el modo claro u oscuro del celular.</p>' +
      '<div class="etq">Este celular</div><div class="card">' +
      '<div class="dato"><span class="l">Sesión</span><span class="v">' + esc(S.sesion.nombre || '') + '<br><small style="font-weight:400;color:var(--suave)">' + esc(S.sesion.correo) + '</small></span></div>' +
      '<div class="dato"><span class="l">Bloqueo con ' + nombreBiometria() + ' / PIN' + (b ? '<br><small>' + (b.cred ? nombreBiometria() + ' y PIN activos' : 'Solo PIN') + '</small>' : '') + '</span><span class="v">' + (b ? '<button class="btn chico rojo" id="bloq-off">Quitar</button>' : '<button class="btn chico" id="bloq-on">Activar</button>') + '</span></div>' +
      (b && !b.cred && S.bioDisponible ? '<div class="dato"><span class="l">' + nombreBiometria() + '</span><span class="v"><button class="btn chico" id="bio-on">Activar ' + nombreBiometria() + '</button></span></div>' : '') +
      '<div class="dato"><span class="l">Notificaciones</span><span class="v"><button class="btn chico sec" id="notif">Activar en este celular</button></span></div></div>' +
      '<button class="btn sec" id="salir" style="margin-top:16px">Cerrar sesión</button>' +
      (DEMO ? '<button class="btn rojo" id="reiniciar" style="margin-top:10px">Reiniciar datos de demostración</button>' : '') +
      '<p class="nota" style="text-align:center">App IPTV · versión ' + (window.APP_VERSION || LOGICA_VERSION) + (DEMO ? ' · modo demostración' : '') + '</p>';
  }

  /* ---------------- Enrutador ---------------- */

  var rutas = {
    inicio: { tab: 'inicio', fn: pInicio }, alertas: { tab: 'inicio', fn: pAlertas },
    clientes: { tab: 'clientes', fn: pClientes }, cliente: { tab: 'clientes', fn: pCliente },
    mensaje: { tab: 'clientes', fn: pMensaje }, cobro: { tab: 'cobro', fn: pCobro },
    comprobante: { tab: 'cobro', fn: pComprobante }, deuda: { tab: 'clientes', fn: pDeuda }, promo: { tab: 'clientes', fn: pPromo }, lista: { tab: 'clientes', fn: pLista }, reportes: { tab: 'finanzas', fn: pReportes }, movimientos: { tab: 'finanzas', fn: pMovimientos }, gasto: { tab: 'finanzas', fn: pGasto }, nuevo: { tab: 'clientes', fn: pNuevo },
    finanzas: { tab: 'finanzas', fn: pFinanzas }, ajustes: { tab: 'inicio', fn: pAjustes }
  };

  function render() {
    if (!S.sesion) S.sesion = leerSesion();
    if (!S.sesion) return pantallaEntrar();
    if (necesitaDesbloqueo()) return pantallaBloqueo();
    if (!S.datos && leerCache()) {
      // Mostrar al instante lo último guardado en este celular y actualizar por detrás
      S.datos = leerCache();
      refrescar().then(function () { if (!/cobro|nuevo|mensaje/.test(location.hash)) render(); }, function () { });
    }
    if (!S.datos) {
      $app.innerHTML = '<div class="cargando">Cargando…</div>';
      refrescar().then(render, function (e) {
        $app.innerHTML = '<div class="entrar"><div class="logo">TV</div><p style="color:var(--texto)">' + esc(e.message) + '</p><button class="btn" id="reint" style="max-width:240px">Reintentar</button>' +
          '<button class="btn sec" id="salir2" style="max-width:240px">Cerrar sesión</button></div>';
        document.getElementById('reint').onclick = function () { render(); };
        document.getElementById('salir2').onclick = function () { cerrarSesion(); };
      });
      return;
    }
    var partes = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/');
    var r = rutas[partes[0]] || rutas.inicio;
    var arg = partes[1] ? decodeURIComponent(partes[1]) : null;
    $app.innerHTML = r.fn(arg);
    $nav.hidden = false;
    Array.prototype.forEach.call($nav.querySelectorAll('a'), function (a) { a.classList.toggle('activo', a.dataset.tab === r.tab); });
    conectar(partes[0], arg);
    marcarActividad();
  }

  function guardando(btn, promesa) {
    btn.disabled = true; var t = btn.innerHTML; btn.textContent = 'Guardando…';
    return promesa.then(function (x) { btn.disabled = false; btn.innerHTML = t; return x; }, function (e) {
      btn.disabled = false; btn.innerHTML = t; toast(e.message || 'Error'); throw e;
    });
  }

  function editarTipoCambio(paraTodoElDia) {
    var v = window.prompt('Tipo de cambio de venta del BCR (por ejemplo 458,50):', String(S.cobro ? S.cobro.tipoCambio : S.datos.tipoCambio).replace('.', ','));
    if (!v) return;
    var n = leerMonto(v);
    if (!(n > 300 && n < 1000)) { toast('Monto no válido'); return; }
    var todoDia = paraTodoElDia || window.confirm('¿Usar ' + colones(n) + ' para todo el día?\nAceptar: todo el día · Cancelar: solo este cobro');
    if (S.cobro) { S.cobro.tipoCambio = n; S.cobro.monto = null; }
    if (todoDia) api('tipoCambioManual', { venta: n }).then(refrescar).then(function () { toast('Tipo de cambio actualizado'); render(); }, function (e) { toast(e.message); });
    else render();
  }

  function conectar(ruta, arg) {
    var $ = function (id) { return document.getElementById(id); };
    var todos = function (sel, fn) { Array.prototype.forEach.call($app.querySelectorAll(sel), fn); };

    if (ruta === 'clientes') {
      var q = $('q');
      q.oninput = function () {
        S.busqueda = q.value; var pos = q.selectionStart;
        $app.innerHTML = pClientes(); conectar('clientes'); var q2 = $('q'); q2.focus(); q2.setSelectionRange(pos, pos);
      };
      todos('[data-filtro]', function (b) { b.onclick = function () { S.filtro = b.dataset.filtro; S.busqueda = ''; render(); }; });
      todos('[data-oferta]', function (b) {
        b.onclick = function () {
          var c = cliente(b.dataset.oferta), cfg = configLogica();
          var p1 = calcularCobro(cfg, { dispositivos: c.dispositivos, meses: 1, tipoCambio: S.datos.tipoCambio, hoy: S.datos.hoy }).esperado;
          var txt = 'Hola, ¡le saludamos de su servicio de TV por Internet! Tenemos más canales, series y películas. ' +
            'El mes con ' + disp(c.dispositivos) + ' es ' + colones(p1) + ', y si paga 3 meses le regalamos 1. ¿Le gustaría volver? La activación es inmediata.';
          abrirWhatsApp(c.telefono, txt);
        };
      });
    }
    if (ruta === 'cliente') {
      var u = arg;
      S.pw = S.pw || {};
      var traerPw = function () {
        // Se guarda solo en la memoria mientras la app está abierta (nunca en el celular)
        if (S.pw[u] && Date.now() - S.pw[u].t < 5 * 60000) return Promise.resolve(S.pw[u].v);
        return confirmarIdentidad().then(function () { return api('verContrasena', { usuario: u }); }).then(function (r) {
          S.pw[u] = { v: r.contrasena, t: Date.now() }; return r.contrasena;
        });
      };
      var error = function (e) { if (e && e.message !== 'cancelado') toast(e.message || 'No se pudo'); };
      if ($('pw-ver')) $('pw-ver').onclick = function () {
        if ($('pw').dataset.visible === '1') { $('pw').textContent = '••••••••'; $('pw').dataset.visible = ''; return; }
        $('pw').textContent = '…';
        traerPw().then(function (v) {
          $('pw').textContent = v; $('pw').dataset.visible = '1';
          clearTimeout(S.pwTimer);
          S.pwTimer = setTimeout(function () { var el = document.getElementById('pw'); if (el) { el.textContent = '••••••••'; el.dataset.visible = ''; } }, 30000);
        }, function (e) { $('pw').textContent = '••••••••'; error(e); });
      };
      if ($('pw-copiar')) $('pw-copiar').onclick = function () {
        copiarTexto(traerPw()).then(function () { toast('Contraseña copiada'); }, error);
      };
      if ($('pw-enviar')) $('pw-enviar').onclick = function () {
        traerPw().then(function (v) {
          abrirWhatsApp(cliente(u).telefono, mensajeAcceso(u, v));
        }, error);
      };
      if ($('reactivar')) $('reactivar').onclick = function () {
        if (!window.confirm('¿Volver a dejar a ' + u + ' como cliente activo?')) return;
        guardando(this, api('reactivar', { usuario: u })).then(function () {
          return refrescar().then(function () { toast(u + ' está activo otra vez'); render(); });
        });
      };
      if ($('usr-copiar')) $('usr-copiar').onclick = function () {
        copiarTexto(u).then(function () { toast('Usuario copiado: ' + u); }, function () { toast('No se pudo copiar'); });
      };
      todos('[data-comp]', function (b) {
        b.onclick = function () {
          var x = S.datos.cobros.filter(function (c) { return c.ID === b.dataset.comp; })[0], c = cliente(u);
          S.comprobante = { numero: x.Comprobante, fecha: x.Fecha, usuario: u, dispositivos: x.Dispositivos, meses: numero(x.Meses), regalia: numero(x['Regalía']),
            vence: x['Vence nuevo'], monto: numero(x.Monto), forma: x['Forma de pago'], recibio: x['Cobró'], telefono: c.telefono,
            telefonos: { jonathan: S.datos.config.telefono_jonathan, fernando: S.datos.config.telefono_fernando } };
          ir('#/comprobante');
        };
      });
    }
    if (ruta === 'mensaje') {
      var cm = cliente(arg);
      if ($('enviar-wa')) $('enviar-wa').onclick = function () {
        abrirWhatsApp(cm.telefono, $('msg').value);
      };
      todos('[data-resp]', function (b) {
        b.onclick = function () {
          var preguntas = {
            'No renueva': '¿Confirma que ' + arg + ' NO va a renovar?\n\nPasará a exclientes.',
            'Sin respuesta': '¿Confirma que ' + arg + ' no ha respondido?\n\nLa alerta se quita y vuelve en ' + (numero(S.datos.config.dias_reaviso) || 3) + ' días.',
            'Va a renovar': '¿Confirma que ' + arg + ' va a renovar?'
          };
          if (preguntas[b.dataset.resp] && !window.confirm(preguntas[b.dataset.resp])) return;
          guardando(b, api('respuesta', { usuario: arg, respuesta: b.dataset.resp })).then(refrescar).then(function () {
            toast(b.dataset.resp === 'No renueva' ? arg + ' pasó a exclientes' : 'Listo. Se le vuelve a avisar en ' + (numero(S.datos.config.dias_reaviso) || 3) + ' días');
            ir('#/inicio');
          });
        };
      });
    }
    if (ruta === 'cobro' && !arg) {
      var q3 = $('q2');
      q3.oninput = function () { $('lista-cobro').innerHTML = listaElegir(q3.value); };
      q3.focus();
    }
    if (ruta === 'cobro' && arg && cliente(arg)) {
      var b = S.cobro;
      todos('[data-disp]', function (x) { x.onclick = function () { b.dispositivos = Number(x.dataset.disp); b.monto = null; render(); }; });
      todos('[data-mes]', function (x) { x.onclick = function () { b.meses = Number(x.dataset.mes); b.monto = null; render(); }; });
      todos('[data-forma]', function (x) { x.onclick = function () { b.forma = x.dataset.forma; render(); }; });
      todos('[data-estado]', function (x) { x.onclick = function () { b.estado = x.dataset.estado; render(); }; });
      $('monto').onchange = function () { b.monto = leerMonto(this.value); render(); };
      $('monto').onfocus = function () { this.select(); };
      $('en-panel').onchange = function () { b.enPanel = this.checked; };
      $('en-sobre').onchange = function () { b.enSobre = this.checked; };
      $('tc').onclick = function () { editarTipoCambio(false); };
      if ($('mas')) $('mas').onclick = function () { b.mas = true; render(); };
      $('guardar').onclick = function () {
        var m = numero($('monto').value);
        var datos = { usuario: b.usuario, dispositivos: b.dispositivos, meses: b.meses, monto: m, forma: b.forma, enPanel: b.enPanel, enSobre: b.enSobre, estado: b.estado, tipoCambio: b.tipoCambio };
        var btn = $('guardar');
        var enviar = function (confirmar) {
          datos.confirmarDuplicado = !!confirmar;
          return guardando(btn, api('guardarCobro', datos)).then(function (r) {
            if (r.duplicado) { if (window.confirm(r.mensaje + '\n\nAceptar: es otro pago · Cancelar: no guardar')) return enviar(true); return null; }
            return refrescar().then(function () {
              S.cobro = null;
              if (r.comprobante) { S.comprobante = r.comprobante; ir('#/comprobante'); }
              else { toast('Cobro guardado como ' + datos.estado.toLowerCase()); ir('#/cliente/' + encodeURIComponent(datos.usuario)); }
            });
          });
        };
        enviar(false);
      };
    }
    if (ruta === 'comprobante') {
      // La imagen se prepara antes, para que al tocar se comparta en el mismo toque (iPhone lo exige)
      var kc = S.comprobante, fileC = null;
      dibujarComprobante(kc).then(function (blob) {
        fileC = new File([blob], 'Comprobante-' + String(kc.numero).padStart(4, '0') + '-' + kc.usuario + '.png', { type: 'image/png' });
      });
      $('comp-wa').onclick = function () { if (fileC) compartirArchivo(fileC, 'Comprobante de pago', false, kc.telefono); else toast('Un momento…'); };
      $('comp-guardar').onclick = function () { if (fileC) compartirArchivo(fileC, 'Comprobante de pago', true); else toast('Un momento…'); };
    }
    if (ruta === 'promo') {
      var fileP = null;
      dibujarPromo().then(function (r) {
        fileP = new File([r.blob], 'Promo-IPTV.png', { type: 'image/png' });
        var v = document.getElementById('promo-vista'); if (!v) return;
        v.innerHTML = '<img src="' + r.url + '" alt="Imagen de la promoción" style="width:100%;display:block">';
        $('promo-compartir').disabled = false; $('promo-guardar').disabled = false;
      });
      $('promo-compartir').onclick = function () { if (fileP) compartirArchivo(fileP, 'Promoción IPTV', false); };
      $('promo-guardar').onclick = function () { if (fileP) compartirArchivo(fileP, 'Promoción IPTV', true); };
    }
    if (ruta === 'nuevo') {
      var nd = 1;
      todos('[data-ndisp]', function (x) {
        x.onclick = function () { nd = Number(x.dataset.ndisp); todos('[data-ndisp]', function (y) { y.classList.toggle('sel', y === x); }); };
      });
      $('n-guardar').onclick = function () {
        var datos = { usuario: $('n-usuario').value.trim(), telefono: $('n-tel').value.trim(), idPanel: $('n-id').value.trim(),
          nombre: $('n-nombre').value.trim(), contrasena: $('n-pw').value, dispositivos: nd, como: $('n-como').value };
        if (!datos.usuario) { toast('Escriba el usuario'); return; }
        guardando($('n-guardar'), api('guardarCliente', datos)).then(function (r) {
          if (r.existe) { toast(r.mensaje); return; }
          return refrescar().then(function () {
            toast(r.reactivado ? 'Cliente reactivado' : 'Cliente guardado');
            S.cobro = null; ir('#/cobro/' + encodeURIComponent(r.usuario));
          });
        });
      };
    }
    if (ruta === 'finanzas') {
      $('control').onclick = function () {
        var s = window.prompt('¿Cuánto hay hoy en el sobre del BCR? (colones)'); if (!s) return;
        var c = window.prompt('¿Cuántos créditos muestra hoy el panel de XtreamAI?'); if (!c) return;
        api('guardarControl', { sobreReal: leerMonto(s), creditosPanel: Math.round(leerMonto(c)) }).then(refrescar).then(function () { toast('Control guardado'); render(); }, function (e) { toast(e.message); });
      };
    }
    if ($('sync')) $('sync').onclick = function () {
      refrescar().then(function () { render(); toast('Datos actualizados'); }, function (e) { toast(e.message); });
    };
    if (ruta === 'finanzas' && !S.repBase && !DEMO) cargarBaseReportes();
    // Campos de dinero: al salir del campo se escribe con separador de miles (₡20.880)
    todos('.campo-monto, #monto', function (x) {
      // Mientras se escribe: ₡1 → ₡10 → ₡100 → ₡1.000 → ₡10.000 (la coma es para céntimos)
      x.addEventListener('input', function () {
        var v = x.value, coma = v.lastIndexOf(',');
        var ent = (coma >= 0 ? v.slice(0, coma) : v).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
        var dec = coma >= 0 ? v.slice(coma + 1).replace(/\D/g, '').slice(0, 2) : null;
        if (!ent && dec === null) { x.value = ''; return; }
        var nuevo = '₡' + (ent || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec !== null ? ',' + dec : '');
        if (nuevo !== v) { x.value = nuevo; try { x.setSelectionRange(nuevo.length, nuevo.length); } catch (e) { } }
      });
      x.addEventListener('blur', function () { var n = leerMonto(x.value); if (x.value.trim() !== '') x.value = montoCampo(n); });
      x.addEventListener('focus', function () { setTimeout(function () { try { x.select(); } catch (e) { } }, 0); });
    });
    if (ruta === 'gasto') {
      var leer = function () { S.gasto.monto = $('g-monto').value === '' ? null : leerMonto($('g-monto').value); S.gasto.fecha = $('g-fecha').value || S.datos.hoy; if ($('g-desc')) S.gasto.descripcion = $('g-desc').value; };
      todos('[data-gtipo]', function (x) { x.onclick = function () { leer(); S.gasto.tipo = x.dataset.gtipo; S.gasto.monto = null; render(); }; });
      $('g-sobre').onchange = function () { S.gasto.afectaSobre = this.checked; };
      $('g-ok').onclick = function () {
        leer(); var g = S.gasto;
        var m = leerMonto($('g-monto').value);
        if (!(m > 0)) { toast('Escriba el monto en colones'); return; }
        if (g.tipo === 'otro' && !String(g.descripcion).trim()) { toast('Escriba en qué fue el gasto'); return; }
        if (!window.confirm('¿Guardar gasto de ' + colones(m) + (g.tipo === 'adobe' ? ' (Adobe)' : ' (' + g.descripcion + ')') + '?')) return;
        guardando(this, api('guardarGasto', { tipo: g.tipo, fecha: g.fecha, monto: m, descripcion: g.descripcion, afectaSobre: g.afectaSobre })).then(function (r) {
          return refrescar().then(function () {
            S.gasto = null;
            toast(r.proximo ? 'Adobe guardado. Próximo pago: ' + fechaCorta(r.proximo) : 'Gasto guardado');
            ir('#/finanzas');
          });
        });
      };
    }
    if (ruta === 'movimientos') {
      todos('[data-mper]', function (x) { x.onclick = function () { S.movs.periodo = x.dataset.mper; render(); }; });
      todos('[data-mfil]', function (x) { x.onclick = function () { S.movs.filtro = S.movs.filtro === x.dataset.mfil ? 'todos' : x.dataset.mfil; render(); }; });
      if ($('mfil-x')) $('mfil-x').onclick = function (e) { e.preventDefault(); S.movs.filtro = 'todos'; render(); };
      if ($('mmes')) $('mmes').onchange = function () { if (this.value) { S.movs.periodo = this.value; render(); } };
    }
    if (ruta === 'reportes') {
      todos('[data-rtab]', function (x) { x.onclick = function () { S.rep.tab = x.dataset.rtab; if (S.rep.tab === 'negocio') S.rep.cliente = null; render(); }; });
      var enlazarCuerpo = function () {
        todos('[data-rcli]', function (x) { x.onclick = function () { S.rep.cliente = x.dataset.rcli; S.rep.tab = 'clientes'; render(); window.scrollTo(0, 0); }; });
        if ($('rcli-x')) $('rcli-x').onclick = function () { S.rep.cliente = null; render(); };
      };
      enlazarCuerpo();
      if ($('rbuscar')) $('rbuscar').oninput = function () {
        S.rep.buscar = this.value; S.rep.cliente = null;
        var rgx = rangoPeriodo(S.rep.periodo);
        if (S.rep.datos) { $('rep-cuerpo').innerHTML = cuerpoReporte(S.rep.datos, rgx); enlazarCuerpo(); prepararImagen(); }
      };
      todos('[data-rper]', function (x) { x.onclick = function () { S.rep.periodo = x.dataset.rper; render(); }; });
      if ($('rmes')) $('rmes').onchange = function () { if (this.value) { S.rep.periodo = this.value; render(); } };
      var Rd = S.rep && S.rep.datos, Rn = rangoPeriodo(S.rep.periodo).nombre;
      var nombreArch = 'Reporte-IPTV-' + Rn.replace(/\s+/g, '-') + '-' + S.rep.tab;
      var fileR = null;
      var prepararImagen = function () {
        fileR = null; if (!Rd || !$('r-wa')) return;
        var rgI = rangoPeriodo(S.rep.periodo), dI = Rd, nI = Rn, tabI = S.rep.tab, sel = usuariosBuscados();
        if (S.rep.cliente) { dI = reporteCliente(S.rep.cliente, rgI); nI = S.rep.cliente + ' · ' + Rn; tabI = 'cliente'; }
        else if (sel && tabI !== 'negocio') {
          dI = reporte({ cobros: S.repBase.cobros.filter(function (c) { return sel[c.Usuario]; }), movimientos: [], clientes: [] }, configLogica(), rgI.desde, rgI.hasta);
          tabI = tabI === 'clientes' ? 'clientes' : 'cliente';
        }
        dibujarReporte(dI, nI, tabI).then(function (b) { fileR = new File([b], nombreArch + '.png', { type: 'image/png' }); });
      };
      prepararImagen();
      if ($('r-wa')) $('r-wa').onclick = function () {
        if (fileR) compartirArchivo(fileR, 'Reporte IPTV', false);
        else abrirWhatsApp('', textoReporte(Rd, Rn));
      };
      if ($('r-excel')) $('r-excel').onclick = function () {
        var f = new File([csvReporte(Rd, S.rep.tab)], nombreArch + '.csv', { type: 'text/csv' });
        compartirArchivo(f, 'Reporte IPTV', !ES_IOS);
      };
      if ($('r-pdf')) $('r-pdf').onclick = function () {
        document.body.classList.add('imprimiendo'); window.print();
        setTimeout(function () { document.body.classList.remove('imprimiendo'); }, 1000);
      };
    }
    if (ruta === 'lista') {
      $('lista-ex').onclick = function () { S.listaEx = !S.listaEx; render(); };
      $('lista-pw').onclick = function () {
        if (S.listaPw && Date.now() < S.listaPw.hasta) { S.listaPw = null; render(); return; }
        var b = this; b.disabled = true; b.textContent = 'Verificando…';
        confirmarIdentidad().then(function () { return api('verContrasenas'); }).then(function (r) {
          S.listaPw = { v: r.contrasenas, hasta: Date.now() + 60000 };
          clearTimeout(S.listaTimer);
          S.listaTimer = setTimeout(function () { S.listaPw = null; if (/^#\/lista/.test(location.hash)) render(); }, 60000);
          render();
        }, function (e) { if (e && e.message !== 'cancelado') toast(e.message); render(); });
      };
      todos('[data-copiar-u]', function (x) { x.onclick = function () { var v = x.dataset.copiarU; copiarTexto(v).then(function () { toast('Usuario copiado: ' + v); }, function () { toast('No se pudo copiar'); }); }; });
      todos('[data-copiar-p]', function (x) { x.onclick = function () { var v = S.listaPw && S.listaPw.v[x.dataset.copiarP]; if (v) copiarTexto(v).then(function () { toast('Contraseña copiada'); }, function () { toast('No se pudo copiar'); }); }; });
    }
    if (ruta === 'deuda' && $('deuda-ok')) {
      todos('[data-dforma]', function (x) { x.onclick = function () { S.deuda.forma = x.dataset.dforma; S.deuda.monto = leerMonto($('deuda-monto').value); render(); }; });
      todos('[data-deuda]', function (x) {
        x.onchange = function () {
          var id = x.dataset.deuda, i = S.deuda.ids.indexOf(id);
          if (x.checked && i < 0) S.deuda.ids.push(id);
          if (!x.checked && i >= 0) S.deuda.ids.splice(i, 1);
          S.deuda.monto = null;    // el monto vuelve a ser la suma de lo marcado
          render();
        };
      });
      $('deuda-monto').oninput = function () {
        S.deuda.monto = leerMonto(this.value);
        var cl = cliente(arg), marc = S.datos.cobros.filter(function (x) { return x.Usuario === arg && x.Estado === 'Pendiente' && S.deuda.ids.indexOf(x.ID) >= 0; })
          .reduce(function (t, x) { return t + numero(x.Monto); }, 0);
        $('deuda-queda').innerHTML = textoQueda(cl ? cl.debe : marc, marc, S.deuda.monto);
      };
      $('deuda-sobre').onchange = function () { S.deuda.enSobre = this.checked; };
      $('deuda-ok').onclick = function () {
        var m = leerMonto($('deuda-monto').value);
        if (!(m > 0)) { toast('Escriba el monto que pagó'); return; }
        guardando(this, api('pagarDeuda', { usuario: arg, ids: S.deuda.ids, monto: m, forma: S.deuda.forma, enSobre: S.deuda.enSobre })).then(function (r) {
          return refrescar().then(function () {
            S.deuda = null;
            toast(r.queda > 0 ? 'Pago guardado. Queda debiendo ' + colones(r.queda) : 'Deuda pagada ✓');
            ir('#/cliente/' + encodeURIComponent(arg));
          });
        });
      };
    }
    if (ruta === 'ajustes') {
      $('tc2').onclick = function () { S.cobro = null; editarTipoCambio(true); };
      todos('[data-tema]', function (x) { x.onclick = function () { try { localStorage.setItem('iptv_tema', x.dataset.tema); } catch (e) { } aplicarTema(); render(); }; });
      if ($('bloq-on')) $('bloq-on').onclick = function () {
        activarBloqueo().then(function (b) { toast(b.cred ? nombreBiometria() + ' y PIN activados' : 'PIN activado'); render(); }, function () { });
      };
      if ($('bio-on')) $('bio-on').onclick = function () {
        agregarBiometria().then(function () { toast(nombreBiometria() + ' activado'); render(); },
          function (e) { toast(nombreBiometria() + ' no se activó (' + (e && e.name || 'error') + ')'); });
      };
      if ($('bloq-off')) $('bloq-off').onclick = function () {
        confirmarIdentidad().then(function () { localStorage.removeItem('iptv_bloqueo'); toast('Bloqueo quitado'); render(); }, function () { });
      };
      $('notif').onclick = pedirPermisoNotificaciones;
      $('salir').onclick = function () { localStorage.removeItem('iptv_bloqueo'); cerrarSesion(); };
      if ($('reiniciar')) $('reiniciar').onclick = function () {
        localStorage.removeItem('iptv_demo_db'); demoDb = null; S.datos = null; toast('Datos de demostración reiniciados'); ir('#/inicio'); render();
      };
    }
  }


  /* ---------------- Aviso de versión nueva ---------------- */

  var VERSION_APP = window.APP_VERSION || '';
  function revisarVersion() {
    if (!VERSION_APP || !window.fetch) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (v) {
      if (!v || !v.version || v.version === VERSION_APP) return;
      var el = document.getElementById('aviso-version'); if (!el) return;
      el.innerHTML = '<span class="txt"><b>Hay una versión nueva (' + esc(v.version) + ')</b>' +
        (v.cambios && v.cambios.length ? '<small>' + esc(v.cambios.join(' · ')) + '</small>' : '') + '</span>' +
        '<button id="av-act">Actualizar</button><button class="cerrar" id="av-x" aria-label="Cerrar">✕</button>';
      el.hidden = false;
      document.getElementById('av-x').onclick = function () { el.hidden = true; };
      document.getElementById('av-act').onclick = function () {
        this.disabled = true; this.textContent = 'Actualizando…';
        // Si ya estaba desbloqueada, la recarga por actualización no vuelve a pedir Face ID (vale 1 minuto)
        if (S.desbloqueado) { try { sessionStorage.setItem('iptv_recarga', String(Date.now() + 60000)); } catch (e) { } }
        var listo = function () { location.reload(); };
        var limpiar = window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : Promise.resolve();
        var sw = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.update(); })); }) : Promise.resolve();
        Promise.all([limpiar, sw]).then(listo, listo);
      };
    }, function () { });
  }
  function avisarSiSeActualizo() {
    if (!VERSION_APP) return;
    var antes = localStorage.getItem('iptv_version');
    if (antes && antes !== VERSION_APP) setTimeout(function () { toast('✓ App actualizada a la versión ' + VERSION_APP); }, 600);
    localStorage.setItem('iptv_version', VERSION_APP);
  }

  /* ---------------- Arranque ---------------- */

  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); render(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') revisarVersion();
    if (document.visibilityState === 'visible' && S.sesion) {
      if (necesitaDesbloqueo()) { S.desbloqueado = false; render(); }
      else if (S.datos) refrescar().then(function () { if (!/cobro\/|nuevo|mensaje/.test(location.hash)) render(); }, function () { });
    } else if (document.visibilityState === 'hidden') marcarActividad();
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !(CFG.ONESIGNAL_APP_ID && !DEMO)) {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
  biometriaDisponible().then(function (v) { S.bioDisponible = !!v; }, function () { });
  S.sesion = leerSesion();
  if (S.sesion && bloqueo()) S.desbloqueado = false; else if (S.sesion) S.desbloqueado = true;
  try {
    var pase = Number(sessionStorage.getItem('iptv_recarga') || 0);
    sessionStorage.removeItem('iptv_recarga');
    if (S.sesion && pase > Date.now()) { S.desbloqueado = true; marcarActividad(); }
  } catch (e) { }
  iniciarNotificaciones();
  render();
  avisarSiSeActualizo();
  revisarVersion();
})();
