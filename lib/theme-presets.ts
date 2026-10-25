import type { ButtonStyle, MenuLayout, MenuTheme, ThemeConfig } from './types';

export interface ThemePreset {
  id: string;
  name: string;
  subtitle: string;
  layout: MenuLayout;
  theme: MenuTheme;
  bg_color: string;
  accent_color: string;
  button_style: ButtonStyle;
  theme_config: ThemeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'nikkei_paper',
    name: 'Carta de Autor / Oriental',
    subtitle: 'Títulos caligráficos, fondo suave y precios con punto guía.',
    layout: 'editorial',
    theme: 'light',
    bg_color: '#FAF6F0',
    accent_color: '#7A1C1C',
    button_style: 'accent',
    theme_config: {
      presetId: 'nikkei_paper',
      fontPair: 'script',
      bgPattern: 'waves',
      priceFormat: 'inline-dot',
      showNetPrice: false,
      showWatermark: true,
    },
  },
  {
    id: 'hotel_bistro',
    name: 'Restó & Hotel Elegante',
    subtitle: 'Tarjetas limpias de alto contraste con tipografía serif refinada.',
    layout: 'editorial',
    theme: 'light',
    bg_color: '#F8FAFC',
    accent_color: '#8B0000',
    button_style: 'accent',
    theme_config: {
      presetId: 'hotel_bistro',
      fontPair: 'serif',
      bgPattern: 'none',
      priceFormat: 'minimal',
      showNetPrice: false,
      showWatermark: false,
    },
  },
  {
    id: 'urban_reels',
    name: 'Bar Nocturno (Reels)',
    subtitle: 'Pantalla completa vertical estilo Reels para hamburgueserías y bares.',
    layout: 'feed',
    theme: 'dark',
    bg_color: '#0A0A0A',
    accent_color: '#22C55E',
    button_style: 'accent',
    theme_config: {
      presetId: 'urban_reels',
      fontPair: 'modern',
      bgPattern: 'none',
      priceFormat: 'badge',
      showNetPrice: false,
      showWatermark: false,
    },
  },
  {
    id: 'cafe_artisan',
    name: 'Cafetería & Brunch',
    subtitle: 'Formato lista ágil con fotos compactas y navegación rápida.',
    layout: 'list',
    theme: 'light',
    bg_color: '#FFFFFF',
    accent_color: '#D97706',
    button_style: 'accent',
    theme_config: {
      presetId: 'cafe_artisan',
      fontPair: 'modern',
      bgPattern: 'none',
      priceFormat: 'badge',
      showNetPrice: false,
      showWatermark: false,
    },
  },
  {
    id: 'bodegon_tobago',
    name: 'Bodegón & Pizzería Clásica',
    subtitle: 'Estilo Nuevo Tobago: fondo papel crema, encabezados con línea sólida y alta densidad.',
    layout: 'editorial',
    theme: 'light',
    bg_color: '#F4EFE6',
    accent_color: '#B91C1C',
    button_style: 'accent',
    theme_config: {
      presetId: 'bodegon_tobago',
      fontPair: 'modern',
      bgPattern: 'paper',
      priceFormat: 'badge',
      showNetPrice: false,
      showWatermark: true,
    },
  },
  {
    id: 'rotiseria_promos',
    name: 'Rotisería & Promos',
    subtitle: 'Estilo La Tradicional / Como en Perú: chapitas de combos, promos destacadas y WhatsApp directo.',
    layout: 'editorial',
    theme: 'light',
    bg_color: '#FFFDF7',
    accent_color: '#16A34A',
    button_style: 'whatsapp',
    theme_config: {
      presetId: 'rotiseria_promos',
      fontPair: 'modern',
      bgPattern: 'none',
      priceFormat: 'badge',
      showNetPrice: false,
      showWatermark: false,
    },
  },
  {
    id: 'parrilla_ticket',
    name: 'Parrilla / Ticket Clásico',
    subtitle: 'Estilo La Casona del Nonno: monocromático blanco y negro, bordes dobles y platos destacados en cajas.',
    layout: 'editorial',
    theme: 'light',
    bg_color: '#FFFFFF',
    accent_color: '#171717',
    button_style: 'monochrome',
    theme_config: {
      presetId: 'parrilla_ticket',
      fontPair: 'serif',
      bgPattern: 'paper',
      priceFormat: 'inline-dot',
      showNetPrice: false,
      showWatermark: true,
    },
  },
];
