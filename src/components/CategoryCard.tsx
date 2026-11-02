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
      className="p-3.5 sm:p-4 bg-white rounded-2xl border border-stone-200/90 hover:border-[#22CBD0] shadow-2xs hover:shadow-xs transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer active:scale-[0.99]"
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
              <div className="w-full h-full flex items-center justify-center bg-cyan-50/70 text-cyan-700">
                <FolderOpen className="w-5 h-5 text-cyan-700" />
              </div>
            )}
          </div>
        )}

        {/* Informações da Categoria */}
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-tight truncate group-hover:text-cyan-700 transition-colors">
            {category.name}
          </h3>
          <p className="text-xs sm:text-[13px] text-stone-400 truncate mt-0.5 font-normal">
            {category.description || `${productCount} ${productCount === 1 ? 'produto' : 'produtos'}`}
          </p>
          {cartItemsCount > 0 && (
            <p className="text-[11px] font-semibold text-cyan-700 mt-1">
              {cartItemsCount} {cartItemsCount === 1 ? 'item no carrinho' : 'itens no carrinho'}
            </p>
          )}
        </div>
      </div>

      {/* Botão ABRIR Turquesa com texto Navy da imagem */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(category);
        }}
        className="bg-[#22CBD0] hover:bg-[#1db9be] active:bg-[#18a6ab] text-[#002B49] font-extrabold text-xs sm:text-sm py-2 px-3.5 sm:px-4 rounded-xl flex items-center gap-1.5 shadow-xs shrink-0 transition-all active:scale-95 cursor-pointer"
        aria-label={`Abrir categoria ${category.name}`}
      >
        <FolderOpen className="w-4 h-4 shrink-0 text-[#002B49]" />
        <span className="tracking-wide">ABRIR</span>
      </button>
    </article>
  );
};
