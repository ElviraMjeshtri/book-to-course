"""
Lesson Script Generator
Converts lesson outlines into conversational video scripts
Supports TEST mode (1-2 mins) and PROD mode (6-8 mins)
"""
import os
from typing import Dict, Any, List, Literal
from dotenv import load_dotenv

from .llm_client import llm_client

load_dotenv()

# Set video mode: 'test' for 1-2 min videos, 'prod' for 6-8 min videos
VIDEO_MODE = os.getenv("VIDEO_MODE", "test").lower()


# System prompt for TEST mode (short videos)
SCRIPT_SYSTEM_PROMPT_TEST = """
You are an expert video course script writer for technical education.

Your task is to convert a lesson outline into an engaging, SHORT conversational video script
suitable for an AI avatar instructor (Udemy/Pluralsight style).

⚠️ CRITICAL: This is a TEST/DEMO version - keep it SHORT!

Guidelines:
1. Write in a friendly, conversational tone (like you're teaching a friend)
2. Use short, clear sentences (easier for avatar speech synthesis)
3. Structure the script with clear sections:
   - Quick Hook/Introduction (10-15 seconds)
   - Main content - ONE key concept only (60-90 seconds)
   - Brief Summary (10-15 seconds)
4. Add timing markers sparingly:
   - [SHOW_CODE] when code should appear on screen
   - [PAUSE] for emphasis
5. Include natural transitions between topics
6. **KEEP TOTAL SCRIPT LENGTH TO 1-2 MINUTES of speaking time (~200-400 words MAX)**
7. Avoid using special characters that might break TTS (text-to-speech)
8. Focus on THE MOST IMPORTANT concept only - skip secondary details

Output only the script text, nothing else.
"""

# System prompt for PROD mode (full-length videos)
SCRIPT_SYSTEM_PROMPT_PROD = """
You are an expert video course script writer for technical education.

Your task is to convert a lesson outline into an engaging, conversational video script
suitable for an AI avatar instructor (Udemy/Pluralsight style).

Guidelines:
1. Write in a friendly, conversational tone (like you're teaching a friend)
2. Use short, clear sentences (easier for avatar speech synthesis)
3. Structure the script with clear sections:
   - Hook/Introduction (15-30 seconds)
   - Main content with explanations (5-7 minutes)
   - Summary and next steps (30-45 seconds)
4. Add timing markers:
   - [SHOW_CODE] when code should appear on screen
   - [PAUSE] for emphasis or thinking time
   - [SHOW_DIAGRAM] when a visual would help
5. Include natural transitions between topics
6. Keep total script length to 6-8 minutes of speaking time (~1200-1600 words)
7. Avoid using special characters that might break TTS (text-to-speech)

Output only the script text, nothing else.
"""


