# Book-to-Course: Visual Diagrams

These diagrams can be rendered in GitHub, GitLab, or any Mermaid-compatible viewer.

---

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React + Vite)"]
        UI[User Interface]
        API_Client[API Client]
    end
    
    subgraph Backend["Backend (FastAPI)"]
        Endpoints[API Endpoints]
        PDF[PDF Utils]
        LLM[LLM Utils]
        Video[Video Orchestrator]
        Static[Static Files]
    end
    
    subgraph External["External Services"]
        OpenAI[OpenAI API]
        TTS[OpenAI TTS]
        Vision[GPT-4 Vision]
    end
    
    subgraph Remotion["Video Renderer (Remotion)"]
        Component[LessonVideo Component]
        Render[Remotion CLI]
    end
    
    subgraph Storage["File Storage"]
        Books[(Books Data)]
        Videos[(Generated Videos)]
        Audio[(Audio Files)]
        Images[(Extracted Images)]
    end
    
    UI --> API_Client
    API_Client --> Endpoints
    
    Endpoints --> PDF
    Endpoints --> LLM
    Endpoints --> Video
    Endpoints --> Static
    
    PDF --> Books
    PDF --> Images
    PDF --> Vision
    
    LLM --> OpenAI
    Video --> TTS
    Video --> Render
    
    Render --> Component
    Component --> Videos
    
    Static --> Videos
    Static --> Audio
    Static --> Images
    
    Vision --> OpenAI
    TTS --> OpenAI
```

---

## 2. Complete User Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant OpenAI
    participant Remotion
    
    %% Upload Flow
    User->>Frontend: Upload PDF Book
    Frontend->>Backend: POST /books/upload
    Backend->>Backend: Extract text (pypdf)
    Backend->>Backend: Extract images
    Backend->>OpenAI: Analyze images (Vision)
    OpenAI-->>Backend: Image descriptions
    Backend-->>Frontend: { book_id, images_extracted }
    
    %% Outline Flow
    User->>Frontend: Click "Generate Outline"
    Frontend->>Backend: POST /books/{id}/outline
    Backend->>OpenAI: Generate curriculum
    OpenAI-->>Backend: Course outline JSON
    Backend-->>Frontend: { outline: {...} }
    
    %% Script Flow
    User->>Frontend: Select Lesson, Click "Generate Script"
    Frontend->>Backend: POST /books/{id}/lessons/{id}/script
    Backend->>OpenAI: Generate teaching script
    OpenAI-->>Backend: Script text
    Backend-->>Frontend: { script: "..." }
    
    %% Quiz Flow
    User->>Frontend: Click "Generate Quiz"
    Frontend->>Backend: POST /books/{id}/lessons/{id}/quiz
    Backend->>OpenAI: Generate questions
    OpenAI-->>Backend: Quiz JSON
    Backend-->>Frontend: { quiz: [...] }
    
    %% Video Flow
    User->>Frontend: Click "Generate Video"
    Frontend->>Backend: POST /books/{id}/lessons/{index}/video
    Backend->>Backend: Build LessonVideoPlan
    Backend->>OpenAI: Match images to slides
    
    loop For each slide
        Backend->>OpenAI: TTS for narration
        OpenAI-->>Backend: Audio segment
    end
    
    Backend->>Backend: Concatenate audio (ffmpeg)
    Backend->>Backend: Write props.json
    Backend->>Remotion: npx remotion render
    Remotion->>Remotion: Render frames
    Remotion-->>Backend: lesson_X.mp4
    Backend-->>Frontend: { video_url: "..." }
    
    User->>Frontend: Watch/Download Video
```

---

## 3. Video Generation Pipeline (Detailed)

```mermaid
flowchart TD
    subgraph Input["Input Data"]
        Script[Lesson Script]
        Outline[Course Outline]
        Images[Book Images + Descriptions]
    end
    
    subgraph BuildPlan["Step 1: Build Video Plan"]
        Parse[Parse Script into Chunks]
        Extract[Extract Key Points per Slide]
        CreateSlides[Create Slide Objects]
    end
    
    subgraph MatchImages["Step 2: Image Matching"]
        Filter[Filter Decorative Images]
        LLM_Match[GPT-4 Matches Images to Slides]
        Assign[Assign imagePath to Slides]
    end
    
    subgraph AudioGen["Step 3: Audio Generation"]
        TTS1[TTS Slide 1]
        TTS2[TTS Slide 2]
        TTS3[TTS Slide N]
        Measure[Measure Durations - ffprobe]
        Concat[Concatenate Audio - ffmpeg]
    end
    
    subgraph Timings["Step 4: Build Timings"]
        Calc[Calculate Start/End Times]
        TimingsArray[slideTimings Array]
    end
    
    subgraph PrepRender["Step 5: Prepare Render"]
        CopyAssets[Copy to Remotion /public]
        WriteProps[Write props.json]
    end
    
    subgraph Render["Step 6: Remotion Render"]
        CLI[npx remotion render]
        Frames[Generate Frames at 30 FPS]
        Encode[Encode to MP4]
    end
    
    subgraph Output["Output"]
        MP4[lesson_X.mp4]
    end
    
    Script --> Parse
    Outline --> Parse
    Parse --> Extract
    Extract --> CreateSlides
    
    CreateSlides --> Filter
    Images --> Filter
    Filter --> LLM_Match
    LLM_Match --> Assign
    
    Assign --> TTS1
    Assign --> TTS2
    Assign --> TTS3
    
    TTS1 --> Measure
    TTS2 --> Measure
    TTS3 --> Measure
    
    Measure --> Concat
    Measure --> Calc
    Calc --> TimingsArray
    
    Concat --> CopyAssets
    TimingsArray --> WriteProps
    CopyAssets --> WriteProps
    
    WriteProps --> CLI
    CLI --> Frames
    Frames --> Encode
    Encode --> MP4
```

