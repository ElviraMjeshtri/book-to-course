import React, { useState } from "react";
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
  
  // Loading states
  const isLoadingScript = !!resources?.loading?.script;
  const isLoadingQuiz = !!resources?.loading?.quiz;
  const isLoadingVideo = !!resources?.loading?.video;
  const isLoading = isLoadingScript || isLoadingQuiz || isLoadingVideo;

  // Get loading message for banner
  const getLoadingMessage = (): string | null => {
    if (isLoadingScript) return "Generating lesson script...";
    if (isLoadingQuiz) return "Generating quiz questions...";
    if (isLoadingVideo) return "Generating video (this may take a few minutes)...";
    return null;
  };

  const loadingMessage = getLoadingMessage();

  // Determine primary CTA
  const getPrimaryCTA = (): { label: string; action: () => void; loading: boolean } | null => {
    // If anything is loading, show that as the primary state
    if (isLoadingVideo) {
      return { label: "Generating Video...", action: () => {}, loading: true };
    }
    if (isLoadingScript) {
      return { label: "Generating Content...", action: () => {}, loading: true };
    }
    if (isLoadingQuiz) {
      return { label: "Generating Quiz...", action: () => {}, loading: true };
    }
    // Otherwise show the next action
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
      disabled: isLoading,
    });
  }
  if (hasQuiz) {
    moreMenuItems.push({
      id: "regen-quiz",
      label: "Regenerate Quiz",
      icon: "❓",
      onClick: onGenerateQuiz,
      disabled: isLoading,
    });
  }
  if (!hasQuiz && hasScript) {
    moreMenuItems.push({
      id: "gen-quiz",
      label: "Generate Quiz",
      icon: "❓",
      onClick: onGenerateQuiz,
      disabled: isLoading,
    });
  }
  if (hasVideo) {
    moreMenuItems.push({
      id: "regen-video",
      label: "Regenerate Video",
      icon: "🎬",
      onClick: onGenerateVideo,
      disabled: isLoading,
    });
  }

  // Build tabs
  const tabs: Tab[] = [
    { id: "overview", label: "Overview", icon: "📋" },
  ];
  if (hasScript || isLoadingScript) {
    tabs.push({ 
      id: "script", 
      label: isLoadingScript ? "Script..." : "Script", 
      icon: "📝" 
    });
  }
  if (hasQuiz || isLoadingQuiz) {
    tabs.push({ 
      id: "quiz", 
      label: isLoadingQuiz ? "Quiz..." : "Quiz", 
      icon: "❓", 
      badge: hasQuiz ? resources?.quiz?.length : undefined 
    });
  }
  if (hasVideo || isLoadingVideo) {
    tabs.push({ 
      id: "video", 
      label: isLoadingVideo ? "Video..." : "Video", 
      icon: "🎬" 
    });
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
          {moreMenuItems.length > 0 && !isLoading && <MoreMenu items={moreMenuItems} />}
        </div>
      </div>

      {/* Loading Banner */}
      {loadingMessage && (
        <div className="loading-banner">
          <span className="spinner" />
          <span>{loadingMessage}</span>
        </div>
      )}

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
            <div className={`status-item ${hasScript ? "ready" : ""} ${isLoadingScript ? "loading" : ""}`}>
              <span className="status-icon">
                {isLoadingScript ? <span className="spinner-sm" /> : hasScript ? "✓" : "○"}
              </span>
              <span>Script</span>
            </div>
            <div className={`status-item ${hasQuiz ? "ready" : ""} ${isLoadingQuiz ? "loading" : ""}`}>
              <span className="status-icon">
                {isLoadingQuiz ? <span className="spinner-sm" /> : hasQuiz ? "✓" : "○"}
              </span>
              <span>Quiz</span>
            </div>
            <div className={`status-item ${hasVideo ? "ready" : ""} ${isLoadingVideo ? "loading" : ""}`}>
              <span className="status-icon">
                {isLoadingVideo ? <span className="spinner-sm" /> : hasVideo ? "✓" : "○"}
              </span>
              <span>Video</span>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel id="script" activeTab={activeTab}>
        {isLoadingScript ? (
          <div className="loading-tab">
            <span className="spinner" />
            <p>Generating lesson script...</p>
            <p className="loading-hint">This usually takes 10-20 seconds</p>
          </div>
        ) : resources?.script ? (
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
        {isLoadingQuiz ? (
          <div className="loading-tab">
            <span className="spinner" />
            <p>Generating quiz questions...</p>
            <p className="loading-hint">Creating 4 multiple-choice questions</p>
          </div>
        ) : hasQuiz ? (
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
            <button className="btn btn-secondary" onClick={onGenerateQuiz} disabled={isLoading}>
              Generate Quiz
            </button>
          </div>
        )}
      </TabPanel>

      <TabPanel id="video" activeTab={activeTab}>
        {isLoadingVideo ? (
          <div className="loading-tab">
            <span className="spinner" />
            <p>Generating video...</p>
            <p className="loading-hint">This may take 2-5 minutes. You can switch tabs while waiting.</p>
          </div>
        ) : videoUrl ? (
          <VideoPlayer
            src={videoUrl}
            title={lesson.title}
            lessonId={lesson.id}
          />
        ) : (
          <div className="empty-tab">
            <p>No video generated yet.</p>
            {hasScript ? (
              <button className="btn btn-primary" onClick={onGenerateVideo} disabled={isLoading}>
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

