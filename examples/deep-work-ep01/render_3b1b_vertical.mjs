// 《深度工作》(Deep Work) - 纯正 3Blue1Brown 连续几何与物理模拟画布 (9:16, 1080x1920)
// ZERO PPT Cards! Every frame is computed from real mathematical curves, integral areas, neural physics, and continuous state transformations.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const W = 1080, H = 1920, FPS = 30;
const timeline = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8'));
const NFRAMES = timeline.TOTAL_FRAMES || 5415;
const DUR = timeline.DUR || 180.5;
const LINES = timeline.LINES;
const S = LINES.map(l => l.start_s);
const E = LINES.map(l => l.end_s);

// 3Blue1Brown Strict Semantic Color Code (One color = One physical quantity throughout the film)
const C = {
  bg: '#06080E',
  gridMajor: 'rgba(72, 138, 220, 0.09)',
  gridMinor: 'rgba(72, 138, 220, 0.035)',
  white: '#F4F8FC',
  mute: '#6E7E94',
  // 1. Cyan = Cognitive Focus / Neural Signal
  cyan: '#00D4FF',
  cyanCore: '#B8F4FF',
  // 2. Red = Distraction / Shallow Interruption / Attention Residue
  red: '#FF3355',
  redCore: '#FFA8B8',
  // 3. Gold = Myelin Sheath / Compounding High-Value Output
  gold: '#FFC845',
  goldCore: '#FFF2B8',
  // 4. Emerald = Deep Work Shield / Uninterrupted State
  green: '#06D6A0',
  greenCore: '#ADFFEA',
};
const SANS = '"Noto Sans CJK SC", "Source Han Sans CN", sans-serif';
const SERIF = '"Noto Serif CJK SC", "Source Han Serif CN", serif';

// Math & Easing
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const eio = u => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const ramp = (t, a, d) => clamp((t - a) / d);
const win = (t, a, b, fi = 0.5, fo = 0.5) => {
  if (t < a || t > b) return 0;
  return Math.min(ss((t - a) / fi), 1 - ss((t - (b - fo)) / fo));
};

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Pre-render pure 3B1B mathematical coordinate space
function makeBackground() {
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  // Minor grid (30px)
  g.strokeStyle = C.gridMinor; g.lineWidth = 1;
  for (let x = 0; x < W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // Major grid (120px)
  g.strokeStyle = C.gridMajor; g.lineWidth = 1.2;
  for (let x = 60; x < W; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 120; y < H; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // Subtle optical vignette
  const rg = g.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.5, H * 0.85);
  rg.addColorStop(0, 'rgba(0, 40, 90, 0.05)');
  rg.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return c;
}
const BG = makeBackground();

// Glowing vector curve renderer
function drawGlowLine(g, pts, color, coreColor, width = 4, glowWidth = 16, alpha = 1) {
  if (pts.length < 2 || alpha <= 0) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = color; g.globalAlpha = alpha * 0.25; g.lineWidth = glowWidth * 1.4;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.globalAlpha = alpha * 0.6; g.lineWidth = glowWidth * 0.55;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.strokeStyle = coreColor; g.globalAlpha = alpha; g.lineWidth = width;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.restore();
}

function drawGlowCircle(g, x, y, r, color, coreColor, alpha = 1, fill = false) {
  if (alpha <= 0 || r <= 0) return;
  g.save();
  g.globalAlpha = alpha;
  g.shadowColor = color; g.shadowBlur = 22;
  g.strokeStyle = coreColor; g.lineWidth = 3.5;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = color; g.fill(); }
  g.stroke();
  g.restore();
}

