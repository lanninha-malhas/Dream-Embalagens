import React, { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, StoreSettings, Category } from './types.ts';
import {
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
} from './data/defaultProducts.ts';
import { Header } from './components/Header.tsx';
import { CategoryCard } from './components/CategoryCard.tsx';
import { CategoryProductsModal } from './components/CategoryProductsModal.tsx';
import { CartPage } from './components/CartPage.tsx';
import { CartSummaryBar } from './components/CartSummaryBar.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import {
  ShoppingCart,
  Search,
  X,
  FolderOpen,
  Cloud,
  Loader2,
} from 'lucide-react';
import { PWAInstallBanner } from './components/PWAInstallBanner.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import {
  isFirebaseConfigured,
  purgeInternalStorage,
  testConnection,
  initializeCloudDatabase,
  subscribeCategories,
  subscribeProducts,
  subscribeSettings,
  saveProductToCloud,
  deleteProductFromCloud,
  reorderProductsInCloud,
  saveCategoryToCloud,
  deleteCategoryFromCloud,
  saveSettingsToCloud,
  wipeAllDataFromCloud,
  getLocalCachedCategories,
  getLocalCachedProducts,
  getLocalCachedSettings,
} from './services/firebase.ts';

// Helper function to normalize text (removes accents and converts to lowercase)
export function normalizeSearchText(text?: string | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getInitialView(): 'catalog' | 'cart' | 'admin' {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase();
    if (path === '/admin' || path.startsWith('/admin/')) {
      return 'admin';
    }
    if (path === '/carrinho' || path.startsWith('/carrinho/')) {
      return 'cart';
    }
  }
  return 'catalog';
}

