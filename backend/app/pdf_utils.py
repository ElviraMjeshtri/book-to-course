import os
import uuid
from pathlib import Path
from typing import Tuple

from pypdf import PdfReader

BASE_DIR = Path(__file__).resolve().parent.parent
BOOKS_DIR = BASE_DIR / "data" / "books"
BOOKS_DIR.mkdir(parents=True, exist_ok=True)


def save_uploaded_pdf(uploaded_file) -> Tuple[str, Path]:
    """
    Save incoming UploadFile to disk with a generated book_id.
    Returns (book_id, pdf_path).
    """
    book_id = str(uuid.uuid4())
    pdf_path = BOOKS_DIR / f"{book_id}.pdf"

    with pdf_path.open("wb") as f:
        # uploaded_file.file is a SpooledTemporaryFile
        f.write(uploaded_file.file.read())

    return book_id, pdf_path


def extract_text_from_pdf(pdf_path: Path, max_pages: int | None = None) -> str:
    """
    Extract plain text from a PDF file.
    For v1, we can optionally limit to first `max_pages`.
    """
    reader = PdfReader(str(pdf_path))
    text_chunks: list[str] = []

    pages = reader.pages
    if max_pages is not None:
        pages = pages[:max_pages]

    for page in pages:
        page_text = page.extract_text() or ""
        text_chunks.append(page_text)

    return "\n\n".join(text_chunks)


def save_book_text(book_id: str, text: str) -> Path:
    txt_path = BOOKS_DIR / f"{book_id}.txt"
    with txt_path.open("w", encoding="utf-8") as f:
        f.write(text)
    return txt_path


def load_book_text(book_id: str) -> str:
    txt_path = BOOKS_DIR / f"{book_id}.txt"
    if not txt_path.exists():
        raise FileNotFoundError(f"No text found for book_id={book_id}")
    return txt_path.read_text(encoding="utf-8")
