"""
Video Enhancement Module - OPTIONAL FFmpeg Post-Processing
Adds code overlays, shrinks avatar to corner, creates professional layouts

This is a SEPARATE module - can be enabled/disabled via API parameter
"""
import os
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests
from PIL import Image, ImageDraw, ImageFont


class VideoEnhancerError(Exception):
    """Custom exception for video enhancement errors"""
    pass


def check_ffmpeg_installed() -> bool:
    """Check if FFmpeg is installed on the system"""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def download_video(video_url: str, output_path: str) -> str:
    """Download video from HeyGen to local file"""
    print(f"📥 Downloading video from: {video_url}")

    response = requests.get(video_url, stream=True)
    response.raise_for_status()

    with open(output_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

    print(f"✅ Video downloaded to: {output_path}")
    return output_path


def create_code_image(
    code_text: str,
    width: int = 900,
    height: int = 500,
    font_size: int = 20
) -> str:
    """
    Create an image with code (monospace font, dark theme)

    Returns: Path to generated image
    """
    # Create image with dark background
    img = Image.new('RGB', (width, height), color='#282c34')
    draw = ImageDraw.Draw(img)

    # Try to use a monospace font
    font_paths = [
        '/System/Library/Fonts/Courier.dfont',  # macOS
        '/System/Library/Fonts/Monaco.dfont',   # macOS
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',  # Linux
        'C:\\Windows\\Fonts\\consola.ttf',  # Windows
    ]

    font = None
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                font = ImageFont.truetype(font_path, font_size)
                break
            except:
                continue

    if font is None:
        # Fallback to default font
        font = ImageFont.load_default()

    # Draw code text with line numbers
    lines = code_text.split('\n')
    y_offset = 20
    line_height = font_size + 8

    for i, line in enumerate(lines, 1):
        # Line number (gray)
        line_num = f"{i:2d} "
        draw.text((20, y_offset), line_num, fill='#5c6370', font=font)

        # Code text (light)
        draw.text((60, y_offset), line, fill='#abb2bf', font=font)

        y_offset += line_height

        if y_offset > height - 40:
            # Add "..." if code is too long
            draw.text((60, y_offset), "...", fill='#abb2bf', font=font)
            break

    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(
        suffix='.png',
        delete=False,
        dir=tempfile.gettempdir()
    )
    img.save(temp_file.name)

    print(f"🖼️  Code image created: {temp_file.name}")
    return temp_file.name


def enhance_video_with_code(
    video_path: str,
    code_snippets: List[Dict[str, Any]],
    layout: str = "avatar-right",
    output_path: Optional[str] = None
) -> str:
    """
    Enhance video by shrinking avatar and adding code overlays

    Args:
        video_path: Path to original HeyGen video
        code_snippets: List of dicts with 'timestamp', 'duration', 'code'
        layout: 'avatar-right', 'avatar-left', 'avatar-corner'
        output_path: Where to save enhanced video

    Returns:
        Path to enhanced video
    """
    if not check_ffmpeg_installed():
        raise VideoEnhancerError(
            "FFmpeg is not installed. Install with: brew install ffmpeg (macOS) "
            "or apt install ffmpeg (Linux)"
        )

    if not code_snippets:
        print("⚠️  No code snippets provided, returning original video")
        return video_path

    if output_path is None:
        output_path = video_path.replace('.mp4', '_enhanced.mp4')

    print(f"\n🎨 Enhancing video with {len(code_snippets)} code overlays...")
    print(f"   Layout: {layout}")

    # Create code images
    code_images = []
    for i, snippet in enumerate(code_snippets):
        img_path = create_code_image(snippet['code'])
        code_images.append({
            'path': img_path,
            'timestamp': snippet.get('timestamp', i * 10),
            'duration': snippet.get('duration', 8)
        })

    # Build FFmpeg filter_complex
    # Step 1: Scale avatar to corner/side
    if layout == 'avatar-right':
        # Avatar on right side (40% width)
        avatar_filter = "[0:v]scale=512:720[avatar]"
        avatar_x = 768  # Position at right
        avatar_y = 0
        code_x = 50
        code_y = 100
    elif layout == 'avatar-left':
        # Avatar on left side (40% width)
        avatar_filter = "[0:v]scale=512:720[avatar]"
        avatar_x = 0
        avatar_y = 0
        code_x = 600
        code_y = 100
    else:  # avatar-corner (default)
        # Avatar in bottom-right corner
        avatar_filter = "[0:v]scale=320:240[avatar]"
        avatar_x = 960  # Right side
        avatar_y = 480  # Bottom
        code_x = 50
        code_y = 50

    # Build complete filter
    filter_parts = [avatar_filter]
    current_video = "avatar"

    # Add each code overlay
    for i, code_img in enumerate(code_images):
        timestamp = code_img['timestamp']
        duration = code_img['duration']
        end_time = timestamp + duration

        # Add this code image as an input
        filter_parts.append(
            f"[{current_video}][{i+1}:v]overlay={code_x}:{code_y}:"
            f"enable='between(t,{timestamp},{end_time})'[v{i}]"
        )
        current_video = f"v{i}"

    # Final composite: place avatar
    filter_parts.append(
        f"[{current_video}]pad=1280:720:(1280-iw)/2:(720-ih)/2[final]"
    )

    filter_complex = ";".join(filter_parts)

    # Build FFmpeg command
    ffmpeg_cmd = [
        'ffmpeg',
        '-y',  # Overwrite output
        '-i', video_path,  # Input 0: avatar video
    ]

    # Add code images as inputs
    for code_img in code_images:
        ffmpeg_cmd.extend(['-i', code_img['path']])

    ffmpeg_cmd.extend([
        '-filter_complex', filter_complex,
        '-map', '[final]',
        '-map', '0:a',  # Copy audio from original
        '-c:a', 'copy',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        output_path
    ])

    print(f"\n🎬 Running FFmpeg...")
    print(f"   Command: {' '.join(ffmpeg_cmd[:10])}...")

    try:
        result = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )

        if result.returncode != 0:
            raise VideoEnhancerError(
                f"FFmpeg failed: {result.stderr[-500:]}"  # Last 500 chars
            )

        print(f"✅ Enhanced video created: {output_path}")

        # Cleanup temp code images
        for code_img in code_images:
            try:
                os.unlink(code_img['path'])
            except:
                pass

        return output_path

    except subprocess.TimeoutExpired:
        raise VideoEnhancerError("FFmpeg processing timeout (>5 minutes)")
    except Exception as e:
        raise VideoEnhancerError(f"FFmpeg error: {e}")


