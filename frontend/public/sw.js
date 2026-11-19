/* Escuela Digital service worker — notification delivery only. */
const CACHE_NAME = 'escuela-digital-static-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {};
    }

    const title = typeof data.title === 'string' ? data.title.slice(0, 80) : 'Escuela Digital';
    const body = typeof data.body === 'string'
        ? data.body.slice(0, 160)
        : 'Tienes una actualización nueva. Abre la plataforma para consultarla.';

    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon: '/icons.svg',
            badge: '/favicon.svg',
            tag: 'escuela-digital-update',
            renotify: false,
            data: { url: typeof data.url === 'string' ? data.url : '/notificaciones' },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const requested = event.notification.data?.url;
    let target = '/notificaciones';
    try {
        const parsed = new URL(typeof requested === 'string' ? requested : '/', self.location.origin);
        if (parsed.origin === self.location.origin && parsed.pathname.startsWith('/')) {
            target = parsed.pathname + parsed.search + parsed.hash;
        }
    } catch {
        target = '/notificaciones';
    }

    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
            if ('focus' in client && new URL(client.url).origin === self.location.origin) {
                await client.navigate(target);
                return client.focus();
            }
        }
        return self.clients.openWindow(target);
    })());
});
