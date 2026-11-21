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
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function disp(n) { return plural(Number(n), 'dispositivo', 'dispositivos'); }
  var ICON = {
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    atras: '<path d="m15 18-6-6 6-6"/>', cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z"/>',
    ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
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
            if (accion === 'tipoCambioManual') {
              db.tipocambio.push({ Fecha: hoy, Venta: numero(datos.venta), Fuente: 'Manual' }); guardarDemo(); return ok({ ok: true });
            }
            var fn = { guardarCobro: accionGuardarCobro, pagarDeuda: accionPagarDeuda, guardarCliente: accionGuardarCliente, respuesta: accionRespuesta, guardarControl: accionGuardarControl }[accion];
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
      if (r.estado) { S.datos = r.estado; S.fresco = Date.now(); guardarCache(r.estado); marcarSync(); }
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
    return api('estado').then(function (d) { S.datos = d; guardarCache(d); marcarSync(); S.actualizando = false; pintarSync(); return d; },
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
          (x.tipo === 'Gasto fijo' || x.tipo === 'Créditos' || x.tipo === 'Depósito') ? '#/finanzas' : '#/inicio';
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
    return banner() + '<div class="top"><h1>Clientes</h1><a class="btn chico" href="#/nuevo">+ Nuevo</a></div>' +
      '<label class="oculto" for="q">Buscar por nombre, usuario o teléfono</label><div class="buscar">' + ico('buscar') +
      '<input id="q" type="search" autocomplete="off" placeholder="Buscar por nombre, usuario o teléfono" value="' + esc(S.busqueda) + '"></div>' +
      '<div class="filtros">' + Object.keys(grupos).map(function (k) {
        return '<button class="filtro' + (S.filtro === k && !S.busqueda ? ' sel' : '') + '" data-filtro="' + k + '">' + k + ' ' + grupos[k].length + '</button>';
      }).join('') + '</div>' +
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
        setTimeout(function () { window.open('https://wa.me/' + telefonoWhatsApp(k.telefono), '_blank'); }, 600);
      } else toast('Imagen guardada');
    });
  }

  /* --- Nuevo cliente --- */
  function pNuevo() {
    return barra('Nuevo cliente', '#/clientes', 'cerrar') + '<div class="form">' +
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
    return banner() + '<div class="top"><h1>Finanzas</h1></div>' +
      '<div class="card pad" style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px">Sobre BCR</b>' +
      (ctrl ? '<span class="chip ' + (cuadraS ? 'verde' : 'naranja') + '">' + (cuadraS ? 'Cuadra' : 'Revisar') + '</span>' : '') + '</div>' +
      '<div class="dato"><span class="l">Según la app</span><span class="v">' + colones(r.sobreEnBanco) + '</span></div>' +
      (ctrl ? '<div class="dato"><span class="l">Real en el banco (' + fechaCorta(ctrl.fecha) + ')</span><span class="v">' + colones(ctrl.sobreReal) + '</span></div>' +
        '<div class="dato"><span class="l">Diferencia</span><span class="v" style="color:' + (cuadraS ? 'var(--verde-txt)' : 'var(--naranja-txt)') + '">' + colones(ctrl.difSobre) + '</span></div>' : '') +
      (r.sinDepositar ? '<div class="nota">' + colones(r.sinDepositar) + ' cobrados todavía no están en el sobre.</div>' : '') + '</div>' +
      '<div class="card pad" style="display:flex;flex-direction:column;gap:8px;margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px">Créditos</b>' +
      (ctrl ? '<span class="chip ' + (cuadraC ? 'verde' : 'naranja') + '">' + (cuadraC ? 'Cuadra' : 'Faltan ' + Math.abs(ctrl.difCreditos)) + '</span>' : '') + '</div>' +
      '<div class="dato"><span class="l">Según la app</span><span class="v">' + r.creditos + '</span></div>' +
      (ctrl ? '<div class="dato"><span class="l">En el panel (' + fechaCorta(ctrl.fecha) + ')</span><span class="v">' + ctrl.creditosPanel + '</span></div>' : '') + '</div>' +
      '<button class="btn sec" id="control" style="margin-top:10px">Actualizar con el banco y el panel</button>' +
      '<div class="card pad" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"><b style="font-size:14px;margin-bottom:4px">Para repartir (50/50)</b>' +
      '<div class="dato"><span class="l">Hay en el sobre</span><span class="v">' + colones(r.sobre) + '</span></div>' +
      '<div class="dato"><span class="l">Reserva para créditos</span><span class="v" style="color:var(--naranja-txt);white-space:nowrap">' + colones(-r.reserva) + '</span></div>' +
      '<div class="nota" style="margin-top:-4px">' + r.usadosDesdeCompra + ' créditos usados desde la última compra × $' + S.datos.config.costo_credito + ' × cambio BCR ' + colones(r.tipoCambio) + '</div>' +
      '<div class="dato"><span class="l"><b style="color:var(--texto)">Disponible para repartir</b></span><span class="v" style="color:var(--verde-txt)">' + colones(r.disponible) + '</span></div>' +
      '<div class="nota">' + colones(r.disponible / 2) + ' para cada uno. Los retiros con aprobación llegan en la etapa 2.</div></div>' +
      '<div class="tiles" style="grid-template-columns:repeat(2,1fr);margin-top:10px"><div class="tile"><span>Pendiente por cobrar</span><b style="font-size:18px;color:var(--naranja-txt)">' + colones(r.pendiente) + '</b></div>' +
      '<div class="tile"><span>Incobrable</span><b style="font-size:18px;color:var(--suave)">' + colones(r.incobrable) + '</b></div></div>' +
      '<div class="etq">Últimos movimientos</div><div class="card">' + S.datos.movimientos.slice(0, 8).map(function (m) {
        return '<div class="fila"><span class="txt"><span class="t1">' + esc(m.Tipo) + '</span><span class="t2">' + fechaCorta(m.Fecha) + (m.Nota ? ' · ' + esc(m.Nota) : '') + '</span></span><b style="font-size:14px">' + colones(numero(m.Monto)) + '</b></div>';
      }).join('') + '</div>' +
      '<div class="etq">Últimos cobros</div><div class="card">' + S.datos.cobros.slice(0, 10).map(function (x) {
        return '<a class="fila" href="#/cliente/' + encodeURIComponent(x.Usuario) + '"><span class="txt"><span class="t1">' + esc(x.Usuario) + '</span><span class="t2">' + fechaCorta(x.Fecha) +
          (x['Cobró'] ? ' · ' + esc(x['Cobró']) : '') + '</span></span><span style="text-align:right"><b style="font-size:14px;display:block">' + colones(numero(x.Monto)) + '</b><span class="chip ' + (x.Estado === 'Pagado' ? 'verde' : x.Estado === 'Pendiente' ? 'naranja' : '') + '">' + esc(x.Estado) + '</span></span></a>';
      }).join('') + '</div>';
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
      '<div class="etq">¿Cuánto pagó?</div><input id="deuda-monto" class="input" type="text" inputmode="decimal" value="' + numero(monto) + '">' +
      '<div class="etq">Forma de pago</div><div class="opciones c2"><button class="op' + (d.forma === 'SINPE' ? ' sel' : '') + '" data-dforma="SINPE">SINPE</button><button class="op' + (d.forma === 'Efectivo' ? ' sel' : '') + '" data-dforma="Efectivo">Efectivo</button></div>' +
      '<label class="check"><input type="checkbox" id="deuda-sobre"' + (d.enSobre ? ' checked' : '') + '>Ya está en el sobre BCR</label>' +
      '<p class="nota">Marque los meses que paga. Si paga menos de lo marcado, queda debiendo la diferencia.</p>' +
      '<button class="btn" id="deuda-ok" style="margin-top:6px"' + (sel.length ? '' : ' disabled') + '>Guardar pago</button>';
  }
  function mesDeuda(f) {
    var m = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
    var p = String(f).split('-'); return p.length === 3 ? 'Mes de ' + m[Number(p[1]) - 1] : esc(f);
  }

  /* --- Ajustes --- */
  function pAjustes() {
    var b = bloqueo(), c = S.datos.config;
    return barra('Ajustes', '#/inicio') +
      '<div class="etq">Precios y cambio</div><div class="card">' +
      '<div class="dato"><span class="l">Precios por dispositivo</span><span class="v">$' + [c.precios[1], c.precios[2], c.precios[3], c.precios[5]].join(' · $') + '</span></div>' +
      '<div class="dato"><span class="l">Tipo de cambio de hoy</span><span class="v"><button class="btn chico sec" id="tc2">' + colones(S.datos.tipoCambio) + ' ' + ico('lapiz', '') + '</button></span></div>' +
      '<div class="dato"><span class="l">Margen si pagan de menos</span><span class="v">' + colones(c.tolerancia) + '</span></div>' +
      '<div class="dato"><span class="l">Próximo pago de Adobe</span><span class="v">' + fechaCorta(c.adobe_proximo) + '</span></div></div>' +
      '<p class="nota">Los precios y montos se cambian en la pestaña Config de la hoja de Google.</p>' +
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
    comprobante: { tab: 'cobro', fn: pComprobante }, deuda: { tab: 'clientes', fn: pDeuda }, nuevo: { tab: 'clientes', fn: pNuevo },
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
    var n = numero(v.indexOf(',') >= 0 ? v : v.replace('.', ','));
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
          window.open('https://wa.me/' + telefonoWhatsApp(c.telefono) + '?text=' + encodeURIComponent(txt), '_blank');
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
          window.open('https://wa.me/' + telefonoWhatsApp(cliente(u).telefono) + '?text=' + encodeURIComponent(mensajeAcceso(u, v)), '_blank');
        }, error);
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
        window.open('https://wa.me/' + telefonoWhatsApp(cm.telefono) + '?text=' + encodeURIComponent($('msg').value), '_blank');
      };
      todos('[data-resp]', function (b) {
        b.onclick = function () {
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
      $('monto').onchange = function () { b.monto = numero(this.value); render(); };
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
      $('comp-wa').onclick = function () { enviarComprobante(false); };
      $('comp-guardar').onclick = function () { enviarComprobante(true); };
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
        api('guardarControl', { sobreReal: numero(s), creditosPanel: numero(c) }).then(refrescar).then(function () { toast('Control guardado'); render(); }, function (e) { toast(e.message); });
      };
    }
    if ($('sync')) $('sync').onclick = function () {
      refrescar().then(function () { render(); toast('Datos actualizados'); }, function (e) { toast(e.message); });
    };
    if (ruta === 'deuda' && $('deuda-ok')) {
      todos('[data-dforma]', function (x) { x.onclick = function () { S.deuda.forma = x.dataset.dforma; S.deuda.monto = numero($('deuda-monto').value); render(); }; });
      todos('[data-deuda]', function (x) {
        x.onchange = function () {
          var id = x.dataset.deuda, i = S.deuda.ids.indexOf(id);
          if (x.checked && i < 0) S.deuda.ids.push(id);
          if (!x.checked && i >= 0) S.deuda.ids.splice(i, 1);
          S.deuda.monto = null;    // el monto vuelve a ser la suma de lo marcado
          render();
        };
      });
      $('deuda-monto').oninput = function () { S.deuda.monto = numero(this.value); };
      $('deuda-sobre').onchange = function () { S.deuda.enSobre = this.checked; };
      $('deuda-ok').onclick = function () {
        var m = numero($('deuda-monto').value);
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
  iniciarNotificaciones();
  render();
  avisarSiSeActualizo();
  revisarVersion();
})();
