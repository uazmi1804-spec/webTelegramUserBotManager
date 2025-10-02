#!/data/data/com.termux/files/usr/bin/bash
# Setup Redis Server di Termux

pkg update -y && pkg upgrade -y
pkg install -y redis

# Jalankan redis-server di port 6379
redis-server --port 6379
