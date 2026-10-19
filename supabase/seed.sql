-- =============================================================================
-- MenuQR · Seed: "Bar de Prueba"  →  /p/bar-de-prueba
-- Ejecutar DESPUÉS de la migración. Es idempotente (se puede correr varias veces).
--
-- El local se crea sin dueño (created_by = null): se ve público pero nadie lo edita.
-- Para administrarlo desde /admin, logueate una vez con tu mail y corré:
--
--   update public.stores
--      set created_by = (select id from auth.users where email = 'TU_MAIL@ejemplo.com')
--    where slug = 'bar-de-prueba';
-- =============================================================================

insert into public.stores (id, name, slug, whatsapp, logo_url, created_by, tagline, accent_color, layout)
values (
  '00000000-0000-4000-8000-000000000001',
  'Bar de Prueba',
  'bar-de-prueba',
  '5491123456789',
  null,
  null,
  'Pizzas, burgers y cerveza tirada',
  '#f97316',
  'feed'
)
on conflict (id) do update
  set name = excluded.name, slug = excluded.slug, whatsapp = excluded.whatsapp,
      tagline = excluded.tagline, accent_color = excluded.accent_color, layout = excluded.layout;

insert into public.categories (id, store_id, name, "order") values
  ('c0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Pizzas',          0),
  ('c0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Hamburguesas',    1),
  ('c0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'Para compartir',  2),
  ('c0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Cervezas',        3),
  ('c0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Sin alcohol',     4),
  ('c0000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'Postres',         5)
on conflict (id) do update
  set name = excluded.name, "order" = excluded."order";

insert into public.products
  (id, store_id, category_id, name, description, price, photo_url, available, "order")
values
  -- Pizzas
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Pizza Muzzarella', 'Salsa de tomate, muzzarella, orégano y aceitunas verdes. 8 porciones.', 9500,
   'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Pizza Napolitana', 'Muzzarella, rodajas de tomate, ajo y albahaca fresca.', 11200,
   'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=75', true, 1),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Pizza Especial', 'Muzzarella, jamón cocido, morrones asados y huevo duro.', 12500,
   'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=75', true, 2),

  -- Hamburguesas
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
   'Hamburguesa Clásica', 'Medallón de 180 g, cheddar, lechuga, tomate y salsa de la casa. Con papas.', 10800,
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
   'Hamburguesa Doble Bacon', 'Doble medallón, doble cheddar, panceta crocante y cebolla caramelizada. Con papas.', 13900,
   'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=75', true, 1),

  -- Para compartir
  ('a0000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003',
   'Papas con cheddar y verdeo', 'Porción grande de papas fritas bañadas en cheddar, panceta y verdeo.', 8200,
   'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003',
   'Picada para dos', 'Quesos, fiambres, aceitunas, maní y pan casero.', 15500,
   'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=800&q=75', true, 1),
  ('a0000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000003',
   'Nachos con guacamole', 'Totopos de maíz, cheddar, guacamole y pico de gallo.', 7900,
   'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=800&q=75', true, 2),

  -- Cervezas
  ('a0000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004',
   'Pinta Golden Ale', 'Tirada, 500 ml. Suave y refrescante.', 4200,
   'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004',
   'Pinta IPA', 'Tirada, 500 ml. Amarga y lupulada.', 4800,
   'https://images.unsplash.com/photo-1566633806327-68e152aaf26d?auto=format&fit=crop&w=800&q=75', true, 1),
  ('a0000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004',
   'Pinta Stout', 'Tirada, 500 ml. Notas a café y chocolate.', 4800,
   'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=75', false, 2),

  -- Sin alcohol
  ('a0000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000005',
   'Gaseosa línea Coca-Cola', 'Lata 354 ml. Común o sin azúcar.', 2500,
   'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000005',
   'Limonada con menta y jengibre', 'Jarra de 1 litro.', 5200,
   'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?auto=format&fit=crop&w=800&q=75', true, 1),
  ('a0000000-0000-4000-8000-00000000000e', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000005',
   'Agua mineral', '500 ml, con o sin gas.', 1900,
   null, true, 2),

  -- Postres
  ('a0000000-0000-4000-8000-00000000000f', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000006',
   'Brownie con helado', 'Brownie tibio con bocha de helado de crema americana.', 6400,
   'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=75', true, 0),
  ('a0000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000006',
   'Flan casero', 'Con dulce de leche y crema.', 5100,
   'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=800&q=75', true, 1)
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      photo_url = excluded.photo_url,
      available = excluded.available,
      "order" = excluded."order",
      category_id = excluded.category_id;
