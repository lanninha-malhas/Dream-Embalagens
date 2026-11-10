import React, { useEffect } from 'react';
import { Trash2, Minus, Plus, ArrowLeft, ShoppingCart } from 'lucide-react';
import { CartItem, Product, StoreSettings } from '../types.ts';
import {
  buildWhatsAppMessage,
  createWhatsAppUrl,
  formatBRL,
} from '../utils/formatters.ts';

interface CartPageProps {
  cart: CartItem[];
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  onBackToCatalog: () => void;
  settings: StoreSettings;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  products,
  onUpdateQuantity,
  onClearCart,
  onBackToCatalog,
  settings,
}) => {
  const productMap = new Map(products.map((p) => [p.id, p]));

  const itemsInCart = cart
    .map((item) => ({
      ...item,
      product: productMap.get(item.productId),
    }))
    .filter((item): item is { productId: string; quantity: number; product: Product } =>
      Boolean(item.product && item.quantity > 0)
    );

  // Fecha automaticamente e retorna ao catálogo após 1,4 segundos quando o carrinho estiver vazio
  useEffect(() => {
    if (itemsInCart.length === 0) {
      const timer = setTimeout(() => {
        onBackToCatalog();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [itemsInCart.length, onBackToCatalog]);

  const totalOrderPrice = itemsInCart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const whatsappMessage = itemsInCart.length > 0 ? buildWhatsAppMessage(cart, products, {}, settings) : '';
  const whatsappUrl = itemsInCart.length > 0 ? createWhatsAppUrl(settings.whatsappNumber, whatsappMessage) : '#';

  return (
    <div className="w-full max-w-md mx-auto py-2 sm:py-4 px-1 sm:px-2">
      {/* Container Card principal */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-4 sm:p-5 flex flex-col space-y-4">
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between pb-1 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-stone-800 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h1 className="text-base font-bold text-stone-900 tracking-tight">
              Meu Carrinho
            </h1>
          </div>
        </div>

        {/* Lista de itens ou Estado Vazio */}
        {itemsInCart.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3.5">
            <div className="w-16 h-16 rounded-2xl bg-[#302C9B]/10 border border-[#302C9B]/20 mx-auto flex items-center justify-center text-[#302C9B] shadow-xs">
              <ShoppingCart className="w-8 h-8 text-[#302C9B] stroke-[2.2]" />
            </div>
            <h2 className="font-bold text-stone-800 text-sm">
              Seu carrinho está vazio
            </h2>
            <button
              type="button"
              onClick={onBackToCatalog}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#302C9B] hover:bg-[#25227B] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retornar ao Catálogo</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lista dos Produtos Selecionados */}
            <div className="divide-y divide-stone-100">
              {itemsInCart.map(({ product, quantity }) => {
                const qtyPadded = String(quantity).padStart(2, '0');
                const unitPriceFormatted = formatBRL(product.price);
                const subtotalFormatted = formatBRL(product.price * quantity);

                return (
                  <div
                    key={product.id}
                    className="py-3 space-y-1.5"
                  >
                    {/* Linha 1: Pontinho indicador + Nome do Produto em largura total */}
                    <div className="flex items-start gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-[#302C9B] shrink-0 mt-1.5"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-bold text-stone-900 leading-snug flex-1 min-w-0">
                        {product.name}
                      </p>
                    </div>

                    {/* Linha 2: Cálculo à esquerda + Seletor à direita */}
                    <div className="pl-5 flex items-center justify-between gap-2.5">
                      <p className="text-xs text-stone-600 font-medium tabular-nums min-w-0">
                        {qtyPadded} x {unitPriceFormatted} = {subtotalFormatted}
                      </p>

                      {/* Stepper estilizado no padrão com paleta do catálogo */}
                      <div className="flex items-center bg-slate-100/90 border border-slate-200/90 rounded-xl p-1 gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-stone-200/90 text-stone-800 font-bold flex items-center justify-center hover:bg-stone-50 active:scale-95 cursor-pointer shadow-2xs transition-transform"
                          aria-label={`Diminuir quantidade de ${product.name}`}
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        <span className="w-6 text-center text-xs font-black text-stone-900 tabular-nums select-none">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-[#302C9B] hover:bg-[#25227B] text-white font-black flex items-center justify-center active:scale-95 cursor-pointer shadow-2xs transition-transform"
                          aria-label={`Aumentar quantidade de ${product.name}`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botão "LIMPAR CARRINHO" centralizado horizontalmente */}
            <div className="flex justify-center pt-0.5">
              <button
                type="button"
                onClick={onClearCart}
                className="border border-rose-200/90 bg-rose-50/60 hover:bg-rose-100 text-rose-600 rounded-lg px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95 shadow-2xs"
                title="Esvaziar todos os itens do carrinho"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>LIMPAR CARRINHO</span>
              </button>
            </div>

            {/* Bloco inferior arredondado com VALOR TOTAL e Botão WhatsApp */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-700">
                  VALOR TOTAL:
                </span>
                <span className="text-xl font-black text-[#302C9B] tabular-nums tracking-tight">
                  {formatBRL(totalOrderPrice)}
                </span>
              </div>

              {/* Botão Oficial ENVIAR PEDIDO estilo WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black text-sm tracking-wide rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 uppercase transition-all cursor-pointer"
              >
                <svg
                  className="w-5 h-5 fill-current text-white shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>ENVIAR PEDIDO</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
