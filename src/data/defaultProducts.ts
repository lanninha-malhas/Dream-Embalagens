import { Product, StoreSettings, Category } from '../types.ts';

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: '',
  subtitle: '',
  logoUrl: '',
  logoZoom: 0,
  logoPosition: 'center',
  whatsappNumber: '',
  pixKey: '',
  minOrderValue: 0,
  deliveryNotice: '',
  hideCatalogDescription: false,
  hideCatalogPrice: false,
  showCategoryImages: false,
  adminPassword: 'admin',
};