export default function App() {
  // Inicialização resiliente a partir do cache local para resposta instantânea
  const [categories, setCategories] = useState<Category[]>(() => {
    const cached = getLocalCachedCategories();
    const seen = new Set<string>();
    return cached.filter((c) => {
      const key = (c.name || '').trim().toLowerCase();
      if (!c.id || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = getLocalCachedProducts();
    const seen = new Set<string>();
    return cached.filter((p) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  });
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const cached = getLocalCachedSettings();
    return (cached as StoreSettings) || INITIAL_SETTINGS;
  });
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(true);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'catalog' | 'cart' | 'admin'>(getInitialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<Category | null>(null);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('office_admin_auth') === 'true';
    } catch {
      return false;
    }
  });

  // Sincronizar rota do navegador (/, /carrinho e /admin)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin/')) {
        setCurrentView('admin');
      } else if (path === '/carrinho' || path.startsWith('/carrinho/')) {
        setCurrentView('cart');
      } else {
        setCurrentView('catalog');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (view: 'catalog' | 'cart' | 'admin') => {
    setCurrentView(view);
    const targetPath = view === 'admin' ? '/admin' : view === 'cart' ? '/carrinho' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem('office_admin_auth', 'true');
    } catch {
      // Ignore
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('office_admin_auth');
    } catch {
      // Ignore
    }
    handleNavigate('catalog');
  };

  // Conectar e sincronizar em tempo real com o banco de dados Supabase (sem wipe automático ao carregar)
  useEffect(() => {
    let unsubscribeCats: (() => void) | undefined;
    let unsubscribeProds: (() => void) | undefined;
    let unsubscribeSets: (() => void) | undefined;

    // Registra assinaturas (emitem cache local instantaneamente se offline)
    unsubscribeCats = subscribeCategories((cloudCategories) => {
      setCategories(cloudCategories);
    });

    unsubscribeProds = subscribeProducts((cloudProducts) => {
      setProducts(cloudProducts);
    });

    unsubscribeSets = subscribeSettings((cloudSettings) => {
      setSettings(cloudSettings);
    });

    async function initCloudSync() {
      try {
        const connected = await testConnection();
        if (connected) {
          await initializeCloudDatabase();
          setIsCloudConnected(true);
        } else {
          setIsCloudConnected(false);
        }
      } catch (err) {
        console.warn('Firebase sync initialized in local/offline mode:', err);
        setIsCloudConnected(false);
      } finally {
        setIsLoadingCloud(false);
      }
    }

    initCloudSync();

    return () => {
      unsubscribeCats?.();
      unsubscribeProds?.();
      unsubscribeSets?.();
    };
  }, []);

  // Cart operations (mantido fluido em sessão do cliente)
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== productId);
      }
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        );
      }
      return [...prev, { productId, quantity }];
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Category CRUD operations com persistência direta no Firestore
  const handleAddCategory = async (newCat: Omit<Category, 'id'>) => {
    const trimmedName = newCat.name.trim();
    if (!trimmedName) return;

    // Verificar se já existe uma categoria com este mesmo nome (evita duplicar)
    const existing = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      if (newCat.imageUrl !== undefined || newCat.imageZoom !== undefined) {
        await handleEditCategory(existing.id, newCat);
      }
      return;
    }

    const nextOrder = categories.length;
    const catId = await saveCategoryToCloud(newCat, nextOrder);
    setCategories((prev) => {
      if (prev.some((c) => c.id === catId || c.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
        return prev;
      }
      return [...prev, { ...newCat, id: catId, orderIndex: nextOrder }];
    });
  };

  const handleEditCategory = async (id: string, updatedFields: Partial<Category>) => {
    const oldCat = categories.find((c) => c.id === id);
    if (!oldCat) return;
    const mergedCat: Category = { ...oldCat, ...updatedFields };
    setCategories((prev) => prev.map((c) => (c.id === id ? mergedCat : c)));
    await saveCategoryToCloud(mergedCat);

    // Se o nome da categoria mudou, sincronizar os produtos vinculados
    if (updatedFields.name && oldCat.name !== updatedFields.name) {
      const linked = products.filter(
        (p) => p.category?.trim().toLowerCase() === oldCat.name.trim().toLowerCase()
      );
      for (const prod of linked) {
        await saveProductToCloud({ ...prod, category: updatedFields.name });
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const catToDelete = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await deleteCategoryFromCloud(id);

    // Reatribuir produtos da categoria excluída para 'Geral'
    if (catToDelete) {
      const linked = products.filter(
        (p) => p.category?.trim().toLowerCase() === catToDelete.name.trim().toLowerCase()
      );
      for (const prod of linked) {
        await saveProductToCloud({ ...prod, category: 'Geral' });
      }
    }
  };

  // Product CRUD operations com persistência direta no Firestore
  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    const nextOrder = products.length;
    const prodId = await saveProductToCloud(newProduct, nextOrder);
    setProducts((prev) => {
      if (prev.some((p) => p.id === prodId)) {
        return prev;
      }
      return [...prev, { ...newProduct, id: prodId, orderIndex: nextOrder }];
    });

    // Se o produto possui categoria ainda não listada, cadastra na nuvem se não existir
    if (newProduct.category) {
      const catName = newProduct.category.trim();
      const exists = categories.some(
        (c) => c.name.trim().toLowerCase() === catName.toLowerCase()
      );
      if (!exists) {
        await handleAddCategory({ name: catName });
      }
    }
  };

  const handleEditProduct = async (id: string, updatedFields: Partial<Product>) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updatedFields, id };
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    await saveProductToCloud(updated);

    if (updatedFields.category) {
      const exists = categories.some(
        (c) => c.name.trim().toLowerCase() === updatedFields.category!.trim().toLowerCase()
      );
      if (!exists) {
        await handleAddCategory({ name: updatedFields.category.trim() });
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await deleteProductFromCloud(id);
    setCart((prev) => prev.filter((item) => item.productId !== id));
  };

  const handleReorderProducts = async (reorderedProducts: Product[]) => {
    setProducts(reorderedProducts);
    await reorderProductsInCloud(reorderedProducts);
  };

  const handleSaveSettings = async (newSettings: StoreSettings) => {
    setSettings(newSettings);
    if (isFirebaseConfigured) {
      return await saveSettingsToCloud(newSettings);
    }
  };

  const handleWipeAllData = async () => {
    if (isFirebaseConfigured) {
      await wipeAllDataFromCloud();
    } else {
      purgeInternalStorage();
    }
    setProducts([]);
    setCategories([]);
    setCart([]);
    setSettings(INITIAL_SETTINGS);
  };

  // Contagem de itens no carrinho
  const totalCartCount = cart.filter((item) => item.quantity > 0).length;

  // Valor total dos itens no carrinho
  const totalCartPrice = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    return cart.reduce((sum, item) => {
      const prod = productMap.get(item.productId);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);
  }, [cart, products]);

  // Produtos visíveis aos clientes
  const visibleProducts = useMemo(() => {
    return products.filter((p) => p.available);
  }, [products]);

  // Filtragem de categorias e produtos por termo de pesquisa
  const filteredCategories = useMemo(() => {
    const queryNorm = normalizeSearchText(searchQuery);

    if (!queryNorm) {
      return categories;
    }

    return categories.filter((category) => {
      const catNameNorm = normalizeSearchText(category.name);
      const catDescNorm = normalizeSearchText(category.description);

      if (catNameNorm.includes(queryNorm) || catDescNorm.includes(queryNorm)) {
        return true;
      }

      // Verifica se algum produto desta categoria corresponde à pesquisa
      const hasMatchingProduct = visibleProducts.some((p) => {
        const isInCategory =
          (p.category || 'Geral').trim().toLowerCase() ===
          category.name.trim().toLowerCase();
        if (!isInCategory) return false;

        const pName = normalizeSearchText(p.name);
        const pDesc = normalizeSearchText(p.description);
        const pSku = normalizeSearchText(p.sku);
        const pCode = normalizeSearchText(p.code);
        const pUnit = normalizeSearchText(p.unit);

        return (
          pName.includes(queryNorm) ||
          pDesc.includes(queryNorm) ||
          pSku.includes(queryNorm) ||
          pCode.includes(queryNorm) ||
          pUnit.includes(queryNorm)
        );
      });

      return hasMatchingProduct;
    });
  }, [categories, visibleProducts, searchQuery]);

  return (
    <div className="min-h-screen bg-stone-200/70 sm:py-6 flex justify-center items-start">
      {/* Mobile-First Device Frame Container */}
      <div className="w-full max-w-md bg-stone-50 min-h-screen sm:min-h-[820px] sm:rounded-3xl sm:shadow-2xl flex flex-col overflow-hidden relative border border-stone-300/40">
        
        {/* Cabeçalho, barra de pesquisa e botão de carrinho FIXOS no topo */}
        <div className="sticky top-0 z-30 bg-white border-b border-stone-200/90 shadow-xs shrink-0">
          <Header
            currentView={currentView}
            onNavigate={handleNavigate}
            cartCount={totalCartCount}
            onOpenCart={() => handleNavigate('cart')}
            settings={settings}
            isCloudConnected={isCloudConnected}
            onLogout={isAdminAuthenticated ? handleAdminLogout : undefined}
          />

          {currentView === 'catalog' && (
            <div className="px-3.5 pb-2.5 pt-1 bg-white flex items-center gap-2">
              {/* Barra de Pesquisa */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar categoria ou produto..."
                  className="w-full h-10 pl-9 pr-8 text-xs bg-stone-50 hover:bg-stone-100/70 focus:bg-white rounded-xl border border-stone-200/90 focus:border-[#302C9B] focus:ring-1 focus:ring-[#302C9B] outline-none text-stone-900 placeholder:text-stone-400 transition-all shadow-2xs"
                  aria-label="Buscar categorias ou produtos"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer transition-colors"
                    aria-label="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Botão Meu Carrinho na mesma linha */}
              <button
                type="button"
                onClick={() => handleNavigate('cart')}
                className={`h-10 px-3 rounded-xl border flex items-center gap-1.5 shrink-0 transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap shadow-2xs ${
                  totalCartCount > 0
                    ? 'bg-[#302C9B] hover:bg-[#25227B] text-white border-[#302C9B] font-bold'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200/90 text-stone-700 font-medium'
                }`}
                aria-label="Abrir Carrinho de Compras"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-xs">Meu Carrinho</span>
                {totalCartCount > 0 && (
                  <span className="min-w-[19px] h-[19px] px-1 rounded-full bg-white text-[#302C9B] text-[11px] font-black flex items-center justify-center leading-none shadow-2xs">
                    {totalCartCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* View Switcher: Catalog vs Admin */}
        <main className="flex-1 overflow-y-auto px-3.5 py-3.5">
          {isLoadingCloud ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#302C9B]/10 text-[#302C9B] flex items-center justify-center mx-auto animate-pulse">
                <Cloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-stone-700 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#302C9B]" />
                <span>Carregando catálogo da nuvem...</span>
              </p>
            </div>
          ) : currentView === 'catalog' ? (
            <div className="space-y-3 pb-20">
              {/* Banner de Instalação PWA do Catálogo */}
              <PWAInstallBanner />

              {/* Seção CATEGORIAS */}
              <div className="flex items-center justify-between pt-0.5 px-0.5">
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-[#302C9B]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    {searchQuery.trim() ? 'Categorias Encontradas' : 'CATEGORIAS'}
                  </h3>
                </div>

                {searchQuery.trim() && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone-500 tabular-nums">
                      {filteredCategories.length}{' '}
                      {filteredCategories.length === 1 ? 'categoria' : 'categorias'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[#302C9B] font-semibold hover:underline cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>

              {/* Lista de Containers de Categorias */}
              <div className="space-y-2.5">
                {filteredCategories.length === 0 ? (
                  <div className="p-6 bg-white rounded-2xl border border-dashed border-stone-300 text-center space-y-2.5">
                    <Search className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-xs font-bold text-stone-800">
                      {searchQuery.trim()
                        ? `Nenhuma categoria encontrada para “${searchQuery}”`
                        : 'Nenhuma categoria cadastrada no momento.'}
                    </p>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs text-white font-bold bg-[#302C9B] hover:bg-[#25227B] rounded-xl cursor-pointer transition-colors shadow-xs"
                      >
                        Limpar pesquisa
                      </button>
                    )}
                  </div>
                ) : (
                  filteredCategories.map((category) => {
                    const catProducts = visibleProducts.filter(
                      (p) =>
                        (p.category || 'Geral').trim().toLowerCase() ===
                        category.name.trim().toLowerCase()
                    );

                    const catProductIds = new Set(catProducts.map((p) => p.id));
                    const cartCountForCat = cart
                      .filter((item) => catProductIds.has(item.productId) && item.quantity > 0)
                      .reduce((sum, item) => sum + item.quantity, 0);

                    return (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        productCount={catProducts.length}
                        cartItemsCount={cartCountForCat}
                        onOpen={(cat) => setSelectedCategoryForModal(cat)}
                        showImage={Boolean(settings.showCategoryImages)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          ) : currentView === 'cart' ? (
            <CartPage
              cart={cart}
              products={products}
              onUpdateQuantity={handleUpdateQuantity}
              onClearCart={handleClearCart}
              onBackToCatalog={() => handleNavigate('catalog')}
              settings={settings}
            />
          ) : !isAdminAuthenticated ? (
            <AdminLoginModal
              expectedPassword={settings.adminPassword || 'abc1234'}
              onSuccess={handleAdminLoginSuccess}
              onCancel={() => handleNavigate('catalog')}
            />
          ) : (
            <AdminPanel
              products={products}
              categories={categories}
              settings={settings}
              isCloudConnected={isCloudConnected}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
              onReorderProducts={handleReorderProducts}
              onAddCategory={handleAddCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onSaveSettings={handleSaveSettings}
              onWipeAllData={handleWipeAllData}
              onBackToCatalog={() => handleNavigate('catalog')}
            />
          )}
        </main>

        {/* Modal de Produtos da Categoria Selecionada */}
        <CategoryProductsModal
          isOpen={Boolean(selectedCategoryForModal)}
          category={selectedCategoryForModal}
          products={products}
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onClose={() => setSelectedCategoryForModal(null)}
          onOpenCart={() => {
            setSelectedCategoryForModal(null);
            handleNavigate('cart');
          }}
          settings={settings}
        />

        {/* Barra de Resumo no Catálogo */}
        {currentView === 'catalog' && (
          <CartSummaryBar
            totalItems={totalCartCount}
            totalPrice={totalCartPrice}
            onOpenCart={() => handleNavigate('cart')}
            hidePrice={false}
          />
        )}

        {/* Indicador de Status Offline */}
        <OfflineIndicator />
      </div>
    </div>
  );
}
