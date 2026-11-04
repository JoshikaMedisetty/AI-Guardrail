import os
import sys

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, ensure_schema_migrations
from app.database.seeder import seed_database
from app.models.log import User
from app.core.security import get_password_hash, create_access_token

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    ensure_schema_migrations()
    seed_database()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def normal_user_headers():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "test.regular.user@example.com").first()
        if not user:
            user = User(
                email="test.regular.user@example.com",
                name="Regular Test User",
                password_hash=get_password_hash("Password123!"),
                role="USER",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()

@pytest.fixture
def admin_user_headers():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "test.admin.user@example.com").first()
        if not admin:
            admin = User(
                email="test.admin.user@example.com",
                name="Admin Security Lead",
                password_hash=get_password_hash("AdminPass123!"),
                role="SECURITY_ADMIN",
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        token = create_access_token({"sub": admin.id, "email": admin.email, "role": admin.role})
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()
