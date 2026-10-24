export type PlanId = 'monthly' | 'yearly' | 'extra_branch';

export const EXTRA_BRANCH_PRICE = 25000;
export const BASE_INCLUDED_STORES = 3; // 1 casa matriz + 2 sucursales o food trucks
export const BASE_INCLUDED_BRANCHES = 2; // Máximo de sucursales incluidas sin costo adicional

export type PlanConfig = {
  id: PlanId;
  name: string;
  tagline: string;
  description: string;
  price: number;
  formattedPrice: string;
  currency: string;
  interval: string;
  savingsText?: string;
  features: string[];
};

export const MERCADOPAGO_PLANS: Record<PlanId, PlanConfig> = {
  monthly: {
    id: 'monthly',
    name: 'Plan Mensual',
    tagline: 'Ideal para operar mes a mes',
    description: 'Obtén **acceso ilimitado** a pedidos por WhatsApp, mozo en mesa, QR de alta resolución y catálogo visual.',
    price: 50000,
    formattedPrice: '50.000',
    currency: 'ARS',
    interval: 'por mes',
    features: [
      'Menú digital interactivo (Reels, Cuadrícula y Lista)',
      'Pedidos directos a WhatsApp sin comisiones',
      'Función "Pedir en mesa" para mozos',
      'Generador de Códigos QR para imprimir',
      'Panel de edición en vivo y fotos ilimitadas',
      'Incluye hasta 3 locales (1 matriz + 2 sucursales/food trucks)',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Plan Anual',
    tagline: '¡Ahorrás $100.000 ARS! Equivalente a 2 meses gratis',
    description: 'Obtén **la opción más conveniente**. Asegurá tu carta todo el año al mejor precio garantizado.',
    price: 500000,
    formattedPrice: '500.000',
    currency: 'ARS',
    interval: 'por año',
    savingsText: 'Ahorrás $100.000 (2 meses gratis)',
    features: [
      'Todo lo incluido en el Plan Mensual',
      '2 meses totalmente bonificados (Ahorro de $100.000 ARS)',
      'Equivale a solo $41.666 ARS por mes',
      'Precio congelado y protegido por 12 meses',
      'Soporte prioritario para tu local',
      'Incluye hasta 3 locales (1 matriz + 2 sucursales/food trucks)',
    ],
  },
  extra_branch: {
    id: 'extra_branch',
    name: 'Punto de Venta Adicional',
    tagline: 'Sucursal o Food Truck adicional',
    description: 'Habilita un **nuevo local a la calle o food truck adicional** en tu red. Hereda tu catálogo y tiene su propio QR y WhatsApp.',
    price: EXTRA_BRANCH_PRICE,
    formattedPrice: '25.000',
    currency: 'ARS',
    interval: 'por local extra',
    features: [
      'Punto de venta o Food Truck adicional',
      'Hereda automáticamente tu catálogo de platos',
      'Enlace propio y Código QR independiente',
      'Número de WhatsApp exclusivo para pedidos',
      'Filtro de platos disponibles en 1 clic',
    ],
  },
};

export const TRIAL_CONFIG = {
  name: 'Gratis',
  tagline: 'Primer mes 100% gratuito',
  description: 'Obtén **30 días de prueba gratuita** con acceso completo para digitalizar tu carta y recibir pedidos.',
  price: 0,
  formattedPrice: '0',
  interval: 'por 30 días',
  subtext: 'Sin ingresar tarjeta de crédito',
  features: [
    '30 días de acceso total sin costo',
    'Creación ilimitada de categorías y platos',
    'Personalización de colores, logo y portada',
    'Probá con tus clientes antes de pagar',
  ],
};

function getAccessToken(): string {
  return (
    process.env.MP_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    ''
  );
}

export async function createPreference(params: {
  storeId: string;
  storeSlug: string;
  storeName: string;
  userEmail?: string;
  plan: PlanId;
  siteUrl: string;
}) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Falta configurar MP_ACCESS_TOKEN en las variables de entorno (.env.local).');
  }

  const planConfig = MERCADOPAGO_PLANS[params.plan];
  if (!planConfig) {
    throw new Error('Plan seleccionado inválido');
  }

  const endpoint = 'https://api.mercadopago.com/checkout/preferences';

  const isLocalhost =
    params.siteUrl.includes('localhost') ||
    params.siteUrl.includes('127.0.0.1');

  const payload: Record<string, unknown> = {
    items: [
      {
        id: `cartaapp-${params.plan}`,
        title: `Carta App - ${planConfig.name}`,
        description: `Suscripción ${planConfig.name} (${planConfig.interval}) para ${params.storeName}`,
        quantity: 1,
        currency_id: planConfig.currency,
        unit_price: planConfig.price,
      },
    ],
    payer: params.userEmail ? { email: params.userEmail } : undefined,
    back_urls: {
      success:
        params.plan === 'extra_branch'
          ? `${params.siteUrl}/admin?billing=extra_branch_success`
          : `${params.siteUrl}/admin?billing=success`,
      failure: `${params.siteUrl}/admin?billing=failure`,
      pending: `${params.siteUrl}/admin?billing=pending`,
    },
    external_reference: `${params.storeId}::${params.plan}`,
    statement_descriptor: 'CARTA APP',
    metadata: {
      store_id: params.storeId,
      store_slug: params.storeSlug,
      plan: params.plan,
    },
  };

  // Mercado Pago exige que back_url.success sea una URL pública HTTPS para auto_return.
  // En localhost o desarrollo local debe omitirse para evitar el error 'auto_return invalid'.
  if (!isLocalhost && params.siteUrl.startsWith('https://')) {
    payload.auto_return = 'approved';
    payload.notification_url = `${params.siteUrl}/api/mercadopago/webhook`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Error Mercado Pago Preference:', data);
    throw new Error(data.message || data.error || 'Error al comunicarse con Mercado Pago');
  }

  return {
    id: data.id as string,
    init_point: data.init_point as string,
    sandbox_init_point: data.sandbox_init_point as string,
  };
}

export async function getPaymentDetails(paymentId: string | number) {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Falta configurar MP_ACCESS_TOKEN en las variables de entorno.');
  }

  const endpoint = `https://api.mercadopago.com/v1/payments/${paymentId}`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Error al consultar pago en Mercado Pago');
  }

  return response.json();
}
