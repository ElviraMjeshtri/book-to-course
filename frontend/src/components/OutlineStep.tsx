import React from "react";
import { StatusBadge, type BadgeVariant } from "./StatusBadge";
import type { CourseOutline } from "../api";

interface OutlineStepProps {
  bookId: string | null;
  outline: CourseOutline | null;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const OutlineStep: React.FC<OutlineStepProps> = ({
  bookId,
  outline,
  isGenerating,
  onGenerate,
}) => {
  const getStatus = (): { label: string; variant: BadgeVariant } => {
    if (outline) return { label: "Ready", variant: "success" };
    if (isGenerating) return { label: "Generating...", variant: "info" };
    if (bookId) return { label: "Not started", variant: "warning" };
    return { label: "Locked", variant: "neutral" };
  };

  const status = getStatus();

  return (
    <div className="step-content">
      <div className="step-header">
        <div className={`step-number ${!bookId ? "locked" : ""}`}>2</div>
        <div>
          <h2>Generate outline</h2>
          <p className="step-description">
            AI creates a structured course curriculum
          </p>
        </div>
        <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
      </div>

      {!bookId && (
        <div className="empty-hint">
          <p>Upload a book first to unlock this step</p>
        </div>
      )}

      {bookId && !outline && (
        <>
          <div className="info-box">
            <p>
              The AI will analyze your book and create a 10-15 lesson curriculum
              with learning objectives and key points.
            </p>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner" /> Generating outline...
              </>
            ) : (
              "Generate Course Outline"
            )}
          </button>
        </>
      )}

      {outline && (
        <div className="outline-summary">
          <h3 className="course-title">{outline.course_title}</h3>
          <p className="course-audience">{outline.target_audience}</p>
          <div className="outline-stats">
            <div className="stat">
              <span className="stat-value">{outline.lessons.length}</span>
              <span className="stat-label">Lessons</span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-full"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Regenerating..." : "Regenerate Outline"}
          </button>
        </div>
      )}
    </div>
  );
};

