const CACHE = 'cornerstone-0.15';
const ASSETS = [
  '/', '/index.html',
  '/src/app.js',
  '/src/theme.js',
  '/src/db.js',
  '/src/utils.js',
  '/src/components/Nav.js',
  '/src/components/Card.js',
  '/src/components/PieChart.js',
  '/src/components/PinLock.js',
  '/src/components/PinRestoreModal.js',
  '/src/components/SecuritySetup.js',
  '/src/components/Chatbot.js',
  '/src/components/GoalCard.js',
  '/src/components/AccountModal.js',
  '/src/components/WealthGauge.js',
  '/src/pages/Onboarding.js',
  '/src/pages/Dashboard.js',
  '/src/pages/Accounts.js',
  '/src/pages/Projections.js',
  '/src/pages/Recommendations.js',
  '/src/pages/LifeScore.js',
  '/src/pages/WeeklyReport.js',
  '/src/pages/Settings.js',
  '/src/pages/Lifestyle.js',
  '/src/pages/Support.js',
  '/src/pages/Admin.js',
  '/src/utils/wealthEngine.js',
  '/src/utils/crypto.js',
  '/src/utils/walletAuth.js',
  '/src/utils/totp.js',
  '/src/utils/export.js',
  '/src/utils/prices.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Always serve app shell from cache, try network for external resources
  if (e.request.url.includes('unsplash') || e.request.url.includes('open-meteo') || e.request.url.includes('anthropic')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
