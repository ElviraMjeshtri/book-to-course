from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .pdf_utils import (
    save_uploaded_pdf,
    extract_text_from_pdf,
    save_book_text,
    load_book_text,
    BOOKS_DIR,
)
from .llm_utils import generate_course_outline

app = FastAPI(
    title="Book-to-Video Course Generator",
    version="0.1.0",
)

# Allow everything for now (for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/books/upload")
async def upload_book(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for now")

    # 1) Save PDF
    book_id, pdf_path = save_uploaded_pdf(file)

    # 2) Extract text (for v1: first 50 pages)
    text = extract_text_from_pdf(pdf_path, max_pages=50)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # 3) Save raw text
    save_book_text(book_id, text)

    return {
        "book_id": book_id,
        "pages_processed": 50,
        "message": "Book uploaded and text extracted.",
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
