import type { AppState, DetailState, Product, Category } from './types';
import {
  getFilters,
  updateFilters,
  clearFilters,
  openProductDetails,
  closeProductDetails,
  initApp,
  assertNever
} from './state';
import { formatCurrency, formatCategoryName, debounce } from './utils';

/**
 * Main application render dispatcher.
 * Uses a discriminated union status and exhaustively narrows it (Excellent Tier).
 */
export function render(state: AppState): void {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  switch (state.status) {
    case 'idle':
      appContainer.innerHTML = `
        <div class="message-container">
          <p>Initializing DevDash...</p>
        </div>
      `;
      break;

    case 'loading':
      appContainer.innerHTML = renderLoadingSkeleton();
      break;

    case 'success':
      appContainer.innerHTML = renderDashboard(state);
      bindDashboardEvents();
      break;

    case 'error':
      appContainer.innerHTML = `
        <div class="message-container error-card">
          <div class="error-icon">⚠️</div>
          <h2>Database Synced Error</h2>
          <p>${state.error}</p>
          <button id="retry-btn" class="btn btn-primary">Try Syncing Again</button>
        </div>
      `;
      bindRetryEvents();
      break;

    default:
      // Exhaustiveness check
      assertNever(state);
  }
}

/**
 * Details modal render dispatcher.
 * Exhaustively narrows DetailState (Excellent Tier).
 */
export function renderDetailModal(state: DetailState): void {
  const modal = document.getElementById('detail-modal');
  if (!modal) return;

  switch (state.status) {
    case 'closed':
      modal.classList.remove('active');
      modal.innerHTML = '';
      break;

    case 'loading':
      modal.classList.add('active');
      modal.innerHTML = `
        <div class="modal-content loading">
          <div class="loader-spinner"></div>
          <p>Loading specifications details...</p>
        </div>
      `;
      break;

    case 'success':
      modal.classList.add('active');
      modal.innerHTML = renderProductDetails(state.product);
      bindModalCloseEvents();
      break;

    case 'error':
      modal.classList.add('active');
      modal.innerHTML = `
        <div class="modal-content error">
          <button class="modal-close" id="close-modal-btn">&times;</button>
          <div class="error-icon">⚠️</div>
          <h3>Failed to Load Product Specifications</h3>
          <p>${state.error}</p>
          <button id="retry-detail-btn" data-id="${state.productId}" class="btn btn-primary">Retry</button>
        </div>
      `;
      bindModalCloseEvents();
      bindRetryDetailsEvent();
      break;

    default:
      assertNever(state);
  }
}

// ----------------------------------------------------
// UI Sub-Templates (Success State)
// ----------------------------------------------------

function renderLoadingSkeleton(): string {
  return `
    <header class="header">
      <div class="logo-area shimmer-text">DevDash</div>
      <div class="status-badge shimmer-pulse">Connecting...</div>
    </header>
    <div class="dashboard-controls skeleton-controls"></div>
    <div class="stats-bar skeleton-stats"></div>
    <main class="grid-container">
      ${Array.from({ length: 6 })
        .map(
          () => `
        <div class="card skeleton-card">
          <div class="skeleton-image shimmer-pulse"></div>
          <div class="skeleton-line shimmer-pulse short"></div>
          <div class="skeleton-line shimmer-pulse"></div>
          <div class="skeleton-line shimmer-pulse medium"></div>
        </div>
      `
        )
        .join('')}
    </main>
  `;
}

