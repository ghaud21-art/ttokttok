// 홈 화면 설치(installability) 조건을 만족시키기 위한 최소 서비스워커.
// 별도 오프라인 캐싱 전략 없이 네트워크로 그대로 통과시킨다.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // no-op: 네트워크 요청을 가로채지 않고 그대로 통과시킨다.
});
