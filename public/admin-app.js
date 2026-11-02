// UNUFood - Partner Dashboard Application
// Dashboard for partner/kitchen operations

import { authManager } from './src/auth/auth.js';
import { stateManager } from './src/store/state.js';
import { actions } from './src/store/actions.js';
import { uiComponents } from './src/ui/components.js';
import { formatRp } from './src/utils/formatters.js';
import { getSupabase } from './src/auth/supabase.js';

class PartnerDashboardApp {
  constructor() {
    this.currentTab = 'matrix';
    this.lastOrderCount = 0;
    this.lastMenuCount = 0;
    this.lastTab = null;
    this.initializeApp();
  }

  async initializeApp() {
    console.log('Initializing Partner Dashboard...');

    // Initialize authentication
    await authManager.initialize();

    // Listen for auth state changes
    authManager.onAuthStateChange(async ({ isAuthenticated, user }) => {
      console.log('Partner Dashboard - Auth user:', user);

      if (isAuthenticated && user) {
        // TEMPORARY: Allow all authenticated users (for testing)
        // TODO: Re-enable role check after fixing user roles
        console.log('User role:', user.role);

        // Check if user has partner role
        // if (user.role === 'partner' || user.role === 'admin') {
          this.showDashboard(user);
          actions.setAuth(isAuthenticated, user);

          // Load data after authentication (include inactive menus for partner)
          await actions.loadMenus(true);  // true = include inactive menus

          // Load dropoff locations from localStorage
          this.loadDropoffLocations();

          // Load orders from database
          await this.refreshOrders();

          // Setup real-time listener for new orders
          this.setupRealtimeOrderListener();

          // Setup real-time listener for menu updates
          this.setupRealtimeMenuListener();

          // Fallback: Auto-refresh every 10 seconds
          this.startAutoRefresh();
        // } else {
        //   // Redirect to customer app
        //   console.warn('User is not partner/admin, redirecting...');
        //   window.location.href = '/index-complete.html';
        // }
      } else {
        // Redirect to login
        window.location.href = '/index-complete.html';
      }
    });

    // Setup UI
    this.setupEventListeners();

    // Subscribe to state changes
    stateManager.subscribe((state) => {
      console.log('State changed, checking if re-render needed...');
      console.log('- Menus:', state.menus?.length);
      console.log('- Orders:', state.allOrders?.length);
      console.log('- Active tab:', state.partnerSubTab);

      // Only re-render if relevant data changed
      // This prevents unnecessary re-renders from unrelated state updates
      this.render(state);
    });

    // Initial render
    this.render(stateManager.getState());
  }

  showDashboard(user) {
    // Update partner name
    const partnerNameEl = document.getElementById('partner-name');
    if (partnerNameEl) {
      partnerNameEl.textContent = user.name || 'Mitra Dapur';
    }
  }

