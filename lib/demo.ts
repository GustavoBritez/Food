import type { Category, Product, PromoPost, PublicStore } from './types';

/**
 * Restaurante de prueba que vive en el código (no necesita Supabase).
 * Se ve en /p/demo y en la landing. El slug "demo" está reservado.
 */
export const DEMO_SLUG = 'demo';

export const DEMO_STORE: PublicStore = {
  id: 'demo-store',
  name: 'Restaurante de Prueba',
  slug: DEMO_SLUG,
  whatsapp: '5491128989237',
  logo_url: null,
  cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  tagline: 'Cocina casera, burgers y tragos · Demo de Carta App',
  location: 'Palermo, CABA',
  category_tag: 'Hamburguesas',
  accent_color: '#22c55e',
  layout: 'feed',
  theme: 'dark',
  bg_color: '#0a0a0a',
  button_style: 'accent',
  theme_config: {
    presetId: 'urban_reels',
    fontPair: 'modern',
    bgPattern: 'none',
    priceFormat: 'badge',
    showNetPrice: false,
    showWatermark: false,
  },
  plan_type: 'monthly',
  subscription_status: 'active',
  current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
};

export const DEMO_BRANCH_SLUG = 'demo-truck';

export const DEMO_BRANCH_STORE: PublicStore = {
  id: 'demo-truck',
  parent_store_id: 'demo-store',
  name: 'Food Truck Plaza',
  slug: DEMO_BRANCH_SLUG,
  whatsapp: '5491128989237',
  logo_url: null,
  cover_url: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1200&q=80',
  tagline: 'Punto móvil · Burgers y Cervezas al paso',
  location: 'Costanera Norte',
  category_tag: 'Food Trucks',
  accent_color: '#f97316',
  layout: 'feed',
  theme: 'dark',
  bg_color: '#0a0a0a',
  button_style: 'accent',
  theme_config: {
    presetId: 'urban_bar',
    fontPair: 'modern',
    bgPattern: 'none',
    priceFormat: 'badge',
    showNetPrice: false,
    showWatermark: false,
  },
  plan_type: 'monthly',
  subscription_status: 'active',
  current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
};

