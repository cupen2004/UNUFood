#!/bin/bash
# Quick start script for UNUFood development

echo "🚀 Starting UNUFood Development Server..."
echo ""
echo "📋 Checklist:"
echo "  ✓ Struktur modular sudah siap"
echo "  ✓ Authentication system ready"
echo "  ✓ Cart & Checkout implemented"
echo "  ✓ Partner dashboard ready"
echo ""
echo "⚠️  Before starting:"
echo "  1. Setup Supabase credentials di public/index.html"
echo "  2. Run SQL script di Supabase Dashboard"
echo "  3. Enable Google OAuth"
echo ""
echo "🌐 Starting server on http://localhost:8000"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo "❌ Python not found. Please install Python first."
    exit 1
fi
