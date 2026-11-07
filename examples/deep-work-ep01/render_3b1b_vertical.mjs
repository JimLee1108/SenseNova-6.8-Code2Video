// 《深度工作》(Deep Work) - 3Blue1Brown 暗黑荧光风格 (9:16, 1080x1920)
// 19 句完整版 (180.5s, 5415 帧)
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const W = 1080, H = 1920, FPS = 30;
const timeline = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8'));
const NFRAMES = timeline.TOTAL_FRAMES || 5415;
const DUR = timeline.DUR || 180.5;
const LINES = timeline.LINES;

// 3Blue1Brown Dark Glowing Palette
const C = {
  bg: '#080B10',
  grid: 'rgba(88, 166, 255, 0.06)',
  cardBg: 'rgba(18, 24, 38, 0.80)',
  cardBorder: 'rgba(88, 166, 255, 0.25)',
  white: '#FFFFFF',
  textMute: '#8B949E',
  rule: 'rgba(255, 255, 255, 0.15)',
  // Neon Accents
  neonRed: '#FF385C',
  neonRedCore: '#FFA3B5',
  neonCyan: '#00D4FF',
  neonCyanCore: '#A8F2FF',
  neonGold: '#FFD166',
  neonGoldCore: '#FFF1C2',
  neonGreen: '#06D6A0',
  neonGreenCore: '#A3FFE8',
};
const SANS = '"Noto Sans CJK SC", "Source Han Sans CN", sans-serif';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const ramp = (t, a, d) => clamp((t - a) / d);

