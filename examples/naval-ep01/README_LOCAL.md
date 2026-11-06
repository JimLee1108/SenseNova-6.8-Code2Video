# 《纳瓦尔宝典》Code2Video 本地运行指南

本项目完全支持在您的个人电脑（Windows / macOS / Linux）上本地独立运行，脱离云端限制，并可直接调用 **Edge-TTS 微软官方云希男声 (`zh-CN-YunxiNeural`)** 进行高保真短视频配音合成。

---

## 一、环境准备

确保本地已安装以下基础环境：
1. **Node.js** (v18 或更高版本)
2. **Python** (v3.10 或更高版本)
3. **FFmpeg** (需加入系统 PATH，用于音视频推流与封装)

---

## 二、本地安装与初始化

在项目根目录下打开终端：

### 1. 安装 Node.js 渲染引擎依赖
```bash
npm install canvas
```

### 2. 安装 Python 音频与 TTS 依赖
```bash
pip install edge-tts numpy scipy
```

---

## 三、一键运行全流程

### 步骤 1：本地生成 Edge-TTS 云希男声（支持 1.25x 爆款短视频快节奏）
```bash
python generate_yunxi_local.py
```
> 本地环境无代理阻拦，秒级直连微软官方 `zh-CN-YunxiNeural`，在 `build/audio_yunxi/` 下生成 8 段高清语音片段。

### 步骤 2：生成并混音背景配乐与音效（自动对齐与闪避）
```bash
python audio.py
```
> 全程基于纯数学函数程序化合成 BGM、Pad 铺底与音效，输出标准 `-14 LUFS` 母带音频 `build/master.wav`。

### 步骤 3：渲染 3Blue1Brown 风格 9:16 竖屏动画
```bash
node render_3b1b_vertical.mjs
```
> 渲染暗夜黑曜石网格、发光坐标轴、贝塞尔曲线跃迁及粒子碰撞冲击动画，帧序列输出至 `out/frames/`。

### 步骤 4：FFmpeg 封装为最终成片 MP4
```bash
ffmpeg -y -framerate 30 -i out/frames/frame_%05d.png -i build/master.wav \
  -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  final_yunxi_3b1b.mp4
```

---

## 四、核心文件索引

- **`render_3b1b_vertical.mjs`**：3Blue1Brown 竖屏动态渲染器（1080×1920，黑金发光+粒子动效）。
- **`render_vertical.mjs`**：纸质简约风格竖屏渲染器。
- **`render.mjs`**：16:9 横屏标准渲染器。
- **`generate_yunxi_local.py`**：微软 Edge-TTS 云希男声一键本地调用脚本。
- **`audio.py`**：纯代码生成高品质环境音效、BGM、自动侧链闪避（Ducking）与标准化母带。
- **`SPEC.md` / `STRUCTURE.md`**：爆款短视频脚本分镜、节奏黄金法则与视听对齐规范。
