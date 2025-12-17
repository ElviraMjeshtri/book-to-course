from __future__ import annotations

import json
import math
import re
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple

from openai import OpenAI  # type: ignore[import]
from pydantic import BaseModel

from .lesson_content import LessonContent, load_lesson_content
from .pdf_utils import load_book_text, load_book_images
from .llm_client import llm_client
from .tts_client import tts_client

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "books"
REPO_ROOT = Path(__file__).resolve().parents[2]
VIDEO_DIR = REPO_ROOT / "video"
PUBLIC_ASSETS_DIR = VIDEO_DIR / "public"
GENERATED_ASSETS_DIR = PUBLIC_ASSETS_DIR / "generated"


class Slide(BaseModel):
    title: str
    bullets: List[str]
    codeSnippet: Optional[str] = None
    narration: str = ""
    visualHint: Optional[str] = None  # Description of diagram/visual to show
    imagePath: Optional[str] = None  # Path to image from book (relative to static)


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
    """
    Synthesize text-to-speech using the configured TTS provider.
    Uses tts_client which supports multiple TTS providers.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    temp_mp3 = out_path.with_suffix(".tmp.mp3")

    # Use configurable TTS client
    tts_client.synthesize_speech(text=text, output_path=temp_mp3)

    # Convert to WAV format for consistent audio processing
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

    # Clean up temporary file
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


def _auto_generate_script(
    book_id: str, lesson_id: str, lesson: dict, outline: dict
) -> Optional[str]:
    """
    Auto-generate a lesson script if one doesn't exist.
    Uses the book text for context to create rich, detailed narration.
    """
    from .script_generator import generate_lesson_script

    try:
        book_text = load_book_text(book_id)
    except FileNotFoundError:
        book_text = ""

    # Use more book context for richer scripts (up to 10k chars)
    context_size = min(10000, len(book_text))
    book_context = book_text[:context_size]

    try:
        script_text = generate_lesson_script(
            lesson=lesson,
            book_context=book_context,
            course_title=outline.get("course_title", ""),
            mode="prod",  # Use production mode for detailed, rich content
        )

        # Save the generated script for future use
        script_path = DATA_DIR / f"{book_id}_{lesson_id}_script.txt"
        script_path.write_text(script_text, encoding="utf-8")
        print(f"✅ Auto-generated script for {lesson_id}: {len(script_text)} chars")

        return script_text
    except Exception as e:
        print(f"⚠️ Failed to auto-generate script: {e}")
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
    """
    Apply narrations to slides that don't already have them.
    
    IMPORTANT: Slides from _build_plan_from_script() already have narrations
    correctly aligned to their content. We only fill in missing narrations
    for slides that came from outline-only sources.
    """
    if not slides:
        return

    # Check if slides already have meaningful narrations
    slides_with_narration = sum(1 for s in slides if s.narration.strip())
    
    # If most slides already have narration, don't overwrite them
    if slides_with_narration >= len(slides) * 0.5:
        # Just fill in any missing ones with defaults
        for slide in slides:
            if not slide.narration.strip():
                slide.narration = _default_slide_narration(slide)
        return

    # Only split script if slides don't have narrations yet
    segments: List[str] = []
    if script_text:
        segments = _split_text_evenly(script_text, len(slides))

    for idx, slide in enumerate(slides):
        # Skip slides that already have narration
        if slide.narration.strip():
            continue
            
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

    # Add summary bullets to each slide to enrich fallback content
    summary_bullets_for_all = summary_bullets[:4]
    if summary_bullets_for_all:
        for s in slides:
            if len(s.bullets) < 4:
                s.bullets.extend(
                    [b for b in summary_bullets_for_all if b not in s.bullets]
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


def _estimate_duration_from_text(text: str) -> int:
    word_count = max(1, len(text.split()))
    return max(60, int(math.ceil(word_count / 2.5)) + 5)


def _extract_key_points_from_chunk(chunk_text: str, slide_type: str) -> Tuple[str, List[str]]:
    """
    Use LLM to extract concise key points from a script chunk.
    Returns (headline, bullet_points) where bullets are 3-7 words each.
    """
    try:
        result = llm_client.chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": """You extract key concepts from educational content for presentation slides.

Rules:
- Headline: 3-6 words, captures the main topic
- Bullets: 3-5 items, each 3-7 words MAX
- Use noun phrases, not full sentences
- Focus on concepts, terms, and key ideas
- NO periods at end of bullets

Example input: "Today we'll explore how RAG systems work. RAG stands for Retrieval-Augmented Generation. It combines a retriever that finds relevant documents with a language model that generates responses."

