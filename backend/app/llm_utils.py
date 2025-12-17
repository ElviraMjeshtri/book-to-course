import json
from typing import Any, Dict

from .llm_client import llm_client


OUTLINE_SYSTEM_PROMPT = """
You are an expert course designer for technical topics.

Given the text of a technical book, design a 10–15 lesson video course
(Udemy/Pluralsight style) for beginner-to-intermediate learners.

Each lesson should have:
- id: a simple string like "lesson_1"
- title: clear, engaging
- summary: 2–4 sentences
- key_points: 3–6 bullet points

Respond with STRICT JSON with this exact structure:

{
  "course_title": "string",
  "target_audience": "string",
  "lessons": [
    {
      "id": "lesson_1",
      "title": "string",
      "summary": "string",
      "key_points": ["string", "..."]
    }
  ]
}

Do not include any extra text, comments, or markdown.
Just pure JSON.
"""


def generate_course_outline(book_text: str, book_title: str | None = None) -> Dict[str, Any]:
    """
    Call the LLM to generate a course outline JSON.
    We truncate book_text to avoid token overflow in v1.
    """
    # truncate large books for v1 (you can replace with RAG later)
    max_chars = 20000
    truncated_text = book_text[:max_chars]

    user_prompt = "Here is the book content.\n"
    if book_title:
        user_prompt += f"Book title: {book_title}\n\n"
    user_prompt += f"Book text (truncated):\n{truncated_text}"

    content = llm_client.chat_completion(
        messages=[
            {"role": "system", "content": OUTLINE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
    )

    try:
        outline = json.loads(content)
    except json.JSONDecodeError as e:
        # Simple recovery: try to extract JSON between first { and last }
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            json_str = content[start : end + 1]
            outline = json.loads(json_str)
        else:
            raise RuntimeError(f"Failed to parse JSON from model: {e}\nRaw content:\n{content}")

    return outline
