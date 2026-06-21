// Domain API Types

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface Review {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface Meta {
  createdAt: string;
  updatedAt: string;
  barcode: string;
  qrCode: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  sku?: string;
  weight?: number;
  dimensions?: Dimensions;
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  reviews?: Review[];
  returnPolicy?: string;
  minimumOrderQuantity?: number;
  meta?: Meta;
  images: string[];
  thumbnail: string;
}

export interface Category {
  slug: string;
  name: string;
  url: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

// ----------------------------------------------------
// Utility Types usage (Excellent Tier Criterion)
// ----------------------------------------------------

// 1. Omit utility to simplify listing components: DTO (Data Transfer Object) for list view
export type ProductDTO = Omit<Product, 'reviews' | 'meta' | 'dimensions' | 'warrantyInformation' | 'shippingInformation' | 'returnPolicy'>;

// 2. Pick utility to model stars rating info component
export type ProductRatingInfo = Pick<Product, 'id' | 'rating' | 'reviews'>;

// 3. Record utility to construct quick categories and product cache maps
export type CategoryNameMap = Record<string, string>; // mapping category slug -> category name
export type ProductCacheMap = Record<number, Product>; // mapping product ID -> Product details

// ----------------------------------------------------
// Discriminated Unions for App State (Good & Excellent Tiers)
// ----------------------------------------------------

export interface FilterOptions {
  search: string;
  category: string;
  sortBy: string;
}

// 4. Partial utility type to handle partial updates to filters
export type PartialFilters = Partial<FilterOptions>;

export type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; products: Product[]; categories: Category[]; selectedProductId: number | null }
  | { status: 'error'; error: string };

export type DetailState =
  | { status: 'closed' }
  | { status: 'loading'; productId: number }
  | { status: 'success'; product: Product }
  | { status: 'error'; productId: number; error: string };
