import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

/**
 * Cliente oficial de Stripe para el backend (Node.js / Route Handlers)
 */
export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // @ts-expect-error Stripe version compatibility
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: {
    name: 'Carta App - SaaS Menús Digitales',
    version: '1.0.0',
  },
});