  setupEventListeners() {
    // Tab switching
    ['orders', 'matrix', 'menus', 'dropoffs', 'labels', 'finance'].forEach(tab => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.switchTab(tab);
        });
      }
    });

    // Simulation toggle
    const btnToggleSim = document.getElementById('btn-toggle-sim');
    if (btnToggleSim) {
      btnToggleSim.addEventListener('click', () => {
        actions.toggleSimulationWindow();
        const state = stateManager.getState();
        this.showToast(state.isSimulationOpen ? 'Pre-Order dibuka' : 'Pre-Order ditutup');
      });
    }

    // Sign Out
    const btnSignOut = document.getElementById('btn-signout');
    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        if (confirm('Yakin ingin keluar?')) {
          try {
            await authManager.signOut();
            window.location.href = '/index.html';
          } catch (error) {
            console.error('Sign out error:', error);
          }
        }
      });
    }

    // Dropoff Form Submit
    const dropoffForm = document.getElementById('dropoff-form');
    if (dropoffForm) {
      dropoffForm.addEventListener('submit', (e) => {
        this.saveDropoff(e);
      });
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    stateManager.setState({ partnerSubTab: tab });
  }

  render(state) {
    this.updateTabButtons(state);
    this.renderCurrentTab(state);
    this.updateSimulationStatus(state);
  }

  updateTabButtons(state) {
    const tabs = ['orders', 'matrix', 'menus', 'dropoffs', 'labels', 'finance'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`tab-btn-${tab}`);
      const content = document.getElementById(`tab-content-${tab}`);

      if (tab === state.partnerSubTab) {
        btn?.classList.add('border-[#163828]', 'text-[#163828]', 'font-bold');
        btn?.classList.remove('border-transparent', 'text-stone-500');
        content?.classList.remove('hidden');
      } else {
        btn?.classList.remove('border-[#163828]', 'text-[#163828]', 'font-bold');
        btn?.classList.add('border-transparent', 'text-stone-500');
        content?.classList.add('hidden');
      }
    });
  }

  updateSimulationStatus(state) {
    const badge = document.getElementById('sim-status-pill');
    const text = document.getElementById('sim-status-text');

    if (badge && text) {
      if (state.isSimulationOpen) {
        badge.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
        text.textContent = 'Jam Buka (07.00 - 10.00)';
      } else {
        badge.className = 'w-2.5 h-2.5 rounded-full bg-stone-400';
        text.textContent = 'Ditutup (Di Luar Jam)';
      }
    }
  }

  renderCurrentTab(state) {
    // Only render the active tab to avoid unnecessary re-renders
    const activeTab = state.partnerSubTab || 'orders';

    switch (activeTab) {
      case 'orders':
        this.renderOrdersTab(state);
        break;
      case 'matrix':
        this.renderMatrixTab(state);
        break;
      case 'menus':
        this.renderMenusTab(state);
        break;
      case 'dropoffs':
        this.renderDropoffsTab(state);
        break;
      case 'labels':
        this.renderLabelsTab(state);
        break;
      case 'finance':
        this.renderFinanceTab(state);
        break;
    }
  }

  renderOrdersTab(state) {
    const container = document.getElementById('tab-content-orders');
    if (!container) return;

    const ordersHtml = state.allOrders.length > 0 ? state.allOrders.map(order => {
      const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
      const totalPrice = order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);

      const itemsListHtml = order.items.map(item => `
        <div class="flex justify-between items-center py-2 border-b border-stone-100 last:border-0">
          <div class="flex-1">
            <div class="font-semibold text-stone-900 text-xs">${item.name}</div>
            <div class="text-[10px] text-stone-500">${formatRp(item.price)} × ${item.qty}</div>
            ${item.notes ? `<div class="text-[10px] text-amber-700 mt-0.5">Catatan: ${item.notes}</div>` : ''}
          </div>
          <div class="text-xs font-mono font-bold text-stone-900">
            ${formatRp(item.price * item.qty)}
          </div>
        </div>
      `).join('');

      return `
        <div class="bg-white border border-stone-200 rounded-lg p-4 hover:border-[#163828] transition">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-lg font-bold font-mono text-[#D94E34]">${order.pickupCode}</span>
                <span class="text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                  order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                  order.status === 'cooking' ? 'bg-amber-100 text-amber-700' :
                  order.status === 'delivery' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'picked_up' ? 'bg-stone-200 text-stone-600' :
                  'bg-stone-100 text-stone-600'
                }">
                  ${order.status === 'ready' ? 'Siap' :
                    order.status === 'cooking' ? 'Dimasak' :
                    order.status === 'delivery' ? 'Diantar' :
                    order.status === 'verified' ? 'Pesanan Baru' :
                    order.status === 'picked_up' ? 'Selesai' :
                    'Pending'}
                </span>
              </div>
              <div class="text-sm font-semibold text-stone-900">${order.customerName}</div>
              <div class="text-xs text-stone-600">${order.customerEmail}</div>
              ${order.customerPhone ? `<div class="text-xs text-stone-600">${order.customerPhone}</div>` : ''}
            </div>
            <div class="text-right">
              <div class="text-xs text-stone-500">Total</div>
              <div class="text-lg font-bold font-mono text-[#163828]">${formatRp(totalPrice)}</div>
              <div class="text-[10px] text-stone-500">${totalItems} item</div>
            </div>
          </div>

          <div class="bg-stone-50 rounded-lg p-3 mb-3">
            <div class="text-[10px] font-semibold text-stone-500 uppercase mb-2">Item Pesanan</div>
            ${itemsListHtml}
          </div>

          <div class="flex justify-between items-center text-xs border-t border-stone-200 pt-3">
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="text-stone-500">Drop-off:</span>
                <span class="font-semibold text-stone-900">${order.dropoffPoint}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-stone-500">Pembayaran:</span>
                <span class="font-semibold text-stone-900">${order.paymentMethod === 'qris' ? 'QRIS' : 'E-Wallet'}</span>
              </div>
              <div class="text-[10px] text-stone-400">
                ${new Date(order.createdAt).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <div>
              <button onclick="app.deleteOrder('${order.id}')"
                class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold hover:bg-red-200 transition"
                title="Hapus pesanan">
                Hapus
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('') : '<div class="bg-white border border-stone-200 rounded-lg p-8 text-center"><p class="text-sm text-stone-500">Belum ada pesanan masuk</p></div>';

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Header -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-5 flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-stone-900">Daftar Pesanan Hari Ini</h3>
            <p class="text-xs text-stone-500 mt-1">Total ${state.allOrders.length} pesanan masuk</p>
          </div>
          <div class="flex gap-2">
            <button onclick="app.refreshOrders()" class="px-4 py-2 bg-[#163828] text-white rounded-lg text-xs font-semibold hover:bg-[#23543D] transition">
              Refresh
            </button>
            ${state.allOrders.length > 0 ? `
              <button onclick="app.deleteAllOrders()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition">
                Hapus Semua
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Orders List -->
        <div class="space-y-3">
          ${ordersHtml}
        </div>
      </div>
    `;
  }

  renderMatrixTab(state) {
    const container = document.getElementById('tab-content-matrix');
    if (!container) return;

    // Calculate totals per faculty
    let facultyCounts = {};
    state.dropoffLocations.forEach(f => facultyCounts[f.id] = 0);

    state.allOrders.forEach(ord => {
      const targetFacId = ord.facultyId;
      if (facultyCounts[targetFacId] !== undefined) {
        let totalItemsInOrder = 0;
        ord.items.forEach(it => totalItemsInOrder += it.qty);
        facultyCounts[targetFacId] += totalItemsInOrder;
      }
    });

    let totalPortions = Object.values(facultyCounts).reduce((sum, c) => sum + c, 0);

    let rowsHtml = '';
    state.dropoffLocations.forEach(f => {
      const count = facultyCounts[f.id] || 0;
      rowsHtml += `
        <tr class="border-b border-stone-200 hover:bg-stone-50">
          <td class="py-3 px-4 text-xs font-semibold text-stone-900">
            <span class="mr-1.5">${f.icon}</span> ${f.name}
          </td>
          <td class="py-3 px-4 text-xs text-stone-600">${f.point}</td>
          <td class="py-3 px-4 text-center">
            <span class="inline-block px-2.5 py-1 rounded bg-[#EBF3EE] text-[#163828] font-mono font-bold text-xs">
              ${count} Box
            </span>
          </td>
          <td class="py-3 px-4 text-xs font-mono text-stone-600 text-right">
            ${formatRp(count * 18000)}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Status Banner -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-4 flex items-center justify-between shadow-xs">
          <div class="flex items-center space-x-3">
            <div class="w-3 h-3 rounded-full ${state.isSimulationOpen ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'}"></div>
            <div>
              <span class="text-xs font-bold uppercase tracking-wider ${state.isSimulationOpen ? 'text-amber-800' : 'text-emerald-800'}">
                ${state.isSimulationOpen ? 'Rekap Berjalan (Order Masih Masuk)' : 'Status: Terkunci (10:00 WIB)'}
              </span>
              <p class="text-xs text-stone-600">Semua porsi harus selesai dikemas maksimal pukul 11.00 WIB.</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[11px] text-stone-500 block">Total Porsi</span>
            <span class="text-xl font-bold font-mono text-[#163828]">${totalPortions} Porsi</span>
          </div>
        </div>

        <!-- Broadcast Control -->
        <div class="bg-white border-2 border-[#163828] rounded-lg p-5 shadow-xs">
          <h4 class="text-sm font-bold text-stone-900 mb-3">Broadcast Status Pesanan ke Mahasiswa</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onclick="window.setOrderStatus('cooking')" class="p-3 rounded-lg border bg-stone-50 hover:bg-[#163828] hover:text-white border-stone-200 text-left transition">
              <div class="text-xs font-bold">Sedang Dimasak</div>
            </button>
            <button onclick="window.setOrderStatus('delivery')" class="p-3 rounded-lg border bg-stone-50 hover:bg-[#163828] hover:text-white border-stone-200 text-left transition">
              <div class="text-xs font-bold">Dalam Pengantaran</div>
            </button>
            <button onclick="window.setOrderStatus('ready')" class="p-3 rounded-lg border bg-stone-50 hover:bg-[#163828] hover:text-white border-stone-200 text-left transition">
              <div class="text-xs font-bold">Siap di Fakultas</div>
            </button>
          </div>
        </div>

        <!-- Distribution Table -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
          <div class="p-4 border-b border-stone-200 bg-stone-50/50">
            <h4 class="text-sm font-bold text-stone-900">Distribusi Porsi per Fakultas</h4>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-stone-100 text-stone-600 text-[11px] uppercase font-semibold border-b border-stone-200">
                  <th class="py-2.5 px-4">Gedung / Fakultas</th>
                  <th class="py-2.5 px-4">Lokasi Drop-Off</th>
                  <th class="py-2.5 px-4 text-center">Jumlah Box</th>
                  <th class="py-2.5 px-4 text-right">Nilai Pesanan</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr class="bg-stone-50 font-bold border-t border-stone-200 text-xs">
                  <td class="py-3 px-4 text-stone-900" colspan="2">TOTAL KESELURUHAN</td>
                  <td class="py-3 px-4 text-center font-mono text-[#163828] text-sm">${totalPortions} Box</td>
                  <td class="py-3 px-4 text-right font-mono text-[#D94E34] text-sm">${formatRp(totalPortions * 18000)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderMenusTab(state) {
    const container = document.getElementById('tab-content-menus');
    if (!container) return;

    const partnerMenus = state.menus.filter(m =>
      m.partnerId === state.currentUser?.id ||
      m.partnerName === state.currentUser?.name
    );

    const menusHtml = state.menus.map(menu => `
      <div class="bg-white border border-stone-200 rounded-lg p-4 hover:border-[#163828] transition ${!menu.isAvailable ? 'opacity-60 bg-stone-50' : ''}">
        <div class="flex gap-4">
          <img src="${menu.image}" alt="${menu.name}" class="w-24 h-24 rounded-lg object-cover ${!menu.isAvailable ? 'grayscale' : ''}" />
          <div class="flex-1">
            <div class="flex justify-between items-start mb-2">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-bold text-sm text-stone-900">${menu.name}</h4>
                  ${!menu.isAvailable ? '<span class="text-[9px] px-1.5 py-0.5 bg-stone-300 text-stone-700 rounded font-bold uppercase">Nonaktif</span>' : ''}
                </div>
                <p class="text-xs text-stone-500">${menu.partnerName}</p>
              </div>
              <div class="flex gap-2">
                <button onclick="app.editMenu('${menu.id}')" class="px-3 py-1 bg-[#163828] text-white rounded text-xs font-semibold hover:bg-[#23543D]">
                  Edit
                </button>
                <button onclick="app.restockMenu('${menu.id}')" class="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200" title="Reset kuota terjual ke 0">
                  Restock
                </button>
                <button onclick="app.toggleMenuAvailability('${menu.id}')" class="px-3 py-1 ${menu.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'} rounded text-xs font-semibold">
                  ${menu.isAvailable ? 'Aktif' : 'Nonaktif'}
                </button>
                <button onclick="app.deleteMenu('${menu.id}')" class="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200">
                  Hapus
                </button>
              </div>
            </div>
            <p class="text-xs text-stone-600 mb-2">${menu.description}</p>
            <div class="flex gap-4 text-xs">
              <div>
                <span class="text-stone-500">Harga:</span>
                <span class="font-mono font-bold text-[#D94E34]">${formatRp(menu.price)}</span>
              </div>
              <div>
                <span class="text-stone-500">Kuota:</span>
                <span class="font-mono font-bold">${menu.maxQuota} porsi</span>
              </div>
              <div>
                <span class="text-stone-500">Terjual:</span>
                <span class="font-mono font-bold text-emerald-600">${menu.orderedCount} porsi</span>
              </div>
              <div>
                <span class="text-stone-500">Sisa:</span>
                <span class="font-mono font-bold text-amber-600">${menu.maxQuota - menu.orderedCount} porsi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Header dengan tombol tambah -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-5 flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-stone-900">Kelola Menu & Kapasitas Dapur</h3>
            <p class="text-xs text-stone-500 mt-1">Total ${state.menus.length} menu terdaftar di sistem</p>
          </div>
          <div class="flex gap-2">
            <button onclick="app.restockAllMenus()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
              Restock Semua Menu
            </button>
            <button onclick="app.showAddMenuModal()" class="px-4 py-2 bg-[#D94E34] text-white rounded-lg text-sm font-semibold hover:bg-[#C94424] transition">
              + Tambah Menu Baru
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white border border-stone-200 rounded-lg p-4">
            <div class="text-xs text-stone-500 mb-1">Total Menu</div>
            <div class="text-2xl font-bold font-mono text-[#163828]">${state.menus.length}</div>
          </div>
          <div class="bg-white border border-stone-200 rounded-lg p-4">
            <div class="text-xs text-stone-500 mb-1">Menu Aktif</div>
            <div class="text-2xl font-bold font-mono text-emerald-600">${state.menus.filter(m => m.isAvailable).length}</div>
          </div>
          <div class="bg-white border border-stone-200 rounded-lg p-4">
            <div class="text-xs text-stone-500 mb-1">Total Kuota</div>
            <div class="text-2xl font-bold font-mono text-amber-600">${state.menus.reduce((sum, m) => sum + m.maxQuota, 0)}</div>
          </div>
          <div class="bg-white border border-stone-200 rounded-lg p-4">
            <div class="text-xs text-stone-500 mb-1">Terjual Hari Ini</div>
            <div class="text-2xl font-bold font-mono text-[#D94E34]">${state.menus.reduce((sum, m) => sum + m.orderedCount, 0)}</div>
          </div>
        </div>

        <!-- Menu List -->
        <div class="space-y-3">
          ${menusHtml || '<div class="bg-white border border-stone-200 rounded-lg p-8 text-center text-stone-500 text-sm">Belum ada menu. Klik "Tambah Menu Baru" untuk mulai.</div>'}
        </div>
      </div>
    `;
  }

  renderDropoffsTab(state) {
    const container = document.getElementById('tab-content-dropoffs');
    if (!container) return;

    let dropoffsHtml = '';
    state.dropoffLocations.forEach(dropoff => {
      dropoffsHtml += `
        <div class="bg-white border border-stone-200 rounded-lg p-4 hover:border-[#163828] transition">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-2xl">${dropoff.icon}</span>
                <div>
                  <h4 class="text-sm font-bold text-stone-900">${dropoff.name}</h4>
                  <p class="text-xs text-stone-600">ID: ${dropoff.id}</p>
                </div>
              </div>
              <div class="text-xs text-stone-700 bg-stone-50 rounded p-2">
                <span class="font-semibold">Lokasi Drop-off:</span> ${dropoff.point}
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="app.editDropoff('${dropoff.id}')"
                class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold hover:bg-blue-200 transition">
                Edit
              </button>
              <button onclick="app.deleteDropoff('${dropoff.id}')"
                class="px-3 py-1.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold hover:bg-red-200 transition">
                Hapus
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="space-y-4 py-6">
        <!-- Header -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-5 flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-stone-900">Kelola Gedung Drop-Off</h3>
            <p class="text-xs text-stone-500 mt-1">Atur lokasi pengantaran makanan untuk mahasiswa</p>
          </div>
          <button onclick="app.openDropoffModal()" class="px-4 py-2 bg-[#163828] text-white rounded-lg text-xs font-semibold hover:bg-[#23543D] transition">
            + Tambah Gedung
          </button>
        </div>

        <!-- Stats -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-5">
          <div class="text-xs text-stone-500 mb-1">Total Gedung Drop-Off</div>
          <div class="text-2xl font-bold font-mono text-[#D94E34]">${state.dropoffLocations.length}</div>
        </div>

        <!-- Dropoff List -->
        <div class="space-y-3">
          ${dropoffsHtml}
        </div>
      </div>
    `;
  }

  renderLabelsTab(state) {
    const container = document.getElementById('tab-content-labels');
    if (!container) return;

    let labelsHtml = '';
    state.allOrders.forEach(ord => {
      const menuNames = ord.items.map(it => `${it.qty}x ${it.name}`).join(', ');
      labelsHtml += `
        <div class="bg-white border-2 border-stone-800 p-3 rounded text-stone-900 font-mono text-xs relative">
          <button onclick="app.deleteOrder('${ord.id}')"
            class="no-print absolute top-2 right-2 w-6 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded flex items-center justify-center text-xs font-bold transition"
            title="Hapus pesanan">
            ✕
          </button>
          <div class="border-b border-stone-300 pb-1.5 mb-1.5 flex justify-between pr-6">
            <span class="font-extrabold text-[#163828]">UNUFood</span>
            <span class="text-[10px]">${ord.items.reduce((s, i) => s + i.qty, 0)} Box</span>
          </div>
          <div class="text-base font-extrabold text-[#D94E34]">${ord.pickupCode}</div>
          <div class="text-xs font-bold">${ord.customerName}</div>
          <div class="text-[11px] mt-1">📍 ${ord.dropoffPoint}</div>
          <div class="text-[10px] text-stone-600">${menuNames}</div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-5">
          <div class="flex justify-between items-center mb-4">
            <h4 class="text-sm font-bold text-stone-900">Pratinjau Label Dus Makanan</h4>
            <div class="flex gap-2">
              <button onclick="window.print()" class="px-4 py-2 bg-[#163828] text-white rounded text-xs font-semibold hover:bg-[#23543D] transition">
                Cetak Label (${state.allOrders.length})
              </button>
              ${state.allOrders.length > 0 ? `
                <button onclick="app.deleteAllOrders()" class="px-4 py-2 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition">
                  Hapus Semua
                </button>
              ` : ''}
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            ${labelsHtml}
          </div>
        </div>
      </div>
    `;

    // Populate print area
    const printArea = document.getElementById('print-area');
    if (printArea) {
      printArea.innerHTML = labelsHtml;
    }
  }

  renderFinanceTab(state) {
    const container = document.getElementById('tab-content-finance');
    if (!container) return;

    let totalGross = 0;
    let totalOrders = state.allOrders.length;
    let totalPortions = 0;

    state.allOrders.forEach(ord => {
      ord.items.forEach(it => {
        totalGross += (it.price * it.qty);
        totalPortions += it.qty;
      });
    });

    const platformFee = Math.round(totalGross * 0.10);
    const netIncome = totalGross - platformFee;

    // Group by menu
    const menuSales = {};
    state.allOrders.forEach(ord => {
      ord.items.forEach(it => {
        if (!menuSales[it.name]) {
          menuSales[it.name] = { qty: 0, revenue: 0 };
        }
        menuSales[it.name].qty += it.qty;
        menuSales[it.name].revenue += (it.price * it.qty);
      });
    });

    const menuRows = Object.entries(menuSales).map(([name, data]) => `
      <tr class="border-b border-stone-200 hover:bg-stone-50">
        <td class="py-3 px-4 text-xs font-semibold text-stone-900">${name}</td>
        <td class="py-3 px-4 text-xs text-center font-mono">${data.qty} porsi</td>
        <td class="py-3 px-4 text-xs text-right font-mono text-[#163828]">${formatRp(data.revenue)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div class="bg-white border border-[#E7E5E4] rounded-lg p-4">
            <span class="text-[11px] font-semibold text-stone-500 uppercase">Total Pesanan</span>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${totalOrders}</div>
          </div>
          <div class="bg-white border border-[#E7E5E4] rounded-lg p-4">
            <span class="text-[11px] font-semibold text-stone-500 uppercase">Total Porsi</span>
            <div class="text-2xl font-bold font-mono text-amber-600 mt-1">${totalPortions}</div>
          </div>
          <div class="bg-white border border-[#E7E5E4] rounded-lg p-4">
            <span class="text-[11px] font-semibold text-stone-500 uppercase">Penjualan Kotor</span>
            <div class="text-2xl font-bold font-mono text-stone-900 mt-1">${formatRp(totalGross)}</div>
          </div>
          <div class="bg-white border border-[#E7E5E4] rounded-lg p-4 bg-[#EBF3EE]/50">
            <span class="text-[11px] font-semibold text-[#163828] uppercase">Pendapatan Bersih</span>
            <div class="text-2xl font-bold font-mono text-[#163828] mt-1">${formatRp(netIncome)}</div>
          </div>
        </div>

        <!-- Revenue Breakdown -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg p-5">
          <h4 class="text-sm font-bold text-stone-900 mb-4">Rincian Pendapatan</h4>
          <div class="space-y-3">
            <div class="flex justify-between items-center pb-3 border-b border-stone-200">
              <span class="text-xs text-stone-600">Penjualan Kotor (${totalOrders} pesanan)</span>
              <span class="font-mono font-bold text-sm text-stone-900">${formatRp(totalGross)}</span>
            </div>
            <div class="flex justify-between items-center pb-3 border-b border-stone-200">
              <span class="text-xs text-stone-600">Komisi Platform (10%)</span>
              <span class="font-mono font-bold text-sm text-[#D94E34]">- ${formatRp(platformFee)}</span>
            </div>
            <div class="flex justify-between items-center pt-2">
              <span class="text-sm font-bold text-[#163828]">Pendapatan Bersih Mitra</span>
              <span class="font-mono font-bold text-lg text-[#163828]">${formatRp(netIncome)}</span>
            </div>
          </div>
        </div>

        <!-- Sales by Menu -->
        <div class="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
          <div class="p-4 border-b border-stone-200 bg-stone-50/50">
            <h4 class="text-sm font-bold text-stone-900">Penjualan per Menu</h4>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-stone-100 text-stone-600 text-[11px] uppercase font-semibold border-b border-stone-200">
                  <th class="py-2.5 px-4">Nama Menu</th>
                  <th class="py-2.5 px-4 text-center">Terjual</th>
                  <th class="py-2.5 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${menuRows || '<tr><td colspan="3" class="py-8 text-center text-xs text-stone-500">Belum ada transaksi</td></tr>'}
              </tbody>
              <tfoot>
                <tr class="bg-stone-50 font-bold border-t-2 border-stone-200 text-xs">
                  <td class="py-3 px-4 text-stone-900">TOTAL</td>
                  <td class="py-3 px-4 text-center font-mono text-[#163828]">${totalPortions} porsi</td>
                  <td class="py-3 px-4 text-right font-mono text-[#163828]">${formatRp(totalGross)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Info Box -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div class="flex gap-3">
            <div class="text-2xl">ℹ️</div>
            <div class="flex-1">
              <h5 class="text-xs font-bold text-amber-900 mb-1">Informasi Komisi Platform</h5>
              <p class="text-xs text-amber-800">Komisi 10% digunakan untuk operasional platform, marketing, dan pengembangan fitur. Settlement dilakukan setiap hari Jumat via transfer bank.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupRealtimeMenuListener() {
    const supabase = getSupabase();

    if (!supabase) {
      console.warn('Supabase not available, menu realtime disabled');
      return;
    }

    // Remove existing channel if any
    if (this.realtimeMenuChannel) {
      try {
        supabase.removeChannel(this.realtimeMenuChannel);
      } catch (e) {
        console.warn('Error removing old menu channel:', e);
      }
      this.realtimeMenuChannel = null;
    }

    console.log('Setting up realtime listener for menus...');

    const channelName = 'menus-realtime';

    // Create and subscribe to channel for menu updates
    this.realtimeMenuChannel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: 'admin' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menus'
        },
        (payload) => {
          console.log('Realtime menu change detected:', payload);

          const state = stateManager.getState();

          // Update menu in state
          const updatedMenus = state.menus.map(menu => {
            if (menu.id === payload.new.id) {
              return {
                ...menu,
                orderedCount: payload.new.ordered_count || menu.orderedCount,
                maxQuota: payload.new.max_quota || menu.maxQuota,
                isAvailable: payload.new.is_available !== undefined ? payload.new.is_available : menu.isAvailable,
                price: payload.new.price || menu.price,
                name: payload.new.name || menu.name
              };
            }
            return menu;
          });

          console.log('Menu quota updated in realtime:', payload.new.id, '→', payload.new.ordered_count);
          stateManager.setState({ menus: updatedMenus });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✓ Real-time menu updates enabled');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time menu subscription error');
        }
      });

    console.log('Real-time menu listener setup complete');
  }

  startAutoRefresh() {
    // Auto-refresh every 10 seconds as fallback
    console.log('Starting auto-refresh polling (10s interval)...');

    // Clear existing interval if any
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      console.log('Auto-refreshing data...');

      // Refresh orders silently
      try {
        const supabase = getSupabase();
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (orders) {
          const transformedOrders = orders.map(order => ({
            id: order.id,
            pickupCode: order.pickup_code,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            items: order.items,
            dropoffPoint: order.dropoff_point,
            facultyId: order.faculty_id,
            paymentMethod: order.payment_method,
            status: order.status || 'verified',
            createdAt: order.created_at
          }));

          // Only update if data actually changed
          const currentOrders = stateManager.getState().allOrders;
          const ordersChanged = JSON.stringify(currentOrders) !== JSON.stringify(transformedOrders);

          if (ordersChanged) {
            console.log('Orders changed, updating state...');
            stateManager.setState({ allOrders: transformedOrders });
          } else {
            console.log('No changes in orders, skipping update');
          }
        }

        // Refresh menus silently
        await actions.loadMenus(true);

      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    }, 30000); // Increased to 30 seconds to reduce frequency

    console.log('✓ Auto-refresh polling active (every 30s)');
  }

  showToast(message) {
    uiComponents.showToast(message);
  }

  // Menu Management Methods
  showAddMenuModal() {
    const modal = document.getElementById('menu-modal');
    if (modal) {
      modal.classList.remove('hidden');
      // Reset form
      const form = document.getElementById('menu-form');
      form.reset();
      document.querySelector('#menu-modal h3').textContent = 'Tambah Menu Baru';
      form.dataset.mode = 'add';
      delete form.dataset.menuId;

      // Setup form handler
      form.onsubmit = (e) => {
        e.preventDefault();
        this.handleAddMenu();
      };
    }
  }

  closeMenuModal() {
    const modal = document.getElementById('menu-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  async handleAddMenu() {
    const form = document.getElementById('menu-form');
    const mode = form.dataset.mode || 'add';
    const menuId = form.dataset.menuId;

    const name = document.getElementById('menu-name').value;
    const price = parseInt(document.getElementById('menu-price').value);
    const quota = parseInt(document.getElementById('menu-quota').value);
    const description = document.getElementById('menu-description').value;
    const image = document.getElementById('menu-image').value || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

    const state = stateManager.getState();
    const user = state.currentUser;

    if (mode === 'edit' && menuId) {
      // UPDATE existing menu
      try {
        // Optimistic UI update
        const updatedMenus = state.menus.map(m =>
          m.id === menuId ? {
            ...m,
            name,
            price,
            description,
            image,
            maxQuota: quota
          } : m
        );
        stateManager.setState({ menus: updatedMenus });

        // Update database
        const supabase = getSupabase();
        const { error } = await supabase
          .from('menus')
          .update({
            name,
            price,
            description,
            image,
            max_quota: quota
          })
          .eq('id', menuId);

        if (error) throw error;

        this.showToast('Menu berhasil diupdate!');
        this.closeMenuModal();
      } catch (error) {
        console.error('Error updating menu:', error);
        this.showToast('Gagal mengupdate menu: ' + error.message);
        // Rollback on error
        await actions.loadMenus(true);  // Load all menus including inactive
      }
    } else {
      // INSERT new menu
      const newMenu = {
        id: 'menu-' + Date.now(),
        name,
        partnerId: user.id,
        partnerName: user.name,
        price,
        image,
        description,
        maxQuota: quota,
        orderedCount: 0,
        isAvailable: true
      };

      try {
        // Optimistic UI update - add to state immediately
        const updatedMenus = [...state.menus, newMenu];
        stateManager.setState({ menus: updatedMenus });

        // Insert to database
        const supabase = getSupabase();
        const { error } = await supabase
          .from('menus')
          .insert([{
            id: newMenu.id,
            name,
            partner_name: user.name,
            price,
            image,
            description,
            max_quota: quota,
            ordered_count: 0,
            is_available: true
          }]);

        if (error) throw error;

        this.showToast('Menu berhasil ditambahkan!');
        this.closeMenuModal();
      } catch (error) {
        console.error('Error adding menu:', error);
        this.showToast('Gagal menambahkan menu: ' + error.message);
        // Rollback on error
        await actions.loadMenus(true);  // Load all menus including inactive
      }
    }
  }

  async toggleMenuAvailability(menuId) {
    const state = stateManager.getState();
    const menu = state.menus.find(m => m.id === menuId);

    if (!menu) return;

    const newAvailability = !menu.isAvailable;

    console.log('Toggling menu:', menuId, 'from', menu.isAvailable, 'to', newAvailability);

    try {
      // Update database FIRST
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('menus')
        .update({ is_available: newAvailability })
        .eq('id', menuId)
        .select();

      console.log('Database update result:', { data, error });

      if (error) throw error;

      // Only update UI if database success
      const updatedMenus = state.menus.map(m =>
        m.id === menuId ? { ...m, isAvailable: newAvailability } : m
      );
      stateManager.setState({ menus: updatedMenus });

      this.showToast(newAvailability ? 'Menu diaktifkan' : 'Menu dinonaktifkan');
    } catch (error) {
      console.error('Error toggling menu:', error);
      this.showToast('Gagal mengubah status menu: ' + error.message);
    }
  }

  editMenu(menuId) {
    const state = stateManager.getState();
    const menu = state.menus.find(m => m.id === menuId);

    if (!menu) {
      this.showToast('Menu tidak ditemukan');
      return;
    }

    // Open modal and populate with existing data
    const modal = document.getElementById('menu-modal');
    if (modal) {
      modal.classList.remove('hidden');

      // Change modal title
      document.querySelector('#menu-modal h3').textContent = 'Edit Menu';

      // Populate form fields
      document.getElementById('menu-name').value = menu.name;
      document.getElementById('menu-price').value = menu.price;
      document.getElementById('menu-quota').value = menu.maxQuota;
      document.getElementById('menu-description').value = menu.description || '';
      document.getElementById('menu-image').value = menu.image || '';

      // Set form mode to edit
      const form = document.getElementById('menu-form');
      form.dataset.mode = 'edit';
      form.dataset.menuId = menuId;

      // Setup form handler
      form.onsubmit = (e) => {
        e.preventDefault();
        this.handleAddMenu();
      };
    }
  }

  async deleteMenu(menuId) {
    const state = stateManager.getState();
    const menu = state.menus.find(m => m.id === menuId);

    if (!menu) {
      this.showToast('Menu tidak ditemukan');
      return;
    }

    // Confirmation dialog
    const confirmed = confirm(
      `Hapus menu "${menu.name}"?\n\n` +
      `Menu akan dihapus permanen dari database.\n` +
      `${menu.orderedCount > 0 ? `⚠️ Menu ini sudah ada ${menu.orderedCount} pesanan!` : ''}`
    );

    if (!confirmed) return;

    try {
      const supabase = getSupabase();

      console.log('Deleting menu:', menuId);

      const { data, error } = await supabase
        .from('menus')
        .delete()
        .eq('id', menuId)
        .select();  // Force return deleted rows

      if (error) throw error;

      console.log('Deleted rows:', data);

      // Optimistic UI update: remove from state immediately
      const currentState = stateManager.getState();
      const updatedMenus = currentState.menus.filter(m => m.id !== menuId);

      console.log('Optimistic update:', currentState.menus.length, '->', updatedMenus.length);

      stateManager.setState({ menus: updatedMenus });

      this.showToast('Menu berhasil dihapus!');

    } catch (error) {
      console.error('Error deleting menu:', error);
      this.showToast('Gagal menghapus menu: ' + error.message);
    }
  }

  async restockMenu(menuId) {
    const state = stateManager.getState();
    const menu = state.menus.find(m => m.id === menuId);

    if (!menu) {
      this.showToast('Menu tidak ditemukan');
      return;
    }

    if (menu.orderedCount === 0) {
      this.showToast('Menu ini belum ada yang terjual');
      return;
    }

    // Confirmation
    if (!confirm(`Reset kuota "${menu.name}"?\n\nTerjual akan direset dari ${menu.orderedCount} → 0 porsi`)) {
      return;
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('menus')
        .update({ ordered_count: 0 })
        .eq('id', menuId);

      if (error) throw error;

      // Update local state
      const updatedMenus = state.menus.map(m =>
        m.id === menuId ? { ...m, orderedCount: 0 } : m
      );

      stateManager.setState({ menus: updatedMenus });
      this.showToast(`✓ "${menu.name}" berhasil di-restock`);

    } catch (error) {
      console.error('Error restocking menu:', error);
      this.showToast('Gagal restock menu: ' + error.message);
    }
  }

  async restockAllMenus() {
    const state = stateManager.getState();
    const menusWithOrders = state.menus.filter(m => m.orderedCount > 0);

    if (menusWithOrders.length === 0) {
      this.showToast('Tidak ada menu yang perlu di-restock');
      return;
    }

    // Confirmation
    if (!confirm(
      `Restock SEMUA MENU?\n\n` +
      `${menusWithOrders.length} menu akan direset kuota terjualnya ke 0.\n\n` +
      `Ini biasanya dilakukan setiap hari baru.`
    )) {
      return;
    }

    try {
      const supabase = getSupabase();

      // Reset all menus to 0
      const { error } = await supabase
        .from('menus')
        .update({ ordered_count: 0 })
        .gt('ordered_count', 0);

      if (error) throw error;

      // Update local state
      const updatedMenus = state.menus.map(m => ({ ...m, orderedCount: 0 }));

      stateManager.setState({ menus: updatedMenus });
      this.showToast(`✓ ${menusWithOrders.length} menu berhasil di-restock`);

    } catch (error) {
      console.error('Error restocking all menus:', error);
      this.showToast('Gagal restock semua menu: ' + error.message);
    }
  }

  // Dropoff Management Functions
  openDropoffModal(dropoffId = null) {
    const modal = document.getElementById('dropoff-modal');
    const form = document.getElementById('dropoff-form');
    const title = document.getElementById('dropoff-modal-title');

    if (!modal || !form) return;

    form.reset();

    if (dropoffId) {
      // Edit mode
      const state = stateManager.getState();
      const dropoff = state.dropoffLocations.find(d => d.id === dropoffId);

      if (dropoff) {
        title.textContent = 'Edit Gedung Drop-Off';
        document.getElementById('dropoff-id').value = dropoff.id;
        document.getElementById('dropoff-id').disabled = true; // Cannot change ID
        document.getElementById('dropoff-name').value = dropoff.name;
        document.getElementById('dropoff-point').value = dropoff.point;
        document.getElementById('dropoff-icon').value = dropoff.icon;

        this.editingDropoffId = dropoffId;
      }
    } else {
      // Add mode
      title.textContent = 'Tambah Gedung Drop-Off';
      document.getElementById('dropoff-id').disabled = false;
      this.editingDropoffId = null;
    }

    modal.classList.remove('hidden');
  }

  closeDropoffModal() {
    const modal = document.getElementById('dropoff-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    this.editingDropoffId = null;
  }

  async saveDropoff(event) {
    event.preventDefault();

    const id = document.getElementById('dropoff-id').value.trim().toUpperCase();
    const name = document.getElementById('dropoff-name').value.trim();
    const point = document.getElementById('dropoff-point').value.trim();
    const icon = document.getElementById('dropoff-icon').value.trim();

    if (!id || !name || !point || !icon) {
      this.showToast('Semua field harus diisi!');
      return;
    }

    const state = stateManager.getState();
    let updatedLocations = [...state.dropoffLocations];

    if (this.editingDropoffId) {
      // Update existing
      const index = updatedLocations.findIndex(d => d.id === this.editingDropoffId);
      if (index !== -1) {
        updatedLocations[index] = { id, name, point, icon };
        this.showToast('Gedung berhasil diupdate!');
      }
    } else {
      // Add new
      if (updatedLocations.find(d => d.id === id)) {
        this.showToast('ID gedung sudah ada! Gunakan ID yang berbeda.');
        return;
      }
      updatedLocations.push({ id, name, point, icon });
      this.showToast('Gedung berhasil ditambahkan!');
    }

    stateManager.setState({ dropoffLocations: updatedLocations });
    this.closeDropoffModal();

    // Save to localStorage for persistence
    localStorage.setItem('unufood_dropoff_locations', JSON.stringify(updatedLocations));
  }

  editDropoff(dropoffId) {
    this.openDropoffModal(dropoffId);
  }

  async deleteDropoff(dropoffId) {
    const state = stateManager.getState();
    const dropoff = state.dropoffLocations.find(d => d.id === dropoffId);

    if (!dropoff) {
      this.showToast('Gedung tidak ditemukan');
      return;
    }

    // Check if there are orders using this dropoff
    const ordersUsingDropoff = state.allOrders.filter(o => o.facultyId === dropoffId);

    let confirmMessage = `Hapus gedung "${dropoff.name}"?`;
    if (ordersUsingDropoff.length > 0) {
      confirmMessage += `\n\n⚠️ Ada ${ordersUsingDropoff.length} pesanan yang menggunakan lokasi ini!`;
    }

    if (!confirm(confirmMessage)) return;

    const updatedLocations = state.dropoffLocations.filter(d => d.id !== dropoffId);

    stateManager.setState({ dropoffLocations: updatedLocations });
    localStorage.setItem('unufood_dropoff_locations', JSON.stringify(updatedLocations));

    this.showToast('Gedung berhasil dihapus!');
  }

  loadDropoffLocations() {
    const savedLocations = localStorage.getItem('unufood_dropoff_locations');

    if (savedLocations) {
      try {
        const locations = JSON.parse(savedLocations);
        stateManager.setState({ dropoffLocations: locations });
        console.log('✓ Loaded dropoff locations from localStorage:', locations.length);
      } catch (error) {
        console.error('Error loading dropoff locations:', error);
      }
    }
  }

  async updateOrderStatus(orderId, status) {
    const state = stateManager.getState();
    const order = state.allOrders.find(o => o.id === orderId);

    if (!order) {
      this.showToast('Pesanan tidak ditemukan');
      return;
    }

    try {
      const supabase = getSupabase();

      const { error } = await supabase
        .from('orders')
        .update({ status: status })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      const updatedOrders = state.allOrders.map(o =>
        o.id === orderId ? { ...o, status: status } : o
      );
      stateManager.setState({ allOrders: updatedOrders });

      const statusLabels = {
        cooking: 'Sedang Dimasak',
        delivery: 'Dalam Pengantaran',
        ready: 'Siap Diambil'
      };

      this.showToast(`Status pesanan ${order.pickupCode} → ${statusLabels[status]}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      this.showToast('Gagal update status: ' + error.message);
    }
  }

  async deleteOrder(orderId) {
    const state = stateManager.getState();
    const order = state.allOrders.find(o => o.id === orderId);

    if (!order) {
      this.showToast('Pesanan tidak ditemukan');
      return;
    }

    // Confirm before deleting
    if (!confirm(`Hapus pesanan ${order.pickupCode} dari ${order.customerName}?\n\nAksi ini tidak dapat dibatalkan!`)) {
      return;
    }

    try {
      const supabase = getSupabase();

      // Delete from database
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      const updatedOrders = state.allOrders.filter(o => o.id !== orderId);
      stateManager.setState({ allOrders: updatedOrders });

      this.showToast(`✓ Pesanan ${order.pickupCode} berhasil dihapus`);
    } catch (error) {
      console.error('Error deleting order:', error);
      this.showToast('Gagal menghapus pesanan: ' + error.message);
    }
  }

  async deleteAllOrders() {
    const state = stateManager.getState();

    if (state.allOrders.length === 0) {
      this.showToast('Tidak ada pesanan untuk dihapus');
      return;
    }

    // Confirm before deleting all
    if (!confirm(`HAPUS SEMUA ${state.allOrders.length} PESANAN?\n\n⚠️ PERINGATAN: Aksi ini akan menghapus SEMUA pesanan yang ada dan TIDAK DAPAT dibatalkan!\n\nKetik "HAPUS" untuk konfirmasi.`)) {
      return;
    }

    // Double confirmation
    const confirmation = prompt('Ketik "HAPUS" (huruf besar) untuk konfirmasi penghapusan:');
    if (confirmation !== 'HAPUS') {
      this.showToast('Penghapusan dibatalkan');
      return;
    }

    try {
      const supabase = getSupabase();
      const orderIds = state.allOrders.map(o => o.id);

      // Delete all orders from database
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (error) throw error;

      // Clear local state
      stateManager.setState({ allOrders: [] });

      this.showToast(`✓ Semua pesanan (${orderIds.length}) berhasil dihapus`);
    } catch (error) {
      console.error('Error deleting all orders:', error);
      this.showToast('Gagal menghapus pesanan: ' + error.message);
    }
  }

  async refreshOrders() {
    this.showToast('Memuat ulang data pesanan...');

    try {
      const supabase = getSupabase();

      // Fetch orders from database
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database format to app format
      const transformedOrders = orders.map(order => ({
        id: order.id,
        pickupCode: order.pickup_code,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        items: order.items,
        dropoffPoint: order.dropoff_point,
        facultyId: order.faculty_id,
        paymentMethod: order.payment_method,
        status: order.status || 'verified',
        createdAt: order.created_at
      }));

      stateManager.setState({ allOrders: transformedOrders });
      this.showToast(`✓ ${transformedOrders.length} pesanan dimuat`);
    } catch (error) {
      console.error('Error refreshing orders:', error);
      this.showToast('Gagal memuat pesanan: ' + error.message);
    }
  }

  setupRealtimeOrderListener() {
    const supabase = getSupabase();

    if (!supabase) {
      console.warn('Supabase not available, realtime disabled');
      return;
    }

    // Remove existing channel if any
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {
        console.warn('Error removing old channel:', e);
      }
      this.realtimeChannel = null;
    }

    console.log('Setting up realtime listener for orders...');

    const channelName = 'orders-realtime';

    // Create and subscribe to channel in one go
    this.realtimeChannel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: 'admin' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime order change detected:', payload);

          const state = stateManager.getState();

          if (payload.eventType === 'INSERT') {
            // New order created
            const newOrder = {
              id: payload.new.id,
              pickupCode: payload.new.pickup_code,
              customerName: payload.new.customer_name,
              customerEmail: payload.new.customer_email,
              customerPhone: payload.new.customer_phone,
              items: payload.new.items,
              dropoffPoint: payload.new.dropoff_point,
              facultyId: payload.new.faculty_id,
              paymentMethod: payload.new.payment_method,
              status: payload.new.status || 'verified',
              createdAt: payload.new.created_at
            };

            console.log('New order received via realtime:', newOrder);
            console.log('Current orders count:', state.allOrders.length);

            // Check if order already exists (avoid duplicates)
            const orderExists = state.allOrders.some(o => o.id === newOrder.id);
            if (orderExists) {
              console.log('Order already exists, skipping duplicate');
              return;
            }

            // Add to beginning of orders list
            const updatedOrders = [newOrder, ...state.allOrders];
            console.log('Updated orders count:', updatedOrders.length);

            stateManager.setState({ allOrders: updatedOrders });

            this.showToast(`Pesanan baru masuk: ${newOrder.pickupCode}`);

            // Play notification sound if available
            if (typeof Audio !== 'undefined') {
              try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGH0fPTgjMGHm7A7+OZRQ0PVqzn77BdGAg+ltryxnMpBSl+zPLaizsIGGS56+adUxALTKXh8bllHAU0kdXzyn0vBSZ9y/LZhzwHF2W76+SdThALSqPh8blnHwU4lNXzyn4uBSN6yvLaijwHGGe86+OaURAMSqPg8bdmHgU2k9TzyH0tBSJ5y/LajDwHGGi96+OYURAMSaLf8LdlHQU1ktTzyHwsBSF4yvLajjwHF2i+6+OYURAMSKHe8LZkHAU0kdPzx3wrBSB3yfLakjwHF2m/6+OYURAMSKDe8LZkHAU1ktPzx3wrBSB3yfLak');
                audio.play().catch(() => {});
              } catch (e) {
                // Ignore audio errors
              }
            }

          } else if (payload.eventType === 'UPDATE') {
            // Order updated
            console.log('Order UPDATE detected:', payload.new);

            const updatedOrders = state.allOrders.map(order => {
              if (order.id === payload.new.id) {
                return {
                  ...order,
                  status: payload.new.status || order.status,
                  items: payload.new.items || order.items,
                  dropoffPoint: payload.new.dropoff_point || order.dropoffPoint,
                  customerName: payload.new.customer_name || order.customerName,
                  customerEmail: payload.new.customer_email || order.customerEmail,
                  customerPhone: payload.new.customer_phone || order.customerPhone
                };
              }
              return order;
            });

            console.log('Status updated in realtime:', payload.new.id, '->', payload.new.status);
            stateManager.setState({ allOrders: updatedOrders });

            // Show toast notification for status change
            const order = state.allOrders.find(o => o.id === payload.new.id);
            if (order && order.status !== payload.new.status) {
              const statusLabels = {
                verified: 'Pesanan Baru',
                cooking: 'Dimasak',
                delivery: 'Diantar',
                ready: 'Siap',
                picked_up: 'Selesai'
              };
              this.showToast(`Status ${order.pickupCode}: ${statusLabels[payload.new.status] || payload.new.status}`);
            }

          } else if (payload.eventType === 'DELETE') {
            // Order deleted
            const updatedOrders = state.allOrders.filter(
              order => order.id !== payload.old.id
            );
            stateManager.setState({ allOrders: updatedOrders });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);

        if (status === 'SUBSCRIBED') {
          console.log('✓ Real-time order updates enabled');
          this.showToast('✓ Auto-refresh aktif - Pesanan akan update otomatis');

          // Update UI indicator if exists
          const indicator = document.getElementById('realtime-indicator');
          if (indicator) {
            indicator.innerHTML = '<span class="text-emerald-600 text-xs">● Live</span>';
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
          this.showToast('⚠️ Auto-refresh error - Gunakan tombol Refresh manual');

          const indicator = document.getElementById('realtime-indicator');
          if (indicator) {
            indicator.innerHTML = '<span class="text-red-600 text-xs">● Offline</span>';
          }
        } else if (status === 'CLOSED') {
          console.warn('Real-time connection closed');
          // Don't auto-reconnect to avoid infinite loop
          // Polling will handle updates
        }
      });
  }
}

// Global functions
window.setOrderStatus = async (status) => {
  await actions.setAdminBroadcastStatus(status);
  const labels = {
    cooking: 'Dapur Sedang Memasak',
    delivery: 'Dalam Pengantaran',
    ready: 'Siap di Fakultas'
  };
  app.showToast(`Status di-broadcast: ${labels[status]}`);
};

// Initialize
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new PartnerDashboardApp();
  window.app = app;
});

export { PartnerDashboardApp };
