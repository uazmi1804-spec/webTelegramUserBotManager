from fastapi import FastAPI, HTTPException, Request
from pyrogram import Client
from pyrogram.types import Message
import asyncio
import json
import os
from typing import Optional
import tempfile
import hashlib

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
    """Send a message to a chat"""
    data = await request.json()
    session_string = data.get("session_string")
    chat_id = data.get("chat_id")
    message_type = data.get("message_type")
    file_path = data.get("file_path")
    caption = data.get("caption", "")
    reply_to_message_id = data.get("reply_to_message_id")
    
    try:
        # Create a client with the session string
        client = Client("temp_client", session_string=session_string)
        await client.start()
        
        result = None
        
        if message_type == "text":
            if reply_to_message_id:
                result = await client.reply_text(chat_id, text=caption, message_id=reply_to_message_id)
            else:
                result = await client.send_message(chat_id, text=caption or file_path)
        elif message_type == "photo":
            result = await client.send_photo(chat_id, photo=file_path, caption=caption)
        elif message_type == "video":
            result = await client.send_video(chat_id, video=file_path, caption=caption)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported message type: {message_type}")
        
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
    return {"status": "healthy", "service": "python-pyrogram-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)