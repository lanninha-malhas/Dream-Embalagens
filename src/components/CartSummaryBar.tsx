import React from 'react';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { formatBRL } from '../utils/formatters.ts';

interface CartSummaryBarProps {
  totalItems: number;
  totalPrice: number;
  onOpenCart: () => void;
  hidePrice?: boolean;
}

export const CartSummaryBar: React.FC<CartSummaryBarProps> = ({
  totalItems,
  totalPrice,
  onOpenCart,
  hidePrice = false,
}) => {
  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-stone-900/90 via-stone-900/60 to-transparent pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <button
          onClick={onOpenCart}
          className="w-full bg-[#22CBD0] hover:bg-[#1db9be] active:scale-[0.98] text-[#002B49] p-3.5 rounded-2xl shadow-xl flex items-center justify-between transition-all border border-[#22CBD0]/40 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#002B49] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-[#22CBD0]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-[#002B49]/80 leading-none">
                {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
              {hidePrice ? (
                <p className="text-sm font-black text-[#002B49] leading-tight mt-0.5">
                  Ver Pedido / Cotação
                </p>
              ) : (
                <p className="text-base font-black text-[#002B49] leading-tight tabular-nums mt-0.5">
                  {formatBRL(totalPrice)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#002B49] text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs">
            <span>Ver Pedido</span>
            <ArrowRight className="w-4 h-4 text-[#22CBD0]" />
          </div>
        </button>
      </div>
    </div>
  );
};
