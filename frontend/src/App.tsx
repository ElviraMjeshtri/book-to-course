import React, { useRef, useState } from "react";

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

type PillVariant = "success" | "info" | "warning" | "neutral";

type LessonResources = {
  script?: {
    text: string;
    length: number;
  };
  quiz?: QuizQuestion[];
  videoUrl?: string;
  loading?: {
    script?: boolean;
    quiz?: boolean;
    video?: boolean;
  };
  errors?: {
    script?: string;
    quiz?: string;
    video?: string;
  };
};

const StatusPill = ({
  variant,
  children,
}: {
  variant: PillVariant;
  children: React.ReactNode;
}) => <span className={`status-pill status-${variant}`}>{children}</span>;

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonOutline | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [lessonResources, setLessonResources] = useState<
    Record<string, LessonResources>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentLessonResources = selectedLesson
    ? lessonResources[selectedLesson.id]
    : undefined;

  const normalizedApiBase = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const currentVideoUrl = currentLessonResources?.videoUrl;
  const absoluteVideoUrl = currentVideoUrl
    ? currentVideoUrl.startsWith("http")
      ? currentVideoUrl
      : `${normalizedApiBase}${currentVideoUrl}`
    : undefined;
  const videoStatusLabel = currentLessonResources?.loading?.video
    ? "Generating"
    : currentVideoUrl
      ? "Ready"
      : "Not generated";
  const videoStatusVariant: PillVariant =
    currentLessonResources?.loading?.video
      ? "info"
      : currentVideoUrl
        ? "success"
        : "warning";

  const updateLessonResources = (
    lessonId: string,
    updater: (prev: LessonResources | undefined) => LessonResources,
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

  const handleFilePicker = () => {
    if (isUploading || isGeneratingOutline) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = e.target.files[0];
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please choose a PDF file first.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setOutline(null);
    setSelectedLesson(null);
    setLessonResources({});

    try {
      const res = await uploadBook(selectedFile);
      setBookId(res.book_id);
    } catch (err) {
      console.error(err);
      setError(
        extractErrorMessage(err, "Failed to upload book. Check backend."),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!bookId) {
      setError("No book uploaded yet.");
      return;
    }

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
      console.error(err);
      setError(
        extractErrorMessage(
          err,
          "Failed to generate outline. Check backend & API key."
        ),
      );
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!bookId || !selectedLesson) {
      setError("Select a lesson first.");
      return;
    }

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
        script: {
          text: response.script,
          length: response.script_length,
        },
        loading: { ...prev.loading, script: false },
      }));
    } catch (err) {
      const message = extractErrorMessage(
        err,
        "Failed to generate script. Check backend logs."
      );
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        loading: { ...prev.loading, script: false },
        errors: { ...prev.errors, script: message },
      }));
    }
  };

  const handleGenerateQuiz = async () => {
    if (!bookId || !selectedLesson) {
      setError("Select a lesson first.");
      return;
    }

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
      const message = extractErrorMessage(
        err,
        "Failed to generate quiz. Check backend logs."
      );
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        loading: { ...prev.loading, quiz: false },
        errors: { ...prev.errors, quiz: message },
      }));
    }
  };

  const handleGenerateVideo = async () => {
    if (!bookId || !selectedLesson) {
      setError("Select a lesson first.");
      return;
    }

    const lessonId = selectedLesson.id;
    const lessonIndex = outline?.lessons.findIndex(
      (lesson) => lesson.id === lessonId,
    );
    if (lessonIndex === undefined || lessonIndex < 0) {
      setError("Could not determine lesson order.");
      return;
    }

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
      const message = extractErrorMessage(
        err,
        "Failed to generate video. Ensure script exists and HeyGen is configured."
      );
      updateLessonResources(lessonId, (prev = {}) => ({
        ...prev,
        loading: { ...prev.loading, video: false },
        errors: { ...prev.errors, video: message },
      }));
    }
  };

  const lessonsCount = outline?.lessons.length ?? 0;
  const summaryTiles = [
    {
      title: "Source PDF",
      value: bookId ? "Uploaded" : "Awaiting file",
      meta: bookId
        ? `ID: ${bookId}`
        : "Upload a technical PDF to get started.",
      badge: bookId ? "Ready" : "Pending",
      variant: (bookId ? "success" : "warning") as PillVariant,
    },
    {
      title: "Outline status",
      value: outline
        ? "Ready for review"
        : isGeneratingOutline
          ? "Generating"
          : "Not generated",
      meta: outline
        ? `${lessonsCount} lessons prepared`
        : isGeneratingOutline
          ? "This can take up to a minute."
          : bookId
            ? "Generate to see a curriculum draft."
            : "Upload a book to unlock.",
      badge: outline
        ? "Complete"
        : isGeneratingOutline
          ? "In progress"
          : bookId
            ? "Action needed"
            : "Locked",
      variant: (outline
        ? "success"
        : isGeneratingOutline
          ? "info"
          : bookId
            ? "warning"
            : "neutral") as PillVariant,
    },
    {
      title: "Lesson focus",
      value: selectedLesson ? selectedLesson.title : "No lesson selected",
      meta: selectedLesson
        ? `${selectedLesson.key_points.length} speaking points`
        : "Choose a lesson to review the talking points.",
      badge: selectedLesson ? "Active" : "Preview",
      variant: (selectedLesson ? "info" : "neutral") as PillVariant,
    },
  ];

  const workflowSteps = [
    {
      id: "upload",
      title: "Upload source PDF",
      description: "High-quality, structured PDFs lead to stronger outlines.",
      state: bookId ? "done" : "current",
      pillLabel: isUploading ? "Uploading" : bookId ? "Uploaded" : "Awaiting file",
      pillVariant: (isUploading
        ? "info"
        : bookId
          ? "success"
          : "warning") as PillVariant,
    },
    {
      id: "outline",
      title: "Generate outline",
      description: "Produce a 10–15 lesson curriculum for your cohort.",
      state: outline ? "done" : bookId ? "current" : "locked",
      pillLabel: outline
        ? "Complete"
        : isGeneratingOutline
          ? "In progress"
          : bookId
            ? "Ready"
            : "Locked",
      pillVariant: (outline
        ? "success"
        : isGeneratingOutline
          ? "info"
          : bookId
            ? "warning"
            : "neutral") as PillVariant,
    },
    {
      id: "review",
      title: "Review lessons",
      description: "Select each lesson to tailor the summary and key points.",
      state: outline ? "current" : "locked",
      pillLabel: outline ? "Available" : "Locked",
      pillVariant: (outline ? "info" : "neutral") as PillVariant,
    },
  ];

  return (
    <div className="page-wrapper">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Tutor workspace</p>
          <h1>Book → Course Studio</h1>
          <p>
            Transform trusted PDF references into a ready-to-teach video course
            outline in minutes.
          </p>
        </div>

        <div className="hero-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleFilePicker}
            disabled={isUploading || isGeneratingOutline}
          >
            {isUploading
              ? "Uploading..."
              : selectedFile
                ? "Choose another PDF"
                : "Select PDF"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleGenerateOutline}
            disabled={!bookId || isGeneratingOutline}
          >
            {isGeneratingOutline ? "Generating..." : "Generate outline"}
          </button>
        </div>
      </header>

      <section className="summary-grid">
        {summaryTiles.map((tile) => (
          <article key={tile.title} className="metric-card">
            <div className="metric-card-header">
              <p className="metric-title">{tile.title}</p>
              <StatusPill variant={tile.variant}>{tile.badge}</StatusPill>
            </div>
            <p className="metric-value">{tile.value}</p>
            <p className="metric-meta">{tile.meta}</p>
          </article>
        ))}
      </section>

      <main className="panel-grid">
        <section className="panel card upload-panel">
          <div className="panel-heading">
            <p className="eyebrow">Source material</p>
            <h2>Upload & preprocess</h2>
            <p className="panel-subtitle">
              We currently extract roughly the first 50 pages of your PDF for the
              v1 experience.
            </p>
          </div>

          <input
            ref={fileInputRef}
            id="book-upload-input"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div className="file-picker">
      <div>
              <p className="file-label">Selected file</p>
              <p className="file-name">
                {selectedFile ? selectedFile.name : "No file selected"}
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={handleFilePicker}
              disabled={isUploading || isGeneratingOutline}
            >
              {selectedFile ? "Change PDF" : "Choose PDF"}
            </button>
      </div>

          <div className="action-row">
            <button
              type="button"
              className="primary-button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload & extract"}
        </button>
            <p className="action-hint">
              PDF size limit ≈ 20 MB · We parse the first 50 pages for now.
            </p>
          </div>

          {bookId && (
            <div className="status-banner">
              <div>
                <p className="status-label">Book ID</p>
                <code>{bookId}</code>
              </div>
              <StatusPill variant={outline ? "success" : "info"}>
                {outline ? "Outline ready" : "Text extracted"}
              </StatusPill>
            </div>
          )}

          {error && <p className="error-card">{error}</p>}

          <div className="workflow-card">
            <div className="workflow-header">
              <h3>Production workflow</h3>
              <p>Keep your prep process aligned with the recommended steps.</p>
            </div>
            <ol className="workflow-steps">
              {workflowSteps.map((step) => (
                <li key={step.id} className={`workflow-step state-${step.state}`}>
                  <div className="workflow-step-top">
                    <StatusPill variant={step.pillVariant}>
                      {step.pillLabel}
                    </StatusPill>
                    <p className="workflow-step-title">{step.title}</p>
                  </div>
                  <p className="workflow-step-description">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="panel card outline-panel">
          <div className="panel-heading">
            <p className="eyebrow">Course blueprint</p>
            <h2>Lesson planning</h2>
            <p className="panel-subtitle">
              Review the automatically generated outline and tune each lesson
              before recording.
            </p>
          </div>

          {!outline && (
            <div className="empty-state">
              <h3>Outline not ready</h3>
              <p>
                Upload a PDF and generate an outline to populate this workspace.
              </p>
              <ul>
                <li>Upload a structured technical PDF.</li>
                <li>Click “Generate outline”.</li>
                <li>Review every lesson summary and key points.</li>
              </ul>
            </div>
          )}

          {outline && (
            <>
              <div className="outline-meta">
                <div>
                  <p className="meta-label">Course title</p>
                  <p className="meta-value">{outline.course_title}</p>
                </div>
                <div>
                  <p className="meta-label">Target audience</p>
                  <p className="meta-value">
                    {outline.target_audience || "Not specified"}
        </p>
      </div>
                <div>
                  <p className="meta-label">Lessons</p>
                  <p className="meta-value">{outline.lessons.length}</p>
                </div>
              </div>

              <div className="outline-layout">
                <div className="lesson-list">
                  <div className="lesson-list-header">
                    <h4>Lessons</h4>
                    <span className="list-count">{lessonsCount} items</span>
                  </div>
                  <ul>
                    {outline.lessons.map((lesson) => (
                      <li
                        key={lesson.id}
                        className={
                          selectedLesson?.id === lesson.id
                            ? "lesson-item selected"
                            : "lesson-item"
                        }
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <div className="lesson-title-row">
                          <span className="lesson-id">
                            {lesson.id.replace("lesson_", "Lesson ")}
                          </span>
                          <span className="lesson-title">{lesson.title}</span>
                        </div>
                        <p className="lesson-summary-preview">
                          {lesson.summary.slice(0, 90)}
                          {lesson.summary.length > 90 ? "..." : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lesson-detail">
                  {selectedLesson ? (
                    <>
                      <div className="lesson-detail-header">
                        <p className="eyebrow">Active lesson</p>
                        <h4>{selectedLesson.title}</h4>
                      </div>
                      <p className="full-summary">{selectedLesson.summary}</p>
                      <h5>Key points</h5>
                      <ul className="key-points">
                        {selectedLesson.key_points.map((kp, index) => (
                          <li key={`${selectedLesson.id}-${index}`}>{kp}</li>
                        ))}
                      </ul>

                        <div className="lesson-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={handleGenerateScript}
                            disabled={
                              !!currentLessonResources?.loading?.script ||
                              isGeneratingOutline
                            }
                          >
                            {currentLessonResources?.loading?.script
                              ? "Generating script..."
                              : "Generate Script"}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={handleGenerateQuiz}
                            disabled={
                              !!currentLessonResources?.loading?.quiz ||
                              isGeneratingOutline
                            }
                          >
                            {currentLessonResources?.loading?.quiz
                              ? "Generating quiz..."
                              : "Generate Quiz"}
                          </button>
                          <button
                            type="button"
                            className="primary-button ghost"
                            onClick={handleGenerateVideo}
                            disabled={
                              !!currentLessonResources?.loading?.video ||
                              isGeneratingOutline
                            }
                          >
                            {currentLessonResources?.loading?.video
                              ? "Generating video..."
                              : "Generate Video"}
                          </button>
                          <StatusPill variant={videoStatusVariant}>
                            {videoStatusLabel}
                          </StatusPill>
                        </div>

                        {currentLessonResources?.errors && (
                          <div className="resource-errors">
                            {Object.entries(currentLessonResources.errors)
                              .filter(([, value]) => value)
                              .map(([key, value]) => (
                                <p key={key} className="error-card compact">
                                  {value}
                                </p>
                              ))}
                          </div>
                        )}

                        {currentLessonResources?.script && (
                          <section className="resource-block">
                            <div className="resource-heading">
                              <h5>Lesson Script</h5>
                              <span className="resource-meta">
                                ~{currentLessonResources.script.length} chars
                              </span>
                            </div>
                            <pre className="script-content">
                              {currentLessonResources.script.text}
                            </pre>
                          </section>
                        )}

                        {currentLessonResources?.quiz &&
                          currentLessonResources.quiz.length > 0 && (
                            <section className="resource-block">
                              <div className="resource-heading">
                                <h5>Quiz Questions</h5>
                                <span className="resource-meta">
                                  {currentLessonResources.quiz.length} items
                                </span>
                              </div>
                              <div className="quiz-list">
                                {currentLessonResources.quiz.map(
                                  (question, idx) => (
                                    <article
                                      className="quiz-card"
                                      key={`${selectedLesson.id}-quiz-${idx}`}
                                    >
                                      <p className="quiz-question">
                                        Q{idx + 1}. {question.question}
                                      </p>
                                      <ul className="quiz-options">
                                        {Object.entries(question.options).map(
                                          ([optionKey, optionValue]) => (
                                            <li key={optionKey}>
                                              <span>{optionKey}.</span>
                                              <span>{optionValue}</span>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                      <p className="quiz-answer">
                                        Correct answer:{" "}
                                        <strong>
                                          {question.correct_answer}
                                        </strong>
                                      </p>
                                      <p className="quiz-explanation">
                                        {question.explanation}
                                      </p>
                                    </article>
                                  )
                                )}
                              </div>
                            </section>
                          )}

                        {absoluteVideoUrl && (
                          <section className="resource-block">
                            <div className="resource-heading">
                              <h5>Generated Video</h5>
                            </div>
                            <div className="video-wrapper">
                              <video
                                controls
                                src={absoluteVideoUrl}
                                className="lesson-video"
                              />
                              <div className="video-meta">
                                <a
                                  href={absoluteVideoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open in new tab
                                </a>
                              </div>
                            </div>
                          </section>
                        )}
                    </>
                  ) : (
                    <div className="empty-state compact">
                      <p>Select a lesson to see its details.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