function text(g, s, x, y, { size = 38, font = SANS, weight = '', color = C.white, align = 'center', alpha = 1, base = 'middle', glow = false } = {}) {
  if (alpha <= 0) return;
  g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${font}`.trim();
  g.textAlign = align; g.textBaseline = base;
  if (glow) { g.shadowColor = color; g.shadowBlur = size * 0.45; }
  g.fillStyle = color; g.fillText(s, x, y);
  g.restore();
}

// Persistent distraction particles for Act 1
const rnd1 = mulberry32(101);
const DISTRACT_PARTICLES = Array.from({ length: 36 }, (_, i) => ({
  angle0: (i / 36) * Math.PI * 2 + rnd1() * 0.5,
  dist0: 160 + rnd1() * 280,
  speed: 0.9 + rnd1() * 1.4,
  size: 5 + rnd1() * 7,
  type: i % 3 // 0: chat red dot, 1: calendar square, 2: sheet triangle
}));

// Persistent Neuron Dendrite branches for Act 2/3
const rnd2 = mulberry32(202);
const DENDRITES_LEFT = Array.from({ length: 8 }, (_, i) => {
  const ang = ((i / 7) - 0.5) * Math.PI * 0.9 + Math.PI;
  return { ang, len: 70 + rnd2() * 55 };
});
const DENDRITES_RIGHT = Array.from({ length: 8 }, (_, i) => {
  const ang = ((i / 7) - 0.5) * Math.PI * 0.9;
  return { ang, len: 70 + rnd2() * 55 };
});

// ============================================================================
// ACT 1 (S01 - S04, 0s - 34.4s):
// Persistent Example: Central Cognitive Core at (540, 820) vs Shallow Work Vortex
// ============================================================================
function drawAct1(g, t) {
  const a = win(t, 0, S[4] + 0.4, 0.4, 0.8);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;

  const cx = W / 2, cy = 800;

  // Title banner
  text(g, 'COGNITIVE DYNAMICS · 认知动力学模型', cx, 230, { size: 28, color: C.mute, weight: 'bold' });

  // S01 (0 - 8.3s): 10-hour orbital clock ring spinning while core output stays ~0
  const uS1 = ramp(t, S[0], 6.5);
  const hours = lerp(0, 10, ss(uS1));
  const ringR = 290;

  // Outer time track
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 8;
  g.beginPath(); g.arc(cx, cy, ringR, 0, Math.PI * 2); g.stroke();

  // Sweeping red fatigue arc
  const sweepEnd = -Math.PI / 2 + (hours / 10) * Math.PI * 2;
  g.save();
  g.strokeStyle = C.red; g.lineWidth = 10; g.lineCap = 'round';
  g.shadowColor = C.red; g.shadowBlur = 20;
  g.beginPath(); g.arc(cx, cy, ringR, -Math.PI / 2, sweepEnd); g.stroke();
  g.restore();

  // Hour ticks around the ring
  for (let h = 0; h < 10; h++) {
    const ang = -Math.PI / 2 + (h / 10) * Math.PI * 2;
    const active = hours >= h + 0.5;
    const tx = cx + Math.cos(ang) * (ringR + 36);
    const ty = cy + Math.sin(ang) * (ringR + 36);
    text(g, `${h + 1}h`, tx, ty, { size: 26, color: active ? C.redCore : C.mute, weight: 'bold' });
  }

  // S02 (8.5 - 17.2s): Shallow Work Gravity Well pulling 36 distraction particles into the core
  const uVortex = ss(ramp(t, S[1] - 0.3, 1.5));
  if (uVortex > 0) {
    // Logarithmic spiral field lines
    for (let arm = 0; arm < 4; arm++) {
      const pts = [];
      for (let s = 0; s <= 60; s++) {
        const u = s / 60;
        const r = lerp(45, ringR * 0.92, u);
        const theta = arm * (Math.PI / 2) + u * 4.5 - t * 2.2;
        pts.push([cx + Math.cos(theta) * r, cy + Math.sin(theta) * r]);
      }
      drawGlowLine(g, pts, C.red, C.redCore, 2, 10, uVortex * 0.55);
    }

    // Orbiting / spiraling distraction particles (messages, meetings, spreadsheets)
    DISTRACT_PARTICLES.forEach(p => {
      const cycle = ((t * p.speed * 0.35 + p.angle0) % 1);
      const r = lerp(ringR * 0.9, 48, cycle) * uVortex + (1 - uVortex) * p.dist0;
      const ang = p.angle0 + t * p.speed * 1.8 + (1 - cycle) * 3.0;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      g.save();
      g.globalAlpha *= uVortex * Math.sin(cycle * Math.PI);
      g.fillStyle = p.type === 0 ? C.redCore : (p.type === 1 ? C.goldCore : C.cyanCore);
      g.shadowColor = C.red; g.shadowBlur = 12;
      g.beginPath(); g.arc(px, py, p.size, 0, Math.PI * 2); g.fill();
      g.restore();
    });

    // Floating labels next to the vortex (no boxes!)
    const aL2 = win(t, S[1] + 0.5, E[2], 0.5, 0.5);
    text(g, '群消息红点', cx - 310, cy - 340, { size: 32, color: C.redCore, alpha: aL2, glow: true });
    text(g, '冗长会议', cx + 310, cy - 340, { size: 32, color: C.goldCore, alpha: aL2, glow: true });
    text(g, '琐碎填表', cx, cy + 375, { size: 32, color: C.cyanCore, alpha: aL2, glow: true });
  }

  // Central Cognitive Core (shrinking under shallow work overload)
  const coreRadius = lerp(75, 22, uVortex) + Math.sin(t * 6) * 3;
  drawGlowCircle(g, cx, cy, coreRadius, C.cyan, C.cyanCore, 1, true);
  text(g, '核心产出 ≈ 1.8%', cx, cy - coreRadius - 35, {
    size: 32, weight: 'bold', color: C.cyanCore, glow: true,
    alpha: win(t, 1.5, E[1], 0.5, 0.5)
  });

  // S03 & S04 (17.2 - 34.0s): Bottom Real-time Cognitive Depth Spectrum + AI Replacement Threshold
  const uSpec = ss(ramp(t, S[2], 1.0));
  if (uSpec > 0) {
    const ox = 140, oy = 1470, gw = 800, gh = 240;
    // Axes
    drawGlowLine(g, [[ox, oy], [ox + gw, oy]], C.cyan, C.cyanCore, 3, 10, uSpec);
    drawGlowLine(g, [[ox, oy], [ox, oy - gh]], C.cyan, C.cyanCore, 3, 10, uSpec);
    text(g, '认知深度 (Cognitive Depth)', ox + 175, oy - gh - 28, { size: 28, color: C.cyanCore, alpha: uSpec });

    // Shallow jittery low-amplitude wave (hugging the bottom)
    const wavePts = [];
    for (let i = 0; i <= 100; i++) {
      const u = i / 100;
      const x = ox + u * gw;
      const y = oy - 28 - Math.sin(u * 25 + t * 8) * 14 - Math.cos(u * 43 - t * 5) * 8;
      wavePts.push([x, y]);
    }
    drawGlowLine(g, wavePts, C.red, C.redCore, 3.5, 12, uSpec);
    text(g, '浮浅工作区 (低认知要求)', ox + gw - 180, oy - 65, { size: 28, color: C.redCore, alpha: uSpec });

    // S04: AI Laser Threshold sweeping across and consuming the shallow zone
    const uAI = ss(ramp(t, S[3], 1.8));
    if (uAI > 0) {
      const scanX = ox + uAI * gw;
      const threshY = oy - 115;
      // Red shaded replacement zone
      g.save();
      g.fillStyle = 'rgba(255, 51, 85, 0.18)';
      g.fillRect(ox, threshY, scanX - ox, oy - threshY);
      g.restore();
      drawGlowLine(g, [[ox, threshY], [scanX, threshY]], C.gold, C.goldCore, 3, 12, uAI);
      drawGlowLine(g, [[scanX, oy - gh], [scanX, oy]], C.red, C.white, 4, 18, uAI);
      text(g, '🤖 AI 自动化接管阈值线', ox + 210, threshY - 26, { size: 30, weight: 'bold', color: C.goldCore, alpha: uAI, glow: true });
    }
  }

  g.restore();
}

// ============================================================================
// ACT 2 (S05 - S09, 34.4s - 79.8s):
// Persistent Example: Mathematical Coordinate Plane of Focus Intensity I(t)
// and Integral Area ∫ I(t) dt, plus Attention Residue e^(-λt) decay!
// ============================================================================
function drawAct2(g, t) {
  const a = win(t, S[4] - 0.3, S[9] + 0.3, 0.6, 0.6);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;

  // Formula Header (S05 - S06)
  const uFormula = ss(ramp(t, S[5] - 0.2, 1.0));
  text(g, '高质量工作产出 ＝ ∫ 专注度(t) dt ＝ 时间 × 专注度', W / 2, 260, {
    size: 38, weight: 'bold', color: C.goldCore, glow: true, alpha: Math.max(0.35, uFormula)
  });

  // Main Coordinate System: X = Time (0 to 12h), Y = Focus Intensity (0 to 100%)
  const ox = 150, oy = 960, gw = 780, gh = 520;
  drawGlowLine(g, [[ox, oy], [ox + gw + 30, oy]], C.cyan, C.cyanCore, 3.5, 12);
  drawGlowLine(g, [[ox, oy], [ox, oy - gh - 20]], C.cyan, C.cyanCore, 3.5, 12);
  text(g, '专注度 I(t)', ox + 20, oy - gh - 50, { size: 32, weight: 'bold', color: C.cyanCore, glow: true });
  text(g, '时间 t', ox + gw + 45, oy + 5, { size: 32, weight: 'bold', color: C.cyanCore, align: 'left' });

  // Deep Work Threshold Line at 75% height
  const deepY = oy - gh * 0.75;
  g.save();
  g.setLineDash([10, 10]);
  g.strokeStyle = 'rgba(6, 214, 160, 0.45)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(ox, deepY); g.lineTo(ox + gw, deepY); g.stroke();
  g.restore();
  text(g, '深度工作临界阈值 (75%)', ox + gw - 160, deepY - 22, { size: 26, color: C.greenCore });

  // S05 - S06 (34.4s - 50.0s): Show pure Deep Work Curve & Golden Integral Area
  if (t < S[6]) {
    const uDraw = ss(ramp(t, S[4] + 0.3, 4.0));
    const pts = [];
    const N = 120;
    const maxI = Math.floor(uDraw * N);
    for (let i = 0; i <= maxI; i++) {
      const u = i / N;
      const x = ox + u * gw;
      // Smooth logistic ramp into deep focus plateau (92%)
      const intensity = 0.92 / (1 + Math.exp(-(u - 0.12) * 28));
      const y = oy - intensity * gh;
      pts.push([x, y]);
    }
    if (pts.length > 1) {
      // Fill integral area under curve
      g.save();
      g.beginPath();
      g.moveTo(ox, oy);
      pts.forEach(([x, y]) => g.lineTo(x, y));
      g.lineTo(pts[pts.length - 1][0], oy);
      g.closePath();
      const grad = g.createLinearGradient(0, oy - gh, 0, oy);
      grad.addColorStop(0, 'rgba(6, 214, 160, 0.42)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0.05)');
      g.fillStyle = grad; g.fill();
      g.restore();

      drawGlowLine(g, pts, C.green, C.greenCore, 5, 18);
      text(g, '零干扰深潜积分面积 ＝ 高价值不可替代成果', W / 2, oy - gh * 0.38, {
        size: 34, weight: 'bold', color: C.goldCore, glow: true, alpha: ss(ramp(t, S[4] + 2.0, 1.0))
      });
    }
  }
  // S07 - S08 (50.3s - 70.8s): Attention Residue Mechanism!
  // 30-second interruption at u=0.28 causes immediate crash and 20-minute exponential lag
  else if (t < S[8]) {
    const uInterrupt = ss(ramp(t, S[6] + 0.5, 4.5));
    const pts = [];
    const residuePts = [];
    const N = 140;
    const maxI = Math.floor(uInterrupt * N);
    const hitU = 0.28;

    for (let i = 0; i <= maxI; i++) {
      const u = i / N;
      const x = ox + u * gw;
      let intensity = 0;
      if (u < hitU) {
        intensity = 0.90 / (1 + Math.exp(-(u - 0.08) * 35));
      } else {
        // Sudden drop to 0.15 due to WeChat switch, then slow 20-min recovery
        const du = u - hitU;
        intensity = 0.15 + 0.72 * (1 - Math.exp(-du * 3.2));
        // Attention Residue decaying from Task A
        const res = 0.78 * Math.exp(-du * 3.5);
        residuePts.push([x, oy - res * gh]);
      }
      pts.push([x, oy - intensity * gh]);
    }

    // Shade red Attention Residue penalty area
    if (residuePts.length > 1) {
      g.save();
      g.beginPath();
      const hitX = ox + hitU * gw;
      g.moveTo(hitX, oy - 0.90 * gh);
      pts.filter(p => p[0] >= hitX).forEach(([x, y]) => g.lineTo(x, y));
      g.lineTo(pts[pts.length - 1][0], oy - 0.90 * gh);
      g.closePath();
      g.fillStyle = 'rgba(255, 51, 85, 0.24)';
      g.fill();
      g.restore();

      drawGlowLine(g, residuePts, C.red, C.redCore, 3.5, 14, 0.85);
      text(g, '注意力残留区 (滞留 20 分钟 · 算力折损)', ox + gw * 0.62, oy - gh * 0.62, {
        size: 32, weight: 'bold', color: C.redCore, glow: true
      });
    }

    drawGlowLine(g, pts, C.cyan, C.cyanCore, 5, 16);

    // Lightning strike marker at u = hitU
    if (uInterrupt >= hitU) {
      const hx = ox + hitU * gw;
      drawGlowLine(g, [[hx, oy - gh], [hx, oy]], C.red, C.white, 3, 14);
      drawGlowCircle(g, hx, oy - 0.15 * gh, 10, C.red, C.white, 1, true);
      text(g, '⚡ 切屏看消息 (仅 30 秒)', hx + 20, oy - gh + 30, {
        size: 32, weight: 'bold', color: C.redCore, align: 'left', glow: true
      });
    }
  }
  // S09 (71.0s - 79.8s): 20 Phone Checks = Sawtooth Wave Never Crossing Deep Threshold!
  else {
    const uSaw = ss(ramp(t, S[8], 3.5));
    const pts = [];
    const N = 200;
    const maxI = Math.floor(uSaw * N);
    for (let i = 0; i <= maxI; i++) {
      const u = i / N;
      const x = ox + u * gw;
      // 20 interruptions across 12 hours -> sawtooth wave capped at 32%
      const phase = (u * 20) % 1;
      const intensity = 0.08 + 0.26 * (1 - Math.exp(-phase * 3.0));
      pts.push([x, oy - intensity * gh]);
    }
    drawGlowLine(g, pts, C.red, C.redCore, 4, 14);
    text(g, '一天看 20 次手机 ➔ 锯齿状“脑雾波形”永远无法触及深度线', W / 2, oy - gh * 0.52, {
      size: 34, weight: 'bold', color: C.redCore, glow: true
    });
    text(g, '有效深度产出面积 ＝ 0', W / 2, oy - gh * 0.40, {
      size: 46, weight: 'bold', color: C.goldCore, glow: true
    });
  }

  // Bottom Neural Channel Visualization (Task A vs Task B crosstalk)
  const ny = 1280;
  text(g, '大脑神经算力分配实时监测', W / 2, ny - 120, { size: 30, color: C.mute });
  const isInterrupted = t >= S[6];
  const residueRatio = isInterrupted ? lerp(0.68, 0.35, Math.sin(t * 3) * 0.5 + 0.5) : 0.0;
  const focusRatio = 1 - residueRatio;

  // Continuous bar without card border
  const barW = 760, barX = (W - barW) / 2;
  g.fillStyle = C.cyan;
  g.shadowColor = C.cyan; g.shadowBlur = 18;
  g.fillRect(barX, ny - 40, barW * focusRatio, 36);
  if (residueRatio > 0) {
    g.fillStyle = C.red;
    g.shadowColor = C.red; g.shadowBlur = 18;
    g.fillRect(barX + barW * focusRatio, ny - 40, barW * residueRatio, 36);
  }
  g.shadowBlur = 0;
  text(g, `当前任务有效算力: ${Math.round(focusRatio * 100)}%`, barX + 10, ny + 30, { size: 30, color: C.cyanCore, align: 'left' });
  if (residueRatio > 0) {
    text(g, `注意力残留损耗: ${Math.round(residueRatio * 100)}%`, barX + barW - 10, ny + 30, { size: 30, color: C.redCore, align: 'right' });
  }

  g.restore();
}

// ============================================================================
// ACT 3 (S10 - S11, 79.8s - 98.2s):
// Persistent Example: Biophysical Neuron Axon + Myelin Sheath Wrapping
// & Action Potential Propagation Velocity (1x Leaky vs 100x Saltatory Fiber Optic)
// ============================================================================
function drawAct3(g, t) {
  const a = win(t, S[9] - 0.3, S[11] + 0.3, 0.6, 0.6);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;

  text(g, 'NEUROBIOLOGY OF DEEP WORK · 髓鞘质超导回路', W / 2, 240, { size: 30, color: C.goldCore, weight: 'bold', glow: true });

  // Top Neuron (Unmyelinated Shallow Circuit: slow, leaky signal)
  const xL = 190, xR = 890;
  const yTop = 580, yBot = 1080;

  // Helper to draw a full neuron at yCenter
  function drawNeuron(yCenter, myelinProgress, pulseSpeed, isSuper) {
    // Dendrites on left soma
    DENDRITES_LEFT.forEach(d => {
      const x1 = xL + Math.cos(d.ang) * d.len;
      const y1 = yCenter + Math.sin(d.ang) * d.len;
      drawGlowLine(g, [[xL, yCenter], [x1, y1]], isSuper ? C.cyan : C.mute, C.white, 2.5, 8, 0.75);
    });
    // Axon terminal branches on right
    DENDRITES_RIGHT.forEach(d => {
      const x1 = xR + Math.cos(d.ang) * d.len;
      const y1 = yCenter + Math.sin(d.ang) * d.len;
      drawGlowLine(g, [[xR, yCenter], [x1, y1]], isSuper ? C.gold : C.mute, C.white, 2.5, 8, 0.75);
    });

    // Main Axon cable
    drawGlowLine(g, [[xL, yCenter], [xR, yCenter]], isSuper ? C.cyan : C.mute, isSuper ? C.white : C.mute, isSuper ? 7 : 3, isSuper ? 22 : 6);

    // Soma cell body
    drawGlowCircle(g, xL, yCenter, 36, isSuper ? C.cyan : C.mute, C.white, 1, true);
    drawGlowCircle(g, xR, yCenter, 28, isSuper ? C.gold : C.mute, C.white, 1, true);

    // Myelin Sheath segments wrapping around the axon
    if (myelinProgress > 0) {
      const numSegs = 6;
      const segW = 78, gap = 22;
      const startX = xL + 65;
      for (let k = 0; k < numSegs; k++) {
        const segU = clamp((myelinProgress * numSegs) - k);
        if (segU <= 0) continue;
        const sx = startX + k * (segW + gap);
        const h = lerp(6, 34, ss(segU));
        g.save();
        g.strokeStyle = C.goldCore; g.fillStyle = 'rgba(255, 200, 69, 0.28)';
        g.shadowColor = C.gold; g.shadowBlur = 20 * segU;
        g.lineWidth = 3;
        // Upper and lower myelin insulation layers
        g.beginPath(); g.roundRect(sx, yCenter - h, segW, h - 5, 10); g.fill(); g.stroke();
        g.beginPath(); g.roundRect(sx, yCenter + 5, segW, h - 5, 10); g.fill(); g.stroke();
        g.restore();
      }
    }

    // Traveling Action Potential Pulses
    const numPulses = isSuper ? 4 : 1;
    for (let p = 0; p < numPulses; p++) {
      const uPulse = ((t * pulseSpeed + p / numPulses) % 1);
      const px = lerp(xL + 40, xR - 30, uPulse);
      const r = isSuper ? 14 : 7;
      drawGlowCircle(g, px, yCenter, r, isSuper ? C.gold : C.red, C.white, 1, true);
    }
  }

  // 1. Shallow Unmyelinated Neuron (Top)
  text(g, '浅层分散回路：无髓鞘包裹 · 信号漏电迟缓 (1x)', W / 2, yTop - 95, { size: 32, color: C.mute });
  drawNeuron(yTop, 0, 0.22, false);

  // 2. Deep Work Myelinated Super-Highway (Bottom)
  const uMyelin = ss(ramp(t, S[9] + 0.5, 5.5));
  const speedBoost = t >= S[10] ? 2.4 : 0.9;
  text(g, '连续 2 小时零打断专注：髓鞘质 (Myelin) 绝缘加速回路 (100x)', W / 2, yBot - 110, {
    size: 34, weight: 'bold', color: C.goldCore, glow: true
  });
  drawNeuron(yBot, uMyelin, speedBoost, true);

  // S11: Quantitative Conduction Velocity Readout at bottom
  const uVel = ss(ramp(t, S[10], 2.5));
  if (uVel > 0) {
    const vel = Math.round(lerp(2, 120, uVel));
    text(g, `神经信号传导速率：${vel} m/s (光纤超导态)`, W / 2, 1340, {
      size: 46, weight: 'bold', color: C.cyanCore, glow: true, alpha: uVel
    });
    text(g, '别人 3 天啃不下的硬骨头 ➔ 2 小时直接击穿', W / 2, 1430, {
      size: 38, weight: 'bold', color: C.goldCore, alpha: uVel
    });
  }

  g.restore();
}

// ============================================================================
// ACT 4 (S12 - S19, 98.2s - 180.5s):
// Persistent Example: 4-Quadrant Focus Shield & 24-Hour Continuous Time Spectrum
// & Diverging Trajectories of the Future Economy
// ============================================================================
function drawAct4(g, t) {
  const a = win(t, S[11] - 0.3, DUR, 0.6, 0.8);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;

  // S12 - S16 (98.2s - 149.5s): Circular Faraday Focus Shield with 4 Dynamic Rule Sectors
  if (t < S[16]) {
    const cx = W / 2, cy = 820, R = 310;
    text(g, 'DEEP WORK PROTOCOL · 深度工作四维防御系统', cx, 240, { size: 30, color: C.cyanCore, weight: 'bold' });

    // Determine active rule index (0: overview, 1: Rhythmic, 2: Boredom, 3: 80/20, 4: Drain Shallow)
    let activeRule = 0;
    if (t >= S[12] && t < S[13]) activeRule = 1;
    else if (t >= S[13] && t < S[14]) activeRule = 2;
    else if (t >= S[14] && t < S[15]) activeRule = 3;
    else if (t >= S[15]) activeRule = 4;

    const sectors = [
      { id: 1, title: '01 节奏哲学', sub: '90min 物理断网舱', col: C.cyan, core: C.cyanCore, a0: -Math.PI, a1: -Math.PI / 2 },
      { id: 2, title: '02 拥抱无聊', sub: '戒断廉价多巴胺', col: C.green, core: C.greenCore, a0: -Math.PI / 2, a1: 0 },
      { id: 3, title: '03 二八断舍离', sub: '剔除 80% 噪音工具', col: C.gold, core: C.goldCore, a0: 0, a1: Math.PI / 2 },
      { id: 4, title: '04 抽干浮浅', sub: '30m 批处理 + 铁律停工', col: C.red, core: C.redCore, a0: Math.PI / 2, a1: Math.PI },
    ];

    sectors.forEach(sec => {
      const isFocused = (activeRule === 0 || activeRule === sec.id);
      const secAlpha = isFocused ? 1.0 : 0.25;
      const rad = (activeRule === sec.id) ? R + 24 : R;

      // Glowing arc segment
      g.save();
      g.globalAlpha *= secAlpha;
      g.strokeStyle = sec.core; g.lineWidth = (activeRule === sec.id) ? 14 : 6;
      g.shadowColor = sec.col; g.shadowBlur = (activeRule === sec.id) ? 28 : 10;
      g.beginPath(); g.arc(cx, cy, rad, sec.a0 + 0.06, sec.a1 - 0.06); g.stroke();
      g.restore();

      // Label outside the sector
      const midA = (sec.a0 + sec.a1) / 2;
      const lx = cx + Math.cos(midA) * (rad + 115);
      const ly = cy + Math.sin(midA) * (rad + 95);
      text(g, sec.title, lx, ly - 18, { size: 34, weight: 'bold', color: sec.core, alpha: secAlpha, glow: activeRule === sec.id });
      text(g, sec.sub, lx, ly + 22, { size: 26, color: C.white, alpha: secAlpha });
    });

    // Dynamic mathematical animation inside the central circle for each rule!
    if (activeRule === 0) {
      drawGlowCircle(g, cx, cy, 110, C.cyan, C.cyanCore, 0.9, false);
      text(g, '4 RULES', cx, cy - 15, { size: 48, weight: 'bold', color: C.white, glow: true });
      text(g, '夺回专注控制权', cx, cy + 38, { size: 30, color: C.goldCore });
    }
    else if (activeRule === 1) {
      // Rule 1: 90-minute countdown timer + Seinfeld chain
      const u90 = ss(ramp(t, S[12] + 0.5, 6.0));
      const mins = Math.round(lerp(0, 90, u90));
      text(g, `${mins} min`, cx, cy - 30, { size: 82, weight: 'bold', color: C.cyanCore, glow: true });
      text(g, '零打扰物理断网舱', cx, cy + 45, { size: 32, color: C.white });
      text(g, '连续习惯链条已锁定 30 天', cx, 1380, { size: 38, weight: 'bold', color: C.greenCore, glow: true });
    }
    else if (activeRule === 2) {
      // Rule 2: Dopamine spike wave flattening into calm deep focus wave
      const uCalm = ss(ramp(t, S[13] + 0.8, 5.0));
      const wavePts = [];
      for (let i = -180; i <= 180; i += 6) {
        const u = (i + 180) / 360;
        const spiky = Math.sin(u * 40 + t * 10) * 95 * (1 - uCalm);
        const smooth = Math.sin(u * Math.PI * 2 + t * 2) * 18 * uCalm;
        wavePts.push([cx + i, cy + spiky + smooth]);
      }
      drawGlowLine(g, wavePts, uCalm > 0.5 ? C.green : C.red, C.white, 4, 16);
      text(g, uCalm > 0.5 ? '耐受无聊 · 专注基线平稳' : '廉价多巴胺剧烈波动', cx, 1380, {
        size: 40, weight: 'bold', color: uCalm > 0.5 ? C.greenCore : C.redCore, glow: true
      });
    }
    else if (activeRule === 3) {
      // Rule 3: Pareto 80/20 Power Law Curve y = x^0.22
      const ox = cx - 160, oy = cy + 120, gw = 320, gh = 240;
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        pts.push([ox + u * gw, oy - Math.pow(u, 0.25) * gh]);
      }
      drawGlowLine(g, pts, C.gold, C.goldCore, 5, 16);
      drawGlowCircle(g, ox + 0.2 * gw, oy - Math.pow(0.2, 0.25) * gh, 10, C.green, C.white, 1, true);
      text(g, '20% 核心工具创造 80% 复利', cx, 1380, { size: 40, weight: 'bold', color: C.goldCore, glow: true });
    }
    else if (activeRule === 4) {
      // Rule 4: Compressing shallow tasks into 30m & Hard Shutdown Gate at 17:30
      const uPress = ss(ramp(t, S[15] + 0.5, 4.5));
      const boxW = lerp(340, 75, uPress);
      g.fillStyle = C.red; g.fillRect(cx - boxW / 2, cy - 35, boxW, 70);
      text(g, '30m', cx, cy, { size: 32, weight: 'bold', color: C.white });
      text(g, '17:30 铁律停工闸门准时锁死 · 严禁拖延加班', cx, 1380, { size: 38, weight: 'bold', color: C.goldCore, glow: true });
    }
  }
  // S17 (149.8s - 159.2s): Continuous 24-Hour Barcode Spectrum (Shattered vs 4h Solid Deep Block)
  else if (t < S[17]) {
    const cx = W / 2;
    text(g, 'DAILY TIME TOPOLOGY · 日程拓扑结构对比', cx, 260, { size: 32, color: C.cyanCore, weight: 'bold' });

    const barX = 140, barW = 800, barH = 110;
    // Top bar: Fragmented 50 micro-slices
    const y1 = 620;
    text(g, '碎片化日程 (50 次打断 · 零深度积分)', cx, y1 - 45, { size: 36, color: C.redCore, weight: 'bold' });
    for (let i = 0; i < 48; i++) {
      if (i % 2 === 0) {
        g.fillStyle = i % 4 === 0 ? C.red : 'rgba(139, 148, 158, 0.45)';
        g.fillRect(barX + (i / 48) * barW, y1, (barW / 48) * 0.7, barH);
      }
    }

    // Bottom bar: 4-hour solid emerald block + golden recovery
    const y2 = 1040;
    const uSolid = ss(ramp(t, S[16] + 0.4, 3.0));
    text(g, '深度工作者日程 (4 小时连续深潜 + 彻底恢复)', cx, y2 - 45, { size: 36, color: C.greenCore, weight: 'bold', glow: true });
    g.save();
    g.fillStyle = C.green; g.shadowColor = C.green; g.shadowBlur = 28;
    g.fillRect(barX, y2, barW * 0.48 * uSolid, barH);
    g.fillStyle = C.gold; g.shadowColor = C.gold; g.shadowBlur = 18;
    g.fillRect(barX + barW * 0.52, y2, barW * 0.48 * uSolid, barH);
    g.restore();
    text(g, '4.0h 零干扰极致深潜', barX + barW * 0.24, y2 + barH / 2, { size: 32, weight: 'bold', color: C.bg, alpha: uSolid });
    text(g, '彻底停工恢复与睡眠', barX + barW * 0.76, y2 + barH / 2, { size: 32, weight: 'bold', color: C.bg, alpha: uSolid });
  }
  // S18 - S19 (159.6s - 180.5s): The Great Bifurcation & Superpower Finale
  else {
    const ox = 150, oy = 1120, gw = 780;
    text(g, 'THE GREAT BIFURCATION · 信息过载时代的分水岭', W / 2, 250, { size: 30, color: C.goldCore, weight: 'bold' });

    // Axes
    drawGlowLine(g, [[ox, oy], [ox + gw, oy]], C.mute, C.white, 2, 6);
    drawGlowLine(g, [[ox, 1380], [ox, 420]], C.mute, C.white, 2, 6);

    const uCurve = ss(ramp(t, S[17], 4.5));
    const upPts = [], downPts = [];
    const N = 100;
    const maxI = Math.floor(uCurve * N);
    for (let i = 0; i <= maxI; i++) {
      const u = i / N;
      const x = ox + u * gw;
      upPts.push([x, oy - Math.pow(u, 2.3) * 640]);
      downPts.push([x, oy + Math.pow(u, 1.4) * 240]);
    }
    drawGlowLine(g, upPts, C.gold, C.goldCore, 6, 22);
    drawGlowLine(g, downPts, C.red, C.redCore, 4, 14);

    if (upPts.length > 5) {
      const [ux, uy] = upPts[upPts.length - 1];
      drawGlowCircle(g, ux, uy, 12, C.gold, C.white, 1, true);
      text(g, '驾驭深度专注的少数精英 (指数复利)', ox + 420, 460, { size: 36, weight: 'bold', color: C.goldCore, glow: true });
      text(g, '被算法与通知驯化的注意力奴隶', ox + 420, 1390, { size: 34, color: C.redCore });
    }

    // S19 Closing Superpower Statement floating in pure space
    const uEnd = ss(ramp(t, S[18], 1.5));
    if (uEnd > 0) {
      text(g, '专注 · 信息过载时代最稀缺的超能力', W / 2, 1520, {
        size: 46, font: SERIF, weight: 'bold', color: C.greenCore, glow: true, alpha: uEnd
      });
    }
  }

  g.restore();
}

// Clean, non-intrusive synchronized subtitle band at bottom (y = 1660..1800)
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

  const subY = 1710;
  // Subtle gradient shadow behind subtitle text so it's 100% legible without a bulky card
  const primaryText = curLine.chunks[activeChunkIdx];
  text(g, primaryText, W / 2, subY, {
    size: 44,
    font: SANS,
    weight: 'bold',
    color: C.white,
    glow: true
  });

  // Minimalist progress indicator dots below subtitle
  if (chunkCount > 1) {
    const dotSpacing = 26;
    const startDotX = W / 2 - ((chunkCount - 1) * dotSpacing) / 2;
    for (let i = 0; i < chunkCount; i++) {
      g.save();
      const isActive = (i === activeChunkIdx);
      g.fillStyle = isActive ? C.cyanCore : 'rgba(255, 255, 255, 0.22)';
      if (isActive) { g.shadowColor = C.cyan; g.shadowBlur = 10; }
      g.beginPath();
      g.arc(startDotX + i * dotSpacing, subY + 54, isActive ? 5 : 3.5, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
}

async function renderAll() {
  const outDir = 'out';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const finalVideo = 'out/deep_work_ep01_3b1b.mp4';
  console.log(`🎬 Rendering Pure 3B1B Continuous Diagram Video: ${NFRAMES} frames (${DUR}s at ${FPS}fps)...`);

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

    drawAct1(g, t);
    drawAct2(g, t);
    drawAct3(g, t);
    drawAct4(g, t);
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

  console.log(`\n🎉 Pure 3B1B Rendering complete! Saved to ${finalVideo}`);
}

renderAll().catch(err => {
  console.error('Rendering error:', err);
  process.exit(1);
});
