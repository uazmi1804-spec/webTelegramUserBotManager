#!/bin/bash

# Termux Setup Script for Node.js, Python, and Redis Project

# --- 1. Fungsi Instalasi Termux ---
install_termux_packages() {
  echo "--- Memulai pembaruan dan instalasi paket Termux ---"
  
  # Perbarui daftar paket dan instal paket inti
  pkg update -y
  
  # Daftar paket yang dibutuhkan: nodejs, python (untuk python3), dan redis
  local packages="nodejs python redis"
  
  echo "⏳ Menginstal paket yang diperlukan: $packages..."
  if pkg install -y $packages; then
    echo "✅ Semua paket inti berhasil diinstal."
    return 0
  else
    echo "❌ Gagal menginstal satu atau lebih paket inti."
    echo "   Harap periksa koneksi internet Anda atau coba 'pkg install -y nodejs python redis' secara manual."
    return 1
  fi
}

# --- 2. Proses Instalasi Utama ---

echo "🚀 Memulai Penyiapan Aplikasi Telegram (Termux)..."

# Jalankan instalasi paket
install_termux_packages || exit 1

# --- 3. Verifikasi Instalasi ---

# Node.js Check
if ! command -v node &> /dev/null; then
    echo "❌ Node.js gagal dipasang atau tidak dapat dieksekusi. Keluar."
    exit 1
fi
echo "✅ Node.js terverifikasi."

# Python 3 Check (Termux biasanya menggunakan 'python' untuk Python 3)
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 gagal dipasang atau tidak dapat dieksekusi. Keluar."
    exit 1
fi
echo "✅ Python 3 terverifikasi."

# Redis Check
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis Server gagal dipasang atau tidak dapat dieksekusi. Keluar."
    exit 1
fi
echo "✅ Redis terverifikasi."


# --- 4. Penyiapan Direktori dan Dependencies ---

# Buat direktori yang diperlukan
echo "📁 Membuat direktori db dan uploads..."
mkdir -p db
mkdir -p uploads

# Instal root dependencies
echo "📦 Menginstal dependensi NPM utama..."
npm install

# Instal frontend dependencies
echo "📦 Menginstal dependensi NPM frontend..."
cd frontend
npm install
cd ..

# Instal backend dependencies
echo "📦 Menginstal dependensi NPM backend..."
cd backend
npm install
cd ..

# Instal Python dependencies
echo "📦 Menginstal dependensi Python..."
cd python-service
# Menggunakan 'python3' secara eksplisit untuk membuat venv
if [ ! -d "venv" ]; then
    echo "   Menciptakan virtual environment (venv)..."
    python3 -m venv venv
fi
echo "   Mengaktifkan venv dan menginstal requirements.txt..."
# Pastikan jalur aktivasi venv sudah benar
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# --- 5. Konfigurasi Lingkungan (.env) ---

# Buat .env file jika belum ada
if [ ! -f ".env" ]; then
    echo "📝 Membuat file .env..."
    cat > .env << EOL
# Database Configuration
DB_PATH=./db/telegram_app.db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server Configuration
PORT=3000
NODE_ENV=development

# Python Service Configuration
PYTHON_SERVICE_URL=http://localhost:8000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
EOL
    echo "✅ File .env berhasil dibuat. Harap tinjau dan perbarui konfigurasi sesuai kebutuhan."
fi

# --- 6. Instruksi Redis (Termux-specific) ---

echo "--- Penyiapan Redis ---"
echo "⚠️  Catatan Penting untuk Termux:"
echo "Redis tidak berjalan sebagai layanan otomatis di Termux."
echo "Anda harus menjalankan perintah 'redis-server' di **SESI TERMUX BARU** secara terpisah sebelum menjalankan aplikasi utama."

echo ""
echo "🎉 Penyiapan selesai dengan sukses!"
echo ""
echo "==================================================="
echo "INSTRUKSI UNTUK MENJALANKAN APLIKASI:"
echo "==================================================="
echo "1. Buka sesi Termux baru."
echo "2. Di sesi baru itu, jalankan: "
echo "   redis-server"
echo ""
echo "3. Kembali ke sesi Termux ini dan jalankan:"
echo "   npm run dev"
echo ""
echo "Aplikasi Anda akan berjalan di:"
echo "  - Frontend: http://localhost:3001"
echo "  - Backend: http://localhost:3000"
echo "  - Python Service: http://localhost:8000"
echo "==================================================="
