# 《深度工作》(Deep Work) Code2Video 本地运行指南

本项目为卡尔·纽波特经典著作《深度工作》的 **3Blue1Brown 暗夜荧光 9:16 竖屏解读工程（19 句完整版）**，支持在您的本地电脑（Windows / macOS / Linux）一键调用微软官方 **Edge-TTS 云希男声 (`zh-CN-YunxiNeural`)** 并极速合成成片。

---

## 一、环境要求
1. **Node.js** (v18+)
2. **Python** (v3.10+)
3. **FFmpeg**（已加入系统 PATH）

---

## 二、本地 3 步生成云希男声成片

### 1. 安装依赖
```bash
npm install @napi-rs/canvas
pip install edge-tts numpy scipy
```

### 2. 生成微软官方云希男声 (`zh-CN-YunxiNeural`)
```bash
python generate_yunxi_local.py
```
> 将在 `build/audio_yunxi/` 下生成 `s01.mp3` ~ `s19.mp3`。

### 3. 合成母带与渲染 3B1B 竖屏视频
```bash
# 合成环境音效、深潜 Pad 配乐与 -14 LUFS 母带
python audio.py

# 使用原生 rawvideo 内存流极速渲染 1080×1920 竖屏成片
node render_3b1b_vertical.mjs
```
> 最终成片将保存在 `out/deep_work_ep01_3b1b.mp4`。
