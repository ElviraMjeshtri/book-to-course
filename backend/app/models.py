"""
SQLAlchemy database models for multi-user support
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean, Text, DateTime,
    ForeignKey, JSON, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from .database import Base


class User(Base):
    """User account model"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # NULL for OAuth-only users
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    api_keys = relationship("UserAPIKey", back_populates="user", cascade="all, delete-orphan")
    books = relationship("Book", back_populates="user", cascade="all, delete-orphan")
    course_outlines = relationship("CourseOutline", back_populates="user", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="user", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class UserAPIKey(Base):
    """User-specific API keys (encrypted)"""
    __tablename__ = "user_api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # openai, anthropic, google, mistral, elevenlabs, heygen
    encrypted_key = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="api_keys")

    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'provider', name='uq_user_provider'),
        Index('idx_user_api_keys_user_id', 'user_id'),
    )


class Book(Base):
    """Uploaded book/PDF model"""
    __tablename__ = "books"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=True)
    filename = Column(String(500), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=True)
    status = Column(String(50), default="uploaded")  # uploaded, processing, completed, failed
    extracted_text = Column(Text, nullable=True)
    book_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="books")
    course_outlines = relationship("CourseOutline", back_populates="book", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('idx_books_user_id', 'user_id'),
        Index('idx_books_status', 'status'),
    )


class CourseOutline(Base):
    """Generated course outline model"""
    __tablename__ = "course_outlines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    outline_json = Column(JSON, nullable=False)
    status = Column(String(50), default="generated")  # generated, reviewed, approved
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    book = relationship("Book", back_populates="course_outlines")
    user = relationship("User", back_populates="course_outlines")
    lessons = relationship("Lesson", back_populates="outline", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index('idx_course_outlines_book_id', 'book_id'),
        Index('idx_course_outlines_user_id', 'user_id'),
    )


class Lesson(Base):
    """Individual lesson model"""
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    outline_id = Column(UUID(as_uuid=True), ForeignKey("course_outlines.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    script = Column(Text, nullable=True)
    code_examples = Column(JSON, nullable=True)  # Array of code snippets
    quiz_questions = Column(JSON, nullable=True)  # Array of quiz questions
    status = Column(String(50), default="pending")  # pending, script_generated, video_pending, completed
    lesson_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    outline = relationship("CourseOutline", back_populates="lessons")
    user = relationship("User", back_populates="lessons")
    videos = relationship("Video", back_populates="lesson", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint('outline_id', 'lesson_number', name='uq_outline_lesson_number'),
        Index('idx_lessons_outline_id', 'outline_id'),
        Index('idx_lessons_user_id', 'user_id'),
        Index('idx_lessons_status', 'status'),
    )


class Video(Base):
    """Generated video model"""
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    video_url = Column(Text, nullable=True)
    video_path = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)  # Duration in seconds
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    provider = Column(String(50), nullable=True)  # heygen, runway, local, etc.
    video_metadata = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    lesson = relationship("Lesson", back_populates="videos")
    user = relationship("User", back_populates="videos")

    # Indexes
    __table_args__ = (
        Index('idx_videos_lesson_id', 'lesson_id'),
        Index('idx_videos_user_id', 'user_id'),
        Index('idx_videos_status', 'status'),
    )


class RefreshToken(Base):
    """JWT refresh token model"""
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    # Indexes
    __table_args__ = (
        Index('idx_refresh_tokens_user_id', 'user_id'),
        Index('idx_refresh_tokens_token', 'token'),
    )
