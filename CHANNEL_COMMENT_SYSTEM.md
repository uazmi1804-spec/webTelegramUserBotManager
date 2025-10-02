# 💬 Channel Comment System

## 🎯 Perubahan Sistem Pengiriman

### **BEFORE: Direct Message**
```python
# Kirim langsung ke channel
await client.send_message(chat_id, text=caption)
await client.send_photo(chat_id, photo=file_path, caption=caption)
await client.send_video(chat_id, video=file_path, caption=caption)
```
❌ **Masalah:**
- Kirim sebagai post baru
- Tidak ada pengecekan duplikat
- Bisa spam channel dengan pesan sama

### **AFTER: Comment on Channel Posts**
```python
# 1. Cek duplikat di comments
# 2. Cari message yang bisa dikomentari
# 3. Get discussion message
# 4. Reply sebagai comment
await discussion_message.reply_photo(photo=file_path, caption=reply_text)
```
✅ **Keuntungan:**
- Kirim sebagai comment, bukan post baru
- Pengecekan duplikat otomatis
- Tidak spam channel
- Lebih natural dan engaging

---

## 🔄 Alur Lengkap

### **Step 1: Check Duplicate Comments**
```python
# Loop 30 pesan terakhir di channel
async for message in client.get_chat_history(chat_id=channel, limit=30):
    message_id = message.id
    
    # Cek 10 comment terakhir di setiap message
    async for comment in client.get_discussion_replies(
        chat_id=channel, 
        message_id=message_id, 
        limit=10
    ):
        comment_text = comment.text or comment.caption
        comment_text_lower = comment_text.strip().lower()
        reply_text_lower = reply_text.strip().lower()
        
        # Bandingkan text (case-insensitive)
        if reply_text_lower in comment_text_lower:
            # DUPLICATE FOUND! Skip sending
            return {"skipped": True, "reason": "Duplicate"}
```

**Pengecekan:**
- ✅ Case-insensitive (tidak peduli huruf besar/kecil)
- ✅ Strip whitespace
- ✅ Cek 30 message terakhir
- ✅ Cek 10 comment per message
- ✅ Skip jika duplikat ditemukan

### **Step 2: Find Suitable Message**
```python
# Cari message yang:
# 1. Belum ada comment duplikat
# 2. Comments enabled (bisa dikomentari)

if not comment_found and comment_count >= 0:
    message_id_to_comment = message_id
    break  # Use this message!
```

### **Step 3: Get Discussion Message**
```python
discussion_message = await client.get_discussion_message(
    chat_id=channel, 
    message_id=message_id_to_comment
)
```

### **Step 4: Send Comment**
```python
# Photo comment
if ext in [".png", ".jpg", ".jpeg", ".gif"]:
    result = await discussion_message.reply_photo(
        photo=file_path, 
        caption=reply_text
    )

# Video comment
elif ext in [".mp4", ".mov", ".avi", ".mkv"]:
    result = await discussion_message.reply_video(
        video=file_path, 
        caption=reply_text
    )

# Text comment (fallback)
else:
    result = await discussion_message.reply(
        reply_text, 
        parse_mode=ParseMode.MARKDOWN
    )
```

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────┐
│ POST /send_message                              │
│ {                                               │
│   "chat_id": "@channel",                        │
│   "message_type": "photo",                      │
│   "file_path": "/path/banner.jpg",              │
│   "caption": "Promo text"                       │
│ }                                               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ STEP 1: Check Duplicate                         │
├─────────────────────────────────────────────────┤
│ Get last 30 messages from channel               │
│   ↓                                             │
│ For each message:                               │
│   Get last 10 comments                          │
│   ↓                                             │
│   Compare text (case-insensitive):              │
│   - "Promo text" vs existing comments           │
│   ↓                                             │
│   If duplicate found:                           │
│     ✅ SKIP! Return {"skipped": true}           │
│   ↓                                             │
│   If no duplicate:                              │
│     ✅ Use this message_id                      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ STEP 2: Get Discussion Message                  │
├─────────────────────────────────────────────────┤
│ discussion_message = get_discussion_message(    │
│   chat_id=channel,                              │
│   message_id=selected_message_id                │
│ )                                               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ STEP 3: Send Comment                            │
├─────────────────────────────────────────────────┤
│ If photo:                                       │
│   discussion_message.reply_photo(...)           │
│ Elif video:                                     │
│   discussion_message.reply_video(...)           │
│ Else:                                           │
│   discussion_message.reply(text)                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ RESPONSE                                        │
├─────────────────────────────────────────────────┤
│ {                                               │
│   "success": true,                              │
│   "skipped": false,                             │
│   "data": {                                     │
│     "message_id": 12345,                        │
│     "parent_message_id": 67890,                 │
│     "chat_id": -1001234567890,                  │
│     "date": "2025-10-01T23:00:00"               │
│   }                                             │
│ }                                               │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Contoh Skenario

