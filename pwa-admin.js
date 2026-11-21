/* =====================================================================
   আল হামরা অ্যাডমিন — PWA সহায়ক স্ক্রিপ্ট
   কাজ: Service Worker চালু, ইনস্টল বার, অফলাইন বার্তা, আপডেট বার্তা,
        মোবাইলের জন্য ছোট স্টাইল উন্নতি এবং লগআউটের পর ব্যক্তিগত তথ্য পরিষ্কার।
   Firebase config, লগইন বা Database কোডে এই ফাইল হাত দেয় না।
   ===================================================================== */
(function () {
  'use strict';

  var scriptSrc = (document.currentScript && document.currentScript.src) || location.href;
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  /* ---------- স্টাইল ---------- */
  var css = [
    'html{-webkit-text-size-adjust:100%;text-size-adjust:100%}',
    'body{-webkit-tap-highlight-color:rgba(27,94,66,.15)}',
    /* মোবাইলে: iPhone-এ ইনপুটে ক্লিক করলে অযথা জুম হওয়া বন্ধ, বাটন চাপতে সহজ */
    '@media (max-width:600px){',
    'input:not([type=checkbox]):not([type=radio]),select,textarea{font-size:16px}',
    'button{min-height:38px;touch-action:manipulation}',
    '}',
    '.pwaBar{position:fixed;left:12px;right:12px;bottom:max(64px,env(safe-area-inset-bottom));z-index:2147483000;',
    'max-width:460px;margin:0 auto;background:#0f3d2e;color:#fff;border:1px solid #c9a227;border-radius:16px;',
    'padding:12px 14px;box-shadow:0 12px 30px rgba(0,0,0,.28);font-family:"Hind Siliguri",system-ui,sans-serif;',
    'font-size:.95rem;line-height:1.5;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.pwaBar .pwaTxt{flex:1 1 150px}',
    '.pwaBar button{font:inherit;font-weight:600;border:0;border-radius:10px;padding:9px 14px;cursor:pointer}',
    '.pwaBar .pwaGo{background:#c9a227;color:#0f3d2e}',
    '.pwaBar .pwaNo{background:transparent;color:#e7efe8;padding:9px 8px}',
    '.pwaStatus{position:fixed;top:0;left:0;right:0;z-index:2147483001;text-align:center;padding:8px 12px;',
    'padding-top:max(8px,env(safe-area-inset-top));font-family:"Hind Siliguri",system-ui,sans-serif;font-size:.9rem;font-weight:600;display:none}',
    '.pwaStatus.off{background:#a6402f;color:#fff}',
    '.pwaStatus.on{background:#1b5e42;color:#fff}'
  ].join('');
  var st = document.createElement('style');
  st.setAttribute('data-pwa', '1');
  st.textContent = css;
  document.head.appendChild(st);

  function showBar(id, text, goLabel, onGo, noLabel, onNo) {
    var old = document.getElementById(id);
    if (old) old.remove();
    var bar = document.createElement('div');
    bar.className = 'pwaBar'; bar.id = id; bar.setAttribute('role', 'status');
    var t = document.createElement('div'); t.className = 'pwaTxt'; t.textContent = text; bar.appendChild(t);
    if (goLabel) {
      var go = document.createElement('button'); go.type = 'button'; go.className = 'pwaGo'; go.textContent = goLabel;
      go.addEventListener('click', function () { onGo && onGo(bar); }); bar.appendChild(go);
    }
    if (noLabel) {
      var no = document.createElement('button'); no.type = 'button'; no.className = 'pwaNo'; no.textContent = noLabel;
      no.addEventListener('click', function () { bar.remove(); onNo && onNo(); }); bar.appendChild(no);
    }
    document.body.appendChild(bar);
    return bar;
  }

  /* ---------- অফলাইন / অনলাইন ---------- */
  var statusEl = null, statusTimer = null;
  function showStatus(kind, text, autoHideMs) {
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.className = 'pwaStatus'; statusEl.setAttribute('role', 'status');
      document.body.appendChild(statusEl);
    }
    clearTimeout(statusTimer);
    statusEl.className = 'pwaStatus ' + kind;
    statusEl.textContent = text;
    statusEl.style.display = 'block';
    if (autoHideMs) statusTimer = setTimeout(function () { statusEl.style.display = 'none'; }, autoHideMs);
  }
  window.addEventListener('offline', function () {
    showStatus('off', '📡 ইন্টারনেট সংযোগ নেই — পরিবর্তন সংরক্ষণ হবে না, ইন্টারনেট চালু করুন');
  });
  window.addEventListener('online', function () { showStatus('on', '✅ ইন্টারনেট ফিরে এসেছে', 3000); });
  if (navigator.onLine === false) window.dispatchEvent(new Event('offline'));

  /* ---------- ইনস্টল ---------- */
  var deferredPrompt = null, DISMISS_KEY = 'alhamra_admin_install_dismissed_at';
  function recentlyDismissed() {
    var t = parseInt(safeGet(DISMISS_KEY) || '0', 10);
    return t && (Date.now() - t) < 7 * 24 * 3600 * 1000;
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e;
    if (isStandalone || recentlyDismissed()) return;
    showBar('pwaInstallBar', '📲 "আল হামরা অ্যাডমিন" অ্যাপটি মোবাইলে ইনস্টল করুন', 'ইনস্টল করুন', function (bar) {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; bar.remove(); });
    }, 'পরে', function () { safeSet(DISMISS_KEY, String(Date.now())); });
  });
  window.addEventListener('appinstalled', function () {
    deferredPrompt = null; var b = document.getElementById('pwaInstallBar'); if (b) b.remove();
  });

  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  if (isIOS && !isStandalone && !recentlyDismissed()) {
    window.addEventListener('load', function () {
      showBar('pwaIosBar', 'ইনস্টল করতে Safari-র শেয়ার বাটন চাপুন, তারপর "Add to Home Screen" বেছে নিন।', null, null, 'ঠিক আছে',
        function () { safeSet(DISMISS_KEY, String(Date.now())); });
    });
  }

  /* ---------- Service Worker ---------- */
  var canSW = 'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  if (canSW) {
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return; reloading = true; location.reload();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(new URL('service-worker.js', scriptSrc).href).then(function (reg) {
        function promptUpdate(worker) {
          showBar('pwaUpdateBar', '🔄 অ্যাপের নতুন সংস্করণ এসেছে।', 'আপডেট করুন', function () {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }, 'পরে');
        }
        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var w = reg.installing; if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(w);
          });
        });
        setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
      }).catch(function (err) { console.warn('Service Worker চালু হয়নি:', err); });
    });
  }

  /* ---------- লগআউটের পর ব্যক্তিগত তথ্য পরিষ্কার ----------
     অ্যাডমিন কোড শিক্ষার্থী/বেতন তথ্যের একটি কপি এই ডিভাইসের localStorage-এ
     (student: / fee: / settle: নামে) রাখতে পারে। লগআউট হলে সেগুলো মুছে পেজ রিলোড হয়,
     যাতে পরবর্তী ব্যবহারকারী কিছু দেখতে না পান। */
  var PRIVATE_PREFIXES = ['student:', 'fee:', 'settle:'];
  function purgePrivateData() {
    [window.localStorage, window.sessionStorage].forEach(function (store) {
      try {
        /* আগে সব কী জমা করি, তারপর মুছি (মুছতে মুছতে গুনলে কিছু কী বাদ পড়তে পারে) */
        var doomed = [];
        for (var i = 0; i < store.length; i++) {
          var k = store.key(i);
          if (k && PRIVATE_PREFIXES.some(function (p) { return k.indexOf(p) === 0; })) doomed.push(k);
        }
        doomed.forEach(function (k) { store.removeItem(k); });
      } catch (e) {}
    });
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ADMIN_CACHES' });
      }
    } catch (e) {}
  }
  function watchLogout() {
    var body = document.body;
    var wasUnlocked = !body.classList.contains('auth-locked');
    new MutationObserver(function () {
      var locked = body.classList.contains('auth-locked');
      if (!locked) { wasUnlocked = true; return; }
      if (wasUnlocked) {
        wasUnlocked = false;
        purgePrivateData();
        setTimeout(function () { location.reload(); }, 400);
      }
    }).observe(body, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.body) watchLogout(); else document.addEventListener('DOMContentLoaded', watchLogout);
})();
