export type MenuLayout = 'feed' | 'list';

export type SubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export type Store = {
  id: string;
  name: string;
  slug: string;
  whatsapp: string;
  logo_url: string | null;
  created_by: string | null;
  /** Frase corta debajo del nombre (ej: "Pizzas a la piedra · Palermo") */
  tagline: string | null;
  /** Color de marca en HEX (#22c55e) */
  accent_color: string;
  /** Estilo del menú público */
  layout: MenuLayout;
  created_at?: string;
  /** Campos de facturación Stripe ($30 USD/mes) */
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: SubscriptionStatus;
  current_period_end?: string | null;
  plan_price_id?: string | null;
};

export type Category = {
  id: string;
  store_id: string;
  name: string;
  order: number;
};

export type Product = {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  photo_url: string | null;
  video_url: string | null;
  available: boolean;
  order: number;
};

/** Datos del local que necesita el menú público */
export type PublicStore = Pick<
  Store,
  'name' | 'slug' | 'whatsapp' | 'logo_url' | 'tagline' | 'accent_color' | 'layout'
> & {
  subscription_status?: SubscriptionStatus;
  current_period_end?: string | null;
};