Example output:
HEADLINE: Understanding RAG Systems
BULLETS:
- Retrieval-Augmented Generation
- Document retrieval + LLM generation
- Grounded, factual responses
- Reduced hallucination risk"""
                },
                {
                    "role": "user",
                    "content": f"Extract key points for a '{slide_type}' slide:\n\n{chunk_text[:1500]}"
                }
            ],
            temperature=0.3,
            max_tokens=200,
        ).strip()
        
        # Parse the response
        headline = slide_type
        bullets: List[str] = []
        
        lines = result.split("\n")
        for line in lines:
            line = line.strip()
            if line.upper().startswith("HEADLINE:"):
                headline = line.split(":", 1)[1].strip()
            elif line.startswith("-"):
                bullet = line[1:].strip()
                if bullet and len(bullet.split()) <= 10:  # Max 10 words
                    bullets.append(bullet)
        
        # Fallback if parsing failed
        if not bullets:
            bullets = _fallback_extract_keywords(chunk_text)
        
        return headline, bullets[:5]  # Max 5 bullets
        
    except Exception as e:
        print(f"⚠️ LLM extraction failed: {e}, using fallback")
        return slide_type, _fallback_extract_keywords(chunk_text)


def _fallback_extract_keywords(text: str) -> List[str]:
    """
    Fallback keyword extraction without LLM.
    Extracts key noun phrases and technical terms.
    """
    # Common technical terms to look for
    tech_patterns = [
        r'\b(RAG|LLM|API|ML|AI|NLP|GPU|CPU|SDK|REST|JSON|SQL|NoSQL)\b',
        r'\b\w+ing\s+\w+\b',  # gerund phrases like "building systems"
        r'\b\w+tion\b',  # words ending in -tion
        r'\b\w+ment\b',  # words ending in -ment
    ]
    
    # Split into sentences and extract key phrases
    sentences = re.split(r'[.!?]', text)
    keywords: List[str] = []
    
    for sent in sentences[:6]:
        sent = sent.strip()
        if not sent:
            continue
            
        # Extract first few meaningful words
        words = sent.split()
        if len(words) >= 3:
            # Take first 3-5 words, skip common starters
            start_idx = 0
            skip_words = {'the', 'a', 'an', 'this', 'that', 'we', 'you', 'it', 'so', 'now', 'here'}
            while start_idx < len(words) and words[start_idx].lower() in skip_words:
                start_idx += 1
            
            phrase = " ".join(words[start_idx:start_idx + 4])
            if phrase and len(phrase) > 5:
                # Clean up and capitalize
                phrase = phrase.rstrip('.,!?:;')
                if phrase:
                    keywords.append(phrase.title() if not phrase[0].isupper() else phrase)
    
    # Deduplicate while preserving order
    seen = set()
    unique_keywords = []
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower not in seen:
            seen.add(kw_lower)
            unique_keywords.append(kw)
    
    return unique_keywords[:5]


def _should_show_code(chunk_text: str) -> bool:
    """Determine if this chunk should show a code example."""
    code_indicators = [
        r'\bcode\b', r'\bfunction\b', r'\bimplementation\b', r'\bexample\b',
        r'\bdef\s+\w+', r'\bclass\s+\w+', r'\bimport\b', r'\breturn\b',
        r'\blet\s+\w+', r'\bconst\s+\w+', r'\bvar\s+\w+',
        r'```', r'\bsnippet\b', r'\bwrite\b.*\bcode\b',
    ]
    text_lower = chunk_text.lower()
    return any(re.search(pattern, text_lower) for pattern in code_indicators)


def _match_images_to_slides(
    slides: List[Slide],
    book_images: List[dict],
    lesson_title: str,
) -> None:
    """
    Match relevant images from the book to slides using LLM.
    Uses vision-generated descriptions for better matching.
    Updates slides in-place with imagePath when a good match is found.
    """
    if not book_images:
        print("⚠️ No images to match")
        return
    
    print(f"🔍 Matching {len(book_images)} images to {len(slides)} slides for: {lesson_title}")
    
    # Filter out decorative images and those without descriptions
    meaningful_images = [
        img for img in book_images 
        if not img.get('is_decorative', False) 
        and img.get('description', '').strip()
        and 'decorative' not in img.get('description', '').lower()
        and 'logo' not in img.get('description', '').lower()
        and 'icon' not in img.get('description', '').lower()
    ]
    
    if not meaningful_images:
        # Fallback to all images if no meaningful ones found
        meaningful_images = [img for img in book_images if img.get('description', '').strip()]
    
    print(f"📊 {len(meaningful_images)} meaningful images (filtered from {len(book_images)})")
    
    # Take a sample of images spread across the book
    sample_size = min(25, len(meaningful_images))
    step = max(1, len(meaningful_images) // sample_size)
    sampled_images = [meaningful_images[i] for i in range(0, len(meaningful_images), step)][:sample_size]
    
    image_summaries = []
    for img in sampled_images:
        # Use the vision-generated description
        description = img.get('description', '').strip()
        if not description:
            continue
        summary = f"{img['id']} (page {img['page']}): {description}"
        image_summaries.append(summary)
    
    if not image_summaries:
        print("⚠️ No image summaries generated - images may not have been analyzed")
        return
    
    images_text = "\n".join(image_summaries)
    print(f"📝 Image summaries:\n{images_text[:1000]}...")
    
    # Build slide summaries
    slide_summaries = []
    for idx, slide in enumerate(slides):
        bullets_text = ", ".join(slide.bullets[:3])
        slide_summaries.append(f"{idx}: {slide.title} - {bullets_text}")
    
    slides_text = "\n".join(slide_summaries)
    
    print(f"📝 Slides to match:\n{slides_text[:500]}...")
    
    try:
        result = llm_client.chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": """You match technical book images/diagrams to presentation slides based on content relevance.

