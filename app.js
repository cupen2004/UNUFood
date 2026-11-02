// UNUFood - Main Application Entry Point
// Initializes auth, state, and UI

import { authManager } from './src/auth/auth.js';
import { stateManager } from './src/store/state.js';
import { actions } from './src/store/actions.js';
import { cartUI } from './src/ui/cart.js';
import { checkoutUI } from './src/ui/checkout.js';
import { uiComponents } from './src/ui/components.js';
import { formatRp } from './src/utils/formatters.js';

class UNUFoodApp {
  constructor() {
    this.loginModal = document.getElementById('login-modal');
    this.mainApp = document.getElementById('main-app');
    this.state = stateManager.getState();
    this.initializeApp();
  }

  async initializeApp() {
    console.log('Initializing UNUFood App...');

    // Initialize authentication
    await authManager.initialize();

    // Listen for auth state changes
    authManager.onAuthStateChange(async ({ isAuthenticated, user }) => {
      console.log('Auth state:', isAuthenticated, user);

      if (isAuthenticated) {
        // Check if user is partner/admin, redirect to admin dashboard
        if (user.role === 'partner' || user.role === 'admin') {
          console.log('Partner/Admin detected, redirecting to dashboard...');
          window.location.href = '/public/admin.html';
          return;
        }

        this.showMainApp();
        actions.setAuth(isAuthenticated, user);
        this.updateUserUI(user);

        // Load menus after successful login
        await actions.loadMenus();
      } else {
        this.showLoginModal();
      }
    });

    // Setup UI event listeners
    this.setupEventListeners();

    // Subscribe to state changes
    stateManager.subscribe((state) => {
      this.state = state;
      this.render(state);
    });

    // Make checkoutUI available globally
    window.checkoutUI = checkoutUI;

    // Initial render
    this.render(stateManager.getState());
  }

  showLoginModal() {
    if (this.loginModal) {
      this.loginModal.classList.remove('hidden');
    }
    if (this.mainApp) {
      this.mainApp.classList.add('hidden');
    }
  }

  showMainApp() {
    if (this.loginModal) {
      this.loginModal.classList.add('hidden');
    }
    if (this.mainApp) {
      this.mainApp.classList.remove('hidden');
    }
  }

