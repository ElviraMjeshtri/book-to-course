from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pypdf import PdfReader

from .pdf_utils import (
    save_uploaded_pdf,
    extract_text_from_pdf,
    extract_images_from_pdf,
    save_book_text,
    load_book_text,
    load_book_images,
    BOOKS_DIR,
)
from .llm_utils import generate_course_outline
from .script_generator import (
    generate_lesson_script,
    extract_code_examples,
    generate_quiz_questions,
)
from .video_utils import (
    list_available_avatars,
    list_available_voices,
    HeyGenError,
)
from .video_enhancer import (
    enhance_video_from_url,
    check_ffmpeg_installed,
    VideoEnhancerError,
)
from .video_orchestrator import generate_lesson_video
from .config import config, AVAILABLE_MODELS, AVAILABLE_TTS, LLMProvider, TTSProvider
from .llm_client import llm_client
from .tts_client import tts_client

app = FastAPI(
    title="Book-to-Video Course Generator",
    version="0.1.0",
)

# Allow everything for now (for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/static/books",
    StaticFiles(directory=BOOKS_DIR),
    name="books-static",
)


# Pydantic models
class CodeSnippet(BaseModel):
    timestamp: int
    duration: int
    code: str


class EnhanceRequest(BaseModel):
    code_snippets: List[CodeSnippet]
    layout: str = "avatar-corner"


class UpdateConfigRequest(BaseModel):
    provider: LLMProvider
    model: str
    api_key: Optional[str] = None


