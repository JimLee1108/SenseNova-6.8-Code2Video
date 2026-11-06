// 《纳瓦尔宝典》3Blue1Brown 暗黑荧光风格 (9:16, 1080x1920)
// High contrast, deep obsidian background, neon glowing lasers, spark particles, screen shake.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const W = 1080, H = 1920, FPS = 30, DUR = 60, NFRAMES = DUR * FPS;
const timeline = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8'));
const VO = JSON.parse(fs.readFileSync('build/vo/timing.json', 'utf8')).lines;
const { START, LS, LE, B, K } = timeline;

// 3Blue1Brown Dark Glowing Palette
const C = {
  bg: '#080B10',
  grid: 'rgba(88, 166, 255, 0.06)',
  cardBg: 'rgba(18, 24, 38, 0.75)',
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
  neonGreen: '#06D6A0',
  neonGreenCore: '#A3FFE8',
};
const SERIF = '"Noto Serif CJK SC"', SANS = '"Noto Sans CJK SC"';

// Easing
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const eo = u => 1 - Math.pow(1 - clamp(u), 3);
const eio = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const ramp = (t, a, d) => clamp((t - a) / d);
const win = (t, a, b, fi = .5, fo = .5) => Math.min(ss((t - a) / fi), 1 - ss((t - (b - fo)) / fo));
const back = u => { u = clamp(u); const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Background with dark 3B1B grid and deep vignette
function makeBackground() {
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  // Grid lines
  g.strokeStyle = C.grid; g.lineWidth = 1;
  const step = 80;
  for (let x = 0; x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  // Radial glow / vignette
  const rg = g.createRadialGradient(W / 2, H * 0.45, H * 0.1, W / 2, H * 0.5, H * 0.85);
  rg.addColorStop(0, 'rgba(0, 50, 100, 0.08)');
  rg.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return c;
}
const BG = makeBackground();

// Neon glow drawing helper
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
  // White/hot core
  g.strokeStyle = coreColor; g.globalAlpha = g.globalAlpha / 0.6 * 1.0; g.lineWidth = width;
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  g.restore();
}

function text(g, s, x, y, { size = 40, font = SANS, weight = '', color = C.white, align = 'center', alpha = 1, base = 'middle', glow = false } = {}) {
  if (alpha <= 0) return; g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${font}`.trim();
  g.textAlign = align; g.textBaseline = base;
  if (glow) {
    g.shadowColor = color; g.shadowBlur = size * 0.45;
  }
  g.fillStyle = color; g.fillText(s, x, y);
  g.restore();
}

function rich(g, segs, x, y, { size, font = SERIF, weight = 'bold', alpha = 1, reveal = 1e9, align = 'center', glow = false }) {
  g.save(); g.font = `${weight} ${size}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  const full = segs.map(s => s[0]).join(''), w = g.measureText(full).width;
  let cx = align === 'center' ? x - w / 2 : x, n = 0;
  for (const [s, col] of segs) for (const ch of s) {
    const a = clamp(reveal - n) * alpha; n++;
    const cw = g.measureText(ch).width;
    if (a > 0) {
      g.globalAlpha = a;
      if (glow) { g.shadowColor = col; g.shadowBlur = 24; }
      g.fillStyle = col; g.fillText(ch, cx, y + (1 - a) * 8);
    }
    cx += cw;
  }
  g.restore(); return w;
}

function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// Glowing Clock
function clock(g, cx, cy, r, hours, alpha) {
  if (alpha <= 0) return; g.save(); g.globalAlpha *= alpha;
  // outer dark glow plate
  g.fillStyle = 'rgba(13, 20, 36, 0.85)'; g.strokeStyle = C.neonCyan; g.lineWidth = 3;
  g.shadowColor = C.neonCyan; g.shadowBlur = 18;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.shadowBlur = 0;
  // ticks
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, r0 = r * (k % 3 ? .86 : .76);
    g.strokeStyle = k % 3 ? 'rgba(255,255,255,0.4)' : C.neonCyan;
    g.lineWidth = k % 3 ? 2 : 4;
    g.beginPath(); g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); g.lineTo(cx + Math.sin(a) * r * .92, cy - Math.cos(a) * r * .92); g.stroke();
  }
  // hour hand (cyan) & minute hand (glowing neon red)
  const hand = (ang, len, w, c, glow) => {
    g.save(); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round';
    if (glow) { g.shadowColor = c; g.shadowBlur = 15; }
    g.beginPath(); g.moveTo(cx - Math.sin(ang) * len * .15, cy + Math.cos(ang) * len * .15);
    g.lineTo(cx + Math.sin(ang) * len, cy - Math.cos(ang) * len); g.stroke();
    g.restore();
  };
  hand((hours + 9) / 12 * Math.PI * 2, r * .5, 5, C.neonCyanCore, false);
  hand(hours * Math.PI * 2, r * .78, 4, C.neonRed, true);
  g.fillStyle = C.white; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
  g.restore();
}

