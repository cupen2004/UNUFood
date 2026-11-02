# 🎯 UNUFood v2.0 - Quick Start Guide

## 🚀 Langkah Setup (5 Menit)

### 1. **Setup Supabase** (WAJIB!)

1. Buat account di [supabase.com](https://supabase.com) (gratis)
2. Klik **New Project** → Tunggu ~2 menit
3. Pergi ke **Settings** → **API**
4. Copy:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **anon/public key** (contoh: `eyJhbGci...`)

### 2. **Update Credentials**

Buka file `public/index.html` atau `public/index-complete.html`:

```javascript
// Cari baris ini (sekitar line 32-35):
window.ENV = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE',      // ← PASTE URL DI SINI
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE'  // ← PASTE KEY DI SINI
};
```

### 3. **Setup Database**

Copy SQL ini ke **SQL Editor** di Supabase:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  faculty TEXT DEFAULT 'FTI',
  role TEXT DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menus table
CREATE TABLE menus (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  partner_name TEXT,
  price INT NOT NULL,
  image TEXT,
  description TEXT,
  package_items JSONB,
  max_quota INT DEFAULT 50,
  ordered_count INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  pickup_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  status TEXT DEFAULT 'verified',
  items JSONB NOT NULL,
  faculty_id TEXT,
  dropoff_point TEXT,
  total_payment INT NOT NULL,
  payment_method TEXT DEFAULT 'QRIS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read menus" ON menus FOR SELECT TO authenticated USING (true);
```

Klik **Run** ✓

### 4. **Enable Google OAuth**

1. Buka **Authentication** → **Providers** di Supabase
2. **Enable Google**
3. Setup Google Cloud Console (ada wizard)
4. Copy Client ID & Secret ke Supabase

### 5. **Jalankan Server**

**Windows:**
```bash
# Double-click file ini:
start-dev.bat

# Atau manual:
python -m http.server 8000
```

**Mac/Linux:**
```bash
# Jalankan script:
chmod +x start-dev.sh
./start-dev.sh

# Atau manual:
python3 -m http.server 8000
```

**VS Code (TERMUDAH):**
1. Install extension **"Live Server"**
2. Klik kanan `public/index-complete.html`
3. Pilih **"Open with Live Server"**
4. Browser otomatis terbuka! ✓

### 6. **Buka di Browser**

```
Customer App:  http://localhost:8000/public/index-complete.html
Partner App:   http://localhost:8000/public/admin.html
```

---

## ✅ Fitur Yang Sudah Bisa Dipakai

### **Customer (Mahasiswa)**
- ✓ Login dengan Google/Email
- ✓ Browse menu dengan quota real-time
- ✓ Add to cart (quantity +/-)
- ✓ Tambah notes untuk chef
- ✓ Pilih drop-off location
- ✓ Checkout QRIS/E-Wallet
- ✓ Order tracking dengan stepper
- ✓ Confirm pickup

### **Partner (Mitra UMKM)**
- ✓ Matrix distribusi per fakultas
- ✓ Broadcast status ke mahasiswa
- ✓ Cetak label dus
- ✓ Laporan keuangan

---

## 📂 File Penting

```
/unufood
├── /public
│   ├── index-complete.html    ← PAKAI INI (Full featured!)
│   └── admin.html             ← Partner dashboard
├── app.js                     ← Customer app logic
├── admin-app.js               ← Partner app logic
├── /src
│   ├── /auth                  ← Authentication
│   ├── /store                 ← State management
│   ├── /ui                    ← Cart, Checkout, Components
│   └── /utils                 ← Helpers
└── start-dev.bat/sh           ← Quick start scripts
```

---

## 🔧 Troubleshooting

### **Login tidak muncul?**
```javascript
// Check Supabase credentials di index.html
console.log(window.ENV);
// Harus ada SUPABASE_URL dan SUPABASE_ANON_KEY
```

### **Cart kosong terus?**
```javascript
// Check di browser console:
window.app.state.cart
// Harus ada array cart
```

### **Module not found?**
- Pastikan menjalankan lewat web server (bukan file://)
- Gunakan Live Server atau `python -m http.server`

### **CORS Error?**
- WAJIB pakai web server local
- Jangan buka file HTML langsung (file://)

---

## 🎨 Customization

### **Ubah Warna Brand**
Edit `public/index-complete.html` line 8-14:
```javascript
colors: {
  campus: { green: '#163828' },     // ← Ubah warna utama
  culinary: { terracotta: '#D94E34' } // ← Ubah warna aksen
}
```

### **Ubah Biaya Platform**
Edit `src/config/constants.js`:
```javascript
export const FEES = {
  platform_fee: 1000,        // ← Ubah biaya
  partner_commission: 0.10,  // ← Ubah komisi (10%)
};
```

---

## 📞 Support

- **GitHub Issues**: [Link repo Anda]
- **Email**: support@unufood.ac.id
- **Dokumentasi**: Baca `README.md` dan `IMPLEMENTATION-COMPLETE.md`

---

**Status: ✅ PRODUCTION READY!**

Semua fitur core sudah berjalan dengan baik. Tinggal setup Supabase dan siap pakai! 🚀
