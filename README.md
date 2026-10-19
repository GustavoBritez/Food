# LaCarta 🍽️📲

> **Crea tu menú digital en 2 minutos.**  
> Tus clientes escanean el QR en la mesa o entran desde Instagram: pueden armar su pedido para **mostrárselo al mozo** en el local o **enviártelo listo por WhatsApp** con un solo toque. Sin comisiones, sin pagos online, sin fricción.

Desarrollado con **Next.js 14 (App Router) + TailwindCSS + TypeScript + Supabase**. Listo para deployar en **Vercel**.

---

## 🚀 Arquitectura y Flujos del Negocio

```
                                  ┌────────────────────────┐
                                  │   Cliente escanea QR   │
                                  │       o abre link      │
                                  └───────────┬────────────┘
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │    /p/[slug]      │
                                    │   Menú Público    │
                                    └────┬──────────┬───┘
                                         │          │
                     ┌───────────────────┘          └──────────────────┐
                     ▼                                                 ▼
        [ FLUJO 1: DENTRO DEL LOCAL ]                    [ FLUJO 2: FUERA DEL LOCAL ]
        1. Elige platos en el menú                       1. Toca "Pedir por WhatsApp"
        2. Toca "Mostrar al mozo"                           o arma el pedido en el carrito
        3. Se abre modal con el resumen                  2. Se abre wa.me/{whatsapp}
           ("2x Pizza Muzzarella", etc.)                    con mensaje pre-formateado
        4. El mozo toma nota y cobra en mesa             3. Te llega el pedido a la cocina
```

### Reglas de Negocio
* **No cobra ni procesa pagos:** Todo se paga en el local o por transferencia directa acordada por WhatsApp.
* **Mensaje URL-encoded:** Genera un texto limpio y profesional para WhatsApp:
  ```text
  Hola Bar de Prueba! Quiero pedir:
  - 1x Pizza Muzzarella $9.500
  - 2x Pinta IPA $9.600
  Total: $19.100
  ```
* **QR de alta resolución:** Generado con `qrcode.react`, apunta a `https://[tudominio]/p/[slug]` con el logo de tu local centrado. Se descarga en PNG de 1024x1024 px listo para imprimir.

---

## 🗄️ Esquema de Base de Datos (Supabase)

La base de datos utiliza **Row Level Security (RLS)** estricto: el menú es público para lectura (`anon`), pero solo el dueño autenticado puede modificar su local, categorías y productos.

* **`stores`**: ID, nombre, slug (`/p/[slug]`), número de WhatsApp (formato internacional ej: `5491123456789`), logo y usuario dueño (`created_by`).
* **`categories`**: ID, store_id, nombre, orden.
* **`products`**: ID, store_id, category_id, nombre, descripción, precio, foto_url, disponibilidad (`available`), orden.
* **Storage Bucket `menus`**: Bucket público para almacenar fotos de productos y logos comprimidos automáticamente a WebP.

---

## ⚡ Guía Paso a Paso: Configurar Supabase

### 1. Crear un Proyecto en Supabase
1. Ingresá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (gratuito).
2. En el panel de tu proyecto, andá a **Project Settings > API**.
3. Copiá la **Project URL** y la **anon public key**.

### 2. Ejecutar la Migración de Base de Datos
1. En el menú lateral de Supabase, andá a **SQL Editor**.
2. Hacé clic en **New query**, copiá todo el contenido del archivo [`supabase/migrations/20261018000000_init.sql`](supabase/migrations/20261018000000_init.sql) y pegalo.
3. Hacé clic en **Run**.  
   *Esto creará las tablas `stores`, `categories`, `products`, las políticas RLS y el bucket de almacenamiento `menus`.*

### 3. Cargar el Local de Ejemplo ("Bar de Prueba")
1. En el **SQL Editor**, abrí otra consulta y pegá el contenido de [`supabase/seed.sql`](supabase/seed.sql).
2. Hacé clic en **Run**.
3. ¡Listo! Ya tenés cargado el local con 6 categorías y 16 productos con fotos reales en `/p/bar-de-prueba`.

> **¿Cómo adueñarte del Bar de Prueba desde `/admin`?**  
> Una vez que te loguees en la app con tu email, ejecutá en el SQL Editor:
> ```sql
> update public.stores
>    set created_by = (select id from auth.users where email = 'TU_EMAIL@ejemplo.com')
>  where slug = 'bar-de-prueba';
> ```

### 4. Configurar Auth (Magic Link sin Contraseña)
1. En Supabase, andá a **Authentication > Providers > Email**.
   * Asegurate de que **Enable Email provider** esté activo.
   * Podés dejar desactivado "Confirm email" si querés login directo por magic link.
2. Andá a **Authentication > URL Configuration**:
   * **Site URL**: En local poné `http://localhost:3000`. En producción poné `https://tu-dominio.vercel.app`.
   * **Redirect URLs**: Agregá:
     * `http://localhost:3000/auth/callback`
     * `https://tu-dominio.vercel.app/auth/callback`

---

## 💻 Instalación y Ejecución Local

1. Cloná el repositorio e instalá las dependencias:
   ```bash
   npm install
   ```

2. Creá tu archivo `.env.local` a partir de `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Completá con tus credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Levantá el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📱 Pantallas Principales

| Ruta | Descripción |
| :--- | :--- |
| **`/`** | Landing page minimalista con estética tipo Apple explicando ambos flujos. |
| **`/login`** | Inicio de sesión con Magic Link (sin contraseña). |
| **`/admin`** | Panel del dueño protegido: alta de local, CRUD de categorías y productos, subida de fotos comprimidas en WebP, live preview en marco de iPhone, generador de QR descargable y botón para copiar link de WhatsApp. |
| **`/p/[slug]`** | Menú público del local (ej: `/p/bar-de-prueba`). Ultrarrápido, mobile-first, buscador, selector de categorías, botón "Pedir en mesa" y botón "Pedir por WhatsApp". |

---

## 🚀 Despliegue en Vercel

1. Subí tu repositorio a GitHub.
2. Importá el proyecto en [Vercel](https://vercel.com).
3. En la sección **Environment Variables**, agregá:
   * `NEXT_PUBLIC_SUPABASE_URL`: La URL de tu proyecto de Supabase.
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`: La clave anónima pública de Supabase.
   * `NEXT_PUBLIC_SITE_URL`: Tu dominio final de Vercel (ej: `https://menuqr.vercel.app`).
4. Hacé clic en **Deploy**. ¡Tu SaaS estará funcionando en segundos con CDN global!
