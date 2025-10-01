#!/bin/bash

# Utility: detect package manager and ensure sudo
detect_pkg_manager() {
  if command -v apt-get &>/dev/null; then echo "apt"; return; fi
  if command -v dnf &>/dev/null; then echo "dnf"; return; fi
  if command -v yum &>/dev/null; then echo "yum"; return; fi
  if command -v pacman &>/dev/null; then echo "pacman"; return; fi
  if command -v zypper &>/dev/null; then echo "zypper"; return; fi
  if command -v apk &>/dev/null; then echo "apk"; return; fi
  echo "unknown"
}

ensure_sudo() {
  if [ "$EUID" -ne 0 ]; then
    if ! command -v sudo &>/dev/null; then
      echo "❌ 'sudo' is required to install packages automatically. Please run this script as root or install dependencies manually.";
      return 1
    fi
  fi
  return 0
}

install_node() {
  local pm="$1"
  case "$pm" in
    apt)
      sudo apt-get update && sudo apt-get install -y nodejs npm ;;
    dnf)
      sudo dnf install -y nodejs npm ;;
    yum)
      sudo yum install -y nodejs npm ;;
    pacman)
      sudo pacman -Sy --noconfirm nodejs npm ;;
    zypper)
      sudo zypper install -y nodejs npm ;;
    apk)
      sudo apk add --no-cache nodejs npm ;;
    *)
      return 1 ;;
  esac
}

install_python() {
  local pm="$1"
  case "$pm" in
    apt)
      sudo apt-get update && sudo apt-get install -y python3 python3-venv python3-pip ;;
    dnf)
      sudo dnf install -y python3 python3-pip ;;
    yum)
      sudo yum install -y python3 python3-pip ;;
    pacman)
      sudo pacman -Sy --noconfirm python python-pip ;;
    zypper)
      sudo zypper install -y python3 python3-pip python3-virtualenv ;;
    apk)
      sudo apk add --no-cache python3 py3-pip ;;
    *)
      return 1 ;;
  esac
}

install_redis() {
  local pm="$1"
  case "$pm" in
    apt)
      sudo apt-get update && sudo apt-get install -y redis-server ;;
    dnf)
      sudo dnf install -y redis ;;
    yum)
      sudo yum install -y redis ;;
    pacman)
      sudo pacman -Sy --noconfirm redis ;;
    zypper)
      sudo zypper install -y redis ;;
    apk)
      sudo apk add --no-cache redis ;;
    *)
      return 1 ;;
  esac
}

echo "🚀 Setting up Telegram App..."

# Ensure dependencies: Node.js, Python 3, Redis
PKG_MANAGER=$(detect_pkg_manager)
if [ "$PKG_MANAGER" = "unknown" ]; then
  echo "⚠️  Could not detect a supported package manager. Please install Node.js, Python3, and Redis manually."
else
  ensure_sudo || true
fi

# Check/Install Node.js
if ! command -v node &> /dev/null; then
    echo "🔧 Node.js not found. Attempting to install..."
    if ! install_node "$PKG_MANAGER"; then
        echo "❌ Failed to install Node.js automatically. Please install it manually."
        echo "   - On Ubuntu/Debian: sudo apt-get install -y nodejs npm"
        echo "   - On Fedora: sudo dnf install -y nodejs npm"
        echo "   - On Arch: sudo pacman -Sy --noconfirm nodejs npm"
        exit 1
    fi
    if command -v node &> /dev/null; then echo "✅ Node.js installed"; else echo "❌ Node.js installation unsuccessful"; exit 1; fi
fi

# Check/Install Python 3
if ! command -v python3 &> /dev/null; then
    echo "🔧 Python 3 not found. Attempting to install..."
    if ! install_python "$PKG_MANAGER"; then
        echo "❌ Failed to install Python 3 automatically. Please install it manually."
        echo "   - On Ubuntu/Debian: sudo apt-get install -y python3 python3-venv python3-pip"
        exit 1
    fi
    if command -v python3 &> /dev/null; then echo "✅ Python 3 installed"; else echo "❌ Python 3 installation unsuccessful"; exit 1; fi
fi

# Check/Install Redis
if ! command -v redis-server &> /dev/null; then
    echo "🔧 Redis not found. Attempting to install..."
    if ! install_redis "$PKG_MANAGER"; then
        echo "❌ Failed to install Redis automatically. Please install it manually."
        echo "   - On Ubuntu/Debian: sudo apt-get install -y redis-server"
        exit 1
    fi
    if command -v redis-server &> /dev/null; then echo "✅ Redis installed"; else echo "❌ Redis installation unsuccessful"; exit 1; fi
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p db
mkdir -p uploads

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd python-service
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
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
    echo "✅ Created .env file. Please review and update the configuration as needed."
fi

# Check if Redis is running
echo "🔍 Checking Redis status..."
if ! redis-cli ping &> /dev/null; then
    echo "⚠️  Redis is not running. Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis started successfully"
    else
        echo "❌ Failed to start Redis. Please start Redis manually."
        exit 1
    fi
else
    echo "✅ Redis is running"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  - Frontend: http://localhost:3001"
echo "  - Backend: http://localhost:3000"
echo "  - Python Service: http://localhost:8000"
echo ""
echo "To stop Redis:"
echo "  redis-cli shutdown"
