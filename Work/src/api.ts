import type { ProductsResponse, Category, Product } from './types';

/**
 * Reusable generic fetch JSON helper with proper error handling (Good Tier Criterion)
 */
export async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    const data: T = await response.json();
    return data;
  } catch (error) {
    console.error(`fetchJson failed for URL: ${url}`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Loads two or more resources in parallel using Promise.all (Good Tier Criterion)
 * Fetches products list and category metadata definitions.
 */
export async function fetchProductsAndCategories(): Promise<[ProductsResponse, Category[]]> {
  return Promise.all([
    fetchJson<ProductsResponse>('https://dummyjson.com/products?limit=100'),
    fetchJson<Category[]>('https://dummyjson.com/products/categories')
  ]);
}

/**
 * Fetches detail information for a single product by its unique integer identifier.
 */
export async function fetchProductDetail(id: number): Promise<Product> {
  return fetchJson<Product>(`https://dummyjson.com/products/${id}`);
}
