# Troubleshooting: 0 Jobs Created

## Problem

When clicking "Run" button, you see:
```
✅ Project started successfully! 0 jobs created. Run ID: xxx
```

But no jobs are actually created and `python-service/telegram_service.log` remains empty.

## Root Cause

**0 jobs created** means the project is missing required data. A job is only created when ALL of these exist:
1. ✅ At least 1 session
2. ✅ At least 1 target channel
3. ❌ **At least 1 message (file)** ← Usually this is missing!

## Diagnosis

### Check Project Data

Run this SQL query to check your project:

```bash
cd /home/ulul/Documents/project/workspace/telegram-app-2

sqlite3 db/telegram_app.db "
SELECT 
  p.id,
  p.name,
  (SELECT COUNT(*) FROM project_sessions WHERE project_id = p.id) as sessions,
  (SELECT COUNT(*) FROM project_targets WHERE project_id = p.id) as targets,
  (SELECT COUNT(*) FROM project_messages WHERE project_id = p.id) as messages
FROM projects p;
"
```

**Expected output:**
```
project-id|project-name|1|5|1
```
- sessions: Should be ≥ 1
- targets: Should be ≥ 1  
- messages: Should be ≥ 1 ← **If this is 0, that's your problem!**

## Solutions

### Solution 1: Add Messages to Existing Project (Quick Fix)

If you already have a project without messages:

```bash
# 1. Get your project ID
sqlite3 db/telegram_app.db "SELECT id, name FROM projects;"

# 2. Get available files
sqlite3 db/telegram_app.db "SELECT id, filename, file_type FROM files;"

# 3. Add a message to the project
sqlite3 db/telegram_app.db "
INSERT INTO project_messages (id, project_id, message_type, content_ref, caption) 
VALUES (
  lower(hex(randomblob(16))),  -- Generate UUID
  'YOUR_PROJECT_ID',           -- Replace with your project ID
  'text',                      -- or 'photo', 'video'
  'YOUR_FILE_ID',              -- Replace with your file ID
  NULL
);
"

# 4. Verify
sqlite3 db/telegram_app.db "
SELECT COUNT(*) FROM project_messages WHERE project_id = 'YOUR_PROJECT_ID';
"
```

### Solution 2: Create New Project Properly (Recommended)

When creating a new project through the UI:

1. **Fill all required fields**:
   - ✅ Name
   - ✅ Session (or use Random mode)
   - ✅ Category (with channels)
   - ✅ **At least one file** (Text OR Media) ← Don't skip this!

2. **Select Files**:
   - **Text File**: For text-only messages or captions
   - **Media File**: For photo/video messages
   - You can select both (media with text caption)
   - **You MUST select at least ONE**

3. **Click Save**

4. **Verify in console**:
   ```
   [Frontend] Adding messages for files: ["file-id-1", "file-id-2"]
   [Frontend] Adding message for file: file-id-1
   [Frontend] Message added: {...}
   Project created successfully with 2 message(s)
   ```

### Solution 3: Edit Existing Project

1. Click "Edit" on the project
2. Select at least one file (Text or Media)
3. Click "Save Project"
4. Try "Run" again

## Validation Added

The backend now validates before running:

```javascript
if (sessions.length === 0) {
  return error: 'No sessions found for this project'
}

if (targets.length === 0) {
  return error: 'No target channels found for this project'
}

if (messages.length === 0) {
  return error: 'No messages found for this project. Please add at least one file.'
}
```

You'll now see a clear error message instead of "0 jobs created".

## Debug Logs

### Backend Logs

When adding messages, you should see:
```
[Project Messages] Adding message: { project_id: 'xxx', file_id: 'yyy' }
[Project Messages] Message added successfully: message-id
```

### Frontend Console

When creating project, you should see:
```
[Frontend] Adding messages for files: ["file-id-1"]
[Frontend] Adding message for file: file-id-1
[Frontend] Message added: { success: true, data: {...} }
Project created successfully with 1 message(s)
```

If you see:
```
[Frontend] No files selected! Project will have no messages.
```

**→ You forgot to select files!**

## Common Mistakes

### ❌ Mistake 1: Not Selecting Any Files
**Symptom**: "0 jobs created"  
**Fix**: Edit project and select at least one file

### ❌ Mistake 2: Selecting Category with No Channels
**Symptom**: "No target channels found"  
**Fix**: Add channels to the category first, or select a different category

### ❌ Mistake 3: No Active Sessions
**Symptom**: "No sessions found"  
**Fix**: Register at least one Telegram session first

### ❌ Mistake 4: Files Deleted After Project Creation
**Symptom**: Jobs created but fail with "File not found"  
**Fix**: Don't delete files that are used in projects

## Verification Checklist

Before clicking "Run", verify:

- [ ] Project has at least 1 session
  ```sql
  SELECT COUNT(*) FROM project_sessions WHERE project_id = 'YOUR_ID';
  ```

- [ ] Project has at least 1 target channel
  ```sql
  SELECT COUNT(*) FROM project_targets WHERE project_id = 'YOUR_ID';
  ```

- [ ] Project has at least 1 message
  ```sql
  SELECT COUNT(*) FROM project_messages WHERE project_id = 'YOUR_ID';
  ```

- [ ] All files exist
  ```sql
  SELECT pm.*, f.filename 
  FROM project_messages pm
  JOIN files f ON pm.content_ref = f.id
  WHERE pm.project_id = 'YOUR_ID';
  ```

- [ ] All channels have valid chat_id
  ```sql
  SELECT c.* 
  FROM project_targets pt
  JOIN channels c ON pt.channel_id = c.id
  WHERE pt.project_id = 'YOUR_ID';
  ```

## Expected Flow

### Correct Flow:
1. Create project with name, session, category, **and files** ✅
2. Click "Run"
3. See "X jobs created" (where X > 0) ✅
4. Jobs execute and send messages ✅
5. Project auto-stops when complete ✅

### Broken Flow:
1. Create project with name, session, category, **but NO files** ❌
2. Click "Run"
3. See "0 jobs created" ❌
4. Nothing happens ❌
5. `telegram_service.log` stays empty ❌

## Quick Test

Create a test project with all required data:

```bash
# 1. Ensure you have files
sqlite3 db/telegram_app.db "SELECT COUNT(*) FROM files;"
# Should be > 0

# 2. Ensure you have sessions  
sqlite3 db/telegram_app.db "SELECT COUNT(*) FROM sessions;"
# Should be > 0

# 3. Ensure you have channels with chat_id
sqlite3 db/telegram_app.db "SELECT COUNT(*) FROM channels WHERE chat_id IS NOT NULL;"
# Should be > 0

# 4. Create project through UI with ALL fields filled
# 5. Click Run
# 6. Should see "X jobs created" where X > 0
```

## Summary

**The #1 reason for "0 jobs created" is forgetting to select files when creating a project.**

Always remember:
- 📝 **Text file** = Text message or caption
- 🖼️ **Media file** = Photo/video message
- ⚠️ **Must select at least ONE**

With the new validation, you'll now get a clear error message if files are missing!
