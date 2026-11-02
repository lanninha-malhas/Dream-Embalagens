import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, Lock, TrendingUp } from 'lucide-react';
import { Product, Category } from '../types.ts';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'> & { id?: string }) => void;
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

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name || '');
      setDescription(initialProduct.description || '');
      setCategory(initialProduct.category || '');
      setSku(initialProduct.sku || '');
      setCode(initialProduct.code || '');
      setCostPriceStr(
        initialProduct.costPrice !== undefined ? initialProduct.costPrice.toString().replace('.', ',') : ''
      );
      setSalePriceStr(
        initialProduct.price !== undefined ? initialProduct.price.toString().replace('.', ',') : ''
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
  }, [initialProduct, isOpen]);

  // Parse helper supporting both comma and dot
  const parseVal = (str: string) => {
    if (!str.trim()) return 0;
    const clean = str.replace(',', '.').trim();
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  };

  // Cálculo automático do Lucro: Preço de Venda - Preço de Custo
  const calculatedProfit = useMemo(() => {
    const sale = parseVal(salePriceStr);
    const cost = parseVal(costPriceStr);
    if (!salePriceStr && !costPriceStr) return 0;
    return sale - cost;
  }, [salePriceStr, costPriceStr]);

  const profitDisplayStr = useMemo(() => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(calculatedProfit);
  }, [calculatedProfit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    onSave({
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#002B49] text-white px-4 py-3 flex items-center justify-between shrink-0">
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
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white focus:ring-1 focus:ring-[#22CBD0] outline-none"
            />
          </div>

          {/* Categoria */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700">
                Categoria Vinculada
              </label>
              <span className="text-[10px] text-stone-400">
                Selecione ou digite nova
              </span>
            </div>
            
            {/* Botões rápidos das categorias cadastradas */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`text-[11px] py-1 px-2.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                      category.trim().toLowerCase() === cat.name.trim().toLowerCase()
                        ? 'bg-[#22CBD0] text-[#002B49] border-[#22CBD0] font-bold shadow-2xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              list="categories-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white focus:ring-1 focus:ring-[#22CBD0] outline-none"
            />
            <datalist id="categories-list">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
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
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white outline-none"
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
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white outline-none"
              />
            </div>
          </div>

          {/* Financeiro: Custo, Venda e Lucro */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Preços e Rentabilidade
              </span>
              <span className="text-[10px] text-stone-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Lucro automático
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
                    className="w-full pl-6 pr-1.5 py-2 text-xs font-semibold text-stone-800 bg-white rounded-xl border border-stone-300 focus:border-[#22CBD0] outline-none"
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
                    className="w-full pl-6 pr-1.5 py-2 text-xs font-bold text-stone-900 bg-white rounded-xl border border-stone-300 focus:border-[#22CBD0] outline-none"
                  />
                </div>
              </div>

              {/* Lucro (R$) */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center justify-between">
                  <span>Lucro (R$)</span>
                  <Lock className="w-3 h-3 text-stone-400" />
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={profitDisplayStr}
                    title="Cálculo automático: Preço de Venda - Preço de Custo"
                    className={`w-full px-2 py-2 text-xs font-bold rounded-xl border select-none cursor-not-allowed tabular-nums ${
                      calculatedProfit >= 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
                        : 'bg-red-50 text-red-800 border-red-300/80'
                    }`}
                  />
                </div>
              </div>
            </div>

            {calculatedProfit > 0 && parseVal(salePriceStr) > 0 && (
              <div className="flex items-center justify-between text-[10px] text-emerald-700 px-1 pt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3 h-3" />
                  Margem de lucro estimada:
                </span>
                <span className="font-bold tabular-nums">
                  {((calculatedProfit / parseVal(salePriceStr)) * 100).toFixed(1)}%
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
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Unidade
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white outline-none"
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
              className="w-full text-xs px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:bg-white focus:ring-1 focus:ring-[#22CBD0] outline-none"
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
              className="flex-1 py-2.5 px-3 text-xs font-black text-[#002B49] bg-[#22CBD0] hover:bg-[#1db9be] active:scale-95 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#002B49]" />
              <span>Salvar Produto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
