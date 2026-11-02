import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Product } from '../types.ts';
import { formatBRL } from '../utils/formatters.ts';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  hideDescription?: boolean;
  hidePrice?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  onUpdateQuantity,
  hideDescription = false,
  hidePrice = false,
}) => {
  const isSelected = quantity > 0;
  const shouldHideDescription = hideDescription || Boolean(product.hideDescription);
  const shouldHidePrice = hidePrice || Boolean(product.hidePrice);
  const isCompactRow = shouldHideDescription && shouldHidePrice;
  const step = product.increment && product.increment > 0 ? product.increment : 1;

  const quantityControls = (
    <div className="flex items-center shrink-0">
      {quantity === 0 ? (
        <button
          onClick={() => onUpdateQuantity(product.id, step)}
          className="h-8.5 px-3 rounded-lg bg-[#302C9B] hover:bg-[#25227B] active:bg-[#1F1B68] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
          aria-label={`Adicionar ${product.name} ao pedido`}
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Pedir</span>
        </button>
      ) : (
        <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
          <button
            onClick={() => onUpdateQuantity(product.id, Math.max(0, quantity - step))}
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
  );

  // Layout na mesma linha quando descrição e preços estiverem ocultos
  if (isCompactRow) {
    return (
      <article
        className={`p-3 bg-white rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
          isSelected
            ? 'border-[#302C9B] shadow-sm ring-1 ring-[#302C9B]/30 bg-[#302C9B]/5'
            : 'border-stone-200 hover:border-stone-300'
        }`}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-900 text-xs sm:text-sm leading-tight truncate">
            {product.name}
          </h3>
          {product.category && (
            <p className="text-[10px] text-stone-400 font-medium truncate mt-0.5">
              {product.category}
            </p>
          )}
        </div>
        {quantityControls}
      </article>
    );
  }

  return (
    <article
      className={`p-3.5 bg-white rounded-xl border transition-all duration-150 ${
        isSelected
          ? 'border-[#302C9B] shadow-sm ring-1 ring-[#302C9B]/30 bg-[#302C9B]/5'
          : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      {/* Linha 1: Nome do produto e categoria */}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-stone-900 text-sm sm:text-base leading-tight truncate">
          {product.name}
        </h3>
        {product.category && (
          <span className="text-[11px] text-stone-400 shrink-0 font-medium">
            {product.category}
          </span>
        )}
      </div>

      {/* Linha 2: Embalagem / Unidade e descrição */}
      {product.unit && (
        <p className="text-xs text-stone-500 mt-0.5 font-medium leading-tight truncate">
          {product.unit}
        </p>
      )}
      {!shouldHideDescription && product.description && (
        <p className="text-xs text-stone-400 mt-0.5 truncate leading-tight">
          {product.description}
        </p>
      )}

      {/* Linha 3: Valor do produto e seletor de quantidades */}
      <div
        className={`mt-2.5 pt-2 border-t border-stone-100 flex items-center ${
          shouldHidePrice ? 'justify-end' : 'justify-between'
        } gap-3`}
      >
        {!shouldHidePrice && (
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
        )}

        {quantityControls}
      </div>
    </article>
  );
};
