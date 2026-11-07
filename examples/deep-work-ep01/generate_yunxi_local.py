#!/usr/bin/env python3
"""
Generate voiceover for 《深度工作》 (Deep Work, 19 lines) using Edge-TTS (zh-CN-YunxiNeural)
Run this script on your local computer where WebSockets are not restricted by proxy.
Output: build/audio_yunxi/s01.mp3 ... s19.mp3
"""

import asyncio
from pathlib import Path
import edge_tts

VOICE = "zh-CN-YunxiNeural"
RATE = "+18%"  # Short-video crisp pace
PITCH = "+0Hz"

LINES = [
    ("s01", "为什么你每天在工位上忙满十个小时，下班时筋疲力尽，却感觉自己什么核心成果都没做出来？"),
    ("s02", "因为你掉进了浮浅工作的黑洞。秒回群消息、参加冗长会议、处理琐碎表格，看似忙碌，实则在原地踏步。"),
    ("s03", "计算机教授卡尔·纽波特在《深度工作》中发出警告：浮浅工作正在摧毁你的不可替代性。"),
    ("s04", "凡是边刷手机边能干完的活，对认知几乎没有要求。不仅别人能轻易替代你，人工智能更会第一批接管你。"),
    ("s05", "真正拉开人与人差距的，是深度工作：在无干扰的状态下挑战认知极限，创造高价值且难以复制的成果。"),
    ("s06", "纽波特把顶级产出的秘密，写进了一条极简公式：高质量工作产出，等于时间乘以专注度。"),
    ("s07", "为什么你觉得自己一直在工作，产出却很低？罪魁祸首叫注意力残留。每次切屏看一眼微信，你的大脑并不会立刻切回来。"),
    ("s08", "实验证明，哪怕只被打断三十秒，上一个任务的残留思绪也会滞留长达二十分钟，让你的实时智商下降十个点。"),
    ("s09", "如果一天看二十次手机，你就永远处于脑雾状态，哪怕坐在电脑前十二个小时，有效深度产出也接近于零。"),
    ("s10", "反过来，当你进入连续两小时零打断的深度专注，大脑神经元会加速包裹一层叫髓鞘质的绝缘脂质。"),
    ("s11", "就像把泥泞小路升级为光纤高速路，信号传导速度飙升百倍，别人三天啃不下的硬骨头，你两小时就能打穿。"),
    ("s12", "那么，在充满弹窗和算法诱惑的时代，普通人该如何夺回深度工作的能力？书中给出了四步实战法则。"),
    ("s13", "第一，建立节奏哲学。不要等有灵感才开始，每天在固定时间切出九十分钟物理断网舱，把深度专注变成像刷牙一样的生理本能。"),
    ("s14", "第二，主动拥抱无聊。排队、等电梯时绝不掏出手机。如果你连五分钟的无聊都忍受不了，大脑就永远无法耐受高强度的深度思考。"),
    ("s15", "第三，用二八法则断舍离社交媒体。凡是不能给核心目标带来百分之八十复利的工具，哪怕再热闹，也要果断静音卸载。"),
    ("s16", "第四，彻底抽干浮浅工作。把回邮件、开短会压缩进固定的半小时批量处理，并为每天设定铁律停工时间，绝不拖延。"),
    ("s17", "顶级高手的日程表，从来不是密密麻麻的碎片待办，而是每天雷打不动的四小时极致深潜，加上彻底放松的停工恢复。"),
    ("s18", "在未来经济中，世界将分成两类人：一类是被算法和碎片通知驯化的注意力奴隶；另一类是能驾驭深度专注的少数精英。"),
    ("s19", "关掉弹窗，斩断浮浅，每天留出两小时无人打扰的深度时光。专注，就是信息过载时代最稀缺的超能力。")
]

async def main():
    out_dir = Path("build/audio_yunxi")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"🎤 Synthesizing 19 lines of Deep Work with Edge-TTS voice: {VOICE} at rate {RATE}...")
    for lid, text in LINES:
        out_file = out_dir / f"{lid}.mp3"
        print(f"  Generating {lid}: {text[:16]}...")
        comm = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE, pitch=PITCH)
        await comm.save(str(out_file))
        print(f"  ✓ Saved {out_file} ({out_file.stat().st_size} bytes)")
    print("\n✅ All 19 lines generated successfully in build/audio_yunxi/!")

if __name__ == "__main__":
    asyncio.run(main())
