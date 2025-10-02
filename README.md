# 📱 Telegram Campaign Manager

A powerful web-based application for managing and automating Telegram message campaigns across multiple channels using multiple accounts.

## ✨ Features

### 🎯 Core Features

- **Multi-Account Management**: Manage multiple Telegram sessions/accounts
- **Bulk Messaging**: Send messages to multiple channels simultaneously
- **Project-Based Campaigns**: Organize campaigns into projects
- **File Management**: Upload and manage text, images, and videos
- **Channel Categories**: Organize target channels into categories
- **Real-Time Dashboard**: Monitor campaign progress in real-time
- **Auto-Stop**: Projects automatically stop when all jobs complete
- **Queue System**: BullMQ-powered job queue with Redis
- **Session Management**: Secure Telegram session handling with Pyrogram

### 🚀 Advanced Features

- **Auto-Refresh UI**: Real-time status updates without page refresh (5s polling)
- **Run Confirmation Modal**: Preview all details before running campaigns
- **File Preview**: View text, images, and videos before sending
- **Progress Tracking**: Real-time job completion tracking with statistics
- **Error Handling**: Comprehensive error tracking and retry mechanism
- **Activity Logging**: Complete audit trail of all operations
- **Modern Dashboard**: Beautiful, informative dashboard with live statistics

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - Dashboard, Projects, Sessions, Channels, Files, etc.     │
│  - Real-time updates, Modern UI with Bootstrap              │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  - REST API endpoints                                        │
│  - BullMQ job queue management                              │
│  - SQLite database                                           │
│  - Business logic & orchestration                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌──────────────────┐                    ┌──────────────────────┐
│  Redis (Queue)   │                    │  Python Service      │
│  - Job queue     │                    │  - Pyrogram client   │
│  - Session lock  │                    │  - Telegram API      │
└──────────────────┘                    │  - Message sending   │
                                        └──────────────────────┘
```

## 📋 Prerequisites

- **Node.js** v16+ and npm
- **Python** 3.8+
- **Redis** server
- **Telegram API credentials** (api_id, api_hash)

## 🛠️ Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd telegram-app-2
```

### 2. Backend Setup

```bash
# Install dependencies
npm install

# The database will be created automatically on first run
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 4. Python Service Setup

```bash
cd python-service
pip install -r requirements.txt
cd ..
```

### 5. Redis Setup

Make sure Redis is running:

```bash
# Ubuntu/Debian
sudo systemctl start redis

# Or run manually
redis-server
```

## 🚀 Running the Application

### Start All Services

You need to run 3 services in separate terminals:

#### Terminal 1: Backend

```bash
cd backend
npm start
# Runs on http://localhost:3000
```

#### Terminal 2: Frontend

```bash
cd frontend
PORT=3001 npm start
# Runs on http://localhost:3001
```

#### Terminal 3: Python Service

```bash
cd python-service
python app.py
# Runs on http://localhost:5000
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3001
```

## 📚 Usage Guide

### 1. Add Telegram Sessions

1. Navigate to **Sessions** page
2. Click **"Add Session"**
3. Enter phone number
4. Complete Telegram authentication (code + password if 2FA enabled)
5. Session will be saved and ready to use

### 2. Add Target Channels

1. Navigate to **Channels** page
2. Click **"Add Channels"** or **"Bulk Add"**
3. Enter channel usernames (e.g., @channelname)
4. Channels will be added to the list

### 3. Create Categories

1. Navigate to **Categories** page
2. Click **"Add Category"**
3. Name your category (e.g., "Tech Channels", "News Channels")
4. Add channels to the category

### 4. Upload Files

1. Navigate to **Files** page
2. Click **"Upload File"**
3. Select text file, image, or video
4. File will be available for campaigns

### 5. Create a Project

1. Navigate to **Projects** page
2. Click **"Add Project"**
3. Fill in project details:
   - **Name**: Campaign name
   - **Description**: Optional description
   - **Session**: Select Telegram account (or use Random mode)
   - **Category**: Select target channel category
   - **Text File**: Optional text message
   - **Media File**: Optional image/video
4. Click **"Save Project"**

### 6. Run a Campaign

1. Find your project in the list
2. Click **"▶️ Run"** button
3. **Review confirmation modal**:
   - Session details
   - Target channels list
   - Files to be sent
   - Estimated jobs
4. Click **"👁️ View"** to preview file content
5. Click **"✅ Confirm & Run"**
6. Monitor progress in Dashboard

### 7. Monitor Progress

- **Dashboard**: Real-time overview of all campaigns
- **Running Projects**: See active campaigns with progress bars
- **Recent Runs**: History of completed campaigns
- **Recent Activity**: Live activity log
- **Auto-refresh**: Data updates every 5 seconds

## 📊 Dashboard Features

### Statistics Cards

- **Projects**: Total, running, stopped
- **Sessions**: Active Telegram accounts
- **Channels**: Total target channels
- **Files**: Total files and storage used

### Running Projects

- Live progress bars
- Job completion tracking (X/Y jobs)
- Success/error counts
- Time elapsed

### Recent Runs

- Last 5 campaign runs
- Status indicators
- Job statistics

### Recent Activity

- Last 10 log entries
- Level badges (info/warning/error)
- Timestamp with "time ago" format

## 🔧 Configuration

### Backend Configuration

Edit `backend/server.js` or use environment variables:

```javascript
const PORT = process.env.PORT || 3000;
```

### Python Service Configuration

Edit `python-service/app.py`:

```python
API_ID = os.getenv('TELEGRAM_API_ID', 'your_api_id')
API_HASH = os.getenv('TELEGRAM_API_HASH', 'your_api_hash')
```

### Redis Configuration

Default: `localhost:6379`

To change, edit `backend/queue.js`:

```javascript
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});
```

## 📁 Project Structure

```
telegram-app-2/
├── backend/
│   ├── db/                     # SQLite database
│   ├── routes/                 # API routes
│   │   ├── sessions.js
│   │   ├── channels.js
│   │   ├── categories.js
│   │   ├── files.js
│   │   ├── projects.js
│   │   ├── dashboard.js
│   │   └── ...
│   ├── db.js                   # Database initialization
│   ├── queue.js                # BullMQ queue & worker
│   └── server.js               # Express server
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.js    # Main dashboard
│       │   ├── Projects.js     # Project management
│       │   ├── Sessions.js     # Session management
│       │   ├── Channels.js     # Channel management
│       │   ├── Categories.js   # Category management
│       │   └── Files.js        # File management
│       ├── App.js
│       └── index.js
├── python-service/
│   ├── app.py                  # FastAPI service
│   ├── requirements.txt
│   └── telegram_service.log    # Service logs
└── uploads/                    # Uploaded files storage
```

## 🗄️ Database Schema

### Main Tables

- **sessions**: Telegram account sessions
- **channels**: Target channels
- **categories**: Channel categories
- **category_channels**: Category-channel relationships
- **files**: Uploaded files
- **projects**: Campaign projects
- **project_sessions**: Project-session relationships
- **project_targets**: Project-channel relationships
- **project_messages**: Project-file relationships
- **process_runs**: Campaign execution records
- **logs**: Activity logs

## 🔐 Security Notes

- Sessions are stored securely in the database
- File uploads are validated for type and size
- API endpoints use proper error handling
- Sensitive data (API keys) should use environment variables

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Check Redis connection
redis-cli ping
```

