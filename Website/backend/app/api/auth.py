from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.log import User, AuditLog
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.config import settings
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

class RegisterRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None
    role: Optional[str] = "USER"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency to retrieve authenticated user from JWT token."""
    if not token:
        if settings.DEMO_MODE:
            admin = db.query(User).filter(User.email == "security@guardrail.ai").first()
            if admin:
                return admin
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide Bearer JWT token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure the current authenticated user has administrative privileges."""
    admin_roles = ["Security Administrator", "Admin", "admin", "SECURITY_ADMIN", "ADMIN", "Security Admin"]
    if user.role not in admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to perform this action."
        )
    return user

def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency that returns authenticated user or falls back to demo admin user only if DEMO_MODE is active."""
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            user = db.query(User).filter(User.id == payload["sub"]).first()
            if user:
                return user
    if settings.DEMO_MODE:
        admin = db.query(User).filter(User.email == "security@guardrail.ai").first()
        if admin:
            return admin
        first_user = db.query(User).first()
        if first_user:
            return first_user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide Bearer JWT token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user."""
    display_name = (payload.full_name or payload.name or "").strip()
    if not display_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full Name is required"
        )

    if payload.confirm_password and payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    assigned_role = "USER"
    if payload.role and payload.role.strip() in ["USER", "User", "Admin", "Security Administrator", "SECURITY_ADMIN"]:
        assigned_role = payload.role.strip()

    new_user = User(
        name=display_name,
        email=payload.email.lower().strip(),
        password_hash=get_password_hash(payload.password),
        role=assigned_role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log audit event
    db.add(AuditLog(user_id=new_user.id, event_type="USER_REGISTERED", description=f"User registered: {new_user.email} ({assigned_role})"))
    db.commit()

    token = create_access_token({"sub": new_user.id, "email": new_user.email, "name": new_user.name, "role": new_user.role})
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "data": {
            "token": token,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "full_name": new_user.name,
                "email": new_user.email,
                "role": new_user.role,
                "is_active": new_user.is_active,
                "created_at": new_user.created_at.isoformat() if new_user.created_at else None
            }
        },
        "message": "Account created successfully"
    }

@router.post("/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT token."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": user.id, "email": user.email, "name": user.name})
    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "data": {
            "token": token,
            "user": {
                "id": user.id,
                "name": user.name,
                "full_name": user.name,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
        },
        "message": "Authenticated successfully"
    }

@router.get("/me")
def get_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user profile."""
    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "name": current_user.name,
            "full_name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        },
        "message": "User profile fetched"
    }

@router.put("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile name and email."""
    if payload.email.lower().strip() != current_user.email:
        conflict = db.query(User).filter(User.email == payload.email.lower().strip(), User.id != current_user.id).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another account"
            )
        current_user.email = payload.email.lower().strip()

    name_to_set = payload.full_name or payload.name
    if name_to_set:
        current_user.name = name_to_set.strip()
    db.commit()
    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "name": current_user.name,
            "full_name": current_user.name,
            "email": current_user.email,
            "role": current_user.role
        },
        "message": "Profile updated successfully"
    }

@router.put("/password")
def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password securely."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {
        "success": True,
        "data": {},
        "message": "Password changed successfully"
    }
