# Book-to-Course: Technical Documentation

## 📖 Overview

**Book-to-Course** is an AI-powered system that transforms technical programming books (PDFs) into complete video courses. It uses Large Language Models (LLMs) to analyze book content, generate lesson outlines, create scripts, quizzes, and produce professional video lessons with synchronized narration and visual elements.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (React + Vite + TypeScript)                         │
│                           http://localhost:5173                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP API Calls
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API                                     │
│                         (FastAPI + Python 3.11+)                            │
│                           http://localhost:8000                              │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ PDF Utils   │  │ LLM Utils   │  │ Video       │  │ Static File Server  │ │
│  │ - Extract   │  │ - OpenAI    │  │ Orchestrator│  │ - Serve videos      │ │
│  │   text      │  │   GPT-4     │  │ - TTS       │  │ - Serve images      │ │
│  │ - Extract   │  │ - Outline   │  │ - Audio     │  │ - Serve audio       │ │
│  │   images    │  │ - Script    │  │ - Remotion  │  │                     │ │
│  │ - Vision    │  │ - Quiz      │  │   render    │  │                     │ │
│  │   analysis  │  │             │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ subprocess call
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIDEO RENDERER                                     │
│                      (Remotion + React + TypeScript)                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         LessonVideo Component                        │    │
│  │  - Animated slides with bullet points                               │    │
│  │  - Code snippets with syntax highlighting                           │    │
│  │  - Book images/diagrams                                             │    │
│  │  - Synchronized audio narration                                     │    │
│  │  - Optional avatar video overlay                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
book_to_course/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app & endpoints
│   │   ├── pdf_utils.py       # PDF text/image extraction
│   │   ├── llm_utils.py       # OpenAI API calls (outline, script, quiz)
│   │   ├── video_orchestrator.py  # Video generation pipeline
│   │   └── lesson_content.py  # Pydantic models for lessons
│   ├── data/
│   │   └── books/             # Uploaded books & generated assets
│   │       └── {book_id}/
│   │           ├── book.pdf
│   │           ├── book.txt
│   │           ├── images/
│   │           ├── outline.json
│   │           ├── {lesson_id}_script.txt
│   │           ├── {lesson_id}_quiz.json
│   │           ├── lesson_0.mp4
│   │           └── lesson_0_props.json
│   ├── requirements.txt
│   └── .env                   # API keys (OPENAI_API_KEY)
│
├── frontend/                   # React Vite frontend
│   ├── src/
│   │   ├── App.tsx            # Main application
│   │   ├── api.ts             # API client
│   │   ├── index.css          # Global styles
│   │   └── components/
│   │       ├── UploadStep.tsx
│   │       ├── OutlineStep.tsx
│   │       ├── LessonList.tsx
│   │       ├── LessonDetail.tsx
│   │       ├── VideoPlayer.tsx
│   │       └── StatusBadge.tsx
│   └── package.json
│
├── video/                      # Remotion video renderer
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── Root.tsx           # Composition registration
│   │   ├── LessonVideo.tsx    # Main video component
│   │   └── types.ts           # TypeScript interfaces
│   ├── public/
│   │   └── generated/         # Generated audio/images for rendering
│   └── package.json
│
└── docs/
    ├── architecture.md
    └── TECHNICAL_DOCUMENTATION.md  # This file
```

---

## 🔄 Data Flow & Pipeline

### Complete Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   1. UPLOAD  │────▶│  2. OUTLINE  │────▶│  3. CONTENT  │────▶│   4. VIDEO   │
│              │     │              │     │              │     │              │
│  Upload PDF  │     │  Generate    │     │  Generate    │     │  Generate    │
│  Extract:    │     │  course      │     │  per-lesson: │     │  video with: │
│  - Text      │     │  structure   │     │  - Script    │     │  - Slides    │
│  - Images    │     │  with LLM    │     │  - Quiz      │     │  - Audio     │
│  - Analyze   │     │              │     │              │     │  - Images    │
│    images    │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Step-by-Step Process

#### Step 1: Book Upload & Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                      UPLOAD PROCESS                              │
│                                                                  │
│  PDF File ──▶ ┌─────────────┐                                   │
│               │ extract_text│ ──▶ book.txt (full text)          │
│               └─────────────┘                                   │
│                     │                                           │
│                     ▼                                           │
│               ┌─────────────┐                                   │
│               │extract_images──▶ /images/*.png                  │
│               └─────────────┘                                   │
│                     │                                           │
│                     ▼                                           │
│               ┌─────────────┐                                   │
│               │GPT-4 Vision │ ──▶ Image descriptions            │
│               │  Analysis   │     (what each image shows)       │
│               └─────────────┘                                   │
│                     │                                           │
│                     ▼                                           │
│               {book_id}_images.json (metadata + descriptions)   │
└─────────────────────────────────────────────────────────────────┘
```

