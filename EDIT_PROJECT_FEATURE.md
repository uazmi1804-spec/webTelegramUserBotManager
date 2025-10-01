# ✏️ Edit Project Feature

## 🎯 Overview

Tombol **View** telah diubah menjadi tombol **Edit** yang memungkinkan user untuk:
1. Melihat semua data project yang sudah ada
2. Mengubah/update data project tersebut
3. Save perubahan ke database

---

## 🔄 Perubahan dari View ke Edit

### **Before (View Button)**
```jsx
<Button variant="outline-info" onClick={() => alert('View details')}>
  View
</Button>
```
- ❌ Hanya alert placeholder
- ❌ Tidak ada fungsi real
- ❌ Tidak bisa edit

### **After (Edit Button)**
```jsx
<Button variant="outline-primary" onClick={() => handleShowModal(project)}>
  Edit
</Button>
```
- ✅ Load data project lengkap
- ✅ Tampilkan di form modal
- ✅ Bisa edit dan save
- ✅ Full CRUD functionality

---

## 🎨 UI/UX Flow

### **1. User Klik Edit**
```
Table:
┌──────────────────────────────────────────────────┐
│ Name           │ Status  │ Actions              │
├──────────────────────────────────────────────────┤
│ Promo Ramadan  │ stopped │ [Run] [Edit] [Delete]│ ← Click Edit
└──────────────────────────────────────────────────┘
```

### **2. Modal Terbuka dengan Data Loaded**
```
┌─────────────────────────────────────────────────┐
│ Edit Project                                    │
├─────────────────────────────────────────────────┤
│ Name: [Promo Ramadan                         ] │
│ Description: [Kirim promo ke semua channel   ] │
│                                                 │
│ Session Mode: [Manual ▼]                       │
│ Select Session: [User A (@userA) ▼]           │
│                                                 │
│ Category: [Marketing (10 channels) ▼]         │
│                                                 │
│ Text File: [promo.txt ▼]                       │
│ Media File: [banner.jpg ▼]                     │
│                                                 │
│ [Cancel] [Save Project]                        │
└─────────────────────────────────────────────────┘
```

### **3. User Edit & Save**
```
User changes:
- Name: "Promo Ramadan" → "Promo Ramadan 2025"
- Session: User A → User B
- Category: Marketing → Sales
- Text File: promo.txt → promo-new.txt

Click [Save Project]
→ Update database
→ Success message
→ Table refreshed with new data
```

---

## 💻 Technical Implementation

### **Frontend Changes** (`Projects.js`)

#### **1. Load Project Data**
```javascript
const loadProjectData = async (projectId) => {
  // 1. Get project basic info
  const projectResponse = await axios.get(`/api/projects/${projectId}`);
  setCurrentProject(projectResponse.data.data);

  // 2. Get project sessions
  const sessionsResponse = await axios.get(`/api/projects/${projectId}/sessions`);
  setSelectedSession(sessionsResponse.data.data[0].session_id);
  setSessionSelectionMode(sessionsResponse.data.data[0].selection_mode);

  // 3. Get project targets → find category
  const targetsResponse = await axios.get(`/api/projects/${projectId}/targets`);
  // Match channels to category
  for (const category of categories) {
    const catChannels = await axios.get(`/api/categories/${category.id}/channels`);
    if (allChannelsMatch) {
      setSelectedCategory(category.id);
    }
  }

  // 4. Get project messages → find files
  const messagesResponse = await axios.get(`/api/projects/${projectId}/messages`);
  messagesResponse.data.data.forEach(msg => {
    if (msg.message_type === 'text') {
      setSelectedTextFile(msg.content_ref);
    } else {
      setSelectedMediaFile(msg.content_ref);
    }
  });
};
```

#### **2. Update Project**
```javascript
const updateProject = async (projectId) => {
  // 1. Update basic info
  await axios.put(`/api/projects/${projectId}`, {
    name: currentProject.name,
    description: currentProject.description
  });

  // 2. Update sessions (delete old, add new)
  const oldSessions = await axios.get(`/api/projects/${projectId}/sessions`);
  for (const sess of oldSessions.data.data) {
    await axios.delete(`/api/projects/${projectId}/sessions/${sess.session_id}`);
  }
  await axios.post(`/api/projects/${projectId}/sessions`, {
    session_id: sessionToUse,
    selection_mode: sessionSelectionMode
  });

  // 3. Update targets (delete old, add new from category)
  const oldTargets = await axios.get(`/api/projects/${projectId}/targets`);
  for (const target of oldTargets.data.data) {
    await axios.delete(`/api/projects/${projectId}/targets/${target.id}`);
  }
  const categoryChannels = await axios.get(`/api/categories/${selectedCategory}/channels`);
  for (const channelId of categoryChannels.data.data.map(c => c.id)) {
    await axios.post(`/api/projects/${projectId}/targets`, {
      channel_id: channelId,
      priority: 0
    });
  }

  // 4. Update messages (delete old, add new)
  const oldMessages = await axios.get(`/api/projects/${projectId}/messages`);
  for (const msg of oldMessages.data.data) {
    await axios.delete(`/api/projects/${projectId}/messages/${msg.id}`);
  }
  for (const fileId of [selectedTextFile, selectedMediaFile].filter(Boolean)) {
    const file = await axios.get(`/api/files/${fileId}`);
    await axios.post(`/api/projects/${projectId}/messages`, {
      message_type: file.data.data.file_type,
      content_ref: fileId,
      caption: null
    });
  }

  setSuccess('Project updated successfully');
};
```

