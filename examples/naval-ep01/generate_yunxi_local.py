#!/usr/bin/env python3
"""
Generate voiceover for Naval Ep01 using Edge-TTS (zh-CN-YunxiNeural)
Run this script on your local computer where WebSockets are not restricted by proxy.
Output: build/audio/l01.mp3 ... l08.mp3
"""

import asyncio
import os
from pathlib import Path
import edge_tts

VOICE = "zh-CN-YunxiNeural"
RATE = "+25%"  # 1.25x speed for short-video punchy rhythm
PITCH = "+0Hz"

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

async def main():
    out_dir = Path("build/audio_yunxi")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"🎤 Synthesizing with Edge-TTS voice: {VOICE} at rate {RATE}...")
    for lid, text in LINES:
        out_file = out_dir / f"{lid}.mp3"
        print(f"  Generating {lid}: {text[:15]}...")
        comm = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE, pitch=PITCH)
        await comm.save(str(out_file))
        print(f"  ✓ Saved {out_file} ({out_file.stat().st_size} bytes)")
    print("\n✅ All 8 lines generated successfully in build/audio_yunxi/")

if __name__ == "__main__":
    asyncio.run(main())
