import { CartItem, CheckoutForm, Product, StoreSettings } from '../types.ts';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  // If starts with 55 and has 12 or 13 digits, trim country code for local mask
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  if (!digits) return '';
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  // Fixo: (XX) XXXX-XXXX (até 10 dígitos)
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular: (XX) XXXXX-XXXX (11 dígitos)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatDisplayPhone(raw: string): string {
  const digits = cleanPhone(raw);
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 7);
    const part2 = digits.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 6);
    const part2 = digits.slice(6);
    return `(${ddd}) ${part1}-${part2}`;
  }
  return raw;
}

export function buildWhatsAppMessage(
  cart: CartItem[],
  products: Product[],
  form: Partial<CheckoutForm> = {},
  settings?: StoreSettings
): string {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const storeName = settings?.storeName ? settings.storeName.toUpperCase() : 'CATÁLOGO';
  
  const hidePrice = Boolean(settings?.hideCatalogPrice);
  let total = 0;
  const itemsText = cart
    .map((item) => {
      const prod = productMap.get(item.productId);
      if (!prod) return '';
      const subtotal = prod.price * item.quantity;
      total += subtotal;
      if (hidePrice || prod.hidePrice) {
        return `• ${item.quantity}x ${prod.name} (${prod.unit || 'un'})`;
      }
      return `• ${item.quantity}x ${prod.name} (${prod.unit || 'un'}) - ${formatBRL(subtotal)}`;
    })
    .filter(Boolean)
    .join('\n');

  const totalLine = hidePrice
    ? '💰 *VALORES:* Sob consulta via WhatsApp'
    : `💰 *VALOR TOTAL:* ${formatBRL(total)}`;

  const customerSection = form.customerName
    ? `👤 *Cliente/Padaria:* ${form.customerName}\n${form.customerPhone ? `📱 *Telefone:* ${form.customerPhone}\n` : ''}`
    : '';

  const detailsList: string[] = [];
  if (form.deliveryMethod) {
    detailsList.push(`🛵 *Forma:* ${form.deliveryMethod === 'entrega' ? '🚚 Entrega' : '🏪 Retirada no Balcão'}`);
  }
  if (form.deliveryMethod === 'entrega' && form.address) {
    detailsList.push(`📍 *Endereço:* ${form.address}`);
  }
  if (form.paymentMethod) {
    const paymentLabels: Record<string, string> = {
      pix: '💠 PIX',
      cartao: '💳 Cartão na Entrega/Retirada',
      dinheiro: form.changeFor
        ? `💵 Dinheiro (Troco para ${form.changeFor})`
        : '💵 Dinheiro (Sem troco)',
    };
    detailsList.push(`💳 *Pagamento:* ${paymentLabels[form.paymentMethod] || form.paymentMethod}`);
  }
  if (form.notes) {
    detailsList.push(`📝 *Observações:* ${form.notes}`);
  }

  const detailsText = detailsList.length > 0 ? `\n━━━━━━━━━━━━━━━━━━━━\n${detailsList.join('\n')}` : '';

  const message = `🍞 *NOVO PEDIDO - ${storeName}*
━━━━━━━━━━━━━━━━━━━━
${customerSection ? `${customerSection}\n` : ''}📦 *ITENS DO PEDIDO:*
${itemsText}

${totalLine}${detailsText}
━━━━━━━━━━━━━━━━━━━━
_Pedido realizado pelo Catálogo Web Sacos KRAFT_`;

  return message.trim();
}

export function createWhatsAppUrl(
  phone: string,
  message: string
): string {
  const digits = cleanPhone(phone);
  // Default to Brazil country code 55 if phone has 10 or 11 digits
  const fullPhone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const encoded = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;
}