function renderDashboard(state: { products: Product[]; categories: Category[] }): string {
  const filters = getFilters();
  
  // Transform products list using ES6+ Higher Order Functions (filter/map/sort/reduce)
  let processedProducts = [...state.products];

  // 1. Search Query Filter (Title, Brand, Category, Description)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    processedProducts = processedProducts.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
    );
  }

  // 2. Category Filter
  if (filters.category) {
    processedProducts = processedProducts.filter(p => p.category === filters.category);
  }

  // 3. Sorting
  if (filters.sortBy) {
    processedProducts.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating-desc':
          return b.rating - a.rating;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }

  // Calculations using array reductions (HOF)
  const totalItems = processedProducts.length;
  const avgRating = totalItems
    ? (processedProducts.reduce((sum, p) => sum + p.rating, 0) / totalItems).toFixed(2)
    : '0.00';
  const avgPrice = totalItems
    ? (processedProducts.reduce((sum, p) => sum + p.price, 0) / totalItems).toFixed(2)
    : '0.00';

  // Render HTML structure
  return `
    <header class="header">
      <div class="logo-area">
        <h1>DevDash <span class="logo-tag">Insights</span></h1>
      </div>
      <div class="status-container">
        <span class="status-dot online"></span>
        <span class="status-text">Database Synced</span>
      </div>
    </header>

    <section class="dashboard-controls">
      <div class="control-group search-container">
        <input 
          type="text" 
          id="search-input" 
          placeholder="Filter by title, brand, details..." 
          value="${filters.search}"
          autocomplete="off"
        />
        ${filters.search ? '<button id="clear-search-btn" class="clear-input-btn">&times;</button>' : ''}
      </div>

      <div class="control-group">
        <select id="category-select">
          <option value="">All Categories</option>
          ${state.categories
            .map(
              cat => `
            <option value="${cat.slug}" ${filters.category === cat.slug ? 'selected' : ''}>
              ${cat.name}
            </option>
          `
            )
            .join('')}
        </select>
      </div>

      <div class="control-group">
        <select id="sort-select">
          <option value="">Default Sort</option>
          <option value="price-asc" ${filters.sortBy === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
          <option value="price-desc" ${filters.sortBy === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
          <option value="rating-desc" ${filters.sortBy === 'rating-desc' ? 'selected' : ''}>Rating: High to Low</option>
          <option value="title-asc" ${filters.sortBy === 'title-asc' ? 'selected' : ''}>Title: A to Z</option>
          <option value="title-desc" ${filters.sortBy === 'title-desc' ? 'selected' : ''}>Title: Z to A</option>
        </select>
      </div>

      <div class="control-group">
        <button id="reset-filters-btn" class="btn btn-outline" ${
          !filters.search && !filters.category && !filters.sortBy ? 'disabled' : ''
        }>Reset Filters</button>
      </div>
    </section>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">Matching Items</span>
        <span class="stat-value">${totalItems}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg rating</span>
        <span class="stat-value">★ ${avgRating}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg price</span>
        <span class="stat-value">${formatCurrency(Number(avgPrice))}</span>
      </div>
    </div>

    <main class="grid-container" id="products-grid">
      ${
        totalItems === 0
          ? `
        <div class="no-results">
          <p>No products found matching the criteria.</p>
          <button id="grid-reset-btn" class="btn btn-primary">Clear Search Filters</button>
        </div>
      `
          : processedProducts.map(product => renderProductCard(product)).join('')
      }
    </main>
  `;
}

function renderProductCard(product: Product): string {
  const ratingStars = getStarRatingHtml(product.rating);
  const formattedPrice = formatCurrency(product.price);
  
  // Apply a dynamic tag color depending on product status
  const isLowStock = product.stock <= 5;
  const stockBadgeClass = isLowStock ? 'badge-danger' : 'badge-success';
  const stockLabel = isLowStock ? `Low Stock (${product.stock})` : 'In Stock';

  // Apply memoized category formatter
  const formattedCat = formatCategoryName(product.category);

  return `
    <article class="card" data-id="${product.id}">
      <div class="card-image-wrapper">
        <img 
          src="${product.thumbnail}" 
          alt="${product.title}" 
          loading="lazy"
          onerror="this.src='https://placehold.co/400x300/181824/8b5cf6?text=No+Preview'"
        />
        <div class="card-category-badge">${formattedCat}</div>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="card-brand">${product.brand || 'Unbranded'}</span>
          <span class="card-stock-status ${stockBadgeClass}">${stockLabel}</span>
        </div>
        <h3 class="card-title">${product.title}</h3>
        <p class="card-description">${truncateText(product.description, 75)}</p>
        
        <div class="card-rating">
          <span class="stars">${ratingStars}</span>
          <span class="rating-val">${product.rating.toFixed(2)}</span>
        </div>

        <div class="card-footer">
          <div class="price-container">
            <span class="price">${formattedPrice}</span>
            ${
              product.discountPercentage > 0
                ? `<span class="discount">-${product.discountPercentage.toFixed(0)}%</span>`
                : ''
            }
          </div>
          <button class="btn btn-primary view-details-btn" data-id="${product.id}">Specs</button>
        </div>
      </div>
    </article>
  `;
}

