// UNUFood - Cart UI Module
// Shopping cart drawer with full functionality

import { formatRp } from '../utils/formatters.js';
import { actions } from '../store/actions.js';

export class CartUI {
  constructor() {
    this.isOpen = false;
    this.init();
  }

  init() {
    // Cart buttons
    document.getElementById('btn-open-cart')?.addEventListener('click', () => {
      this.open();
    });

    document.getElementById('btn-close-cart')?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('cart-backdrop')?.addEventListener('click', () => {
      this.close();
    });

    // Checkout button
    document.getElementById('btn-checkout-now')?.addEventListener('click', () => {
      this.proceedToCheckout();
    });
  }

  open() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');

    if (drawer && backdrop) {
      this.isOpen = true;
      backdrop.classList.remove('hidden');
      setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        drawer.classList.remove('translate-x-full');
      }, 10);
    }
  }

  close() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');

    if (drawer && backdrop) {
      this.isOpen = false;
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('opacity-0');
      setTimeout(() => {
        backdrop.classList.add('hidden');
      }, 300);
    }
  }

  proceedToCheckout() {
    // Validate cart is not empty
    const state = window.app?.state;
    if (!state || state.cart.length === 0) {
      alert('Keranjang masih kosong! Tambahkan menu terlebih dahulu.');
      return;
    }

    // Will be handled by checkout modal
    if (window.checkoutUI) {
      this.close();
      window.checkoutUI.open();
    }
  }

  render(state) {
    this.renderContent(state);
    this.updateBadge(state);
  }

  renderContent(state) {
    const itemsContainer = document.getElementById('cart-items-container');
    const emptyState = document.getElementById('cart-empty-state');
    const footer = document.getElementById('cart-footer-details');
    const checkoutBtn = document.getElementById('btn-checkout-now');

    if (!itemsContainer || !footer) return;

    if (state.cart.length === 0) {
      emptyState?.classList.remove('hidden');
      itemsContainer.innerHTML = '';
      footer.classList.add('hidden');

      // Disable checkout button when cart is empty
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      return;
    }

    emptyState?.classList.add('hidden');
    footer.classList.remove('hidden');

    // Enable checkout button when cart has items
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    let subtotal = 0;
    let listHtml = '';

    state.cart.forEach(item => {
      const menu = state.menus.find(m => m.id === item.menuId);
      if (menu) {
        const itemTotal = menu.price * item.qty;
        subtotal += itemTotal;
        listHtml += `
          <div class="bg-stone-50 border border-stone-200 rounded p-3 relative">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-xs font-bold text-stone-900">${menu.name}</h4>
                <p class="text-[11px] text-stone-500 font-mono">${formatRp(menu.price)} / porsi</p>
                <span class="inline-block text-[10px] text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200 mt-1">
                  ${menu.partnerName}
                </span>
              </div>
              <button onclick="window.removeCartItem('${menu.id}')" class="text-stone-400 hover:text-red-500 p-1" title="Hapus">
                ✕
              </button>
            </div>

            <!-- Notes input -->
            <div class="mt-2">
              <input type="text"
                placeholder="Catatan (e.g. sambal pisah, tanpa kemangi)..."
                value="${item.notes || ''}"
                onchange="window.updateCartItemNote('${menu.id}', this.value)"
                class="w-full px-2 py-1 bg-white border border-stone-300 rounded text-[11px] text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#163828]" />
            </div>

            <div class="flex justify-between items-center mt-3 pt-2 border-t border-stone-200">
              <div class="flex items-center space-x-2">
                <button onclick="window.updateCart('${menu.id}', -1)" class="w-6 h-6 rounded bg-white border border-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center hover:bg-stone-100 font-mono">
                  -
                </button>
                <span class="text-xs font-mono font-bold text-stone-900 px-1">${item.qty}</span>
                <button onclick="window.updateCart('${menu.id}', 1)" class="w-6 h-6 rounded bg-white border border-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center hover:bg-stone-100 font-mono">
                  +
                </button>
              </div>
              <span class="font-mono font-bold text-xs text-stone-900">${formatRp(itemTotal)}</span>
            </div>
          </div>
        `;
      }
    });

    itemsContainer.innerHTML = listHtml;

    // Render Drop-off Options
    const dropoffSelect = document.getElementById('cart-select-dropoff');
    if (dropoffSelect) {
      let optionsHtml = '';
      state.dropoffLocations.forEach(loc => {
        optionsHtml += `
          <option value="${loc.id}" ${state.selectedDropoffId === loc.id ? 'selected' : ''}>
            ${loc.icon} ${loc.name} (${loc.point})
          </option>
        `;
      });
      dropoffSelect.innerHTML = optionsHtml;
      dropoffSelect.onchange = (e) => {
        actions.setSelectedDropoff(e.target.value);
      };
    }

    // Bill Breakdown
    const subtotalEl = document.getElementById('cart-subtotal');
    const feeEl = document.getElementById('cart-service-fee');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.textContent = formatRp(subtotal);
    if (feeEl) feeEl.textContent = formatRp(1000);
    if (totalEl) totalEl.textContent = formatRp(subtotal + 1000);
  }

  updateBadge(state) {
    const badge = document.getElementById('cart-badge-count');
    if (!badge) return;

    const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
    badge.textContent = totalItems;

    if (totalItems > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

export const cartUI = new CartUI();