**API Endpoint:** `POST /books/upload`

**What happens:**
1. PDF is saved to `data/books/{book_id}/book.pdf`
2. Text extracted using `pypdf` → saved as `book.txt`
3. Images extracted from each page → saved to `images/` folder
4. GPT-4 Vision analyzes each image to understand its content
5. Image metadata saved to `{book_id}_images.json`

---

#### Step 2: Course Outline Generation

```
┌─────────────────────────────────────────────────────────────────┐
│                    OUTLINE GENERATION                            │
│                                                                  │
│  book.txt ──▶ ┌─────────────────────────────────────────┐       │
│               │              GPT-4 / GPT-4o              │       │
│               │                                          │       │
│               │  System: "You are a curriculum designer" │       │
│               │                                          │       │
│               │  Input: First 15,000 chars of book       │       │
│               │                                          │       │
│               │  Output: JSON with:                      │       │
│               │    - course_title                        │       │
│               │    - target_audience                     │       │
│               │    - lessons[] (10-15 lessons)           │       │
│               │      - id, title, summary, key_points    │       │
│               └─────────────────────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│                      outline.json                                │
└─────────────────────────────────────────────────────────────────┘
```

**API Endpoint:** `POST /books/{book_id}/outline`

**Output structure:**
```json
{
  "course_title": "Mastering LLM Engineering",
  "target_audience": "Intermediate software engineers",
  "lessons": [
    {
      "id": "lesson_0",
      "title": "Introduction to LLM Engineering",
      "summary": "Overview of LLMs and the LLM Twin project...",
      "key_points": [
        "What are Large Language Models",
        "The LLM Twin concept",
        "Course roadmap"
      ]
    }
  ]
}
```

---

