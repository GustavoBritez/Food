# Carta App 🍽️📲

> **La plataforma de menús digitales interactivos para bares, restaurantes y cafeterías.**  
> Diseñada para transformar la experiencia de pedir comida: formatos modernos tipo Reels, pedidos directos por WhatsApp, resumen para mozos en mesa y autogestión total para los dueños.

---

## 💡 ¿De qué trata Carta App?

**Carta App** es una solución SaaS multi-tenant que reemplaza los aburridos códigos QR que abren archivos PDF pesados e incómodos. Ofrece a los locales gastronómicos una aplicación web ultrarrápida, interactiva y personalizable donde los comensales pueden explorar platos con fotos y videos de alta calidad, armar su pedido y enviarlo sin intermediarios ni comisiones.

Para los dueños de bares y restaurantes, es un centro de comando intuitivo para actualizar precios al instante, pausar productos agotados en un clic, generar códigos QR listos para imprimir y gestionar su suscripción de forma autónoma.

---

## ⚡ Características Principales (Features)

### 📱 1. Experiencia del Menú para Comensales (`/p/[slug]`)
* **Modo Reels Interactivo:** Navegación vertical a pantalla completa con videos y fotos de platos en alta definición, inspirada en las interfaces dinámicas de redes sociales.
* **Modo Lista Visual:** Diseño clásico y estructurado por categorías con buscador instantáneo, ideal para quienes buscan rapidez o comensales tradicionales.
* **Doble Flujo de Pedidos Flexible:**
  * **Dentro del local (Mostrar al mozo):** El cliente selecciona sus platos y abre un resumen claro y ordenado en pantalla para que el mozo tome nota en mesa sin errores.
  * **Delivery / Takeaway (Pedir por WhatsApp):** El carrito genera un mensaje estructurado y codificado con el detalle de los productos, cantidades y precio total, redirigiendo directamente a la conversación de WhatsApp oficial del local (`wa.me`).
* **PWA Instalable (Progressive Web App):** Tanto los clientes habituales como el personal del bar pueden instalar Carta App directamente en la pantalla de inicio de su teléfono (iOS y Android) como si fuera una aplicación nativa, con soporte offline básico y sin pasar por las tiendas de aplicaciones.
* **Carga Instantánea con ISR:** Arquitectura con regeneración estática incremental que entrega los menús en menos de 10 milisegundos desde servidores perimetrales (Edge CDN).

---

### 🛠️ 2. Panel de Control del Dueño (`/admin`)
* **Simulador de iPhone en Tiempo Real:** Interfaz dividida en dos columnas que muestra un marco interactivo de smartphone donde el dueño ve reflejado en vivo exactamente cómo queda su carta mientras realiza modificaciones.
* **Gestión Rápida de Catálogo:**
  * Alta, baja y modificación de categorías y platos.
  * Interruptor de disponibilidad en un solo toque (*switch*) para marcar productos como "Agotado" en segundos durante los horarios pico.
  * Modificación instantánea de precios sin necesidad de reimprimir cartas físicas.
* **Optimización Inteligente de Medios:**
  * **Compresión automática a WebP:** Las fotos tomadas con celulares de alta gama (4 a 15 MB) son redimensionadas y convertidas en el navegador antes de subirse, dejándolas en ~150 KB sin pérdida perceptible de calidad.
  * **Soporte para video corto:** Acepta clips de video de hasta 25 MB en formatos MP4, WebM y MOV.
* **Personalización de Marca:**
  * Elección de color de acento primario (HEX) para botones e indicadores.
  * Subida de logo oficial y frase identificatoria (*tagline*).
  * Selector del modo de visualización inicial por defecto (Reels o Lista).
* **Generador de Código QR en Alta Resolución:**
  * Genera el código QR vectorial vinculado a la URL del restaurante.
  * Descarga directa en formato PNG de 1024x1024 px con el logo centralizado, listo para ser enviado a imprenta o colocado en las mesas.
* **Acceso Rápido a WhatsApp:** Botón para copiar el enlace directo de pedidos y pegarlo en la biografía de Instagram o en el perfil de Google Maps del negocio.

---

### 💳 3. Suscripciones y Facturación Automatizada (Mercado Pago)
* **Primer Mes Gratuito (30 Días de Prueba):** Activación inmediata en 1 solo clic sin requerir tarjeta de crédito por adelantado.
* **Planes Flexibles en Moneda Local:**
  * **Plan Mensual:** $50.000 ARS / mes vía Mercado Pago Checkout Pro.
  * **Plan Anual:** $500.000 ARS / año (ahorro de $100.000 ARS, equivalente a 2 meses bonificados).
* **Checkout Pro de Mercado Pago:** Pagos con tarjeta de débito/crédito, dinero en cuenta de Mercado Pago y transferencias inmediatas.
* **Paywall Inteligente:** Control del estado del servicio (`active`, `trialing`, `past_due`, `canceled`, `inactive`) con avisos claros y bloqueo preventivo de funciones cuando el período ha expirado.

---

### 🔒 4. Seguridad y Arquitectura Anti-Fraude
* **Aislamiento Multi-Tenant con PostgreSQL RLS (Row Level Security):** Cada dueño solo tiene permisos de lectura y escritura sobre los datos y categorías que pertenecen a su local.
* **Trigger Anti-Tampering:** Función de base de datos a nivel de PostgreSQL que detecta y aborta inmediatamente cualquier intento de modificar los campos de facturación desde el navegador.
* **RLS Hard-Lock para Catálogo:** Bloqueo a nivel de motor de base de datos que prohíbe la creación o edición de productos si la suscripción del bar no está activa y vigente.
* **Webhooks con Idempotencia:** Procesamiento de eventos y notificaciones de Mercado Pago con registro en tabla de deduplicación (`mp_webhook_events`) para prevenir repeticiones.
* **Purga Inmediata de Caché:** Cuando una suscripción expira, el sistema purga la versión pública cacheada de la carta en el acto, mostrando una pantalla limpia de local en pausa.
* **Acceso Passwordless con Magic Link:** Autenticación moderna mediante enlaces seguros enviados al correo electrónico, protegiendo las cuentas contra ataques de fuerza bruta y evitando olvidos de contraseñas.

---

## 🏛️ Stack Tecnológico

* **Frontend:** Next.js 14 (App Router), React 18, TailwindCSS, Lucide Icons, Canvas API para compresión WebP.
* **Backend y Base de Datos:** Supabase (PostgreSQL 15, Row Level Security, Triggers PL/pgSQL, Storage S3-compatible).
* **Autenticación:** Supabase Auth (Magic Links passwordless con tokens criptográficos PKCE).
* **Pagos y Facturación:** Mercado Pago API (Checkout Pro Preferences, IPN Webhooks, Subscriptions/Orders).
* **Códigos QR:** QRCode React (generación vectorial escalable).
* **PWA:** Service Workers, Web App Manifest y metaetiquetas para iOS y Android.