class UpdateTTSConfigRequest(BaseModel):
    provider: TTSProvider
    model: str
    voice: str
    api_key: Optional[str] = None


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/books/upload")
async def upload_book(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for now")

    # 1) Save PDF
    book_id, pdf_path = save_uploaded_pdf(file)

    # 2) Extract text from the full book
    text = extract_text_from_pdf(pdf_path, max_pages=None)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # 3) Save raw text
    save_book_text(book_id, text)

    # 4) Extract images from PDF
    images = extract_images_from_pdf(pdf_path, book_id)

    return {
        "book_id": book_id,
        "pages_processed": len(PdfReader(str(pdf_path)).pages),
        "images_extracted": len(images),
        "message": "Book uploaded, text and images extracted.",
    }


@app.get("/books/{book_id}/images")
async def get_book_images(book_id: str) -> Dict[str, Any]:
    """Get list of images extracted from a book."""
    images = load_book_images(book_id)
    return {
        "book_id": book_id,
        "images": images,
        "count": len(images),
    }


@app.post("/books/{book_id}/outline")
async def create_outline(book_id: str) -> Dict[str, Any]:
    # 1) load text
    try:
        text = load_book_text(book_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Book text not found. Upload first.")

    # crude guess for title: first line of text
    first_line = text.splitlines()[0].strip() if text.strip() else None
    book_title = first_line if first_line else None

    # 2) generate outline
    try:
        outline = generate_course_outline(text, book_title=book_title)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate outline: {e}")

    # 3) persist outline JSON
    outline_path = BOOKS_DIR / f"{book_id}_outline.json"
    outline_path.write_text(
        json_dumps(outline),
        encoding="utf-8",
    )

    return {
        "book_id": book_id,
        "outline": outline,
    }


def json_dumps(obj: Any) -> str:
    import json

    return json.dumps(obj, ensure_ascii=False, indent=2)


@app.post("/books/{book_id}/lessons/{lesson_id}/script")
async def generate_script(book_id: str, lesson_id: str) -> Dict[str, Any]:
    """Generate a video script for a specific lesson"""
    # Load outline
    outline_path = BOOKS_DIR / f"{book_id}_outline.json"
    if not outline_path.exists():
        raise HTTPException(status_code=404, detail="Outline not found. Generate outline first.")

    import json
    outline = json.loads(outline_path.read_text(encoding="utf-8"))

    # Find the lesson
    lesson = None
    for les in outline.get("lessons", []):
        if les["id"] == lesson_id:
            lesson = les
            break

    if not lesson:
        raise HTTPException(status_code=404, detail=f"Lesson {lesson_id} not found")

    # Load book text for context
    try:
        book_text = load_book_text(book_id)
    except FileNotFoundError:
        book_text = ""

    # Generate script
    try:
        script = generate_lesson_script(
            lesson=lesson,
            book_context=book_text[:5000],  # First 5000 chars for context
            course_title=outline.get("course_title", "")
        )

        # Save script
        script_path = BOOKS_DIR / f"{book_id}_{lesson_id}_script.txt"
        script_path.write_text(script, encoding="utf-8")

        return {
            "book_id": book_id,
            "lesson_id": lesson_id,
            "script": script,
            "script_length": len(script),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate script: {e}")


@app.post("/books/{book_id}/lessons/{lesson_id}/quiz")
async def generate_quiz(book_id: str, lesson_id: str) -> Dict[str, Any]:
    """Generate quiz questions for a specific lesson"""
    # Load outline
    outline_path = BOOKS_DIR / f"{book_id}_outline.json"
    if not outline_path.exists():
        raise HTTPException(status_code=404, detail="Outline not found. Generate outline first.")

    import json
    outline = json.loads(outline_path.read_text(encoding="utf-8"))

    # Find the lesson
    lesson = None
    for les in outline.get("lessons", []):
        if les["id"] == lesson_id:
            lesson = les
            break

    if not lesson:
        raise HTTPException(status_code=404, detail=f"Lesson {lesson_id} not found")

    # Generate quiz
    try:
        questions = generate_quiz_questions(lesson)

        # Save quiz
        quiz_path = BOOKS_DIR / f"{book_id}_{lesson_id}_quiz.json"
        quiz_path.write_text(json_dumps(questions), encoding="utf-8")

        return {
            "book_id": book_id,
            "lesson_id": lesson_id,
            "questions": questions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {e}")


@app.post("/books/{book_id}/lessons/{lesson_index}/video")
async def create_lesson_video(book_id: str, lesson_index: int) -> Dict[str, Any]:
    try:
        video_path = generate_lesson_video(book_id, lesson_index)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to generate video: {exc}") from exc

    return {
        "book_id": book_id,
        "lesson_index": lesson_index,
        "video_url": f"/static/books/{book_id}/{video_path.name}",
    }


@app.get("/heygen/avatars")
async def get_avatars() -> Dict[str, Any]:
    """List available HeyGen avatars"""
    try:
        avatars = list_available_avatars()
        return avatars
    except HeyGenError as e:
        raise HTTPException(status_code=500, detail=f"HeyGen API error: {e}")


@app.get("/heygen/voices")
async def get_voices() -> Dict[str, Any]:
    """List available HeyGen voices"""
    try:
        voices = list_available_voices()
        return voices
    except HeyGenError as e:
        raise HTTPException(status_code=500, detail=f"HeyGen API error: {e}")


@app.post("/books/{book_id}/lessons/{lesson_id}/video/enhance")
async def enhance_video_with_code_overlay(
    book_id: str,
    lesson_id: str,
    request: EnhanceRequest
) -> Dict[str, Any]:
    """
    OPTIONAL: Enhance generated video with code overlays using FFmpeg

    This is a separate endpoint - only call if you want code overlays!

    Args:
        book_id: Book identifier
        lesson_id: Lesson identifier
        code_snippets: List of code to overlay
        layout: "avatar-right", "avatar-left", or "avatar-corner"

    Example request body:
    {
        "code_snippets": [
            {"timestamp": 10, "duration": 8, "code": "name = 'Alice'\\nage = 25"},
            {"timestamp": 25, "duration": 8, "code": "x = 10\\ny = 20"}
        ],
        "layout": "avatar-corner"
    }
    """
    # Check FFmpeg is installed
    if not check_ffmpeg_installed():
        raise HTTPException(
            status_code=500,
            detail="FFmpeg not installed. Run: brew install ffmpeg"
        )

    # Load video metadata
    video_meta_path = BOOKS_DIR / f"{book_id}_{lesson_id}_video.json"
    if not video_meta_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Video not found. Generate video first."
        )

    import json
    video_meta = json.loads(video_meta_path.read_text(encoding="utf-8"))
    video_url = video_meta.get("video_url")

    if not video_url:
        raise HTTPException(status_code=400, detail="Video URL not found")

    # Enhance video
    try:
        output_dir = BOOKS_DIR / "enhanced_videos" / book_id
        output_dir.mkdir(parents=True, exist_ok=True)

        # Convert Pydantic models to dicts
        code_snippets_list = [snippet.dict() for snippet in request.code_snippets]

        enhanced_video_path = enhance_video_from_url(
            video_url=video_url,
            code_snippets=code_snippets_list,
            layout=request.layout,
            output_dir=str(output_dir)
        )

        # Save metadata
        enhanced_meta = {
            "original_video_url": video_url,
            "enhanced_video_path": enhanced_video_path,
            "code_snippets": code_snippets_list,
            "layout": request.layout,
        }

        enhanced_meta_path = BOOKS_DIR / f"{book_id}_{lesson_id}_enhanced.json"
        enhanced_meta_path.write_text(json_dumps(enhanced_meta), encoding="utf-8")

        return {
            "book_id": book_id,
            "lesson_id": lesson_id,
            "enhanced_video_path": enhanced_video_path,
            "original_video_url": video_url,
            "code_overlays_added": len(code_snippets_list),
            "layout": request.layout,
        }

    except VideoEnhancerError as e:
        raise HTTPException(status_code=500, detail=f"Enhancement error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enhance: {e}")


@app.get("/ffmpeg/status")
async def check_ffmpeg_status() -> Dict[str, Any]:
    """Check if FFmpeg is installed and working"""
    is_installed = check_ffmpeg_installed()

    return {
        "ffmpeg_installed": is_installed,
        "message": "FFmpeg is ready!" if is_installed else "FFmpeg not found",
        "enhancement_available": is_installed
    }


# ============================================================================
# Configuration Endpoints
# ============================================================================

@app.get("/config/models")
async def get_available_models() -> Dict[str, Any]:
    """Get all available AI models grouped by provider"""
    return config.get_available_llm_models()


@app.get("/config/current")
async def get_current_config() -> Dict[str, Any]:
    """Get current AI model configuration"""
    return config.get_current_llm_config()


@app.post("/config/model")
async def update_model_config(request: UpdateConfigRequest) -> Dict[str, Any]:
    """
    Update AI model configuration

    Body:
        provider: AI provider (openai, anthropic, gemini)
        model: Model ID
        api_key: Optional API key (if not provided, uses existing or .env)
    """
    try:
        success = config.update_llm_config(
            provider=request.provider,
            model=request.model,
            api_key=request.api_key
        )

        if success:
            return {
                "success": True,
                "message": f"Configuration updated to {request.provider} - {request.model}",
                "config": config.get_current_llm_config()
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to update configuration")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating configuration: {str(e)}")


@app.post("/config/test")
async def test_connection() -> Dict[str, Any]:
    """Test the current AI model configuration"""
    result = llm_client.test_connection()

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return result


# ============================================================================
# TTS Configuration Endpoints
# ============================================================================

@app.get("/config/tts")
async def get_available_tts() -> Dict[str, Any]:
    """Get all available TTS providers"""
    return config.get_available_tts()


@app.get("/config/tts/current")
async def get_current_tts_config() -> Dict[str, Any]:
    """Get current TTS configuration"""
    return config.get_current_tts_config()


@app.post("/config/tts")
async def update_tts_config(request: UpdateTTSConfigRequest) -> Dict[str, Any]:
    """
    Update TTS configuration

    Body:
        provider: TTS provider (openai, elevenlabs, google_tts)
        model: Model ID
        voice: Voice ID
        api_key: Optional API key (if not provided, uses existing or shared)
    """
    try:
        success = config.update_tts_config(
            provider=request.provider,
            model=request.model,
            voice=request.voice,
            api_key=request.api_key
        )

        if success:
            return {
                "success": True,
                "message": f"TTS configuration updated to {request.provider} - {request.voice}",
                "config": config.get_current_tts_config()
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to update TTS configuration")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating TTS configuration: {str(e)}")


@app.post("/config/tts/test")
async def test_tts_connection() -> Dict[str, Any]:
    """Test the current TTS configuration"""
    result = tts_client.test_connection()

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return result
