# 🍽️ UNUFood - Platform Pre-Order Makan Siang Kampus

Platform pre-order makan siang berbasis web yang menghubungkan mahasiswa dengan UMKM katering lokal di kampus UNU (Universitas Nahdlatul Ulama).

## ✨ Fitur Utama

### 👨‍🎓 Aplikasi Mahasiswa
- 🔐 Login dengan Email/Password atau Google OAuth
- 📱 Browse katalog menu harian
- 🛒 Shopping cart dengan notes & pilih lokasi drop-off
- 💳 Checkout dengan QRIS/E-Wallet
- 📦 Order tracking real-time
- 👤 Manajemen profil (nama, HP, fakultas, semester, kelas)
- 🔑 Ganti password

### 🏪 Dashboard Partner (UMKM)
- 📊 CRUD Menu lengkap (Create, Read, Update, Delete, Toggle aktif/nonaktif)
- 📈 Matriks produksi per fakultas
- 🏷️ Cetak label packaging
- 💰 Laporan keuangan & komisi
- 🎯 Broadcast status pesanan

## 🚀 Quick Start

### Prerequisites
- Python 3.x (untuk local server)
- Akun Supabase (gratis)
- Browser modern (Chrome/Firefox/Edge)

### 1. Clone/Download Project
```bash
git clone <repository-url>
cd unufood
```

### 2. Setup Supabase
Ikuti panduan lengkap di [QUICK-START.md](QUICK-START.md)

### 3. Jalankan Server
**Windows:**
```bash
.\start-dev.bat
```

**Mac/Linux:**
```bash
python3 -m http.server 8000
```

### 4. Buka Aplikasi
- **Customer App**: http://localhost:8000/public/index.html
- **Partner Dashboard**: http://localhost:8000/public/admin.html

## 📁 Struktur Project

```
unufood/
├── public/                    # File HTML
│   ├── index.html            # Customer app (mahasiswa)
│   ├── admin.html            # Partner dashboard (UMKM)
│   └── index-redirect.html   # OAuth callback handler
├── src/                      # Source code modular
│   ├── auth/                 # Authentication
│   │   ├── auth.js          # Auth manager
│   │   └── supabase.js      # Supabase client
│   ├── config/              # Configuration
│   │   └── constants.js     # App constants
│   ├── store/               # State management
│   │   ├── state.js         # State manager
│   │   └── actions.js       # Actions & database operations
│   ├── ui/                  # UI components
│   │   ├── cart.js          # Shopping cart
│   │   ├── checkout.js      # Checkout modal
│   │   └── components.js    # Reusable components
│   └── utils/               # Utilities
│       └── formatters.js    # Format helpers
├── app.js                    # Customer app entry point
├── admin-app.js             # Partner dashboard entry point
├── styles.css               # Global styles
├── start-dev.bat            # Windows quick start
├── start-dev.sh             # Mac/Linux quick start
├── package.json             # Project metadata
├── README.md                # This file
├── QUICK-START.md           # Setup guide
└── CHANGELOG.md             # Version history
```

## 🔧 Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Authentication**: Supabase Auth (Email + Google OAuth)
- **Database**: PostgreSQL dengan Row Level Security (RLS)
- **Hosting**: Static hosting (Vercel/Netlify/Niagahoster)

## 🎯 Default Accounts

### Customer (Mahasiswa)
- Email: test@student.unu.ac.id
- Password: (set saat pertama login)

### Partner (UMKM)
- Email: wafi@student.unu.ac.id
- Password: (password Anda)
- Role: partner

## 📊 Database Schema

### Tables
- **users**: User profiles (mahasiswa & partner)
- **menus**: Menu items dari partner
- **orders**: Order transactions

Detail schema ada di [QUICK-START.md](QUICK-START.md)

## 🔐 Security

- ✅ Row Level Security (RLS) enabled
- ✅ JWT-based authentication
- ✅ HTTPS only (production)
- ✅ Input validation & sanitization
- ✅ XSS protection

## 🚀 Deployment

### Option 1: Vercel (Recommended - Free)
```bash
npm install -g vercel
vercel --prod
```

### Option 2: Netlify (Free)
- Drag & drop `public/` folder
- Deploy!

### Option 3: Niagahoster (Shared Hosting)
- Upload semua file via cPanel
- Point domain ke public_html

**Jangan lupa update:**
- Google OAuth redirect URL
- Supabase allowed domains

## 📝 Environment Variables

File `index.html` dan `admin.html` sudah configured dengan:
```javascript
window.ENV = {
  SUPABASE_URL: 'https://qdgbjjtichoirqiqqngv.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGc...'
};
```

## 🤝 Contributing

Project ini dibuat untuk kampus UNU. Contributions welcome!

## 📄 License

MIT License - Free to use and modify

## 👨‍💻 Developer

Developed with ❤️ for UNU Community

---

**🎉 Happy Coding!**
