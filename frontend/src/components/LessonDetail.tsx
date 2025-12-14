import React, { useState } from "react";
import { StatusBadge, type BadgeVariant } from "./StatusBadge";
import { VideoPlayer } from "./VideoPlayer";
import { Tabs, TabPanel, type Tab } from "./Tabs";
import { MoreMenu, type MenuItem } from "./MoreMenu";
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
  const [activeTab, setActiveTab] = useState("overview");

  const videoUrl = resources?.videoUrl
    ? resources.videoUrl.startsWith("http")
      ? resources.videoUrl
      : `${apiBaseUrl}${resources.videoUrl}`
    : null;

  const hasScript = !!resources?.script;
  const hasQuiz = resources?.quiz && resources.quiz.length > 0;
  const hasVideo = !!videoUrl;
  const isLoading = resources?.loading?.script || resources?.loading?.quiz || resources?.loading?.video;

  // Determine primary CTA
  const getPrimaryCTA = (): { label: string; action: () => void; loading: boolean } | null => {
    if (resources?.loading?.video) {
      return { label: "Generating Video...", action: () => {}, loading: true };
    }
    if (resources?.loading?.script) {
      return { label: "Generating Content...", action: () => {}, loading: true };
    }
    if (!hasScript) {
      return { label: "Generate Lesson Content", action: onGenerateScript, loading: false };
    }
    if (!hasVideo) {
      return { label: "Generate Video", action: onGenerateVideo, loading: false };
    }
    return null;
  };

  const primaryCTA = getPrimaryCTA();

  // More menu items (regenerate actions)
  const moreMenuItems: MenuItem[] = [];
  if (hasScript) {
    moreMenuItems.push({
      id: "regen-script",
      label: "Regenerate Script",
      icon: "📝",
      onClick: onGenerateScript,
      disabled: !!resources?.loading?.script,
    });
  }
  if (hasQuiz) {
    moreMenuItems.push({
      id: "regen-quiz",
      label: "Regenerate Quiz",
      icon: "❓",
      onClick: onGenerateQuiz,
      disabled: !!resources?.loading?.quiz,
    });
  }
  if (!hasQuiz && hasScript) {
    moreMenuItems.push({
      id: "gen-quiz",
      label: "Generate Quiz",
      icon: "❓",
      onClick: onGenerateQuiz,
      disabled: !!resources?.loading?.quiz,
    });
  }
  if (hasVideo) {
    moreMenuItems.push({
      id: "regen-video",
      label: "Regenerate Video",
      icon: "🎬",
      onClick: onGenerateVideo,
      disabled: !!resources?.loading?.video,
    });
  }

  // Build tabs
  const tabs: Tab[] = [
    { id: "overview", label: "Overview", icon: "📋" },
  ];
  if (hasScript) {
    tabs.push({ id: "script", label: "Script", icon: "📝" });
  }
  if (hasQuiz) {
    tabs.push({ id: "quiz", label: "Quiz", icon: "❓", badge: resources?.quiz?.length });
  }
  if (hasVideo) {
    tabs.push({ id: "video", label: "Video", icon: "🎬" });
  }

  // Collect all errors
  const errors = Object.entries(resources?.errors || {})
    .filter(([, v]) => v)
    .map(([, msg]) => msg as string);

  return (
    <div className="lesson-detail-panel">
      {/* Header */}
      <div className="lesson-detail-header">
        <div className="lesson-header-content">
          <span className="lesson-label">
            {lesson.id.replace("lesson_", "Lesson ")}
          </span>
          <h2>{lesson.title}</h2>
        </div>
        <div className="lesson-header-actions">
          {primaryCTA && (
            <button
              className="btn btn-primary"
              onClick={primaryCTA.action}
              disabled={primaryCTA.loading}
            >
              {primaryCTA.loading && <span className="spinner" />}
              {primaryCTA.label}
            </button>
          )}
          {moreMenuItems.length > 0 && <MoreMenu items={moreMenuItems} />}
        </div>
      </div>

      {/* Error Banner */}
      {errors.length > 0 && (
        <div className="error-banner">
          {errors.map((err, idx) => (
            <p key={idx}>{err}</p>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Panels */}
      <TabPanel id="overview" activeTab={activeTab}>
        <div className="overview-content">
          <p className="lesson-summary">{lesson.summary}</p>
          <div className="key-points-section">
            <h4>Key Points</h4>
            <ul className="key-points-list">
              {lesson.key_points.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>

          {/* Status indicators */}
          <div className="content-status">
            <div className={`status-item ${hasScript ? "ready" : ""}`}>
              <span className="status-icon">{hasScript ? "✓" : "○"}</span>
              <span>Script</span>
            </div>
            <div className={`status-item ${hasQuiz ? "ready" : ""}`}>
              <span className="status-icon">{hasQuiz ? "✓" : "○"}</span>
              <span>Quiz</span>
            </div>
            <div className={`status-item ${hasVideo ? "ready" : ""}`}>
              <span className="status-icon">{hasVideo ? "✓" : "○"}</span>
              <span>Video</span>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel id="script" activeTab={activeTab}>
        {resources?.script ? (
          <div className="script-content">
            <div className="script-meta">
              <span>{resources.script.length.toLocaleString()} characters</span>
              <span>~{Math.round(resources.script.text.split(/\s+/).length / 150)} min read</span>
            </div>
            <pre className="script-preview">{resources.script.text}</pre>
          </div>
        ) : (
          <div className="empty-tab">
            <p>No script generated yet.</p>
            <button className="btn btn-secondary" onClick={onGenerateScript}>
              Generate Script
            </button>
          </div>
        )}
      </TabPanel>

      <TabPanel id="quiz" activeTab={activeTab}>
        {hasQuiz ? (
          <div className="quiz-content">
            {resources?.quiz?.map((q, idx) => (
              <div key={idx} className="quiz-item">
                <p className="quiz-question-text">
                  {idx + 1}. {q.question}
                </p>
                <ul className="quiz-options-list">
                  {Object.entries(q.options).map(([key, val]) => (
                    <li
                      key={key}
                      className={key === q.correct_answer ? "correct" : ""}
                    >
                      <span className="option-key">{key}.</span> {val}
                    </li>
                  ))}
                </ul>
                {q.explanation && (
                  <p className="quiz-explanation">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tab">
            <p>No quiz generated yet.</p>
            <button className="btn btn-secondary" onClick={onGenerateQuiz}>
              Generate Quiz
            </button>
          </div>
        )}
      </TabPanel>

      <TabPanel id="video" activeTab={activeTab}>
        {videoUrl ? (
          <VideoPlayer
            src={videoUrl}
            title={lesson.title}
            lessonId={lesson.id}
          />
        ) : (
          <div className="empty-tab">
            <p>No video generated yet.</p>
            {hasScript ? (
              <button className="btn btn-primary" onClick={onGenerateVideo}>
                Generate Video
              </button>
            ) : (
              <p className="empty-hint-text">Generate a script first to create a video.</p>
            )}
          </div>
        )}
      </TabPanel>
    </div>
  );
};
