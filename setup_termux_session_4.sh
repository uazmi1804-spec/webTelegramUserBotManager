#!/data/data/com.termux/files/usr/bin/bash
# Setup Frontend React/Next.js di Termux

pkg update -y && pkg upgrade -y
pkg install -y nodejs git

cd ~/webTelegramUserBotManager

# Install dependency frontend jika belum
if [ ! -d "node_modules" ]; then
  npm install
fi

# Jalankan frontend di port 3001
npm run dev:frontend -- --port 3001
