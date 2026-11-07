#!/usr/bin/env python3
"""
Generate voiceover for Naval Ep01 (21 lines) using Edge-TTS (zh-CN-YunxiNeural)
Run this script on your local computer where WebSockets are not restricted by proxy.
Output: build/audio_yunxi/s01.mp3 ... s21.mp3
"""

import asyncio
from pathlib import Path
import edge_tts

VOICE = "zh-CN-YunxiNeural"
RATE = "+15%"  # 1.15x natural energetic speed
PITCH = "+0Hz"

LINES = [
    ("s01", "早上七点出门上班的打工人，就算每周拼命干满八十个小时，为什么依然存不下真正的财富？"),
    ("s02", "因为大多数人都困在工时陷阱里，只要靠出租时间换钱，一旦停下休息，收入就会立刻归零。"),
    ("s03", "纳瓦尔在纳瓦尔宝典中，点破了一个反直觉的真相：努力和财富之间，没有线性关系。"),
    ("s04", "金钱只是社会开出的工时欠条，而真正的财富，是睡觉时仍在帮你赚钱的资产。"),
    ("s05", "怎样拥有这种睡后资产？纳瓦尔把方法浓缩成一个公式：把自己产品化。"),
    ("s06", "用独门专长做支点，用商业杠杆做倍增器，再用判断力掌控方向。"),
    ("s07", "第一个支点叫专长。凡是培训班能批量教你的技能，明天就能培训别人替代你，甚至用几行代码接管你。"),
    ("s08", "真正的专长藏在天赋与好奇里。别人做起来像苦役，你做起来却像玩耍一样着迷。"),
    ("s09", "在成为你自己这件事上，全世界没有任何人能和你竞争。"),
    ("s10", "光有专长还不够。双手干活，一份时间只能卖一次，你还需要第二个支点：商业杠杆。"),
    ("s11", "单打独斗的打工人没有杠杆。而公司老板雇人接下百万大单，靠的是劳动力杠杆。"),
    ("s12", "投资人出资千万入股企业，单笔赚走上千万回报，靠的是资本杠杆。"),
    ("s13", "但这两种旧杠杆都有一道死门：必须经过别人的许可。得有人愿意跟从你，或把钱交给你。"),
    ("s14", "直到互联网带来第三种新杠杆：复制边际成本为零的代码和媒体。"),
    ("s15", "写一段程序或做一条视频，不需要向任何人申请许可。数据中心的服务器机器人，会全天候为你免费打工。"),
    ("s16", "当个人专长叠加上资本与代码，就能从单打独斗变成超级平台，产出被放大了上千倍。"),
    ("s17", "但千倍杠杆下，方向一旦偏了，十倍苦干也全是白费，所以第三个支点是判断力。"),
    ("s18", "在千亿美元市值的企业里，判断准确率八十五比七十五，哪怕只多对一成，公司也愿多付上亿美元报酬。因为乘上巨额杠杆，这一成就能多创百亿价值。"),
    ("s19", "而要练就这种顶级判断力，纳瓦尔给自己定下五千美元时薪。砍掉琐事，用一年深思，再用一天果断出手。"),
    ("s20", "回到那个早上七点出门上班的清晨，人与人真正的财富分水岭，从来不是谁多熬了几个通宵。"),
    ("s21", "先找到像玩耍一样的独门专长，再挂上无需许可的代码与媒体杠杆，把自己打造成一份无限复制的产品。")
]

async def main():
    out_dir = Path("build/audio_yunxi")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"🎤 Synthesizing 21 lines with Edge-TTS voice: {VOICE} at rate {RATE}...")
    for lid, text in LINES:
        out_file = out_dir / f"{lid}.mp3"
        print(f"  Generating {lid}: {text[:16]}...")
        comm = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE, pitch=PITCH)
        await comm.save(str(out_file))
        print(f"  ✓ Saved {out_file} ({out_file.stat().st_size} bytes)")
    print("\n✅ All 21 lines generated successfully in build/audio_yunxi/!")

if __name__ == "__main__":
    asyncio.run(main())
