#!/usr/bin/env bash

set -euo pipefail

# Minta input pesan commit
echo -n "Masukkan pesan commit: "
read commit_msg

# Tambahkan semua perubahan
git add .

# Commit dengan pesan dari input
git commit -m "$commit_msg" || echo "⚠️ Tidak ada perubahan untuk di-commit."

# Push paksa ke remote
git push origin main --force
