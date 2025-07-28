#!/usr/bin/env python3
"""Simple backend test to verify database connection and authentication."""

import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend/.env")

# Create FastAPI app
app = FastAPI(title="CFO/CTO Helper Auth Test", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/cfo_cto_helper")

try:
    engine = create_engine(DATABASE_URL)
    print(f"Database URL: {DATABASE_URL}")
except Exception as e:
    print(f"Database connection error: {e}")
    engine = None

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

@app.get("/")
async def root():
    return {"message": "CFO/CTO Helper Authentication Backend", "status": "running"}

@app.get("/health")
async def health_check():
    db_status = "connected"
    try:
        if engine:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "version": "1.0.0"
    }

@app.get("/api/v1/users/test")
async def test_users():
    """Test endpoint to check database users."""
    try:
        if not engine:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT id, email, first_name, last_name, role FROM users LIMIT 5"))
            users = []
            for row in result:
                users.append({
                    "id": row[0],
                    "email": row[1],
                    "first_name": row[2],
                    "last_name": row[3],
                    "role": row[4]
                })
            return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/v1/auth/login")
async def login(request: LoginRequest):
    """Simple login endpoint for testing."""
    try:
        if not engine:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        with engine.connect() as conn:
            # Check if user exists with correct email
            result = conn.execute(
                text("SELECT id, email, first_name, last_name, role, company, auth_provider, is_onboarded FROM users WHERE email = :email"),
                {"email": request.email}
            )
            user = result.fetchone()
            
            if not user:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            # Simple password validation for testing
            # In a real app, you would hash and verify the password
            valid_passwords = {
                "admin@cfohelper.com": "admin12345",
                "cfo@example.com": "cfo12345", 
                "cto@example.com": "cto12345"
            }
            
            expected_password = valid_passwords.get(request.email)
            if not expected_password or request.password != expected_password:
                raise HTTPException(status_code=401, detail="Invalid email or password")
            
            return {
                "access_token": f"test_access_token_{user[0]}",
                "refresh_token": f"test_refresh_token_{user[0]}", 
                "user": {
                    "id": user[0],
                    "email": user[1],
                    "first_name": user[2],
                    "last_name": user[3],
                    "role": user[4],
                    "company": user[5],
                    "auth_provider": user[6],
                    "is_onboarded": user[7]
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.get("/api/v1/auth/me")
async def me():
    """Get current user info - simplified for testing."""
    # In a real app, you would decode the JWT token from Authorization header
    # For testing, we'll extract user ID from the token
    try:
        if not engine:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # For testing, just return success - the frontend manages the user state
        # In a real app, you would validate the token and return the current user
        return {"message": "Token valid"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Me endpoint error: {str(e)}")

if __name__ == "__main__":
    print("Starting CFO/CTO Helper Authentication Backend...")
    print(f"Database URL: {DATABASE_URL}")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)