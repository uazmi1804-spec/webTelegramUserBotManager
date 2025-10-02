#!/data/data/com.termux/files/usr/bin/bash
# Setup Redis Server di Termux

# Update & upgrade
pkg update -y && pkg upgrade -y

# Install Redis
pkg install -y redis

# Buat config untuk bypass ARM64-COW-BUG
echo "ignore-warnings ARM64-COW-BUG" > ~/redis.conf

# Jalankan redis-server di port 6379
redis-server ~/redis.conf --port 6379
