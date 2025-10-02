# 📝 Logging System Documentation

## 🎯 Overview

Sistem logging lengkap telah ditambahkan untuk mempermudah debugging dan monitoring proses pengiriman pesan ke channel.

---

## 📁 Log Files

### **Python Service**
```
Location: /python-service/telegram_service.log
Format: timestamp - logger_name - level - message
```

### **Log Levels**
- `INFO` - Normal operations
- `WARNING` - Potential issues (duplicates, fallbacks)
- `ERROR` - Errors and exceptions
- `CRITICAL` - Critical failures

---

## 📊 Log Output Example

### **Successful Comment Send**
```
================================================================================
📨 NEW REQUEST - Send Message to Channel
Channel: @promo_channel
Type: photo
File: /uploads/banner.jpg
Caption length: 45 chars
================================================================================
🔐 Creating Pyrogram client...
🚀 Starting client...
✅ Client started successfully
📝 Reply text: Check our website for more info!
🔍 STEP 1: Checking for duplicates in last 30 messages...
  📄 Checking message 1/30 (ID: 12345)
    💬 Getting discussion replies for message 12345...
      🔍 Comment 1: Great product!
      🔍 Comment 2: Thanks for sharing
    ✅ Checked 2 comments on message 12345
    ✅ Message 12345 is suitable for commenting (no duplicates)
📊 Checked 1 messages total
🎯 STEP 2: Getting discussion message for ID 12345...
✅ Discussion message retrieved
📤 STEP 3: Sending comment...
  📸 Sending media comment: photo (.jpg)
  File path: /uploads/banner.jpg
  🖼️ Sending as photo...
  ✅ Photo sent successfully!
🛑 Stopping client...
✅ Client stopped
================================================================================
✅ SUCCESS - Comment sent to @promo_channel
Message ID: 67890
Parent Message ID: 12345
================================================================================
```

### **Duplicate Detected (Skipped)**
```
================================================================================
📨 NEW REQUEST - Send Message to Channel
Channel: @promo_channel
Type: text
File: None
Caption length: 45 chars
================================================================================
🔐 Creating Pyrogram client...
🚀 Starting client...
✅ Client started successfully
📝 Reply text: Check our website for more info!
🔍 STEP 1: Checking for duplicates in last 30 messages...
  📄 Checking message 1/30 (ID: 12345)
    💬 Getting discussion replies for message 12345...
      🔍 Comment 1: Check our website for more info!
      ⚠️ DUPLICATE FOUND! Comment matches our text
      Existing: Check our website for more info!
      Our text: Check our website for more info!
    ✅ Checked 1 comments on message 12345
📊 Checked 1 messages total
⏭️ SKIPPING: Duplicate comment detected
```

### **Comments Disabled Error**
```
================================================================================
📨 NEW REQUEST - Send Message to Channel
Channel: @private_channel
Type: text
File: None
Caption length: 20 chars
================================================================================
🔐 Creating Pyrogram client...
🚀 Starting client...
✅ Client started successfully
📝 Reply text: Hello channel!
🔍 STEP 1: Checking for duplicates in last 30 messages...
  📄 Checking message 1/30 (ID: 12345)
    💬 Getting discussion replies for message 12345...
    ❌ Cannot check comments on message 12345: CHAT_DISCUSSION_UNALLOWED
    Reason: ChatDiscussionUnallowed
  📄 Checking message 2/30 (ID: 12344)
    ❌ Cannot check comments on message 12344: CHAT_DISCUSSION_UNALLOWED
    Reason: ChatDiscussionUnallowed
  ...
📊 Checked 30 messages total
❌ No suitable message found to comment on
Possible reasons:
  - Comments are disabled on channel
  - No messages in channel
  - All messages already have duplicate comments
================================================================================
❌ HTTP EXCEPTION
Status: 400
Detail: No suitable message found to comment on or comments are disabled
================================================================================
```

### **Media Send Error with Fallback**
```
================================================================================
📨 NEW REQUEST - Send Message to Channel
Channel: @promo_channel
Type: photo
File: /uploads/banner.jpg
Caption length: 30 chars
================================================================================
...
📤 STEP 3: Sending comment...
  📸 Sending media comment: photo (.jpg)
  File path: /uploads/banner.jpg
  🖼️ Sending as photo...
  ❌ Failed to send media: FILE_NOT_FOUND
  Error type: FileNotFoundError
  🔄 Falling back to text-only...
  ✅ Text fallback sent successfully!
🛑 Stopping client...
✅ Client stopped
================================================================================
✅ SUCCESS - Comment sent to @promo_channel (text fallback)
Message ID: 67890
Parent Message ID: 12345
================================================================================
```

