"""
Create demo user for testing
Run with: docker exec book-to-course-backend python create_demo_user.py
"""
import os
import sys
sys.path.insert(0, '/app')

from app.database import SessionLocal
from app.models import User
from app.auth_utils import hash_password

def create_demo_user():
    db = SessionLocal()
    try:
        # Check if demo user exists
        existing = db.query(User).filter(User.email == "demo@booktocourse.local").first()
        if existing:
            print("✅ Demo user already exists")
            return

        # Create demo user
        demo_user = User(
            email="demo@booktocourse.local",
            password_hash=hash_password("password123"),
            full_name="Demo User",
            is_verified=True,
            is_active=True
        )
        db.add(demo_user)
        db.commit()
        print("✅ Demo user created successfully")
        print("   Email: demo@booktocourse.local")
        print("   Password: password123")
    except Exception as e:
        print(f"❌ Error creating demo user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_user()
