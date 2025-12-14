# Token Usage & Cost Analysis

This document provides a detailed breakdown of OpenAI API token usage for the Book-to-Course video generation pipeline.

## Model Configuration

| Setting | Value |
|---------|-------|
| **Model** | gpt-4o-mini |
| **Configured in** | `backend/.env` → `OPENAI_MODEL` |

### Pricing (as of December 2024)

| Model | Input Tokens | Output Tokens |
|-------|--------------|---------------|
| gpt-4o-mini | $0.15 / 1M tokens | $0.60 / 1M tokens |

---

## Pipeline Steps & Token Usage

### 1. Generate Course Outline

**Endpoint:** `POST /books/{book_id}/outline`

| Component | Tokens (Approx) |
|-----------|-----------------|
| System prompt | ~300 tokens |
| Book text (max 20,000 chars) | ~5,000-6,000 tokens |
| **Input total** | **~5,500 tokens** |
| Output (10-15 lessons JSON) | ~1,500-2,500 tokens |
| **Output total** | **~2,000 tokens** |

**Cost per outline:** ~$0.002

---

### 2. Generate Script (per lesson)

**Endpoint:** `POST /books/{book_id}/lessons/{lesson_id}/script`

#### TEST Mode (1-2 min videos)

| Component | Tokens (Approx) |
|-----------|-----------------|
| System prompt | ~400 tokens |
| Lesson data + context | ~300 tokens |
| **Input total** | **~700 tokens** |
| Output (max_tokens=600) | ~400-600 tokens |
| **Output total** | **~500 tokens** |

**Cost per script (TEST):** ~$0.0004

#### PROD Mode (6-8 min videos)

| Component | Tokens (Approx) |
|-----------|-----------------|
| System prompt | ~400 tokens |
| Lesson + book context (2,000 chars) | ~800 tokens |
| **Input total** | **~1,200 tokens** |
| Output (max_tokens=2500) | ~1,500-2,500 tokens |
| **Output total** | **~2,000 tokens** |

**Cost per script (PROD):** ~$0.0015

---

### 3. Generate Quiz (per lesson)

**Endpoint:** `POST /books/{book_id}/lessons/{lesson_id}/quiz`

| Component | Tokens (Approx) |
|-----------|-----------------|
| System prompt | ~50 tokens |
| Lesson data | ~200 tokens |
| Quiz format instructions | ~150 tokens |
| **Input total** | **~400 tokens** |
| Output (4 questions, max_tokens=1500) | ~800-1,200 tokens |
| **Output total** | **~1,000 tokens** |

**Cost per quiz:** ~$0.0007

---

### 4. Generate Video (per lesson)

**Endpoint:** `POST /books/{book_id}/lessons/{lesson_index}/video`

Video generation involves multiple LLM calls:

#### 4a. Script Generation (if not already exists)
Same as Step 2 above.

#### 4b. Extract Key Points (per slide, typically 4-6 slides)

| Component | Tokens (Approx) |
|-----------|-----------------|
| System prompt | ~150 tokens |
| Script chunk (max 1,500 chars) | ~400 tokens |
| **Input per slide** | **~550 tokens** |
| **Input total (5 slides)** | **~2,750 tokens** |
| Output (max_tokens=200 × 5) | ~750 tokens |
| **Output total** | **~750 tokens** |

**Cost for key points:** ~$0.0009

#### 4c. Image-to-Slide Matching (if book has images)

| Component | Tokens (Approx) |
|-----------|-----------------|
| System prompt + instructions | ~300 tokens |
| Image descriptions + slides | ~500 tokens |
| **Input total** | **~800 tokens** |
| Output (max_tokens=300) | ~200 tokens |

**Cost for image matching:** ~$0.0003

#### 4d. Vision Analysis (per image, if applicable)

| Component | Tokens (Approx) |
|-----------|-----------------|
| Image + prompt | ~300 tokens |
| Output (max_tokens=100) | ~80 tokens |

**Cost per image:** ~$0.0001

---

## Full Course Cost Summary

### 10-Lesson Course in TEST Mode

| Step | API Calls | Input Tokens | Output Tokens | Cost |
|------|-----------|--------------|---------------|------|
| Outline | 1 | 5,500 | 2,000 | $0.002 |
| Scripts | 10 | 7,000 | 5,000 | $0.004 |
| Quizzes | 10 | 4,000 | 10,000 | $0.007 |
| Key Points | 50 | 27,500 | 7,500 | $0.009 |
| Image Match | 10 | 8,000 | 2,000 | $0.002 |
| **TOTAL** | **81** | **~52,000** | **~26,500** | **~$0.024** |

### 10-Lesson Course in PROD Mode

| Step | API Calls | Input Tokens | Output Tokens | Cost |
|------|-----------|--------------|---------------|------|
| Outline | 1 | 5,500 | 2,000 | $0.002 |
| Scripts | 10 | 12,000 | 20,000 | $0.014 |
| Quizzes | 10 | 4,000 | 10,000 | $0.007 |
| Key Points | 60 | 33,000 | 9,000 | $0.011 |
| Image Match | 10 | 8,000 | 2,000 | $0.002 |
| **TOTAL** | **91** | **~62,500** | **~43,000** | **~$0.036** |

---

## Quick Reference

| Mode | Total Tokens | Estimated Cost per Course |
|------|--------------|---------------------------|
| **TEST** (10 lessons) | ~78,500 | **$0.02 - $0.03** |
| **PROD** (10 lessons) | ~105,500 | **$0.04 - $0.05** |

---

## Configuration

The video mode is controlled by the `VIDEO_MODE` environment variable in `backend/.env`:

```bash
# Video Mode: 'test' for 1-2 min videos (FREE tier), 'prod' for 6-8 min videos
VIDEO_MODE=test
```

| Mode | Script Length | Video Duration | Use Case |
|------|---------------|----------------|----------|
| `test` | ~200-400 words | 1-2 minutes | Quick testing, demos |
| `prod` | ~1,200-1,600 words | 6-8 minutes | Full production videos |

---

## Cost Optimization Tips

1. **Use TEST mode for development** - Scripts are shorter, costs are ~40% lower
2. **Generate scripts manually first** - Review before video generation to avoid re-renders
3. **Skip quizzes if not needed** - Saves ~$0.007 per course
4. **Batch outline generation** - One outline serves all lessons

---

## Notes

- Actual token usage varies based on:
  - Book length and complexity
  - Number of images in the book
  - Lesson content density
  - Script generation variations
  
- The estimates above assume typical technical book content
- Vision API calls (for image analysis) add minimal cost (~$0.0001/image)
- Costs may change as OpenAI updates pricing

