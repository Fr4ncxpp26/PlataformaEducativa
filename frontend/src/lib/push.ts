import { api } from './api';

const decodeApplicationServerKey = (value: string) => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const raw = window.atob(padded);
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

const ensureServiceWorker = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Este navegador no admite notificaciones push.');
    }
    if (!window.isSecureContext) {
        throw new Error('Las notificaciones push requieren HTTPS o localhost.');
    }

    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return navigator.serviceWorker.ready;
};

export async function enablePushOnThisDevice() {
    const config = await api<{ available: boolean; publicKey: string | null }>('/notifications/push/config');
    if (!config.available || !config.publicKey) {
        throw new Error('Las notificaciones push no están configuradas en el servidor.');
    }

    const registration = await ensureServiceWorker();
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('No concediste permiso para mostrar notificaciones.');
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeApplicationServerKey(config.publicKey),
        });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('El navegador devolvió una suscripción incompleta.');
    }

    await api('/notifications/push/subscriptions', {
        method: 'POST',
        body: {
            endpoint: json.endpoint,
            keys: {
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
            },
        },
    });

    return subscription;
}

export async function removePushFromThisDevice() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await api('/notifications/push/subscriptions', {
        method: 'DELETE',
        body: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
}

export async function registerNotificationServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
        // La plataforma sigue funcionando aunque el navegador no permita registrar SW.
    }
}
