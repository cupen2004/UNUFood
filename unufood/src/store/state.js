// UNUFood - State Management
// Centralized reactive store with localStorage persistence

import { APP_CONFIG, DROPOFF_LOCATIONS, ORDER_STATUS } from '../config/constants.js';

const INITIAL_STATE = {
  // Auth & User
  isAuthenticated: false,
  currentUser: null,

  // UI State
  activeRole: 'customer', // 'customer' | 'partner'
  partnerSubTab: 'orders',

  // Operational Simulation
  isSimulationOpen: true,
  simulatedSecondsLeft: 4860,
  deliveryTargetTime: '11:30 WIB',

  // Drop-off Campus Locations
  dropoffLocations: DROPOFF_LOCATIONS,

  // Menus (will be loaded from Supabase)
  menus: [],

  // Cart
  cart: [],
  selectedDropoffId: 'FTI',
  selectedPaymentMethod: 'qris',

  // Active Order
  activeOrder: null,

  // Orders List (for partner view)
  allOrders: [],

  // Order History
  orderHistory: [],

  // Partner Profile
  partnerProfile: null,

  // Weekly Rotation
  rotationSchedule: [],

  // Packaging Checklist
  packagingChecklist: {
    allCooked: false,
    containersSealed: false,
    labelsApplied: false,
    courierHandoverDone: false
  },

  // Payout History
  payoutHistory: []
};

class StateManager {
  constructor() {
    this.state = this.loadState();
    this.subscribers = [];
    this.startCountdownTimer();
    this.initCrossTabSync();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(APP_CONFIG.storage_key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATE,
          ...parsed,
          // Don't persist authentication state in localStorage
          isAuthenticated: false,
          currentUser: null,
        };
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  saveState() {
    try {
      // Don't save sensitive auth data
      const { isAuthenticated, currentUser, ...stateToSave } = this.state;
      localStorage.setItem(APP_CONFIG.storage_key, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
    this.notify();
  }

  initCrossTabSync() {
    window.addEventListener('storage', (e) => {
      if (e.key === APP_CONFIG.storage_key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.state = { ...this.state, ...parsed };
          this.notify();
        } catch (err) {
          console.warn('Cross-tab sync parse error:', err);
        }
      }
    });
  }

  subscribe(fn) {
    this.subscribers.push(fn);
  }

  notify() {
    this.subscribers.forEach(fn => fn(this.state));
  }

  startCountdownTimer() {
    setInterval(() => {
      if (this.state.isSimulationOpen && this.state.simulatedSecondsLeft > 0) {
        this.state.simulatedSecondsLeft--;
        this.notify();
      }
    }, 1000);
  }

  // Get current state
  getState() {
    return this.state;
  }

  // Update state
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.saveState();
  }

  // Reset to initial state
  reset() {
    localStorage.removeItem(APP_CONFIG.storage_key);
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.saveState();
  }
}

// Export singleton
export const stateManager = new StateManager();
export { INITIAL_STATE };
