#!/data/data/com.termux/files/usr/bin/env bash
set -euo pipefail

# Setup Python Service di Termux
pkg update -y && pkg upgrade -y
pkg install -y python git

# Masuk ke folder project
cd ~/webTelegramUserBotManager

# Install pip requirements kalau ada
if [ -f "requirements.txt" ]; then
  echo "Menginstall Python requirements..."
  pip install --upgrade pip setuptools wheel
  pip install -r requirements.txt
fi

# Install Node.js kalau ada package.json
if [ -f "package.json" ]; then
  echo "Project punya package.json → install Node.js..."
  pkg install -y nodejs-lts

  echo "Install dependencies Node.js..."
  npm install

  echo "Menjalankan service via npm..."
  npm run dev:python -- --port 5000
else
  echo "Tidak ada package.json → coba jalankan langsung service Python"
  if [ -f "app.py" ]; then
    python app.py --port 5000
  elif [ -f "main.py" ]; then
    python main.py --port 5000
  else
    echo "❌ Tidak ditemukan app.py/main.py dan tidak ada package.json"
    exit 1
  fi
fi
