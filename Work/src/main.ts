import { render, renderDetailModal } from './ui';
import { subscribe, getState, getDetailState, initApp } from './state';

// Register global render subscribers
subscribe(() => {
  const appState = getState();
  render(appState);
});

subscribe(() => {
  const detailState = getDetailState();
  renderDetailModal(detailState);
});

// Bootstrap application on document ready
window.addEventListener('DOMContentLoaded', () => {
  // Trigger initial parallel data loading
  initApp();
});
