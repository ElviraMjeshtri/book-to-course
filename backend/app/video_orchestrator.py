from __future__ import annotations

import json
import math
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple

from openai import OpenAI  # type: ignore[import]
from pydantic import BaseModel

from .lesson_content import LessonContent, load_lesson_content

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "books"
REPO_ROOT = Path(__file__).resolve().parents[2]
VIDEO_DIR = REPO_ROOT / "video"
PUBLIC_ASSETS_DIR = VIDEO_DIR / "public"
GENERATED_ASSETS_DIR = PUBLIC_ASSETS_DIR / "generated"

client = OpenAI()


class Slide(BaseModel):
    title: str
    bullets: List[str]
    codeSnippet: Optional[str] = None
    narration: str = ""


class SlideTiming(BaseModel):
    slideIndex: int
    startSec: float
    endSec: float


class LessonVideoPlan(BaseModel):
    lessonId: str
    title: str
    slides: List[Slide]
    totalDurationSec: int
    slideTimings: List[SlideTiming] = []


def synthesize_tts(text: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    temp_mp3 = out_path.with_suffix(".tmp.mp3")
    with client.audio.speech.with_streaming_response.create(
        model="tts-1",
        voice="alloy",
        input=text,
    ) as response:
        response.stream_to_file(temp_mp3)

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(temp_mp3),
            "-ar",
            "44100",
            "-ac",
            "2",
            str(out_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if temp_mp3.exists():
        temp_mp3.unlink()


def _load_outline(book_id: str) -> Optional[dict]:
    outline_path = DATA_DIR / f"{book_id}_outline.json"
    if not outline_path.exists():
        return None
    try:
        return json.loads(outline_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def _load_script(book_id: str, lesson_id: str) -> Optional[str]:
    candidates = [
        DATA_DIR / f"{book_id}_{lesson_id}_script.txt",
        DATA_DIR / book_id / f"{book_id}_{lesson_id}_script.txt",
    ]
    for script_path in candidates:
        if script_path.exists():
            return script_path.read_text(encoding="utf-8")
    return None


def _load_quiz(book_id: str, lesson_id: str) -> Optional[List[dict]]:
    candidates = [
        DATA_DIR / f"{book_id}_{lesson_id}_quiz.json",
        DATA_DIR / book_id / f"{book_id}_{lesson_id}_quiz.json",
    ]
    for quiz_path in candidates:
        if quiz_path.exists():
            try:
                return json.loads(quiz_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
    return None


def _split_text_evenly(text: str, parts: int) -> List[str]:
    if parts <= 0:
        return []
    words = text.split()
    if not words:
        return ["" for _ in range(parts)]
    total_words = len(words)
    segments: List[str] = []
    for i in range(parts):
        start = int(round(i * total_words / parts))
        end = int(round((i + 1) * total_words / parts))
        segment = " ".join(words[start:end]).strip()
        segments.append(segment)
    return segments


def _default_slide_narration(slide: Slide) -> str:
    lines: List[str] = [slide.title]
    for bullet in slide.bullets:
        lines.append(bullet)
    if slide.codeSnippet:
        lines.append("We'll look at a short code example to reinforce the concept.")
    return " ".join(lines).strip()


def _code_snippet_from_lesson(lesson: dict) -> Optional[str]:
    title = lesson.get("title", "").lower()
    key_points = lesson.get("key_points") or []
    if "rag" in title or any("retriev" in kp.lower() for kp in key_points):
        return (
            "# Simple RAG query flow\n"
            "from typing import List\n"
            "import numpy as np\n"
            "\n"
            "def embed(text: str) -> np.ndarray:\n"
            "    ...  # call your embedding model\n"
            "\n"
            "def top_k(query: str, vectors: List[np.ndarray], chunks: List[str], k=5):\n"
            "    q = embed(query)\n"
            "    sims = [float(np.dot(q, v) / (np.linalg.norm(q)*np.linalg.norm(v))) for v in vectors]\n"
            "    idx = np.argsort(sims)[::-1][:k]\n"
            "    return [(chunks[i], sims[i]) for i in idx]\n"
            "\n"
            "chunks = [\"... doc chunk ...\"]\n"
            "vectors = [embed(c) for c in chunks]\n"
            "hits = top_k(\"How do I chunk docs?\", vectors, chunks)\n"
        )
    if "prompt" in title or any("prompt" in kp.lower() for kp in key_points):
        return (
            "# Grounded prompt assembly\n"
            "def build_prompt(question: str, contexts: list[str]) -> str:\n"
            "    formatted = \"\\n\".join(f\"[doc{i}] {c}\" for i, c in enumerate(contexts, 1))\n"
            "    return (\n"
            "        \"You are a grounded assistant. Use only the provided docs.\\n\\n\"\n"
            "        f\"Question: {question}\\n\\n\"\n"
            "        f\"Context:\\n{formatted}\\n\\n\"\n"
            "        \"If unsure, say you don't know. Cite doc ids.\"\n"
            "    )\n"
            "\n"
            "prompt = build_prompt(\"Explain chunk overlap\", [\"chunking with 20-30% overlap helps continuity\"])\n"
        )
    return None


def _apply_narrations(
    slides: List[Slide],
    script_text: Optional[str],
) -> None:
    if not slides:
        return

    segments: List[str] = []
    if script_text:
        segments = _split_text_evenly(script_text, len(slides))

    for idx, slide in enumerate(slides):
        candidate = ""
        if segments and idx < len(segments):
            candidate = segments[idx]
        else:
            # Build a richer fallback narration using bullets and headline
            lines = [f"In this part: {slide.title}. Here's what we will cover."]
            for b in slide.bullets:
                lines.append(b)
            if slide.codeSnippet:
                lines.append(
                    "We'll also walk through a short code demo to reinforce the idea."
                )
            lines.append("Pay attention to how this connects to grounding and latency.")
            candidate = " ".join(lines)
        slide.narration = candidate.strip() or _default_slide_narration(slide)


def _chunk(items: List[str], size: int) -> List[List[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _load_content_if_available(book_id: str, lesson_id: str) -> Optional[LessonContent]:
    candidates = [
        DATA_DIR / f"{book_id}_{lesson_id}_content.json",
        DATA_DIR / book_id / f"{book_id}_{lesson_id}_content.json",
    ]
    for path in candidates:
        content = load_lesson_content(path)
        if content:
            return content
    return None


def _build_plan_from_content(content: LessonContent) -> LessonVideoPlan:
    slides: List[Slide] = []
    for section in content.sections:
        for s in section.slides:
            slides.append(
                Slide(
                    title=s.headline,
                    bullets=s.bullet_points,
                    codeSnippet=s.code_snippet,
                    narration=s.narration or "",
                )
            )

    if not slides:
        slides.append(
            Slide(
                title=content.title,
                bullets=["Lesson content available but no slides defined."],
                narration="",
            )
        )

    total_duration = max(
        60,
        int(content.estimated_minutes * 60) if content.estimated_minutes else 90,
    )

    return LessonVideoPlan(
        lessonId=content.lesson_id,
        title=content.title,
        slides=slides,
        totalDurationSec=total_duration,
        slideTimings=[],
    )


def _build_plan_from_lesson(
    *, book_id: str, lesson_index: int, lesson: dict
) -> LessonVideoPlan:
    title = lesson.get("title") or f"Lesson {lesson_index + 1}"
    lesson_id = lesson.get("id") or f"lesson_{lesson_index + 1}"
    summary = lesson.get("summary", "")
    key_points = lesson.get("key_points") or []
    code_snippet = _code_snippet_from_lesson(lesson)
    slides: List[Slide] = []

    summary_bullets = [line.strip() for line in summary.split(".") if line.strip()]
    if summary_bullets:
        slides.append(
            Slide(
                title=f"{title} Overview",
                bullets=summary_bullets[:4],
                narration="",
            )
        )

    if key_points:
        for idx, chunk in enumerate(_chunk(key_points, 3), start=1):
            slides.append(
                Slide(
                    title=f"Key Takeaways {idx}",
                    bullets=chunk,
                    narration="",
                )
            )

    quiz_data = _load_quiz(book_id, lesson_id)
    if quiz_data:
        quiz_bullets = [
            f"Q{idx + 1}: {question.get('question', '')}"
            for idx, question in enumerate(quiz_data[:2])
        ]
        if quiz_bullets:
            slides.append(
                Slide(
                    title="Quiz Preview",
                    bullets=quiz_bullets,
                    narration="",
                )
            )

    # Add an implementation / code sketch slide to make content richer
    impl_bullets: List[str] = []
    if "rag" in title.lower() or any("retriev" in kp.lower() for kp in key_points):
        impl_bullets = [
            "Chunk docs (200–400 tokens, 20–30% overlap)",
            "Embed and store vectors with metadata",
            "Top-k search with similarity threshold",
            "Trim to top context and ground the prompt",
        ]
    elif any("prompt" in kp.lower() for kp in key_points):
        impl_bullets = [
            "Keep system lean: ground in provided chunks",
            "User: question + cited context list",
            "Enforce 'I don’t know' when evidence missing",
        ]
    if impl_bullets:
        slides.append(
            Slide(
                title="Implementation Sketch",
                bullets=impl_bullets,
                narration="",
                codeSnippet=code_snippet,
            )
        )

    if not slides:
        slides.append(
            Slide(
                title=title,
                bullets=["Lesson highlights will appear here."],
                narration="",
            )
        )

    # Seed a code snippet into the first non-empty slide if available and not already placed
    if code_snippet and slides and all(s.codeSnippet is None for s in slides):
        slides[0].codeSnippet = code_snippet

    total_duration = max(60, len(slides) * 35)

    return LessonVideoPlan(
        lessonId=lesson_id,
        title=title,
        slides=slides,
        totalDurationSec=total_duration,
        slideTimings=[],
    )


def _build_plan(book_id: str, lesson_index: int) -> Tuple[LessonVideoPlan, Optional[dict]]:
    outline = _load_outline(book_id)
    lessons = outline.get("lessons") if outline else None
    if lessons and 0 <= lesson_index < len(lessons):
        lesson = lessons[lesson_index]
        lesson_id = lesson.get("id") or f"lesson_{lesson_index + 1}"
        content = _load_content_if_available(book_id, lesson_id)
        if content:
            plan = _build_plan_from_content(content)
            return plan, lesson
        plan = _build_plan_from_lesson(
            book_id=book_id,
            lesson_index=lesson_index,
            lesson=lesson,
        )
        return plan, lesson
    fallback_plan = LessonVideoPlan(
        lessonId=f"{book_id}-lesson-{lesson_index}",
        title=f"Lesson {lesson_index + 1}",
        totalDurationSec=90,
        slides=[
            Slide(
                title="Introduction",
                bullets=[
                    "Set expectations for the lesson",
                    "Highlight key takeaways",
                ],
            ),
            Slide(
                title="Core Concepts",
                bullets=["Explain concept A", "Demonstrate concept B"],
                codeSnippet='print("Hello from Lesson Video")',
            ),
        ],
    )
    return fallback_plan, None


def _copy_to_public(source: Path, *, book_id: str) -> Path:
    target = GENERATED_ASSETS_DIR / book_id / source.name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(source, target)
    return target


def _relative_public_path(path: Path) -> str:
    rel_path = path.relative_to(PUBLIC_ASSETS_DIR)
    return f"/{rel_path.as_posix()}"


def get_audio_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def concat_audios(segment_paths: List[Path], out_path: Path) -> None:
    if not segment_paths:
        raise ValueError("No audio segments provided for concatenation.")
    if len(segment_paths) == 1:
        shutil.copy(segment_paths[0], out_path)
        return

    list_file = out_path.with_suffix(".concat.txt")
    with list_file.open("w", encoding="utf-8") as file:
        for segment in segment_paths:
            file.write(f"file '{segment.as_posix()}'\n")

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(list_file),
            "-c:a",
            "pcm_s16le",
            str(out_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    list_file.unlink(missing_ok=True)


def build_audio_and_timings_for_plan(
    plan: LessonVideoPlan,
    book_dir: Path,
) -> tuple[LessonVideoPlan, Path]:
    segments_dir = book_dir / "audio_segments" / plan.lessonId
    segments_dir.mkdir(parents=True, exist_ok=True)

    segment_paths: List[Path] = []
    timings: List[SlideTiming] = []
    current_time = 0.0

    for idx, slide in enumerate(plan.slides):
        narration = slide.narration.strip() or _default_slide_narration(slide)
        segment_path = segments_dir / f"{plan.lessonId}_slide_{idx}.wav"
        synthesize_tts(narration, segment_path)
        duration = get_audio_duration(segment_path)
        timings.append(
            SlideTiming(
                slideIndex=idx,
                startSec=current_time,
                endSec=current_time + duration,
            )
        )
        current_time += duration
        segment_paths.append(segment_path)

    final_audio_path = book_dir / f"{plan.lessonId}_audio.wav"
    concat_audios(segment_paths, final_audio_path)

    plan.slideTimings = timings
    plan.totalDurationSec = max(plan.totalDurationSec, int(math.ceil(current_time)))

    return plan, final_audio_path


def generate_lesson_video(book_id: str, lesson_index: int) -> Path:
    book_dir = DATA_DIR / book_id
    book_dir.mkdir(parents=True, exist_ok=True)

    plan, lesson_meta = _build_plan(book_id, lesson_index)
    script_text = _load_script(book_id, plan.lessonId)
    _apply_narrations(plan.slides, script_text)

    plan, final_audio_path = build_audio_and_timings_for_plan(plan, book_dir)
    audio_public = _copy_to_public(final_audio_path, book_id=book_id)
    audio_src = _relative_public_path(audio_public)

    avatar_path = book_dir / f"lesson_{lesson_index}_avatar.mp4"
    avatar_src = None
    if avatar_path.exists():
        avatar_public = _copy_to_public(avatar_path, book_id=book_id)
        avatar_src = _relative_public_path(avatar_public)

    props = {
        "plan": plan.model_dump(),
        "audioSrc": audio_src,
        "avatarSrc": avatar_src,
    }

    props_path = book_dir / f"lesson_{lesson_index}_props.json"
    props_path.write_text(json.dumps(props, indent=2), encoding="utf-8")

    output_path = book_dir / f"lesson_{lesson_index}.mp4"

    subprocess.run(
        [
            "npx",
            "remotion",
            "render",
            "LessonVideo",
            str(output_path.resolve()),
            f"--props={props_path.resolve()}",
        ],
        check=True,
        cwd=VIDEO_DIR,
    )

    return output_path

