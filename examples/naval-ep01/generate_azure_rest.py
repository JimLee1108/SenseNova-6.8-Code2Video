#!/usr/bin/env python3
"""
Generate voiceover using Azure Cognitive Services Speech REST API.
This uses pure HTTP POST (SSML) and works directly inside any network proxy (bypassing WebSocket restrictions).

Usage:
    export AZURE_SPEECH_KEY="your-azure-key"
    export AZURE_SPEECH_REGION="eastus"  # e.g. eastus, southeastasia
    python generate_azure_rest.py
"""

import os
import sys
import urllib.request
from pathlib import Path

KEY = os.environ.get("AZURE_SPEECH_KEY")
REGION = os.environ.get("AZURE_SPEECH_REGION", "eastus")
VOICE = "zh-CN-YunxiNeural"
RATE = "+25%"

LINES = [
    ("l01", "你有没有想过，为什么绝大多数人拼命工作，却始终无法摆脱财务焦虑？"),
    ("l02", "《纳瓦尔宝典》给出了一句直击本质的话：想要财富，你必须拥有专属知识、问责机制，以及杠杆。"),
    ("l03", "先看第一个核心：专属知识。它不是你在学校按部就班学到的东西，而是无法通过培训直接获得的独特热爱与专长。"),
    ("l04", "如果社会可以轻易培训你，它就能轻易用别人替换你，甚至用算法替换你。"),
    ("l05", "再看第二个核心：杠杆。这是普通人打破时间限制、实现财富跃迁的唯一武器。"),
    ("l06", "劳动力杠杆需要管理别人，资本杠杆需要原始财富，而新时代最强大的杠杆——是代码和自媒体。"),
    ("l07", "代码和自媒体是免许可的杠杆。它们在你不睡觉、甚至不在电脑前时，依然24小时为你工作。"),
    ("l08", "记住：用头脑赚钱，而不是用时间赚钱。脱离时间的束缚，你才能真正拥有自由。"),
]

def synthesize_azure(text: str, out_path: str):
    url = f"https://{REGION}.tts.speech.microsoft.com/cognitiveservices/v1"
    headers = {
        "Ocp-Apim-Subscription-Key": KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "AntigravityCode2Video",
    }
    ssml = f"""<speak version='1.0' xml:lang='zh-CN'>
    <voice xml:lang='zh-CN' xml:gender='Male' name='{VOICE}'>
        <prosody rate='{RATE}'>{text}</prosody>
    </voice>
</speak>"""
    req = urllib.request.Request(url, data=ssml.encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        with open(out_path, "wb") as f:
            f.write(resp.read())

def main():
    if not KEY:
        print("❌ Error: AZURE_SPEECH_KEY environment variable is not set.")
        print("Please set AZURE_SPEECH_KEY and optional AZURE_SPEECH_REGION.")
        sys.exit(1)
        
    out_dir = Path("build/audio_yunxi")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"🎤 Synthesizing via Azure REST API: voice={VOICE}, rate={RATE}...")
    for lid, text in LINES:
        out_file = out_dir / f"{lid}.mp3"
        print(f"  Generating {lid}...")
        synthesize_azure(text, str(out_file))
        print(f"  ✓ Saved {out_file} ({out_file.stat().st_size} bytes)")
    print("\n✅ All 8 lines generated successfully via Azure Speech REST API!")

if __name__ == "__main__":
    main()
