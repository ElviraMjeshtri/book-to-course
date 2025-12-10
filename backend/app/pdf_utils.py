import base64
import json
import uuid
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional

from openai import OpenAI
from pypdf import PdfReader

BASE_DIR = Path(__file__).resolve().parent.parent
BOOKS_DIR = BASE_DIR / "data" / "books"
BOOKS_DIR.mkdir(parents=True, exist_ok=True)

# Initialize OpenAI client for image analysis
_client: Optional[OpenAI] = None

def _get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


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


def _analyze_image_with_vision(image_path: Path) -> str:
    """
    Use GPT-4 Vision to analyze an image and describe its content.
    Returns a description of what the image shows.
    """
    try:
        # Check file size - skip very small images (likely icons/decorations)
        file_size = image_path.stat().st_size
        if file_size < 5000:  # Less than 5KB
            return "Small decorative element or icon"
        
        # Read and encode image
        with open(image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")
        
        # Determine media type
        ext = image_path.suffix.lower()
        media_type = "image/png" if ext == ".png" else "image/jpeg"
        
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use gpt-4o-mini for cost efficiency
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this image from a technical book. Describe what it shows in 1-2 sentences.
Focus on:
- If it's a diagram: what concept/architecture/flow does it illustrate?
- If it's a chart/graph: what data does it show?
- If it's code: what does the code do?
- If it's a screenshot: what interface/tool is shown?
- If it's decorative/logo: say "Decorative element" or "Logo"

Be specific about technical concepts shown. Output ONLY the description, no preamble."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_data}",
                                "detail": "low"  # Use low detail for faster/cheaper analysis
                            }
                        }
                    ]
                }
            ],
            max_tokens=100,
            temperature=0.2,
        )
        
        description = response.choices[0].message.content.strip()
        return description
        
    except Exception as e:
        print(f"⚠️ Vision analysis failed for {image_path.name}: {e}")
        return "Image analysis failed"


def extract_images_from_pdf(pdf_path: Path, book_id: str, analyze_images: bool = True) -> List[Dict[str, Any]]:
    """
    Extract images from a PDF file and save them to disk.
    Optionally analyzes images with GPT-4 Vision to understand their content.
    Returns a list of image metadata with paths and descriptions.
    """
    images_dir = BOOKS_DIR / book_id / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    
    reader = PdfReader(str(pdf_path))
    image_metadata: List[Dict[str, Any]] = []
    image_count = 0
    
    print(f"📷 Extracting images from PDF...")
    
    for page_num, page in enumerate(reader.pages):
        # Get text context from the page for image association
        page_text = page.extract_text() or ""
        # Take first 300 chars as context
        context = page_text[:300].strip()
        
        # Extract images from page
        if hasattr(page, 'images'):
            for img_idx, image in enumerate(page.images):
                try:
                    # Determine file extension
                    ext = ".png"
                    if image.name:
                        if image.name.lower().endswith(".jpg") or image.name.lower().endswith(".jpeg"):
                            ext = ".jpg"
                        elif image.name.lower().endswith(".png"):
                            ext = ".png"
                    
                    # Save image
                    image_filename = f"page_{page_num + 1}_img_{img_idx + 1}{ext}"
                    image_path = images_dir / image_filename
                    
                    with open(image_path, "wb") as f:
                        f.write(image.data)
                    
                    # Store metadata
                    image_metadata.append({
                        "id": f"img_{image_count}",
                        "filename": image_filename,
                        "path": str(image_path),
                        "relative_path": f"{book_id}/images/{image_filename}",
                        "page": page_num + 1,
                        "context": context,
                        "original_name": image.name or f"image_{image_count}",
                        "description": "",  # Will be filled by vision analysis
                    })
                    image_count += 1
                    
                except Exception as e:
                    print(f"⚠️ Failed to extract image from page {page_num + 1}: {e}")
                    continue
    
    print(f"📷 Extracted {len(image_metadata)} images")
    
    # Analyze images with vision model (sample for efficiency)
    if analyze_images and image_metadata:
        print(f"🔍 Analyzing images with GPT-4 Vision...")
        # Analyze a sample of images (max 50 for cost/time efficiency)
        sample_size = min(50, len(image_metadata))
        step = max(1, len(image_metadata) // sample_size)
        
        analyzed_count = 0
        for i in range(0, len(image_metadata), step):
            if analyzed_count >= sample_size:
                break
            
            img_meta = image_metadata[i]
            img_path = Path(img_meta["path"])
            
            if img_path.exists():
                description = _analyze_image_with_vision(img_path)
                img_meta["description"] = description
                analyzed_count += 1
                
                # Skip decorative elements in future matching
                if "decorative" in description.lower() or "logo" in description.lower():
                    img_meta["is_decorative"] = True
                else:
                    img_meta["is_decorative"] = False
                
                print(f"  📸 {img_meta['filename']}: {description[:80]}...")
        
        print(f"✅ Analyzed {analyzed_count} images with vision")
    
    # Save metadata to JSON
    if image_metadata:
        metadata_path = BOOKS_DIR / f"{book_id}_images.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(image_metadata, f, indent=2)
        print(f"✅ Saved image metadata to {metadata_path.name}")
    
    return image_metadata


def load_book_images(book_id: str) -> List[Dict[str, Any]]:
    """Load image metadata for a book."""
    metadata_path = BOOKS_DIR / f"{book_id}_images.json"
    if not metadata_path.exists():
        return []
    try:
        with open(metadata_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def get_image_path(book_id: str, image_filename: str) -> Optional[Path]:
    """Get the full path to a book image."""
    image_path = BOOKS_DIR / book_id / "images" / image_filename
    if image_path.exists():
        return image_path
    return None


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