---

## 4. Remotion Frame Rendering

```mermaid
flowchart LR
    subgraph Input["props.json"]
        Plan[LessonVideoPlan]
        Audio[audioSrc]
        Avatar[avatarSrc]
    end
    
    subgraph FrameCalc["Frame Calculation"]
        Frame[Current Frame]
        FPS[FPS = 30]
        Time["timeSec = frame / fps"]
    end
    
    subgraph SlideSelect["Slide Selection"]
        Timings[slideTimings]
        Find["Find timing where<br/>startSec ≤ timeSec < endSec"]
        Current[Current Slide]
    end
    
    subgraph Render["Render Components"]
        BG[Background Gradient]
        Header[Lesson Title]
        SlideTitle[Slide Title]
        Bullets[Animated Bullets]
        CodeOrImage{Code or Image?}
        Code[Code Window]
        Image[Slide Image]
        Progress[Progress Indicator]
        AudioTrack[Audio Track]
        AvatarOverlay[Avatar Circle]
    end
    
    Plan --> Timings
    Frame --> Time
    FPS --> Time
    Time --> Find
    Timings --> Find
    Find --> Current
    
    Current --> SlideTitle
    Current --> Bullets
    Current --> CodeOrImage
    CodeOrImage -->|Has Code| Code
    CodeOrImage -->|Has Image| Image
    
    Audio --> AudioTrack
    Avatar --> AvatarOverlay
```

---

## 5. Data Flow Diagram

```mermaid
flowchart TD
    subgraph User
        PDF[PDF Book]
    end
    
    subgraph Storage["Data Storage (backend/data/books/{book_id})"]
        BookPDF[book.pdf]
        BookTXT[book.txt]
        ImagesDir[images/]
        ImagesMeta[_images.json]
        OutlineJSON[outline.json]
        ScriptTXT[lesson_X_script.txt]
        QuizJSON[lesson_X_quiz.json]
        PropsJSON[lesson_X_props.json]
        VideoMP4[lesson_X.mp4]
    end
    
    subgraph RemotionPublic["video/public/generated/{book_id}"]
        GenAudio[lesson_audio.mp3]
        GenImages[images/]
    end
    
    PDF -->|Upload| BookPDF
    BookPDF -->|Extract Text| BookTXT
    BookPDF -->|Extract Images| ImagesDir
    ImagesDir -->|Vision Analysis| ImagesMeta
    
    BookTXT -->|LLM| OutlineJSON
    OutlineJSON -->|LLM| ScriptTXT
    ScriptTXT -->|LLM| QuizJSON
    
    ScriptTXT -->|Video Gen| PropsJSON
    ImagesMeta -->|Match| PropsJSON
    
    PropsJSON -->|Remotion| VideoMP4
    ImagesDir -->|Copy| GenImages
    ScriptTXT -->|TTS| GenAudio
```

---

## 6. Component Architecture (Frontend)

```mermaid
flowchart TD
    subgraph App["App.tsx (Main)"]
        State[State Management]
        Router[View Router]
    end
    
    subgraph Components["UI Components"]
        Upload[UploadStep]
        Outline[OutlineStep]
        LessonList[LessonList]
        LessonDetail[LessonDetail]
        VideoPlayer[VideoPlayer]
        StatusBadge[StatusBadge]
    end
    
    subgraph API["api.ts"]
        UploadAPI[uploadBook]
        OutlineAPI[generateOutline]
        ScriptAPI[generateScript]
        QuizAPI[generateQuiz]
        VideoAPI[generateVideo]
    end
    
    State --> Router
    Router --> Upload
    Router --> Outline
    Router --> LessonList
    Router --> LessonDetail
    
    LessonDetail --> VideoPlayer
    LessonDetail --> StatusBadge
    
    Upload --> UploadAPI
    Outline --> OutlineAPI
    LessonDetail --> ScriptAPI
    LessonDetail --> QuizAPI
    LessonDetail --> VideoAPI
```

---

## 7. LLM Agent Pipeline (Conceptual)

```mermaid
flowchart LR
    subgraph Agents["AI Agents"]
        A1[📚 Outline Agent<br/>Curriculum Designer]
        A2[📝 Lesson Planner<br/>Learning Objectives]
        A3[✍️ Lesson Writer<br/>Script & Content]
        A4[❓ Assessment Agent<br/>Quiz Generator]
        A5[👁️ Vision Agent<br/>Image Analyzer]
        A6[🎬 Video Agent<br/>Orchestrator]
    end
    
    subgraph Flow
        Book[Book PDF] --> A1
        A1 -->|Outline| A2
        A2 -->|Plan| A3
        A3 -->|Script| A4
        A4 -->|Quiz| A6
        Book --> A5
        A5 -->|Image Descriptions| A6
        A3 -->|Script| A6
        A6 -->|Video| Output[MP4]
    end
```

---

## How to View These Diagrams

1. **GitHub/GitLab**: Diagrams render automatically in Markdown preview
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: Paste into [mermaid.live](https://mermaid.live)
4. **Export**: Use mermaid-cli to export as PNG/SVG:
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   mmdc -i DIAGRAMS.md -o diagrams.png
   ```

---

*Generated for Book-to-Course project documentation*

