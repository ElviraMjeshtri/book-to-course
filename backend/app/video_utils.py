"""
HeyGen API Integration for Video Generation
Supports free tier (10 credits/month) and paid plans
"""
import os
import time
from typing import Dict, Any, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
HEYGEN_BASE_URL = "https://api.heygen.com/v2"
HEYGEN_AVATAR_ID = os.getenv("HEYGEN_AVATAR_ID", "default")
HEYGEN_VOICE_ID = os.getenv("HEYGEN_VOICE_ID", "default")


class HeyGenError(Exception):
    """Custom exception for HeyGen API errors"""
    pass


def get_headers() -> Dict[str, str]:
    """Get authorization headers for HeyGen API"""
    if not HEYGEN_API_KEY:
        raise HeyGenError("HEYGEN_API_KEY is not set in environment variables")

    return {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
    }


def list_available_avatars() -> Dict[str, Any]:
    """
    List all available avatars from HeyGen
    Useful for selecting which avatar to use
    """
    url = f"{HEYGEN_BASE_URL}/avatars"

    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HeyGenError(f"Failed to list avatars: {e}")


def list_available_voices() -> Dict[str, Any]:
    """
    List all available voices from HeyGen
    Useful for selecting which voice to use
    """
    url = f"{HEYGEN_BASE_URL}/voices"

    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HeyGenError(f"Failed to list voices: {e}")


def create_video(
    script: str,
    avatar_id: Optional[str] = None,
    voice_id: Optional[str] = None,
    title: Optional[str] = None,
    background_color: str = "#0e75b6",
) -> str:
    """
    Create a video using HeyGen API v2

    Args:
        script: The text script for the avatar to speak
        avatar_id: HeyGen avatar ID (uses default if not provided)
        voice_id: HeyGen voice ID (uses default if not provided)
        title: Optional title for the video
        background_color: Background color hex code

    Returns:
        video_id: The ID of the created video
    """
    url = f"{HEYGEN_BASE_URL}/video/generate"

    # Use defaults if not provided
    # Get from environment variables or use the first available from account
    if not avatar_id or avatar_id == "default":
        avatar_id = os.getenv("HEYGEN_AVATAR_ID", "Abigail_expressive_2024112501")

    if not voice_id or voice_id == "default":
        voice_id = os.getenv("HEYGEN_VOICE_ID", "f8c69e517f424cafaecde32dde57096b")

    # Payload format for HeyGen API v2
    payload = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": avatar_id,
                    "avatar_style": "normal"
                },
                "voice": {
                    "type": "text",
                    "input_text": script,
                    "voice_id": voice_id,
                },
                "background": {
                    "type": "color",
                    "value": background_color
                }
            }
        ],
        "dimension": {
            "width": 1280,
            "height": 720
        },
    }

    # Add optional title
    if title:
        payload["title"] = title

    try:
        print(f"🎬 Sending request to HeyGen API...")
        print(f"   URL: {url}")
        print(f"   Avatar: {avatar_id}")
        print(f"   Voice: {voice_id}")
        print(f"   Script length: {len(script)} chars")

        response = requests.post(url, headers=get_headers(), json=payload)

        # Print response for debugging
        print(f"   Status: {response.status_code}")

        response.raise_for_status()
        data = response.json()

        print(f"   Response: {data}")

        if "data" in data and "video_id" in data["data"]:
            video_id = data["data"]["video_id"]
            print(f"✅ Video created successfully! Video ID: {video_id}")
            return video_id
        else:
            raise HeyGenError(f"Unexpected response format: {data}")

    except requests.exceptions.HTTPError as e:
        # More detailed error message
        error_body = e.response.text if hasattr(e.response, 'text') else str(e)
        raise HeyGenError(f"Failed to create video: {e.response.status_code} {e.response.reason} - {error_body}")
    except requests.exceptions.RequestException as e:
        raise HeyGenError(f"Failed to create video: {e}")


def get_video_status(video_id: str) -> Dict[str, Any]:
    """
    Check the status of a video generation job

    Args:
        video_id: The ID of the video

    Returns:
        Dictionary with status, video_url, and other metadata
    """
    # Note: Status endpoint is v1, not v2!
    url = f"https://api.heygen.com/v1/video_status.get?video_id={video_id}"

    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HeyGenError(f"Failed to get video status: {e}")


def wait_for_video_completion(
    video_id: str,
    max_wait_time: int = 1200,  # Increased to 20 minutes for free tier
    poll_interval: int = 15  # Check every 15 seconds to avoid rate limits
) -> Dict[str, Any]:
    """
    Wait for video to complete processing

    Args:
        video_id: The ID of the video
        max_wait_time: Maximum time to wait in seconds (default: 10 minutes)
        poll_interval: How often to check status in seconds (default: 10 seconds)

    Returns:
        Final video status with download URL

    Raises:
        HeyGenError: If video fails or timeout occurs
    """
    start_time = time.time()

    while True:
        elapsed = time.time() - start_time

        if elapsed > max_wait_time:
            raise HeyGenError(f"Video processing timeout after {max_wait_time} seconds")

        status_data = get_video_status(video_id)
        status = status_data.get("data", {}).get("status", "unknown")

        print(f"Video {video_id} status: {status} (elapsed: {int(elapsed)}s)")

        if status == "completed":
            return status_data
        elif status == "failed":
            error = status_data.get("data", {}).get("error", "Unknown error")
            raise HeyGenError(f"Video generation failed: {error}")

        time.sleep(poll_interval)


def generate_video_from_script(
    script: str,
    lesson_title: str,
    avatar_id: Optional[str] = None,
    voice_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    High-level function to generate a complete video from a script

    Args:
        script: The lesson script
        lesson_title: Title of the lesson
        avatar_id: Optional avatar ID
        voice_id: Optional voice ID

    Returns:
        Dictionary with video_id, video_url, and duration
    """
    print(f"Creating video for: {lesson_title}")
    print(f"Script length: {len(script)} characters")

    # Create video
    video_id = create_video(
        script=script,
        avatar_id=avatar_id,
        voice_id=voice_id,
        title=lesson_title
    )

    print(f"Video created with ID: {video_id}")
    print("Waiting for processing to complete...")

    # Wait for completion
    result = wait_for_video_completion(video_id)

    video_data = result.get("data", {})
    video_url = video_data.get("video_url")
    duration = video_data.get("duration")

    print(f"✅ Video completed! URL: {video_url}")

    return {
        "video_id": video_id,
        "video_url": video_url,
        "duration": duration,
        "status": "completed"
    }