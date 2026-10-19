export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const priceFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 12500 -> "$12.500" */
export function formatPrice(value: number | string) {
  return `$${priceFormatter.format(Number(value) || 0)}`;
}

/** Normaliza para búsquedas: sin tildes, minúsculas */
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** "Cervecería Patagonia" -> "cerveceria-patagonia" */
export function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const WHATSAPP_REGEX = /^[0-9]{8,15}$/;
export const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
export const DEFAULT_ACCENT = '#22c55e';

/** Slugs que usa la app (también bloqueados en la base de datos) */
export const RESERVED_SLUGS = ['demo', 'admin', 'login', 'api', 'auth', 'p'];
export function isReservedSlug(slug: string) {
  return RESERVED_SLUGS.includes(slug);
}

/** Texto negro o blanco según qué se lea mejor sobre el color de marca */
export function readableTextColor(hex: string) {
  if (!HEX_REGEX.test(hex)) return '#ffffff';
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#111111' : '#ffffff';
}

/**
 * Convierte lo que escribe un dueño argentino al formato de wa.me.
 *  "11 2345-6789"       -> "5491123456789"
 *  "+54 9 11 2345 6789" -> "5491123456789"
 *  "54 11 2345 6789"    -> "5491123456789"
 *  "011 2345 6789"      -> "5491123456789"
 */
export function normalizeWhatsapp(input: string) {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) return `549${digits}`;
  if (digits.length === 12 && digits.startsWith('54') && !digits.startsWith('549')) {
    return `549${digits.slice(2)}`;
  }
  return digits;
}

/** "5491123456789" -> "+54 9 11 2345-6789" (solo para mostrar) */
export function formatWhatsappDisplay(value: string) {
  const d = value.replace(/\D/g, '');
  const m = d.match(/^549(11|\d{3,4})(\d{3,4})(\d{4})$/);
  if (m) return `+54 9 ${m[1]} ${m[2]}-${m[3]}`;
  return d ? `+${d}` : '';
}

/** URL pública del sitio, la que va dentro del QR */
export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

export function menuUrl(slug: string) {
  return `${getSiteUrl()}/p/${slug}`;
}
