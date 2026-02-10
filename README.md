# Book-to-Course

Generate a production-ready video course outline from a technical PDF, then expand each lesson into deliverables tutors can use for scriptwriting, demos, and video creation. The repository contains both the FastAPI backend (LLM + PDF pipeline) and the React/Vite frontend learners interact with.\
Hosted on GitHub: [ElviraMjeshtri/book-to-course](https://github.com/ElviraMjeshtri/book-to-course). 

## High-Level Architecture

| Module | Responsibilities |
| --- | --- |
| **Ingestion Service** | Accept PDF/EPUB uploads, extract raw text, split into sections, persist artifacts under `backend/data/books/`. |
| **Course Designer (LLM)** | Invoke OpenAI (configurable model) with book summary + TOC prompt, produce 10–15 lesson `CourseOutline` JSON. |
| **Lesson Generator (LLM + code)** | *(Upcoming)* Use the outline to draft scripts, code samples, quizzes per lesson. |
| **Video Orchestrator** | *(Upcoming)* Turn a chosen lesson into narration, slides, avatar video by calling services like HeyGen/Synthesia. |
| **Frontend Web App** | Provide tutors a workspace to upload, monitor progress, inspect lessons, and trigger future video generation flows. |

## Tech Stack

- **Backend:** FastAPI, Pydantic, `pypdf`, OpenAI SDK, Python 3.10+
- **Frontend:** React 18 + Vite + TypeScript, Axios
- **Build/Dev:** npm, uvicorn, virtualenv

## Getting Started

### 🐳 Quick Start with Docker (Recommended)

```bash
# 1. Clone the repository
git clone git@github.com:ElviraMjeshtri/book-to-course.git
cd book-to-course

# 2. Copy environment file
cp .env.example .env
# Edit .env with your API keys (optional - can use demo account)

# 3. Start everything with one command
./start.sh
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Demo Account:**
- Email: `demo@booktocourse.local`
- Password: `password123`

---

### 🛠️ Manual Setup (Alternative)

<details>
<summary>Click to expand manual setup instructions</summary>

#### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Add your secrets here
```

##### Required Environment Variables

| Key | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT secret key (generate with `openssl rand -hex 32`) |
| `OPENAI_API_KEY` | API key for the OpenAI account |
| `ANTHROPIC_API_KEY` *(optional)* | Anthropic API key |

#### 2. Frontend Setup

```bash
cd ../frontend
npm install
```

If your backend isn't running on `http://localhost:8000`, add a `.env` file under `frontend/`:

```
VITE_API_BASE_URL=http://your-backend-host:port
```

#### 3. Video Dependencies Setup (Optional)

```bash
cd ../video
npm install
```

This installs Remotion and other dependencies for advanced video editing.

#### 4. Database Setup

Start PostgreSQL and run the schema:
```bash
psql -U admin -d book_to_course -f backend/init-db.sql
```

</details>

## Running the Stack

### Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Endpoints:
- `GET /health` – health probe
- `POST /books/upload` – multipart PDF upload, returns `book_id`
- `POST /books/{book_id}/outline` – generates `CourseOutline`

### Frontend

```bash
cd frontend
npm run dev
# open http://localhost:5173
```

The UI guides tutors through three stages:
1. Select & upload a PDF (Ingestion Service triggers extraction of ~50 pages for v1).
2. Generate the course outline (Course Designer).
3. Review lessons, summaries, and key points; future iterations can unlock Lesson Generator + Video Orchestrator CTAs.

## Folder Structure

```
book_to_course/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes
│   │   ├── pdf_utils.py     # Save/extract/load book content
│   │   └── llm_utils.py     # OpenAI integration
│   ├── data/books/          # Persisted PDFs, text, outlines (gitignored)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.tsx          # Tutor workspace UI
    │   ├── api.ts           # Axios client
    │   └── index.css        # Design system styles
    ├── package.json
    └── vite.config.ts
```

## Development Workflow

1. **Upload stage** – uses `pdf_utils.save_uploaded_pdf` and `extract_text_from_pdf`. Text snapshots stored beside the PDF.
2. **Outline stage** – `llm_utils.generate_course_outline` truncates text (20k chars) and calls OpenAI Chat Completions v1 SDK.
3. **Lesson review** – React state machine tracks `bookId`, `outline`, `selectedLesson`, along with UX metrics (status pills, workflow cards).
4. **Next modules** – extend backend with new endpoints for Lesson Generator outputs (script/code/quiz) and Video Orchestrator jobs; extend UI with tabs/actions per lesson.

## Testing / Linting

- Backend: `python -m pytest` *(add tests under `backend/tests/` when available)*.
- Frontend: `npm run lint` (ESLint) and `npm run test` *(Vitest/Jest stub; add tests as features grow)*.

## Deployment Notes

- Ensure `.env` is never committed. `backend/data/books/` is gitignored but should be secured in production storage (S3, GCS, etc.).
- When containerizing, bake separate Dockerfiles for backend and frontend; supply env secrets via secret stores (AWS Secrets Manager, Vault, etc.).

## Roadmap

- [ ] Lesson Generator endpoints + UI tabs (script, code sandbox, quizzes).
- [ ] Video Orchestrator integration (slide templates, voiceover settings, avatar selection).
- [ ] Progress tracking per lesson (status badges, last edited timestamps).
- [ ] Authentication/roles so multiple tutors can collaborate safely.

## Contributing

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/lesson-generator`.
3. Commit with context-rich messages.
4. Push and open a PR targeting `main`.

Please open issues for bugs, enhancement ideas, or architectural discussions. Contributions that advance the Lesson Generator and Video Orchestrator phases are especially welcome!
---

## 🎬 Video Generation

### Backend Video Generation (ffmpeg)

The backend container includes **ffmpeg** for video processing. The application can generate videos directly using:
- HeyGen API (avatar videos)
- Local ffmpeg rendering (slide-based videos)
- Custom video compositions

### Advanced Video Editing (Remotion - Optional)

For advanced video editing and customization, you can use Remotion Studio:

```bash
# Install dependencies
cd video
npm install

# Start Remotion Studio
docker-compose --profile video up -d video-service

# Or run locally
npm run dev
```

Access Remotion Studio at http://localhost:3001

---

## 🔐 Authentication & Multi-User Support

The application includes full authentication:

- **Email/Password Registration & Login**
- **JWT-based authentication** (access + refresh tokens)
- **User-specific data isolation** (each user has their own books, lessons, videos)
- **Encrypted API key storage** (users can store their own OpenAI, Anthropic, etc. keys)
- **Google OAuth** (coming soon)

See [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) for detailed documentation.

---

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | React/Vite web application |
| Backend | 8000 | FastAPI REST API |
| PostgreSQL | 5432 | User database |
| pgAdmin | 5050 | Database admin interface |
| Video Service | 3001 | Remotion Studio (optional) |

### Stop Services

```bash
# Interactive cleanup script
./stop.sh
```

Options:
1. Stop containers (keep data)
2. Stop and remove containers (keep data)
3. Full cleanup (⚠️ deletes all data)

---

## 📚 API Documentation

Interactive API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

**Authentication:**
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

**Books:**
- `POST /books/upload` - Upload PDF
- `POST /books/{book_id}/outline` - Generate course outline

**API Keys:**
- `GET /api-keys` - List user's API keys
- `POST /api-keys` - Add/update API key

All endpoints (except `/health` and `/auth/*`) require authentication.

---

## 🏗️ Project Structure (Updated)

```
book-to-course/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + routes
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models.py            # Database models
│   │   ├── auth_routes.py       # Authentication endpoints
│   │   ├── api_key_routes.py    # API key management
│   │   ├── auth_utils.py        # JWT, password, encryption
│   │   ├── user_api_key_helper.py # User API key retrieval
│   │   ├── pdf_utils.py         # PDF extraction
│   │   ├── llm_utils.py         # LLM integration
│   │   ├── video_orchestrator.py # Video generation
│   │   └── ...
│   ├── Dockerfile               # Backend container
│   ├── init-db.sql              # Database schema
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Auth state management
│   │   ├── components/
│   │   │   ├── AuthPage.tsx     # Login/Register UI
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ...
│   │   ├── AppWithAuth.tsx      # App wrapper with auth
│   │   ├── App.tsx              # Main application
│   │   └── api.ts               # API client with JWT
│   ├── Dockerfile               # Frontend container
│   ├── nginx.conf               # Nginx configuration
│   └── package.json
│
├── video/                       # Remotion video generation
│   ├── src/                     # Remotion components
│   └── package.json
│
├── docker-compose.yml           # All services
├── start.sh                     # Start script
├── stop.sh                      # Stop script
├── .env.example                 # Environment template
├── AUTH_IMPLEMENTATION.md       # Auth documentation
└── README.md
```

