import React, { useState } from "react";
import { StatusBadge, type BadgeVariant } from "./StatusBadge";
import { VideoPlayer } from "./VideoPlayer";
import type { LessonOutline, QuizQuestion } from "../api";

interface LessonResources {
  script?: { text: string; length: number };
  quiz?: QuizQuestion[];
  videoUrl?: string;
  loading?: { script?: boolean; quiz?: boolean; video?: boolean };
  errors?: { script?: string; quiz?: string; video?: string };
}

interface LessonDetailProps {
  lesson: LessonOutline;
  resources: LessonResources | undefined;
  apiBaseUrl: string;
  onGenerateScript: () => void;
  onGenerateQuiz: () => void;
  onGenerateVideo: () => void;
}

export const LessonDetail: React.FC<LessonDetailProps> = ({
  lesson,
  resources,
  apiBaseUrl,
  onGenerateScript,
  onGenerateQuiz,
  onGenerateVideo,
}) => {
  const [showScript, setShowScript] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const videoUrl = resources?.videoUrl
    ? resources.videoUrl.startsWith("http")
      ? resources.videoUrl
      : `${apiBaseUrl}${resources.videoUrl}`
    : null;

  const getVideoStatus = (): { label: string; variant: BadgeVariant } => {
    if (resources?.loading?.video)
      return { label: "Generating...", variant: "info" };
    if (videoUrl) return { label: "Ready", variant: "success" };
    return { label: "Not generated", variant: "neutral" };
  };

  const videoStatus = getVideoStatus();

  return (
    <div className="lesson-detail-panel">
      {/* Header */}
      <div className="lesson-detail-header">
        <div>
          <span className="lesson-label">
            {lesson.id.replace("lesson_", "Lesson ")}
          </span>
          <h2>{lesson.title}</h2>
        </div>
      </div>

      {/* Summary */}
      <p className="lesson-summary">{lesson.summary}</p>

      {/* Key Points */}
      <div className="key-points-section">
        <h4>Key Points</h4>
        <ul className="key-points-list">
          {lesson.key_points.map((point, idx) => (
            <li key={idx}>{point}</li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="lesson-actions-bar">
        <div className="action-group">
          <button
            className={`btn ${resources?.script ? "btn-outline" : "btn-secondary"}`}
            onClick={onGenerateScript}
            disabled={resources?.loading?.script}
          >
            {resources?.loading?.script
              ? "Generating..."
              : resources?.script
                ? "Regenerate Script"
                : "Generate Script"}
          </button>
          <button
            className={`btn ${resources?.quiz ? "btn-outline" : "btn-secondary"}`}
            onClick={onGenerateQuiz}
            disabled={resources?.loading?.quiz}
          >
            {resources?.loading?.quiz
              ? "Generating..."
              : resources?.quiz
                ? "Regenerate Quiz"
                : "Generate Quiz"}
          </button>
        </div>
        <div className="action-primary">
          <button
            className="btn btn-primary"
            onClick={onGenerateVideo}
            disabled={resources?.loading?.video}
          >
            {resources?.loading?.video ? (
              <>
                <span className="spinner" /> Generating Video...
              </>
            ) : videoUrl ? (
              "Regenerate Video"
            ) : (
              "Generate Video"
            )}
          </button>
          <StatusBadge variant={videoStatus.variant}>
            {videoStatus.label}
          </StatusBadge>
        </div>
      </div>

      {/* Errors */}
      {resources?.errors && (
        <div className="errors-section">
          {Object.entries(resources.errors)
            .filter(([, v]) => v)
            .map(([key, msg]) => (
              <p key={key} className="error-message">
                {msg}
              </p>
            ))}
        </div>
      )}

      {/* Video Player */}
      {videoUrl && (
        <div className="video-section">
          <VideoPlayer
            src={videoUrl}
            title={lesson.title}
            lessonId={lesson.id}
          />
        </div>
      )}

      {/* Script (Collapsible) */}
      {resources?.script && (
        <div className="collapsible-section">
          <button
            className="collapsible-header"
            onClick={() => setShowScript(!showScript)}
          >
            <span>📝 Lesson Script</span>
            <span className="collapse-icon">{showScript ? "−" : "+"}</span>
          </button>
          {showScript && (
            <pre className="script-preview">{resources.script.text}</pre>
          )}
        </div>
      )}

      {/* Quiz (Collapsible) */}
      {resources?.quiz && resources.quiz.length > 0 && (
        <div className="collapsible-section">
          <button
            className="collapsible-header"
            onClick={() => setShowQuiz(!showQuiz)}
          >
            <span>❓ Quiz Questions ({resources.quiz.length})</span>
            <span className="collapse-icon">{showQuiz ? "−" : "+"}</span>
          </button>
          {showQuiz && (
            <div className="quiz-preview">
              {resources.quiz.map((q, idx) => (
                <div key={idx} className="quiz-item">
                  <p className="quiz-question-text">
                    {idx + 1}. {q.question}
                  </p>
                  <ul className="quiz-options-list">
                    {Object.entries(q.options).map(([key, val]) => (
                      <li
                        key={key}
                        className={
                          key === q.correct_answer ? "correct" : ""
                        }
                      >
                        <span className="option-key">{key}.</span> {val}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