### **Skenario 1: First Comment (No Duplicate)**
```
Channel: @promo_channel
Last 30 messages:
  - Message 100: "New product launch!"
    Comments: (none)
  - Message 99: "Special discount today"
    Comments: (none)

Request:
  caption: "Check our website for more info!"
  
Process:
  1. Check message 100 comments → No duplicate ✅
  2. Use message 100
  3. Get discussion_message(100)
  4. Send comment: "Check our website for more info!"
  
Result:
  ✅ Comment posted on message 100
```

### **Skenario 2: Duplicate Found**
```
Channel: @promo_channel
Last 30 messages:
  - Message 100: "New product launch!"
    Comments:
      - "Check our website for more info!" ← DUPLICATE!
      - "Great product!"

Request:
  caption: "Check our website for more info!"
  
Process:
  1. Check message 100 comments
  2. Found duplicate: "check our website..." ✅
  3. SKIP sending
  
Result:
  ⏭️ Skipped (duplicate detected)
  Response: {"skipped": true, "reason": "Duplicate comment detected"}
```

### **Skenario 3: Photo Comment**
```
Request:
  message_type: "photo"
  file_path: "/uploads/banner.jpg"
  caption: "🎉 50% OFF Today!"
  
Process:
  1. Check duplicates → None found
  2. Find suitable message → Message 100
  3. Get discussion_message(100)
  4. Send: discussion_message.reply_photo(
       photo="banner.jpg",
       caption="🎉 50% OFF Today!"
     )
  
Result:
  ✅ Photo comment posted with caption
```

### **Skenario 4: Video Comment**
```
Request:
  message_type: "video"
  file_path: "/uploads/promo.mp4"
  caption: "Watch our new ad!"
  
Process:
  1. Check duplicates → None found
  2. Find suitable message → Message 100
  3. Get discussion_message(100)
  4. Send: discussion_message.reply_video(
       video="promo.mp4",
       caption="Watch our new ad!"
     )
  
Result:
  ✅ Video comment posted with caption
```

### **Skenario 5: Comments Disabled**
```
Channel: @private_channel
All messages: Comments disabled

Request:
  caption: "Hello!"
  
Process:
  1. Try to get_discussion_replies → Error!
  2. Try next message → Error!
  3. No suitable message found
  
Result:
  ❌ Error: "No suitable message found to comment on or comments are disabled"
```

---

## 📝 Response Format

### **Success (Comment Sent)**
```json
{
  "success": true,
  "skipped": false,
  "data": {
    "message_id": 12345,
    "chat_id": -1001234567890,
    "date": "2025-10-01T23:00:00",
    "parent_message_id": 67890
  }
}
```

### **Success (Skipped - Duplicate)**
```json
{
  "success": true,
  "skipped": true,
  "reason": "Duplicate comment detected",
  "data": {
    "message_id": null,
    "chat_id": "@promo_channel",
    "date": null
  }
}
```

### **Error (Comments Disabled)**
```json
{
  "detail": "No suitable message found to comment on or comments are disabled"
}
```

### **Error (Other)**
```json
{
  "detail": "Error message here"
}
```

---

## 🔍 Duplicate Detection Logic

### **Case-Insensitive Comparison**
```python
# Original texts
comment_text = "Check Our Website For More Info!"
reply_text = "check our website for more info!"

# Normalized
comment_text_lower = "check our website for more info!"
reply_text_lower = "check our website for more info!"

# Compare
if reply_text_lower in comment_text_lower:
    # DUPLICATE! ✅
```