#### Step 3: Lesson Content Generation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCRIPT GENERATION                             │
│                                                                  │
│  outline.json ──┐                                               │
│                 │                                                │
│  book.txt ──────┼──▶ ┌─────────────────────────────────┐        │
│                 │    │           GPT-4                  │        │
│                      │                                  │        │
│                      │  "Generate a detailed teaching   │        │
│                      │   script for lesson X..."        │        │
│                      │                                  │        │
│                      │  - 3-5 minute spoken content     │        │
│                      │  - Clear explanations            │        │
│                      │  - Code examples if relevant     │        │
│                      └─────────────────────────────────┘        │
│                                   │                              │
│                                   ▼                              │
│                        {lesson_id}_script.txt                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     QUIZ GENERATION                              │
│                                                                  │
│  script.txt ──▶ ┌─────────────────────────────────────┐         │
│                 │           GPT-4                      │         │
│                 │                                      │         │
│                 │  "Generate 3-5 multiple choice       │         │
│                 │   questions to test understanding"   │         │
│                 │                                      │         │
│                 └─────────────────────────────────────┘         │
│                                   │                              │
│                                   ▼                              │
│                        {lesson_id}_quiz.json                     │
└─────────────────────────────────────────────────────────────────┘
```

**API Endpoints:**
- `POST /books/{book_id}/lessons/{lesson_id}/script`
- `POST /books/{book_id}/lessons/{lesson_id}/quiz`

---

#### Step 4: Video Generation Pipeline

This is the most complex step. Here's the detailed flow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIDEO GENERATION PIPELINE                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4.1: Build Lesson Video Plan                                    │    │
│  │                                                                      │    │
│  │  script.txt + outline ──▶ LessonVideoPlan                           │    │
│  │                           {                                          │    │
│  │                             lessonId: "lesson_0",                    │    │
│  │                             title: "Introduction to LLMs",           │    │
│  │                             slides: [                                │    │
│  │                               {                                      │    │
│  │                                 title: "What are LLMs?",             │    │
│  │                                 bullets: ["Key point 1", ...],       │    │
│  │                                 narration: "Full spoken text...",    │    │
│  │                                 codeSnippet: "optional code",        │    │
│  │                                 imagePath: "/path/to/image.png"      │    │
│  │                               }                                      │    │
│  │                             ],                                       │    │
│  │                             totalDurationSec: 180,                   │    │
│  │                             slideTimings: [...]                      │    │
│  │                           }                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4.2: Match Book Images to Slides                               │    │
│  │                                                                      │    │
│  │  slides[] + images_metadata ──▶ GPT-4 ──▶ Image assignments         │    │
│  │                                                                      │    │
│  │  "Match the most relevant image to each slide based on content"     │    │
│  │                                                                      │    │
│  │  Result: slide.imagePath = "/generated/{book_id}/images/page_X.png" │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4.3: Generate Per-Slide Audio (TTS)                            │    │
│  │                                                                      │    │
│  │  For each slide:                                                     │    │
│  │    slide.narration ──▶ OpenAI TTS ──▶ slide_0.mp3, slide_1.mp3...   │    │
│  │                                                                      │    │
│  │  Then measure each audio duration with ffprobe                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4.4: Build Slide Timings                                        │    │
│  │                                                                      │    │
│  │  Audio durations ──▶ slideTimings[]                                 │    │
│  │                                                                      │    │
│  │  [                                                                   │    │
│  │    { slideIndex: 0, startSec: 0.0,  endSec: 28.5 },                 │    │
│  │    { slideIndex: 1, startSec: 28.5, endSec: 55.2 },                 │    │
│  │    { slideIndex: 2, startSec: 55.2, endSec: 89.0 },                 │    │
│  │    ...                                                               │    │
│  │  ]                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4.5: Concatenate Audio                                          │    │
│  │                                                                      │    │
│  │  slide_0.mp3 + slide_1.mp3 + ... ──▶ ffmpeg ──▶ lesson_audio.mp3    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4.6: Copy Assets to Remotion Public Folder                      │    │
│  │                                                                      │    │
│  │  lesson_audio.mp3 ──▶ video/public/generated/{book_id}/             │    │
│  │  matched_images   ──▶ video/public/generated/{book_id}/images/      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STEP 4.7: Write props.json & Render with Remotion                    │    │
│  │                                                                      │    │
│  │  props.json = {                                                      │    │
│  │    plan: { slides, slideTimings, totalDurationSec, ... },           │    │
│  │    audioSrc: "/generated/{book_id}/lesson_audio.mp3",               │    │
│  │    avatarSrc: null  // optional                                      │    │
│  │  }                                                                   │    │
│  │                                                                      │    │
│  │  npx remotion render LessonVideo lesson_0.mp4 --props=props.json    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│                              lesson_0.mp4                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**API Endpoint:** `POST /books/{book_id}/lessons/{lesson_index}/video`

---

## 🎬 Video Rendering (Remotion)

### How Remotion Works

Remotion is a React-based video rendering framework. It treats video frames like React components.

```
┌─────────────────────────────────────────────────────────────────┐
│                     REMOTION RENDERING                           │
│                                                                  │
│  props.json ──▶ ┌─────────────────────────────────────┐         │
│                 │         LessonVideo.tsx              │         │
│                 │                                      │         │
│                 │  For each frame (30 FPS):            │         │
│                 │    1. Calculate current time (sec)   │         │
│                 │    2. Find active slide from timings │         │
│                 │    3. Render:                        │         │
│                 │       - Background gradient          │         │
│                 │       - Lesson title header          │         │
│                 │       - Current slide content        │         │
│                 │       - Bullet points (animated)     │         │
│                 │       - Code snippet OR Image        │         │
│                 │       - Progress indicator           │         │
│                 │    4. Play audio track               │         │
│                 │    5. Optional avatar overlay        │         │
│                 └─────────────────────────────────────┘         │
│                                   │                              │
│                                   ▼                              │
│                        Frame 1, 2, 3, ... N                      │
│                                   │                              │
│                                   ▼ (ffmpeg encoding)            │
│                            lesson_0.mp4                          │
└─────────────────────────────────────────────────────────────────┘
```

### Slide-to-Audio Synchronization

```
Audio Timeline:
├───────────────────┼────────────────────┼──────────────────────┤
0s               28.5s                 55.2s                   89s
     Slide 0              Slide 1              Slide 2

slideTimings = [
  { slideIndex: 0, startSec: 0,    endSec: 28.5 },  ← Audio for slide 0
  { slideIndex: 1, startSec: 28.5, endSec: 55.2 },  ← Audio for slide 1
  { slideIndex: 2, startSec: 55.2, endSec: 89.0 },  ← Audio for slide 2
]

At frame 900 (30 FPS):
  → timeSec = 900 / 30 = 30 seconds
  → Find timing where 30 >= startSec AND 30 < endSec
  → Slide 1 is active (28.5 ≤ 30 < 55.2)
  → Render slide 1 content
