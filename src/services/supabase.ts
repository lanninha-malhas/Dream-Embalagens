import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Category, StoreSettings } from '../types.ts';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from '../data/defaultProducts.ts';

export function sanitizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Remove aspas caso o usuário tenha inserido "https://..."
  url = url.replace(/^["']|["']$/g, '').trim();

  // Caso o usuário tenha colado a URL do painel: https://supabase.com/dashboard/project/<ref>
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Remove caminhos comuns que o SDK adiciona sozinho (/rest/v1, /rest, /auth/v1, /v1)
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/rest\/?$/i, '');
  url = url.replace(/\/auth\/v1\/?$/i, '');
  url = url.replace(/\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.supabase.co')) {
      return `https://${parsed.hostname}`;
    }
    const cleanPath = parsed.pathname.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return url;
  }
}

export function sanitizeSupabaseKey(rawKey?: string): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/^["']|["']$/g, '').trim();
}

export const CUSTOM_SUPABASE_URL_KEY = 'office_custom_supabase_url';
export const CUSTOM_SUPABASE_KEY_KEY = 'office_custom_supabase_anon_key';
export const CATEGORIES_CACHE_KEY = 'office_catalog_categories_cache';
export const PRODUCTS_CACHE_KEY = 'office_catalog_products_cache';
export const SETTINGS_CACHE_KEY = 'office_store_settings_cache';

// Obtém as credenciais de Supabase (primeiro do ambiente Vercel/Vite, ou do armazenamento local se configurado no painel)
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  let url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  let anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if ((!url || !anonKey) && typeof window !== 'undefined') {
    try {
      const storedUrl = localStorage.getItem(CUSTOM_SUPABASE_URL_KEY) || '';
      const storedKey = localStorage.getItem(CUSTOM_SUPABASE_KEY_KEY) || '';
      if (storedUrl && storedKey) {
        url = storedUrl;
        anonKey = storedKey;
      }
    } catch {
      // Ignore
    }
  }

  return {
    url: sanitizeSupabaseUrl(url),
    anonKey: sanitizeSupabaseKey(anonKey),
  };
}

export function setCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (url.trim() && anonKey.trim()) {
        localStorage.setItem(CUSTOM_SUPABASE_URL_KEY, sanitizeSupabaseUrl(url));
        localStorage.setItem(CUSTOM_SUPABASE_KEY_KEY, sanitizeSupabaseKey(anonKey));
      } else {
        localStorage.removeItem(CUSTOM_SUPABASE_URL_KEY);
        localStorage.removeItem(CUSTOM_SUPABASE_KEY_KEY);
      }
    } catch {
      // Ignore
    }
    supabaseClient = null; // recria cliente com as novas credenciais
  }
}

export function getIsSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
}

export const isSupabaseConfigured = getIsSupabaseConfigured();

// Cache local resiliente para categorias
export function getLocalCachedCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch {
    // Ignore
  }
}

// Cache local resiliente para produtos
export function getLocalCachedProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch {
    // Ignore
  }
}

