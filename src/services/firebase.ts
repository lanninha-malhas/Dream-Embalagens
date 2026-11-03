import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Category, StoreSettings } from '../types.ts';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from '../data/defaultProducts.ts';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const isFirebaseConfigured = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local cache keys for instantaneous startup and offline support
export const CATEGORIES_CACHE_KEY = 'office_catalog_categories_cache';
export const PRODUCTS_CACHE_KEY = 'office_catalog_products_cache';
export const SETTINGS_CACHE_KEY = 'office_store_settings_cache';

export function getLocalCachedCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch {
    // Ignore storage quota errors
  }
}

export function getLocalCachedProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCachedProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch {
    // Ignore storage quota errors
  }
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
    // Ignore storage quota errors
  }
}

// Test initial connection on boot as mandated by the skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline or connecting...');
    }
    return false;
  }
}

export function purgeInternalStorage(): void {
  // Safe helper if needed
}

// Real-time listener for Categories
export function subscribeCategories(
  callback: (categories: Category[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Emit locally cached categories immediately to prevent empty layout
  const cached = getLocalCachedCategories();
  if (cached.length > 0) {
    callback(cached);
  }

  const collPath = 'categories';
  return onSnapshot(
    collection(db, collPath),
    (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          description: data.description || undefined,
          imageUrl: data.imageUrl || undefined,
          imageZoom: typeof data.imageZoom === 'number' ? data.imageZoom : 0,
          orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
        });
      });

      // Sort by orderIndex or name
      list.sort((a, b) => {
        if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number') {
          return a.orderIndex - b.orderIndex;
        }
        return a.name.localeCompare(b.name);
      });

      saveLocalCachedCategories(list);
      callback(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, collPath);
    }
  );
}

// Real-time listener for Products
export function subscribeProducts(
  callback: (products: Product[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Emit locally cached products immediately
  const cached = getLocalCachedProducts();
  if (cached.length > 0) {
    callback(cached);
  }

  const collPath = 'products';
  return onSnapshot(
    collection(db, collPath),
    (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || '',
          description: data.description || '',
          price: Number(data.price) || 0,
          costPrice: typeof data.costPrice === 'number' ? data.costPrice : undefined,
          profit: typeof data.profit === 'number' ? data.profit : undefined,
          sku: data.sku || undefined,
          code: data.code || undefined,
          category: data.category || undefined,
          increment: typeof data.increment === 'number' ? data.increment : 1,
          stock: typeof data.stock === 'number' ? data.stock : undefined,
          unit: data.unit || 'Fardo c/ 500 un',
          available: data.available !== false,
          hideDescription: Boolean(data.hideDescription),
          hidePrice: Boolean(data.hidePrice),
          imageUrl: data.imageUrl || undefined,
          imageZoom: typeof data.imageZoom === 'number' ? data.imageZoom : 0,
          orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
        });
      });

      // Sort by orderIndex
      list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

      saveLocalCachedProducts(list);
      callback(list);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, collPath);
    }
  );
}

// Real-time listener for Settings
export function subscribeSettings(
  callback: (settings: StoreSettings) => void,
  onError?: (error: Error) => void
): () => void {
  const cached = getLocalCachedSettings();
  if (cached) {
    callback({
      ...INITIAL_SETTINGS,
      ...cached,
    });
  }

  const docPath = 'settings/store';
  return onSnapshot(
    doc(db, 'settings', 'store'),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const fullSettings: StoreSettings = {
          storeName: data.storeName || INITIAL_SETTINGS.storeName,
          subtitle: data.subtitle ?? INITIAL_SETTINGS.subtitle,
          logoUrl: data.logoUrl || INITIAL_SETTINGS.logoUrl,
          logoZoom: typeof data.logoZoom === 'number' ? data.logoZoom : 0,
          whatsappNumber: data.whatsappNumber || INITIAL_SETTINGS.whatsappNumber,
          pixKey: data.pixKey || INITIAL_SETTINGS.pixKey,
          minOrderValue: typeof data.minOrderValue === 'number' ? data.minOrderValue : 0,
          deliveryNotice: data.deliveryNotice || INITIAL_SETTINGS.deliveryNotice,
          hideCatalogDescription: data.hideCatalogDescription !== undefined ? data.hideCatalogDescription : true,
          hideCatalogPrice: data.hideCatalogPrice !== undefined ? data.hideCatalogPrice : true,
          showCategoryImages: Boolean(data.showCategoryImages),
          adminPassword: data.adminPassword || INITIAL_SETTINGS.adminPassword || 'abc1234',
        };
        saveLocalCachedSettings(fullSettings);
        callback(fullSettings);
      } else {
        // Create initial settings doc
        setDoc(doc(db, 'settings', 'store'), {
          ...INITIAL_SETTINGS,
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, docPath));
        saveLocalCachedSettings(INITIAL_SETTINGS);
        callback(INITIAL_SETTINGS);
      }
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  );
}

