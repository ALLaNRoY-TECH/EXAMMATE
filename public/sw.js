// ExamMate Service Worker for Web Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'ExamMate Notification';
    const options = {
      body: payload.body || 'You have an upcoming exam reminder.',
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
      data: {
        url: payload.url || '/',
        examId: payload.examId || null,
      },
      vibrate: [100, 50, 100],
      tag: payload.tag || 'exammate-notification',
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error handling push event in service worker:', err);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