```

---

## 🔌 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/books/upload` | Upload PDF book |
| `GET` | `/books/{book_id}/images` | List extracted images |
| `POST` | `/books/{book_id}/outline` | Generate course outline |
| `POST` | `/books/{book_id}/lessons/{id}/script` | Generate lesson script |
| `POST` | `/books/{book_id}/lessons/{id}/quiz` | Generate lesson quiz |
| `POST` | `/books/{book_id}/lessons/{index}/video` | Generate lesson video |
| `GET` | `/static/books/{book_id}/*` | Serve generated assets |

### Request/Response Examples

#### Upload Book
```bash
curl -X POST http://localhost:8000/books/upload \
  -F "file=@my_book.pdf"
```
```json
{
  "book_id": "abc123-def456",
  "pages_processed": 350,
  "images_extracted": 45,
  "message": "Book uploaded successfully"
}
```

#### Generate Video
```bash
curl -X POST http://localhost:8000/books/abc123/lessons/0/video
```
```json
{
  "book_id": "abc123",
  "lesson_index": 0,
  "video_url": "/static/books/abc123/lesson_0.mp4"
}
```

---

## 🧠 AI/LLM Integration

### Models Used

| Task | Model | Purpose |
|------|-------|---------|
| Outline Generation | GPT-4 / GPT-4o | Analyze book, create curriculum |
| Script Generation | GPT-4 / GPT-4o | Write detailed teaching scripts |
| Quiz Generation | GPT-4 / GPT-4o | Create assessment questions |
| Image Analysis | GPT-4o-mini (Vision) | Understand image content |
| Image Matching | GPT-4o-mini | Match images to slides |
| Key Point Extraction | GPT-4o-mini | Distill bullet points |
| Text-to-Speech | OpenAI TTS-1 | Generate narration audio |

### Prompt Engineering Highlights

**Outline Generation:**
```
You are a senior curriculum designer specializing in technical education.
Given a book's content, design a structured course with 10-15 lessons.
Each lesson should have clear learning objectives and build on previous content.
```

**Image Matching:**
```
Match the most relevant image to each slide based on the image description.
Only match if the image DIRECTLY relates to the slide topic.
Architecture diagrams → architecture slides
Code examples → implementation slides
```

---

## 🛠️ Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- ffmpeg (for audio processing)
- OpenAI API key

### Quick Start

```bash
# 1. Clone and setup backend
cd book_to_course/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Configure environment
echo "OPENAI_API_KEY=sk-your-key" > .env

# 3. Start backend
uvicorn app.main:app --reload --port 8000

# 4. Setup and start frontend (new terminal)
cd book_to_course/frontend
npm install
npm run dev

# 5. Setup Remotion (first time only)
cd book_to_course/video
npm install
```

---

## 📊 Data Models

### LessonVideoPlan (Core Data Structure)

```typescript
interface LessonVideoPlan {
  lessonId: string;           // "lesson_0"
  title: string;              // "Introduction to LLMs"
  slides: Slide[];            // Array of slides
  totalDurationSec: number;   // Total video length
  slideTimings: SlideTiming[]; // When each slide appears
}

interface Slide {
  title: string;              // Slide headline
  bullets: string[];          // Key points (shown on screen)
  narration: string;          // Full text (spoken by TTS)
  codeSnippet?: string;       // Optional code block
  imagePath?: string;         // Optional image from book
}

interface SlideTiming {
  slideIndex: number;         // Which slide
  startSec: number;           // Start time in video
  endSec: number;             // End time in video
}
```

---

## 🔮 Future Enhancements

1. **RAG Integration** - Use vector embeddings for more accurate content retrieval
2. **Multi-Agent Pipeline** - Separate agents for outline, content, review
3. **Avatar Support** - Integrate AI avatar (HeyGen, D-ID) for presenter
4. **Spaced Repetition** - Generate study schedules for learners
5. **Interactive Exercises** - Add coding exercises to lessons
6. **Multiple Output Formats** - Export to SCORM, PDF, etc.

---

## 📝 Troubleshooting

| Issue | Solution |
|-------|----------|
| Video duration mismatch | Check `slideTimings` matches actual audio durations |
| Images not appearing | Re-upload book to trigger vision analysis |
| Slides not synced with audio | Verify `ffprobe` is installed and working |
| Remotion render fails | Check `video/public/generated/` has required assets |

---

## 👥 Team Contacts

- **Backend/LLM**: [Your name]
- **Frontend**: [Your name]
- **Video/Remotion**: [Your name]

---

*Last updated: December 2024*

