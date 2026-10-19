import type { Category, Product, PublicStore } from './types';

/**
 * Restaurante de prueba que vive en el código (no necesita Supabase).
 * Se ve en /p/demo y en la landing. El slug "demo" está reservado.
 */
export const DEMO_SLUG = 'demo';

export const DEMO_STORE: PublicStore = {
  name: 'Restaurante de Prueba',
  slug: DEMO_SLUG,
  whatsapp: '5491128989237',
  logo_url: null,
  tagline: 'Cocina casera, burgers y tragos · Demo de LaCarta',
  accent_color: '#22c55e',
  layout: 'feed',
};

const STORE_ID = 'demo-store';
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=75`;

const CATS: Array<[id: string, name: string]> = [
  ['ensaladas', 'Ensaladas'],
  ['burgers', 'Hamburguesas'],
  ['pizzas', 'Pizzas'],
  ['pastas', 'Pastas y carnes'],
  ['compartir', 'Para compartir'],
  ['bebidas', 'Bebidas'],
  ['postres', 'Postres'],
];

export const DEMO_CATEGORIES: Category[] = CATS.map(([id, name], order) => ({
  id: `demo-cat-${id}`,
  store_id: STORE_ID,
  name,
  order,
}));

type Row = [cat: string, name: string, description: string, price: number, photo: string];

const ROWS: Row[] = [
  ['ensaladas', 'Crispy Chicken Salad', 'Pollo crocante, palta, mix de verdes, tomates cherry y aderezo de miel y mostaza.', 9200, 'photo-1512621776951-a57141f2eefd'],
  ['ensaladas', 'Bowl Veggie', 'Quinoa, garbanzos, palta, zanahoria, repollo morado y hummus.', 8700, 'photo-1546069901-ba9599a7e63c'],
  ['ensaladas', 'Poke de Salmón', 'Arroz de sushi, salmón rosado, palta, pepino, edamame y salsa ponzu.', 12400, 'photo-1546069901-d5bfd2cbfb1f'],
  ['ensaladas', 'Ensalada César', 'Lechuga romana, pollo grillado, croutons, parmesano y aderezo César casero.', 8900, 'photo-1540420773420-3366772f4999'],

  ['burgers', 'Burger Doble Cheddar', 'Doble medallón de carne, cheddar fundido, bacon y salsa especial. Con papas.', 11900, 'photo-1568901346375-23c9450c58cd'],
  ['burgers', 'Burger Clásica', 'Medallón de 180 g, lechuga, tomate, cebolla y queso. Con papas.', 9800, 'photo-1550547660-d9450f859349'],
  ['burgers', 'Burger BBQ Bacon', 'Carne, cheddar, cebolla caramelizada, bacon crocante y salsa barbacoa.', 12500, 'photo-1553979459-d2229ba7433b'],
  ['burgers', 'Burger Smash', 'Dos smash patties, american cheese, pepinillos y mostaza. Con papas.', 10900, 'photo-1529692236671-f1f6cf9683ba'],

  ['pizzas', 'Pizza Muzzarella', 'Salsa de tomate, muzzarella, orégano y aceitunas verdes. 8 porciones.', 9500, 'photo-1513104890138-7c749659a591'],
  ['pizzas', 'Pizza Napolitana', 'Muzzarella, rodajas de tomate, ajo y albahaca fresca.', 11200, 'photo-1574071318508-1cdbab80d002'],
  ['pizzas', 'Pizza Pepperoni', 'Muzzarella y abundante pepperoni crocante.', 12300, 'photo-1604382354936-07c5d9983bd3'],

  ['pastas', 'Spaghetti a la Bolognesa', 'Pasta fresca con salsa de carne cocida a fuego lento y parmesano.', 9900, 'photo-1563379926898-05f4575a45d8'],
  ['pastas', 'Pasta Primavera', 'Penne con vegetales salteados, tomates cherry y albahaca.', 9400, 'photo-1473093295043-cdd812d0e601'],
  ['pastas', 'Bife de Chorizo', '400 g a la parrilla con papas rústicas o ensalada.', 16800, 'photo-1600891964092-4316c288032e'],

  ['compartir', 'Papas con Cheddar y Bacon', 'Porción grande de papas fritas bañadas en cheddar, bacon y verdeo.', 8200, 'photo-1573080496219-bb080dd4f877'],
  ['compartir', 'Nachos con Guacamole', 'Totopos de maíz, cheddar, guacamole y pico de gallo.', 7900, 'photo-1513456852971-30c0b8199d4d'],
  ['compartir', 'Tabla de Quesos y Fiambres', 'Selección de quesos, jamón crudo, salame, aceitunas y pan casero.', 15500, 'photo-1452195100486-9cc805987862'],

  ['bebidas', 'Limonada con Menta y Jengibre', 'Jarra de 1 litro, bien fría.', 5200, 'photo-1523371054106-bbf80586c38c'],
  ['bebidas', 'Pinta de Cerveza Artesanal', 'Tirada, 500 ml. Golden, IPA o Stout.', 4500, 'photo-1608270586620-248524c67de9'],
  ['bebidas', 'Gin Tonic', 'Gin, tónica, pepino y pimienta rosa.', 6800, 'photo-1551538827-9c037cb4f32a'],
  ['bebidas', 'Gaseosa línea Coca-Cola', 'Lata 354 ml. Común o sin azúcar.', 2500, 'photo-1622483767028-3f66f32aef97'],

  ['postres', 'Brownie con Helado', 'Brownie tibio con bocha de helado de crema americana.', 6400, 'photo-1606313564200-e75d5e30476c'],
  ['postres', 'Cheesecake de Frutos Rojos', 'Base crocante, crema de queso y coulis de frutos rojos.', 6900, 'photo-1533134242443-d4fd215305ad'],
  ['postres', 'Flan Casero', 'Con dulce de leche y crema.', 5100, 'photo-1624353365286-3f8d62daad51'],
];

const orderInCat = new Map<string, number>();

export const DEMO_PRODUCTS: Product[] = ROWS.map(([cat, name, description, price, photo], i) => {
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
    order,
  };
});
