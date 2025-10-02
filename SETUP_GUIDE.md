# 🚀 Setup Guide - Telegram Campaign Manager

## Quick Start (Automated Setup)

### Prerequisites

- Linux/Unix-based system (Ubuntu, Debian, Fedora, Arch, etc.)
- Internet connection
- Sudo privileges (for installing system packages)

### One-Command Setup

```bash
chmod +x setup.sh
./setup.sh
```

The setup script will automatically:
1. ✅ Detect your package manager
2. ✅ Install Node.js (if not installed)
3. ✅ Install Python 3 (if not installed)
4. ✅ Install Redis (if not installed)
5. ✅ Create necessary directories (`db/`, `uploads/`)
6. ✅ Install all Node.js dependencies (root, frontend, backend)
7. ✅ Create Python virtual environment
8. ✅ Install Python dependencies
9. ✅ Create `.env` configuration file
10. ✅ Start Redis server
11. ✅ Make scripts executable

## What setup.sh Does

### 1. System Dependencies Detection

The script automatically detects your Linux distribution and uses the appropriate package manager:

- **Ubuntu/Debian**: `apt-get`
- **Fedora**: `dnf`
- **CentOS/RHEL**: `yum`
- **Arch Linux**: `pacman`
- **openSUSE**: `zypper`
- **Alpine**: `apk`

### 2. Node.js Installation

If Node.js is not found, the script will install it using your system's package manager.

**Minimum version**: Node.js 16+

### 3. Python 3 Installation

If Python 3 is not found, the script will install:
- `python3`
- `python3-pip`
- `python3-venv` (for virtual environments)

**Minimum version**: Python 3.8+

### 4. Redis Installation

If Redis is not found, the script will install `redis-server` and start it automatically.

### 5. Project Dependencies

The script installs dependencies for:

#### Root Dependencies
```json
{
  "concurrently": "^8.2.0",
  "axios": "^1.6.0",
  "bullmq": "^4.10.1",
  "express": "^4.18.2",
  "redis": "^4.6.7",
  "sqlite3": "^5.1.6",
  ...
}
```

#### Frontend Dependencies
```bash
cd frontend && npm install
```

#### Backend Dependencies
```bash
cd backend && npm install
```

#### Python Dependencies
```bash
cd python-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Includes:
- `pyrogram` - Telegram client library
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `python-dotenv` - Environment variables

### 6. Configuration File (.env)

The script creates a `.env` file with default configuration:

```env
# Database
DB_PATH=./db/telegram_app.db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000

# Python Service
PYTHON_SERVICE_URL=http://localhost:5000

# Telegram API (MUST BE UPDATED!)
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
```

### 7. Redis Server

The script checks if Redis is running and starts it if needed:

```bash
redis-server --daemonize yes
```

## Post-Setup Configuration

### ⚠️ IMPORTANT: Telegram API Credentials

Before running the application, you **MUST** update the `.env` file with your Telegram API credentials:

1. **Get API Credentials**:
   - Visit https://my.telegram.org
   - Log in with your phone number
   - Go to "API development tools"
   - Create a new application
   - Copy `api_id` and `api_hash`

2. **Update .env file**:
   ```bash
   nano .env
   # or
   vim .env
   ```

3. **Replace placeholders**:
   ```env
   TELEGRAM_API_ID=12345678
   TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
   ```

## Running the Application

After setup is complete, start all services with one command:

```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:3001 (React app)
- **Backend**: http://localhost:3000 (Express API)
- **Python Service**: http://localhost:5000 (Pyrogram/FastAPI)

### Individual Service Commands

If you need to run services separately:

```bash
# Frontend only
cd frontend && PORT=3001 npm start

# Backend only
cd backend && npm run dev

# Python service only
cd python-service && ./start.sh
```

## Verification

### Check if all services are running:

```bash
# Backend health check
curl http://localhost:3000/health
# Should return: {"status":"OK","service":"telegram-app-backend"}

# Python service health check
curl http://localhost:5000/health
# Should return: {"status":"ok"}

# Redis check
redis-cli ping
# Should return: PONG

# Frontend
# Open browser: http://localhost:3001
```

## Troubleshooting

### Setup Script Fails

#### Node.js Installation Failed
```bash
# Manual installation (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Python Installation Failed
```bash
# Manual installation (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv
```

#### Redis Installation Failed
```bash
# Manual installation (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y redis-server
sudo systemctl start redis
```

### Permission Denied

If you get "Permission denied" when running setup.sh:

```bash
chmod +x setup.sh
./setup.sh
```

### Redis Won't Start

```bash
# Check if Redis is already running
ps aux | grep redis

# Kill existing Redis
redis-cli shutdown

# Start Redis manually
redis-server --daemonize yes

# Or use systemd
sudo systemctl start redis
```

### Python Virtual Environment Issues

```bash
cd python-service
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Port Already in Use

If ports 3000, 3001, or 5000 are already in use:

1. **Find process using the port**:
   ```bash
   lsof -i :3000
   lsof -i :3001
   lsof -i :5000
   ```

2. **Kill the process**:
   ```bash
   kill -9 <PID>
   ```

3. **Or change ports in configuration**:
   - Frontend: `frontend/package.json` → `PORT=3002 npm start`
   - Backend: `.env` → `PORT=3001`
   - Python: `python-service/app.py` → `uvicorn.run(..., port=5001)`

## Manual Setup (Alternative)

If the automated setup doesn't work, follow these manual steps:

### 1. Install System Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nodejs npm python3 python3-pip python3-venv redis-server

# Fedora
sudo dnf install -y nodejs npm python3 python3-pip redis

# Arch Linux
sudo pacman -Sy nodejs npm python python-pip redis
```

### 2. Install Project Dependencies

```bash
# Root
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && npm install && cd ..

# Python
cd python-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..
```

### 3. Create Directories

```bash
mkdir -p db uploads
```

### 4. Create .env File

```bash
cp .env.example .env
nano .env
# Update TELEGRAM_API_ID and TELEGRAM_API_HASH
```

### 5. Start Redis

```bash
redis-server --daemonize yes
```

### 6. Run Application

```bash
npm run dev
```

## Directory Structure After Setup

```
telegram-app-2/
├── db/                         # SQLite database (auto-created)
│   └── telegram_app.db
├── uploads/                    # Uploaded files
├── backend/
│   └── node_modules/           # Backend dependencies
├── frontend/
│   └── node_modules/           # Frontend dependencies
├── python-service/
│   ├── venv/                   # Python virtual environment
│   └── telegram_service.log    # Service logs
├── .env                        # Configuration file
└── node_modules/               # Root dependencies
```

## Next Steps

After successful setup:

1. ✅ Access the application at http://localhost:3001
2. ✅ Add your first Telegram session
3. ✅ Add target channels
4. ✅ Upload files
5. ✅ Create and run your first campaign

See **README.md** for detailed usage instructions.

## Support

If you encounter issues:
1. Check this guide
2. Review error messages in terminal
3. Check logs: `python-service/telegram_service.log`
4. Ensure all prerequisites are met
5. Try manual setup as alternative

---

**Setup script version**: 1.0  
**Last updated**: 2025-10-02
