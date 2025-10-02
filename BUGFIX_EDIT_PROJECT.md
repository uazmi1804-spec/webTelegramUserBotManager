# Bug Fix: Edit Project Loses Messages

## Problem

When editing a project and saving it:
1. Project runs fine initially ✅
2. User edits the project and saves ✅
3. User runs the project again
4. **0 jobs created** ❌
5. Messages (files) are gone ❌

## Root Cause

The `updateProject` function had a bug where it:
1. ✅ Deleted old messages correctly
2. ❌ **Used wrong endpoint to recreate messages**

### The Bug

**Wrong code** (in `updateProject` function):
```javascript
// Used wrong endpoint with wrong parameters
await axios.post(`/api/projects/${projectId}/messages`, {
  message_type: file.file_type,
  content_ref: fileId,
  caption: null
});
```

**Correct code** (should match `handleSubmit`):
```javascript
// Use same endpoint as create project
await axios.post('/api/project-messages', {
  project_id: projectId,
  file_id: fileId
});
```

## Fixes Applied

### 1. Fixed Message Recreation Endpoint

**File**: `frontend/src/components/Projects.js`

**Before**:
```javascript
for (const fileId of fileIds) {
  const fileResponse = await axios.get(`/api/files/${fileId}`);
  if (fileResponse.data.success) {
    const file = fileResponse.data.data;
    await axios.post(`/api/projects/${projectId}/messages`, {
      message_type: file.file_type,
      content_ref: fileId,
      caption: null
    });
  }
}
```

**After**:
```javascript
for (const fileId of fileIds) {
  console.log('[Frontend] Adding message for file:', fileId);
  const msgResponse = await axios.post('/api/project-messages', {
    project_id: projectId,
    file_id: fileId
  });
  console.log('[Frontend] Message added:', msgResponse.data);
}
```

### 2. Added State Reset on Load

**File**: `frontend/src/components/Projects.js`

Added reset of all selections before loading project data:
```javascript
const loadProjectData = async (projectId) => {
  try {
    // Reset selections first
    setSelectedSession('');
    setSessionSelectionMode('random');
    setSelectedCategory('');
    setSelectedTextFile('');
    setSelectedMediaFile('');
    
    // Then load project data...
  }
}
```

### 3. Added Comprehensive Logging

Added console logs to track the entire edit flow:
```javascript
console.log('[Frontend] Loading project data for:', projectId);
console.log('[Frontend] Loaded messages:', messagesResponse.data.data);
console.log('[Frontend] Set text file:', msg.content_ref);
console.log('[Frontend] Updating messages for files:', fileIds);
console.log('[Frontend] Message added:', msgResponse.data);
```

### 4. Improved Success Message

Changed from:
```javascript
setSuccess('Project updated successfully');
```

To:
```javascript
setSuccess(`Project updated successfully with ${fileIds.length} message(s)`);
```

Now you can see how many messages were saved!

## How to Verify the Fix

### Test Scenario 1: Edit and Save

1. Create a project with 1 text file
2. Run it → Should see "1 jobs created" ✅
3. Edit the project, change text file to a different one
4. Save
5. Check console:
   ```
   [Frontend] Updating messages for files: ["new-file-id"]
   [Frontend] Adding message for file: new-file-id
   [Frontend] Message added: {...}
   Project updated successfully with 1 message(s)
   ```
6. Run again → Should see "1 jobs created" ✅

### Test Scenario 2: Add More Files

1. Create project with only text file
2. Edit project, add media file too
3. Save
4. Check console:
   ```
   [Frontend] Updating messages for files: ["text-id", "media-id"]
   Project updated successfully with 2 message(s)
   ```
5. Run → Should see "X jobs created" (X = number of channels) ✅

### Test Scenario 3: Remove Files

1. Create project with text + media
2. Edit project, remove media file (only keep text)
3. Save
4. Check console:
   ```
   [Frontend] Updating messages for files: ["text-id"]
   Project updated successfully with 1 message(s)
   ```
5. Run → Should work with text only ✅

## Database Verification

Check messages after edit:

```bash
sqlite3 db/telegram_app.db "
SELECT 
  pm.id,
  pm.message_type,
  f.filename
FROM project_messages pm
JOIN files f ON pm.content_ref = f.id
WHERE pm.project_id = 'YOUR_PROJECT_ID';
"
```

Should show the files you selected during edit.

## Console Logs to Watch

### When Opening Edit Modal:
```
[Frontend] Loading project data for: project-id
[Frontend] Loaded session: session-id
[Frontend] Loaded messages: [{...}]
[Frontend] Set text file: file-id
```

### When Saving Edited Project:
```
[Frontend] Updating messages for files: ["file-id-1", "file-id-2"]
[Frontend] Adding message for file: file-id-1
[Project Messages] Adding message: { project_id: 'xxx', file_id: 'yyy' }
[Project Messages] Message added successfully: message-id
[Frontend] Message added: { success: true, ... }
[Frontend] Adding message for file: file-id-2
...
Project updated successfully with 2 message(s)
```

### When Running After Edit:
```
[Queue] Adding job for channel @channel1, message type: text
[Worker] Processing job 1 for chat @channel1
...
```

## Common Issues After Edit

### Issue 1: Still Getting 0 Jobs

**Cause**: Files not selected during edit  
**Solution**: Make sure to select at least one file before saving

**Check**: Console should show:
```
[Frontend] Updating messages for files: []
⚠️ [Frontend] No files selected during update!
```

### Issue 2: Wrong File Being Used

**Cause**: State not reset before loading  
**Solution**: Already fixed! State is now reset before loading

### Issue 3: Old Messages Still There

**Cause**: Delete failed silently  
**Check backend logs**: Should see successful deletes before adds

## Comparison: Create vs Update

Both flows now use the **same endpoint** for adding messages:

### Create Project Flow:
```javascript
await axios.post('/api/project-messages', {
  project_id: projectId,
  file_id: fileId
});
```

### Update Project Flow:
```javascript
await axios.post('/api/project-messages', {  // ← Same endpoint!
  project_id: projectId,
  file_id: fileId
});
```

## Summary

The bug was caused by using different endpoints for create vs update:
- **Create**: Used `/api/project-messages` with `{project_id, file_id}` ✅
- **Update**: Used `/api/projects/:id/messages` with `{message_type, content_ref}` ❌

Now both use the same endpoint and parameters, ensuring consistency!

## Testing Checklist

- [ ] Create new project with files → Works
- [ ] Run project → Creates jobs
- [ ] Edit project, change files → Saves correctly
- [ ] Run edited project → Creates jobs with new files
- [ ] Edit project, remove all files → Shows warning
- [ ] Edit project, add more files → All files saved
- [ ] Console logs show correct file IDs
- [ ] Database shows correct messages after edit
