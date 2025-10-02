#!/data/data/com.termux/files/usr/bin/env bash
set -euo pipefail

# Skrip setup Redis di Termux (minimal config, supress ARM64 COW warning)
# Update & upgrade paket
pkg update -y && pkg upgrade -y

# Install Redis jika belum ada
pkg install -y redis

# Direktori & file config
REDIS_HOME="$HOME"
REDIS_CONF="$REDIS_HOME/redis.conf"
REDIS_LOG="$REDIS_HOME/redis.log"
REDIS_PID="$REDIS_HOME/redis.pid"

# Hentikan instance redis yang mungkin sedang berjalan (aman jika tidak ada)
if pgrep -x redis-server >/dev/null 2>&1; then
  echo "Menemukan redis-server aktif. Menghentikan dulu..."
  pkill -f redis-server || true
  sleep 1
fi

# Buat konfigurasi minimal yang aman untuk Termux/Android
cat > "$REDIS_CONF" <<'EOF'
# Minimal redis.conf untuk Termux/Android
port 6379
daemonize yes
protected-mode no
save ""               # non-aktifkan RDB snapshot (opsional)
appendonly no         # non-aktifkan AOF (opsional)
dir /data/data/com.termux/files/home
logfile /data/data/com.termux/files/home/redis.log
pidfile /data/data/com.termux/files/home/redis.pid

# Supress known ARM64 COW kernel warning (gunakan jika kamu memahami risikonya)
ignore-warnings ARM64-COW-BUG
EOF

# Pastikan file terbuat dan bisa ditulis
chmod 600 "$REDIS_CONF" || true

# Jalankan redis-server dengan config yang sudah dibuat
echo "Menjalankan redis-server dengan konfigurasi: $REDIS_CONF"
redis-server "$REDIS_CONF"

echo "redis-server seharusnya sudah berjalan (cek $REDIS_LOG atau 'pgrep -a redis-server')."