// Check and seed initial cloud database only if database is completely fresh
export async function initializeCloudDatabase(): Promise<void> {
  const catCollPath = 'categories';
  const prodCollPath = 'products';

  try {
    const [catSnap, prodSnap, setSnap] = await Promise.all([
      getDocs(collection(db, catCollPath)),
      getDocs(collection(db, prodCollPath)),
      getDoc(doc(db, 'settings', 'store')),
    ]);

    const batch = writeBatch(db);
    let hasWrites = false;

    // Seed default categories if database is completely empty
    if (catSnap.empty) {
      INITIAL_CATEGORIES.forEach((cat, index) => {
        const catRef = doc(db, 'categories', cat.id);
        batch.set(catRef, {
          name: cat.name,
          orderIndex: index,
          imageZoom: 0,
          ...(cat.imageUrl ? { imageUrl: cat.imageUrl } : {}),
          ...(cat.description ? { description: cat.description } : {}),
        });
      });
      hasWrites = true;
    }

    // Seed default products if empty
    if (prodSnap.empty) {
      INITIAL_PRODUCTS.forEach((prod, index) => {
        const prodRef = doc(db, 'products', prod.id);
        const payload: Record<string, any> = {
          name: prod.name,
          description: prod.description || '',
          price: prod.price,
          available: prod.available,
          orderIndex: index,
        };
        if (prod.costPrice !== undefined) payload.costPrice = prod.costPrice;
        if (prod.profit !== undefined) payload.profit = prod.profit;
        if (prod.sku) payload.sku = prod.sku;
        if (prod.code) payload.code = prod.code;
        if (prod.category) payload.category = prod.category;
        if (prod.unit) payload.unit = prod.unit;
        if (prod.increment !== undefined) payload.increment = prod.increment;
        if (prod.stock !== undefined) payload.stock = prod.stock;
        if (prod.imageUrl) payload.imageUrl = prod.imageUrl;
        if (prod.imageZoom !== undefined) payload.imageZoom = prod.imageZoom;

        batch.set(prodRef, payload);
      });
      hasWrites = true;
    }

    // Seed settings if missing
    if (!setSnap.exists()) {
      const setRef = doc(db, 'settings', 'store');
      batch.set(setRef, {
        storeName: INITIAL_SETTINGS.storeName,
        subtitle: INITIAL_SETTINGS.subtitle,
        logoUrl: INITIAL_SETTINGS.logoUrl,
        logoZoom: INITIAL_SETTINGS.logoZoom ?? 0,
        whatsappNumber: INITIAL_SETTINGS.whatsappNumber,
        pixKey: INITIAL_SETTINGS.pixKey,
        minOrderValue: INITIAL_SETTINGS.minOrderValue,
        deliveryNotice: INITIAL_SETTINGS.deliveryNotice,
        hideCatalogDescription: INITIAL_SETTINGS.hideCatalogDescription,
        hideCatalogPrice: INITIAL_SETTINGS.hideCatalogPrice,
        showCategoryImages: INITIAL_SETTINGS.showCategoryImages ?? false,
        adminPassword: INITIAL_SETTINGS.adminPassword || 'abc1234',
      });
      hasWrites = true;
    }

    if (hasWrites) {
      await batch.commit();
      console.log('Firebase Cloud database seeded successfully.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bootstrap');
  }
}

// Product Mutations
export async function saveProductToCloud(product: Omit<Product, 'id'> & { id?: string }, orderIndex?: number): Promise<string> {
  const id = product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `products/${id}`;

  const payload: Record<string, any> = {
    name: product.name.trim(),
    price: Number(product.price) || 0,
    available: product.available ?? true,
    description: (product.description || '').trim(),
  };

  if (typeof orderIndex === 'number') payload.orderIndex = orderIndex;
  if (product.costPrice !== undefined) payload.costPrice = Number(product.costPrice) || 0;
  if (product.profit !== undefined) payload.profit = Number(product.profit) || 0;
  if (product.sku) payload.sku = product.sku.trim();
  if (product.code) payload.code = product.code.trim();
  if (product.category) payload.category = product.category.trim();
  if (product.unit) payload.unit = product.unit.trim();
  if (product.increment) payload.increment = Number(product.increment) || 1;
  if (product.stock !== undefined) payload.stock = Number(product.stock) || 0;
  if (product.hideDescription !== undefined) payload.hideDescription = Boolean(product.hideDescription);
  if (product.hidePrice !== undefined) payload.hidePrice = Boolean(product.hidePrice);
  if (product.imageUrl) payload.imageUrl = product.imageUrl;
  if (product.imageZoom !== undefined) payload.imageZoom = Number(product.imageZoom) || 0;

  // Update local cache immediately
  const localList = getLocalCachedProducts();
  const existingIdx = localList.findIndex((p) => p.id === id);
  const updatedItem: Product = {
    ...(localList[existingIdx] || {}),
    ...product,
    id,
    orderIndex: typeof orderIndex === 'number' ? orderIndex : localList[existingIdx]?.orderIndex ?? localList.length,
  };
  if (existingIdx >= 0) {
    localList[existingIdx] = updatedItem;
  } else {
    localList.push(updatedItem);
  }
  saveLocalCachedProducts(localList);

  try {
    await setDoc(doc(db, 'products', id), payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductFromCloud(productId: string): Promise<void> {
  const path = `products/${productId}`;

  // Update local cache immediately
  const localList = getLocalCachedProducts().filter((p) => p.id !== productId);
  saveLocalCachedProducts(localList);

  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reorderProductsInCloud(products: Product[]): Promise<void> {
  saveLocalCachedProducts(products);

  const batch = writeBatch(db);
  products.forEach((prod, index) => {
    const ref = doc(db, 'products', prod.id);
    batch.update(ref, { orderIndex: index });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'products');
  }
}

// Category Mutations
export async function saveCategoryToCloud(cat: Partial<Category> & { id?: string }, orderIndex?: number): Promise<string> {
  const id = cat.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `categories/${id}`;

  const payload: Record<string, any> = {};
  if (cat.name !== undefined) payload.name = cat.name.trim();
  if (cat.description !== undefined) payload.description = cat.description.trim();
  if (cat.imageUrl !== undefined) payload.imageUrl = cat.imageUrl;
  if (cat.imageZoom !== undefined) payload.imageZoom = Math.max(-50, Math.min(50, Number(cat.imageZoom) || 0));
  if (typeof orderIndex === 'number') payload.orderIndex = orderIndex;

  // Update local cache immediately
  const localList = getLocalCachedCategories();
  const existingIdx = localList.findIndex((c) => c.id === id);
  const updatedItem: Category = {
    ...(localList[existingIdx] || {}),
    ...cat,
    id,
    name: cat.name || localList[existingIdx]?.name || 'Categoria',
    orderIndex: typeof orderIndex === 'number' ? orderIndex : localList[existingIdx]?.orderIndex ?? localList.length,
  };
  if (existingIdx >= 0) {
    localList[existingIdx] = updatedItem;
  } else {
    localList.push(updatedItem);
  }
  saveLocalCachedCategories(localList);

  try {
    await setDoc(doc(db, 'categories', id), payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategoryFromCloud(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;

  const localList = getLocalCachedCategories().filter((c) => c.id !== categoryId);
  saveLocalCachedCategories(localList);

  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Settings Mutation
export async function saveSettingsToCloud(settings: StoreSettings): Promise<{ missingColumns?: string[] } | void> {
  saveLocalCachedSettings(settings);

  const path = 'settings/store';
  const payload: Record<string, any> = {
    storeName: (settings.storeName || '').trim(),
    whatsappNumber: settings.whatsappNumber.trim(),
    subtitle: (settings.subtitle || '').trim(),
    logoUrl: (settings.logoUrl || '').trim(),
    logoZoom: typeof settings.logoZoom === 'number' ? Math.max(-50, Math.min(50, settings.logoZoom)) : 0,
    pixKey: (settings.pixKey || '').trim(),
    minOrderValue: Number(settings.minOrderValue) || 0,
    deliveryNotice: (settings.deliveryNotice || '').trim(),
    hideCatalogDescription: Boolean(settings.hideCatalogDescription),
    hideCatalogPrice: Boolean(settings.hideCatalogPrice),
    showCategoryImages: Boolean(settings.showCategoryImages),
    adminPassword: (settings.adminPassword || 'abc1234').trim(),
  };

  try {
    await setDoc(doc(db, 'settings', 'store'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Wipe all data from Cloud (reset catalog)
export async function wipeAllDataFromCloud(): Promise<void> {
  try {
    const [catsSnap, prodsSnap] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'products')),
    ]);

    const batch = writeBatch(db);
    catsSnap.forEach((d) => batch.delete(d.ref));
    prodsSnap.forEach((d) => batch.delete(d.ref));

    // Reset settings document to clean state
    const cleanSettings: StoreSettings = {
      storeName: 'Office Embalagens',
      subtitle: '',
      logoUrl: '',
      logoZoom: 0,
      whatsappNumber: '5511999998888',
      pixKey: '',
      minOrderValue: 0,
      deliveryNotice: '',
      hideCatalogDescription: true,
      hideCatalogPrice: true,
      showCategoryImages: false,
      adminPassword: 'admin',
    };
    batch.set(doc(db, 'settings', 'store'), cleanSettings);

    await batch.commit();

    // Clear local cached storage
    localStorage.removeItem(CATEGORIES_CACHE_KEY);
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    localStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'wipe');
  }
}