def enhance_video_from_url(
    video_url: str,
    code_snippets: List[Dict[str, Any]],
    layout: str = "avatar-right",
    output_dir: Optional[str] = None
) -> str:
    """
    Download video from URL and enhance it

    Args:
        video_url: HeyGen video URL
        code_snippets: Code to overlay
        layout: Layout style
        output_dir: Where to save files

    Returns:
        Path to enhanced video
    """
    if output_dir is None:
        output_dir = Path(tempfile.gettempdir()) / "enhanced_videos"
        output_dir.mkdir(exist_ok=True)
    else:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

    # Download original video
    original_path = output_dir / "original.mp4"
    download_video(video_url, str(original_path))

    # Enhance it
    enhanced_path = output_dir / "enhanced.mp4"
    result = enhance_video_with_code(
        str(original_path),
        code_snippets,
        layout=layout,
        output_path=str(enhanced_path)
    )

    return result


# Example usage
if __name__ == "__main__":
    # Test code
    print("Testing video enhancer...")

    if not check_ffmpeg_installed():
        print("❌ FFmpeg not installed!")
        print("Install: brew install ffmpeg (macOS)")
    else:
        print("✅ FFmpeg is installed")

    # Create test code image
    test_code = """def hello_world():
    print("Hello, World!")
    return True

result = hello_world()"""

    img_path = create_code_image(test_code)
    print(f"✅ Test code image created: {img_path}")