# 🗑️ Delete Behavior Documentation

## Overview
Sistem ini memiliki logic smart delete yang otomatis membersihkan dan mengelola project ketika komponen-komponennya dihapus.

---

## 1. 📁 Delete File

### Behavior
```
DELETE /api/files/:id
```

### Logic Flow
1. **Find affected projects** - Cari project yang menggunakan file ini
2. **Delete project_messages** - Hapus relasi file dari project
3. **Check each project** - Cek apakah project masih punya messages
4. **Auto-delete project** - Jika tidak ada messages, hapus project
5. **Delete file** - Hapus file dari disk dan database

### Example
```
File: promo.txt
├─ Project A (text only) ❌ DELETED (no messages left)
├─ Project B (text + photo) ✅ KEPT (still has photo)
└─ Project C (not using this file) ✅ KEPT

Result:
- File deleted
- Project A deleted (no messages)
- Project B kept (has other messages)
- Project C unaffected
```

### Response
```json
{
  "success": true,
  "message": "File \"promo.txt\" deleted successfully",
  "details": {
    "projects_affected": 2,
    "projects_deleted": 1
  }
}
```

---

## 2. 📺 Delete Channel

### Behavior
```
DELETE /api/channels/:id
```

### Logic Flow
1. **Find affected categories** - Cari kategori yang punya channel ini
2. **Delete category_channels** - Hapus relasi channel dari kategori
3. **Find affected projects** - Cari project yang target channel ini
4. **Delete project_targets** - Hapus channel dari project targets
5. **Check each project** - Cek apakah project masih punya targets
6. **Auto-delete project** - Jika tidak ada targets (channels = 0), hapus project
7. **Delete channel** - Hapus channel dari database

### Example
```
Channel: @promo_channel
├─ Category Marketing ✅ KEPT (category not deleted, only relation)
├─ Category Sales ✅ KEPT
├─ Project A (only this channel) ❌ DELETED (no targets left)
└─ Project B (has other channels) ✅ KEPT

Result:
- Channel deleted
- Categories kept (only relations removed)
- Project A deleted (no targets)
- Project B kept (has other targets)
```

### Response
```json
{
  "success": true,
  "message": "Channel \"@promo_channel\" deleted successfully",
  "details": {
    "channel_deleted": true,
    "categories_cleaned": true,
    "projects_affected": 2,
    "projects_deleted": 1,
    "deleted_projects": ["Project A"]
  }
}
```

---

## 3. 🔐 Delete Session

### Behavior
```
DELETE /api/sessions/:id
```

### Logic Flow - SMART REPLACEMENT
1. **Find affected projects** - Cari project yang menggunakan session ini
2. **Check selection_mode** untuk setiap project:
   
   **Mode RANDOM:**
   - ✅ **Try replace** - Cari session lain yang tersedia
   - ✅ **Replace session** - Update project_sessions dengan session baru
   - ❌ **Delete if no other sessions** - Hapus project jika tidak ada session lain
   
   **Mode MANUAL:**
   - ❌ **Always delete** - Hapus project (user pilih session spesifik)

3. **Delete project_sessions** - Hapus relasi session
4. **Delete session** - Hapus session dari database

### Example 1: Random Mode with Available Sessions
```
Session: User A
Available sessions: User B, User C

Project X (random mode, using User A)
→ ✅ REPLACED with User B (auto-selected)
→ Project X continues to work

Result:
- Session User A deleted
- Project X kept and now uses User B
```

### Example 2: Random Mode without Available Sessions
```
Session: User A (LAST SESSION)
Available sessions: NONE

Project X (random mode, using User A)
→ ❌ DELETED (no replacement available)

Result:
- Session User A deleted
- Project X deleted (no sessions available)
```

### Example 3: Manual Mode
```
Session: User A
Available sessions: User B, User C

Project Y (manual mode, specifically chose User A)
→ ❌ DELETED (user chose specific session)

Result:
- Session User A deleted
- Project Y deleted (manual selection, no auto-replace)
```

### Response
```json
{
  "success": true,
  "message": "Session \"John Doe\" deleted successfully",
  "details": {
    "projects_affected": 3,
    "projects_deleted": 1,
    "projects_replaced": 2,
    "deleted_projects": ["Project Manual"],
    "replaced_projects": ["Project Random 1", "Project Random 2"]
  }
}
```

---

## 4. 📂 Delete Category

### Behavior
```
DELETE /api/categories/:id
```

### Logic Flow
1. **Delete category_channels** - Hapus semua relasi channel
2. **Delete category** - Hapus kategori dari database
3. **Projects NOT affected** - Project tidak dihapus (masih punya channel targets)

### Example
```
Category: Marketing
├─ Channel A ✅ KEPT (channel not deleted)
├─ Channel B ✅ KEPT
└─ Project X (targets from this category) ✅ KEPT (targets remain)

Result:
- Category deleted
- Channels kept
- Projects kept (targets not affected)
```

