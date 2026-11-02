# 🚀 Deployment ke Vercel

## Prerequisites
- Akun Vercel (gratis di [vercel.com](https://vercel.com))
- Akun Supabase dengan project yang sudah dikonfigurasi
- Git repository (GitHub, GitLab, atau Bitbucket)

## Langkah 1: Install Vercel CLI (Opsional)
```bash
npm install -g vercel
```

## Langkah 2: Deploy via Vercel Dashboard (Cara Termudah)

### A. Push ke Git Repository
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### B. Import Project di Vercel
1. Buka [vercel.com/new](https://vercel.com/new)
2. Klik **"Import Git Repository"**
3. Pilih repository **unufood**
4. Klik **"Import"**

### C. Konfigurasi Project
Vercel akan otomatis mendeteksi sebagai static site. Pastikan:
- **Framework Preset**: Other
- **Root Directory**: `./` (default)
- **Build Command**: (kosongkan atau `echo 'Static site'`)
- **Output Directory**: `public`

### D. Setup Environment Variables
Sebelum deploy, tambahkan environment variables:

1. Di halaman konfigurasi project, scroll ke **"Environment Variables"**
2. Tambahkan variabel berikut:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Penting**: Dapatkan nilai ini dari [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API

3. Klik **"Deploy"**

## Langkah 3: Deploy via Vercel CLI (Alternatif)

```bash
# Login ke Vercel
vercel login

# Deploy (dari root folder project)
vercel

# Ikuti prompt:
# - Set up and deploy? Yes
# - Which scope? Pilih akun Anda
# - Link to existing project? No
# - Project name? unufood (atau nama lain)
# - In which directory is your code? ./
# - Want to override settings? No

# Setelah deploy, tambahkan environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY

# Deploy production
vercel --prod
```

## Langkah 4: Konfigurasi Domain (Opsional)

1. Di Vercel Dashboard, buka project **unufood**
2. Pergi ke tab **"Settings"** → **"Domains"**
3. Tambahkan custom domain Anda
4. Ikuti instruksi DNS configuration

## Langkah 5: Update Supabase Settings

Setelah deploy, update Supabase configuration:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Pergi ke **Authentication** → **URL Configuration**
4. Tambahkan Vercel URL ke **Site URL** dan **Redirect URLs**:
   ```
   https://unufood.vercel.app
   https://unufood.vercel.app/**
   ```

## Verifikasi Deployment

Setelah deployment selesai:
- ✅ Buka URL yang diberikan Vercel (misal: `https://unufood.vercel.app`)
- ✅ Cek apakah halaman loading dengan benar
- ✅ Test login/register functionality
- ✅ Cek console browser untuk error

## Troubleshooting

### Error: Environment variables tidak terbaca
**Solusi**: Pastikan environment variables sudah ditambahkan di Vercel Dashboard dan redeploy:
```bash
vercel --prod
```

### Error: 404 Not Found
**Solusi**: Pastikan `vercel.json` sudah benar dan `outputDirectory` mengarah ke `public`

### Error: Supabase connection failed
**Solusi**: 
1. Cek apakah SUPABASE_URL dan SUPABASE_ANON_KEY benar
2. Cek di browser console untuk error message
3. Pastikan Supabase project aktif

### Error: CORS issues
**Solusi**: Tambahkan Vercel URL ke Supabase allowed origins:
- Supabase Dashboard → Project Settings → API → CORS

## Automatic Deployments

Vercel akan otomatis deploy setiap kali Anda push ke:
- **Main/Master branch** → Production deployment
- **Other branches** → Preview deployment

## Monitor Deployment

- **Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Logs**: Buka project → Deployments → Klik deployment → Function Logs
- **Analytics**: Tab Analytics untuk monitor traffic

## Rollback Deployment

Jika terjadi masalah:
1. Buka Vercel Dashboard → Project → Deployments
2. Pilih deployment sebelumnya yang stable
3. Klik **"..."** → **"Promote to Production"**

## Update Application

Untuk update aplikasi:
```bash
# Edit files
git add .
git commit -m "Update: description"
git push origin main

# Vercel akan otomatis deploy
```

---

**🎉 Selamat! Aplikasi UNUFood Anda sekarang live di Vercel!**

Untuk bantuan lebih lanjut, kunjungi [Vercel Documentation](https://vercel.com/docs)