### **Partial Match**
```python
# Existing comment
comment_text = "Hey! Check our website for more info! Thanks!"

# New comment
reply_text = "check our website for more info"

# Normalized
comment_text_lower = "hey! check our website for more info! thanks!"
reply_text_lower = "check our website for more info"

# Compare (substring match)
if reply_text_lower in comment_text_lower:
    # DUPLICATE! ✅ (partial match)
```

### **Whitespace Handling**
```python
# With extra spaces
comment_text = "  Check our website  "
reply_text = "Check our website"

# After strip()
comment_text_lower = "check our website"
reply_text_lower = "check our website"

# DUPLICATE! ✅
```

---

## ⚙️ Configuration

### **Adjustable Parameters**

```python
# Number of messages to check
HISTORY_LIMIT = 30  # Check last 30 messages

# Number of comments to check per message
COMMENT_LIMIT = 10  # Check last 10 comments

# Can be adjusted based on needs:
async for message in client.get_chat_history(chat_id=channel, limit=HISTORY_LIMIT):
    async for comment in client.get_discussion_replies(chat_id=channel, message_id=message_id, limit=COMMENT_LIMIT):
```

**Recommendations:**
- `HISTORY_LIMIT`: 20-50 (balance between thoroughness and speed)
- `COMMENT_LIMIT`: 10-20 (most channels don't have many comments per post)

---

## 🚀 Benefits

### **1. No Spam**
- ✅ Duplicate detection prevents spam
- ✅ Only one comment per unique text
- ✅ Channel stays clean

### **2. Natural Engagement**
- ✅ Comments instead of posts
- ✅ More engaging for users
- ✅ Better for channel growth

### **3. Smart Fallback**
- ✅ Photo fails → Send as text
- ✅ Video fails → Send as text
- ✅ Always delivers content

### **4. Flexible**
- ✅ Supports text, photo, video
- ✅ Markdown formatting
- ✅ Caption support

---

## ⚠️ Important Notes

### **Channel Requirements**
1. **Comments must be enabled** on the channel
2. **Discussion group** must be linked to channel
3. **Bot/User must have permission** to comment

### **Limitations**
1. Only checks last 30 messages (configurable)
2. Only checks last 10 comments per message (configurable)
3. Requires discussion group to be enabled

### **Error Handling**
- If comments disabled → Error returned
- If media fails → Fallback to text
- If duplicate found → Skip with success response

---

## 🧪 Testing

### **Test 1: Send First Comment**
```bash
POST /send_message
{
  "session_string": "...",
  "chat_id": "@test_channel",
  "message_type": "text",
  "caption": "Test comment 1"
}

Expected: ✅ Comment posted
```

### **Test 2: Send Duplicate**
```bash
POST /send_message
{
  "session_string": "...",
  "chat_id": "@test_channel",
  "message_type": "text",
  "caption": "Test comment 1"  # Same as before
}

Expected: ⏭️ Skipped (duplicate)
```

### **Test 3: Photo Comment**
```bash
POST /send_message
{
  "session_string": "...",
  "chat_id": "@test_channel",
  "message_type": "photo",
  "file_path": "/path/image.jpg",
  "caption": "Photo test"
}

Expected: ✅ Photo comment posted
```

### **Test 4: Comments Disabled**
```bash
POST /send_message
{
  "session_string": "...",
  "chat_id": "@private_channel",  # No comments
  "message_type": "text",
  "caption": "Test"
}

Expected: ❌ Error: "No suitable message found"
```

---

## ✅ Summary

**Sistem baru menggunakan:**
1. ✅ `get_chat_history()` - Ambil pesan channel
2. ✅ `get_discussion_replies()` - Cek comment existing
3. ✅ `get_discussion_message()` - Get message untuk comment
4. ✅ `reply_photo()` / `reply_video()` / `reply()` - Kirim comment

**Keuntungan:**
- 🚫 No spam (duplicate detection)
- 💬 Natural comments (not posts)
- 🔄 Smart fallback (media → text)
- ✅ Case-insensitive matching

**Result: Smart channel commenting system!** 🎉
