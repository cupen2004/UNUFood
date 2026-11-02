# 🚀 Quick Deploy ke Vercel

## Langkah Cepat (5 Menit)

### 1️⃣ Push ke GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin master
```

### 2️⃣ Deploy ke Vercel
1. Buka **[vercel.com/new](https://vercel.com/new)**
2. Login dengan GitHub
3. Klik **"Import"** pada repository unufood
4. **JANGAN UBAH APAPUN** - setting sudah otomatis dari vercel.json
5. Klik **"Deploy"** 🚀

### 3️⃣ Update Supabase (Setelah Deploy Selesai)
1. Buka **[supabase.com/dashboard](https://supabase.com/dashboard)**
2. Pilih project → **Authentication** → **URL Configuration**
3. Update **Site URL** dengan URL Vercel Anda (misal: `https://unufood-xyz.vercel.app`)
4. Tambahkan ke **Redirect URLs**:
   ```
   https://unufood-xyz.vercel.app
   https://unufood-xyz.vercel.app/**
   ```

### ✅ Selesai!
Website Anda sekarang live di Vercel!

---

## 🔍 Cek Hasil Deploy
- Website: URL yang diberikan Vercel
- Admin Panel: `https://your-url.vercel.app/admin.html`

## ❓ Troubleshooting

**Login Google tidak berfungsi?**
→ Pastikan URL Vercel sudah ditambahkan di Supabase Redirect URLs

**404 Error?**
→ Cek apakah file ada di folder `public/`

**Perlu bantuan?**
→ Lihat file `DEPLOYMENT.md` untuk dokumentasi lengkap
