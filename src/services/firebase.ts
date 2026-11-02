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

// Purge all legacy localStorage keys to ensure clean state with no residue
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
    });
    // Also remove any remaining items containing "kraft_" or "molekada"
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.includes('kraft') || k.includes('molekada') || k.includes('embalagens'))) {
        localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.error('Error clearing local residual storage:', err);
  }
}

// Real-time listener for Categories
export function subscribeCategories(
  callback: (categories: Category[]) => void,
  onError?: (error: Error) => void
): () => void {
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
        } as Category & { orderIndex?: number });
      });

      // Sort by orderIndex or name
      list.sort((a: any, b: any) => {
        if (typeof a.orderIndex === 'number' && typeof b.orderIndex === 'number') {
          return a.orderIndex - b.orderIndex;
        }
        return a.name.localeCompare(b.name);
      });

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
  const collPath = 'products';
  return onSnapshot(
    collection(db, collPath),
    (snapshot) => {
      const list: (Product & { orderIndex?: number })[] = [];
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
          orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
        });
      });

      // Sort by orderIndex
      list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

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
  const docPath = 'settings/store';
  return onSnapshot(
    doc(db, 'settings', 'store'),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          storeName: data.storeName || INITIAL_SETTINGS.storeName,
          subtitle: data.subtitle || INITIAL_SETTINGS.subtitle,
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
        });
      } else {
        // If settings doc doesn't exist yet, save clean default settings
        setDoc(doc(db, 'settings', 'store'), {
          ...INITIAL_SETTINGS,
        }).catch((err) => handleFirestoreError(err, OperationType.WRITE, docPath));
        callback(INITIAL_SETTINGS);
      }
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  );
}

// Check and seed clean initial cloud database if empty
export async function initializeCloudDatabase(): Promise<void> {
  const catCollPath = 'categories';
  const prodCollPath = 'products';
  const setDocPath = 'settings/store';

  try {
    const [catSnap, prodSnap, setSnap] = await Promise.all([
      getDocs(collection(db, catCollPath)),
      getDocs(collection(db, prodCollPath)),
      getDoc(doc(db, 'settings', 'store')),
    ]);

    const batch = writeBatch(db);
    let hasWrites = false;

    // Seed categories if empty
    if (catSnap.empty) {
      INITIAL_CATEGORIES.forEach((cat, index) => {
        const catRef = doc(db, 'categories', cat.id);
        batch.set(catRef, {
          name: cat.name,
          orderIndex: index,
          ...(cat.description ? { description: cat.description } : {}),
        });
      });
      hasWrites = true;
    }

    // Seed products if empty
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
        adminPassword: INITIAL_SETTINGS.adminPassword || 'abc1234',
      });
      hasWrites = true;
    }

    if (hasWrites) {
      await batch.commit();
      console.log('Firebase Cloud database seeded cleanly with initial catalog.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bootstrap');
  }
}

// Product Mutations
export async function saveProductToCloud(product: Omit<Product, 'id'> & { id?: string }, orderIndex?: number): Promise<string> {
  const id = product.id || `kft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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

  try {
    await setDoc(doc(db, 'products', id), payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductFromCloud(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function reorderProductsInCloud(products: Product[]): Promise<void> {
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
  const id = cat.id || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const path = `categories/${id}`;

  const payload: Record<string, any> = {};
  if (cat.name !== undefined) payload.name = cat.name.trim();
  if (cat.description !== undefined) payload.description = cat.description.trim();
  if (cat.imageUrl !== undefined) payload.imageUrl = cat.imageUrl;
  if (cat.imageZoom !== undefined) payload.imageZoom = Math.max(-50, Math.min(50, Number(cat.imageZoom) || 0));
  if (typeof orderIndex === 'number') payload.orderIndex = orderIndex;

  try {
    await setDoc(doc(db, 'categories', id), payload, { merge: true });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategoryFromCloud(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Settings Mutation
export async function saveSettingsToCloud(settings: StoreSettings): Promise<void> {
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
    adminPassword: (settings.adminPassword || 'admin').trim(),
  };

  try {
    await setDoc(doc(db, 'settings', 'store'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
