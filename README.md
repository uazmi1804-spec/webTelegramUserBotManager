# Telegram App - Web Application

A comprehensive web application for managing Telegram sessions and campaigns with automated messaging capabilities.

## Architecture

This application consists of three main components:

1. **Frontend** (React) - Port 3001
2. **Backend** (Node.js/Express) - Port 3000  
3. **Python Service** (FastAPI/Pyrogram) - Port 8000

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8 or higher
- Redis server
- SQLite3

## Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies for all services
npm run install:all
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
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
```

### 3. Start Redis Server

```bash
# On Ubuntu/Debian
sudo systemctl start redis-server

# On macOS with Homebrew
brew services start redis

# Or run directly
redis-server
```

### 4. Start the Application

```bash
# Start all services concurrently
npm run dev
```

This will start:
- Frontend on http://localhost:3001
- Backend on http://localhost:3000
- Python service on http://localhost:8000

## Individual Service Commands

### Frontend Only
```bash
cd frontend
npm start
```

### Backend Only
```bash
cd backend
npm run dev
```

### Python Service Only
```bash
cd python-service
python app.py
```

## Features

- **Session Management**: Create and manage Telegram sessions
- **Campaign Management**: Set up automated messaging campaigns
- **File Management**: Upload and manage media files
- **Channel Management**: Add and organize target channels
- **Queue System**: Background job processing with Redis
- **Real-time Monitoring**: Track campaign progress and logs

## API Endpoints

### Backend API (Port 3000)
- `/api/sessions` - Session management
- `/api/credentials` - API credentials
- `/api/channels` - Channel management
- `/api/files` - File management
- `/api/projects` - Project management
- `/internal` - Internal service endpoints

### Python Service API (Port 8000)
- `/export_session` - Export Telegram session
- `/complete_auth` - Complete authentication
- `/send_message` - Send messages
- `/get_chat` - Get chat information
- `/get_chat_history` - Get chat history
- `/reply` - Reply to messages

## Database Schema

The application uses SQLite with the following main tables:
- `sessions` - Telegram session data
- `api_credentials` - API credentials
- `channels` - Target channels
- `files` - Uploaded files
- `projects` - Campaign projects
- `project_targets` - Project target channels
- `project_sessions` - Project session assignments
- `project_messages` - Project message templates
- `process_runs` - Campaign execution runs
- `delays` - Delay configurations
- `logs` - System logs

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000, 3001, and 8000 are available
2. **Redis Connection**: Make sure Redis server is running
3. **Python Dependencies**: Ensure all Python packages are installed in the virtual environment
4. **Database Permissions**: Ensure the application has write permissions to the `db/` directory

### Logs

- Backend logs: Check console output
- Python service logs: Check console output
- Database logs: Stored in `logs` table
- Process run logs: Available in the web interface

## Development

### Adding New Features

1. Backend: Add routes in `backend/routes/`
2. Frontend: Add components in `frontend/src/components/`
3. Python Service: Add endpoints in `python-service/app.py`

### Testing

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a production Redis instance
3. Configure proper JWT secrets
4. Set up proper database backups
5. Use a reverse proxy (nginx) for production

## License

MIT License - see LICENSE file for details
# webTelegramUserBotManager
