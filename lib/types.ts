export type MenuLayout = 'feed' | 'list' | 'grid';
export type MenuTheme = 'dark' | 'light';
export type ButtonStyle = 'accent' | 'whatsapp' | 'monochrome';

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
  /** Foto de portada o imagen de fondo del local */
  cover_url: string | null;
  created_by: string | null;
  /** Frase corta debajo del nombre (ej: "Pizzas a la piedra · Palermo") */
  tagline: string | null;
  /** Color de marca en HEX (#22c55e) */
  accent_color: string;
  /** Estilo del menú público: feed (Reels) o list (Lista tradicional) */
  layout: MenuLayout;
  /** Tema visual: dark (Modo Oscuro) o light (Modo Claro) */
  theme?: MenuTheme;
  /** Color de fondo personalizado del menú en HEX (ej: #0a0a0a, #ffffff, #1e1b18) */
  bg_color?: string | null;
  /** Estilo de color de los botones principales: accent, whatsapp o monochrome */
  button_style?: ButtonStyle;
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
  | 'name'
  | 'slug'
  | 'whatsapp'
  | 'logo_url'
  | 'cover_url'
  | 'tagline'
  | 'accent_color'
  | 'layout'
  | 'theme'
  | 'bg_color'
  | 'button_style'
> & {
  subscription_status?: SubscriptionStatus;
  current_period_end?: string | null;
};