Each image has a description of what it shows (diagram, architecture, chart, etc.).
Your task: Match the MOST RELEVANT image to each slide based on the image description and slide topic.

Output format - one match per line:
SLIDE_NUMBER:IMAGE_ID

Example:
0:img_5
2:img_12
4:img_8

Rules:
- ONLY match if the image description DIRECTLY relates to the slide topic
- Architecture diagrams should match architecture/system design slides
- Code examples should match implementation/coding slides
- Flow diagrams should match process/workflow slides
- Charts should match data/comparison slides
- Each slide should get a DIFFERENT image (no duplicates)
- Skip slides where no image is a good match
- If no good matches exist, output: NO_MATCHES"""
                },
                {
                    "role": "user",
                    "content": f"""Lesson: {lesson_title}

IMAGES (with descriptions from vision analysis):
{images_text}

SLIDES TO MATCH:
{slides_text}

Match the most relevant image to each slide based on the image descriptions:"""
                }
            ],
            temperature=0.2,
            max_tokens=300,
        ).strip()
        print(f"🤖 LLM response:\n{result}")
        
        if "NO_MATCHES" in result.upper():
            print("⚠️ LLM found no matches")
            return
        
        # Parse matches - keep only FIRST match per slide
        image_by_id = {img['id']: img for img in book_images}
        slides_with_images: set = set()  # Track which slides already have images
        matches_found = 0
        
        for line in result.split("\n"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            
            # Handle various formats: "0:img_5", "Slide 0: img_5", "0 - img_5"
            match = re.search(r'(\d+)\s*[:\-]\s*(img_\d+)', line, re.IGNORECASE)
            if not match:
                continue
            
            try:
                slide_idx = int(match.group(1))
                image_id = match.group(2).lower()
                
                # Skip if this slide already has an image
                if slide_idx in slides_with_images:
                    continue
                
                if slide_idx < len(slides) and image_id in image_by_id:
                    img = image_by_id[image_id]
                    # Set the relative path for static serving
                    slides[slide_idx].imagePath = f"/static/books/{img['relative_path']}"
                    slides_with_images.add(slide_idx)
                    print(f"✅ Matched {image_id} (page {img['page']}) → slide {slide_idx}: {slides[slide_idx].title}")
                    matches_found += 1
                else:
                    print(f"⚠️ Could not match: slide_idx={slide_idx}, image_id={image_id}")
            except (ValueError, IndexError) as e:
                print(f"⚠️ Parse error for line '{line}': {e}")
                continue
        
        print(f"📊 Unique slides with images: {matches_found}/{len(slides)}")
                
    except Exception as e:
        print(f"❌ Image matching failed: {e}")
        import traceback
        traceback.print_exc()


def _copy_matched_images_to_public(slides: List[Slide], book_id: str) -> None:
    """
    Copy matched images to Remotion public folder and update paths.
    This allows Remotion to access the images during rendering.
    """
    for slide in slides:
        if not slide.imagePath:
            continue
        
        # Extract the relative path from the static URL
        # e.g., "/static/books/book_id/images/page_1_img_1.png"
        parts = slide.imagePath.split("/static/books/")
        if len(parts) != 2:
            continue
        
        relative_path = parts[1]  # "book_id/images/page_1_img_1.png"
        source_path = DATA_DIR / relative_path
        
        if not source_path.exists():
            print(f"⚠️ Image not found: {source_path}")
            slide.imagePath = None
            continue
        
        # Copy to Remotion public folder
        target_path = GENERATED_ASSETS_DIR / book_id / "images" / source_path.name
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(source_path, target_path)
        
        # Update path to be relative to Remotion public folder
        slide.imagePath = f"/generated/{book_id}/images/{source_path.name}"
        print(f"📁 Copied image to Remotion: {slide.imagePath}")


def _build_plan_from_script(
    *, lesson_id: str, title: str, script_text: str, code_snippet: Optional[str]
) -> LessonVideoPlan:
    """
    Build a lesson video plan from a script.
    
    Key improvement: Slides show concise key points (3-7 words each),
    while narration contains the full detailed explanation.
    This mimics how real video courses work - slides have bullet points,
    tutor explains in detail.
    """
    sentences = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+", script_text)
        if s.strip()
    ]
    if not sentences:
        sentences = [script_text.strip()]

    # Target 4-6 slides for a good pace
    target_slides = min(6, max(4, len(sentences) // 4 or 4))
    chunks: List[List[str]] = []
    for i in range(target_slides):
        start = int(round(i * len(sentences) / target_slides))
        end = int(round((i + 1) * len(sentences) / target_slides))
        chunk = sentences[start:end] or []
        if chunk:
            chunks.append(chunk)

    slides: List[Slide] = []
    code_placed = False

    # Slide type labels for better visual structure
    slide_labels = ["Introduction", "Core Concepts", "Deep Dive", "Key Insights", "Application", "Summary"]

    for idx, chunk in enumerate(chunks):
        # Join chunk into full text for analysis
        chunk_text = " ".join(chunk)
        
        # Get slide type label
        slide_type = slide_labels[idx] if idx < len(slide_labels) else f"Part {idx + 1}"
        
        # Extract concise key points using LLM (or fallback)
        headline, bullets = _extract_key_points_from_chunk(chunk_text, slide_type)
        
        # Full narration is the original chunk - this is what the tutor says
        narration = chunk_text
        
        # Determine if this slide should show code
        show_code = code_snippet and not code_placed and _should_show_code(chunk_text)
        if show_code:
            code_placed = True
        
        slides.append(
            Slide(
                title=headline,
                bullets=bullets,
                narration=narration,
                codeSnippet=code_snippet if show_code else None,
            )
        )

    # If code snippet wasn't placed but we have one, put it on a relevant slide
    if code_snippet and not code_placed and len(slides) > 2:
        # Place on slide 2 or 3 (after intro, during core content)
        slides[min(2, len(slides) - 1)].codeSnippet = code_snippet

    total_duration = _estimate_duration_from_text(script_text)

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

        # 1. Try LessonContent JSON (richest source)
        content = _load_content_if_available(book_id, lesson_id)
        if content:
            plan = _build_plan_from_content(content)
            return plan, lesson

        # 2. Try existing script
        script_text = _load_script(book_id, lesson_id)
        code_snippet = _code_snippet_from_lesson(lesson)

        # 3. Auto-generate script if none exists (KEY FIX!)
        if not script_text:
            print(f"📝 No script found for {lesson_id}, auto-generating...")
            script_text = _auto_generate_script(book_id, lesson_id, lesson, outline)

        # 4. Build plan from script (detailed slides with rich narration)
        if script_text:
            plan = _build_plan_from_script(
                lesson_id=lesson_id,
                title=lesson.get("title") or f"Lesson {lesson_index + 1}",
                script_text=script_text,
                code_snippet=code_snippet,
            )
            return plan, lesson

        # 5. Fallback to outline-only (last resort)
        print(f"⚠️ Using outline-only fallback for {lesson_id}")
        plan = _build_plan_from_lesson(
            book_id=book_id,
            lesson_index=lesson_index,
            lesson=lesson,
        )
        return plan, lesson

    # No outline available - use generic fallback
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
    # Clamp total duration strictly to audio length to avoid tail with no audio
    plan.totalDurationSec = max(1, int(math.ceil(current_time)))

    return plan, final_audio_path


def generate_lesson_video(book_id: str, lesson_index: int) -> Path:
    book_dir = DATA_DIR / book_id
    book_dir.mkdir(parents=True, exist_ok=True)

    plan, lesson_meta = _build_plan(book_id, lesson_index)
    script_text = _load_script(book_id, plan.lessonId)
    _apply_narrations(plan.slides, script_text)

    # Match book images to slides
    book_images = load_book_images(book_id)
    if book_images:
        print(f"📷 Found {len(book_images)} images, matching to slides...")
        _match_images_to_slides(plan.slides, book_images, plan.title)
        # Copy matched images to Remotion public folder
        _copy_matched_images_to_public(plan.slides, book_id)

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

