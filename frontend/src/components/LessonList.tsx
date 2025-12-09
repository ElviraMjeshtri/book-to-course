import React from "react";
import { StatusBadge, type BadgeVariant } from "./StatusBadge";
import type { LessonOutline } from "../api";

interface LessonResources {
  script?: { text: string; length: number };
  quiz?: unknown[];
  videoUrl?: string;
  loading?: { script?: boolean; quiz?: boolean; video?: boolean };
}

interface LessonListProps {
  lessons: LessonOutline[];
  selectedLessonId: string | null;
  lessonResources: Record<string, LessonResources>;
  onSelectLesson: (lesson: LessonOutline) => void;
}

export const LessonList: React.FC<LessonListProps> = ({
  lessons,
  selectedLessonId,
  lessonResources,
  onSelectLesson,
}) => {
  const getLessonStatus = (
    lessonId: string
  ): { label: string; variant: BadgeVariant } | null => {
    const resources = lessonResources[lessonId];
    if (!resources) return null;
    if (resources.videoUrl) return { label: "Video", variant: "success" };
    if (resources.script) return { label: "Script", variant: "info" };
    if (resources.quiz) return { label: "Quiz", variant: "info" };
    return null;
  };

  const getLessonNumber = (id: string): string => {
    const match = id.match(/lesson_(\d+)/);
    return match ? match[1] : id;
  };

  return (
    <div className="lesson-sidebar">
      <div className="sidebar-header">
        <h3>Lessons</h3>
        <span className="lesson-count">{lessons.length}</span>
      </div>
      <ul className="lesson-nav">
        {lessons.map((lesson) => {
          const status = getLessonStatus(lesson.id);
          const isSelected = selectedLessonId === lesson.id;
          return (
            <li
              key={lesson.id}
              className={`lesson-nav-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectLesson(lesson)}
            >
              <div className="lesson-nav-number">
                {getLessonNumber(lesson.id)}
              </div>
              <div className="lesson-nav-content">
                <span className="lesson-nav-title">{lesson.title}</span>
                {status && (
                  <StatusBadge variant={status.variant} size="sm">
                    {status.label}
                  </StatusBadge>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