const STORE_ID = 'demo-store';
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=75`;

const CATS: Array<[id: string, name: string, subtitle?: string]> = [
  ['ensaladas', 'Ensaladas', 'Vegetales orgánicos y aderezos artesanales'],
  ['burgers', 'Hamburguesas', '100% carne seleccionada en pan brioche horneado diario'],
  ['pizzas', 'Pizzas', 'Masa madre fermentada 48 hs con piso a la piedra'],
  ['pastas', 'Pastas y carnes', 'Pastas caseras y cortes a punto'],
  ['compartir', 'Para compartir', 'Porciones generosas ideales para tapear'],
  ['bebidas', 'Bebidas', 'Cervezas artesanales tiradas y cócteles clásicos'],
  ['postres', 'Postres', 'El toque dulce para coronar la mesa'],
];

export const DEMO_CATEGORIES: Category[] = CATS.map(([id, name, subtitle], order) => ({
  id: `demo-cat-${id}`,
  store_id: STORE_ID,
  name,
  subtitle: subtitle ?? null,
  order,
}));

type Row = [
  cat: string,
  name: string,
  description: string,
  price: number,
  photo: string,
  badges?: Array<'vegano' | 'vegetariano' | 'sin_tacc' | 'picante' | 'destacado'>
];

const ROWS: Row[] = [
  ['ensaladas', 'Crispy Chicken Salad', 'Pollo crocante, palta, mix de verdes, tomates cherry y aderezo de miel y mostaza.', 9200, 'photo-1512621776951-a57141f2eefd', ['destacado']],
  ['ensaladas', 'Bowl Veggie', 'Quinoa, garbanzos, palta, zanahoria, repollo morado y hummus.', 8700, 'photo-1546069901-ba9599a7e63c', ['vegano', 'sin_tacc']],
  ['ensaladas', 'Poke de Salmón', 'Arroz de sushi, salmón rosado, palta, pepino, edamame y salsa ponzu.', 12400, 'photo-1546069901-d5bfd2cbfb1f', ['sin_tacc', 'destacado']],
  ['ensaladas', 'Ensalada César', 'Lechuga romana, pollo grillado, croutons, parmesano y aderezo César casero.', 8900, 'photo-1540420773420-3366772f4999'],

  ['burgers', 'Burger Doble Cheddar', 'Doble medallón de carne, cheddar fundido, bacon y salsa especial. Con papas.', 11900, 'photo-1568901346375-23c9450c58cd', ['destacado']],
  ['burgers', 'Burger Clásica', 'Medallón de 180 g, lechuga, tomate, cebolla y queso. Con papas.', 9800, 'photo-1550547660-d9450f859349'],
  ['burgers', 'Burger BBQ Bacon', 'Carne, cheddar, cebolla caramelizada, bacon crocante y salsa barbacoa.', 12500, 'photo-1553979459-d2229ba7433b', ['picante']],
  ['burgers', 'Burger Smash', 'Dos smash patties, american cheese, pepinillos y mostaza. Con papas.', 10900, 'photo-1529692236671-f1f6cf9683ba'],

  ['pizzas', 'Pizza Muzzarella', 'Salsa de tomate, muzzarella, orégano y aceitunas verdes. 8 porciones.', 9500, 'photo-1513104890138-7c749659a591', ['vegetariano']],
  ['pizzas', 'Pizza Napolitana', 'Muzzarella, rodajas de tomate, ajo y albahaca fresca.', 11200, 'photo-1574071318508-1cdbab80d002', ['vegetariano']],
  ['pizzas', 'Pizza Pepperoni', 'Muzzarella y abundante pepperoni crocante.', 12300, 'photo-1604382354936-07c5d9983bd3', ['picante', 'destacado']],

  ['pastas', 'Spaghetti a la Bolognesa', 'Pasta fresca con salsa de carne cocida a fuego lento y parmesano.', 9900, 'photo-1563379926898-05f4575a45d8'],
  ['pastas', 'Pasta Primavera', 'Penne con vegetales salteados, tomates cherry y albahaca.', 9400, 'photo-1473093295043-cdd812d0e601', ['vegetariano']],
  ['pastas', 'Bife de Chorizo', '400 g a la parrilla con papas rústicas o ensalada.', 16800, 'photo-1600891964092-4316c288032e', ['sin_tacc', 'destacado']],

  ['compartir', 'Papas con Cheddar y Bacon', 'Porción grande de papas fritas bañadas en cheddar, bacon y verdeo.', 8200, 'photo-1573080496219-bb080dd4f877'],
  ['compartir', 'Nachos con Guacamole', 'Totopos de maíz, cheddar, guacamole y pico de gallo.', 7900, 'photo-1513456852971-30c0b8199d4d', ['vegetariano', 'sin_tacc']],
  ['compartir', 'Tabla de Quesos y Fiambres', 'Selección de quesos, jamón crudo, salame, aceitunas y pan casero.', 15500, 'photo-1452195100486-9cc805987862', ['destacado']],

  ['bebidas', 'Limonada con Menta y Jengibre', 'Jarra de 1 litro, bien fría.', 5200, 'photo-1523371054106-bbf80586c38c', ['vegano', 'sin_tacc']],
  ['bebidas', 'Pinta de Cerveza Artesanal', 'Tirada, 500 ml. Golden, IPA o Stout.', 4500, 'photo-1608270586620-248524c67de9'],
  ['bebidas', 'Gin Tonic', 'Gin, tónica, pepino y pimienta rosa.', 6800, 'photo-1551538827-9c037cb4f32a', ['sin_tacc']],
  ['bebidas', 'Gaseosa línea Coca-Cola', 'Lata 354 ml. Común o sin azúcar.', 2500, 'photo-1622483767028-3f66f32aef97'],

  ['postres', 'Brownie con Helado', 'Brownie tibio con bocha de helado de crema americana.', 6400, 'photo-1606313564200-e75d5e30476c', ['destacado']],
  ['postres', 'Cheesecake de Frutos Rojos', 'Base crocante, crema de queso y coulis de frutos rojos.', 6900, 'photo-1533134242443-d4fd215305ad', ['vegetariano']],
  ['postres', 'Flan Casero', 'Con dulce de leche y crema.', 5100, 'photo-1624353365286-3f8d62daad51', ['sin_tacc']],
];

const orderInCat = new Map<string, number>();

export const DEMO_PRODUCTS: Product[] = ROWS.map(([cat, name, description, price, photo, badges], i) => {
  const order = orderInCat.get(cat) ?? 0;
  orderInCat.set(cat, order + 1);
  return {
    id: `demo-prod-${i + 1}`,
    store_id: STORE_ID,
    category_id: `demo-cat-${cat}`,
    name,
    description,
    price,
    photo_url: img(photo),
    video_url: null,
    available: true,
    badges: badges ?? [],
    order,
  };
});

export const DEMO_PROMO_POSTS: PromoPost[] = [
  {
    id: 'demo-promo-1',
    store_id: 'demo-store',
    store_name: 'Restaurante de Prueba',
    store_slug: 'demo',
    store_whatsapp: '5491128989237',
    store_logo_url: null,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1080&q=80',
    caption: '🔥 2x1 en Burger Doble Cheddar + Papas Rústicas todos los Miércoles y Jueves de 19 a 23 hs. ¡Pedila ahora por WhatsApp o vení al local!',
    promo_price: 14900,
    badge_text: '2x1 BURGERS',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-promo-2',
    store_id: 'demo-truck',
    store_name: 'Food Truck Plaza',
    store_slug: 'demo-truck',
    store_whatsapp: '5491128989237',
    store_logo_url: null,
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1080&q=80',
    caption: '🍕 Combo Amigos: 1 Pizza Napolitana a la Piedra + 1 Pizza Muzzarella + 2 Pintas de IPA Artesanal bien heladas.',
    promo_price: 23500,
    badge_text: 'COMBO AMIGOS',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-promo-3',
    store_id: 'demo-store',
    store_name: 'Restaurante de Prueba',
    store_slug: 'demo',
    store_whatsapp: '5491128989237',
    store_logo_url: null,
    image_url: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=1080&q=80',
    caption: '🧀 Tabla de Quesos, Jamón Crudo Reserva y Pan de Masa Madre para 3 personas + 2 Gin Tonics de Autor.',
    promo_price: 21800,
    badge_text: 'HAPPY HOUR',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

