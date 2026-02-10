"""
Authentication utility functions:
- Password hashing and verification
- JWT token generation and validation
- API key encryption/decryption
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
import base64
import secrets

# Password hashing context - using argon2 (more modern and reliable)
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# API key encryption (Fernet symmetric encryption)
# In production, store this in a secure secret manager
ENCRYPTION_KEY = os.getenv(
    "ENCRYPTION_KEY",
    Fernet.generate_key().decode()  # Generate default key if not set
)
cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


# ==================== PASSWORD HASHING ====================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


# ==================== JWT TOKENS ====================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token

    Args:
        data: Payload to encode (should include 'sub' for user_id)
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token() -> str:
    """Generate a secure random refresh token"""
    return secrets.token_urlsafe(32)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT access token

    Args:
        token: JWT token string

    Returns:
        Decoded payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ==================== API KEY ENCRYPTION ====================

def encrypt_api_key(api_key: str) -> str:
    """
    Encrypt an API key for secure storage

    Args:
        api_key: Plain text API key

    Returns:
        Encrypted API key (base64 encoded)
    """
    encrypted = cipher_suite.encrypt(api_key.encode())
    return base64.b64encode(encrypted).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Decrypt an API key for use

    Args:
        encrypted_key: Base64 encoded encrypted API key

    Returns:
        Plain text API key
    """
    encrypted_bytes = base64.b64decode(encrypted_key.encode())
    decrypted = cipher_suite.decrypt(encrypted_bytes)
    return decrypted.decode()


# ==================== TOKEN VALIDATION ====================

def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract user_id from JWT token

    Args:
        token: JWT access token

    Returns:
        user_id if valid, None otherwise
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")
    return None
