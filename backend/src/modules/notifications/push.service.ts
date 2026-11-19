import {
    createCipheriv,
    createECDH,
    createPrivateKey,
    createPublicKey,
    hkdfSync,
    randomBytes,
    sign,
} from 'node:crypto';
import { isIP } from 'node:net';
import { env } from '../../config/env';

export interface StoredPushSubscription {
    endpoint: string;
    p256dh: string;
    auth: string;
}

const b64url = (value: Buffer) => value.toString('base64url');
const fromB64url = (value: string) => Buffer.from(value, 'base64url');

export const isPushConfigured = () =>
    Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

const allowedPushHost = (hostname: string) => {
    const host = hostname.toLowerCase();
    if (isIP(host)) return false;

    return host === 'fcm.googleapis.com'
        || host === 'updates.push.services.mozilla.com'
        || host.endsWith('.push.services.mozilla.com')
        || host === 'web.push.apple.com'
        || host.endsWith('.push.apple.com')
        || host.endsWith('.notify.windows.com')
        || host.endsWith('.pns.windows.com');
};

const parseEndpoint = (endpoint: string) => {
    const url = new URL(endpoint);
    if (
        url.protocol !== 'https:'
        || url.username
        || url.password
        || (url.port && url.port !== '443')
        || !allowedPushHost(url.hostname)
    ) {
        throw new Error('PUSH_ENDPOINT_NOT_ALLOWED');
    }
    return url;
};

const createVapidToken = (audience: string) => {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        throw new Error('PUSH_NOT_CONFIGURED');
    }

    const rawPublicKey = fromB64url(env.VAPID_PUBLIC_KEY);
    if (rawPublicKey.length !== 65 || rawPublicKey[0] !== 4) {
        throw new Error('VAPID_PUBLIC_KEY_INVALID');
    }

    const x = b64url(rawPublicKey.subarray(1, 33));
    const y = b64url(rawPublicKey.subarray(33, 65));
    const privateKey = createPrivateKey({
        key: {
            kty: 'EC',
            crv: 'P-256',
            x,
            y,
            d: env.VAPID_PRIVATE_KEY,
        },
        format: 'jwk',
    });

    const derivedPublic = createPublicKey(privateKey).export({ format: 'jwk' });
    if (derivedPublic.x !== x || derivedPublic.y !== y) {
        throw new Error('VAPID_KEY_PAIR_MISMATCH');
    }

    const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
    const claims = b64url(Buffer.from(JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: env.VAPID_SUBJECT,
    })));
    const unsigned = `${header}.${claims}`;
    const signature = sign('sha256', Buffer.from(unsigned), {
        key: privateKey,
        dsaEncoding: 'ieee-p1363',
    });

    return `${unsigned}.${b64url(signature)}`;
};

const deriveKey = (salt: Buffer, inputKey: Buffer, info: Buffer, length: number) =>
    Buffer.from(hkdfSync('sha256', inputKey, salt, info, length));

const encryptPayload = (subscription: StoredPushSubscription, payload: string) => {
    const clientPublicKey = fromB64url(subscription.p256dh);
    const authSecret = fromB64url(subscription.auth);

    if (clientPublicKey.length !== 65 || clientPublicKey[0] !== 4 || authSecret.length < 16) {
        throw new Error('PUSH_SUBSCRIPTION_KEYS_INVALID');
    }

    const plain = Buffer.from(payload, 'utf8');
    // Web Push uses one aes128gcm record in this implementation.
    if (plain.length > 3500) throw new Error('PUSH_PAYLOAD_TOO_LARGE');

    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    const serverPublicKey = ecdh.getPublicKey();
    const sharedSecret = ecdh.computeSecret(clientPublicKey);

    const keyInfo = Buffer.concat([
        Buffer.from('WebPush: info\0', 'utf8'),
        clientPublicKey,
        serverPublicKey,
    ]);
    const inputKeyMaterial = deriveKey(authSecret, sharedSecret, keyInfo, 32);

    const salt = randomBytes(16);
    const contentKey = deriveKey(
        salt,
        inputKeyMaterial,
        Buffer.from('Content-Encoding: aes128gcm\0', 'utf8'),
        16,
    );
    const nonce = deriveKey(
        salt,
        inputKeyMaterial,
        Buffer.from('Content-Encoding: nonce\0', 'utf8'),
        12,
    );

    // 0x02 marks the final record in the aes128gcm content encoding.
    const plaintext = Buffer.concat([plain, Buffer.from([2])]);
    const cipher = createCipheriv('aes-128-gcm', contentKey, nonce);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const header = Buffer.alloc(21);
    salt.copy(header, 0);
    header.writeUInt32BE(4096, 16);
    header[20] = serverPublicKey.length;

    return Buffer.concat([header, serverPublicKey, ciphertext, authTag]);
};

export async function sendWebPush(
    subscription: StoredPushSubscription,
    payload: string,
): Promise<'sent' | 'expired' | 'failed'> {
    try {
        const endpoint = parseEndpoint(subscription.endpoint);
        const token = createVapidToken(endpoint.origin);
        const encrypted = encryptPayload(subscription, payload);

        const response = await fetch(endpoint, {
            method: 'POST',
            redirect: 'error',
            signal: AbortSignal.timeout(10000),
            headers: {
                Authorization: `vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`,
                TTL: '86400',
                Urgency: 'normal',
                'Content-Encoding': 'aes128gcm',
                'Content-Type': 'application/octet-stream',
            },
            body: new Uint8Array(encrypted),
        });

        if (response.status === 404 || response.status === 410) return 'expired';
        if (!response.ok) {
            console.warn('El proveedor push rechazó una notificación.', { status: response.status });
            return 'failed';
        }
        return 'sent';
    } catch (error) {
        console.warn('No se pudo entregar una notificación push.', {
            reason: error instanceof Error ? error.message : 'UNKNOWN',
        });
        return 'failed';
    }
}
