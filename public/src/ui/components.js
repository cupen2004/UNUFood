// UNUFood - UI Components Module
// Reusable UI rendering functions

import { formatRp, formatSeconds } from '../utils/formatters.js';
import { ORDER_STATUS } from '../config/constants.js';

export class UIComponents {
  constructor() {
    this.toastTimeout = null;
  }

  // Toast Notification
  showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    // Clear existing timeout
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    toastMsg.textContent = message;
    toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    // Auto-hide after 3 seconds
    this.toastTimeout = setTimeout(() => {
      this.hideToast();
    }, 3200);
  }

  hideToast() {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
  }

  // Render Menu Card
  renderMenuCard(menu, state) {
    const inCart = state.cart.find(c => c.menuId === menu.id);
    const inCartQty = inCart ? inCart.qty : 0;
    const effectiveOrdered = menu.orderedCount + inCartQty;
    const remaining = Math.max(0, menu.maxQuota - effectiveOrdered);
    const percentLeft = Math.round((remaining / menu.maxQuota) * 100);
    const isSoldOut = remaining <= 0 || !menu.isAvailable;
    const isUrgent = remaining <= 8 && !isSoldOut;

    let packageItemsHtml = menu.packageItems
      .map(item => `
        <li class="flex items-center text-xs text-stone-700">
          <span class="w-1.5 h-1.5 rounded-full bg-[#163828] mr-2 shrink-0"></span>
          <span>${item}</span>
        </li>
      `).join('');

    return `
      <div class="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden flex flex-col justify-between hover:border-stone-400 transition shadow-xs group">
        <div>
          <!-- Food Image with Overlay Badges -->
          <div class="relative h-48 w-full bg-stone-100 overflow-hidden">
            <img src="${menu.image}" alt="${menu.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
            <div class="absolute top-2.5 left-2.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#163828]/90 text-white backdrop-blur-xs">
                ${menu.partnerName}
              </span>
            </div>
            <div class="absolute top-2.5 right-2.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                isSoldOut ? 'bg-stone-800 text-white' :
                isUrgent ? 'bg-[#D94E34] text-white animate-pulse' :
                'bg-white text-stone-800 shadow-xs'
              }">
                ${isSoldOut ? 'HABIS' : `Sisa ${remaining} Porsi`}
              </span>
            </div>
            <div class="absolute bottom-2.5 left-2.5">
              <span class="inline-flex items-center text-[11px] font-medium text-amber-900 bg-amber-100/95 px-2 py-0.5 rounded backdrop-blur-xs font-mono">
                ★ ${menu.rating} (${menu.reviewCount})
              </span>
            </div>
          </div>

          <!-- Content Body -->
          <div class="p-4 sm:p-5">
            <h3 class="text-base font-bold text-stone-900 leading-snug mb-2">${menu.name}</h3>
            <div class="text-lg font-bold font-mono text-[#D94E34] mb-3">${formatRp(menu.price)}</div>
            <p class="text-xs text-stone-600 line-clamp-2 mb-3 leading-relaxed">${menu.description}</p>

            <!-- Package contents -->
            <div class="bg-[#FAF7F2] p-3 rounded border border-stone-200 mb-4">
              <div class="text-[10px] uppercase font-bold tracking-wider text-stone-500 mb-1.5">Isi Paket:</div>
              <ul class="space-y-1">${packageItemsHtml}</ul>
              ${menu.allergens ? `
                <div class="mt-2 pt-1.5 border-t border-stone-200 text-[10px] text-stone-500 italic">
                  ℹ️ ${menu.allergens}
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Footer: Quota Progress & Add to Cart -->
        <div class="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">
          <!-- Live Quota Progress Bar -->
          <div class="mb-3">
            <div class="flex justify-between items-center text-[11px] font-mono mb-1 text-stone-600">
              <span>Terisi: ${effectiveOrdered}/${menu.maxQuota}</span>
              <span class="${isUrgent ? 'text-[#D94E34] font-bold' : ''}">${isSoldOut ? 'Habis' : `${percentLeft}% Tersedia`}</span>
            </div>
            <div class="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 ${
                isSoldOut ? 'bg-stone-400' :
                isUrgent ? 'bg-[#D94E34]' :
                'bg-[#163828]'
              }" style="width: ${(effectiveOrdered / menu.maxQuota) * 100}%"></div>
            </div>
          </div>

          <!-- Button Action -->
          <div>
            ${!state.isSimulationOpen ? `
              <button disabled class="w-full py-2.5 px-3 bg-stone-200 text-stone-500 rounded font-semibold text-xs cursor-not-allowed">
                Pre-Order Sedang Ditutup
              </button>
            ` : isSoldOut ? `
              <button disabled class="w-full py-2.5 px-3 bg-stone-200 text-stone-500 rounded font-semibold text-xs cursor-not-allowed">
                Kuota Hari Ini Habis
              </button>
            ` : inCartQty > 0 ? `
              <div class="flex items-center justify-between border border-[#163828] rounded p-1 bg-[#EBF3EE]">
                <button onclick="window.updateCart('${menu.id}', -1)" class="w-8 h-8 rounded bg-white text-[#163828] font-bold flex items-center justify-center hover:bg-stone-100 transition shadow-2xs font-mono">
                  -
                </button>
                <span class="text-xs font-mono font-bold text-[#163828]">${inCartQty} di Keranjang</span>
                <button onclick="window.updateCart('${menu.id}', 1)" class="w-8 h-8 rounded bg-[#163828] text-white font-bold flex items-center justify-center hover:bg-[#23543D] transition shadow-2xs font-mono">
                  +
                </button>
              </div>
            ` : `
              <button onclick="window.addToCart('${menu.id}')" class="w-full py-2.5 px-3 bg-[#163828] hover:bg-[#23543D] active:scale-[0.99] text-white rounded font-semibold text-xs flex items-center justify-center space-x-2 transition shadow-xs">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                <span>Pesan Porsi Ini</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // Render Operational Banner
  renderOperationalBanner(state) {
    if (state.isSimulationOpen) {
      return `
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-3 sm:p-4 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-start sm:items-center space-x-3">
              <span class="relative flex h-3 w-3 mt-1 sm:mt-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D94E34] opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-[#D94E34]"></span>
              </span>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-[#D94E34]">Pre-Order Aktif Hari Ini</span>
                  <span class="text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">07.00 - 10.00 WIB</span>
                </div>
                <p class="text-xs text-stone-600 mt-0.5">
                  Pengantaran serentak ke titik drop-off: <strong class="font-mono text-stone-900">${state.deliveryTargetTime}</strong>
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
              <div class="text-left sm:text-right">
                <div class="text-[11px] uppercase tracking-wider text-stone-500 font-medium">Sisa Waktu Pesan</div>
                <div class="text-lg sm:text-xl font-bold font-mono text-[#163828] tracking-tight">
                  ${formatSeconds(state.simulatedSecondsLeft)}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="bg-[#FAF7F2] border border-stone-300 rounded-lg p-3 sm:p-4 text-stone-800">
          <div class="flex items-center space-x-3">
            <div class="w-3 h-3 rounded-full bg-stone-400"></div>
            <div>
              <h4 class="text-sm font-bold text-stone-900">Pre-Order Ditutup (Di Luar Jam Operasional)</h4>
              <p class="text-xs text-stone-600">Pesanan hanya dibuka pukul 07.00 - 10.00 WIB untuk menjaga presisi kapasitas masak.</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Render Active Order Ticket
  renderActiveOrderTicket(order) {
    if (!order || order.status === ORDER_STATUS.PICKED_UP) {
      return '';
    }

    const steps = [
      { key: 'verified', label: 'Pembayaran Terverifikasi', sub: 'Otomatis via QRIS/E-Wallet' },
      { key: 'cooking', label: 'Persiapan Dapur', sub: 'Mitra memasak sesuai kuota' },
      { key: 'delivery', label: 'Pengantaran Kolektif', sub: 'Kurir menuju gedung kampus' },
      { key: 'ready', label: 'Tersedia di Drop-Off', sub: `${order.deliveryTime}` }
    ];

    const stepKeys = ['verified', 'cooking', 'delivery', 'ready'];
    const currentIdx = stepKeys.indexOf(order.status);

    let stepperHtml = '';
    steps.forEach((step, idx) => {
      const isDone = idx < currentIdx;
      const isCurrent = idx === currentIdx;

      stepperHtml += `
        <div class="flex-1 min-w-[120px] relative">
          <div class="flex items-center">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
              isDone ? 'bg-[#163828] text-white' :
              isCurrent ? 'bg-[#D94E34] text-white ring-4 ring-[#FDF1EE] animate-pulse' :
              'bg-stone-200 text-stone-500'
            }">
              ${isDone ? '✓' : (idx + 1)}
            </div>
            ${idx < steps.length - 1 ? `
              <div class="flex-1 h-1 mx-2 ${isDone ? 'bg-[#163828]' : 'bg-stone-200'}"></div>
            ` : ''}
          </div>
          <div class="mt-2 text-left">
            <p class="text-xs font-semibold ${isCurrent ? 'text-[#D94E34]' : 'text-stone-800'}">${step.label}</p>
            <p class="text-[10px] text-stone-500 leading-tight">${step.sub}</p>
          </div>
        </div>
      `;
    });

    let orderItemsHtml = '';
    order.items.forEach(it => {
      orderItemsHtml += `
        <div class="flex justify-between items-center text-xs py-1 border-b border-dashed border-stone-200">
          <span class="text-stone-800"><strong class="font-mono">${it.qty}x</strong> ${it.name}</span>
          <span class="font-mono text-stone-900">${formatRp(it.price * it.qty)}</span>
        </div>
      `;
    });

    return `
      <div class="ticket-receipt rounded-lg p-5 sm:p-6 mb-8 border border-stone-300 shadow-xs overflow-hidden">
        <!-- Ticket Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-2">
          <div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#EBF3EE] text-[#163828] mb-1">
              TIKET PENGAMBILAN AKTIF
            </span>
            <h3 class="text-base sm:text-lg font-bold text-stone-900">Makan Siang Hari Ini</h3>
          </div>
          <div class="text-left sm:text-right">
            <span class="text-[11px] text-stone-500 block">Titik Penyerahan:</span>
            <span class="text-xs font-bold text-stone-900">${order.dropoffPoint}</span>
          </div>
        </div>

        <!-- Stepper -->
        <div class="py-5 overflow-x-auto">
          <div class="flex items-center min-w-[500px]">
            ${stepperHtml}
          </div>
        </div>

        <!-- Ticket Core Details -->
        <div class="bg-[#FAF7F2] p-4 rounded-lg border border-stone-200 mt-2">
          <div class="flex flex-col md:flex-row items-center justify-between gap-4">
            <!-- Barcode & Code -->
            <div class="w-full md:w-auto text-center md:text-left">
              <div class="text-[11px] text-stone-500 font-semibold tracking-wider uppercase">Tunjukkan Kode:</div>
              <div class="text-2xl sm:text-3xl font-extrabold font-mono text-[#163828] tracking-widest my-1 select-all">
                ${order.pickupCode}
              </div>
              <div class="barcode-lines mx-auto md:mx-0 my-1 rounded-2xs opacity-90"></div>
            </div>

            <!-- Live Status -->
            <div class="w-full md:w-auto flex flex-col items-center gap-3">
              ${order.status === 'ready' ? `
                <button onclick="window.confirmOrderPickedUp()" class="w-full px-4 py-2.5 bg-[#163828] hover:bg-[#23543D] text-white rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-xs animate-bounce">
                  <span>Konfirmasi Makanan Diterima</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
              ` : `
                <div class="inline-flex items-center px-3 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-2"></span>
                  <span>Target Tiba 11:30 WIB</span>
                </div>
              `}
            </div>
          </div>

          <!-- Order Receipt -->
          <div class="mt-4 pt-3 border-t border-stone-200">
            <div class="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">Rincian Paket:</div>
            ${orderItemsHtml}
            <div class="flex justify-between items-center text-xs pt-2 font-bold text-stone-900">
              <span>Total Terbayar:</span>
              <span class="font-mono text-[#D94E34]">${formatRp(order.totalPayment)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export const uiComponents = new UIComponents();