  updateUserUI(user) {
    // Update user avatar
    const avatar = document.getElementById('user-avatar');
    if (avatar && user) {
      const initials = user.name ? user.name.substring(0, 2).toUpperCase() : '?';
      avatar.textContent = initials;

      // If user has Google avatar, use it
      if (user.avatar) {
        avatar.style.backgroundImage = `url(${user.avatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.textContent = '';
      }
    }

    // Update user name
    const nameEl = document.getElementById('nav-user-name');
    if (nameEl && user) {
      nameEl.textContent = user.name.split(' ')[0];
    }
  }

  setupEventListeners() {
    // Google Sign In
    const btnGoogleSignIn = document.getElementById('btn-google-signin');
    if (btnGoogleSignIn) {
      btnGoogleSignIn.addEventListener('click', async () => {
        try {
          await authManager.signInWithGoogle();
        } catch (error) {
          console.error('Google sign in error:', error);
          this.showToast('Gagal masuk dengan Google. Coba lagi.');
        }
      });
    }

    // Email Sign In
    const formEmailSignIn = document.getElementById('form-email-signin');
    if (formEmailSignIn) {
      formEmailSignIn.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('input-signin-email').value;
        const password = document.getElementById('input-signin-password').value;

        try {
          await authManager.signInWithEmail(email, password);
          this.showToast('Berhasil masuk!');
        } catch (error) {
          console.error('Email sign in error:', error);
          this.showToast('Email atau password salah.');
        }
      });
    }

    // Sign Out
    const btnSignOut = document.getElementById('btn-signout');
    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        if (confirm('Yakin ingin keluar?')) {
          try {
            await authManager.signOut();
            this.showToast('Berhasil keluar.');
          } catch (error) {
            console.error('Sign out error:', error);
          }
        }
      });
    }

    // Open Profile Modal
    const btnOpenProfile = document.getElementById('btn-open-profile');
    if (btnOpenProfile) {
      btnOpenProfile.addEventListener('click', () => {
        this.openProfileModal();
      });
    }

    // Profile Form Submit
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleProfileUpdate();
      });
    }

    // Password Form Submit
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handlePasswordChange();
      });
    }

    // Cart is handled by cartUI module
  }

  render(state) {
    this.renderOperationalBanner(state);
    this.renderActiveOrderTicket(state);
    this.renderMenuGrid(state);

    // Render cart UI
    cartUI.render(state);
  }

  renderOperationalBanner(state) {
    const container = document.getElementById('customer-live-banner');
    if (container) {
      container.innerHTML = uiComponents.renderOperationalBanner(state);
    }
  }

  renderActiveOrderTicket(state) {
    const container = document.getElementById('active-ticket-section');
    if (!container) return;

    if (state.activeOrder && state.activeOrder.status !== 'picked_up') {
      container.classList.remove('hidden');
      container.innerHTML = uiComponents.renderActiveOrderTicket(state.activeOrder);
    } else {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
  }

  renderMenuGrid(state) {
    const container = document.getElementById('daily-menu-grid');
    if (!container) return;

    if (!state.menus || state.menus.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-stone-500">
          <p class="text-sm font-medium">Memuat menu...</p>
        </div>
      `;
      return;
    }

    let html = '';
    state.menus.forEach(menu => {
      html += uiComponents.renderMenuCard(menu, state);
    });

    container.innerHTML = html;
  }

  showToast(message) {
    uiComponents.showToast(message);
  }

  // Profile Management Methods
  openProfileModal() {
    const modal = document.getElementById('profile-modal');
    const state = stateManager.getState();
    const user = state.currentUser;

    if (modal && user) {
      // Populate form with current user data
      document.getElementById('profile-name').value = user.name || '';
      document.getElementById('profile-phone').value = user.phone || '';
      document.getElementById('profile-faculty').value = user.faculty || 'FTI';
      document.getElementById('profile-semester').value = user.semester || '5';
      document.getElementById('profile-kelas').value = user.kelas || 'A';

      modal.classList.remove('hidden');
    }
  }

  closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
      modal.classList.add('hidden');
      // Reset password form
      document.getElementById('password-form').reset();
    }
  }

  async handleProfileUpdate() {
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const faculty = document.getElementById('profile-faculty').value;
    const semester = document.getElementById('profile-semester').value;
    const kelas = document.getElementById('profile-kelas').value;

    const state = stateManager.getState();
    const user = state.currentUser;

    try {
      const supabase = authManager.supabase;
      const { error } = await supabase
        .from('users')
        .update({
          name,
          phone,
          faculty,
          semester,
          kelas
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      const updatedUser = { ...user, name, phone, faculty, semester, kelas };
      actions.setAuth(true, updatedUser);

      // Update UI
      this.updateUserUI(updatedUser);

      this.showToast('Profil berhasil diupdate!');
    } catch (error) {
      console.error('Error updating profile:', error);
      this.showToast('Gagal mengupdate profil: ' + error.message);
    }
  }

  async handlePasswordChange() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate
    if (newPassword !== confirmPassword) {
      this.showToast('Password baru tidak cocok!');
      return;
    }

    if (newPassword.length < 6) {
      this.showToast('Password minimal 6 karakter!');
      return;
    }

    try {
      const supabase = authManager.supabase;

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      this.showToast('Password berhasil diubah!');
      document.getElementById('password-form').reset();
      this.closeProfileModal();
    } catch (error) {
      console.error('Error changing password:', error);
      this.showToast('Gagal mengubah password: ' + error.message);
    }
  }
}

// Global functions for inline event handlers
window.addToCart = (menuId) => {
  const result = actions.addToCart(menuId);
  if (result.success) {
    app.showToast('Menu ditambahkan ke keranjang!');
  } else {
    app.showToast(result.reason);
  }
};

window.updateCart = (menuId, delta) => {
  actions.updateCartQty(menuId, delta);
};

window.updateCartItemNote = (menuId, notes) => {
  actions.updateCartNotes(menuId, notes);
};

window.removeCartItem = (menuId) => {
  actions.removeFromCart(menuId);
  app.showToast('Item dihapus dari keranjang');
};

window.confirmOrderPickedUp = () => {
  if (confirm('Konfirmasi bahwa makanan telah Anda ambil di drop-off?')) {
    actions.advanceOrderStatus('picked_up');
    app.showToast('Pesanan selesai! Terima kasih.');
  }
};

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new UNUFoodApp();
  window.app = app; // Make available globally for debugging
});

export { UNUFoodApp };