// Glowing Coin Stack
function coin(g, x, y, w, alpha) {
  if (alpha <= 0) return; g.save(); g.globalAlpha *= alpha;
  const h = w * .3;
  g.shadowColor = C.neonGold; g.shadowBlur = 14;
  g.fillStyle = '#996B1E'; g.beginPath(); g.ellipse(x, y + h * .35, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.neonGold; g.strokeStyle = '#FFE89E'; g.lineWidth = 2.5;
  g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

// Graph coordinates
const O = { x: 170, y: 1420 }, GX = 720, GY = 780;
const curveY = x => 0.141 * (Math.exp(2 * x) - 1);
function graphView(t) {
  const z = lerp(1, 2.3, eio(ramp(t, K.zoom, 3.2)));
  const zy = Math.max(1, curveY(1.3 * z) / 1.1 * eio(ramp(t, K.zoom, 3.2)) + (1 - eio(ramp(t, K.zoom, 3.2))));
  return { px: x => O.x + x / z * GX, py: y => O.y - y / zy * GY, z, zy };
}
function graphAlpha(t) {
  if (t < B[1]) return 0;
  if (t < B[2]) return 1;
  if (t < B[5]) return lerp(1, 0, ss(ramp(t, B[2], .6)));
  return ss(ramp(t, B[5], .7)) * (1 - ss(ramp(t, B[7], .6)));
}

// Spark Particles for Collision
const rndSpark = mulberry32(42);
const SPARKS = Array.from({ length: 28 }, () => ({
  vx: (rndSpark() - 0.5) * 450,
  vy: -rndSpark() * 380 - 80,
  size: 3 + rndSpark() * 5,
  col: rndSpark() > 0.4 ? C.neonRed : C.neonGold,
}));

function drawGraph(g, t, A) {
  if (A <= 0) return;
  const v = graphView(t);
  g.save(); g.globalAlpha *= A;

  // Grid background within the graph area
  g.save();
  g.strokeStyle = 'rgba(88, 166, 255, 0.08)'; g.lineWidth = 1;
  for (let gy = 600; gy < O.y; gy += 100) { g.beginPath(); g.moveTo(O.x, gy); g.lineTo(O.x + GX + 80, gy); g.stroke(); }
  for (let gx = O.x + 100; gx < O.x + GX + 80; gx += 100) { g.beginPath(); g.moveTo(gx, 550); g.lineTo(gx, O.y); g.stroke(); }
  g.restore();

  // Glowing Axes
  const ua = eo(ramp(t, K.axes, 1.0));
  drawGlowLine(g, [[O.x, O.y], [lerp(O.x, 980, ua), O.y]], C.neonCyan, C.neonCyanCore, 3, 12);
  drawGlowLine(g, [[O.x, O.y], [O.x, lerp(O.y, 560, ua)]], C.neonCyan, C.neonCyanCore, 3, 12);
  text(g, '收入', O.x, 510, { size: 36, align: 'center', alpha: ss(ramp(t, K.axes + .6, .5)), weight: 'bold', color: C.neonCyanCore, glow: true });
  text(g, '时间', 1010, O.y + 45, { size: 36, alpha: ss(ramp(t, K.axes + .6, .5)), weight: 'bold', color: C.neonCyanCore, glow: true });

  // Linear Line (Dim Grey Laser)
  const lineX = Math.min(1, lerp(0, .82, eio(ramp(t, K.lineStart, K.wall - K.lineStart))) + lerp(0, .18, ss(ramp(t, K.wall + .5, K.hit - K.wall - .5))));
  const s6 = ss(ramp(t, B[5], .8));
  if (lineX > 0) {
    const col = s6 > 0 ? 'rgba(139, 148, 158, 0.35)' : 'rgba(255, 255, 255, 0.85)';
    g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(v.px(0), v.py(0)); g.lineTo(v.px(lineX), v.py(.55 * lineX)); g.stroke();
    g.fillStyle = C.white; g.beginPath(); g.arc(v.px(lineX), v.py(.55 * lineX), 8, 0, Math.PI * 2); g.fill();
  }
  // Formula
  const fa = ss(ramp(t, K.formula1, .5)) * (1 - ss(ramp(t, B[5], .6)));
  rich(g, [['收入 = ', C.white], ['时间', C.neonRed], [' × 单价', C.white]], 540, 440, { size: 48, alpha: fa, reveal: (t - K.formula1) * 14, glow: true });
  text(g, '出卖时间', v.px(1) - 20, v.py(.55) + 65, { size: 30, color: C.textMute, align: 'right', alpha: s6 * (1 - ss(ramp(t, K.zoom, .6))), weight: 'bold' });

  // 24H Laser Wall (Glowing Electric Barrier)
  const wd = ramp(t, K.wall, .45);
  if (wd > 0) {
    const wx = v.px(1), drop = eo(wd), yTop = 580, yBot = lerp(yTop, O.y, drop);
    const hitK = Math.exp(-Math.max(0, t - K.hit) * 6) * (t >= K.hit ? 1 : 0);
    const wallA = 1 - .7 * ss(ramp(t, K.decouple, 1.2));
    g.save(); g.globalAlpha *= wallA;
    // Glowing laser beam
    g.strokeStyle = C.neonRed; g.shadowColor = C.neonRed; g.shadowBlur = 24 + 20 * hitK;
    g.lineWidth = 5 + 6 * hitK; g.setLineDash([18, 12]);
    const jx = hitK * 8 * Math.sin((t - K.hit) * 80);
    g.beginPath(); g.moveTo(wx + jx, yTop); g.lineTo(wx + jx, yBot); g.stroke(); g.setLineDash([]);
    g.shadowBlur = 0;
    text(g, '24 小时 / 天', wx, 545, { size: 32, color: C.neonRed, weight: 'bold', alpha: ss(ramp(t, K.wall + .2, .4)) * (1 - ss(ramp(t, K.zoom, .5))), glow: true });
    g.restore();

    // Spark Particles & Impact Explosion on hit
    if (t >= K.hit && t < B[2]) {
      const dt = t - K.hit;
      const hx = wx, hy = v.py(.55);
      g.save();
      for (const sp of SPARKS) {
        const px = hx + sp.vx * dt;
        const py = hy + sp.vy * dt + 0.5 * 900 * dt * dt;
        const life = clamp(1 - dt * 2.5);
        if (life > 0) {
          g.globalAlpha = life; g.fillStyle = sp.col; g.shadowColor = sp.col; g.shadowBlur = 12;
          g.beginPath(); g.arc(px, py, sp.size * life, 0, Math.PI * 2); g.fill();
        }
      }
      g.restore();
      text(g, '天花板', wx - 35, v.py(.55) - 80, { size: 48, color: C.neonRed, weight: 'bold', font: SERIF, align: 'right', alpha: ss(ramp(t, K.ceil, .3)) * (1 - ss(ramp(t, B[2], .5))), glow: true });
    }
  }

  // 3B1B High-Energy Exponential Beam (S6–S7)
  const cp = ramp(t, K.curve, 2.6);
  if (cp > 0) {
    const xEnd = lerp(0, 1.3, eio(cp)) * v.z;
    const pts = [];
    for (let k = 0; k <= 240; k++) {
      const x = xEnd * k / 240;
      pts.push([v.px(x), v.py(curveY(x))]);
    }
    g.save(); g.beginPath(); g.rect(O.x - 10, 520, 800, O.y - 510); g.clip();
    drawGlowLine(g, pts, C.neonRed, C.neonRedCore, 7, 28);
    // Glowing leading head tracer
    if (pts.length > 0) {
      const [hx, hy] = pts[pts.length - 1];
      g.fillStyle = C.white; g.shadowColor = C.neonRed; g.shadowBlur = 30;
      g.beginPath(); g.arc(hx, hy, 12, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    const la = ss(ramp(t, K.curve + 1.0, .5)) * (1 - ss(ramp(t, K.zoom, .5)));
    text(g, '杠杆', v.px(.75) - 35, v.py(curveY(.75)) - 48, { size: 36, color: C.neonRed, weight: 'bold', align: 'center', alpha: la, glow: true });
    text(g, '与时间脱钩', 540, 430, { size: 56, color: C.neonRed, weight: 'bold', font: SERIF, align: 'center', alpha: ss(ramp(t, K.decouple, .5)) * (1 - ss(ramp(t, K.zoom, .6))), glow: true });
  }

  // S7 Tag
  rich(g, [['长期游戏 · 复利', C.neonGold]], 540, 440, { size: 60, align: 'center', alpha: 1, reveal: (t - K.longtag) * 12, glow: true });
  g.restore();
}

// Formula Bar (Top)
const FORM = [['专长', 'k1'], ['×', 'x'], ['杠杆', 'k2'], ['×', 'x'], ['判断力', 'k3'], ['=', 'eq'], ['财富', 'eq']];
function drawFormula(g, t) {
  const A = win(t, B[3] + .2, K.end + .3, .6, .6); if (A <= 0) return;
  g.save(); g.font = `bold 46px ${SERIF}`;
  const gap = 20, ws = FORM.map(f => g.measureText(f[0]).width), total = ws.reduce((a, b) => a + b, 0) + gap * (FORM.length - 1);
  let x = W / 2 - total / 2; const y = 260;
  const on = { k1: K.sprout - .3, k2: K.lever - .2, k3: K.judge, eq: K.wealth };
  const cur = t < on.k2 ? 'k1' : t < on.k3 ? 'k2' : t < on.eq ? 'k3' : 'eq';
  FORM.forEach(([s, k], i) => {
    const kk = k === 'x' ? (i === 1 ? 'k2' : 'k3') : k;
    const lit = ss(ramp(t, on[kk], .5));
    let col = lit > 0 ? (kk === cur && t < K.end ? C.neonCyan : (k === 'eq' ? C.neonGold : C.white)) : 'rgba(255,255,255,0.25)';
    g.globalAlpha = A;
    if (lit > 0 && kk === cur) { g.shadowColor = col; g.shadowBlur = 18; } else { g.shadowBlur = 0; }
    g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(s, x, y);
    if (k !== 'x' && k !== 'eq' && kk === cur && t < K.end) {
      g.fillStyle = C.neonCyan; g.fillRect(x, y + 36, ws[i] * eo(ramp(t, on[kk], .5)), 4);
    }
    x += ws[i] + gap;
  });
  g.restore();
}

// Scene S1
function sceneHook(g, t) {
  const fly = eio(ramp(t, B[1], 1.1));
  const gA = graphAlpha(t);
  const cx = lerp(540, 980, fly), cy = lerp(680, 1420, fly), r = lerp(200, 30, fly);
  const hours = Math.max(0, (Math.min(t, B[1] + 1.1) - .4) * 1.55);
  const a = t < B[1] ? ss(ramp(t, .1, .6)) : (fly < 1 ? 1 : gA);
  clock(g, cx, cy, r, hours, a * (t < B[2] ? 1 : gA));

  const nCoins = Math.floor(hours), cA = 1 - ss(ramp(t, B[1], .6));
  for (let k = 0; k < Math.min(nCoins + 1, 12); k++) {
    const t0 = .4 + (k + 1) / 1.55, u = ramp(t, t0 - .35, .35);
    if (u <= 0) continue;
    const y = lerp(930, 1080 - k * 16, u * u);
    coin(g, 540, y, 110, cA * clamp(u * 3));
  }
  const ta = win(t, K.title, B[1] + .5, .5, .5);
  rich(g, [['出卖', C.white], ['时间', C.neonRed], ['，', C.white]], 540, 1220, { size: 78, alpha: ta, reveal: (t - K.title) * 14, glow: true });
  rich(g, [['能致富吗？', C.white]], 540, 1315, { size: 78, alpha: ta, reveal: (t - K.title - .3) * 14, glow: true });
}

// Scene S3 Quote
function moon(g, x, y, r, a) {
  if (a <= 0) return; g.save(); g.globalAlpha *= a;
  g.shadowColor = C.neonRed; g.shadowBlur = 30;
  g.fillStyle = C.neonRed; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(x + r * .45, y - r * .3, r * .88, 0, Math.PI * 2); g.fill();
  g.restore();
}
function sceneQuote(g, t) {
  const A = win(t, B[2] + .3, B[3] + .3, .6, .6); if (A <= 0) return;
  moon(g, 540, 560, 50, A * ss(ramp(t, B[2] + .4, .6)));
  text(g, '纳瓦尔说', 540, 680, { size: 40, color: C.textMute, alpha: A * ss(ramp(t, LS[2], .4)), weight: 'bold' });
  const rv = (t - K.quote) / Math.max(.5, LE[2] - K.quote) * 19;
  rich(g, [['财富，是在你', C.white], ['睡觉时', C.neonRed]], 540, 840, { size: 70, alpha: A, reveal: rv, glow: true });
  rich(g, [['仍在为你赚钱的资产。', C.white]], 540, 960, { size: 70, alpha: A, reveal: rv - 9, glow: true });
  text(g, '—— 意译自《纳瓦尔宝典》', 540, 1120, { size: 34, color: C.textMute, align: 'center', alpha: A * ss(ramp(t, LE[2], .5)) });
}

// Scene S4 专长之树
function sceneKnowledge(g, t) {
  const A = win(t, B[3] + .2, B[4] + .2, .5, .6); if (A <= 0) return;
  g.save(); g.globalAlpha = A;
  const cx = 540;
  const sa = eo(ramp(t, B[3] + .3, .6));
  // Curiosity glowing orb
  g.shadowColor = C.neonCyan; g.shadowBlur = 24;
  g.fillStyle = C.cardBg; g.strokeStyle = C.neonCyan; g.lineWidth = 4;
  g.beginPath(); g.arc(cx, 1380, 58 * back(sa), 0, Math.PI * 2); g.fill(); g.stroke();
  g.shadowBlur = 0;
  text(g, '?', cx, 1382, { size: 68, font: SERIF, weight: 'bold', color: C.neonCyanCore, alpha: sa });
  text(g, '好奇心', cx, 1475, { size: 36, color: C.textMute, weight: 'bold', alpha: ss(ramp(t, B[3] + .6, .5)) });

  const gp = eio(ramp(t, K.sprout, Math.max(.8, K.node - K.sprout)));
  const P = u => { const y = lerp(1322, 650, u); return [cx + Math.sin(u * Math.PI * 2) * 50, y]; };
  if (gp > 0) {
    const pts = [];
    for (let k = 0; k <= 80; k++) pts.push(P(gp * k / 80));
    drawGlowLine(g, pts, C.neonGreen, C.neonGreenCore, 6, 20);
    // glowing leaves
    for (const [u, side] of [[.25, -1], [.45, 1], [.68, -1], [.88, 1]]) {
      const la = eo(ramp(gp, u, .15)); if (la <= 0) continue;
      const [x, y] = P(u); g.save(); g.translate(x, y); g.rotate(side * .65); g.scale(la, la);
      g.fillStyle = C.neonGreen; g.shadowColor = C.neonGreen; g.shadowBlur = 14;
      g.beginPath(); g.ellipse(side * 36, 0, 36, 14, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }

  // Glowing 专长 Node
  const na = back(ramp(t, K.node, .5));
  if (na > 0) {
    const [x, y] = P(1);
    g.fillStyle = C.neonRed; g.shadowColor = C.neonRed; g.shadowBlur = 35;
    g.beginPath(); g.arc(x, y - 50, 84 * na, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    text(g, '专长', x, y - 50, { size: 54, font: SERIF, weight: 'bold', color: C.white, alpha: clamp(na) });
  }

  // Glassmorphic tags
  const tag = (s, x, y, t0) => {
    const u = eo(ramp(t, t0, .5)); if (u <= 0) return;
    g.save(); g.globalAlpha *= u;
    g.font = `bold 44px ${SANS}`; const w = g.measureText(s).width + 60;
    g.fillStyle = C.cardBg; g.strokeStyle = C.cardBorder; g.lineWidth = 2.5;
    g.shadowColor = C.neonCyan; g.shadowBlur = 16;
    rrect(g, x - w / 2, y - 44, w, 88, 44); g.fill(); g.stroke();
    g.shadowBlur = 0;
    text(g, s, x, y + 2, { size: 44, weight: 'bold', color: C.white, align: 'center' });
    g.restore();
  };
  tag('无法被培训', 310, 820, K.tag1);
  tag('源于好奇心', 770, 1020, K.tag2);
  g.restore();
}

// Scene S5 杠杆
function person(g, x, y, s, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y - s * .55, s * .28, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x, y + s * .25, s * .42, s * .4, 0, Math.PI, 0); g.fill(); }
function lock(g, x, y, a) {
  if (a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = C.textMute; g.fillStyle = C.textMute; g.lineWidth = 5;
  g.beginPath(); g.arc(x, y - 10, 13, Math.PI, 0); g.stroke(); rrect(g, x - 20, y - 10, 40, 30, 5); g.fill(); g.restore();
}
function sceneLeverage(g, t) {
  const A = win(t, B[4] + .2, B[5] + .3, .5, .6); if (A <= 0) return;
  g.save(); g.globalAlpha = A;
  text(g, '需要许可', 320, 420, { size: 36, color: C.textMute, weight: 'bold', alpha: ss(ramp(t, K.lock, .4)) });
  text(g, '无需许可', 760, 420, { size: 36, color: C.neonRed, weight: 'bold', alpha: ss(ramp(t, K.code, .4)), glow: true });

  const tile = (cx, cy, name, t0, perm, icon) => {
    const u = back(ramp(t, t0, .45)); if (u <= 0) return;
    g.save(); g.translate(cx, cy); g.scale(clamp(u, 0, 1.2), clamp(u, 0, 1.2));
    g.fillStyle = perm ? 'rgba(25, 30, 45, 0.8)' : 'rgba(45, 20, 30, 0.85)';
    g.strokeStyle = perm ? 'rgba(255, 255, 255, 0.15)' : C.neonRed;
    g.lineWidth = perm ? 2.5 : 4;
    if (!perm) { g.shadowColor = C.neonRed; g.shadowBlur = 24; }
    rrect(g, -170, -115, 340, 230, 22); g.fill(); g.stroke();
    g.shadowBlur = 0;
    icon(perm ? C.textMute : C.neonRedCore);
    text(g, name, 0, 70, { size: 48, font: SERIF, weight: 'bold', color: perm ? C.textMute : C.white });
    if (perm) lock(g, 130, -78, ss(ramp(t, K.lock, .3)));
    g.restore();
  };
  tile(320, 580, '劳动力', K.labor, true, c => { person(g, -46, -20, 44, c); person(g, 0, -28, 50, c); person(g, 46, -20, 44, c); });
  tile(320, 870, '资本', K.capital, true, () => { for (let k = 0; k < 4; k++) coin(g, 0, 0 - k * 14, 90, 1); });
  tile(760, 580, '代码', K.code, false, c => text(g, '</>', 0, -24, { size: 76, weight: 'bold', color: c, glow: true }));
  tile(760, 870, '媒体', K.media, false, c => {
    g.fillStyle = c; rrect(g, -55, -65, 110, 80, 14); g.fill();
    g.fillStyle = '#080B10'; g.beginPath(); g.moveTo(-14, -46); g.lineTo(22, -25); g.lineTo(-14, -4); g.closePath(); g.fill();
  });

  // Futuristic Lever bar
  const la = ss(ramp(t, K.lever, .5));
  if (la > 0) {
    g.save(); g.globalAlpha *= la;
    const px = 480, py = 1280, ang = lerp(.12, -.14, eio(ramp(t, K.tilt, .9)));
    // Fulcrum
    g.fillStyle = C.neonCyan; g.shadowColor = C.neonCyan; g.shadowBlur = 20;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px - 34, py + 58); g.lineTo(px + 34, py + 58); g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.translate(px, py); g.rotate(ang);
    // Metallic glowing bar
    g.fillStyle = '#1F293D'; g.strokeStyle = C.neonCyan; g.lineWidth = 2.5;
    rrect(g, -240, -12, 680, 12, 6); g.fill(); g.stroke();
    // Heavy mass
    g.fillStyle = '#3A4459'; rrect(g, -230, -12 - 96, 116, 96, 8); g.fill();
    // Downward Neon Arrow
    g.fillStyle = C.neonRed; g.shadowColor = C.neonRed; g.shadowBlur = 20;
    g.beginPath(); g.moveTo(420, -70); g.lineTo(400, -110); g.lineTo(440, -110); g.closePath(); g.fill();
    g.fillRect(414, -150, 12, 42);
    g.restore();
  }
  g.restore();
}

// Scene S8 End
function sceneEnd(g, t) {
  const A = ss(ramp(t, K.end, .7)); if (A <= 0) return;
  clock(g, 540, 600, 84, 10, A * .9);
  rich(g, [['用', C.white], ['头脑', C.neonRed], ['赚钱，', C.white]], 540, 820, { size: 84, alpha: A, reveal: (t - K.end) * 14, glow: true });
  rich(g, [['而不是用', C.white], ['时间', C.textMute], ['。', C.white]], 540, 940, { size: 84, alpha: A, reveal: (t - K.end - .5) * 14, glow: true });
  const b = ss(ramp(t, LE[7] + .1, .7));
  g.save(); g.globalAlpha = b; g.fillStyle = C.rule; g.fillRect(540 - 100 * b, 1050, 200 * b, 3); g.restore();
  text(g, '《纳瓦尔宝典》', 540, 1140, { size: 58, font: SERIF, weight: 'bold', color: C.white, alpha: b });
  text(g, '书籍解读 · 3Blue1Brown 风格', 540, 1220, { size: 34, color: C.neonCyanCore, alpha: b, glow: true });
}

// Subtitles (Neon Glow)
const SUBS = []; VO.forEach((l, i) => {
  const pages = l.show.split('|'), n = pages.reduce((s, p) => s + p.length, 0);
  let t0 = LS[i]; const span = (LE[i] + .3) - LS[i];
  pages.forEach((p, k) => { const d = span * p.length / n; SUBS.push({ s: p, a: t0, b: k === pages.length - 1 ? LE[i] + .3 : t0 + d }); t0 += d; });
});
function drawSubs(g, t) {
  for (const s of SUBS) {
    const a = win(t, s.a, s.b, .12, .15); if (a <= 0) continue;
    // Glassmorphic subtitle background pill
    g.save(); g.globalAlpha = a;
    g.font = `bold 44px ${SANS}`; const w = g.measureText(s.s).width + 60;
    g.fillStyle = 'rgba(12, 17, 28, 0.85)'; g.strokeStyle = 'rgba(255, 255, 255, 0.12)'; g.lineWidth = 2;
    rrect(g, 540 - w / 2, 1680 - 46, w, 92, 46); g.fill(); g.stroke();
    text(g, s.s, 540, 1680 + 2, { size: 44, color: C.white, weight: 'bold' });
    g.restore();
  }
}

// Screen trauma shake on collision
function getShake(t) {
  if (t < K.hit || t > K.hit + 0.6) return [0, 0];
  const dt = t - K.hit;
  const decay = Math.exp(-dt * 9);
  const dx = decay * 18 * Math.sin(dt * 75);
  const dy = decay * 14 * Math.cos(dt * 90);
  return [dx, dy];
}

// Master frame(t)
export function frame(g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  // Apply camera shake if any
  const [sx, sy] = getShake(t);
  g.translate(sx, sy);

  g.drawImage(BG, -20, -20, W + 40, H + 40);
  // Header
  text(g, '书籍解读｜《纳瓦尔宝典》', 540, 140, { size: 32, color: C.textMute, align: 'center', alpha: ss(ramp(t, .1, .8)), weight: 'bold' });
  drawGraph(g, t, graphAlpha(t));
  sceneHook(g, t);
  drawFormula(g, t);
  sceneKnowledge(g, t);
  sceneLeverage(g, t);
  if (t > B[2] && t < B[3] + .5) { LAYER_G.clearRect(0, 0, W, H); sceneQuote(LAYER_G, t); g.drawImage(LAYER, 0, 0); }
  sceneEnd(g, t);
  drawSubs(g, t);
  // Bottom Glowing Progress Bar
  g.save();
  g.fillStyle = C.neonRed; g.shadowColor = C.neonRed; g.shadowBlur = 12;
  g.fillRect(0, H - 8, W * t / DUR, 8);
  g.restore();
}
const LAYER = createCanvas(W, H), LAYER_G = LAYER.getContext('2d');

// CLI
const argv = process.argv.slice(2), opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
if (argv.includes('--still')) {
  const ts = opt('--still').split(',').map(Number), out = argv[argv.indexOf('--still') + 2];
  const c = createCanvas(W, H), g = c.getContext('2d');
  for (const t of ts) { frame(g, t); const p = ts.length > 1 ? out.replace('.png', `_${t.toFixed(1)}.png`) : out; fs.writeFileSync(p, c.toBuffer('image/png')); console.log(p); }
} else if (opt('--out')) {
  const start = +(opt('--start') ?? 0), n = +(opt('--frames') ?? NFRAMES - start);
  const c = createCanvas(W, H), g = c.getContext('2d');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', `${FPS}`, '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-an', opt('--out')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = start; i < start + n; i++) {
    frame(g, i / FPS);
    const buf = Buffer.from(g.getImageData(0, 0, W, H).data.buffer);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - start) % 150 === 0) console.log(`frame ${i} ${((Date.now() - t0) / (i - start + 1)).toFixed(0)} ms/f`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log('done', opt('--out'));
}
