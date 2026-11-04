import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import bcrypt
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify raw password against bcrypt hash using native bcrypt."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash using native bcrypt."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def generate_api_key(prefix: str = "grd_live_") -> tuple[str, str, str]:
    """
    Generate secure random API key.
    Returns:
      (raw_api_key, key_prefix, key_hash)
    Example:
      raw: grd_live_a1b2c3d4e5f6g7h8...
      prefix: grd_live_a1b2...
      hash: sha256 hex string
    """
    random_bytes = secrets.token_hex(24)
    raw_key = f"{prefix}{random_bytes}"
    key_prefix = f"{raw_key[:12]}..."
    key_hash = hash_api_key(raw_key)
    return raw_key, key_prefix, key_hash

def hash_api_key(api_key: str) -> str:
    """Compute SHA-256 hash for secure storage and comparison."""
    return hashlib.sha256(api_key.strip().encode("utf-8")).hexdigest()
