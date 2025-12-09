from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import json
from pydantic import BaseModel, Field


class SlideContent(BaseModel):
    headline: str
    bullet_points: List[str] = Field(default_factory=list)
    visual_description: Optional[str] = None
    code_snippet: Optional[str] = None
    narration: Optional[str] = None


class SectionContent(BaseModel):
    section_id: str
    title: str
    explanation: str
    key_terms: List[str] = Field(default_factory=list)
    slides: List[SlideContent] = Field(default_factory=list)


class LearningObjective(BaseModel):
    text: str
    bloom_level: Optional[str] = None


class WorkedExample(BaseModel):
    title: str
    description: str
    code_snippet: Optional[str] = None


class HandsOnProject(BaseModel):
    title: str
    description: str
    steps: List[str] = Field(default_factory=list)
    expected_outcome: Optional[str] = None


class QuizItem(BaseModel):
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str


class LessonContent(BaseModel):
    lesson_id: str
    title: str
    estimated_minutes: Optional[int] = None
    prerequisites: List[str] = Field(default_factory=list)
    learning_objectives: List[LearningObjective] = Field(default_factory=list)
    sections: List[SectionContent] = Field(default_factory=list)
    worked_examples: List[WorkedExample] = Field(default_factory=list)
    hands_on_project: Optional[HandsOnProject] = None
    quiz: List[QuizItem] = Field(default_factory=list)


def load_lesson_content(path: Path) -> Optional[LessonContent]:
    if not path.exists():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return LessonContent.model_validate(raw)
    except Exception:
        return None

