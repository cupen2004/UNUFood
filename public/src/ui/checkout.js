// UNUFood - Checkout UI Module
// Payment modal with QRIS and E-Wallet support

import { formatRp } from '../utils/formatters.js';
import { actions } from '../store/actions.js';
import { uiComponents } from './components.js';

export class CheckoutUI {
  constructor() {
    this.isOpen = false;
    this.selectedMethod = 'qris';
    this.init();
  }

  init() {
    // Close button
    document.getElementById('btn-close-checkout')?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('checkout-backdrop')?.addEventListener('click', () => {
      this.close();
    });

    // Payment method selection
    document.querySelectorAll('input[name="pay-method"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedMethod = e.target.value;
        this.updatePaymentDisplay();
      });
    });

    // Payment confirmation
    document.getElementById('btn-simulate-payment')?.addEventListener('click', () => {
      this.processPayment();
    });
  }

  open() {
    const state = window.app?.state;

    // Validate cart is not empty before opening checkout
    if (!state || state.cart.length === 0) {
      alert('Keranjang masih kosong! Tidak dapat melakukan checkout.');
      return;
    }

    const modal = document.getElementById('checkout-modal');
    if (modal) {
      this.isOpen = true;
      this.selectedMethod = 'qris';
      this.renderSummary();
      this.updatePaymentDisplay();
      modal.classList.remove('hidden');
    }
  }

  close() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      this.isOpen = false;
      modal.classList.add('hidden');
    }
  }

  renderSummary() {
    const container = document.getElementById('checkout-order-summary');
    if (!container) return;

    const state = window.app.state;
    if (!state) return;

    let subtotal = 0;
    let itemsHtml = '';

    state.cart.forEach(item => {
      const menu = state.menus.find(m => m.id === item.menuId);
      if (menu) {
        const itemTotal = menu.price * item.qty;
        subtotal += itemTotal;
        itemsHtml += `
          <div class="flex justify-between items-center text-xs py-1 border-b border-stone-100">
            <div>
              <span class="font-medium text-stone-900">${menu.name}</span>
              <span class="text-xs text-stone-500 font-mono ml-1">×${item.qty}</span>
              ${item.notes ? `<p class="text-[10px] text-stone-500 italic mt-0.5">Catatan: "${item.notes}"</p>` : ''}
            </div>
            <span class="font-mono font-medium text-stone-800">${formatRp(itemTotal)}</span>
          </div>
        `;
      }
    });

    const dropoff = state.dropoffLocations.find(l => l.id === state.selectedDropoffId) || state.dropoffLocations[0];
    const total = subtotal + 1000;

    container.innerHTML = `
      <div class="space-y-1.5 mb-3">
        ${itemsHtml}
      </div>
      <div class="bg-stone-50 p-2.5 rounded border border-stone-200 text-xs text-stone-700 space-y-1 mb-3">
        <div class="flex justify-between">
          <span class="text-stone-500">Titik Drop-Off:</span>
          <span class="font-semibold text-stone-900 text-right">${dropoff.name}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-stone-500">Lokasi:</span>
          <span class="font-medium text-stone-800 text-right">${dropoff.point}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-stone-500">Estimasi Tiba:</span>
          <span class="font-mono text-stone-900 font-bold">${state.deliveryTargetTime}</span>
        </div>
      </div>
      <div class="border-t border-stone-200 pt-2 space-y-1 text-xs">
        <div class="flex justify-between text-stone-600">
          <span>Subtotal:</span>
          <span class="font-mono">${formatRp(subtotal)}</span>
        </div>
        <div class="flex justify-between text-stone-600">
          <span>Biaya Layanan:</span>
          <span class="font-mono">${formatRp(1000)}</span>
        </div>
        <div class="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-dashed border-stone-300">
          <span>Total:</span>
          <span class="font-mono text-[#D94E34]">${formatRp(total)}</span>
        </div>
      </div>
    `;
  }

  updatePaymentDisplay() {
    const displayContainer = document.getElementById('checkout-payment-display');
    if (!displayContainer) return;

    if (this.selectedMethod === 'gopay') {
      const state = window.app.state;
      const phone = state?.currentUser?.phone || '0812-3456-7890';

      displayContainer.innerHTML = `
        <div class="space-y-3">
          <div class="text-[11px] font-mono text-stone-500 uppercase tracking-widest">E-Wallet Direct</div>
          <div class="p-3 bg-white border border-stone-300 rounded-lg max-w-xs mx-auto text-left shadow-2xs">
            <div class="flex items-center space-x-2 pb-2 border-b border-stone-200">
              <span class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">G</span>
              <span class="text-xs font-bold text-stone-900">GoPay / ShopeePay</span>
            </div>
            <div class="mt-2 text-[11px] text-stone-600 space-y-1">
              <p>Merchant: <strong>UNUFood Kampus</strong></p>
              <p>No. HP: <span class="font-mono font-bold text-stone-800">${phone}</span></p>
              <p class="text-emerald-700 font-semibold">✓ Otomatis terhubung</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // QRIS Display
      displayContainer.innerHTML = `
        <div class="text-[11px] font-mono text-stone-500 uppercase tracking-widest mb-1.5">NMID: ID1020261928019</div>
        <div class="w-44 h-44 mx-auto bg-white p-3 rounded border border-stone-300 flex items-center justify-center shadow-xs">
          <svg class="w-full h-full text-stone-900" viewBox="0 0 100 100" fill="currentColor">
            <path d="M0,0 h30 v30 h-30 z M5,5 h20 v20 h-20 z M10,10 h10 v10 h-10 z"/>
            <path d="M70,0 h30 v30 h-30 z M75,5 h20 v20 h-20 z M80,10 h10 v10 h-10 z"/>
            <path d="M0,70 h30 v30 h-30 z M5,75 h20 v20 h-20 z M10,80 h10 v10 h-10 z"/>
            <rect x="35" y="5" width="5" height="15"/>
            <rect x="45" y="10" width="15" height="5"/>
            <rect x="35" y="25" width="25" height="5"/>
            <rect x="5" y="35" width="20" height="5"/>
            <rect x="15" y="45" width="10" height="10"/>
            <rect x="35" y="35" width="30" height="30"/>
            <rect x="75" y="35" width="20" height="10"/>
            <rect x="70" y="50" width="10" height="15"/>
            <rect x="85" y="55" width="10" height="5"/>
            <rect x="35" y="70" width="10" height="25"/>
            <rect x="50" y="75" width="20" height="5"/>
            <rect x="55" y="85" width="15" height="10"/>
            <rect x="75" y="75" width="20" height="20"/>
          </svg>
        </div>
        <div class="text-xs text-stone-600 mt-2 font-medium">Scan QRIS menggunakan BCA, Mandiri, BRI, GoPay, OVO, atau ShopeePay</div>
      `;
    }
  }

  async processPayment() {
    const payBtn = document.getElementById('btn-simulate-payment');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Memverifikasi Pembayaran...
      `;
    }

    setTimeout(async () => {
      try {
        const newOrder = await actions.processCheckout(this.selectedMethod);

        if (payBtn) {
          payBtn.disabled = false;
          payBtn.innerHTML = `
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Saya Sudah Membayar (Cek Otomatis)</span>
          `;
        }

        this.close();
        uiComponents.showToast(`Pembayaran berhasil! Kode Tiket: ${newOrder.pickupCode}`);

        // Scroll to ticket
        setTimeout(() => {
          const ticketEl = document.getElementById('active-ticket-section');
          if (ticketEl) {
            ticketEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      } catch (error) {
        console.error('Checkout error:', error);
        uiComponents.showToast('Gagal memproses pembayaran. Coba lagi.');

        if (payBtn) {
          payBtn.disabled = false;
          payBtn.innerHTML = `<span>Saya Sudah Membayar (Cek Otomatis)</span>`;
        }
      }
    }, 1500);
  }
}

export const checkoutUI = new CheckoutUI();
