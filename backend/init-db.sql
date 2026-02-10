-- Book-to-Course Database Initialization Script
-- Creates tables for multi-user support with authentication

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS TABLE ====================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL for OAuth-only users
    google_id VARCHAR(255) UNIQUE,  -- For Google OAuth
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ==================== USER API KEYS TABLE ====================
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- openai, anthropic, google, mistral, elevenlabs, heygen
    encrypted_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- ==================== BOOKS TABLE ====================
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'uploaded',  -- uploaded, processing, completed, failed
    extracted_text TEXT,
    book_metadata JSONB,  -- Store additional metadata like page count, author, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);

-- ==================== COURSE OUTLINES TABLE ====================
CREATE TABLE IF NOT EXISTS course_outlines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outline_json JSONB NOT NULL,  -- Store the full CourseOutline JSON
    status VARCHAR(50) DEFAULT 'generated',  -- generated, reviewed, approved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_outlines_book_id ON course_outlines(book_id);
CREATE INDEX IF NOT EXISTS idx_course_outlines_user_id ON course_outlines(user_id);

-- ==================== LESSONS TABLE ====================
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outline_id UUID NOT NULL REFERENCES course_outlines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    script TEXT,
    code_examples JSONB,  -- Array of code snippets
    quiz_questions JSONB,  -- Array of quiz questions
    status VARCHAR(50) DEFAULT 'pending',  -- pending, script_generated, video_pending, completed
    lesson_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(outline_id, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_lessons_outline_id ON lessons(outline_id);
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- ==================== VIDEOS TABLE ====================
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT,
    video_path TEXT,  -- Local path if stored locally
    thumbnail_url TEXT,
    duration INTEGER,  -- Duration in seconds
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    provider VARCHAR(50),  -- heygen, runway, local, etc.
    video_metadata JSONB,  -- Video plan, settings, etc.
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_videos_lesson_id ON videos(lesson_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- ==================== REFRESH TOKENS TABLE ====================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- ==================== TRIGGERS FOR UPDATED_AT ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_outlines_updated_at BEFORE UPDATE ON course_outlines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== SEED DATA (Optional) ====================
-- Insert a demo user for testing
-- Password: password123 (argon2 hash)
-- Note: This will be created on first registration, or you can use the /auth/register endpoint
-- INSERT INTO users (email, password_hash, full_name, is_verified)
-- VALUES (
--     'demo@booktocourse.local',
--     'HASH_WILL_BE_GENERATED_ON_REGISTRATION',
--     'Demo User',
--     TRUE
-- ) ON CONFLICT (email) DO NOTHING;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database schema initialized successfully';
END $$;
