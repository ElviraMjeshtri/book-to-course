#!/usr/bin/env python3
"""
Quick script to list available HeyGen avatars and voices
Run this to find the correct IDs for your account
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
HEADERS = {
    "X-Api-Key": HEYGEN_API_KEY,
    "Content-Type": "application/json",
}

print("=" * 60)
print("HEYGEN AVAILABLE RESOURCES")
print("=" * 60)

# Get Avatars
print("\n📸 AVAILABLE AVATARS:")
print("-" * 60)
try:
    response = requests.get("https://api.heygen.com/v2/avatars", headers=HEADERS)
    response.raise_for_status()
    data = response.json()

    avatars = data.get("data", {}).get("avatars", [])

    if avatars:
        for i, avatar in enumerate(avatars[:10], 1):  # Show first 10
            avatar_id = avatar.get("avatar_id")
            avatar_name = avatar.get("avatar_name")
            print(f"{i}. ID: {avatar_id}")
            print(f"   Name: {avatar_name}")
            print()

        if len(avatars) > 10:
            print(f"... and {len(avatars) - 10} more avatars")

        print(f"\n✅ Total avatars available: {len(avatars)}")
        print(f"\n💡 Use the first avatar ID in your .env:")
        print(f"   HEYGEN_AVATAR_ID={avatars[0].get('avatar_id')}")
    else:
        print("❌ No avatars found!")

except Exception as e:
    print(f"❌ Error fetching avatars: {e}")

# Get Voices
print("\n" + "=" * 60)
print("🎤 AVAILABLE VOICES:")
print("-" * 60)
try:
    response = requests.get("https://api.heygen.com/v2/voices", headers=HEADERS)
    response.raise_for_status()
    data = response.json()

    voices = data.get("data", {}).get("voices", [])

    if voices:
        # Filter for English voices
        english_voices = [v for v in voices if v.get("language") == "English"]

        print(f"Found {len(english_voices)} English voices\n")

        for i, voice in enumerate(english_voices[:10], 1):  # Show first 10
            voice_id = voice.get("voice_id")
            voice_name = voice.get("name")
            gender = voice.get("gender", "Unknown")
            print(f"{i}. ID: {voice_id}")
            print(f"   Name: {voice_name} ({gender})")
            print()

        if len(english_voices) > 10:
            print(f"... and {len(english_voices) - 10} more English voices")

        print(f"\n✅ Total voices available: {len(voices)}")
        print(f"✅ English voices: {len(english_voices)}")
        print(f"\n💡 Use the first English voice ID in your .env:")
        if english_voices:
            print(f"   HEYGEN_VOICE_ID={english_voices[0].get('voice_id')}")
    else:
        print("❌ No voices found!")

except Exception as e:
    print(f"❌ Error fetching voices: {e}")

print("\n" + "=" * 60)
print("DONE! Copy the IDs above to your backend/.env file")
print("=" * 60)