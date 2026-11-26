// 街の質感をすべて canvas で生成する（外部素材なし・決定的）
import * as THREE from 'three';
import {mulberry32} from '../../lib/rand';

const cache = new Map<string, THREE.Texture>();
const make = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, r: () => number) => void, repeat?: [number, number], srgb = true) => {
  const hit = cache.get(key);
  if (hit) {
    const t = hit.clone();
    if (repeat) t.repeat.set(...repeat);
    t.needsUpdate = true;
    return t;
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, mulberry32(key.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0));
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  cache.set(key, t);
  const out = t.clone();
  if (repeat) out.repeat.set(...repeat);
  out.needsUpdate = true;
  return out;
};

const speckle = (ctx: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, dark: string, light: string, size = 2) => {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() < 0.5 ? dark : light;
    ctx.globalAlpha = 0.08 + r() * 0.18;
    const s = size * (0.5 + r());
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.globalAlpha = 1;
};

// アスファルト
export const asphalt = (repeat: [number, number]) =>
  make(
    'asphalt',
    512,
    512,
    (ctx, r) => {
      ctx.fillStyle = '#55585e';
      ctx.fillRect(0, 0, 512, 512);
      speckle(ctx, r, 512, 512, 9000, '#2e3034', '#8a8d92', 2);
      // 補修跡・しみ
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = r() < 0.5 ? '#3b3d42' : '#6a6d72';
        ctx.beginPath();
        ctx.ellipse(r() * 512, r() * 512, 30 + r() * 60, 10 + r() * 30, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    repeat,
  );

// 歩道・広場のコンクリート平板（目地あり）
export const paving = (repeat: [number, number], tone = '#b9b6ae') =>
  make(
    `paving-${tone}`,
    512,
    512,
    (ctx, r) => {
      ctx.fillStyle = tone;
      ctx.fillRect(0, 0, 512, 512);
      speckle(ctx, r, 512, 512, 7000, '#77736b', '#e2dfd8', 2);
      ctx.strokeStyle = 'rgba(70,66,60,0.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 128, 0);
        ctx.lineTo(i * 128, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * 128);
        ctx.lineTo(512, i * 128);
        ctx.stroke();
      }
      // 汚れ
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#5a564f';
        ctx.beginPath();
        ctx.ellipse(r() * 512, r() * 512, 20 + r() * 50, 10 + r() * 30, r() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    repeat,
  );

// 横断歩道・白線
export const roadMarks = () =>
  make('roadmarks', 64, 64, (ctx) => {
    ctx.fillStyle = '#efeee8';
    ctx.fillRect(0, 0, 64, 64);
  });

export type FacadeStyle = {base: string; frame: string; glass: string; floors: number; cols: number; balcony?: boolean; shop?: boolean; tile?: boolean};

// 建物の外壁（窓・サッシ・バルコニー・1階の店舗）。emissive 用に夜の明かりマスクも作る
export const facade = (seed: number, s: FacadeStyle) => {
  const W = 256, H = Math.max(256, s.floors * 64);
  const draw = (night: boolean) => (ctx: CanvasRenderingContext2D, r: () => number) => {
    ctx.fillStyle = night ? '#000' : s.base;
    ctx.fillRect(0, 0, W, H);
    if (!night) {
      speckle(ctx, r, W, H, 2500, 'rgba(0,0,0,0.6)', 'rgba(255,255,255,0.6)', 2);
      if (s.tile)
        for (let y = 0; y < H; y += 8) {
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          ctx.fillRect(0, y, W, 1);
        }
      // 雨だれの汚れ
      for (let i = 0; i < 14; i++) {
        const x = r() * W;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(40,40,40,0.0)');
        g.addColorStop(1, 'rgba(40,40,40,0.12)');
        ctx.fillStyle = g;
        ctx.fillRect(x, r() * H * 0.5, 2 + r() * 4, H);
      }
    }
    const fh = H / s.floors;
    const cw = W / s.cols;
    const rr = mulberry32(seed * 7 + 1);
    for (let f = 0; f < s.floors; f++) {
      const y = H - (f + 1) * fh;
      if (f === 0 && s.shop) {
        // 1階：店舗のガラス面と庇
        if (!night) {
          ctx.fillStyle = '#2b3340';
          ctx.fillRect(6, y + fh * 0.22, W - 12, fh * 0.78);
          ctx.fillStyle = '#d9e4ec';
          ctx.globalAlpha = 0.35;
          ctx.fillRect(10, y + fh * 0.26, W - 20, fh * 0.3);
          ctx.globalAlpha = 1;
          ctx.fillStyle = ['#c0392b', '#2c6e9b', '#2f7d4f', '#b8862b'][seed % 4];
          ctx.fillRect(0, y + fh * 0.08, W, fh * 0.14);
        } else {
          ctx.fillStyle = '#ffe2a8';
          ctx.fillRect(6, y + fh * 0.22, W - 12, fh * 0.78);
        }
        continue;
      }
      for (let c = 0; c < s.cols; c++) {
        const x = c * cw;
        const lit = rr() < 0.55;
        if (night) {
          if (lit) {
            ctx.fillStyle = rr() < 0.7 ? '#ffd79a' : '#dfe9ff';
            ctx.globalAlpha = 0.6 + rr() * 0.4;
            ctx.fillRect(x + cw * 0.14, y + fh * 0.2, cw * 0.72, fh * 0.55);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        ctx.fillStyle = s.frame;
        ctx.fillRect(x + cw * 0.1, y + fh * 0.16, cw * 0.8, fh * 0.63);
        const g = ctx.createLinearGradient(0, y, 0, y + fh);
        g.addColorStop(0, s.glass);
        g.addColorStop(1, '#3b4a5a');
        ctx.fillStyle = g;
        ctx.fillRect(x + cw * 0.14, y + fh * 0.2, cw * 0.72, fh * 0.55);
        // カーテン
        if (rr() < 0.5) {
          ctx.fillStyle = 'rgba(235,228,210,0.55)';
          ctx.fillRect(x + cw * 0.14, y + fh * 0.2, cw * 0.72 * (0.3 + rr() * 0.4), fh * 0.55);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x + cw * 0.5 - 1, y + fh * 0.2, 2, fh * 0.55);
        if (s.balcony) {
          ctx.fillStyle = 'rgba(210,210,205,0.95)';
          ctx.fillRect(x, y + fh * 0.72, cw, fh * 0.2);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x, y + fh * 0.9, cw, fh * 0.03);
        }
      }
      // 階の境目
      if (!night) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, y + fh - 3, W, 3);
      }
    }
  };
  const key = `facade-${seed}-${s.floors}-${s.cols}-${s.base}-${s.shop}-${s.balcony}`;
  return {map: make(key, W, H, draw(false)), emissive: make(key + '-n', W, H, draw(true))};
};

// 看板（縦型・横型）。一般的な業種名のみ
const SIGN_WORDS = ['珈琲', '薬', 'ホテル', '居酒屋', '歯科', 'らーめん', '不動産', '書店', '花', 'クリーニング', '定食', '眼科'];
export const signTex = (i: number, vertical = true) => {
  const word = SIGN_WORDS[i % SIGN_WORDS.length];
  const bg = ['#c0392b', '#f5f1e6', '#1f4e79', '#f1c40f', '#2e7d32', '#ffffff'][i % 6];
  const fg = ['#ffffff', '#c0392b', '#ffffff', '#222222', '#ffffff', '#1f4e79'][i % 6];
  const W = vertical ? 96 : 384, H = vertical ? 384 : 96;
  return make(`sign-${i}-${vertical}`, W, H, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    ctx.fillStyle = fg;
    ctx.font = `900 ${vertical ? 64 : 60}px 'Noto Sans JP', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (vertical) {
      const chars = [...word];
      const step = Math.min(80, (H - 40) / chars.length);
      chars.forEach((ch, k) => ctx.fillText(ch, W / 2, 20 + step * (k + 0.5)));
    } else ctx.fillText(word, W / 2, H / 2 + 4);
  });
};

// 自販機の正面
export const vendingTex = (i: number) =>
  make(`vend-${i}`, 128, 256, (ctx, r) => {
    ctx.fillStyle = i % 2 ? '#d8dde3' : '#c0392b';
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = '#e9f3fb';
    ctx.fillRect(10, 12, 108, 120);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 6; x++) {
        ctx.fillStyle = ['#2c6e9b', '#c0392b', '#f1c40f', '#2f7d4f', '#8e44ad', '#e67e22'][Math.floor(r() * 6)];
        ctx.fillRect(14 + x * 17, 18 + y * 29, 12, 22);
      }
    ctx.fillStyle = '#20252b';
    ctx.fillRect(20, 190, 88, 34);
  });
