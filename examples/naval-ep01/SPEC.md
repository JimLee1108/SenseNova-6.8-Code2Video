# SPEC — 《纳瓦尔宝典》书籍解读 · 样片 01

## The one idea
出卖时间无法致富；纳瓦尔的路径是 **专长 × 杠杆 × 判断力**，让收入与时间脱钩，并在长期游戏中复利。

- **Persistent example:** one income-vs-time graph (axes 时间 / 收入) that carries the film: a linear "出卖时间" line that hits a 24-hour wall (S2), and a leveraged vermilion curve that passes it (S6–S7). A formula bar `专长 × 杠杆 × 判断力` builds one term per step (S4–S7).
- **Visible change:** the linear line stops at the wall; the leveraged curve does not.

## Format
- 1920×1080, 30 fps, H.264 yuv420p, target 60 s (allowed 57–63 s), 1800 frames, no loop.
- Audio required: Mandarin narration + subtitles, soft original score, a few effects. Stereo AAC 48 kHz, −14 LUFS, TP ≤ −1 dBTP.
- Renderer: Node + `@napi-rs/canvas` (no browser), raw RGBA piped to ffmpeg. `frame(t)` is pure; grain is seeded once.

## Voice (deviation from skill default)
edge-tts is blocked in this VM (websocket handshake returns 403 from the egress proxy). Narration uses **Piper `zh_CN-huayan-medium`** offline (`scripts/tts_piper.py`, same `timing.json` format), rate −15%. Picture timing is built from the measured line lengths.

## Exact copy (on screen, in order; no other text)
- Tag (whole film): `书籍解读｜《纳瓦尔宝典》`
- S1: `出卖时间，能致富吗？`
- S2: axis `时间`, `收入`; `收入 = 时间 × 单价`; wall `24 小时 / 天`; `天花板`
- S3: `纳瓦尔说`; `财富，是在你睡觉时` / `仍在为你赚钱的资产。`; `—— 意译自《纳瓦尔宝典》`
- S4–S7 formula bar: `专长`, `×`, `杠杆`, `×`, `判断力`, (S7) `= 财富`
- S4: `好奇心`, `专长`, `无法被培训`, `源于好奇心`
- S5: `需要许可`, `无需许可`, `劳动力`, `资本`, `代码`, `媒体`
- S6: `出卖时间`, `杠杆`, `与时间脱钩`
- S7: `长期游戏 · 复利`
- S8: `用头脑赚钱，` / `而不是用时间。`; `《纳瓦尔宝典》`; `书籍解读 · 样片`
- Subtitles: the `show` text of each narration line (`build/lines.json`).

## Facts (see FACTS.md)
All claims are Naval Ravikant ideas from *The Almanack of Naval Ravikant* (中文版《纳瓦尔宝典》); Chinese wording is our paraphrase, marked 意译. No page numbers, statistics or quotes beyond these.

## Look
- Paper `#F2ECE0` + seeded grain + soft vignette; ink `#22201C`; muted `#8C857A`; rule `#D6CCBA`; single accent vermilion `#C23B22` (= leverage / wealth throughout).
- Titles Noto Serif CJK SC Bold; labels/subtitles Noto Sans CJK SC. Titles ≥ 64 px, labels ≥ 28 px, subtitles 40 px.
- Subtitle band y ≈ 950–1020, never covers diagrams (diagrams stay above y = 900). 5 % safe margins.

## Structure (times derived from measured voice; 8 lines → 8 scenes)
| Scene | Line | Content |
|---|---|---|
| S1 hook | l01 | Clock spins hours, coins stack one per hour; title question |
| S2 linear | l02 | Clock flies to axis; graph; linear line; wall drops, line stops — 天花板 |
| S3 definition | l03 | Graph dims; quote typeset with moon |
| S4 专长 | l04 | Formula bar term 1; sprout grows from 好奇心 into 专长 node; two tags |
| S5 杠杆 | l05 | Term 2; four tiles: permissioned (grey, lock) vs permissionless (vermilion) |
| S6 脱钩 | l06 | Graph returns; vermilion curve passes the wall |
| S7 判断力 | l07 | Term 3 + `= 财富`; axes zoom out, curve compounds; tag |
| S8 end | l08 | Closing line + book card, 3 s hold |

## Must-haves
1. Duration 57–63 s, 1920×1080, 30 fps, audio stream present.
2. Linear line visibly stops at the wall in S2; vermilion curve crosses the wall's x in S6.
3. Formula bar lights one term per step S4→S5→S7, never re-ordered.
4. All Chinese glyphs render (no tofu); smallest text ≥ 28 px.
5. Each subtitle page ≥ 1.8 s; subtitles match narration.
6. Quote held ≥ characters/4.5 + 1.5 s.
7. Narration intelligible (Whisper transcript ≈ script).
