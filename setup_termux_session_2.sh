#!/data/data/com.termux/files/usr/bin/bash
# Setup Backend Node.js/Express.js di Termux

pkg update -y && pkg upgrade -y
pkg install -y nodejs git

cd ~/webTelegramUserBotManager

# Install dependency backend jika belum
if [ ! -d "node_modules" ]; then
  npm install
fi

# Jalankan backend di port 3000
npm run dev:backend -- --port 3000