### Python Service Errors

```bash
# Check logs
tail -f python-service/telegram_service.log

# Verify Telegram API credentials
# Make sure API_ID and API_HASH are correct
```

### 0 Jobs Created

**Cause**: Project missing required data (sessions, channels, or files)

**Solution**: 
1. Edit project
2. Ensure at least one file is selected
3. Verify category has channels
4. Save and try again

See `TROUBLESHOOTING_0_JOBS.md` for details.

### Frontend Shows 504 Error

**Cause**: Backend not responding

**Solution**:
```bash
# Restart backend
cd backend
npm start
```

### Time Display Wrong

**Cause**: Timezone mismatch

**Solution**: Already fixed! Backend uses `localtime` for SQLite datetime.

## 📖 Documentation

Additional documentation files:

- `AUTO_STOP_FEATURE.md` - Auto-stop mechanism details
- `AUTO_REFRESH_FEATURE.md` - Frontend auto-refresh feature
- `RUN_CONFIRMATION_MODAL.md` - Run confirmation modal
- `FILE_PREVIEW_FEATURE.md` - File preview feature
- `BUGFIX_EDIT_PROJECT.md` - Edit project bug fix
- `BUGFIX_RUN_MODAL_FILES.md` - Run modal files bug fix
- `TROUBLESHOOTING_0_JOBS.md` - Troubleshooting guide

## 🎨 UI Features

### Modern Design

- Bootstrap 5 components
- Shadow cards for depth
- Color-coded badges
- Responsive layout
- Mobile-friendly

### Real-Time Updates

- Auto-refresh every 5 seconds
- Live progress bars
- Animated "Live" badge
- Instant status updates

### User Experience

- Confirmation modals before destructive actions
- File preview before sending
- Progress tracking
- Error messages with context
- Success notifications

## 🚦 API Endpoints

### Dashboard

- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/running-projects` - Get running projects
- `GET /api/dashboard/recent-runs` - Get recent runs
- `GET /api/dashboard/recent-activity` - Get activity log

### Projects

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/run` - Run project
- `POST /api/projects/:id/stop` - Stop project

### Sessions

- `GET /api/sessions` - List sessions
- `POST /api/sessions/register` - Register new session
- `POST /api/sessions/verify` - Verify OTP code
- `DELETE /api/sessions/:id` - Delete session

### Channels

- `GET /api/channels` - List channels
- `GET /api/channels/:id` - Get channel details
- `POST /api/channels` - Add channel
- `POST /api/channels/bulk` - Bulk add channels
- `DELETE /api/channels/:id` - Delete channel

### Files

- `GET /api/files` - List files
- `GET /api/files/:id/info` - Get file metadata
- `GET /api/files/:id/preview` - Preview file content
- `GET /api/files/:id/raw` - Serve raw file
- `GET /api/files/:id` - Download file
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/:id` - Delete file

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

[Add your license here]

## 👨‍💻 Author

[Add your name/organization here]

## 🙏 Acknowledgments

- **Pyrogram** - Telegram client library
- **BullMQ** - Job queue system
- **React** - Frontend framework
- **Bootstrap** - UI components
- **Express** - Backend framework
- **FastAPI** - Python service framework

## 📞 Support

For issues and questions:
- Check documentation files in the repository
- Review troubleshooting guides
- Check logs: `python-service/telegram_service.log`

---

**Built with ❤️ for efficient Telegram campaign management**
