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

### 1. Clone

```bash
git clone git@github.com:ElviraMjeshtri/book-to-course.git
cd book-to-course
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Add your secrets here
```

#### Required Environment Variables

| Key | Description |
| --- | --- |
| `OPENAI_API_KEY` | API key for the OpenAI account used by the Course Designer. |
| `OPENAI_MODEL` *(optional)* | Overrides default `gpt-4.1-mini`. Useful for experimentation. |
| `ANTHROPIC_API_KEY` *(optional)* | Reserved for future Anthropics-based Lesson Generator flows. |

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

If your backend isn't running on `http://localhost:8000`, add a `.env` file under `frontend/`:

```
VITE_API_BASE_URL=http://your-backend-host:port
```

### 4. Video Dependencies Setup

```bash
cd ../video
npm install
```

This installs Remotion and other dependencies required for video generation.

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