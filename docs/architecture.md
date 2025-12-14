# Book-to-Course Architecture (feature/video-workflow)

## High-Level Flow
1. **Upload & Ingestion (Backend/FastAPI)**
   - Endpoint: `POST /books/upload`
   - Saves PDF to `backend/data/books/{book_id}.pdf`
   - Extracts full text (no page cap) into `{book_id}.txt`
   - Outline generation: `POST /books/{book_id}/outline` → LLM creates course outline JSON `{book_id}_outline.json`

2. **Lesson Assets (Backend/FastAPI)**
   - Script: `POST /books/{book_id}/lessons/{lesson_id}/script`
     - Uses outline + (optional) book text to generate a lesson script
     - Saves `{book_id}_{lesson_id}_script.txt`
   - Quiz: `POST /books/{book_id}/lessons/{lesson_id}/quiz`
     - Saves `{book_id}_{lesson_id}_quiz.json`

3. **Video Generation (Backend + Remotion)**
   - Endpoint: `POST /books/{book_id}/lessons/{lesson_index}/video`
   - Orchestrator (`backend/app/video_orchestrator.py`):
     - Loads outline, lesson script (if present), quiz
     - Builds a `LessonVideoPlan` with slides (overview, key takeaways, quiz preview, implementation sketch) and per-slide narrations
     - TTS per slide via OpenAI → wav segments
     - Measures durations (ffprobe), concatenates audio (ffmpeg), sets `slideTimings` + `totalDurationSec`
     - Copies narration (and optional avatar) into `video/public/generated/{book_id}/`
     - Writes `props.json` with plan, `audioSrc`, `avatarSrc`
     - Invokes Remotion CLI:
       ```
       npx remotion render LessonVideo out/lesson_{idx}.mp4 --props=/abs/path/to/props.json
       ```
   - Output video saved under `backend/data/books/{book_id}/lesson_{idx}.mp4`
   - Static serving: `app.mount("/static/books", StaticFiles(directory=BOOKS_DIR))`

4. **Frontend (React/Vite)**
   - Upload PDF, generate outline, generate lesson script/quiz/video
   - “Generate Video” calls the video endpoint; on success renders `<video controls src={API_BASE_URL + video_url}>`
   - Status pills show Not generated / Generating / Ready

5. **Remotion Project (video/)**
   - Composition: `LessonVideo` (single entry in `Root.tsx`)
   - Props (`LessonVideoProps`):
     - `plan` (slides, slideTimings, totalDurationSec)
     - `audioSrc` (concatenated narration in `public/generated/...`)
     - `avatarSrc` optional (circular overlay bottom-right)
   - Runtime logic:
     - `timeSec = frame / fps`
     - Picks slide by `slideTimings` window
     - Plays global `<Audio src={staticFile(audioSrc)} />`
     - If avatarSrc present, shows `<Video>` bubble
   - `calculateMetadata` adjusts duration to `plan.totalDurationSec * fps` at render time

## Key Components & Files
- Backend
  - `backend/app/main.py`: FastAPI routes (upload, outline, script, quiz, video); static mount for books
  - `backend/app/video_orchestrator.py`: Build plan, TTS per slide, audio concat, props, Remotion render
  - `backend/app/llm_utils.py`: Outline generation via OpenAI chat
  - `backend/app/pdf_utils.py`: Save PDF, extract text
- Frontend
  - `frontend/src/App.tsx`: Tutor UI; triggers upload, outline, script, quiz, video; renders videos
  - `frontend/src/api.ts`: Axios client + endpoints
- Remotion (video/)
  - `video/src/LessonVideo.tsx`: Composition with slide switching by timings, audio, optional avatar
  - `video/src/Root.tsx`: Registers `LessonVideo`, dynamic duration
  - `video/src/types.ts`: Shared types for slides, timings, props
  - `video/remotion.config.ts`: Basic config, no Tailwind override

## Data Paths & Artifacts
- Base data: `backend/data/books/`
  - `{book_id}.pdf`, `{book_id}.txt`
  - `{book_id}_outline.json`
  - `{book_id}_{lesson_id}_script.txt`
  - `{book_id}_{lesson_id}_quiz.json`
  - Render outputs: `lesson_{idx}.mp4`, intermediate audio segments, props
- Remotion public assets:
  - `video/public/generated/{book_id}/lesson_{lesson_id}_audio.wav`
  - Optional avatar: `video/public/generated/{book_id}/lesson_{lesson_id}_avatar.mp4`

## Runtime Requirements
- FFmpeg + FFprobe installed (audio concat and duration)
- OpenAI API key (TTS + LLM)
- Node (for Remotion) and Python virtualenv (FastAPI)

## Happy Path (E2E)
1. `POST /books/upload` → returns `book_id`
2. `POST /books/{book_id}/outline`
3. `POST /books/{book_id}/lessons/{lesson_id}/script` (optional but preferred)
4. `POST /books/{book_id}/lessons/{lesson_id}/quiz` (optional)
5. `POST /books/{book_id}/lessons/{lesson_index}/video`
   - backend writes props, renders via Remotion, returns `video_url`
6. Frontend “Generate Video” shows playable MP4

## Notes on Current Branch (feature/video-workflow)
- Duration now driven by actual narration length (slide TTS + concat)
- Slides include overview, key takeaways, quiz preview, implementation sketch, with seeded code snippet when relevant
- Narration auto-populates from lesson script if present; otherwise, richer fallback from bullets/headlines
- Static serving covers generated media under `/static/books`

