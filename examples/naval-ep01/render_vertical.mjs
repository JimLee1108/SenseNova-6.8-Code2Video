// 《纳瓦尔宝典》竖屏样片 (9:16, 1080x1920) — Node canvas renderer
// usage:
//   node render_vertical.mjs --still 13.0 out/stills_v/still.png
//   node render_vertical.mjs --out out/video_v_raw.mp4
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const W = 1080, H = 1920, FPS = 30, DUR = 60, NFRAMES = DUR * FPS;
const C = { paper: '#F2ECE0', ink: '#22201C', mute: '#8C857A', rule: '#D6CCBA', faint: '#E6DDCC', acc: '#C23B22', accSoft: '#F3DED6', coin: '#E4D3B0' };
const SERIF = '"Noto Serif CJK SC"', SANS = '"Noto Sans CJK SC"';

// load audio timing
const timeline = JSON.parse(fs.readFileSync('build/timeline.json', 'utf8'));
const VO = JSON.parse(fs.readFileSync('build/vo/timing.json', 'utf8')).lines;
const { START, LS, LE, B, K } = timeline;

// easing
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ss = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const eo = u => 1 - Math.pow(1 - clamp(u), 3);
const eio = u => { u = clamp(u); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const ramp = (t, a, d) => clamp((t - a) / d);
const win = (t, a, b, fi = .5, fo = .5) => Math.min(ss((t - a) / fi), 1 - ss((t - (b - fo)) / fo));
const back = u => { u = clamp(u); const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// paper background
function makePaper() {
  const c = createCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data, rnd = mulberry32(1108);
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n * .9; }
  g.putImageData(img, 0, 0);
  const rg = g.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .85);
  rg.addColorStop(0, 'rgba(60,40,20,0)'); rg.addColorStop(1, 'rgba(60,40,20,0.18)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return c;
}
const PAPER = makePaper();

// primitives
function text(g, s, x, y, { size = 40, font = SANS, weight = '', color = C.ink, align = 'center', alpha = 1, base = 'middle' } = {}) {
  if (alpha <= 0) return; g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${font}`.trim();
  g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); g.restore();
}
function rich(g, segs, x, y, { size, font = SERIF, weight = 'bold', alpha = 1, reveal = 1e9, align = 'center' }) {
  g.save(); g.font = `${weight} ${size}px ${font}`; g.textBaseline = 'middle'; g.textAlign = 'left';
  const full = segs.map(s => s[0]).join(''), w = g.measureText(full).width;
  let cx = align === 'center' ? x - w / 2 : x, n = 0;
  for (const [s, col] of segs) for (const ch of s) {
    const a = clamp(reveal - n) * alpha; n++;
    const cw = g.measureText(ch).width;
    if (a > 0) { g.globalAlpha = a; g.fillStyle = col; g.fillText(ch, cx, y + (1 - a) * 8); }
    cx += cw;
  }
  g.restore(); return w;
}
function arrowLine(g, x0, y0, x1, y1, col, lw) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0), s = 16;
  g.beginPath(); g.moveTo(x1 + Math.cos(a) * 4, y1 + Math.sin(a) * 4);
  g.lineTo(x1 - s * Math.cos(a - .45), y1 - s * Math.sin(a - .45)); g.lineTo(x1 - s * Math.cos(a + .45), y1 - s * Math.sin(a + .45)); g.closePath(); g.fill();
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

function clock(g, cx, cy, r, hours, alpha, col = C.ink) {
  if (alpha <= 0) return; g.save(); g.globalAlpha *= alpha;
  g.fillStyle = '#FBF7EF'; g.strokeStyle = col; g.lineWidth = Math.max(2, r * .045);
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2, r0 = r * (k % 3 ? .86 : .78);
    g.lineWidth = Math.max(1.5, r * (k % 3 ? .02 : .04));
    g.beginPath(); g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); g.lineTo(cx + Math.sin(a) * r * .93, cy - Math.cos(a) * r * .93); g.stroke();
  }
  const hand = (ang, len, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - Math.sin(ang) * len * .15, cy + Math.cos(ang) * len * .15); g.lineTo(cx + Math.sin(ang) * len, cy - Math.cos(ang) * len); g.stroke(); };
  hand((hours + 9) / 12 * Math.PI * 2, r * .5, Math.max(3, r * .06), col);
  hand(hours * Math.PI * 2, r * .75, Math.max(2, r * .035), C.acc);
  g.fillStyle = col; g.beginPath(); g.arc(cx, cy, Math.max(3, r * .05), 0, Math.PI * 2); g.fill();
  g.restore();
}
function coin(g, x, y, w, alpha) {
  if (alpha <= 0) return; g.save(); g.globalAlpha *= alpha;
  const h = w * .3;
  g.fillStyle = '#CDB88E'; g.beginPath(); g.ellipse(x, y + h * .35, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.coin; g.strokeStyle = '#9C8656'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

function mixHex(a, b, u) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), Bc = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, Bc[i], u)).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- vertical graph layout
// Origin at bottom-left of stage: (160, 1420), width 760, height 800
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

function drawGraph(g, t, A) {
  if (A <= 0) return;
  const v = graphView(t);
  g.save(); g.globalAlpha *= A;
  // axes
  const ua = eo(ramp(t, K.axes, 1.0));
  arrowLine(g, O.x, O.y, lerp(O.x, 980, ua), O.y, C.ink, 4);
  arrowLine(g, O.x, O.y, O.x, lerp(O.y, 560, ua), C.ink, 4);
  text(g, '收入', O.x, 520, { size: 36, align: 'center', alpha: ss(ramp(t, K.axes + .6, .5)), weight: 'bold' });
  text(g, '时间', 1010, O.y + 45, { size: 36, alpha: ss(ramp(t, K.axes + .6, .5)), weight: 'bold' });

  // linear line
  const lineX = Math.min(1, lerp(0, .82, eio(ramp(t, K.lineStart, K.wall - K.lineStart))) + lerp(0, .18, ss(ramp(t, K.wall + .5, K.hit - K.wall - .5))));
  const s6 = ss(ramp(t, B[5], .8));
  if (lineX > 0) {
    g.strokeStyle = s6 > 0 ? mixHex(C.ink, C.mute, s6) : C.ink; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(v.px(0), v.py(0)); g.lineTo(v.px(lineX), v.py(.55 * lineX)); g.stroke();
    g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(v.px(lineX), v.py(.55 * lineX), 9, 0, Math.PI * 2); g.fill();
  }
  // formula label
  const fa = ss(ramp(t, K.formula1, .5)) * (1 - ss(ramp(t, B[5], .6)));
  rich(g, [['收入 = ', C.ink], ['时间', C.acc], [' × 单价', C.ink]], 540, 440, { size: 48, alpha: fa, reveal: (t - K.formula1) * 14 });
  text(g, '出卖时间', v.px(1) - 20, v.py(.55) + 65, { size: 30, color: C.mute, align: 'right', alpha: s6 * (1 - ss(ramp(t, K.zoom, .6))), weight: 'bold' });

  // 24h wall
  const wd = ramp(t, K.wall, .45);
  if (wd > 0) {
    const wx = v.px(1), drop = eo(wd), yTop = 580, yBot = lerp(yTop, O.y, drop);
    const hitK = Math.exp(-Math.max(0, t - K.hit) * 6) * (t >= K.hit ? 1 : 0);
    const wallA = 1 - .7 * ss(ramp(t, K.decouple, 1.2));
    g.save(); g.globalAlpha *= wallA;
    g.strokeStyle = C.acc; g.lineWidth = 6 + 6 * hitK; g.setLineDash([20, 12]);
    const jx = hitK * 6 * Math.sin((t - K.hit) * 70);
    g.beginPath(); g.moveTo(wx + jx, yTop); g.lineTo(wx + jx, yBot); g.stroke(); g.setLineDash([]);
    text(g, '24 小时 / 天', wx, 545, { size: 32, color: C.acc, weight: 'bold', alpha: ss(ramp(t, K.wall + .2, .4)) * (1 - ss(ramp(t, K.zoom, .5))) });
    g.restore();
    // impact
    const ia = ss(ramp(t, K.hit, .15)) * (1 - ss(ramp(t, B[2], .5)));
    if (ia > 0) {
      const hx = wx, hy = v.py(.55), e = eo(ramp(t, K.hit, .5));
      g.save(); g.globalAlpha *= ia * (1 - .6 * e); g.strokeStyle = C.acc; g.lineWidth = 4; g.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const a = Math.PI * (.6 + k * .16); g.beginPath(); g.moveTo(hx + Math.cos(a) * (18 + 10 * e), hy + Math.sin(a) * (18 + 10 * e)); g.lineTo(hx + Math.cos(a) * (36 + 26 * e), hy + Math.sin(a) * (36 + 26 * e)); g.stroke(); }
      g.restore();
      text(g, '天花板', hx - 30, hy - 80, { size: 44, color: C.acc, weight: 'bold', font: SERIF, align: 'right', alpha: ss(ramp(t, K.ceil, .3)) * (1 - ss(ramp(t, B[2], .5))) });
    }
  }

  // leveraged curve
  const cp = ramp(t, K.curve, 2.6);
  if (cp > 0) {
    const xEnd = lerp(0, 1.3, eio(cp)) * v.z;
    g.save(); g.beginPath(); g.rect(O.x - 10, 520, 800, O.y - 510); g.clip();
    g.strokeStyle = C.acc; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    for (let k = 0; k <= 240; k++) { const x = xEnd * k / 240, X = v.px(x), Y = v.py(curveY(x)); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }
    g.stroke(); g.restore();
    const la = ss(ramp(t, K.curve + 1.0, .5)) * (1 - ss(ramp(t, K.zoom, .5)));
    text(g, '杠杆', v.px(.75) - 35, v.py(curveY(.75)) - 45, { size: 36, color: C.acc, weight: 'bold', align: 'center', alpha: la });
    text(g, '与时间脱钩', 540, 430, { size: 54, color: C.acc, weight: 'bold', font: SERIF, align: 'center', alpha: ss(ramp(t, K.decouple, .5)) * (1 - ss(ramp(t, K.zoom, .6))) });
  }
  // S7 tag
  rich(g, [['长期游戏 · 复利', C.acc]], 540, 440, { size: 58, align: 'center', alpha: 1, reveal: (t - K.longtag) * 12 });
  g.restore();
}

// ---------------------------------------------------------------- formula bar (S4–S7)
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
    let col = mixHex(C.rule, C.ink, lit);
    if (k !== 'x' && kk === cur && t < K.end) col = mixHex(col, C.acc, lit);
    if (k === 'eq') col = mixHex(C.paper, C.acc, lit);
    g.globalAlpha = A; g.fillStyle = col; g.textBaseline = 'middle'; g.fillText(s, x, y + (k === 'eq' ? (1 - lit) * 8 : 0));
    if (k !== 'x' && k !== 'eq' && kk === cur && t < K.end) { g.fillStyle = C.acc; g.fillRect(x, y + 36, ws[i] * eo(ramp(t, on[kk], .5)), 4); }
    x += ws[i] + gap;
  });
  g.restore();
}

// ---------------------------------------------------------------- scenes
function sceneHook(g, t) {
  const fly = eio(ramp(t, B[1], 1.1));
  const gA = graphAlpha(t);
  const cx = lerp(540, 980, fly), cy = lerp(680, 1420, fly), r = lerp(200, 30, fly);
  const hours = Math.max(0, (Math.min(t, B[1] + 1.1) - .4) * 1.55);
  const a = t < B[1] ? ss(ramp(t, .1, .6)) : (fly < 1 ? 1 : gA);
  clock(g, cx, cy, r, hours, a * (t < B[2] ? 1 : gA));

  // coins stacked directly below clock in vertical mode
  const nCoins = Math.floor(hours), cA = 1 - ss(ramp(t, B[1], .6));
  for (let k = 0; k < Math.min(nCoins + 1, 12); k++) {
    const t0 = .4 + (k + 1) / 1.55, u = ramp(t, t0 - .35, .35);
    if (u <= 0) continue;
    const y = lerp(930, 1080 - k * 16, u * u);
    coin(g, 540, y, 110, cA * clamp(u * 3));
  }
  const ta = win(t, K.title, B[1] + .5, .5, .5);
  rich(g, [['出卖', C.ink], ['时间', C.acc], ['，', C.ink]], 540, 1220, { size: 76, alpha: ta, reveal: (t - K.title) * 14 });
  rich(g, [['能致富吗？', C.ink]], 540, 1315, { size: 76, alpha: ta, reveal: (t - K.title - .3) * 14 });
}

function moon(g, x, y, r, a) {
  if (a <= 0) return; g.save(); g.globalAlpha *= a;
  g.fillStyle = C.acc; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + r * .45, y - r * .3, r * .88, 0, Math.PI * 2); g.fill();
  g.restore();
}
function sceneQuote(g, t) {
  const A = win(t, B[2] + .3, B[3] + .3, .6, .6); if (A <= 0) return;
  moon(g, 540, 560, 50, A * ss(ramp(t, B[2] + .4, .6)));
  text(g, '纳瓦尔说', 540, 680, { size: 40, color: C.mute, alpha: A * ss(ramp(t, LS[2], .4)), weight: 'bold' });
  const rv = (t - K.quote) / Math.max(.5, LE[2] - K.quote) * 19;
  rich(g, [['财富，是在你', C.ink], ['睡觉时', C.acc]], 540, 840, { size: 68, alpha: A, reveal: rv });
  rich(g, [['仍在为你赚钱的资产。', C.ink]], 540, 960, { size: 68, alpha: A, reveal: rv - 9 });
  text(g, '—— 意译自《纳瓦尔宝典》', 540, 1120, { size: 34, color: C.mute, align: 'center', alpha: A * ss(ramp(t, LE[2], .5)) });
}

function sceneKnowledge(g, t) {
  const A = win(t, B[3] + .2, B[4] + .2, .5, .6); if (A <= 0) return;
  g.save(); g.globalAlpha = A;
  const cx = 540;
  // curiosity seed at bottom
  const sa = eo(ramp(t, B[3] + .3, .6));
  g.strokeStyle = C.ink; g.lineWidth = 4; g.fillStyle = '#FBF7EF';
  g.beginPath(); g.arc(cx, 1380, 58 * back(sa), 0, Math.PI * 2); g.fill(); g.stroke();
  text(g, '?', cx, 1382, { size: 68, font: SERIF, weight: 'bold', alpha: sa });
  text(g, '好奇心', cx, 1475, { size: 36, color: C.mute, weight: 'bold', alpha: ss(ramp(t, B[3] + .6, .5)) });
  // stem grows upwards to y=640
  const gp = eio(ramp(t, K.sprout, Math.max(.8, K.node - K.sprout)));
  const P = u => { const y = lerp(1322, 650, u); return [cx + Math.sin(u * Math.PI * 2) * 50, y]; };
  if (gp > 0) {
    g.strokeStyle = '#4E6B3A'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath();
    for (let k = 0; k <= 80; k++) { const [x, y] = P(gp * k / 80); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (const [u, side] of [[.25, -1], [.45, 1], [.68, -1], [.88, 1]]) {
      const la = eo(ramp(gp, u, .15)); if (la <= 0) continue;
      const [x, y] = P(u); g.save(); g.translate(x, y); g.rotate(side * .65); g.scale(la, la);
      g.fillStyle = '#6E8B4E'; g.beginPath(); g.ellipse(side * 36, 0, 36, 14, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  // 专长 node at top
  const na = back(ramp(t, K.node, .5));
  if (na > 0) {
    const [x, y] = P(1); g.fillStyle = C.acc; g.beginPath(); g.arc(x, y - 50, 84 * na, 0, Math.PI * 2); g.fill();
    text(g, '专长', x, y - 50, { size: 54, font: SERIF, weight: 'bold', color: '#FFF8F0', alpha: clamp(na) });
  }
  // two callout cards on sides
  const tag = (s, x, y, t0) => {
    const u = eo(ramp(t, t0, .5)); if (u <= 0) return;
    g.save(); g.globalAlpha *= u;
    g.font = `bold 44px ${SANS}`; const w = g.measureText(s).width + 60;
    g.fillStyle = '#FBF7EF'; g.strokeStyle = C.ink; g.lineWidth = 3; rrect(g, x - w / 2, y - 44, w, 88, 44); g.fill(); g.stroke();
    text(g, s, x, y + 2, { size: 44, weight: 'bold', align: 'center' });
    g.restore();
  };
  tag('无法被培训', 310, 820, K.tag1);
  tag('源于好奇心', 770, 1020, K.tag2);
  g.restore();
}

function person(g, x, y, s, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y - s * .55, s * .28, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x, y + s * .25, s * .42, s * .4, 0, Math.PI, 0); g.fill(); }
function lock(g, x, y, a) {
  if (a <= 0) return; g.save(); g.globalAlpha *= a; g.strokeStyle = C.mute; g.fillStyle = C.mute; g.lineWidth = 5;
  g.beginPath(); g.arc(x, y - 10, 13, Math.PI, 0); g.stroke(); rrect(g, x - 20, y - 10, 40, 30, 5); g.fill(); g.restore();
}

function sceneLeverage(g, t) {
  const A = win(t, B[4] + .2, B[5] + .3, .5, .6); if (A <= 0) return;
  g.save(); g.globalAlpha = A;
  text(g, '需要许可', 320, 420, { size: 36, color: C.mute, weight: 'bold', alpha: ss(ramp(t, K.lock, .4)) });
  text(g, '无需许可', 760, 420, { size: 36, color: C.acc, weight: 'bold', alpha: ss(ramp(t, K.code, .4)) });

  // 2x2 grid in vertical format: Left column = permissioned, Right column = permissionless
  const tile = (cx, cy, name, t0, perm, icon) => {
    const u = back(ramp(t, t0, .45)); if (u <= 0) return;
    g.save(); g.translate(cx, cy); g.scale(clamp(u, 0, 1.2), clamp(u, 0, 1.2));
    g.fillStyle = perm ? '#E9E1D2' : C.accSoft; g.strokeStyle = perm ? C.mute : C.acc; g.lineWidth = 4;
    rrect(g, -170, -115, 340, 230, 22); g.fill(); g.stroke();
    icon(perm ? C.mute : C.acc);
    text(g, name, 0, 70, { size: 48, font: SERIF, weight: 'bold', color: perm ? '#5E584F' : C.acc });
    if (perm) lock(g, 130, -78, ss(ramp(t, K.lock, .3)));
    g.restore();
  };
  tile(320, 580, '劳动力', K.labor, true, c => { person(g, -46, -20, 44, c); person(g, 0, -28, 50, c); person(g, 46, -20, 44, c); });
  tile(320, 870, '资本', K.capital, true, () => { for (let k = 0; k < 4; k++) coin(g, 0, 0 - k * 14, 90, 1); });
  tile(760, 580, '代码', K.code, false, c => text(g, '</>', 0, -24, { size: 76, weight: 'bold', color: c }));
  tile(760, 870, '媒体', K.media, false, c => { g.fillStyle = c; rrect(g, -55, -65, 110, 80, 14); g.fill(); g.fillStyle = C.accSoft; g.beginPath(); g.moveTo(-14, -46); g.lineTo(22, -25); g.lineTo(-14, -4); g.closePath(); g.fill(); });

  // lever below at y=1280
  const la = ss(ramp(t, K.lever, .5));
  if (la > 0) {
    g.save(); g.globalAlpha *= la;
    const px = 480, py = 1280, ang = lerp(.12, -.14, eio(ramp(t, K.tilt, .9)));
    g.fillStyle = C.ink; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 34, py + 58); g.lineTo(px + 34, py + 58); g.closePath(); g.fill();
    g.translate(px, py); g.rotate(ang);
    g.fillStyle = C.ink; rrect(g, -240, -12, 680, 12, 6); g.fill();
    g.fillStyle = '#5E584F'; rrect(g, -230, -12 - 96, 116, 96, 8); g.fill();
    g.fillStyle = C.acc; g.beginPath(); g.moveTo(420, -70); g.lineTo(400, -110); g.lineTo(440, -110); g.closePath(); g.fill();
    g.fillRect(414, -150, 12, 42);
    g.restore();
  }
  g.restore();
}

function sceneEnd(g, t) {
  const A = ss(ramp(t, K.end, .7)); if (A <= 0) return;
  clock(g, 540, 600, 84, 10, A * .9, C.mute);
  rich(g, [['用', C.ink], ['头脑', C.acc], ['赚钱，', C.ink]], 540, 820, { size: 84, alpha: A, reveal: (t - K.end) * 14 });
  rich(g, [['而不是用', C.ink], ['时间', C.mute], ['。', C.ink]], 540, 940, { size: 84, alpha: A, reveal: (t - K.end - .5) * 14 });
  const b = ss(ramp(t, LE[7] + .1, .7));
  g.save(); g.globalAlpha = b; g.fillStyle = C.rule; g.fillRect(540 - 100 * b, 1050, 200 * b, 3); g.restore();
  text(g, '《纳瓦尔宝典》', 540, 1140, { size: 58, font: SERIF, weight: 'bold', color: C.ink, alpha: b });
  text(g, '书籍解读 · 样片', 540, 1220, { size: 34, color: C.mute, alpha: b });
}

// ---------------------------------------------------------------- subtitles (bottom safe area: y=1680)
const SUBS = []; VO.forEach((l, i) => {
  const pages = l.show.split('|'), n = pages.reduce((s, p) => s + p.length, 0);
  let t0 = LS[i]; const span = (LE[i] + .3) - LS[i];
  pages.forEach((p, k) => { const d = span * p.length / n; SUBS.push({ s: p, a: t0, b: k === pages.length - 1 ? LE[i] + .3 : t0 + d }); t0 += d; });
});
function drawSubs(g, t) {
  for (const s of SUBS) {
    const a = win(t, s.a, s.b, .12, .15); if (a <= 0) continue;
    text(g, s.s, 540, 1680, { size: 44, color: C.ink, alpha: a, weight: 'bold' });
  }
}

// ---------------------------------------------------------------- frame(t)
export function frame(g, t) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.drawImage(PAPER, 0, 0);
  // header
  text(g, '书籍解读｜《纳瓦尔宝典》', 540, 140, { size: 32, color: C.mute, align: 'center', alpha: ss(ramp(t, .1, .8)), weight: 'bold' });
  drawGraph(g, t, graphAlpha(t));
  sceneHook(g, t);
  drawFormula(g, t);
  sceneKnowledge(g, t);
  sceneLeverage(g, t);
  if (t > B[2] && t < B[3] + .5) { LAYER_G.clearRect(0, 0, W, H); sceneQuote(LAYER_G, t); g.drawImage(LAYER, 0, 0); }
  sceneEnd(g, t);
  drawSubs(g, t);
  // bottom progress bar
  g.fillStyle = C.acc; g.globalAlpha = .55; g.fillRect(0, H - 8, W * t / DUR, 8); g.globalAlpha = 1;
}
const LAYER = createCanvas(W, H), LAYER_G = LAYER.getContext('2d');

// ---------------------------------------------------------------- CLI
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
