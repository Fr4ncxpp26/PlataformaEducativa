// backend/src/modules/payments/payments.routes.ts
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import * as paymentsController from './payments.controllers';

const router = Router();

// Nota: El webhook de Stripe suele registrarse en index.ts con express.raw({ type: 'application/json' })
// Las rutas autenticadas para crear sesión de checkout o verificar compras van aquí:
router.use(requireAuth);
//router.post('/checkout', paymentsController.createCheckoutSession);
router.get('/my-payments', paymentsController.getMyPayments);

export default router;