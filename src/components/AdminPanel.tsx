import React, { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Settings,
  Phone,
  Save,
  CheckCircle2,
  AlertTriangle,
  GripVertical,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  FolderPlus,
  X,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { Product, StoreSettings, Category } from '../types.ts';
import { formatBRL, maskPhone } from '../utils/formatters.ts';
import { ProductFormModal } from './ProductFormModal.tsx';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  isCloudConnected?: boolean;
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void> | void;
  onEditProduct: (id: string, product: Partial<Product>) => Promise<void> | void;
  onDeleteProduct: (id: string) => Promise<void> | void;
  onReorderProducts: (products: Product[]) => Promise<void> | void;
  onResetProducts?: () => Promise<void> | void;
  onAddCategory: (category: Omit<Category, 'id'>) => Promise<void> | void;
  onEditCategory: (id: string, category: Partial<Category>) => Promise<void> | void;
  onDeleteCategory: (id: string) => Promise<void> | void;
  onSaveSettings: (settings: StoreSettings) => Promise<{ missingColumns?: string[] } | void> | void;
  onWipeAllData?: () => Promise<void> | void;
  onBackToCatalog?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  categories,
  settings,
  isCloudConnected = false,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onReorderProducts,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onSaveSettings,
  onWipeAllData,
}) => {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saveSettingsError, setSaveSettingsError] = useState<string | null>(null);


  // Delete confirmation states
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [showWipeConfirmModal, setShowWipeConfirmModal] = useState(false);
  const [isWipingData, setIsWipingData] = useState(false);
  const [wipeSuccessNotice, setWipeSuccessNotice] = useState(false);

  const handleConfirmWipe = async () => {
    if (!onWipeAllData) return;
    setIsWipingData(true);
    try {
      await onWipeAllData();
      setShowWipeConfirmModal(false);
      setWipeSuccessNotice(true);
      setTimeout(() => setWipeSuccessNotice(false), 4000);
    } catch (err) {
      console.error('Erro ao zerar dados:', err);
    } finally {
      setIsWipingData(false);
    }
  };

  // Category creation & editing state
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState<string>('');
  const [newCatZoom, setNewCatZoom] = useState<number>(0);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatImage, setEditCatImage] = useState<string>('');
  const [editCatZoom, setEditCatZoom] = useState<number>(0);
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);

  // Admin filter by category
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Drag and drop ordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, label')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const updated = [...products];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      await onReorderProducts(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveProduct = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= products.length) return;
    const updated = [...products];
    const [movedItem] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    await onReorderProducts(updated);
  };

  // Settings form state
  const [localSettings, setLocalSettings] = useState<StoreSettings>({
    ...settings,
    logoZoom: settings.logoZoom ?? 0,
    logoPosition: settings.logoPosition || 'center',
    whatsappNumber: maskPhone(settings.whatsappNumber || ''),
    hideCatalogDescription: settings.hideCatalogDescription ?? true,
    hideCatalogPrice: settings.hideCatalogPrice ?? true,
    showCategoryImages: settings.showCategoryImages ?? false,
  });
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);
  const [isLogoDragOver, setIsLogoDragOver] = useState(false);

  useEffect(() => {
    setLocalSettings({
      ...settings,
      logoZoom: settings.logoZoom ?? 0,
      logoPosition: settings.logoPosition || 'center',
      whatsappNumber: maskPhone(settings.whatsappNumber || ''),
      hideCatalogDescription: settings.hideCatalogDescription ?? true,
      hideCatalogPrice: settings.hideCatalogPrice ?? true,
      showCategoryImages: settings.showCategoryImages ?? false,
    });
  }, [settings]);

  const handleLogoPositionChange = async (position: 'left' | 'center' | 'right') => {
    const updatedSettings: StoreSettings = {
      ...localSettings,
      logoPosition: position,
    };
    setLocalSettings(updatedSettings);
    try {
      await onSaveSettings(updatedSettings);
    } catch (err) {
      console.warn('Erro ao atualizar posição da imagem do cabeçalho:', err);
    }
  };

  // Redimensionamento e otimização para imagem quadrada da categoria (~300x300)
  const processCategoryImage = (file: File, callback: (dataUrl: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          callback(compressed);
        } else {
          callback(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Redimensionamento de imagem para otimização e upload direto
  const handleLogoUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const maxWidth = 700;
        const maxHeight = 220;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png');
          setLocalSettings((prev) => ({
            ...prev,
            logoUrl: compressedDataUrl,
          }));
        } else {
          setLocalSettings((prev) => ({
            ...prev,
            logoUrl: result,
          }));
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (data: Omit<Product, 'id'> & { id?: string }) => {
    if (data.id) {
      await onEditProduct(data.id, data);
    } else {
      await onAddProduct(data);
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        await onDeleteProduct(productToDelete.id);
        setProductToDelete(null);
        setCategoryNotice('Produto excluído com sucesso.');
        setTimeout(() => setCategoryNotice(null), 3000);
      } catch (err: any) {
        console.error('Erro ao excluir produto:', err);
        setSaveSettingsError(`Erro ao excluir produto: ${err?.message || 'Falha de comunicação'}`);
        setTimeout(() => setSaveSettingsError(null), 5000);
      }
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (categoryToDelete) {
      try {
        await onDeleteCategory(categoryToDelete.id);
        setCategoryToDelete(null);
        setCategoryNotice('Categoria excluída com sucesso.');
        setTimeout(() => setCategoryNotice(null), 3000);
      } catch (err: any) {
        console.error('Erro ao excluir categoria:', err);
        setSaveSettingsError(`Erro ao excluir categoria: ${err?.message || 'Falha de comunicação'}`);
        setTimeout(() => setSaveSettingsError(null), 5000);
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed || isCreatingCategory) return;

    // Verificar se já existe categoria com o mesmo nome para evitar duplicata
    if (categories.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      setCategoryNotice('Essa categoria já está cadastrada no catálogo.');
      setTimeout(() => setCategoryNotice(null), 3000);
      return;
    }

    setIsCreatingCategory(true);
    try {
      await onAddCategory({
        name: trimmed,
        imageUrl: newCatImage.trim() || undefined,
        imageZoom: newCatZoom,
      });
      setNewCatName('');
      setNewCatImage('');
      setNewCatZoom(0);
      setCategoryNotice('Categoria salva com sucesso!');
      setTimeout(() => setCategoryNotice(null), 3000);
    } catch (err: any) {
      console.error('Erro ao adicionar categoria:', err);
      setCategoryNotice('Erro ao salvar categoria.');
      setTimeout(() => setCategoryNotice(null), 3000);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatImage(cat.imageUrl || '');
    setEditCatZoom(cat.imageZoom ?? 0);
  };

  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    await onEditCategory(editingCategory.id, {
      name: editCatName.trim(),
      imageUrl: editCatImage.trim() || undefined,
      imageZoom: editCatZoom,
    });
    setEditingCategory(null);
    setEditCatImage('');
    setEditCatZoom(0);
    setCategoryNotice('Categoria atualizada com sucesso!');
    setTimeout(() => setCategoryNotice(null), 3000);
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSettingsError(null);
    try {
      await onSaveSettings(localSettings);
      setSavedSettingsNotice(true);
      setTimeout(() => setSavedSettingsNotice(false), 3000);
    } catch (err: any) {
      console.warn('Erro ao salvar configurações no Firestore:', err);
      setSaveSettingsError(err?.message || 'Erro ao sincronizar com o banco de dados.');
      setTimeout(() => setSaveSettingsError(null), 6000);
    }
  };

  // Filter products according to selected category filter
  const displayedProducts =
    selectedCategoryFilter === 'all'
      ? products
      : products.filter(
          (p) =>
            (p.category || 'Geral').trim().toLowerCase() ===
            selectedCategoryFilter.trim().toLowerCase()
        );

  return (
    <div className="space-y-4 pb-16">
      {/* SEÇÃO 1: GERENCIAR CATEGORIAS */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#302C9B]/10 text-[#302C9B] flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-[#302C9B]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Categorias ({categories.length})
              </h3>
              <p className="text-[11px] text-stone-500">
                Crie e edite as categorias exibidas no catálogo
              </p>
            </div>
          </div>
        </div>

        {/* Formulário de Nova Categoria */}
        <form onSubmit={handleCreateCategory} className="bg-stone-50 p-3 rounded-xl border border-stone-200/80 space-y-2.5">
          <span className="text-[11px] font-bold text-stone-700 block">
            Adicionar Nova Categoria
          </span>
          <div className="flex items-center gap-2">
            {/* Input de Imagem da Categoria */}
            <div className="relative shrink-0">
              <input
                id="new-category-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    processCategoryImage(file, (img) => {
                      setNewCatImage(img);
                      setNewCatZoom(0);
                    });
                  }
                }}
              />
              {newCatImage ? (
                <div className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-stone-300 bg-white shadow-2xs shrink-0">
                  <img
                    src={newCatImage}
                    alt="Prévia"
                    style={{
                      transform: `scale(${1 + newCatZoom / 100})`,
                      transformOrigin: 'center center',
                    }}
                    className="w-full h-full object-contain select-none transition-transform duration-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatImage('');
                      setNewCatZoom(0);
                    }}
                    className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Remover imagem"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="new-category-image-input"
                  className="w-14 h-14 rounded-2xl border border-dashed border-stone-300 hover:border-[#302C9B] bg-white hover:bg-stone-50 flex items-center justify-center text-stone-400 hover:text-[#302C9B] transition-colors cursor-pointer shadow-2xs shrink-0"
                  title="Adicionar imagem quadrada da categoria"
                >
                  <ImageIcon className="w-5 h-5" />
                </label>
              )}
            </div>

            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-stone-300 focus:border-[#302C9B] focus:ring-1 focus:ring-[#302C9B] outline-none"
              required
            />
            <button
              type="submit"
              disabled={isCreatingCategory}
              className="py-2 px-3.5 bg-[#302C9B] hover:bg-[#25227B] active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-60"
            >
              {isCreatingCategory ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5 text-white" />
              )}
              <span>Salvar</span>
            </button>
          </div>

          {/* BARRA DE ZOOM (inicia em 0 no centro, -50% a +50%) quando há imagem */}
          {newCatImage && (
            <div className="space-y-1.5 pt-2 border-t border-stone-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-[#302C9B]" />
                  <span>Ajuste de Zoom da Imagem</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-[#302C9B]/10 text-[#302C9B] border border-[#302C9B]/20">
                    {newCatZoom > 0 ? `+${newCatZoom}%` : `${newCatZoom}%`}
                    {newCatZoom === 0 && ' (Centro)'}
                  </span>
                </div>
              </div>

              {/* Slider Input de -50 a +50 com ponto central em 0 */}
              <div className="px-1 py-1">
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={newCatZoom}
                  onChange={(e) => setNewCatZoom(Number(e.target.value))}
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#302C9B]"
                />
                <div className="flex justify-between items-center text-[10px] text-stone-500 font-semibold px-0.5 mt-1">
                  <span className="flex items-center gap-0.5">
                    <ZoomOut className="w-2.5 h-2.5 text-stone-400" />
                    <span>-50%</span>
                  </span>
                  <span className="text-[#302C9B] font-bold">0 (Centro)</span>
                  <span className="flex items-center gap-0.5">
                    <span>+50%</span>
                    <ZoomIn className="w-2.5 h-2.5 text-stone-400" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {newCatImage && (
            <p className="text-[10px] text-[#302C9B] font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#302C9B]" />
              Imagem quadrada anexada com container de fundo branco.
            </p>
          )}
        </form>

        {categoryNotice && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{categoryNotice}</span>
          </div>
        )}

        {/* Lista de Categorias Cadastradas */}
        <div className="space-y-2 pt-1">
          {categories.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-3">
              Nenhuma categoria cadastrada. Crie uma acima para começar.
            </p>
          ) : (
            categories.map((cat) => {
              const linkedProductsCount = products.filter(
                (p) =>
                  (p.category || 'Geral').trim().toLowerCase() ===
                  cat.name.trim().toLowerCase()
              ).length;

              return (
                <div
                  key={cat.id}
                  className="p-2.5 bg-stone-50/70 hover:bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-2.5 transition-all"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    {/* Container de imagem quadrado com cantos arredondados na frente do nome (fundo branco) */}
                    <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          style={{
                            transform: `scale(${1 + (cat.imageZoom ?? 0) / 100})`,
                            transformOrigin: 'center center',
                          }}
                          className="w-full h-full object-contain select-none transition-transform duration-100"
                        />
                      ) : (
                        <FolderOpen className="w-4 h-4 text-stone-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] bg-stone-200/80 text-stone-700 px-1.5 py-0.5 rounded-md font-medium shrink-0">
                          {linkedProductsCount}{' '}
                          {linkedProductsCount === 1 ? 'produto' : 'produtos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditCategory(cat)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-white rounded-lg border border-stone-200/60 transition-colors cursor-pointer"
                      title="Editar categoria"
                      aria-label={`Editar categoria ${cat.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(cat)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-stone-200/60 transition-colors cursor-pointer"
                      title="Excluir categoria"
                      aria-label={`Excluir categoria ${cat.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SEÇÃO 2: PRODUTOS DO CATÁLOGO COM VÍNCULO ÀS CATEGORIAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Produtos do Catálogo ({products.length})
            </h3>
            <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
              <ArrowUpDown className="w-3 h-3 text-[#302C9B] shrink-0" />
              <span>Arraste ou use as setas para ordenar</span>
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="py-2 px-3 bg-[#302C9B] hover:bg-[#25227B] active:scale-95 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Cadastrar Produto</span>
          </button>
        </div>

        {/* Filtros rápidos por categoria */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`py-1 px-2.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-[#302C9B] text-white border-[#302C9B]'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter(
                (p) =>
                  (p.category || 'Geral').trim().toLowerCase() ===
                  cat.name.trim().toLowerCase()
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.name)}
                  className={`py-1 px-2.5 rounded-lg border text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryFilter === cat.name
                      ? 'bg-[#302C9B] text-white border-[#302C9B]'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Lista de Produtos com Drag and Drop */}
        <div className="space-y-2.5">
          {displayedProducts.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-stone-300 p-4">
              <p className="text-xs text-stone-500">
                Nenhum produto cadastrado nesta categoria.
              </p>
            </div>
          ) : (
            displayedProducts.map((product, index) => {
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index && draggedIndex !== index;

              return (
                <div
                  key={product.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={(e) => handleDragLeave(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-3 bg-white rounded-xl border transition-all duration-150 select-none ${
                    isDragging
                      ? 'opacity-40 scale-[0.98] border-dashed border-[#302C9B] bg-[#302C9B]/5 shadow-inner'
                      : isOver
                      ? 'border-[#302C9B] ring-2 ring-[#302C9B]/20 shadow-md bg-[#302C9B]/5 scale-[1.01]'
                      : product.available
                      ? 'border-stone-200 hover:border-stone-300 shadow-2xs'
                      : 'border-stone-200 bg-stone-50/70 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Drag Handle, Order #, Up/Down micro-actions */}
                    <div className="flex flex-col items-center justify-between shrink-0 self-stretch py-0.5 select-none pr-1.5 border-r border-stone-100">
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 -m-1 text-stone-400 hover:text-[#302C9B] transition-colors"
                        title="Clique e arraste para ordenar"
                        aria-label="Arrastar produto"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="text-[10px] font-mono font-bold text-stone-400">
                        #{index + 1}
                      </span>

                      <div className="flex flex-col -space-y-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveProduct(index, 'up');
                          }}
                          className="w-5 h-4 flex items-center justify-center text-stone-400 hover:text-stone-800 disabled:opacity-15 disabled:hover:text-stone-400 transition-colors cursor-pointer"
                          title="Mover para cima"
                          aria-label="Mover para cima"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === products.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveProduct(index, 'down');
                          }}
                          className="w-5 h-4 flex items-center justify-center text-stone-400 hover:text-stone-800 disabled:opacity-15 disabled:hover:text-stone-400 transition-colors cursor-pointer"
                          title="Mover para baixo"
                          aria-label="Mover para baixo"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Product Details & Actions */}
                    <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-semibold text-stone-900 text-xs sm:text-sm truncate">
                            {product.name}
                          </h4>
                          {product.category && (
                            <span className="text-[10px] bg-[#302C9B]/10 text-[#302C9B] font-bold px-1.5 py-0.2 rounded shrink-0">
                              {product.category}
                            </span>
                          )}
                          {!product.available && (
                            <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.2 rounded font-medium shrink-0">
                              Pausado
                            </span>
                          )}
                        </div>

                        {/* Botões de Edição e Exclusão */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="w-7.5 h-7.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                            title="Editar produto"
                            aria-label={`Editar ${product.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setProductToDelete(product)}
                            className="w-7.5 h-7.5 rounded-lg bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-600 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                            title="Excluir produto"
                            aria-label={`Excluir ${product.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Informações Comerciais */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                        <span className="font-bold text-stone-900 tabular-nums">
                          Venda: {formatBRL(product.price)}
                        </span>
                        {product.costPrice !== undefined && product.costPrice > 0 && (
                          <span className="text-stone-500 tabular-nums">
                            Custo: {formatBRL(product.costPrice)}
                          </span>
                        )}
                        {product.profit !== undefined && (
                          <span
                            className={`font-semibold tabular-nums ${
                              product.profit >= 0 ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            Lucro: {formatBRL(product.profit)}
                          </span>
                        )}
                        {product.unit && (
                          <span className="text-stone-400">· {product.unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SEÇÃO 3: CONFIGURAÇÕES */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <Settings className="w-4 h-4 text-[#302C9B]" />
          <h3 className="text-sm font-bold text-stone-900">
            Configurações
          </h3>
        </div>

        <form onSubmit={handleSaveSettingsSubmit} className="space-y-4">
          {/* PRÉVIA AO VIVO DO CABEÇALHO COM UPLOAD INTEGRADO E REPOSICIONAMENTO */}
          <div className="bg-stone-50/80 rounded-2xl border border-stone-200/90 p-3 space-y-2.5">
            <input
              id="header-logo-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = '';
              }}
            />

            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5 min-w-0">
                <ImageIcon className="w-4 h-4 text-[#302C9B] shrink-0" />
                <span className="truncate">Prévia ao Vivo no Cabeçalho</span>
              </label>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const fileInput = document.getElementById('header-logo-upload-input') as HTMLInputElement;
                    fileInput?.click();
                  }}
                  className="text-[11px] font-semibold text-[#302C9B] hover:bg-[#302C9B]/10 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  title={localSettings.logoUrl ? 'Alterar imagem do cabeçalho' : 'Subir imagem do cabeçalho'}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{localSettings.logoUrl ? 'Alterar' : 'Subir'}</span>
                </button>

                {localSettings.logoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setLocalSettings((prev) => ({
                        ...prev,
                        logoUrl: '',
                        logoZoom: 0,
                      }))
                    }
                    className="text-[11px] font-medium text-stone-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    title="Remover imagem do cabeçalho"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
            </div>

            {/* Container único: Prévia ao Vivo + Upload por Clique / Arrastar e Soltar */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsLogoDragOver(true);
              }}
              onDragLeave={() => setIsLogoDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsLogoDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  handleLogoUpload(file);
                }
              }}
              onClick={() => {
                const fileInput = document.getElementById('header-logo-upload-input') as HTMLInputElement;
                fileInput?.click();
              }}
              title="Clique ou arraste a imagem aqui para enviar ao cabeçalho"
              className={`w-full h-24 rounded-xl border-2 border-dashed flex items-center overflow-hidden px-4 cursor-pointer select-none transition-all ${
                isLogoDragOver
                  ? 'border-[#302C9B] bg-[#302C9B]/5 scale-[0.99]'
                  : 'border-stone-300/90 hover:border-[#302C9B] bg-white'
              } ${
                localSettings.logoUrl
                  ? localSettings.logoPosition === 'left'
                    ? 'justify-start'
                    : localSettings.logoPosition === 'right'
                    ? 'justify-end'
                    : 'justify-center'
                  : 'justify-center'
              }`}
            >
              {localSettings.logoUrl ? (
                <img
                  src={localSettings.logoUrl}
                  alt=""
                  style={{
                    transform: `scale(${1 + (localSettings.logoZoom ?? 0) / 100})`,
                    transformOrigin:
                      localSettings.logoPosition === 'left'
                        ? 'left center'
                        : localSettings.logoPosition === 'right'
                        ? 'right center'
                        : 'center center',
                  }}
                  className="h-16 w-auto max-w-[260px] object-contain select-none transition-transform duration-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div className="w-8 h-8 rounded-lg bg-[#302C9B]/10 text-[#302C9B] flex items-center justify-center">
                    <Upload className="w-4 h-4 text-[#302C9B]" />
                  </div>
                  <span className="text-[11px] font-semibold text-stone-600">
                    Clique ou arraste a imagem do cabeçalho aqui
                  </span>
                </div>
              )}
            </div>

            {/* Opção de Reposicionamento da Imagem no Cabeçalho */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[11px] font-semibold text-stone-700 block">
                Posição da Imagem no Cabeçalho
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { value: 'left', label: 'À esquerda', Icon: AlignLeft },
                    { value: 'center', label: 'Centralizada', Icon: AlignCenter },
                    { value: 'right', label: 'À direita', Icon: AlignRight },
                  ] as const
                ).map(({ value, label, Icon }) => {
                  const isActive = (localSettings.logoPosition || 'center') === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleLogoPositionChange(value)}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#302C9B] text-white border-[#302C9B] shadow-2xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-[#302C9B]/50 hover:text-stone-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BARRA DE ZOOM (inicia em 0 no centro, -50% a +50%) */}
            {localSettings.logoUrl && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-[#302C9B]" />
                    <span>Ajuste de Zoom do Cabeçalho</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-[#302C9B]/10 text-[#302C9B] border border-[#302C9B]/20">
                      {(localSettings.logoZoom ?? 0) > 0 ? `+${localSettings.logoZoom}%` : `${localSettings.logoZoom ?? 0}%`}
                      {(localSettings.logoZoom ?? 0) === 0 && ' (Centro)'}
                    </span>
                  </div>
                </div>

                {/* Slider Input de -50 a +50 com ponto central em 0 */}
                <div className="px-1 py-1">
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={localSettings.logoZoom ?? 0}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        logoZoom: Number(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#302C9B]"
                  />
                  <div className="flex justify-between items-center text-[10px] text-stone-500 font-semibold px-0.5 mt-1">
                    <span className="flex items-center gap-0.5">
                      <ZoomOut className="w-2.5 h-2.5 text-stone-400" />
                      <span>-50%</span>
                    </span>
                    <span className="text-[#302C9B] font-bold">0 (Centro)</span>
                    <span className="flex items-center gap-0.5">
                      <span>+50%</span>
                      <ZoomIn className="w-2.5 h-2.5 text-stone-400" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nome da Loja / Distribuidora
            </label>
            <input
              type="text"
              value={localSettings.storeName || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, storeName: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:ring-1 focus:ring-[#302C9B] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#302C9B]" />
              <span>WhatsApp ( Pedidos )</span>
            </label>
            <input
              type="text"
              inputMode="tel"
              value={localSettings.whatsappNumber || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, whatsappNumber: maskPhone(e.target.value) })
              }
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:ring-1 focus:ring-[#302C9B] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Senha de Acesso ao Painel
            </label>
            <input
              type="password"
              value={localSettings.adminPassword || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, adminPassword: e.target.value })
              }
              className="w-full px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] focus:ring-1 focus:ring-[#302C9B] outline-none"
            />
          </div>

          {/* Opção Geral: Imagens das Categorias no Catálogo */}
          <div className="bg-stone-50/80 rounded-xl border border-stone-200/90 p-3.5 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(localSettings.showCategoryImages)}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    showCategoryImages: e.target.checked,
                  })
                }
                className="mt-0.5 w-4 h-4 rounded text-[#302C9B] focus:ring-[#302C9B] border-stone-300 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-stone-800 block">
                  Exibir imagens das categorias no catálogo
                </span>
                <span className="text-[11px] text-stone-500 block mt-0.5 leading-snug">
                  Quando ativo, exibe o container quadrado com imagem na frente do nome de todas as categorias. Quando desativado, o container não é exibido em nenhuma categoria no catálogo.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto py-2.5 px-5 text-xs font-black text-white bg-[#302C9B] hover:bg-[#25227B] active:scale-95 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              <span>Salvar Configurações</span>
            </button>
          </div>

          {savedSettingsNotice && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}


          {saveSettingsError && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{saveSettingsError}</span>
            </div>
          )}
        </form>
      </div>

      {/* SEÇÃO 4: ZERAR CATÁLOGO (LIMPAR DADOS) */}
      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-red-950">
            Zerar Catálogo Completo
          </h3>
        </div>
        <p className="text-xs text-red-800 leading-relaxed">
          Exclui todos os dados na memória local e no BD ( Firebase ).
        </p>
        <button
          type="button"
          onClick={() => setShowWipeConfirmModal(true)}
          className="w-full sm:w-auto py-2.5 px-4 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Zerar Catálogo Agora</span>
        </button>

        {wipeSuccessNotice && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Catálogo e banco de dados zerados com sucesso!</span>
          </div>
        )}
      </div>

      {/* Product Form Modal (Add / Edit) com categories */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        initialProduct={editingProduct}
        categories={categories}
      />

      {/* Modal de Edição de Categoria */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="font-bold text-sm text-stone-900">
                Editar Categoria
              </h4>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditCategory} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-300 focus:border-[#302C9B] outline-none"
                  required
                />
              </div>

              {/* Upload de Imagem da Categoria */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Imagem da Categoria (Quadrada)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white border border-stone-300 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                    {editCatImage ? (
                      <img
                        src={editCatImage}
                        alt="Prévia da categoria"
                        style={{
                          transform: `scale(${1 + editCatZoom / 100})`,
                          transformOrigin: 'center center',
                        }}
                        className="w-full h-full object-contain select-none transition-transform duration-100"
                      />
                    ) : (
                      <FolderOpen className="w-6 h-6 text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input
                      id="edit-category-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processCategoryImage(file, (img) => {
                            setEditCatImage(img);
                          });
                        }
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor="edit-category-image-input"
                        className="px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{editCatImage ? 'Alterar Imagem' : 'Enviar Imagem'}</span>
                      </label>
                      {editCatImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditCatImage('');
                            setEditCatZoom(0);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400">
                      Container de imagem quadrado com fundo branco.
                    </span>
                  </div>
                </div>

                {/* BARRA DE ZOOM (inicia em 0 no centro, -50% a +50%) quando há imagem */}
                {editCatImage && (
                  <div className="space-y-1.5 pt-2.5 mt-2.5 border-t border-stone-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-[#302C9B]" />
                        <span>Ajuste de Zoom da Imagem</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-[#302C9B]/10 text-[#302C9B] border border-[#302C9B]/20">
                          {editCatZoom > 0 ? `+${editCatZoom}%` : `${editCatZoom}%`}
                          {editCatZoom === 0 && ' (Centro)'}
                        </span>
                      </div>
                    </div>

                    {/* Slider Input de -50 a +50 com ponto central em 0 */}
                    <div className="px-1 py-1">
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={editCatZoom}
                        onChange={(e) => setEditCatZoom(Number(e.target.value))}
                        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#302C9B]"
                      />
                      <div className="flex justify-between items-center text-[10px] text-stone-500 font-semibold px-0.5 mt-1">
                        <span className="flex items-center gap-0.5">
                          <ZoomOut className="w-2.5 h-2.5 text-stone-400" />
                          <span>-50%</span>
                        </span>
                        <span className="text-[#302C9B] font-bold">0 (Centro)</span>
                        <span className="flex items-center gap-0.5">
                          <span>+50%</span>
                          <ZoomIn className="w-2.5 h-2.5 text-stone-400" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#302C9B] hover:bg-[#25227B] rounded-xl cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl p-4 shadow-xl border border-stone-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-center font-bold text-sm text-stone-900">
              Excluir Categoria?
            </h4>
            <p className="text-center text-xs text-stone-500 mt-1">
              Tem certeza que deseja remover a categoria <strong>&ldquo;{categoryToDelete.name}&rdquo;</strong> do catálogo?
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl p-4 shadow-xl border border-stone-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-center font-bold text-sm text-stone-900">
              Excluir Produto?
            </h4>
            <p className="text-center text-xs text-stone-500 mt-1">
              Tem certeza que deseja remover <strong>&ldquo;{productToDelete.name}&rdquo;</strong> do catálogo?
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe All Confirmation Modal */}
      {showWipeConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl p-4 shadow-xl border border-stone-200">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-center font-bold text-sm text-stone-900">
              Zerar Todo o Catálogo?
            </h4>
            <p className="text-center text-xs text-stone-500 mt-1 leading-relaxed">
              Exclui todos os dados na memória local e no BD ( Firebase ). Essa ação é definitiva e deixará o catálogo como novo.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowWipeConfirmModal(false)}
                disabled={isWipingData}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWipe}
                disabled={isWipingData}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isWipingData ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Limpando...</span>
                  </>
                ) : (
                  <span>Sim, Zerar Tudo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
