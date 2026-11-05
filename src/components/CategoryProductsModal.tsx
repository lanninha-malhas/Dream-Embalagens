import { X, Minus, Plus, ShoppingCart, Package } from 'lucide-react';
import { Category, Product, CartItem, StoreSettings } from '../types.ts';
import { formatBRL } from '../utils/formatters.ts';

interface CategoryProductsModalProps {
  isOpen: boolean;
  category: Category | null;
  products: Product[];
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClose: () => void;
  onOpenCart: () => void;
  settings: StoreSettings;
}

export const CategoryProductsModal: React.FC<CategoryProductsModalProps> = ({
  isOpen,
  category,
  products,
  cart,
  onUpdateQuantity,
  onClose,
  onOpenCart,
  settings,
}) => {
  if (!isOpen || !category) return null;

  // Filter products for this category
  const categoryProducts = products.filter(
    (p) =>
      p.available &&
      (p.category?.trim().toLowerCase() === category.name.trim().toLowerCase() ||
        (!p.category && category.name === 'Geral'))
  );

  const totalCartCount = cart.filter((item) => item.quantity > 0).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-stone-50 rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-white px-4 py-3.5 border-b border-stone-200/90 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="font-bold text-stone-900 text-base leading-tight truncate">
              {category.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Products List for Category */}
        <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
          {categoryProducts.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-dashed border-stone-300 text-center space-y-2">
              <Package className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-semibold text-stone-700">
                Nenhum produto cadastrado nesta categoria no momento.
              </p>
            </div>
          ) : (
            categoryProducts.map((product) => {
              const cartItem = cart.find((item) => item.productId === product.id);
              const quantity = cartItem?.quantity || 0;
              const isSelected = quantity > 0;
              const step = product.increment && product.increment > 0 ? product.increment : 1;

              return (
                <div
                  key={product.id}
                  className={`p-3.5 bg-white rounded-xl border transition-all duration-150 ${
                    isSelected
                      ? 'border-[#302C9B] shadow-sm ring-1 ring-[#302C9B]/30 bg-[#302C9B]/5'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {/* Linha 1: Nome do produto */}
                  <h3 className="font-bold text-stone-900 text-sm leading-tight">
                    {product.name}
                  </h3>

                  {/* Linha 2: Informação da embalagem/unidade */}
                  {product.unit && (
                    <p className="text-xs text-stone-500 mt-1 leading-tight font-medium">
                      {product.unit}
                    </p>
                  )}

                  {/* Descrição adicional */}
                  {!settings.hideCatalogDescription && product.description && (
                    <p className="text-xs text-stone-400 mt-1 leading-snug">
                      {product.description}
                    </p>
                  )}

                  {/* Linha 3: Preço e Seletor de Quantidade */}
                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
                    {/* Preço do produto */}
                    <div>
                      <span className="text-base font-bold text-stone-900 tabular-nums block">
                        {formatBRL(product.price)}
                      </span>
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-[#302C9B] block mt-0.5 tabular-nums">
                          Subtotal: {formatBRL(product.price * quantity)}
                        </span>
                      )}
                    </div>

                    {/* Seletor de Quantidade */}
                    <div className="flex items-center shrink-0">
                      {quantity === 0 ? (
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, step)}
                          className="h-8.5 px-3 rounded-lg bg-[#302C9B] hover:bg-[#25227B] active:bg-[#1F1B68] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                          aria-label={`Adicionar ${product.name} ao pedido`}
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                          <span>Adicionar</span>
                        </button>
                      ) : (
                        <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(product.id, Math.max(0, quantity - step))
                            }
                            className="w-7.5 h-7.5 rounded-md flex items-center justify-center text-stone-700 hover:text-stone-900 hover:bg-white active:scale-95 transition-all cursor-pointer"
                            title="Diminuir quantidade"
                            aria-label={`Diminuir quantidade de ${product.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <span className="w-7 text-center text-xs font-bold text-stone-900 tabular-nums select-none">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(product.id, quantity + step)}
                            className="w-7.5 h-7.5 rounded-md flex items-center justify-center bg-[#302C9B] hover:bg-[#25227B] active:bg-[#1F1B68] text-white active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Aumentar quantidade"
                            aria-label={`Aumentar quantidade de ${product.name}`}
                          >
                            <Plus className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 bg-white border-t border-stone-200/90 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
          >
            Voltar às Categorias
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCart();
            }}
            className={`py-2.5 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              totalCartCount > 0
                ? 'bg-[#302C9B] hover:bg-[#25227B] text-white'
                : 'bg-stone-100 text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span>Ver Carrinho</span>
            {totalCartCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#302C9B] text-[11px] font-black flex items-center justify-center">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
