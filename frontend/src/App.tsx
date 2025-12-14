import React, { useState } from "react";
import {
  uploadBook,
  generateOutline,
  generateLessonScript,
  generateLessonQuiz,
  generateLessonVideo,
  API_BASE_URL,
  type CourseOutline,
  type LessonOutline,
  type QuizQuestion,
} from "./api";
import { UploadStep } from "./components/UploadStep";
import { OutlineStep } from "./components/OutlineStep";
import { LessonList } from "./components/LessonList";
import { LessonDetail } from "./components/LessonDetail";
import { EmptyState } from "./components/EmptyState";

type LessonResources = {
  script?: { text: string; length: number };
  quiz?: QuizQuestion[];
  videoUrl?: string;
  loading?: { script?: boolean; quiz?: boolean; video?: boolean };
  errors?: { script?: string; quiz?: string; video?: string };
};

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonOutline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lessonResources, setLessonResources] = useState<Record<string, LessonResources>>({});

  const normalizedApiBase = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;

  const currentResources = selectedLesson
    ? lessonResources[selectedLesson.id]
    : undefined;

  const updateLessonResources = (
    lessonId: string,
    updater: (prev: LessonResources | undefined) => LessonResources
  ) => {
    setLessonResources((prev) => ({
      ...prev,
      [lessonId]: updater(prev[lessonId]),
    }));
  };

  const extractErrorMessage = (err: unknown, fallback: string) => {
    if (
      err &&
      typeof err === "object" &&
      "response" in err &&
      err.response &&
      typeof err.response === "object" &&
      "data" in err.response
    ) {
      const data = (err.response as { data?: { detail?: string } }).data;
      return data?.detail || fallback;
    }
    return fallback;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError(null);
    setIsUploading(true);
    setOutline(null);
    setSelectedLesson(null);
    setLessonResources({});

    try {
      const res = await uploadBook(selectedFile);
      setBookId(res.book_id);
      // Extract book title from filename
      const title = selectedFile.name.replace(/\.pdf$/i, "");
      setBookTitle(title);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to upload book. Check backend."));
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!bookId) return;

    setError(null);
    setIsGeneratingOutline(true);
    setOutline(null);
    setSelectedLesson(null);
    setLessonResources({});

    try {
      const res = await generateOutline(bookId);
      setOutline(res.outline);
      if (res.outline.lessons.length > 0) {
        setSelectedLesson(res.outline.lessons[0]);
      }
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to generate outline."));
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!bookId || !selectedLesson) return;

    const lessonId = selectedLesson.id;
    updateLessonResources(lessonId, (prev = {}) => ({
      ...prev,
      errors: { ...prev.errors, script: undefined },
      loading: { ...prev.loading, script: true },
    }));

    try {
      const response = await generateLessonScript(bookId, lessonId);
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        script: { text: response.script, length: response.script_length },
        loading: { ...prev.loading, script: false },
      }));
    } catch (err) {
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        loading: { ...prev.loading, script: false },
        errors: { ...prev.errors, script: extractErrorMessage(err, "Failed to generate script.") },
      }));
    }
  };

  const handleGenerateQuiz = async () => {
    if (!bookId || !selectedLesson) return;

    const lessonId = selectedLesson.id;
    updateLessonResources(lessonId, (prev = {}) => ({
      ...prev,
      errors: { ...prev.errors, quiz: undefined },
      loading: { ...prev.loading, quiz: true },
    }));

    try {
      const response = await generateLessonQuiz(bookId, lessonId);
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        quiz: response.questions,
        loading: { ...prev.loading, quiz: false },
      }));
    } catch (err) {
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        loading: { ...prev.loading, quiz: false },
        errors: { ...prev.errors, quiz: extractErrorMessage(err, "Failed to generate quiz.") },
      }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!bookId || !selectedLesson || !outline) return;

    const lessonId = selectedLesson.id;
    const lessonIndex = outline.lessons.findIndex((l) => l.id === lessonId);
    if (lessonIndex < 0) return;

    updateLessonResources(lessonId, (prev = {}) => ({
      ...prev,
      errors: { ...prev.errors, video: undefined },
      loading: { ...prev.loading, video: true },
    }));

    try {
      const response = await generateLessonVideo(bookId, lessonIndex);
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        videoUrl: response.video_url,
        loading: { ...prev.loading, video: false },
      }));
    } catch (err) {
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        loading: { ...prev.loading, video: false },
        errors: { ...prev.errors, video: extractErrorMessage(err, "Failed to generate video.") },
      }));
    }
  };

  const getCurrentStep = () => {
    if (!bookId) return 1;
    if (!outline) return 2;
    return 3;
  };

  const currentStep = getCurrentStep();

  // Truncate book title for display
  const displayTitle = bookTitle
    ? bookTitle.length > 40
      ? bookTitle.substring(0, 40) + "..."
      : bookTitle
    : null;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">📖</span>
          <h1>Book to Course</h1>
        </div>
        <div className="header-meta">
          {displayTitle && (
            <span className="book-title" title={bookTitle || ""}>
              {displayTitle}
            </span>
          )}
          {outline && (
            <span className="lesson-count-badge">
              {outline.lessons.length} lessons
            </span>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <main className="app-main">
        {/* Sidebar - Steps */}
        <aside className="app-sidebar">
          {/* Step 1: Upload */}
          <div className={`step-card ${currentStep === 1 ? "active" : currentStep > 1 ? "completed collapsed" : ""}`}>
            {currentStep > 1 ? (
              <div className="step-collapsed">
                <span className="step-check">✓</span>
                <span className="step-collapsed-title">Book uploaded</span>
                <span className="step-collapsed-meta">{displayTitle}</span>
              </div>
            ) : (
              <UploadStep
                selectedFile={selectedFile}
                isUploading={isUploading}
                bookId={bookId}
                disabled={isGeneratingOutline}
                error={currentStep === 1 ? error : null}
                onFileSelect={setSelectedFile}
                onUpload={handleUpload}
              />
            )}
          </div>

          {/* Step 2: Outline */}
          <div className={`step-card ${currentStep === 2 ? "active" : currentStep > 2 ? "completed collapsed" : currentStep < 2 ? "locked" : ""}`}>
            {currentStep > 2 ? (
              <div className="step-collapsed">
                <span className="step-check">✓</span>
                <span className="step-collapsed-title">Outline generated</span>
                <span className="step-collapsed-meta">{outline?.lessons.length} lessons</span>
              </div>
            ) : (
              <OutlineStep
                bookId={bookId}
                outline={outline}
                isGenerating={isGeneratingOutline}
                onGenerate={handleGenerateOutline}
              />
            )}
          </div>

          {currentStep === 2 && error && (
            <p className="error-message sidebar-error">{error}</p>
          )}

          {/* Step 3 indicator when active */}
          {currentStep === 3 && (
            <div className="step-card active step-lessons">
              <div className="step-header">
                <div className="step-number">3</div>
                <div>
                  <h2>Create content</h2>
                  <p className="step-description">
                    Generate scripts, quizzes, and videos
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <section className="app-content">
          {!outline ? (
            <EmptyState
              icon="🎓"
              title="No course outline yet"
              description="Upload a book and generate an outline to see your lessons here."
            />
          ) : (
            <div className="content-layout">
              <LessonList
                lessons={outline.lessons}
                selectedLessonId={selectedLesson?.id ?? null}
                lessonResources={lessonResources}
                onSelectLesson={setSelectedLesson}
              />

              <div className="lesson-content">
                {selectedLesson ? (
                  <LessonDetail
                    lesson={selectedLesson}
                    resources={currentResources}
                    apiBaseUrl={normalizedApiBase}
                    onGenerateScript={handleGenerateScript}
                    onGenerateQuiz={handleGenerateQuiz}
                    onGenerateVideo={handleGenerateVideo}
                  />
                ) : (
                  <EmptyState
                    icon="👈"
                    title="Select a lesson"
                    description="Choose a lesson from the list to view details and generate content."
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