---

## 🔍 Log Analysis Guide

### **Finding Errors**
```bash
# View all errors
grep "❌" telegram_service.log

# View warnings
grep "⚠️" telegram_service.log

# View specific channel
grep "@promo_channel" telegram_service.log

# View today's logs
grep "2025-10-02" telegram_service.log

# Follow logs in real-time
tail -f telegram_service.log
```

### **Common Error Patterns**

#### **1. Comments Disabled**
```
❌ Cannot check comments on message: CHAT_DISCUSSION_UNALLOWED
```
**Solution:** Enable comments on channel

#### **2. File Not Found**
```
❌ Failed to send media: FILE_NOT_FOUND
```
**Solution:** Check file path, ensure file exists

#### **3. Permission Denied**
```
❌ Failed to send media: CHAT_WRITE_FORBIDDEN
```
**Solution:** Check user permissions in channel

#### **4. Session Expired**
```
❌ UNEXPECTED ERROR
Error type: AuthKeyUnregistered
```
**Solution:** Re-login session

#### **5. Rate Limit**
```
❌ Failed to send: FLOOD_WAIT_X
```
**Solution:** Wait X seconds, increase delays

---

## 📊 Log Structure

### **Request Start**
```
================================================================================
📨 NEW REQUEST - Send Message to Channel
Channel: [channel_id]
Type: [message_type]
File: [file_path]
Caption length: [N] chars
================================================================================
```

### **Step 1: Duplicate Check**
```
🔍 STEP 1: Checking for duplicates in last 30 messages...
  📄 Checking message [N]/30 (ID: [message_id])
    💬 Getting discussion replies for message [message_id]...
      🔍 Comment [N]: [comment_text]
    ✅ Checked [N] comments on message [message_id]
📊 Checked [N] messages total
```

### **Step 2: Get Discussion**
```
🎯 STEP 2: Getting discussion message for ID [message_id]...
✅ Discussion message retrieved
```

### **Step 3: Send Comment**
```
📤 STEP 3: Sending comment...
  📸 Sending media comment: [type] ([ext])
  🖼️ Sending as photo...
  ✅ Photo sent successfully!
```

### **Success Response**
```
================================================================================
✅ SUCCESS - Comment sent to [channel]
Message ID: [message_id]
Parent Message ID: [parent_id]
================================================================================
```

### **Error Response**
```
================================================================================
❌ [ERROR_TYPE]
Status: [status_code]
Detail: [error_detail]
Channel: [channel_id]
Message type: [type]
================================================================================
```

---

## 🧪 Testing Logs

### **Test 1: Run Project and Check Logs**
```bash
# Terminal 1: Watch logs
cd python-service
tail -f telegram_service.log

# Terminal 2: Run project
# Click Run in frontend

# Expected output in Terminal 1:
# - Request received
# - Client started
# - Checking messages
# - Sending comment
# - Success
```

### **Test 2: Simulate Duplicate**
```bash
# Run project twice with same content
# First run: ✅ Comment sent
# Second run: ⏭️ Skipped (duplicate)

# Check logs:
grep "DUPLICATE FOUND" telegram_service.log
```

### **Test 3: Error Debugging**
```bash
# If error occurs, check:
grep "❌" telegram_service.log | tail -20

# Get full context:
grep -A 10 "❌ UNEXPECTED ERROR" telegram_service.log
```

---

## 🎯 Benefits

### **1. Easy Debugging**
- ✅ See exactly what's happening
- ✅ Identify errors quickly
- ✅ Trace request flow

### **2. Monitoring**
- ✅ Track success rate
- ✅ Identify problematic channels
- ✅ Monitor performance

### **3. Troubleshooting**
- ✅ Clear error messages
- ✅ Suggested solutions
- ✅ Full context

### **4. Development**
- ✅ Understand flow
- ✅ Test features
- ✅ Verify behavior

---

## 📝 Log Rotation (Recommended)

### **Setup Log Rotation**
```python
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'telegram_service.log',
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5  # Keep 5 backup files
)
```

### **Or Use logrotate (Linux)**
```bash
# /etc/logrotate.d/telegram-service
/path/to/telegram_service.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## ✅ Summary

**Logging lengkap ditambahkan:**
- ✅ Request details (channel, type, file, caption)
- ✅ Step-by-step execution logs
- ✅ Duplicate detection logs
- ✅ Success/error messages
- ✅ Full error context
- ✅ File output + console output

**Log file:** `telegram_service.log`

**Cara lihat:**
```bash
tail -f python-service/telegram_service.log
```

**Result: Easy debugging and monitoring!** 🔍
