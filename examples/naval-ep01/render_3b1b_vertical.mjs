// 《纳瓦尔宝典》3Blue1Brown 暗黑荧光风格 (9:16, 1080x1920) - 21 句完整版 (170s, 5100 帧)
// High contrast, deep obsidian background, neon glowing lasers, spark particles, screen shake.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const W = 1080, H = 1920, FPS = 30;
const timeline = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8'));
const NFRAMES = timeline.TOTAL_FRAMES || 5100;
const DUR = timeline.DUR || 170;
const LINES = timeline.LINES;

// 3Blue1Brown Dark Glowing Palette
const C = {
  bg: '#080B10',
  grid: 'rgba(88, 166, 255, 0.06)',
  cardBg: 'rgba(18, 24, 38, 0.78)',
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
  neonPurple: '#B5179E',
  neonPurpleCore: '#F72585',
};
const SERIF = '"Noto Serif CJK SC", "Source Han Serif CN", serif';
const SANS = '"Noto Sans CJK SC", "Source Han Sans CN", sans-serif';

// Easing helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const eo = u => 1 - Math.pow(1 - clamp(u), 3);
const eio = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const ramp = (t, a, d) => clamp((t - a) / d);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Pre-render static background with dark 3B1B grid and vignette
function makeBackground() {
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = C.grid; g.lineWidth = 1;
  const step = 80;
  for (let x = 0; x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  const rg = g.createRadialGradient(W / 2, H * 0.45, H * 0.1, W / 2, H * 0.5, H * 0.85);
  rg.addColorStop(0, 'rgba(0, 50, 100, 0.08)');
  rg.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return c;
}
const BG = makeBackground();

// Neon glow line helper
function drawGlowLine(g, pts, color, coreColor, width = 4, glowWidth = 18) {
  if (pts.length < 2) return;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  // Outer bloom
  g.strokeStyle = color; g.globalAlpha *= 0.25; g.lineWidth = glowWidth * 1.5;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  // Mid glow
  g.globalAlpha = g.globalAlpha / 0.25 * 0.6; g.lineWidth = glowWidth * 0.6;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  // Hot core
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

// Glowing Glassmorphic Card
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

// Subtitle Box Renderer
function drawSubtitles(g, t) {
  // Find active line
  let curLine = null;
  for (const line of LINES) {
    if (t >= line.start_s && t < line.end_s + 0.3) {
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
  
  // Backing pill
  g.save();
  g.fillStyle = 'rgba(8, 12, 22, 0.88)';
  g.strokeStyle = 'rgba(88, 166, 255, 0.3)';
  g.lineWidth = 1.5;
  rrect(g, boxX, boxY, boxW, boxH, 28);
  g.fill(); g.stroke();
  g.restore();

  // Render chunks
  const primaryText = curLine.chunks[activeChunkIdx];
  text(g, primaryText, W / 2, boxY + 68, {
    size: 42,
    font: SANS,
    weight: 'bold',
    color: C.white,
    glow: true
  });

  // Small progress dots for sentence chunks
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

// Render dynamic visual scene based on current sentence
function drawScene(g, t) {
  // Let us detect which sentence block is active
  let sIndex = 0;
  for (let i = 0; i < LINES.length; i++) {
    if (t >= LINES[i].start_s && t < LINES[i].end_s) {
      sIndex = i + 1;
      break;
    }
    if (t < LINES[0].start_s) sIndex = 1;
    if (t >= LINES[LINES.length - 1].end_s) sIndex = 21;
  }
  if (sIndex === 0) {
    // interpolation between lines
    for (let i = 0; i < LINES.length - 1; i++) {
      if (t >= LINES[i].end_s && t < LINES[i+1].start_s) {
        sIndex = i + 1;
        break;
      }
    }
  }

  // Common header
  text(g, 'NAVAL RAVIKANT · ALMANACK', W / 2, 180, {
    size: 24, font: SANS, weight: 'bold', color: 'rgba(88, 166, 255, 0.7)', glow: false
  });

  // Scene rendering switch
  if (sIndex === 1) {
    // S01: 7:00 打工人 80 小时
    drawCard(g, 100, 320, 880, 1180);
    // Clock
    const uClock = ss(ramp(t, 0.5, 1.2));
    const cx = W / 2, cy = 680, r = 200;
    g.save();
    g.strokeStyle = C.neonCyan; g.lineWidth = 4;
    g.shadowColor = C.neonCyan; g.shadowBlur = 20;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    // Clock hands at 07:00
    const hrAngle = (7 / 12) * Math.PI * 2;
    g.lineWidth = 6; g.strokeStyle = C.neonGold;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(hrAngle)*100, cy - Math.cos(hrAngle)*100); g.stroke();
    g.lineWidth = 4; g.strokeStyle = C.neonCyanCore;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 150); g.stroke();
    g.restore();

    text(g, '07:00 AM', W / 2, 950, { size: 68, weight: 'bold', color: C.neonCyanCore, glow: true });
    
    // 80 Hours Counter
    const hours = Math.round(lerp(40, 80, ss(ramp(t, 2.5, 3.0))));
    text(g, `每周拼命干满 ${hours} 小时`, W / 2, 1080, { size: 48, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, '为什么依然存不下真正的财富？', W / 2, 1200, { size: 38, color: C.textMute });
  }
  else if (sIndex === 2) {
    // S02: 工时陷阱与归零曲线
    drawCard(g, 100, 320, 880, 1180);
    text(g, '工时陷阱：收入 = 时间 × 单价', W / 2, 420, { size: 44, weight: 'bold', color: C.neonRedCore, glow: true });
    
    // Axes
    const ox = 220, oy = 1250, gx = 640, gy = 600;
    drawGlowLine(g, [[ox, oy], [ox + gx, oy]], C.neonCyan, C.neonCyanCore, 3, 10);
    drawGlowLine(g, [[ox, oy], [ox, oy - gy]], C.neonCyan, C.neonCyanCore, 3, 10);
    text(g, '时间', ox + gx + 30, oy + 10, { size: 30, color: C.neonCyan });
    text(g, '收入', ox, oy - gy - 30, { size: 30, color: C.neonCyan });

    // Linear rising then plummeting
    const relT = t - LINES[1].start_s;
    const progress = clamp(relT / 6.0);
    const pts = [];
    const stopX = 0.58;
    if (progress < stopX) {
      pts.push([ox, oy]);
      pts.push([ox + progress * gx, oy - progress * gy * 0.8]);
      drawGlowLine(g, pts, C.neonCyan, C.white, 5, 14);
    } else {
      pts.push([ox, oy]);
      pts.push([ox + stopX * gx, oy - stopX * gy * 0.8]);
      pts.push([ox + stopX * gx, oy]); // Sudden drop to zero!
      drawGlowLine(g, pts, C.neonRed, C.neonRedCore, 6, 18);
      text(g, '一旦停下休息 ➔ 收入归零', W / 2, 700, { size: 42, weight: 'bold', color: C.neonRed, glow: true });
    }
  }
  else if (sIndex === 3) {
    // S03: 反直觉真相：努力与财富没有线性关系
    drawCard(g, 100, 320, 880, 1180);
    text(g, '《纳瓦尔宝典》反直觉真相', W / 2, 440, { size: 42, color: C.neonGold, glow: true });
    text(g, '努力 ≠ 财富', W / 2, 600, { size: 84, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, '没有线性关系', W / 2, 720, { size: 52, weight: 'bold', color: C.white });

    // Compare curves
    const ox = 240, oy = 1300;
    drawGlowLine(g, [[ox, oy], [ox + 600, oy - 200]], 'rgba(139,148,158,0.5)', 'rgba(255,255,255,0.7)', 3, 6);
    text(g, '单纯线性苦干', ox + 610, oy - 200, { size: 28, color: C.textMute, align: 'left' });

    // Exponential leap curve
    const expPts = [];
    for (let x = 0; x <= 600; x += 20) {
      const u = x / 600;
      const y = Math.pow(u, 3) * 450;
      expPts.push([ox + x, oy - y]);
    }
    drawGlowLine(g, expPts, C.neonGold, C.neonGoldCore, 5, 18);
    text(g, '反直觉复利跃迁 ➔', ox + 380, oy - 480, { size: 34, weight: 'bold', color: C.neonGoldCore, glow: true, align: 'left' });
  }
  else if (sIndex === 4) {
    // S04: 工时欠条 vs 睡后资产
    drawCard(g, 100, 340, 880, 520, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '金钱 (Money)', W / 2, 440, { size: 34, color: C.neonRedCore });
    text(g, '只是社会开出的工时欠条', W / 2, 530, { size: 46, weight: 'bold', color: C.white, glow: true });
    text(g, '需要不断用新时间去兑换', W / 2, 620, { size: 32, color: C.textMute });

    drawCard(g, 100, 920, 880, 560, 1, 'rgba(6, 214, 160, 0.5)');
    text(g, '真正的财富 (Wealth)', W / 2, 1020, { size: 36, color: C.neonGreenCore, glow: true });
    text(g, '睡觉时仍在帮你赚钱的资产', W / 2, 1120, { size: 50, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, '工厂 · 代码 · 知识产权 · 资本', W / 2, 1230, { size: 34, color: C.white });
  }
  else if (sIndex === 5) {
    // S05: 怎样拥有？公式：把自己产品化
    drawCard(g, 100, 360, 880, 1100);
    text(g, '纳瓦尔终极财富公式', W / 2, 500, { size: 44, color: C.neonGold });
    
    // Core Formula Pill
    const fw = 740, fh = 200, fx = (W - fw) / 2, fy = 660;
    g.save();
    rrect(g, fx, fy, fw, fh, 32);
    g.fillStyle = 'rgba(6, 214, 160, 0.15)';
    g.strokeStyle = C.neonGreen; g.lineWidth = 4;
    g.shadowColor = C.neonGreen; g.shadowBlur = 30;
    g.fill(); g.stroke();
    g.restore();

    text(g, '【 把自己产品化 】', W / 2, fy + 100, { size: 66, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, 'Productize Yourself', W / 2, fy + 160, { size: 30, color: C.neonGreen });

    text(g, '“把自己” = 独特的独门专长', W / 2, 1000, { size: 42, color: C.white });
    text(g, '“产品化” = 挂上杠杆无限复制', W / 2, 1110, { size: 42, color: C.neonCyanCore, glow: true });
  }
  else if (sIndex === 6) {
    // S06: 三脚架模型：专长支点 + 商业杠杆 + 判断力
    drawCard(g, 100, 340, 880, 1140);
    text(g, '财富三脚架支点模型', W / 2, 440, { size: 44, weight: 'bold', color: C.neonGoldCore, glow: true });

    // 3 Nodes
    const p1 = { x: W / 2 - 240, y: 720, label: '专长', sub: '独门支点', col: C.neonCyan };
    const p2 = { x: W / 2 + 240, y: 720, label: '杠杆', sub: '百倍放大器', col: C.neonGold };
    const p3 = { x: W / 2, y: 1150, label: '判断力', sub: '罗盘控方向', col: C.neonGreen };

    // Triangle lines
    drawGlowLine(g, [[p1.x, p1.y], [p2.x, p2.y]], C.rule, C.white, 3, 8);
    drawGlowLine(g, [[p2.x, p2.y], [p3.x, p3.y]], C.rule, C.white, 3, 8);
    drawGlowLine(g, [[p3.x, p3.y], [p1.x, p1.y]], C.rule, C.white, 3, 8);

    [p1, p2, p3].forEach(p => {
      g.save();
      g.fillStyle = p.col;
      g.shadowColor = p.col; g.shadowBlur = 24;
      g.beginPath(); g.arc(p.x, p.y, 70, 0, Math.PI * 2); g.fill();
      g.restore();
      text(g, p.label, p.x, p.y, { size: 36, weight: 'bold', color: C.bg });
      text(g, p.sub, p.x, p.y + 110, { size: 30, color: C.white, glow: true });
    });
  }
  else if (sIndex === 7) {
    // S07: 专长·培训班批量技能 vs 自动化替代
    drawCard(g, 100, 340, 880, 1140);
    text(g, '支点一：专长 (Specific Knowledge)', W / 2, 440, { size: 40, color: C.neonCyanCore, glow: true });
    
    drawCard(g, 160, 560, 760, 240, 1, 'rgba(255, 56, 92, 0.3)');
    text(g, '⚠️ 凡是培训班能批量教的技能', W / 2, 640, { size: 38, weight: 'bold', color: C.neonRedCore });
    text(g, '明天就能培训别人廉价替代你', W / 2, 720, { size: 34, color: C.white });

    // Laser scanning code
    drawCard(g, 160, 870, 760, 480, 1, 'rgba(0, 212, 255, 0.2)');
    text(g, 'const replaceHuman = async (worker) => {', 200, 960, { size: 28, font: 'monospace', color: C.neonGreen, align: 'left' });
    text(g, '  await aiModel.automate(worker.tasks);', 200, 1030, { size: 28, font: 'monospace', color: C.neonCyanCore, align: 'left' });
    text(g, '  return { cost: 0.001, speed: 1000x };', 200, 1100, { size: 28, font: 'monospace', color: C.neonGold, align: 'left' });
    text(g, '};', 200, 1170, { size: 28, font: 'monospace', color: C.neonGreen, align: 'left' });
    text(g, '“甚至用几行代码接管你”', W / 2, 1270, { size: 42, weight: 'bold', color: C.neonRedCore, glow: true });
  }
  else if (sIndex === 8) {
    // S08: 苦役 vs 玩耍
    drawCard(g, 100, 340, 880, 1140);
    text(g, '真正的专长藏在天赋与好奇里', W / 2, 440, { size: 42, color: C.neonGoldCore, glow: true });

    drawCard(g, 160, 560, 760, 340, 1, 'rgba(139, 148, 158, 0.3)');
    text(g, '别人做起来：苦役 (Work)', W / 2, 660, { size: 44, color: C.textMute });
    text(g, '痛苦 · 枯燥 · 消耗意志力', W / 2, 760, { size: 34, color: 'rgba(255,255,255,0.6)' });

    drawCard(g, 160, 960, 760, 420, 1, 'rgba(6, 214, 160, 0.4)');
    text(g, '你做起来：玩耍 (Play)', W / 2, 1080, { size: 54, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, '像玩游戏一样着迷 · 乐此不疲', W / 2, 1190, { size: 38, color: C.white });
    text(g, '自然形成深不见底的行业壁垒', W / 2, 1270, { size: 32, color: C.neonGold });
  }
  else if (sIndex === 9) {
    // S09: 在“成为你自己”这件事上，无人能敌
    drawCard(g, 100, 360, 880, 1100);
    // Glowing Crown / DNA Geometry
    const cx = W / 2, cy = 680;
    g.save();
    g.strokeStyle = C.neonGold; g.lineWidth = 4;
    g.shadowColor = C.neonGold; g.shadowBlur = 30;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = i % 2 === 0 ? 160 : 90;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath(); g.stroke();
    g.restore();

    text(g, '在“成为你自己”这件事上', W / 2, 980, { size: 48, weight: 'bold', color: C.white });
    text(g, '全世界没有任何人能和你竞争', W / 2, 1100, { size: 52, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '“No one can compete with you on being you.”', W / 2, 1220, { size: 30, color: C.textMute });
  }
  else if (sIndex === 10) {
    // S10: 商业杠杆（双手只能卖一次）
    drawCard(g, 100, 340, 880, 1140);
    text(g, '支点二：商业杠杆 (Leverage)', W / 2, 440, { size: 44, color: C.neonGoldCore, glow: true });
    
    // Seesaw / Lever illustration
    const lx = 200, rx = 880, py = 850;
    const fulcrumX = 360;
    // Lever bar
    drawGlowLine(g, [[lx, py + 120], [rx, py - 180]], C.neonCyan, C.white, 6, 16);
    // Fulcrum triangle
    g.save();
    g.fillStyle = C.neonGold; g.shadowColor = C.neonGold; g.shadowBlur = 20;
    g.beginPath();
    g.moveTo(fulcrumX, py + 80);
    g.lineTo(fulcrumX - 40, py + 160);
    g.lineTo(fulcrumX + 40, py + 160);
    g.closePath(); g.fill();
    g.restore();

    text(g, '双手干活 ➔ 1份时间只能卖1次', W / 2, 1120, { size: 42, color: C.neonRedCore, glow: true });
    text(g, '你需要杠杆放大你的每分每秒', W / 2, 1240, { size: 44, weight: 'bold', color: C.neonGoldCore, glow: true });
  }
  else if (sIndex === 11) {
    // S11: 劳动力杠杆
    drawCard(g, 100, 340, 880, 1140);
    text(g, '杠杆类型 1：劳动力 (Labor)', W / 2, 440, { size: 42, color: C.neonCyanCore, glow: true });
    text(g, '单打独斗打工人 ➔ 零杠杆', W / 2, 580, { size: 36, color: C.textMute });

    // Pyramid of workers
    const cy = 820;
    text(g, '👑 公司老板', W / 2, cy - 80, { size: 46, weight: 'bold', color: C.neonGoldCore });
    text(g, '👥 雇佣管理团队 · 组织协同', W / 2, cy + 40, { size: 38, color: C.white });
    text(g, '靠团队工时接下百万大单', W / 2, cy + 150, { size: 44, weight: 'bold', color: C.neonCyanCore, glow: true });
    text(g, '但：管理成本极高，充满内部博弈', W / 2, 1240, { size: 34, color: C.neonRedCore });
  }
  else if (sIndex === 12) {
    // S12: 资本杠杆
    drawCard(g, 100, 340, 880, 1140);
    text(g, '杠杆类型 2：资本 (Capital)', W / 2, 440, { size: 42, color: C.neonGoldCore, glow: true });

    // Multiplier box
    const mx = W / 2, my = 750;
    text(g, '出资 10,000,000 元入股', mx, my - 100, { size: 40, color: C.white });
    text(g, '× 资本倍增器', mx, my, { size: 54, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '单笔赚走上千万回报', mx, my + 100, { size: 46, weight: 'bold', color: C.neonGreenCore, glow: true });

    text(g, '二十世纪最主流的财富跃迁杠杆', W / 2, 1150, { size: 36, color: C.white });
    text(g, '但：需要大量原始本金与信用背书', W / 2, 1250, { size: 32, color: C.textMute });
  }
  else if (sIndex === 13) {
    // S13: 旧杠杆的死门：需要许可
    drawCard(g, 100, 340, 880, 1140, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '旧杠杆的共同死穴：', W / 2, 460, { size: 40, color: C.neonRedCore });
    
    // Giant Padlock
    const cx = W / 2, cy = 720;
    g.save();
    g.strokeStyle = C.neonRed; g.lineWidth = 6;
    g.shadowColor = C.neonRed; g.shadowBlur = 30;
    // shackle
    g.beginPath(); g.arc(cx, cy - 50, 70, Math.PI, 0); g.stroke();
    // lock body
    rrect(g, cx - 100, cy - 50, 200, 160, 20);
    g.fillStyle = 'rgba(255, 56, 92, 0.25)'; g.fill(); g.stroke();
    g.restore();

    text(g, '【 必须经过别人的许可 】', W / 2, 980, { size: 52, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, '得有人愿意追随你 · 或把钱交给你', W / 2, 1100, { size: 38, color: C.white });
    text(g, '门槛极高，普通人寸步难行', W / 2, 1200, { size: 34, color: C.textMute });
  }
  else if (sIndex === 14) {
    // S14: 第三杠杆：0 边际成本的代码和媒体
    drawCard(g, 100, 340, 880, 1140);
    text(g, '互联网时代第三种新杠杆', W / 2, 440, { size: 42, color: C.neonGreenCore, glow: true });
    
    drawCard(g, 160, 580, 760, 260, 1, 'rgba(0, 212, 255, 0.4)');
    text(g, '💻 代码 (Code)', W / 2, 660, { size: 46, weight: 'bold', color: C.neonCyanCore, glow: true });
    text(g, '软件 · 算法 · 自动化脚本', W / 2, 750, { size: 34, color: C.white });

    drawCard(g, 160, 880, 760, 260, 1, 'rgba(255, 209, 102, 0.4)');
    text(g, '📱 媒体 (Media)', W / 2, 960, { size: 46, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '视频 · 文章 · 播客 · 开源', W / 2, 1050, { size: 34, color: C.white });

    text(g, '复制边际成本 = 0 (Marginal Cost = 0)', W / 2, 1280, { size: 42, weight: 'bold', color: C.neonGreenCore, glow: true });
  }
  else if (sIndex === 15) {
    // S15: 无需许可，服务器机器人 24 小时打工
    drawCard(g, 100, 340, 880, 1140);
    text(g, '免许可杠杆 (Permissionless)', W / 2, 440, { size: 44, color: C.neonCyanCore, glow: true });
    text(g, '写一段程序 或 录一条视频', W / 2, 580, { size: 46, weight: 'bold', color: C.white });
    text(g, '不需要向任何人申请批准！', W / 2, 670, { size: 42, color: C.neonGoldCore, glow: true });

    // Server Grid
    drawCard(g, 160, 780, 760, 420, 1, 'rgba(6, 214, 160, 0.3)');
    text(g, '🤖 数据中心服务器集群', W / 2, 880, { size: 44, color: C.neonGreenCore, glow: true });
    text(g, '全天候 24 小时为你免费打工', W / 2, 980, { size: 46, weight: 'bold', color: C.white });
    text(g, '不睡觉 · 不喊累 · 无限扩张', W / 2, 1080, { size: 36, color: C.neonCyanCore });

    text(g, '平民实现跃迁的最强武器', W / 2, 1310, { size: 38, color: C.white });
  }
  else if (sIndex === 16) {
    // S16: 专长 + 资本 + 代码 = 放大上千倍
    drawCard(g, 100, 340, 880, 1140);
    text(g, '超级平台聚变效应', W / 2, 440, { size: 42, color: C.neonGoldCore });

    text(g, '个人专长', W / 2, 560, { size: 42, color: C.neonCyanCore });
    text(g, '➕ 资本杠杆 ➕ 代码媒体', W / 2, 650, { size: 42, color: C.neonGreenCore });
    text(g, '⬇️', W / 2, 750, { size: 44, color: C.white });

    drawCard(g, 160, 820, 760, 320, 1, 'rgba(255, 209, 102, 0.5)');
    text(g, '单打独斗 ➔ 超级个体平台', W / 2, 920, { size: 48, weight: 'bold', color: C.white });
    text(g, '产出放大 1000 倍！', W / 2, 1030, { size: 66, weight: 'bold', color: C.neonGoldCore, glow: true });

    text(g, '一人公司撬动亿级商业版图', W / 2, 1280, { size: 38, color: C.neonCyanCore });
  }
  else if (sIndex === 17) {
    // S17: 杠杆双刃剑·方向偏了苦干全废，支点三是判断力
    drawCard(g, 100, 340, 880, 1140, 1, 'rgba(255, 56, 92, 0.4)');
    text(g, '⚠️ 千倍杠杆的双刃剑', W / 2, 440, { size: 42, color: C.neonRedCore });
    text(g, '方向一旦偏了 ➔ 千倍加速毁灭', W / 2, 580, { size: 46, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, '十倍苦干也全是白费！', W / 2, 680, { size: 42, color: C.white });

    // Compass
    drawCard(g, 160, 800, 760, 480, 1, 'rgba(6, 214, 160, 0.4)');
    text(g, '第三个支点：判断力 (Judgment)', W / 2, 910, { size: 44, weight: 'bold', color: C.neonGreenCore, glow: true });
    text(g, '在关键分岔路口做正确抉择的能力', W / 2, 1020, { size: 36, color: C.white });
    text(g, '“方向比努力重要 1000 倍”', W / 2, 1150, { size: 46, weight: 'bold', color: C.neonGoldCore, glow: true });
  }
  else if (sIndex === 18) {
    // S18: 千亿企业 85% vs 75% 判断力，撬动百亿价值
    drawCard(g, 100, 340, 880, 1140);
    text(g, '千亿美元市值企业中的判断力', W / 2, 430, { size: 40, color: C.neonGoldCore });

    // Compare 75% vs 85%
    drawCard(g, 160, 520, 760, 240, 1, 'rgba(139, 148, 158, 0.3)');
    text(g, '普通高管：75% 准确率', 220, 600, { size: 36, color: C.textMute, align: 'left' });
    text(g, '常规决策回报，面临巨大杠杆回撤', 220, 680, { size: 30, color: 'rgba(255,255,255,0.7)', align: 'left' });

    drawCard(g, 160, 790, 760, 300, 1, 'rgba(6, 214, 160, 0.4)');
    text(g, '顶级领袖：85% 准确率 (+10%)', 220, 880, { size: 40, weight: 'bold', color: C.neonGreenCore, align: 'left', glow: true });
    text(g, '哪怕只多对 10% ➔ 乘上千亿杠杆', 220, 960, { size: 34, color: C.white, align: 'left' });
    text(g, '多创百亿美元企业价值！', 220, 1030, { size: 42, weight: 'bold', color: C.neonGoldCore, align: 'left', glow: true });

    text(g, '“所以公司愿多付上亿美元报酬”', W / 2, 1260, { size: 42, weight: 'bold', color: C.white });
  }
  else if (sIndex === 19) {
    // S19: 纳瓦尔 5000 美元时薪，一年深思，一天果断出手
    drawCard(g, 100, 340, 880, 1140);
    text(g, '顶级判断力的修炼之道', W / 2, 440, { size: 42, color: C.neonCyanCore });
    
    // 5000/hr badge
    text(g, '给自己定下：$5,000 / 小时', W / 2, 580, { size: 54, weight: 'bold', color: C.neonGoldCore, glow: true });
    text(g, '砍掉琐事 · 拒绝无效社交', W / 2, 690, { size: 38, color: C.neonRedCore });

    drawCard(g, 160, 800, 760, 440, 1, 'rgba(0, 212, 255, 0.3)');
    text(g, '用 364 天深度思考', W / 2, 920, { size: 48, weight: 'bold', color: C.white });
    text(g, '⬇️', W / 2, 1020, { size: 40, color: C.neonGold });
    text(g, '再用 1 天果断出手！', W / 2, 1120, { size: 54, weight: 'bold', color: C.neonGreenCore, glow: true });
  }
  else if (sIndex === 20) {
    // S20: 回到早上 7 点，财富分水岭不是熬通宵
    drawCard(g, 100, 340, 880, 1140);
    text(g, '回到早上七点出门上班的清晨', W / 2, 460, { size: 42, color: C.neonCyanCore });

    // The Great Divide
    text(g, '人与人真正的财富分水岭：', W / 2, 660, { size: 48, weight: 'bold', color: C.white });
    text(g, '❌ 从来不是谁多熬了几个通宵', W / 2, 820, { size: 46, weight: 'bold', color: C.neonRedCore, glow: true });
    text(g, '不是比拼肉体疲劳度', W / 2, 930, { size: 34, color: C.textMute });
    text(g, '而是商业操作系统与杠杆的维度差', W / 2, 1160, { size: 42, weight: 'bold', color: C.neonGoldCore, glow: true });
  }
  else if (sIndex === 21) {
    // S21: 终极金句收尾
    drawCard(g, 100, 340, 880, 1140, 1, 'rgba(255, 209, 102, 0.5)');
    text(g, '《纳瓦尔宝典》行动纲领', W / 2, 440, { size: 40, color: C.neonGold });

    text(g, '1. 找到像玩耍一样的独门专长', W / 2, 580, { size: 42, weight: 'bold', color: C.white });
    text(g, '2. 挂上免许可的代码与媒体杠杆', W / 2, 700, { size: 42, weight: 'bold', color: C.neonCyanCore, glow: true });
    text(g, '3. 用顶级判断力做方向掌舵', W / 2, 820, { size: 42, weight: 'bold', color: C.neonGreenCore, glow: true });

    // Golden Box
    drawCard(g, 140, 960, 800, 240, 1, 'rgba(255, 209, 102, 0.7)');
    text(g, '把自己打造成一份', W / 2, 1030, { size: 40, color: C.white });
    text(g, '【 无限复制的产品 】', W / 2, 1120, { size: 60, weight: 'bold', color: C.neonGoldCore, glow: true });

    text(g, '脱离时间束缚 · 获得终极自由', W / 2, 1330, { size: 36, color: C.neonCyanCore });
  }
}

async function renderAll() {
  const outDir = 'out';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const finalVideo = 'out/naval_ep01_3b1b_21lines.mp4';
  console.log(`🎬 Rendering ${NFRAMES} frames (${DUR}s at ${FPS}fps) in 3B1B vertical style...`);

  // Direct rawvideo pipe to ffmpeg for instant, high-speed encoding
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
    // 1. Draw static background
    g.drawImage(BG, 0, 0);

    // 2. Draw scene visuals for this timestamp
    drawScene(g, t);

    // 3. Draw subtitles
    drawSubtitles(g, t);

    // 4. Stream raw RGBA frame directly to ffmpeg pipe (zero compression overhead)
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
