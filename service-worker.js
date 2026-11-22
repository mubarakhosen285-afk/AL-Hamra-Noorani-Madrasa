/* =====================================================================
   আল হামরা অ্যাডমিন প্যানেল — Service Worker (কঠোর নিরাপদ সংস্করণ)

   নিরাপত্তার নিয়ম:
   - অ্যাডমিন পেজ (index.html) কখনোই ক্যাশ করা হয় না; সবসময় নেটওয়ার্ক থেকে আসে।
     ইন্টারনেট না থাকলে শুধু offline.html দেখায় — অ্যাডমিন স্ক্রিন বা ডেটা নয়।
   - শুধু একটি নির্দিষ্ট তালিকার স্ট্যাটিক ফাইল (লোগো, আইকন, CSS) ক্যাশ হয়।
   - Firebase Database / Auth / লগইন / SMS API — কোনো অনুরোধ এই ফাইল স্পর্শ করে না।
   - ক্যাশের নাম "alhamra-admin-" দিয়ে শুরু; পাবলিক সাইটের ক্যাশ ("alhamra-shell-",
     "alhamra-runtime-") থেকে সম্পূর্ণ আলাদা, তাই একে অপরের ক্যাশ মোছে না।
   - Scope শুধু এই ফোল্ডার, পাবলিক সাইটের Service Worker-এর সাথে সংঘর্ষ নেই।
   ===================================================================== */
const VERSION = 'v1.4.0';
const STATIC_CACHE = 'alhamra-admin-static-' + VERSION;
const RUNTIME_CACHE = 'alhamra-admin-runtime-' + VERSION;

const STATIC_FILES = [
  'offline.html',
  'style.css',
  'design-upgrade.css',
  'madrasa.jpeg',
  'manifest.json',
  'pwa-admin.js',
  'exam-routine-admin.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];
const STATIC_PATHS = STATIC_FILES.map(function (f) {
  return new URL(f, self.location.href).pathname;
});

function isCacheableCrossOrigin(url) {
  if (url.hostname === 'fonts.googleapis.com') return true;
  if (url.hostname === 'fonts.gstatic.com') return true;
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) return true;
  return false;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return Promise.allSettled(STATIC_FILES.map(function (f) {
        return cache.add(new Request(f, { cache: 'reload' }));
      }));
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('alhamra-admin-') === 0 && k !== STATIC_CACHE && k !== RUNTIME_CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_ADMIN_CACHES') {
    event.waitUntil(caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('alhamra-admin-') === 0; })
        .map(function (k) { return caches.delete(k); }));
    }));
  }
});

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      var fetching = fetch(request).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || fetching;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      /* কখনো ক্যাশ নয়: নেটওয়ার্ক, না পেলে offline.html */
      event.respondWith(
        fetch(request).catch(function () {
          return caches.match('offline.html').then(function (r) {
            return r || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
          });
        })
      );
      return;
    }
    if (STATIC_PATHS.indexOf(url.pathname) !== -1 && !url.pathname.endsWith('/service-worker.js')) {
      event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    }
    /* তালিকার বাইরের সবকিছু সরাসরি নেটওয়ার্কে */
    return;
  }

  if (isCacheableCrossOrigin(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
  /* Firebase Database, Auth, SMS API ইত্যাদি — কখনো ক্যাশ নয় */
});