### Response
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## 📊 Summary Table

| Delete | Category | Channel | File | Session (Random) | Session (Manual) |
|--------|----------|---------|------|------------------|------------------|
| **Item Deleted** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Relations Cleaned** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Project Auto-Delete** | ❌ | ✅ (if no targets) | ✅ (if no messages) | ✅ (if no replacement) | ✅ (always) |
| **Project Auto-Replace** | ❌ | ❌ | ❌ | ✅ (if available) | ❌ |

---

## 🎯 Project Auto-Delete Rules

Project akan **OTOMATIS DIHAPUS** jika:

1. **No Targets (Channels = 0)**
   - Semua channel targets dihapus
   - Project tidak bisa run tanpa target

2. **No Messages (Files = 0)**
   - Semua file messages dihapus
   - Project tidak bisa run tanpa content

3. **No Session (Manual Mode)**
   - Session yang dipilih manual dihapus
   - User pilih session spesifik, tidak bisa diganti

4. **No Session Available (Random Mode)**
   - Session terakhir dihapus
   - Tidak ada session lain untuk replace

---

## 🔄 Project Auto-Replace Rules

Project akan **OTOMATIS DI-REPLACE** jika:

1. **Random Mode + Session Deleted + Other Sessions Available**
   ```
   Project: Random mode
   Deleted: Session A
   Available: Session B, C
   → Replace with Session B (random pick)
   ```

2. **Result:**
   - Project tetap ada
   - Session diganti otomatis
   - Project bisa tetap run

---

## 🧪 Testing Scenarios

### Scenario 1: Delete Last File from Project
```bash
# Setup
Project A: text.txt + photo.jpg
Project B: text.txt only

# Action
DELETE /api/files/{text.txt}

# Result
✅ Project A kept (still has photo.jpg)
❌ Project B deleted (no messages left)
```

### Scenario 2: Delete Last Channel from Project
```bash
# Setup
Project A: @channel1 + @channel2
Project B: @channel1 only

# Action
DELETE /api/channels/{@channel1}

# Result
✅ Project A kept (still has @channel2)
❌ Project B deleted (no targets left)
```

### Scenario 3: Delete Session (Random Mode)
```bash
# Setup
Sessions: User A, User B, User C
Project X: Random mode, using User A

# Action
DELETE /api/sessions/{User A}

# Result
✅ Project X kept
✅ Session replaced: User A → User B (auto-selected)
```

### Scenario 4: Delete Session (Manual Mode)
```bash
# Setup
Sessions: User A, User B, User C
Project Y: Manual mode, specifically chose User A

# Action
DELETE /api/sessions/{User A}

# Result
❌ Project Y deleted
❌ No replacement (manual selection)
```

### Scenario 5: Delete Last Session
```bash
# Setup
Sessions: User A (ONLY ONE)
Project Z: Random mode, using User A

# Action
DELETE /api/sessions/{User A}

# Result
❌ Project Z deleted
❌ No replacement available
```

---

## 🛡️ Safety Features

1. **Cascade Delete** - Foreign keys dengan ON DELETE CASCADE
2. **Orphan Cleanup** - Hapus relasi yang tidak valid
3. **Smart Replace** - Auto-replace session di random mode
4. **Detailed Response** - Info lengkap tentang apa yang terjadi
5. **Transaction Safety** - Operasi delete dalam urutan yang aman

---

## 📝 Best Practices

### Before Deleting
1. **Check usage** - Lihat di mana item digunakan
2. **Backup** - Backup database jika perlu
3. **Inform users** - Beri warning jika akan hapus item penting

### After Deleting
1. **Check response** - Lihat detail apa yang terhapus
2. **Verify** - Pastikan project yang tersisa masih valid
3. **Monitor** - Cek logs untuk error

---

## 🔍 Debugging

### Check Project Validity
```sql
-- Projects with no targets
SELECT p.id, p.name 
FROM projects p
LEFT JOIN project_targets pt ON p.id = pt.project_id
WHERE pt.id IS NULL;

-- Projects with no messages
SELECT p.id, p.name 
FROM projects p
LEFT JOIN project_messages pm ON p.id = pm.project_id
WHERE pm.id IS NULL;

-- Projects with no sessions
SELECT p.id, p.name 
FROM projects p
LEFT JOIN project_sessions ps ON p.id = ps.project_id
WHERE ps.id IS NULL;
```

### Manual Cleanup
```sql
-- Delete invalid projects
DELETE FROM projects 
WHERE id NOT IN (SELECT DISTINCT project_id FROM project_targets)
   OR id NOT IN (SELECT DISTINCT project_id FROM project_messages)
   OR id NOT IN (SELECT DISTINCT project_id FROM project_sessions);
```

---

## ✅ Implementation Complete

All delete operations now have:
- ✅ Smart cleanup logic
- ✅ Auto-delete invalid projects
- ✅ Auto-replace sessions (random mode)
- ✅ Detailed response messages
- ✅ Safe cascade operations
