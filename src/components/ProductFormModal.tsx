import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, TrendingUp, Loader2, Search, Check } from 'lucide-react';
import { Product, Category } from '../types.ts';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'> & { id?: string }) => Promise<void> | void;
  initialProduct: Product | null;
  categories?: Category[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProduct,
  categories = [],
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [code, setCode] = useState('');
  const [costPriceStr, setCostPriceStr] = useState('');
  const [salePriceStr, setSalePriceStr] = useState('');
  const [incrementStr, setIncrementStr] = useState('1');
  const [stockStr, setStockStr] = useState('');
  const [unit, setUnit] = useState('Unidade');
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name || '');
      setDescription(initialProduct.description || '');
      setCategory(initialProduct.category || '');
      setSku(initialProduct.sku || '');
      setCode(initialProduct.code || '');
      setCostPriceStr(
        initialProduct.costPrice !== undefined ? initialProduct.costPrice.toFixed(2).replace('.', ',') : ''
      );
      setSalePriceStr(
        initialProduct.price !== undefined ? initialProduct.price.toFixed(2).replace('.', ',') : ''
      );
      setIncrementStr(
        initialProduct.increment !== undefined ? initialProduct.increment.toString() : '1'
      );
      setStockStr(
        initialProduct.stock !== undefined ? initialProduct.stock.toString() : ''
      );
      setUnit(initialProduct.unit || 'Unidade');
      setAvailable(initialProduct.available ?? true);
    } else {
      setName('');
      setDescription('');
      setCategory('');
      setSku('');
      setCode('');
      setCostPriceStr('');
      setSalePriceStr('');
      setIncrementStr('1');
      setStockStr('');
      setUnit('Unidade');
      setAvailable(true);
    }
    setError(null);
    setIsCategoryDropdownOpen(false);
  }, [initialProduct, isOpen]);

  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  const matchingCategories = useMemo(() => {
    const query = normalizeText(category);
    if (query.length < 2) return [];
    return categories.filter((c) => normalizeText(c.name).includes(query));
  }, [categories, category]);

  // Parse helper supporting both comma and dot (and optional thousands dot)
  const parseVal = (str: string) => {
    if (!str.trim()) return 0;
    const trimmed = str.trim();
    const clean =
      trimmed.includes(',') && trimmed.includes('.')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed.replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  };

  const formatTwoDecimals = (str: string) => {
    if (!str.trim()) return '';
    const val = parseVal(str);
    return val.toFixed(2).replace('.', ',');
  };

  const hasSalePrice = salePriceStr.trim() !== '' && parseVal(salePriceStr) > 0;

  // Cálculo automático do Lucro: preenchido somente após o preenchimento do preço de Venda
  const calculatedProfit = useMemo(() => {
    if (!hasSalePrice) return 0;
    const sale = parseVal(salePriceStr);
    const cost = parseVal(costPriceStr);
    return sale - cost;
  }, [hasSalePrice, salePriceStr, costPriceStr]);

  const profitDisplayStr = useMemo(() => {
    if (!hasSalePrice) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(calculatedProfit);
  }, [hasSalePrice, calculatedProfit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      setError('O nome do produto é obrigatório.');
      return;
    }

    const parsedSale = parseVal(salePriceStr);
    if (parsedSale <= 0) {
      setError('Informe um valor de Venda (R$) válido maior que zero.');
      return;
    }

    const parsedCost = parseVal(costPriceStr);
    const parsedIncrement = parseInt(incrementStr, 10) || 1;
    const parsedStock = stockStr.trim() !== '' ? parseInt(stockStr, 10) : undefined;

    setIsSubmitting(true);
    try {
      await onSave({
        id: initialProduct?.id,
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || undefined,
        sku: sku.trim() || undefined,
        code: code.trim() || undefined,
        costPrice: parsedCost > 0 ? parsedCost : undefined,
        price: parsedSale,
        profit: calculatedProfit,
        increment: parsedIncrement > 0 ? parsedIncrement : 1,
        stock: parsedStock,
        unit: unit.trim() || 'Unidade',
        available,
        hideDescription: initialProduct?.hideDescription,
        hidePrice: initialProduct?.hidePrice,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#302C9B] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-sm">
            {initialProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 text-stone-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nome do Produto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white focus:ring-1 focus:ring-[#302C9B] outline-none"
            />
          </div>

          {/* Categoria Vinculada (Barra de Pesquisa a partir de 2 caracteres) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">
                Categoria Vinculada
              </label>
              <span className="text-[10px] text-stone-400">
                Digite 2+ caracteres para buscar
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={category}
                onFocus={() => {
                  if (category.trim().length >= 2) {
                    setIsCategoryDropdownOpen(true);
                  }
                }}
                onBlur={() => setIsCategoryDropdownOpen(false)}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  setIsCategoryDropdownOpen(val.trim().length >= 2);
                }}
                autoComplete="off"
                className="w-full text-xs pl-8 pr-8 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white focus:ring-1 focus:ring-[#302C9B] outline-none"
                aria-label="Pesquisar categoria vinculada"
              />
              {category && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setCategory('');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer transition-colors"
                  aria-label="Limpar categoria"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isCategoryDropdownOpen && category.trim().length >= 2 && (
              <div className="absolute left-0 right-0 z-20 mt-1 bg-white rounded-xl border border-stone-200 shadow-lg max-h-40 overflow-y-auto py-1">
                {matchingCategories.length > 0 ? (
                  matchingCategories.map((cat) => {
                    const isExactMatch =
                      cat.name.trim().toLowerCase() === category.trim().toLowerCase();
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCategory(cat.name);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isExactMatch
                            ? 'bg-[#302C9B]/10 text-[#302C9B] font-bold'
                            : 'text-stone-700 hover:bg-stone-50 font-medium'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {isExactMatch && <Check className="w-3.5 h-3.5 text-[#302C9B] shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-[11px] text-stone-400">
                    Nenhuma categoria cadastrada encontrada.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SKU & Código */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Código
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white outline-none"
              />
            </div>
          </div>

          {/* Financeiro: Custo, Venda e Lucro */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Preços e Rentabilidade
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Custo (R$) */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Custo (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-2 text-[11px] font-bold text-stone-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={costPriceStr}
                    onChange={(e) => {
                      setCostPriceStr(e.target.value);
                      if (error) setError(null);
                    }}
                    onBlur={() => setCostPriceStr((prev) => formatTwoDecimals(prev))}
                    className="w-full pl-6 pr-1.5 py-2 text-xs font-semibold text-stone-800 bg-white rounded-xl border border-stone-300 focus:border-[#302C9B] outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Venda (R$) */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Venda (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-2 text-[11px] font-bold text-stone-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={salePriceStr}
                    onChange={(e) => {
                      setSalePriceStr(e.target.value);
                      if (error) setError(null);
                    }}
                    onBlur={() => setSalePriceStr((prev) => formatTwoDecimals(prev))}
                    className="w-full pl-6 pr-1.5 py-2 text-xs font-bold text-stone-900 bg-white rounded-xl border border-stone-300 focus:border-[#302C9B] outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Lucro (R$) */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Lucro (R$)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={profitDisplayStr}
                    title="Cálculo automático: Preço de Venda - Preço de Custo"
                    className={`w-full px-2 py-2 text-xs font-bold rounded-xl border select-none cursor-not-allowed tabular-nums ${
                      !hasSalePrice
                        ? 'bg-stone-100 text-stone-400 border-stone-200'
                        : calculatedProfit >= 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
                        : 'bg-red-50 text-red-800 border-red-300/80'
                    }`}
                  />
                </div>
              </div>
            </div>

            {hasSalePrice && calculatedProfit > 0 && (
              <div className="flex items-center justify-start gap-1.5 text-xs text-emerald-700 px-1 pt-0.5">
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span className="font-medium">Margem de lucro estimada:</span>
                <span className="font-bold tabular-nums">
                  {((calculatedProfit / parseVal(salePriceStr)) * 100).toFixed(2).replace('.', ',')}%
                </span>
              </div>
            )}
          </div>

          {/* Incremento, Estoque e Unidade */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Incremento (1)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={incrementStr}
                onChange={(e) => setIncrementStr(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estoque
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={stockStr}
                onChange={(e) => setStockStr(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white outline-none"
              />
            </div>
          </div>

          {/* Observação (1 linha, preenchimento não obrigatório) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Observação
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:bg-white focus:ring-1 focus:ring-[#302C9B] outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-3 text-xs font-black text-white bg-[#302C9B] hover:bg-[#25227B] active:scale-95 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 text-white" />
              )}
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
