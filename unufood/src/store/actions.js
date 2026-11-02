// UNUFood - State Actions
// All state mutations go through these actions

import { stateManager } from './state.js';
import { ORDER_STATUS, FEES } from '../config/constants.js';
import { generateOrderId, generatePickupCode } from '../utils/formatters.js';
import { getSupabase } from '../auth/supabase.js';

export const actions = {
  // Auth actions
  setAuth(isAuthenticated, user) {
    stateManager.setState({ isAuthenticated, currentUser: user });
  },

  // Role management
  setRole(role) {
    stateManager.setState({ activeRole: role });
  },

  setPartnerSubTab(tab) {
    stateManager.setState({ partnerSubTab: tab });
  },

  // Simulation
  toggleSimulationWindow() {
    const state = stateManager.getState();
    const isOpen = !state.isSimulationOpen;
    stateManager.setState({
      isSimulationOpen: isOpen,
      simulatedSecondsLeft: isOpen && state.simulatedSecondsLeft <= 0 ? 4860 : state.simulatedSecondsLeft
    });
  },

  // User profile
  updateUserProfile(name, phone, faculty) {
    const state = stateManager.getState();
    const user = { ...state.currentUser, name, phone, faculty };
    const loc = state.dropoffLocations.find(l => l.id === faculty);

    stateManager.setState({
      currentUser: user,
      selectedDropoffId: faculty
    });
  },

  // Cart management
  setSelectedDropoff(dropoffId) {
    stateManager.setState({ selectedDropoffId: dropoffId });
  },

  addToCart(menuId) {
    const state = stateManager.getState();
    const menu = state.menus.find(m => m.id === menuId);

    if (!menu) return { success: false, reason: 'Menu tidak ditemukan' };
    if (!menu.isAvailable) return { success: false, reason: 'Menu ini sedang tidak tersedia hari ini.' };

    const remaining = menu.maxQuota - menu.orderedCount;
    if (remaining <= 0) return { success: false, reason: 'Kuota menu ini sudah habis hari ini!' };

    const cart = [...state.cart];
    const cartItem = cart.find(c => c.menuId === menuId);
    const inCartQty = cartItem ? cartItem.qty : 0;

    if (inCartQty + 1 > remaining) {
      return { success: false, reason: `Maksimal sisa kuota yang dapat dipesan adalah ${remaining} porsi.` };
    }

    if (cartItem) {
      cartItem.qty++;
    } else {
      cart.push({ menuId, qty: 1, notes: '' });
    }

    stateManager.setState({ cart });
    return { success: true };
  },

  updateCartQty(menuId, delta) {
    const state = stateManager.getState();
    const cart = [...state.cart];
    const itemIndex = cart.findIndex(c => c.menuId === menuId);

    if (itemIndex === -1) return;

    const menu = state.menus.find(m => m.id === menuId);
    const newQty = cart[itemIndex].qty + delta;

    if (newQty <= 0) {
      cart.splice(itemIndex, 1);
    } else {
      const remaining = menu ? (menu.maxQuota - menu.orderedCount) : 99;
      if (newQty > remaining) {
        alert(`Sisa kuota hanya tersisa ${remaining} porsi.`);
        return;
      }
      cart[itemIndex].qty = newQty;
    }

    stateManager.setState({ cart });
  },

  updateCartNotes(menuId, notes) {
    const state = stateManager.getState();
    const cart = [...state.cart];
    const item = cart.find(c => c.menuId === menuId);

    if (item) {
      item.notes = notes;
      stateManager.setState({ cart });
    }
  },

  removeFromCart(menuId) {
    const state = stateManager.getState();
    const cart = state.cart.filter(c => c.menuId !== menuId);
    stateManager.setState({ cart });
  },

  clearCart() {
    stateManager.setState({ cart: [] });
  },

  // Checkout and order creation
  async processCheckout(paymentMethod) {
    const state = stateManager.getState();

    if (state.cart.length === 0) return null;
    if (!state.currentUser) {
      throw new Error('User must be authenticated to checkout');
    }

    const dropoff = state.dropoffLocations.find(l => l.id === state.selectedDropoffId) || state.dropoffLocations[0];

    let subtotal = 0;
    const orderItems = [];
    const menus = [...state.menus];

    // Calculate & update quota
    state.cart.forEach(item => {
      const menu = menus.find(m => m.id === item.menuId);
      if (menu) {
        menu.orderedCount = Math.min(menu.maxQuota, menu.orderedCount + item.qty);
        const itemTotal = menu.price * item.qty;
        subtotal += itemTotal;
        orderItems.push({
          menuId: menu.id,
          name: menu.name,
          qty: item.qty,
          price: menu.price,
          partnerName: menu.partnerName,
          notes: item.notes || ''
        });
      }
    });

    const platformFee = FEES.platform_fee;
    const totalPayment = subtotal + platformFee;

    const orderId = generateOrderId();
    const pickupCode = generatePickupCode(dropoff.id);

    const newOrder = {
      id: orderId,
      pickupCode,
      userId: state.currentUser.id,
      customerName: state.currentUser.name,
      customerEmail: state.currentUser.email,
      customerPhone: state.currentUser.phone,
      timestamp: new Date().toISOString(),
      status: ORDER_STATUS.VERIFIED,
      items: orderItems,
      facultyId: dropoff.id,
      facultyName: dropoff.name,
      dropoffPoint: dropoff.point,
      deliveryTime: state.deliveryTargetTime,
      subtotal,
      platformFee,
      totalPayment,
      paymentMethod: (paymentMethod || 'QRIS').toUpperCase(),
      notes: state.cart.map(c => c.notes).filter(Boolean).join('; '),
      isPaid: true
    };

    // Save to Supabase
    try {
      const supabase = getSupabase();
      if (supabase) {
        console.log('Saving order to database...', newOrder.id);

        const { data, error } = await supabase
          .from('orders')
          .insert([{
            id: newOrder.id,
            user_id: newOrder.userId,
            pickup_code: newOrder.pickupCode,
            customer_name: newOrder.customerName,
            customer_email: newOrder.customerEmail,
            customer_phone: newOrder.customerPhone,
            status: newOrder.status,
            items: newOrder.items,
            faculty_id: newOrder.facultyId,
            faculty_name: newOrder.facultyName,
            dropoff_point: newOrder.dropoffPoint,
            delivery_time: newOrder.deliveryTime,
            subtotal: newOrder.subtotal,
            platform_fee: newOrder.platformFee,
            total_payment: newOrder.totalPayment,
            payment_method: newOrder.paymentMethod,
            notes: newOrder.notes,
            is_paid: newOrder.isPaid,
            created_at: newOrder.timestamp,
          }])
          .select();

        if (error) {
          console.error('Error saving order to database:', error);
          throw error;
        }

        console.log('✓ Order saved successfully to database:', data);

        // Update menu quotas in database
        for (const item of orderItems) {
          const menu = menus.find(m => m.id === item.menuId);
          if (menu) {
            const { error: menuError } = await supabase
              .from('menus')
              .update({ ordered_count: menu.orderedCount })
              .eq('id', menu.id);

            if (menuError) {
              console.error('Error updating menu quota:', menuError);
            } else {
              console.log('✓ Menu quota updated:', menu.id, '→', menu.orderedCount);
            }
          }
        }
      } else {
        console.warn('Supabase not configured, order not saved to database');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Gagal menyimpan pesanan: ' + error.message);
    }

    // Update local state
    const allOrders = [newOrder, ...state.allOrders];

    stateManager.setState({
      activeOrder: newOrder,
      allOrders,
      cart: [],
      menus
    });

    return newOrder;
  },

  // Order status management
  async advanceOrderStatus(newStatus) {
    const state = stateManager.getState();
    if (!state.activeOrder) return;

    const activeOrder = { ...state.activeOrder, status: newStatus };
    const allOrders = state.allOrders.map(o =>
      o.id === activeOrder.id ? { ...o, status: newStatus } : o
    );

    // Update status in database
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', activeOrder.id);

        if (error) {
          console.error('Error updating order status in database:', error);
        } else {
          console.log('✓ Order status updated in database:', activeOrder.id, newStatus);
        }
      }
    } catch (error) {
      console.error('Exception updating order status:', error);
    }

    if (newStatus === ORDER_STATUS.PICKED_UP) {
      // Move to history
      const historyItem = {
        id: activeOrder.id,
        pickupCode: activeOrder.pickupCode,
        date: new Date(activeOrder.timestamp).toLocaleDateString('id-ID'),
        items: activeOrder.items,
        facultyName: activeOrder.dropoffPoint,
        totalPayment: activeOrder.totalPayment,
        status: ORDER_STATUS.PICKED_UP,
        rating: 0,
        reviewText: ''
      };

      stateManager.setState({
        activeOrder: null,
        allOrders,
        orderHistory: [historyItem, ...state.orderHistory]
      });
    } else {
      stateManager.setState({ activeOrder, allOrders });
    }
  },

  async setAdminBroadcastStatus(newStatus) {
    const state = stateManager.getState();

    // Get all orders that are not picked up
    const ordersToUpdate = state.allOrders.filter(o => o.status !== ORDER_STATUS.PICKED_UP);

    // Update status in database for all active orders
    try {
      const supabase = getSupabase();
      if (supabase && ordersToUpdate.length > 0) {
        const orderIds = ordersToUpdate.map(o => o.id);

        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .in('id', orderIds)
          .neq('status', 'picked_up');

        if (error) {
          console.error('Error broadcasting status to database:', error);
        } else {
          console.log('✓ Status broadcasted to database:', ordersToUpdate.length, 'orders →', newStatus);
        }
      }
    } catch (error) {
      console.error('Exception broadcasting status:', error);
    }

    // Update local state
    if (state.activeOrder) {
      stateManager.setState({
        activeOrder: { ...state.activeOrder, status: newStatus }
      });
    }

    const allOrders = state.allOrders.map(o =>
      o.status !== ORDER_STATUS.PICKED_UP ? { ...o, status: newStatus } : o
    );

    stateManager.setState({ allOrders });
  },

  // Reviews
  submitOrderReview(orderId, rating, reviewText) {
    const state = stateManager.getState();
    const orderHistory = state.orderHistory.map(o =>
      o.id === orderId ? { ...o, rating, reviewText: reviewText || o.reviewText } : o
    );
    stateManager.setState({ orderHistory });
  },

  // Menu management (partner)
  updatePartnerMenuFull(menuId, data) {
    const state = stateManager.getState();
    const menus = state.menus.map(menu => {
      if (menu.id === menuId) {
        return {
          ...menu,
          name: data.name || menu.name,
          price: data.price !== undefined ? parseInt(data.price, 10) : menu.price,
          maxQuota: data.maxQuota !== undefined ? parseInt(data.maxQuota, 10) : menu.maxQuota,
          packageItems: data.packageItems || menu.packageItems,
          allergens: data.allergens !== undefined ? data.allergens : menu.allergens,
          isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : menu.isAvailable
        };
      }
      return menu;
    });

    stateManager.setState({ menus });
  },

  // Partner profile
  updatePartnerProfile(data) {
    const state = stateManager.getState();
    stateManager.setState({
      partnerProfile: { ...state.partnerProfile, ...data }
    });
  },

  // Packaging checklist
  togglePackagingChecklist(key) {
    const state = stateManager.getState();
    const packagingChecklist = { ...state.packagingChecklist };

    if (packagingChecklist[key] !== undefined) {
      packagingChecklist[key] = !packagingChecklist[key];
      stateManager.setState({ packagingChecklist });
    }
  },

  // Payout
  requestPayoutSimulation(amount, net, fee) {
    const state = stateManager.getState();
    const id = `WD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const newPayout = {
      id,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount,
      fee,
      net,
      bank: `${state.partnerProfile.bankName} - ${state.partnerProfile.accountNumber}`,
      status: 'Berhasil Ditransfer'
    };

    stateManager.setState({
      payoutHistory: [newPayout, ...state.payoutHistory]
    });

    return newPayout;
  },

  // Load menus from database or use sample data
  async loadMenus(includeInactive = false) {
    // Try to load from Supabase first
    try {
      const supabase = getSupabase();
      if (supabase) {
        let query = supabase.from('menus').select('*');

        // Only filter by is_available if not including inactive
        if (!includeInactive) {
          query = query.eq('is_available', true);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error loading menus from Supabase:', error);
        }

        if (!error && data && data.length > 0) {
          // Transform snake_case database fields to camelCase frontend format
          const menus = data.map(menu => ({
            id: menu.id,
            name: menu.name,
            partnerId: menu.partner_id || 'partner-unknown',
            partnerName: menu.partner_name || 'Mitra UMKM',
            rating: 4.5,
            reviewCount: 0,
            price: menu.price,
            image: menu.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            description: menu.description || menu.name,
            packageItems: menu.package_items || [],
            allergens: '',
            maxQuota: menu.max_quota || 50,
            orderedCount: menu.ordered_count || 0,
            isAvailable: menu.is_available !== false
          }));

          console.log('Loaded menus from Supabase:', menus.length);
          stateManager.setState({ menus });
          return;
        } else {
          console.warn('No menus found in database, loading sample data');
        }
      }
    } catch (error) {
      console.error('Exception loading menus from database:', error);
    }

    // Fallback to sample data
    this.loadSampleMenus();
  },

  async loadOrders() {
    // Load orders from Supabase
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading orders from Supabase:', error);
          return;
        }

        if (data && data.length > 0) {
          // Transform to frontend format
          const orders = data.map(order => ({
            id: order.id,
            pickupCode: order.pickup_code,
            customerName: order.customer_name,
            customerId: order.user_id,
            facultyId: order.faculty_id,
            dropoffPoint: order.dropoff_point,
            items: order.items, // Already JSONB
            totalPayment: order.total_payment,
            paymentMethod: order.payment_method,
            status: order.status,
            createdAt: order.created_at
          }));

          console.log('Loaded orders from Supabase:', orders.length);
          stateManager.setState({ allOrders: orders });
          return;
        }
      }
    } catch (error) {
      console.error('Exception loading orders:', error);
    }

    // No orders yet
    stateManager.setState({ allOrders: [] });
  },

  loadSampleMenus() {
    const sampleMenus = [
      {
        id: 'menu-1',
        name: 'Ayam Bakar Madu Pedas',
        partnerId: 'partner-bu-sri',
        partnerName: 'Dapur Bu Sri (Pogung)',
        rating: 4.9,
        reviewCount: 142,
        price: 18000,
        image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=700&q=80',
        description: 'Ayam ungkep bumbu rempah bakar madu dengan rasa gurih manis pedas meresap sempurna.',
        packageItems: ['Nasi Putih Pulen', 'Ayam Bakar Madu 1 Potong', 'Tahu & Tempe Bacem', 'Lalapan Segar', 'Sambal Bawang Pedas'],
        allergens: 'Mengandung kedelai, madu, terasi.',
        maxQuota: 45,
        orderedCount: 0,
        isAvailable: true
      },
      {
        id: 'menu-2',
        name: 'Nasi Cumi Hitam Madura & Serundeng',
        partnerId: 'partner-bu-nur',
        partnerName: 'Warung Bu Nur Nusantara',
        rating: 4.85,
        reviewCount: 98,
        price: 22000,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80',
        description: 'Cumi segar dimasak tinta hitam kaya rempah aromatik, disajikan dengan serundeng kelapa sangrai wangi.',
        packageItems: ['Nasi Daun Jeruk', 'Cumi Hitam Gurih', 'Serundeng Kelapa Sangrai', 'Peyek Udang Renyah', 'Sambal Korek'],
        allergens: 'Mengandung seafood (cumi, udang).',
        maxQuota: 35,
        orderedCount: 0,
        isAvailable: true
      },
    ];

    stateManager.setState({ menus: sampleMenus });
  },
};