function makeBackground() {
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = C.grid; g.lineWidth = 1;
  const step = 80;
  for (let x = 0; x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const rg = g.createRadialGradient(W / 2, H * 0.45, H * 0.1, W / 2, H * 0.5, H * 0.85);
  rg.addColorStop(0, 'rgba(0, 60, 120, 0.08)');
  rg.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return c;
}
const BG = makeBackground();

function drawGlowLine(g, pts, color, coreColor, width = 4, glowWidth = 18) {
  if (pts.length < 2) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = color; g.globalAlpha *= 0.25; g.lineWidth = glowWidth * 1.5;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.globalAlpha = g.globalAlpha / 0.25 * 0.6; g.lineWidth = glowWidth * 0.6;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.strokeStyle = coreColor; g.globalAlpha = g.globalAlpha / 0.6 * 1.0; g.lineWidth = width;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.restore();
}

function text(g, s, x, y, { size = 40, font = SANS, weight = '', color = C.white, align = 'center', alpha = 1, base = 'middle', glow = false } = {}) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${font}`.trim();
  g.textAlign = align; g.textBaseline = base;
  if (glow) {
    g.shadowColor = color; g.shadowBlur = size * 0.45;
  }
  g.fillStyle = color; g.fillText(s, x, y);
  g.restore();
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function drawCard(g, x, y, w, h, alpha = 1, borderColor = C.cardBorder) {
  if (alpha <= 0) return;
  g.save();
  g.globalAlpha *= alpha;
  rrect(g, x, y, w, h, 24);
  g.fillStyle = C.cardBg;
  g.shadowColor = 'rgba(0, 180, 255, 0.2)';
  g.shadowBlur = 25;
  g.fill();
  g.strokeStyle = borderColor;
  g.lineWidth = 2;
  g.stroke();
  g.restore();
}

function drawSubtitles(g, t) {
  let curLine = null;
  for (const line of LINES) {
    if (t >= line.start_s && t < line.end_s + 0.35) {
      curLine = line;
      break;
    }
  }
  if (!curLine) return;

  const relT = t - curLine.start_s;
  const lineDur = curLine.end_s - curLine.start_s;
  const chunkCount = curLine.chunks.length;
  const activeChunkIdx = clamp(Math.floor((relT / lineDur) * chunkCount), 0, chunkCount - 1);

  const boxY = 1660, boxH = 150, boxW = 960, boxX = (W - boxW) / 2;
  
  g.save();
  g.fillStyle = 'rgba(8, 12, 22, 0.88)';
  g.strokeStyle = 'rgba(88, 166, 255, 0.3)';
  g.lineWidth = 1.5;
  rrect(g, boxX, boxY, boxW, boxH, 28);
  g.fill(); g.stroke();
  g.restore();

  const primaryText = curLine.chunks[activeChunkIdx];
  text(g, primaryText, W / 2, boxY + 68, {
    size: 42,
    font: SANS,
    weight: 'bold',
    color: C.white,
    glow: true
  });

  if (chunkCount > 1) {
    const dotSpacing = 28;
    const startDotX = W / 2 - ((chunkCount - 1) * dotSpacing) / 2;
    for (let i = 0; i < chunkCount; i++) {
      g.save();
      const isActive = (i === activeChunkIdx);
      g.fillStyle = isActive ? C.neonCyanCore : 'rgba(255, 255, 255, 0.25)';
      if (isActive) {
        g.shadowColor = C.neonCyan;
        g.shadowBlur = 10;
      }
      g.beginPath();
      g.arc(startDotX + i * dotSpacing, boxY + 120, isActive ? 5 : 3.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
}

function drawScene(g, t) {
  let sIndex = 1;
  for (let i = 0; i < LINES.length; i++) {
    const nextStart = (i < LINES.length - 1) ? LINES[i+1].start_s : 9999;
    if (t >= LINES[i].start_s && t < nextStart) {
      sIndex = i + 1;
      break;
    }
  }

  text(g, 'CAL NEWPORT · DEEP WORK', W / 2, 180, {
    size: 24, font: SANS, weight: 'bold', color: 'rgba(88, 166, 255, 0.7)'
  });

  const relT = t - (LINES[sIndex - 1]?.start_s || 0);

  if (sIndex === 1) {
    // S01: 忙满 10 小时，筋疲力尽，核心成果 0
    drawCard(g, 100, 320, 880, 1180);
    text(g, '工位忙碌时长 vs 核心成果产出', W / 2, 430, { size: 42, color: C.neonCyanCore });

    // Hours gauge
    const hrs = Math.round(lerp(1, 10, ss(clamp(relT / 3.0))));
    text(g, `工位连轴转：${hrs}.0 小时`, W / 2, 620, { size: 64, weight: 'bold', color: C.neonRedCore, glow: true });

    // Energy bar draining
    const energy = lerp(100, 5, ss(clamp(relT / 5.0)));
    drawCard(g, 180, 760, 720, 120, 1, 'rgba(255,56,92,0.4)');
    g.save();
    rrect(g, 195, 775, Math.max(20, (energy / 100) * 690), 90, 16);
    g.fillStyle = C.neonRed; g.fill();
    g.restore();
    text(g, `大脑精力剩余：${Math.round(energy)}% (筋疲力尽)`, W / 2, 820, { size: 34, weight: 'bold', color: C.white });

    // Core output bar stuck at 2%
    drawCard(g, 180, 960, 720, 260, 1, 'rgba(139,148,158,0.3)');
    text(g, '今日真正核心成果产出：', W / 2, 1050, { size: 40, color: C.textMute });
    text(g, '≈ 0%', W / 2, 1150, { size: 72, weight: 'bold', color: C.neonGoldCore, glow: true });
  }
  else if (sIndex === 2) {
    // S02: 浮浅工作的黑洞
    drawCard(g, 100, 320, 880, 1180, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '🕳️ “浮浅工作”引力黑洞', W / 2, 430, { size: 48, weight: 'bold', color: C.neonRedCore, glow: true });

    // Swirling vortex rings
    const cx = W / 2, cy = 820;
    for (let r = 60; r <= 260; r += 50) {
      g.save();
      g.strokeStyle = C.neonRed;
      g.globalAlpha = 0.25 + (260 - r) / 400;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, cy, r, relT * 2 + r * 0.02, relT * 2 + r * 0.02 + Math.PI * 1.4);
      g.stroke();
      g.restore();
    }
    text(g, '💬 秒回群消息', cx - 220, cy - 160, { size: 36, color: C.white, glow: true });
    text(g, '📅 冗长无效会议', cx + 210, cy - 120, { size: 36, color: C.white, glow: true });
    text(g, '📊 琐碎机械填表', cx, cy + 200, { size: 36, color: C.white, glow: true });

    text(g, '看似忙得团团转 ➔ 实则认知原地踏步', W / 2, 1280, { size: 42, weight: 'bold', color: C.neonGoldCore, glow: true });
  }
  else if (sIndex === 3) {
    // S03: 卡尔·纽波特《深度工作》警告
    drawCard(g, 100, 320, 880, 1180);
    text(g, '卡尔·纽波特 (Cal Newport)', W / 2, 440, { size: 38, color: C.neonCyanCore });
    
    // Glowing Book Totem
    drawCard(g, 260, 520, 560, 420, 1, 'rgba(255, 209, 102, 0.6)');
    text(g, '《 深度工作 》', W / 2, 660, { size: 68, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, 'DEEP WORK', W / 2, 760, { size: 42, weight: 'bold', color: C.neonCyanCore, glow: true });
    text(g, '乔治城大学计算机教授经典著作', W / 2, 850, { size: 28, color: C.textMute });

    text(g, '⚠️ 核心警告：', W / 2, 1080, { size: 42, color: C.neonRedCore });
    text(g, '浮浅工作正在摧毁你的不可替代性', W / 2, 1180, { size: 46, weight: 'bold', color: C.white, glow: true });
  }
  else if (sIndex === 4) {
    // S04: 边刷手机边干的活，AI 第一批接管
    drawCard(g, 100, 320, 880, 1180);
    text(g, '低认知门槛 = 极高替代风险', W / 2, 430, { size: 44, color: C.neonRedCore, glow: true });

    drawCard(g, 160, 540, 760, 300, 1, 'rgba(139,148,158,0.3)');
    text(g, '📱 凡是边刷手机边能干完的活', W / 2, 640, { size: 42, weight: 'bold', color: C.white });
    text(g, '对大脑认知深度要求 ≈ 0', W / 2, 740, { size: 36, color: C.textMute });

    drawCard(g, 160, 900, 760, 440, 1, 'rgba(255, 56, 92, 0.5)');
    text(g, '🤖 AI 自动化大模型冲击波', W / 2, 1010, { size: 46, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, '不仅别人能轻易替代你', W / 2, 1110, { size: 38, color: C.white });
    text(g, '人工智能更会第一批接管你！', W / 2, 1210, { size: 44, weight: 'bold', color: C.neonGoldCore, glow: true });
  }
  else if (sIndex === 5) {
    // S05: 深度工作的定义
    drawCard(g, 100, 320, 880, 1180, 1, 'rgba(6, 214, 160, 0.5)');
    text(g, '真正拉开差距的分水岭：', W / 2, 430, { size: 38, color: C.neonCyanCore });
    text(g, '【 深度工作 · Deep Work 】', W / 2, 540, { size: 58, weight: 'bold', color: C.neonGreenCore, glow: true });

    const items = [
      ['1. 零干扰状态', '彻底屏蔽外部弹窗与碎片噪音', C.neonCyanCore],
      ['2. 挑战认知极限', '将大脑算力推向舒适区边缘', C.neonGoldCore],
      ['3. 创造高价值硬核资产', '提升独门技能 · 极难被复制', C.neonGreenCore]
    ];
    items.forEach(([title, sub, col], idx) => {
      const y = 720 + idx * 230;
      drawCard(g, 160, y - 60, 760, 180, 1, col);
      text(g, title, W / 2, y, { size: 42, weight: 'bold', color: col, glow: true });
      text(g, sub, W / 2, y + 65, { size: 32, color: C.white });
    });
  }
  else if (sIndex === 6) {
    // S06: 核心公式：高质量工作产出 = 时间 × 专注度
    drawCard(g, 100, 340, 880, 1140);
    text(g, '纽波特顶级产出定律', W / 2, 460, { size: 44, color: C.neonGoldCore, glow: true });

    drawCard(g, 140, 600, 800, 360, 1, 'rgba(0, 212, 255, 0.6)');
    text(g, '高质量工作产出', W / 2, 700, { size: 54, weight: 'bold', color: C.white });
    text(g, '＝', W / 2, 780, { size: 48, color: C.neonGold });
    text(g, '时间  ×  专注度', W / 2, 870, { size: 64, weight: 'bold', color: C.neonCyanCore, glow: true });

    text(g, '专注度越高 ➔ 单位时间复利越恐怖', W / 2, 1120, { size: 40, color: C.neonGreenCore, glow: true });
    text(g, 'High-Quality Work = Time × Intensity of Focus', W / 2, 1220, { size: 28, color: C.textMute });
  }
  else if (sIndex === 7) {
    // S07: 注意力残留 (Attention Residue)
    drawCard(g, 100, 320, 880, 1180);
    text(g, '大脑隐形杀手：注意力残留', W / 2, 430, { size: 48, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, 'Attention Residue (索菲·勒鲁瓦研究)', W / 2, 500, { size: 28, color: C.textMute });

    // Task A -> WeChat -> Task A diagram with red residue ghosting
    drawCard(g, 160, 600, 760, 220, 1, 'rgba(0, 212, 255, 0.4)');
    text(g, '任务 A：撰写核心方案', W / 2, 680, { size: 40, weight: 'bold', color: C.neonCyanCore });
    text(g, '⚡ 突然切屏看一眼微信消息', W / 2, 760, { size: 36, color: C.neonRedCore });

    drawCard(g, 160, 880, 760, 440, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '❌ 你以为：切回屏幕 = 注意力归位', W / 2, 990, { size: 38, color: C.textMute });
    text(g, '🧠 真相：你的大脑并没有立刻切回来！', W / 2, 1100, { size: 42, weight: 'bold', color: C.white, glow: true });
    text(g, '上一段碎片思绪仍在后台疯狂占用内存', W / 2, 1200, { size: 36, color: C.neonRedCore });
  }
  else if (sIndex === 8) {
    // S08: 打断 30 秒 = 滞留 20 分钟
    drawCard(g, 100, 320, 880, 1180);
    text(g, '30 秒打断 vs 20 分钟残留代价', W / 2, 430, { size: 44, weight: 'bold', color: C.neonGoldCore, glow: true });

    // Graph showing instant drop and 20-min recovery
    const ox = 200, oy = 1150, gx = 680, gy = 480;
    drawGlowLine(g, [[ox, oy], [ox + gx, oy]], C.neonCyan, C.neonCyanCore, 3, 8);
    drawGlowLine(g, [[ox, oy], [ox, oy - gy]], C.neonCyan, C.neonCyanCore, 3, 8);
    text(g, '认知算力', ox + 20, oy - gy - 35, { size: 28, color: C.neonCyan });
    text(g, '20 分钟恢复期 ➔', ox + gx - 120, oy + 45, { size: 28, color: C.neonRedCore });

    const curve = [
      [ox, oy - gy * 0.9],
      [ox + 100, oy - gy * 0.9],
      [ox + 120, oy - gy * 0.2], // 30s interruption drop!
      [ox + 350, oy - gy * 0.35],
      [ox + 650, oy - gy * 0.85]
    ];
    drawGlowLine(g, curve, C.neonRed, C.neonRedCore, 5, 16);
    text(g, '⚡ 仅被打断 30 秒', ox + 240, oy - gy * 0.15, { size: 34, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, '残留思绪滞留 20 分钟 · 实时智商暴跌', W / 2, 1340, { size: 40, weight: 'bold', color: C.white });
  }
  else if (sIndex === 9) {
    // S09: 一天看 20 次手机 = 全天脑雾
    drawCard(g, 100, 320, 880, 1180, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '全天候“脑雾状态” (Brain Fog)', W / 2, 430, { size: 46, weight: 'bold', color: C.neonRedCore, glow: true });

    // Sawtooth shattered timeline
    const ox = 160, oy = 900;
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const x = ox + i * 38;
      const y = (i % 2 === 0) ? oy - 120 : oy + 60;
      pts.push([x, y]);
    }
    drawGlowLine(g, pts, C.neonRed, C.neonRedCore, 4, 14);
    text(g, '一天看 20 次手机 = 20 次注意力碎裂', W / 2, 640, { size: 38, color: C.white });
    text(g, '大脑永远无法进入深度区', W / 2, 1080, { size: 44, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '哪怕坐满 12 小时，有效产出也趋近于 0', W / 2, 1200, { size: 38, color: C.white });
  }
  else if (sIndex === 10) {
    // S10: 髓鞘质 (Myelin) 神经科学
    drawCard(g, 100, 320, 880, 1180, 1, 'rgba(6, 214, 160, 0.5)');
    text(g, '深度专注的脑科学机制：髓鞘质', W / 2, 430, { size: 44, weight: 'bold', color: C.neonGreenCore, glow: true });

    // Neuron axon wrapped in glowing golden Myelin sheaths
    const yMid = 820;
    drawGlowLine(g, [[180, yMid], [900, yMid]], C.neonCyan, C.white, 8, 24);
    for (let i = 0; i < 4; i++) {
      const bx = 260 + i * 150;
      g.save();
      rrect(g, bx, yMid - 45, 110, 90, 28);
      g.fillStyle = 'rgba(255, 209, 102, 0.28)';
      g.strokeStyle = C.neonGold; g.lineWidth = 4;
      g.shadowColor = C.neonGold; g.shadowBlur = 20;
      g.fill(); g.stroke();
      g.restore();
    }
    text(g, '连续 2 小时零打断深度专注', W / 2, 620, { size: 42, color: C.white });
    text(g, '神经元轴突加速包裹“髓鞘质”绝缘层', W / 2, 1040, { size: 40, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, 'Myelin Sheath · 高性能认知回路', W / 2, 1140, { size: 32, color: C.textMute });
  }
  else if (sIndex === 11) {
    // S11: 泥泞小路升级为光纤高速路，百倍传导
    drawCard(g, 100, 320, 880, 1180);
    text(g, '认知带宽 100 倍跃迁', W / 2, 430, { size: 48, weight: 'bold', color: C.neonCyanCore, glow: true });

    drawCard(g, 160, 550, 760, 240, 1, 'rgba(139,148,158,0.3)');
    text(g, '普通人浅层思考：泥泞土路', W / 2, 630, { size: 38, color: C.textMute });
    text(g, '信号漏电 · 卡顿迟缓 · 三天啃不下硬骨头', W / 2, 710, { size: 32, color: 'rgba(255,255,255,0.6)' });

    drawCard(g, 160, 850, 760, 480, 1, 'rgba(0, 212, 255, 0.6)');
    text(g, '⚡ 深度工作回路：光纤超导高速路', W / 2, 960, { size: 42, weight: 'bold', color: C.neonCyanCore, glow: true });
    drawGlowLine(g, [[220, 1060], [860, 1060]], C.neonCyan, C.white, 8, 28);
    text(g, '别人三天的难题 ➔ 你 2 小时直接打穿！', W / 2, 1190, { size: 42, weight: 'bold', color: C.neonGoldCore, glow: true });
  }
  else if (sIndex === 12) {
    // S12: 夺回深度工作的 4 步实战法则
    drawCard(g, 100, 320, 880, 1180);
    text(g, '如何夺回深度工作的能力？', W / 2, 430, { size: 46, weight: 'bold', color: C.white, glow: true });
    text(g, '《深度工作》四大实战法则', W / 2, 520, { size: 38, color: C.neonGoldCore });

    const rules = [
      ['法则 01', '建立节奏哲学 · 90分钟物理断网舱', C.neonCyanCore],
      ['法则 02', '主动拥抱无聊 · 戒断廉价多巴胺', C.neonGreenCore],
      ['法则 03', '二八法则断舍离 · 剔除低价值工具', C.neonGoldCore],
      ['法则 04', '彻底抽干浮浅 · 设定铁律停工时间', C.neonRedCore]
    ];
    rules.forEach(([num, desc, col], idx) => {
      const y = 660 + idx * 195;
      drawCard(g, 160, y - 55, 760, 150, 1, col);
      text(g, `${num}｜${desc}`, W / 2, y + 20, { size: 36, weight: 'bold', color: col, glow: true });
    });
  }
  else if (sIndex === 13) {
    // S13: 法则一：建立节奏哲学 (90分钟断网舱)
    drawCard(g, 100, 320, 880, 1180, 1, 'rgba(0, 212, 255, 0.5)');
    text(g, '法则一：建立节奏哲学 (Rhythmic)', W / 2, 430, { size: 42, weight: 'bold', color: C.neonCyanCore, glow: true });
    text(g, '不要等有灵感才开始！', W / 2, 540, { size: 40, color: C.neonRedCore });

    // 90 min pod
    drawCard(g, 160, 640, 760, 380, 1, 'rgba(6, 214, 160, 0.5)');
    text(g, '🛡️ 每天固定 90 分钟物理断网舱', W / 2, 750, { size: 44, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, '手机锁进抽屉 · 关掉一切通知 · 固定时间启动', W / 2, 850, { size: 34, color: C.white });
    text(g, '☑ ☑ ☑ ☑ ☑ ☑ ☑ (连续习惯链条)', W / 2, 940, { size: 38, color: C.neonGoldCore });

    text(g, '把深度专注变成像刷牙一样的生理本能', W / 2, 1180, { size: 40, weight: 'bold', color: C.white });
  }
  else if (sIndex === 14) {
    // S14: 法则二：主动拥抱无聊
    drawCard(g, 100, 320, 880, 1180);
    text(g, '法则二：主动拥抱无聊', W / 2, 430, { size: 46, weight: 'bold', color: C.neonGoldCore, glow: true });

    drawCard(g, 160, 550, 760, 300, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '🚫 排队、等电梯时绝不掏出手机', W / 2, 650, { size: 42, weight: 'bold', color: C.neonRedCore });
    text(g, '连 5 分钟无聊都忍不了 = 大脑专注肌肉萎缩', W / 2, 750, { size: 34, color: C.white });

    drawCard(g, 160, 920, 760, 420, 1, 'rgba(6, 214, 160, 0.5)');
    text(g, '🧘‍♂️ 给大脑留出“无刺激留白”', W / 2, 1040, { size: 44, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, '戒断廉价多巴胺投喂', W / 2, 1140, { size: 38, color: C.white });
    text(g, '重建耐受高强度深度思考的定力', W / 2, 1230, { size: 38, color: C.neonCyanCore });
  }
  else if (sIndex === 15) {
    // S15: 法则三：二八法则断舍离社交媒体
    drawCard(g, 100, 320, 880, 1180);
    text(g, '法则三：二八法则工具断舍离', W / 2, 430, { size: 44, weight: 'bold', color: C.neonCyanCore, glow: true });

    // 80/20 visual bar
    drawCard(g, 160, 560, 760, 320, 1, 'rgba(255, 209, 102, 0.5)');
    text(g, '🎯 帕累托 80 / 20 筛选铁律', W / 2, 650, { size: 42, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '只保留能带来 80% 核心成长复利的 20% 工具', W / 2, 760, { size: 34, color: C.white });

    drawCard(g, 160, 950, 760, 380, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '🔕 其余热闹却消耗心智的信息流', W / 2, 1060, { size: 40, color: C.neonRedCore });
    text(g, '果断静音 · 取关 · 彻底卸载！', W / 2, 1180, { size: 48, weight: 'bold', color: C.white, glow: true });
  }
  else if (sIndex === 16) {
    // S16: 法则四：彻底抽干浮浅工作 + 铁律停工
    drawCard(g, 100, 320, 880, 1180);
    text(g, '法则四：彻底抽干浮浅工作', W / 2, 430, { size: 46, weight: 'bold', color: C.neonGreenCore, glow: true });

    drawCard(g, 160, 560, 760, 340, 1, 'rgba(0, 212, 255, 0.4)');
    text(g, '📦 琐事压缩批处理 (Batching)', W / 2, 660, { size: 42, weight: 'bold', color: C.neonCyanCore });
    text(g, '回邮件、填表、短会压缩进固定 30 分钟', W / 2, 760, { size: 36, color: C.white });
    text(g, '绝不允许琐事蔓延侵占全天！', W / 2, 830, { size: 32, color: C.textMute });

    drawCard(g, 160, 960, 760, 380, 1, 'rgba(255, 209, 102, 0.5)');
    text(g, '🕔 设定铁律停工时间 (如 18:00)', W / 2, 1080, { size: 44, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '倒逼白天的极致专注 · 拒绝虚假疲劳加班', W / 2, 1190, { size: 36, color: C.white });
  }
  else if (sIndex === 17) {
    // S17: 顶级高手的日程表：4小时深潜 + 彻底恢复
    drawCard(g, 100, 320, 880, 1180);
    text(g, '普通人 vs 顶级高手日程表', W / 2, 430, { size: 44, weight: 'bold', color: C.white });

    // Left vs Right comparison
    drawCard(g, 140, 540, 380, 780, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '❌ 碎片化忙碌', 330, 620, { size: 36, weight: 'bold', color: C.neonRedCore });
    text(g, '12 小时切碎成', 330, 740, { size: 32, color: C.white });
    text(g, '50 个通知微任务', 330, 810, { size: 32, color: C.white });
    text(g, '深夜焦虑疲惫', 330, 960, { size: 34, color: C.textMute });
    text(g, '核心产出 = 0', 330, 1120, { size: 40, weight: 'bold', color: C.neonRedCore });

    drawCard(g, 560, 540, 380, 780, 1, 'rgba(6, 214, 160, 0.6)');
    text(g, '✅ 深度工作高手', 750, 620, { size: 36, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, '4 小时雷打不动', 750, 740, { size: 34, color: C.white });
    text(g, '零打扰极致深潜', 750, 810, { size: 36, weight: 'bold', color: C.neonCyanCore });
    text(g, '➕ 彻底停工恢复', 750, 960, { size: 34, color: C.neonGoldCore });
    text(g, '产出放大 10 倍', 750, 1120, { size: 40, weight: 'bold', color: C.neonGreenCore, glow: true });
  }
  else if (sIndex === 18) {
    // S18: 未来世界的两类人分化
    drawCard(g, 100, 320, 880, 1180);
    text(g, '未来经济残酷的两极分化', W / 2, 430, { size: 46, weight: 'bold', color: C.neonGoldCore, glow: true });

    const ox = 200, oy = 1100;
    // Diverging curves
    const upPts = [], downPts = [];
    for (let x = 0; x <= 620; x += 20) {
      const u = x / 620;
      upPts.push([ox + x, oy - Math.pow(u, 2.4) * 440]);
      downPts.push([ox + x, oy + Math.pow(u, 1.5) * 180]);
    }
    drawGlowLine(g, upPts, C.neonGreen, C.neonGreenCore, 6, 20);
    drawGlowLine(g, downPts, C.neonRed, C.neonRedCore, 5, 14);

    text(g, '🚀 驾驭深度专注的少数精英', ox + 360, oy - 460, { size: 38, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, '📉 被算法与通知驯化的注意力奴隶', ox + 360, oy + 240, { size: 36, color: C.neonRedCore });
  }
  else if (sIndex === 19) {
    // S19: 终极金句：专注是信息过载时代最稀缺的超能力
    drawCard(g, 100, 320, 880, 1180, 1, 'rgba(255, 209, 102, 0.6)');
    text(g, '《深度工作》行动宣言', W / 2, 440, { size: 42, color: C.neonGoldCore });

    text(g, '1. 关掉弹窗 · 斩断浮浅黑洞', W / 2, 580, { size: 42, weight: 'bold', color: C.white });
    text(g, '2. 消除注意力残留 · 包裹髓鞘质', W / 2, 700, { size: 42, weight: 'bold', color: C.neonCyanCore, glow: true });
    text(g, '3. 每天留出 2 小时无人打扰的深潜时光', W / 2, 820, { size: 42, weight: 'bold', color: C.neonGreenCore, glow: true });

    drawCard(g, 140, 960, 800, 260, 1, 'rgba(255, 209, 102, 0.8)');
    text(g, '【 深度专注 】', W / 2, 1045, { size: 64, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '信息过载时代最稀缺的超能力', W / 2, 1145, { size: 44, weight: 'bold', color: C.white, glow: true });

    text(g, 'Deep Work: The Superpower of the 21st Century', W / 2, 1340, { size: 30, color: C.textMute });
  }
}

async function renderAll() {
  const outDir = 'out';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const finalVideo = 'out/deep_work_ep01_3b1b.mp4';
  console.log(`🎬 Rendering Deep Work: ${NFRAMES} frames (${DUR}s at ${FPS}fps) in 3B1B vertical style...`);

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${W}x${H}`,
    '-r', String(FPS),
    '-i', '-',
    '-i', 'build/master.wav',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'veryfast',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-movflags', '+faststart',
    finalVideo
  ]);

  ffmpeg.stderr.on('data', data => {
    const s = data.toString();
    if (s.includes('fps=') || s.includes('frame=')) {
      process.stdout.write(`\r${s.trim().slice(-60)}`);
    }
  });

  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');

  for (let f = 0; f < NFRAMES; f++) {
    const t = f / FPS;
    g.drawImage(BG, 0, 0);
    drawScene(g, t);
    drawSubtitles(g, t);

    const imgData = g.getImageData(0, 0, W, H).data;
    const buf = Buffer.from(imgData.buffer, imgData.byteOffset, imgData.byteLength);
    const ok = ffmpeg.stdin.write(buf);
    if (!ok) {
      await new Promise(r => ffmpeg.stdin.once('drain', r));
    }

    if (f % 300 === 0 || f === NFRAMES - 1) {
      const pct = ((f / NFRAMES) * 100).toFixed(1);
      console.log(`Frame ${f}/${NFRAMES} (${pct}%) t=${t.toFixed(1)}s`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  console.log(`\n🎉 Rendering complete! Final video saved to ${finalVideo}`);
}

renderAll().catch(err => {
  console.error('Rendering error:', err);
  process.exit(1);
});
