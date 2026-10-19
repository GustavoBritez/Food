import { formatPrice } from './utils';

export type OrderLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export function orderTotal(lines: OrderLine[]) {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function orderCount(lines: OrderLine[]) {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

/**
 * Hola Bar de Prueba! Quiero pedir:
 * - 1x Pizza Muzzarella $9.500
 * - 2x Pinta IPA $9.600
 * Total: $19.100
 */
export function buildOrderMessage(storeName: string, lines: OrderLine[]) {
  const items = lines
    .map((l) => `- ${l.qty}x ${l.name} ${formatPrice(l.price * l.qty)}`)
    .join('\n');
  return `Hola ${storeName}! Quiero pedir:\n${items}\nTotal: ${formatPrice(orderTotal(lines))}`;
}

/** Link wa.me con el texto URL-encoded */
export function whatsappUrl(phone: string, text?: string) {
  const number = phone.replace(/\D/g, '');
  return text
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${number}`;
}

/** Link para compartir un texto por WhatsApp sin destinatario fijo */
export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