def generate_lesson_script(
    lesson: Dict[str, Any],
    book_context: str = "",
    course_title: str = "",
    mode: Literal["test", "prod"] = None
) -> str:
    """
    Generate a video script for a lesson

    Args:
        lesson: Lesson dictionary with id, title, summary, key_points
        book_context: Optional context from the book (code examples, etc.)
        course_title: Optional course title for context
        mode: 'test' for 1-2 min videos (FREE tier), 'prod' for 6-8 min videos
              If None, uses VIDEO_MODE env var (defaults to 'test')

    Returns:
        Script text ready for video generation
    """
    # Determine mode (allow override via parameter)
    script_mode = mode if mode is not None else VIDEO_MODE

    # Select appropriate system prompt and settings based on mode
    if script_mode == "test":
        system_prompt = SCRIPT_SYSTEM_PROMPT_TEST
        max_tokens = 600  # ~200-400 words for 1-2 min video
        time_guidance = "1-2 minutes of speaking time (~200-400 words MAX)"
        detail_level = "Focus on ONE main concept only - skip examples and details"
    else:  # prod mode
        system_prompt = SCRIPT_SYSTEM_PROMPT_PROD
        max_tokens = 2500  # ~1200-1600 words for 6-8 min video
        time_guidance = "6-8 minutes of speaking time (~1200-1600 words)"
        detail_level = "Cover all key points with examples and explanations"

    # Build the prompt
    user_prompt = f"""
Create a video script for this lesson:

Course: {course_title if course_title else 'Technical Programming Course'}
Lesson Title: {lesson['title']}
Summary: {lesson['summary']}

Key Points to Cover:
"""

    # In TEST mode, limit to top 2-3 key points
    key_points = lesson['key_points']
    if script_mode == "test":
        key_points = key_points[:2]  # Only first 2 points for test mode

    for i, point in enumerate(key_points, 1):
        user_prompt += f"{i}. {point}\n"

    # Only add book context in PROD mode
    if book_context and script_mode == "prod":
        user_prompt += f"\n\nBook Context (for reference):\n{book_context[:2000]}"

    user_prompt += f"""

⚠️ MODE: {'TEST/DEMO (SHORT)' if script_mode == 'test' else 'PRODUCTION (FULL)'}

CRITICAL: Write NATURAL conversational speech ONLY.
DO NOT include [SHOW_CODE], [PAUSE], [SHOW_DIAGRAM] or ANY markers in the script.
The avatar should speak like a real teacher, not read stage directions.

Remember:
- Start with {'a quick hook' if script_mode == 'test' else 'an engaging hook'}
- Speak naturally and conversationally
- When discussing code, just say "here's an example" or "let's look at this"
- End with a {'brief' if script_mode == 'test' else 'clear'} summary
- **Keep it {time_guidance}**
- {detail_level}

GOOD example: "Variables store data. For example, we can write name equals Alice, or age equals 25."
BAD example: "Variables store data. [SHOW_CODE] See this code. [PAUSE]"
"""

    # Call LLM via unified client
    script = llm_client.chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=max_tokens,
    )

    # Add mode indicator to script metadata (for debugging)
    print(f"📝 Generated script in {script_mode.upper()} mode: {len(script)} chars (~{len(script.split())} words)")

    return script


def extract_code_examples(book_text: str, lesson_topic: str) -> List[str]:
    """
    Extract relevant code examples from book text for a specific lesson

    Args:
        book_text: Full or partial book text
        lesson_topic: The topic/title of the lesson

    Returns:
        List of code snippets
    """
    prompt = f"""
From the following book text, extract 2-4 relevant code examples for the lesson topic: "{lesson_topic}"

Book text:
{book_text[:3000]}

Return only the code examples, one per line, formatted as:
CODE_EXAMPLE_1:
```
<code here>
```

CODE_EXAMPLE_2:
```
<code here>
```
"""

    content = llm_client.chat_completion(
        messages=[
            {"role": "system", "content": "You extract code examples from technical books."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1500,
    )

    # Parse the response to extract code blocks
    code_examples = []

    # Simple parsing - look for code blocks
    import re
    code_blocks = re.findall(r'```(?:python|javascript|js|py)?\n(.*?)```', content, re.DOTALL)
    code_examples.extend(code_blocks)

    return code_examples


def generate_quiz_questions(lesson: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate quiz questions for a lesson

    Args:
        lesson: Lesson dictionary with title, summary, key_points

    Returns:
        List of quiz questions with multiple choice answers
    """
    prompt = f"""
Create 4 multiple-choice quiz questions for this lesson:

Lesson: {lesson['title']}
Summary: {lesson['summary']}

Key Points:
"""

    for point in lesson['key_points']:
        prompt += f"- {point}\n"

    prompt += """

For each question, provide:
1. The question text
2. 4 answer options (A, B, C, D)
3. The correct answer letter
4. A brief explanation

Format as JSON:
[
  {
    "question": "Question text?",
    "options": {
      "A": "Option A",
      "B": "Option B",
      "C": "Option C",
      "D": "Option D"
    },
    "correct_answer": "A",
    "explanation": "Brief explanation"
  }
]

Mix conceptual and practical questions.
"""

    content = llm_client.chat_completion(
        messages=[
            {"role": "system", "content": "You create quiz questions for technical courses."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=1500,
    )

    # Parse JSON response
    import json

    # Try to extract JSON from response
    try:
        # Look for JSON array in the response
        start = content.find('[')
        end = content.rfind(']') + 1
        if start != -1 and end > start:
            json_str = content[start:end]
            questions = json.loads(json_str)
            return questions
    except json.JSONDecodeError:
        pass

    # Return empty list if parsing fails
    return []