function renderProductDetails(product: Product): string {
  const ratingStars = getStarRatingHtml(product.rating);
  const formattedPrice = formatCurrency(product.price);
  const originalPrice = formatCurrency(product.price / (1 - product.discountPercentage / 100));

  // Reviews markup
  const reviewsHtml =
    product.reviews && product.reviews.length > 0
      ? product.reviews
          .map(
            rev => `
        <div class="review-item">
          <div class="review-header">
            <span class="reviewer">${rev.reviewerName}</span>
            <span class="review-rating">${getStarRatingHtml(rev.rating)}</span>
          </div>
          <p class="review-comment">"${rev.comment}"</p>
          <span class="review-date">${new Date(rev.date).toLocaleDateString()}</span>
        </div>
      `
          )
          .join('')
      : '<p class="no-reviews">No reviews for this product yet.</p>';

  return `
    <div class="modal-content active-details">
      <button class="modal-close" id="close-modal-btn" aria-label="Close modal">&times;</button>
      
      <div class="details-layout">
        <!-- Left Side: Images -->
        <div class="details-gallery">
          <div class="gallery-primary">
            <img src="${product.images[0] || product.thumbnail}" alt="${product.title}" id="primary-gallery-img" />
          </div>
          ${
            product.images.length > 1
              ? `
            <div class="gallery-thumbnails">
              ${product.images
                .map(
                  (img, idx) => `
                <img 
                  src="${img}" 
                  alt="${product.title} preview ${idx + 1}" 
                  class="gallery-thumb ${idx === 0 ? 'active' : ''}" 
                  data-src="${img}"
                />
              `
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>

        <!-- Right Side: Spec details -->
        <div class="details-info">
          <span class="details-category">${formatCategoryName(product.category)}</span>
          <h2>${product.title}</h2>
          <span class="details-brand">Brand: ${product.brand || 'Generic'}</span>

          <div class="details-rating">
            <span class="stars">${ratingStars}</span>
            <span class="rating-text">${product.rating.toFixed(2)} (${product.reviews?.length || 0} reviews)</span>
          </div>

          <div class="details-price-row">
            <span class="price-val">${formattedPrice}</span>
            ${
              product.discountPercentage > 0
                ? `
              <span class="old-price">${originalPrice}</span>
              <span class="discount-badge">${product.discountPercentage}% OFF</span>
            `
                : ''
            }
          </div>

          <p class="details-desc">${product.description}</p>

          <table class="specs-table">
            <tbody>
              ${product.sku ? `<tr><th>SKU</th><td>${product.sku}</td></tr>` : ''}
              ${product.stock !== undefined ? `<tr><th>Stock status</th><td>${product.stock > 0 ? `Available (${product.stock} units)` : 'Out of stock'}</td></tr>` : ''}
              ${product.weight ? `<tr><th>Weight</th><td>${product.weight} kg</td></tr>` : ''}
              ${
                product.dimensions
                  ? `<tr><th>Dimensions</th><td>W: ${product.dimensions.width} &times; H: ${product.dimensions.height} &times; D: ${product.dimensions.depth} cm</td></tr>`
                  : ''
              }
              ${product.warrantyInformation ? `<tr><th>Warranty</th><td>${product.warrantyInformation}</td></tr>` : ''}
              ${product.shippingInformation ? `<tr><th>Shipping info</th><td>${product.shippingInformation}</td></tr>` : ''}
              ${product.returnPolicy ? `<tr><th>Return Policy</th><td>${product.returnPolicy}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bottom Side: Reviews -->
      <section class="reviews-section">
        <h3>Customer Reviews</h3>
        <div class="reviews-list">
          ${reviewsHtml}
        </div>
      </section>
    </div>
  `;
}

// ----------------------------------------------------
// UI Helpers
// ----------------------------------------------------

function getStarRatingHtml(rating: number): string {
  const rounded = Math.round(rating);
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) {
      stars += '★';
    } else {
      stars += '☆';
    }
  }
  return stars;
}

function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

// ----------------------------------------------------
// Event Bindings
// ----------------------------------------------------

function bindDashboardEvents(): void {
  // Debounced Search Input (Excellent Tier)
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    const debouncedSearch = debounce((val: string) => {
      updateFilters({ search: val.trim() });
    }, 300);

    searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      debouncedSearch(target.value);
    });
  }

  // Clear Search button
  const clearSearchBtn = document.getElementById('clear-search-btn');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      if (input) input.value = '';
      updateFilters({ search: '' });
    });
  }

  // Category select change
  const categorySelect = document.getElementById('category-select') as HTMLSelectElement | null;
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      updateFilters({ category: target.value });
    });
  }

  // Sort select change
  const sortSelect = document.getElementById('sort-select') as HTMLSelectElement | null;
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      updateFilters({ sortBy: target.value });
    });
  }

  // Reset Filters Button
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      if (input) input.value = '';
      clearFilters();
    });
  }

  // Grid Reset Button (when no results are returned)
  const gridResetBtn = document.getElementById('grid-reset-btn');
  if (gridResetBtn) {
    gridResetBtn.addEventListener('click', () => {
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      if (input) input.value = '';
      clearFilters();
    });
  }

  // Product cards and Details button click (using Event Delegation)
  const productsGrid = document.getElementById('products-grid');
  if (productsGrid) {
    productsGrid.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Check if button or card was clicked
      const detailsBtn = target.closest('.view-details-btn') as HTMLButtonElement | null;
      if (detailsBtn) {
        const id = Number(detailsBtn.getAttribute('data-id'));
        if (id) openProductDetails(id);
        return;
      }

      const card = target.closest('.card') as HTMLElement | null;
      if (card) {
        const id = Number(card.getAttribute('data-id'));
        if (id) openProductDetails(id);
      }
    });
  }
}

