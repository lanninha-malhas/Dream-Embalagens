import React from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Send,
  Store,
} from 'lucide-react';
import { CartItem, Product, StoreSettings } from '../types.ts';
import {
  buildWhatsAppMessage,
  createWhatsAppUrl,
  formatBRL,
} from '../utils/formatters.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  settings: StoreSettings;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateQuantity,
  onClearCart,
  settings,
}) => {
  if (!isOpen) return null;

  const productMap = new Map(products.map((p) => [p.id, p]));
  const itemsInCart = cart
    .map((item) => ({
      ...item,
      product: productMap.get(item.productId),
    }))
    .filter((item): item is { productId: string; quantity: number; product: Product } =>
      Boolean(item.product)
    );

  const totalItems = itemsInCart.length;

  const whatsappMessage = itemsInCart.length > 0 ? buildWhatsAppMessage(cart, products, {}, settings) : '';
  const whatsappUrl = itemsInCart.length > 0 ? createWhatsAppUrl(settings.whatsappNumber, whatsappMessage) : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-stone-50 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
      >
        {/* Header / Grab Handle com paleta Navy e detalhes Turquesa */}
        <div className="bg-[#002B49] text-white px-4 pt-3 pb-3.5 relative shrink-0">
          <div className="w-10 h-1 bg-[#22CBD0] rounded-full mx-auto mb-2 sm:hidden" />
          <div className="flex items-center justify-between">
            <div>
              <h2 id="cart-title" className="text-base font-bold text-white">
                Carrinho de Compras
              </h2>
              <p className="text-[11px] text-[#22CBD0] font-medium">
                {totalItems} {totalItems === 1 ? 'item' : 'itens'} adicionados
              </p>
            </div>

            <div className="flex items-center gap-2">
              {totalItems > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-stone-300 hover:text-red-300 text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer"
                  title="Esvaziar carrinho"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar carrinho"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
          {itemsInCart.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-cyan-50 mx-auto flex items-center justify-center text-cyan-700 mb-3">
                <Store className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-stone-800 text-sm">
                Seu carrinho está vazio
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                Volte ao catálogo e selecione as quantidades de sacos kraft para seu pedido.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-[#22CBD0] hover:bg-[#1db9be] text-[#002B49] text-xs font-bold rounded-xl cursor-pointer"
              >
                Explorar Produtos
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {itemsInCart.map(({ product, quantity }) => {
                const isItemPriceHidden = Boolean(settings.hideCatalogPrice || product.hidePrice);
                return (
                  <div
                    key={product.id}
                    className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-stone-900 truncate">
                        {product.name}
                      </p>
                      {!isItemPriceHidden && (
                        <>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {formatBRL(product.price)}{' '}
                            {product.unit ? `(${product.unit})` : ''}
                          </p>
                          <p className="text-xs font-bold text-stone-900 mt-0.5 tabular-nums">
                            Subtotal: {formatBRL(product.price * quantity)}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200 shrink-0">
                      <button
                        onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-stone-700 hover:bg-white active:scale-95 cursor-pointer"
                        aria-label={`Diminuir ${product.name}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-stone-900 tabular-nums">
                        {quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-[#22CBD0] hover:bg-[#1db9be] text-[#002B49] active:scale-95 cursor-pointer"
                        aria-label={`Aumentar ${product.name}`}
                      >
                        <Plus className="w-3.5 h-3.5 text-[#002B49]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Footer */}
        {itemsInCart.length > 0 && (
          <div className="p-3.5 bg-white border-t border-stone-200 shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Pedido via WhatsApp</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