// Limpeza pontual de chaves antigas residuais (apenas quando solicitado explicitamente)
export function purgeInternalStorage(): void {
  try {
    const keysToRemove = [
      'kraft_catalog_products_v1',
      'kraft_catalog_categories_v1',
      'kraft_catalog_settings_v2',
      'kraft_catalog_settings_v1',
      'kraft_catalog_cart_v1',
      'molekada_logo',
      'office_embalagens_logo',
    ];
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch (err) {
    console.error('Error clearing local residual storage:', err);
  }
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  try {
    supabaseClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseClient;
  } catch (err) {
    console.warn('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

// Testa a conexão com o Supabase
export async function testConnection(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('settings').select('id').limit(1);
    if (error) {
      console.warn('Supabase query aviso na verificação de conexão:', error.message);
      // Erros fatais de configuração de URL ou rede
      if (
        error.message.includes('Invalid path') ||
        error.message.includes('fetch') ||
        error.message.includes('Failed to fetch') ||
        error.code === 'PGRST301'
      ) {
        return false;
      }
      // Se a tabela ainda não foi criada no SQL editor (PGRST204 / 42P01), o endpoint respondeu
      return true;
    }
    return true;
  } catch (err) {
    console.warn('Falha ao conectar no Supabase:', err);
    return false;
  }
}

// Mapeamento de Produto (PostgreSQL snake_case <-> TypeScript camelCase)
function mapProductFromRow(row: any): Product & { orderIndex?: number } {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    price: Number(row.price) || 0,
    costPrice: row.cost_price !== null && row.cost_price !== undefined ? Number(row.cost_price) : undefined,
    profit: row.profit !== null && row.profit !== undefined ? Number(row.profit) : undefined,
    sku: row.sku || undefined,
    code: row.code || undefined,
    category: row.category || undefined,
    increment: row.increment !== null && row.increment !== undefined ? Number(row.increment) : 1,
    stock: row.stock !== null && row.stock !== undefined ? Number(row.stock) : undefined,
    unit: row.unit || 'Fardo c/ 500 un',
    available: row.available !== false,
    hideDescription: Boolean(row.hide_description),
    hidePrice: Boolean(row.hide_price),
    orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
  };
}

function mapProductToRow(prod: Partial<Product> & { id: string }, orderIndex?: number): Record<string, any> {
  const row: Record<string, any> = {
    id: prod.id,
    name: prod.name?.trim(),
    description: (prod.description || '').trim(),
    price: Number(prod.price) || 0,
    available: prod.available ?? true,
    unit: prod.unit || 'Fardo c/ 500 un',
  };

  if (typeof orderIndex === 'number') row.order_index = orderIndex;
  if (prod.costPrice !== undefined) row.cost_price = Number(prod.costPrice) || 0;
  if (prod.profit !== undefined) row.profit = Number(prod.profit) || 0;
  if (prod.sku !== undefined) row.sku = prod.sku?.trim() || null;
  if (prod.code !== undefined) row.code = prod.code?.trim() || null;
  if (prod.category !== undefined) row.category = prod.category?.trim() || null;
  if (prod.increment !== undefined) row.increment = Number(prod.increment) || 1;
  if (prod.stock !== undefined) row.stock = Number(prod.stock) || 0;
  if (prod.hideDescription !== undefined) row.hide_description = Boolean(prod.hideDescription);
  if (prod.hidePrice !== undefined) row.hide_price = Boolean(prod.hidePrice);

  return row;
}

// Mapeamento de Categoria
function mapCategoryFromRow(row: any): Category & { orderIndex?: number } {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || undefined,
    imageUrl: row.image_url || undefined,
    imageZoom: typeof row.image_zoom === 'number' ? row.image_zoom : 0,
    orderIndex: typeof row.order_index === 'number' ? row.order_index : 0,
  };
}

export function getLocalCachedSettings(): Partial<StoreSettings> | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalCachedSettings(settings: StoreSettings): void {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

// Mapeamento de Configurações
function mapSettingsFromRow(row: any): StoreSettings {
  const cached = getLocalCachedSettings();

  const showCategoryImages =
    row.show_category_images !== undefined && row.show_category_images !== null
      ? Boolean(row.show_category_images)
      : (cached?.showCategoryImages ?? false);

  const logoZoom =
    typeof row.logo_zoom === 'number'
      ? row.logo_zoom
      : typeof cached?.logoZoom === 'number'
      ? cached.logoZoom
      : 0;

  return {
    storeName: row.store_name !== undefined ? row.store_name : (cached?.storeName ?? ''),
    subtitle: row.subtitle !== undefined ? row.subtitle : (cached?.subtitle ?? ''),
    logoUrl: row.logo_url !== undefined ? row.logo_url : (cached?.logoUrl ?? ''),
    logoZoom,
    whatsappNumber: row.whatsapp_number !== undefined ? row.whatsapp_number : (cached?.whatsappNumber ?? ''),
    pixKey: row.pix_key !== undefined ? row.pix_key : (cached?.pixKey ?? ''),
    minOrderValue: typeof row.min_order_value === 'number' ? row.min_order_value : (cached?.minOrderValue ?? 0),
    deliveryNotice: row.delivery_notice !== undefined ? row.delivery_notice : (cached?.deliveryNotice ?? ''),
    hideCatalogDescription: row.hide_catalog_description !== undefined ? row.hide_catalog_description : (cached?.hideCatalogDescription ?? false),
    hideCatalogPrice: row.hide_catalog_price !== undefined ? row.hide_catalog_price : (cached?.hideCatalogPrice ?? false),
    showCategoryImages,
    adminPassword: row.admin_password || cached?.adminPassword || 'admin',
  };
}

// Assinatura em Tempo Real para Categorias
export function subscribeCategories(
  callback: (categories: Category[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Emite o cache local imediatamente para exibição instantânea sem tela em branco
  const cached = getLocalCachedCategories();
  if (cached.length > 0) {
    callback(cached);
  }

  const client = getSupabase();
  if (!client) {
    callback(cached);
    return () => {};
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await client
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar categorias do Supabase:', error.message);
        onError?.(new Error(error.message));
        return;
      }

      if (Array.isArray(data)) {
        const mapped = data.map(mapCategoryFromRow);
        saveLocalCachedCategories(mapped);
        callback(mapped);
      }
    } catch (err) {
      console.warn('Exceção ao buscar categorias:', err);
    }
  };

  fetchCategories();

  const channel = client
    .channel('public:categories')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
      fetchCategories();
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// Assinatura em Tempo Real para Produtos
export function subscribeProducts(
  callback: (products: Product[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Emite o cache local imediatamente para exibição instantânea sem tela em branco
  const cached = getLocalCachedProducts();
  if (cached.length > 0) {
    callback(cached);
  }

  const client = getSupabase();
  if (!client) {
    callback(cached);
    return () => {};
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar produtos do Supabase:', error.message);
        onError?.(new Error(error.message));
        return;
      }

      if (Array.isArray(data)) {
        const mapped = data.map(mapProductFromRow);
        saveLocalCachedProducts(mapped);
        callback(mapped);
      }
    } catch (err) {
      console.warn('Exceção ao buscar produtos:', err);
    }
  };

  fetchProducts();

  const channel = client
    .channel('public:products')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      fetchProducts();
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// Assinatura em Tempo Real para Configurações
export function subscribeSettings(
  callback: (settings: StoreSettings) => void,
  onError?: (error: Error) => void
): () => void {
  const client = getSupabase();
  if (!client) {
    callback(INITIAL_SETTINGS);
    return () => {};
  }

  const fetchSettings = async () => {
    try {
      const { data, error } = await client
        .from('settings')
        .select('*')
        .eq('id', 'store')
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar configurações do Supabase:', error.message);
        callback(INITIAL_SETTINGS);
        onError?.(new Error(error.message));
        return;
      }

      if (data) {
        callback(mapSettingsFromRow(data));
      } else {
        // Se ainda não existir registro no Supabase, tenta salvar os valores padrão com segurança
        try {
          await saveSettingsToCloud(INITIAL_SETTINGS);
        } catch (saveErr) {
          console.warn('Aviso: Não foi possível gravar configurações padrão iniciais:', saveErr);
        }
        callback(INITIAL_SETTINGS);
      }
    } catch (err) {
      console.warn('Exceção ao buscar configurações:', err);
      callback(INITIAL_SETTINGS);
    }
  };

  fetchSettings();

  const channel = client
    .channel('public:settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
      fetchSettings();
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// Inicializa o banco de dados Supabase caso a tabela de configurações ainda não tenha sido registrada.
// NUNCA popula dados demonstrativos para manter o catálogo novo e zerado.
export async function initializeCloudDatabase(): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const { data: settingData, error: settingErr } = await client
      .from('settings')
      .select('id')
      .eq('id', 'store')
      .maybeSingle();

    if (settingErr) {
      console.warn('Aviso ao checar inicialização do Supabase:', settingErr.message);
      return;
    }

    if (settingData) {
      return;
    }

    // Salva as configurações iniciais em branco para marcar a loja como inicializada
    await saveSettingsToCloud(INITIAL_SETTINGS);
  } catch (err) {
    console.warn('Aviso durante inicialização do Supabase:', err);
  }
}

// Limpeza total de todos os dados do catálogo (banco de dados Supabase e armazenamento local)
export async function wipeAllDataFromCloud(): Promise<void> {
  purgeInternalStorage();

  const client = getSupabase();
  if (!client) return;

  try {
    // 1. Exclui todos os produtos
    const { error: prodErr } = await client.from('products').delete().neq('id', '');
    if (prodErr) console.warn('Aviso ao limpar produtos no Supabase:', prodErr.message);

    // 2. Exclui todas as categorias
    const { error: catErr } = await client.from('categories').delete().neq('id', '');
    if (catErr) console.warn('Aviso ao limpar categorias no Supabase:', catErr.message);

    // 3. Reseta as configurações da loja para valores em branco
    await saveSettingsToCloud({
      storeName: '',
      subtitle: '',
      logoUrl: '',
      logoZoom: 0,
      whatsappNumber: '',
      pixKey: '',
      minOrderValue: 0,
      deliveryNotice: '',
      hideCatalogDescription: false,
      hideCatalogPrice: false,
      showCategoryImages: false,
      adminPassword: 'admin',
    });
    console.log('Banco de dados Supabase e memória local zerados com sucesso.');
  } catch (err) {
    console.error('Erro ao limpar banco de dados Supabase:', err);
    throw err;
  }
}

// Operações de Produtos
export async function saveProductToCloud(
  product: Omit<Product, 'id'> & { id?: string },
  orderIndex?: number
): Promise<string> {
  const client = getSupabase();
  const id = product.id || `kft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const row = mapProductToRow({ ...product, id }, orderIndex);

  // 1. Atualiza imediatamente o cache local para refletir no catálogo sem atraso
  const currentProds = getLocalCachedProducts();
  const fullProd: Product = {
    ...product,
    id,
    orderIndex: typeof orderIndex === 'number' ? orderIndex : (product.orderIndex ?? currentProds.length),
  };
  const existingIdx = currentProds.findIndex((p) => p.id === id);
  if (existingIdx >= 0) {
    currentProds[existingIdx] = fullProd;
  } else {
    currentProds.push(fullProd);
  }
  saveLocalCachedProducts(currentProds);

  // 2. Persiste no Supabase caso configurado
  if (client) {
    const { error } = await client.from('products').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao salvar produto no Supabase:', error.message);
      throw new Error(`Erro ao salvar produto no Supabase: ${error.message}`);
    }
  }

  return id;
}

export async function deleteProductFromCloud(productId: string): Promise<void> {
  const currentProds = getLocalCachedProducts().filter((p) => p.id !== productId);
  saveLocalCachedProducts(currentProds);

  const client = getSupabase();
  if (!client) return;

  const { error } = await client.from('products').delete().eq('id', productId);
  if (error) {
    console.error('Erro ao excluir produto no Supabase:', error.message);
    throw new Error(`Erro ao excluir produto no Supabase: ${error.message}`);
  }
}

export async function reorderProductsInCloud(products: Product[]): Promise<void> {
  saveLocalCachedProducts(products);

  const client = getSupabase();
  if (!client) return;

  const updates = products.map((prod, index) => ({
    id: prod.id,
    order_index: index,
  }));

  const { error } = await client.from('products').upsert(updates, { onConflict: 'id' });
  if (error) {
    console.error('Erro ao reordenar produtos no Supabase:', error.message);
    throw new Error(`Erro ao reordenar produtos no Supabase: ${error.message}`);
  }
}

// Operações de Categorias
export async function saveCategoryToCloud(
  cat: Partial<Category> & { id?: string },
  orderIndex?: number
): Promise<string> {
  const client = getSupabase();
  const id = cat.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 1. Atualiza imediatamente o cache local para refletir no catálogo sem atraso
  const currentCats = getLocalCachedCategories();
  const fullCat: Category = {
    id,
    name: (cat.name || '').trim(),
    description: cat.description?.trim(),
    imageUrl: cat.imageUrl,
    imageZoom: typeof cat.imageZoom === 'number' ? cat.imageZoom : 0,
    orderIndex: typeof orderIndex === 'number' ? orderIndex : (cat.orderIndex ?? currentCats.length),
  };
  const existingIdx = currentCats.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    currentCats[existingIdx] = fullCat;
  } else {
    currentCats.push(fullCat);
  }
  saveLocalCachedCategories(currentCats);

  const row: Record<string, any> = {
    id,
  };
  if (cat.name !== undefined) row.name = cat.name.trim();
  if (cat.description !== undefined) row.description = cat.description.trim() || null;
  if (cat.imageUrl !== undefined) row.image_url = cat.imageUrl || null;
  if (cat.imageZoom !== undefined) row.image_zoom = Math.max(-50, Math.min(50, Number(cat.imageZoom) || 0));
  if (typeof orderIndex === 'number') row.order_index = orderIndex;

  // 2. Persiste no Supabase caso configurado
  if (client) {
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      const { error } = await client.from('categories').upsert(row, { onConflict: 'id' });
      if (!error) break;

      // Se a coluna ainda não foi adicionada no Supabase (ex: image_zoom)
      const match = error.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && row[match[1]] !== undefined) {
        console.warn(`Coluna '${match[1]}' ausente em 'categories'. Removendo e retentando.`);
        delete row[match[1]];
        continue;
      }

      console.error('Erro ao salvar categoria no Supabase:', error.message);
      throw new Error(`Erro ao salvar categoria no Supabase: ${error.message}`);
    }
  }

  return id;
}

export async function deleteCategoryFromCloud(categoryId: string): Promise<void> {
  const currentCats = getLocalCachedCategories().filter((c) => c.id !== categoryId);
  saveLocalCachedCategories(currentCats);

  const client = getSupabase();
  if (!client) return;

  const { error } = await client.from('categories').delete().eq('id', categoryId);
  if (error) {
    console.error('Erro ao excluir categoria no Supabase:', error.message);
    throw new Error(`Erro ao excluir categoria no Supabase: ${error.message}`);
  }
}

// Operações de Configurações com resiliência a colunas ausentes no cache de esquema
export async function saveSettingsToCloud(
  settings: StoreSettings
): Promise<{ missingColumns?: string[] }> {
  // Salva no armazenamento local primeiro para que o catálogo reflita imediatamente
  saveLocalCachedSettings(settings);

  const client = getSupabase();
  if (!client) return {};

  const row: Record<string, any> = {
    id: 'store',
    store_name: (settings.storeName || '').trim(),
    whatsapp_number: (settings.whatsappNumber || '').trim(),
    subtitle: (settings.subtitle || '').trim(),
    logo_url: (settings.logoUrl || '').trim(),
    logo_zoom: typeof settings.logoZoom === 'number' ? Math.max(-50, Math.min(50, settings.logoZoom)) : 0,
    pix_key: (settings.pixKey || '').trim(),
    min_order_value: Number(settings.minOrderValue) || 0,
    delivery_notice: (settings.deliveryNotice || '').trim(),
    hide_catalog_description: Boolean(settings.hideCatalogDescription),
    hide_catalog_price: Boolean(settings.hideCatalogPrice),
    show_category_images: Boolean(settings.showCategoryImages),
    admin_password: (settings.adminPassword || 'admin').trim(),
    updated_at: new Date().toISOString(),
  };

  const missingColumns: string[] = [];
  let attempts = 0;

  while (attempts < 5) {
    attempts++;
    const { error } = await client.from('settings').upsert(row, { onConflict: 'id' });
    if (!error) {
      if (missingColumns.length > 0) {
        console.warn(
          `Configurações salvas no Supabase. Colunas pendentes de migração SQL: ${missingColumns.join(', ')}`
        );
      }
      return { missingColumns: missingColumns.length > 0 ? missingColumns : undefined };
    }

    // Identifica se o erro é de coluna ausente no cache de esquema do PostgREST
    // Ex: "Could not find the 'show_category_images' column of 'settings' in the schema cache"
    const match = error.message.match(/Could not find the '([^']+)' column/i);
    if (match && match[1] && row[match[1]] !== undefined) {
      const col = match[1];
      missingColumns.push(col);
      console.warn(`Coluna '${col}' ausente em 'settings' do Supabase. Removendo do envio para salvar demais campos.`);
      delete row[col];
      continue;
    }

    console.error('Erro ao salvar configurações no Supabase:', error.message);
    throw new Error(`Erro ao salvar configurações no Supabase: ${error.message}`);
  }

  return { missingColumns: missingColumns.length > 0 ? missingColumns : undefined };
}