#### **3. Handle Submit (Create or Update)**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (currentProject.id) {
    // Edit mode
    await updateProject(currentProject.id);
  } else {
    // Create mode
    await createProject();
  }
  
  fetchProjects();
  handleCloseModal();
};
```

### **Backend Changes** (`projects.js`)

#### **1. GET Single Project**
```javascript
// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM projects WHERE id = ?';
  db.get(sql, [id], (err, row) => {
    if (!row) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true, data: row });
  });
});
```

#### **2. UPDATE Project**
```javascript
// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, owner, config } = req.body;
  
  const sql = 'UPDATE projects SET name = ?, description = ?, owner = ?, config = ?, updated_at = datetime("now") WHERE id = ?';
  db.run(sql, [name, description, owner, JSON.stringify(config), id], function(err) {
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true, data: { id, name, description } });
  });
});
```

---

## 📊 Data Flow Diagram

### **Edit Flow**
```
User clicks [Edit]
    ↓
loadProjectData(projectId)
    ↓
┌─────────────────────────────────────┐
│ Fetch from multiple endpoints:     │
├─────────────────────────────────────┤
│ GET /api/projects/:id               │ → Basic info
│ GET /api/projects/:id/sessions      │ → Session data
│ GET /api/projects/:id/targets       │ → Channel targets
│ GET /api/projects/:id/messages      │ → File messages
│ GET /api/categories/:id/channels    │ → Match category
└─────────────────────────────────────┘
    ↓
Populate form fields
    ↓
Modal opens with data
    ↓
User edits
    ↓
User clicks [Save]
    ↓
updateProject(projectId)
    ↓
┌─────────────────────────────────────┐
│ Update in sequence:                 │
├─────────────────────────────────────┤
│ PUT /api/projects/:id               │ → Update basic
│ DELETE old sessions                 │
│ POST new session                    │
│ DELETE old targets                  │
│ POST new targets                    │
│ DELETE old messages                 │
│ POST new messages                   │
└─────────────────────────────────────┘
    ↓
Success message
    ↓
Refresh table
```

---

## 🎯 Features

### **✅ What Works**

1. **Load Existing Data**
   - ✅ Project name & description
   - ✅ Selected session
   - ✅ Session selection mode (random/manual)
   - ✅ Selected category (matched from channels)
   - ✅ Selected text file
   - ✅ Selected media file

2. **Edit Capabilities**
   - ✅ Change project name
   - ✅ Change description
   - ✅ Change session
   - ✅ Change session mode
   - ✅ Change category (all channels replaced)
   - ✅ Change text file
   - ✅ Change media file

3. **Validation**
   - ✅ Name required
   - ✅ Session required (or random mode)
   - ✅ Category required
   - ✅ At least 1 file required

4. **Database Updates**
   - ✅ Update project table
   - ✅ Replace sessions
   - ✅ Replace targets
   - ✅ Replace messages
   - ✅ Update timestamp

---

## 🧪 Testing Scenarios

### **Test 1: Edit Project Name**
```
1. Click [Edit] on "Promo Ramadan"
2. Change name to "Promo Ramadan 2025"
3. Click [Save]
4. ✅ Table shows new name
5. ✅ Database updated
```

### **Test 2: Change Session**
```
1. Click [Edit] on project
2. Current: User A (manual)
3. Change to: User B (manual)
4. Click [Save]
5. ✅ Project now uses User B
6. ✅ Old session removed
7. ✅ New session added
```

### **Test 3: Change Category**
```
1. Click [Edit] on project
2. Current: Marketing (10 channels)
3. Change to: Sales (5 channels)
4. Click [Save]
5. ✅ Old 10 targets deleted
6. ✅ New 5 targets added
7. ✅ Project now targets Sales channels
```

### **Test 4: Change Files**
```
1. Click [Edit] on project
2. Current: promo.txt + banner.jpg
3. Change to: promo-new.txt + banner-new.jpg
4. Click [Save]
5. ✅ Old messages deleted
6. ✅ New messages added
7. ✅ Project uses new files
```

### **Test 5: Switch Session Mode**
```
1. Click [Edit] on project
2. Current: Manual (User A selected)
3. Change to: Random (no selection)
4. Click [Save]
5. ✅ Random session picked
6. ✅ Mode saved as 'random'
```

---

## ⚠️ Important Notes

### **Category Matching**
- System tries to find which category contains the project's channels
- If channels don't match any category exactly, category field will be empty
- User must select a category to save

### **Session Replacement**
- Old session is completely removed
- New session is added
- If random mode + no selection → random session picked automatically

### **Targets Replacement**
- ALL old targets are deleted
- ALL channels from new category are added
- No partial update (complete replacement)

### **Messages Replacement**
- ALL old messages are deleted
- New messages from selected files are added
- No partial update (complete replacement)

---

## 🚀 Future Enhancements

### **Potential Improvements:**

1. **Partial Updates**
   - Only update changed fields
   - Don't delete/recreate if unchanged
   - More efficient database operations

2. **Validation Improvements**
   - Check if project is running before edit
   - Prevent edit of running projects
   - Or allow edit but warn user

3. **Better Category Matching**
   - Show "Custom" if channels don't match category
   - Allow manual channel selection
   - Support multiple categories

4. **History/Versioning**
   - Track edit history
   - Show who edited and when
   - Ability to rollback changes

5. **Real-time Preview**
   - Show what will change
   - Preview new targets
   - Preview new messages

---

## ✅ Implementation Complete

All features implemented:
- ✅ Edit button replaces View
- ✅ Load project data
- ✅ Populate form fields
- ✅ Edit and save changes
- ✅ Update database
- ✅ Success feedback
- ✅ Table refresh

**Result: Full edit functionality for projects!** 🎉
