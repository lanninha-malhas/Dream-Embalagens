export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Preço de Venda
  costPrice?: number; // Preço de Custo
  profit?: number; // Lucro (Venda - Custo)
  sku?: string;
  code?: string;
  category?: string;
  increment?: number; // Incremento (padrão 1)
  stock?: number; // Estoque
  unit?: string;
  available: boolean;
  hideDescription?: boolean;
  hidePrice?: boolean;
  imageUrl?: string;
  imageZoom?: number;
  orderIndex?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageZoom?: number; // Zoom da imagem da categoria: -50 a +50 (padrão 0)
  orderIndex?: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface StoreSettings {
  storeName: string;
  subtitle: string;
  logoUrl?: string;
  logoZoom?: number; // Zoom da imagem no cabeçalho: -50 a +50 (padrão 0)
  whatsappNumber: string; // E.g. "5511999998888"
  pixKey: string;
  minOrderValue: number;
  deliveryNotice: string;
  hideCatalogDescription?: boolean;
  hideCatalogPrice?: boolean;
  showCategoryImages?: boolean; // Opção geral para exibir ou não as imagens das categorias no catálogo
  adminPassword?: string;
}

export type DeliveryMethod = 'entrega' | 'retirada';
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro';

export interface CheckoutForm {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  paymentMethod: PaymentMethod;
  changeFor: string;
  notes: string;
}
