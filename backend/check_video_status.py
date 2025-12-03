#!/usr/bin/env python3
"""
Quick script to check video status manually
"""
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
HEADERS = {
    "X-Api-Key": HEYGEN_API_KEY,
    "Content-Type": "application/json",
}

if len(sys.argv) < 2:
    print("Usage: python check_video_status.py <video_id>")
    print("\nOr check your latest videos:")
    print("python check_video_status.py list")
    sys.exit(1)

video_id = sys.argv[1]

if video_id == "list":
    print("Fetching your recent videos...")
    # List videos endpoint
    response = requests.get("https://api.heygen.com/v1/video.list", headers=HEADERS)
    data = response.json()

    videos = data.get("data", {}).get("videos", [])

    if videos:
        print(f"\n✅ Found {len(videos)} recent videos:\n")
        for i, video in enumerate(videos[:10], 1):
            vid = video.get("video_id")
            title = video.get("video_title", "Untitled")
            status = video.get("status", "unknown")
            duration = video.get("duration", 0)

            print(f"{i}. {title}")
            print(f"   ID: {vid}")
            print(f"   Status: {status}")
            print(f"   Duration: {duration}s")
            if video.get("video_url"):
                print(f"   URL: {video.get('video_url')}")
            print()
    else:
        print("No videos found")
else:
    print(f"Checking video: {video_id}\n")

    url = f"https://api.heygen.com/v1/video_status.get?video_id={video_id}"
    response = requests.get(url, headers=HEADERS)

    if response.status_code == 200:
        data = response.json()
        video_data = data.get("data", {})

        status = video_data.get("status", "unknown")
        video_url = video_data.get("video_url")
        error = video_data.get("error")
        duration = video_data.get("duration")

        print(f"Status: {status}")

        if status == "completed":
            print(f"✅ Video is READY!")
            print(f"Duration: {duration}s")
            print(f"URL: {video_url}")
        elif status == "failed":
            print(f"❌ Video FAILED!")
            print(f"Error: {error}")
        elif status == "processing":
            print(f"⏳ Video is still processing...")
            print(f"Please wait a few more minutes and check again.")
        elif status == "pending":
            print(f"⏳ Video is pending (in queue)...")
            print(f"Please wait and check again.")
        else:
            print(f"⚠️ Unknown status: {status}")
            print(f"Full response: {data}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)