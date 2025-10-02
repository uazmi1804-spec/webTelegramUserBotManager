#!/data/data/com.termux/files/usr/bin/bash
# Setup Python Service di Termux

pkg update -y && pkg upgrade -y
pkg install -y python git

cd ~/webTelegramUserBotManager

# Install requirements jika ada
if [ -f "requirements.txt" ]; then
  pip install -r requirements.txt
fi

# Jalankan python service di port 5000
npm run dev:python -- --port 5000
