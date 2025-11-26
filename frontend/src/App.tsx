import React, { useRef, useState } from "react";

import {
  uploadBook,
  generateOutline,
  type CourseOutline,
  type LessonOutline,
} from "./api";

type PillVariant = "success" | "info" | "warning" | "neutral";

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    try {
      const res = await uploadBook(selectedFile);
      setBookId(res.book_id);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail || "Failed to upload book. Check backend.",
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

    try {
      const res = await generateOutline(bookId);
      setOutline(res.outline);
      if (res.outline.lessons.length > 0) {
        setSelectedLesson(res.outline.lessons[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          "Failed to generate outline. Check backend & API key.",
      );
    } finally {
      setIsGeneratingOutline(false);
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
