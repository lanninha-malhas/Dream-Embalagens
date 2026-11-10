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
      className={`bg-white rounded-2xl border border-stone-200/90 hover:border-[#302C9B] shadow-2xs hover:shadow-xs transition-all duration-150 flex items-stretch gap-3 group cursor-pointer active:scale-[0.99] ${
        showImage ? 'p-1 pr-3 sm:p-1 sm:pr-3.5' : 'px-3.5 py-2.5 sm:px-4 sm:py-3'
      }`}
    >
      {/* Container de imagem quadrado com cantos arredondados na frente do nome das Categorias (fundo branco) */}
      {showImage && (
        <div className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-xl bg-white border border-stone-200/90 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs self-center">
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

      {/* Conteúdo à direita: Nome no topo (largura total) + Subtítulo e Botão ABRIR embaixo */}
      <div
        className={`flex-1 min-w-0 flex flex-col justify-between ${
          showImage ? 'py-0.5 sm:py-1' : 'gap-1'
        }`}
      >
        <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-tight truncate group-hover:text-[#302C9B] transition-colors">
          {category.name}
        </h3>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-xs sm:text-[13px] text-stone-400 truncate font-normal leading-tight">
              {category.description || `${productCount} ${productCount === 1 ? 'produto' : 'produtos'}`}
            </p>
            {cartItemsCount > 0 && (
              <p className="text-[11px] font-semibold text-[#302C9B] truncate leading-tight mt-0.5">
                {cartItemsCount} {cartItemsCount === 1 ? 'item no carrinho' : 'itens no carrinho'}
              </p>
            )}
          </div>

          {/* Botão ABRIR */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(category);
            }}
            className="bg-[#302C9B] hover:bg-[#25227B] text-white font-extrabold text-xs sm:text-sm py-1.5 px-3 sm:py-2 sm:px-4 rounded-xl flex items-center gap-1.5 shadow-xs shrink-0 transition-all active:scale-95 cursor-pointer"
            aria-label={`Abrir categoria ${category.name}`}
          >
            <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-white" />
            <span className="tracking-wide">ABRIR</span>
          </button>
        </div>
      </div>
    </article>
  );
};
