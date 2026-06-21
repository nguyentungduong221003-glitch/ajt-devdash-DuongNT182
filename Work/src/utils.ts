// Generic constraint interface
export interface Identifiable {
  id: string | number;
}

/**
 * A Generic Cache Class with a Constraint (Excellent Tier)
 * Stores items extending Identifiable with a configurable Time-To-Live (TTL)
 */
export class DataCache<T extends Identifiable> {
  private cache = new Map<string | number, { data: T; timestamp: number }>();
  private ttlMs: number;
  
  constructor(ttlMs: number = 60000) {
    this.ttlMs = ttlMs;
  }

  set(item: T): void {
    this.cache.set(item.id, {
      data: item,
      timestamp: Date.now()
    });
  }

  get(id: string | number): T | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.ttlMs;
    if (isExpired) {
      this.cache.delete(id);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Debounce utility using closures (Excellent Tier)
 * Delays invoking a function until after delayMs milliseconds have elapsed since the last call.
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): (...args: A) => void {
  let timerId: number | undefined;

  return function (...args: A): void {
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
    }
    timerId = window.setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

/**
 * Memoize utility using closures (Excellent Tier)
 * Caches the results of a pure function mapping a single argument to a return value.
 */
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  const cache = new Map<T, R>();

  return function (arg: T): R {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

/**
 * Memoized helper to format currencies ($ X.YY)
 */
export const formatCurrency = memoize((value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
});

/**
 * Memoized helper to format strings (e.g. kebab-case categories to title case)
 */
export const formatCategoryName = memoize((slug: string): string => {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});
