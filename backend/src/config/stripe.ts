import Stripe from 'stripe';
import { env } from './env';

// Stripe permanece deshabilitado hasta configurar STRIPE_SECRET_KEY.
// Los controladores de pagos no deben aceptar importes ni estados desde el navegador.
export const stripe: Stripe | null = env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia' as any,
        typescript: true,
    })
    : null;

export default stripe;
