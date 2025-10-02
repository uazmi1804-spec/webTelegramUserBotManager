from fastapi import FastAPI, HTTPException, Request
from pyrogram import Client
from pyrogram.types import Message
import asyncio
import json
import os
from typing import Optional
import tempfile
import hashlib
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('telegram_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Pyrogram Telegram Service", description="Internal service for handling Telegram operations")

# Dictionary to store ongoing sessions for multi-step authentication
authentication_sessions = {}

@app.post("/export_session")
async def export_session(request: Request):
    """Export session string for a given phone number"""
    data = await request.json()
    api_id = data.get("api_id")
    api_hash = data.get("api_hash")
    phone_number = data.get("phone_number")
    
    try:
        # Generate a unique session name to avoid conflicts
        session_name = f"temp_{hashlib.md5(phone_number.encode()).hexdigest()}"
        
        # Create a temporary client
        client = Client(
            session_name,
            api_id=api_id,
            api_hash=api_hash,
        )
        
        await client.connect()
        
        # Send code to phone number
        sent_code = await client.send_code(phone_number)
        
        # Store the client temporarily for this authentication session
        session_id = f"auth_{hashlib.md5((phone_number + str(sent_code.phone_code_hash)).encode()).hexdigest()}"
        authentication_sessions[session_id] = {
            "client": client,
            "phone_number": phone_number,
            "phone_code_hash": sent_code.phone_code_hash
        }
        
        return {
            "success": True,
            "session_id": session_id,
            "message": f"Code sent to {phone_number}. Please provide the code to complete authentication.",
            "phone_code_hash": sent_code.phone_code_hash
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/complete_auth")
async def complete_auth(request: Request):
    """Complete the authentication process with the code received; supports 2FA password."""
    data = await request.json()
    session_id = data.get("session_id")
    phone_code = data.get("phone_code")
    password = data.get("password")
    
    if session_id not in authentication_sessions:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
    auth_session = authentication_sessions[session_id]
    client = auth_session["client"]
    
    try:
        # Sign in with the code
        await client.sign_in(auth_session["phone_number"], auth_session["phone_code_hash"], phone_code)
    except Exception as e:
        # If session requires password
        from pyrogram import errors
        if isinstance(e, errors.SessionPasswordNeeded):
            if not password:
                raise HTTPException(status_code=401, detail="PASSWORD_REQUIRED")
            try:
                await client.check_password(password)
            except Exception as e2:
                raise HTTPException(status_code=401, detail="BAD_PASSWORD")
        else:
            raise HTTPException(status_code=400, detail=str(e))

    try:
        # Export the session string
        session_string = await client.export_session_string()
        
        # Clean up the temporary authentication session
        del authentication_sessions[session_id]
        
        # Disconnect the client
        await client.disconnect()
        
        return {
            "success": True,
            "session_string": session_string
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/send_message")
async def send_message(request: Request):
    """Send a comment to a channel post (not direct message)"""
    data = await request.json()
    session_string = data.get("session_string")
    chat_id = data.get("chat_id")  # Channel username or ID
    message_type = data.get("message_type")
    file_path = data.get("file_path")
    caption = data.get("caption", "")
    
    logger.info(f"=" * 80)
    logger.info(f"📨 NEW REQUEST - Send Message to Channel")
    logger.info(f"Channel: {chat_id}")
    logger.info(f"Type: {message_type}")
    logger.info(f"File: {file_path}")
    logger.info(f"Caption length: {len(caption) if caption else 0} chars")
    logger.info(f"=" * 80)
    
    # Validate required parameters
    if not session_string:
        logger.error("❌ Missing session_string")
        raise HTTPException(status_code=400, detail="session_string is required")
    
    if not chat_id:
        logger.error("❌ Missing chat_id")
        raise HTTPException(status_code=400, detail="chat_id is required")
    
    try:
        # Create a client with the session string
        logger.info(f"🔐 Creating Pyrogram client...")
        client = Client("temp_client", session_string=session_string)
        
        logger.info(f"🚀 Starting client...")
        await client.start()
        logger.info(f"✅ Client started successfully")
        
        # Text content to send and check for duplicates
        reply_text = caption if caption else ""
        logger.info(f"📝 Reply text: {reply_text[:50]}..." if len(reply_text) > 50 else f"📝 Reply text: {reply_text}")
        
        # Step 1: Check for duplicate comments and find a message to comment on
        message_id_to_comment = None
        comment_found = False
        
        logger.info(f"🔍 STEP 1: Checking for duplicates in last 30 messages...")
        # Get recent channel history (last 30 messages)
        message_count = 0
        async for message in client.get_chat_history(chat_id=chat_id, limit=30):
            message_count += 1
            message_id = message.id
            logger.info(f"  📄 Checking message {message_count}/30 (ID: {message_id})")
            
            comment_count = None  # Initialize outside try block
            try:
                # Check existing comments on this message
                comment_count = 0
                logger.info(f"    💬 Getting discussion replies for message {message_id}...")
                
                async for comment in client.get_discussion_replies(chat_id=chat_id, message_id=message_id, limit=10):
                    comment_count += 1
                    comment_text = comment.text if comment.text else comment.caption
                    
                    if comment_text:
                        comment_text_lower = comment_text.strip().lower()
                        reply_text_lower = reply_text.strip().lower()
                        
                        logger.info(f"      🔍 Comment {comment_count}: {comment_text[:30]}...")
                        
                        # Check if similar comment already exists (case-insensitive)
                        if reply_text_lower and reply_text_lower in comment_text_lower:
                            comment_found = True
                            logger.warning(f"      ⚠️ DUPLICATE FOUND! Comment matches our text")
                            logger.warning(f"      Existing: {comment_text[:50]}...")
                            logger.warning(f"      Our text: {reply_text[:50]}...")
                            break
                
                logger.info(f"    ✅ Checked {comment_count} comments on message {message_id}")
                
                # If no duplicate found and comments are enabled, use this message
                if not comment_found and comment_count is not None and comment_count >= 0:
                    message_id_to_comment = message_id
                    logger.info(f"    ✅ Message {message_id} is suitable for commenting (no duplicates)")
                    break
                    
            except Exception as e:
                # If get_discussion_replies fails, comments might be disabled
                logger.error(f"    ❌ Cannot check comments on message {message_id}: {str(e)}")
                logger.error(f"    Reason: {type(e).__name__}")
                continue
        
        logger.info(f"📊 Checked {message_count} messages total")
        
        # If duplicate found, return without sending
        if comment_found:
            logger.warning(f"⏭️ SKIPPING: Duplicate comment detected")
            await client.stop()
            return {
                "success": True,
                "skipped": True,
                "reason": "Duplicate comment detected",
                "data": {
                    "message_id": None,
                    "chat_id": chat_id,
                    "date": None
                }
            }
        
        # If no suitable message found
        if not message_id_to_comment:
            logger.error(f"❌ No suitable message found to comment on")
            logger.error(f"Possible reasons:")
            logger.error(f"  - Comments are disabled on channel")
            logger.error(f"  - No messages in channel")
            logger.error(f"  - All messages already have duplicate comments")
            await client.stop()
            raise HTTPException(status_code=400, detail="No suitable message found to comment on or comments are disabled")
        
        logger.info(f"🎯 STEP 2: Getting discussion message for ID {message_id_to_comment}...")
        # Step 2: Get discussion message
        discussion_message = await client.get_discussion_message(chat_id=chat_id, message_id=message_id_to_comment)
        logger.info(f"✅ Discussion message retrieved")
        
        logger.info(f"📤 STEP 3: Sending comment...")
        # Step 3: Send comment based on file type
        result = None
        
        if file_path and message_type in ["photo", "video"]:
            import os
            ext = os.path.splitext(file_path)[1].lower()
            logger.info(f"  📸 Sending media comment: {message_type} ({ext})")
            logger.info(f"  File path: {file_path}")
            
            try:
                if message_type == "photo" or ext in [".png", ".jpg", ".jpeg", ".gif"]:
                    logger.info(f"  🖼️ Sending as photo...")
                    result = await discussion_message.reply_photo(photo=file_path, caption=reply_text)
                    logger.info(f"  ✅ Photo sent successfully!")
                elif message_type == "video" or ext in [".mp4", ".mov", ".avi", ".mkv"]:
                    logger.info(f"  🎥 Sending as video...")
                    result = await discussion_message.reply_video(video=file_path, caption=reply_text)
                    logger.info(f"  ✅ Video sent successfully!")
                else:
                    # Fallback to text if file type not recognized
                    logger.warning(f"  ⚠️ Unknown file type, sending as text")
                    from pyrogram.enums import ParseMode
                    result = await discussion_message.reply(reply_text, parse_mode=ParseMode.MARKDOWN)
                    logger.info(f"  ✅ Text sent successfully!")
            except Exception as e:
                # If media fails, send as text
                logger.error(f"  ❌ Failed to send media: {str(e)}")
                logger.error(f"  Error type: {type(e).__name__}")
                logger.warning(f"  🔄 Falling back to text-only...")
                from pyrogram.enums import ParseMode
                result = await discussion_message.reply(reply_text, parse_mode=ParseMode.MARKDOWN)
                logger.info(f"  ✅ Text fallback sent successfully!")
        else:
            # Text only
            logger.info(f"  📝 Sending text-only comment...")
            from pyrogram.enums import ParseMode
            result = await discussion_message.reply(reply_text, parse_mode=ParseMode.MARKDOWN)
            logger.info(f"  ✅ Text sent successfully!")
        
        logger.info(f"🛑 Stopping client...")
        await client.stop()
        logger.info(f"✅ Client stopped")
        
        logger.info(f"=" * 80)
        logger.info(f"✅ SUCCESS - Comment sent to {chat_id}")
        logger.info(f"Message ID: {result.id}")
        logger.info(f"Parent Message ID: {message_id_to_comment}")
        logger.info(f"=" * 80)
        
        return {
            "success": True,
            "skipped": False,
            "data": {
                "message_id": result.id,
                "chat_id": result.chat.id,
                "date": result.date.isoformat() if result.date else None,
                "parent_message_id": message_id_to_comment
            }
        }
    except HTTPException as he:
        logger.error(f"=" * 80)
        logger.error(f"❌ HTTP EXCEPTION")
        logger.error(f"Status: {he.status_code}")
        logger.error(f"Detail: {he.detail}")
        logger.error(f"=" * 80)
        raise he
    except Exception as e:
        logger.error(f"=" * 80)
        logger.error(f"❌ UNEXPECTED ERROR")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Channel: {chat_id}")
        logger.error(f"Message type: {message_type}")
        logger.error(f"=" * 80)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_chat")
async def get_chat(request: Request):
    """Get chat information"""
    session_string = request.query_params.get("session_string")
    chat_id = request.query_params.get("chat_id")
    
    try:
        client = Client("temp_client", session_string=session_string)
        await client.start()
        
        chat = await client.get_chat(chat_id)
        await client.stop()
        
        return {
            "success": True,
            "data": {
                "id": chat.id,
                "type": chat.type,
                "title": chat.title,
                "username": chat.username,
                "first_name": chat.first_name,
                "last_name": chat.last_name,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_chat_history")
async def get_chat_history(request: Request):
    """Get chat history"""
    session_string = request.query_params.get("session_string")
    chat_id = request.query_params.get("chat_id")
    limit = int(request.query_params.get("limit", 10))
    offset = int(request.query_params.get("offset", 0))
    
    try:
        client = Client("temp_client", session_string=session_string)
        await client.start()
        
        messages = []
        async for message in client.get_chat_history(chat_id, limit=limit):
            messages.append({
                "id": message.id,
                "text": message.text,
                "date": message.date.isoformat() if message.date else None,
                "from_user": {
                    "id": message.from_user.id if message.from_user else None,
                    "first_name": message.from_user.first_name if message.from_user else None,
                    "username": message.from_user.username if message.from_user else None,
                } if message.from_user else None
            })
        
        await client.stop()
        
        return {
            "success": True,
            "data": messages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_me")
async def get_me(request: Request):
    """Get information about the current user"""
    session_string = request.query_params.get("session_string")
    
    try:
        client = Client("temp_client", session_string=session_string)
        await client.start()
        
        me = await client.get_me()
        await client.stop()
        
        return {
            "success": True,
            "data": {
                "id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username,
                "phone_number": me.phone_number,
                "is_premium": me.is_premium,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reply")
async def reply_message(request: Request):
    """Reply to a specific message"""
    data = await request.json()
    session_string = data.get("session_string")
    chat_id = data.get("chat_id")
    message_id = data.get("message_id")
    text = data.get("text")
    
    try:
        client = Client("temp_client", session_string=session_string)
        await client.start()
        
        result = await client.reply_text(chat_id, text=text, message_id=message_id)
        await client.stop()
        
        return {
            "success": True,
            "data": {
                "message_id": result.id,
                "chat_id": result.chat.id,
                "date": result.date.isoformat() if result.date else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register_session_string")
async def register_session_string(request: Request):
    """Register a session using session_string directly"""
    data = await request.json()
    api_id = data.get("api_id")
    api_hash = data.get("api_hash")
    session_string = data.get("session_string")
    
    if not all([api_id, api_hash, session_string]):
        raise HTTPException(status_code=400, detail="api_id, api_hash, and session_string are required")
    
    try:
        # Create client with session_string
        client = Client('my_account', api_id=api_id, api_hash=api_hash, session_string=session_string, in_memory=True)
        await client.start()
        
        # Get user information
        me = await client.get_me()
        
        # Export session string to ensure it's valid
        exported_session_string = await client.export_session_string()
        
        await client.stop()
        
        return {
            "success": True,
            "data": {
                "id": me.id,
                "first_name": me.first_name,
                "last_name": me.last_name,
                "username": me.username,
                "phone_number": me.phone_number,
                "is_premium": me.is_premium,
            },
            "session_string": exported_session_string
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("Health check called")
    return {"status": "healthy", "service": "python-pyrogram-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)