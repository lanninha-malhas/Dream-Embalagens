import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Category } from '../types.ts';

interface CategoryCardProps {
  category: Category;
  productCount: number;
  cartItemsCount?: number;
  onOpen: (category: Category) => void;
  showImage?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  productCount,
  cartItemsCount = 0,
  onOpen,
  showImage = false,
}) => {
  return (
    <article
      onClick={() => onOpen(category)}
      className="p-3.5 sm:p-4 bg-white rounded-2xl border border-stone-200/90 hover:border-[#302C9B] shadow-2xs hover:shadow-xs transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Container de imagem quadrado com cantos arredondados na frente do nome das Categorias (fundo branco) */}
        {showImage && (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border border-stone-200/90 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
            {category.imageUrl ? (
              <img
                src={category.imageUrl}
                alt={category.name}
                style={{
                  transform: `scale(${1 + (category.imageZoom ?? 0) / 100})`,
                  transformOrigin: 'center center',
                }}
                className="w-full h-full object-contain select-none transition-transform duration-100"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#302C9B]/10 text-[#302C9B]">
                <FolderOpen className="w-5 h-5 text-[#302C9B]" />
              </div>
            )}
          </div>
        )}

        {/* Informações da Categoria */}
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-tight truncate group-hover:text-[#302C9B] transition-colors">
            {category.name}
          </h3>
          <p className="text-xs sm:text-[13px] text-stone-400 truncate mt-0.5 font-normal">
            {category.description || `${productCount} ${productCount === 1 ? 'produto' : 'produtos'}`}
          </p>
          {cartItemsCount > 0 && (
            <p className="text-[11px] font-semibold text-[#302C9B] mt-1">
              {cartItemsCount} {cartItemsCount === 1 ? 'item no carrinho' : 'itens no carrinho'}
            </p>
          )}
        </div>
      </div>

      {/* Botão ABRIR */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(category);
        }}
        className="bg-[#302C9B] hover:bg-[#25227B] text-white font-extrabold text-xs sm:text-sm py-2 px-3.5 sm:px-4 rounded-xl flex items-center gap-1.5 shadow-xs shrink-0 transition-all active:scale-95 cursor-pointer"
        aria-label={`Abrir categoria ${category.name}`}
      >
        <FolderOpen className="w-4 h-4 shrink-0 text-white" />
        <span className="tracking-wide">ABRIR</span>
      </button>
    </article>
  );
};
