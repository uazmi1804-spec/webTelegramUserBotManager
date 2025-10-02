# Bug Fix: Run Modal Not Showing Files

## Problem

When opening the Run Confirmation Modal, it showed:
```
📝 Messages (0)
⚠️ No messages configured
```

Even though the project had text and media files configured.

## Root Cause

The frontend was calling `/api/files/:id` to get file metadata, but this endpoint returns a **file download** (binary), not JSON data!

```javascript
// This endpoint downloads the file
GET /api/files/:id  → res.download(path, filename)
```

When axios tried to parse the binary response as JSON, it failed silently, resulting in no file details.

## Solution

### 1. Added New Endpoint for File Metadata

**File**: `backend/routes/files.js`

Created new endpoint that returns JSON:
```javascript
GET /api/files/:id/info
```

Returns:
```json
{
  "success": true,
  "data": {
    "id": "file-id",
    "filename": "test.txt",
    "file_type": "text",
    "path": "/path/to/file",
    "size": 1234,
    "owner": "user",
    "created_at": "2025-10-02..."
  }
}
```

### 2. Updated Frontend to Use New Endpoint

**File**: `frontend/src/components/Projects.js`

Changed from:
```javascript
axios.get(`/api/files/${m.content_ref}`)
```

To:
```javascript
axios.get(`/api/files/${m.content_ref}/info`)
```

### 3. Added Comprehensive Logging

Added console logs to track the entire fetch process:
```javascript
console.log('[Run Modal] Fetching files for messages:', [...]);
console.log('[Run Modal] Fetching file info:', fileId);
console.log('[Run Modal] File responses:', [...]);
console.log('[Run Modal] Files fetched:', count);
console.log('[Run Modal] File details:', details);
```

## Endpoints Summary

Now we have clear separation:

| Endpoint | Purpose | Returns |
|----------|---------|---------|
| `GET /api/files/:id/info` | Get file metadata | JSON data |
| `GET /api/files/:id` | Download file | Binary file |
| `GET /api/files/:id/preview` | Preview content | Text content |
| `GET /api/files/:id/raw` | Serve raw file | File for browser |

## Testing

### Before Fix
```
1. Create project with files
2. Click "Run"
3. Modal shows: "📝 Messages (0)"
4. Warning: "Missing required data"
5. Cannot run ❌
```

### After Fix
```
1. Create project with files
2. Click "Run"
3. Modal shows:
   📝 Messages (2)
   📄 test.txt
      Type: text | Size: 1.5 KB
   🖼️ image.jpg
      Type: photo | Size: 245.3 KB
4. Can confirm and run ✅
```

## Console Logs to Watch

When opening Run Modal, you should see:
```
[Run Modal] Fetching details for project: xxx
[Run Modal] Base data: { sessions: 1, targets: 1, messages: 2 }
[Run Modal] Session info: Found
[Run Modal] Channels fetched: 1
[Run Modal] Fetching files for messages: ["file-id-1", "file-id-2"]
[Run Modal] Fetching file info: file-id-1
[Run Modal] Fetching file info: file-id-2
[Run Modal] File responses: ["Success", "Success"]
[Run Modal] Files fetched: 2
[Run Modal] File details: [{...}, {...}]
```

If you see errors:
```
[Run Modal] Error fetching file: file-id-1 File not found
```
→ The file was deleted or content_ref is wrong

## Verification

Check if files are properly linked to project:
```bash
sqlite3 db/telegram_app.db "
SELECT 
  pm.id,
  pm.message_type,
  pm.content_ref,
  f.filename,
  f.file_type
FROM project_messages pm
LEFT JOIN files f ON pm.content_ref = f.id
WHERE pm.project_id = 'YOUR_PROJECT_ID';
"
```

Should show:
```
message-id|text|file-id-1|test.txt|text
message-id|photo|file-id-2|image.jpg|photo
```

If `filename` is NULL → File doesn't exist, need to re-add files to project

## Summary

The issue was a mismatch between what the frontend expected (JSON) and what the backend returned (binary file). Adding a dedicated `/info` endpoint solved this cleanly while keeping the download endpoint intact.