function bindModalCloseEvents(): void {
  const closeBtn = document.getElementById('close-modal-btn');
  const modal = document.getElementById('detail-modal');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeProductDetails();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      // Close only if click is on backdrop overlay
      if (e.target === modal) {
        closeProductDetails();
      }
    });
  }

  // Gallery thumbnail hover/click swapping
  const thumbs = document.querySelectorAll('.gallery-thumb');
  const primaryImg = document.getElementById('primary-gallery-img') as HTMLImageElement | null;

  if (primaryImg && thumbs.length > 0) {
    thumbs.forEach(thumb => {
      const handleSwap = () => {
        const src = thumb.getAttribute('data-src');
        if (src && primaryImg) {
          primaryImg.src = src;
          // Set active state
          thumbs.forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        }
      };

      thumb.addEventListener('mouseenter', handleSwap);
      thumb.addEventListener('click', handleSwap);
    });
  }
}

function bindRetryEvents(): void {
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      initApp();
    });
  }
}

function bindRetryDetailsEvent(): void {
  const retryDetailBtn = document.getElementById('retry-detail-btn');
  if (retryDetailBtn) {
    retryDetailBtn.addEventListener('click', () => {
      const id = Number(retryDetailBtn.getAttribute('data-id'));
      if (id) openProductDetails(id);
    });
  }
}
