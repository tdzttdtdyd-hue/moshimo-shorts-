// 実際の大陸の形（Natural Earth 1:50m の陸地、world-atlas 経由・パブリックドメイン）を
// 正距円筒の canvas に塗り、経緯度から「陸かどうか」「海岸からの近さ」を引けるようにする。
import {feature} from 'topojson-client';
import land50 from 'world-atlas/land-50m.json';

const W = 2048;
const H = 1024;
type Mask = {land: Uint8ClampedArray; coast: Uint8ClampedArray};
let cache: Mask | null = null;

const draw = (ctx: CanvasRenderingContext2D) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = land50 as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geo = feature(topo, topo.objects.land) as any;
  const X = (lon: number) => ((lon + 180) / 360) * W;
  const Y = (lat: number) => ((90 - lat) / 180) * H;
  ctx.fillStyle = '#fff';
  const polys: number[][][][] = [];
  for (const f of geo.features ?? [geo]) {
    const g = f.geometry ?? f;
    if (g.type === 'Polygon') polys.push(g.coordinates);
    else if (g.type === 'MultiPolygon') polys.push(...g.coordinates);
  }
  for (const poly of polys) {
    ctx.beginPath();
    for (const ring of poly) {
      ring.forEach(([lon, lat], i) => {
        // 日付変更線をまたぐ線は折り返さない
        if (i > 0 && Math.abs(lon - ring[i - 1][0]) > 180) ctx.moveTo(X(lon), Y(lat));
        else if (i === 0) ctx.moveTo(X(lon), Y(lat));
        else ctx.lineTo(X(lon), Y(lat));
      });
      ctx.closePath();
    }
    ctx.fill('evenodd');
  }
  // 南極は下端まで塗る
  ctx.fillRect(0, Y(-78), W, H - Y(-78));
};

export const worldMask = (): Mask => {
  if (cache) return cache;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', {willReadFrequently: true})!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  draw(ctx);
  const land = ctx.getImageData(0, 0, W, H).data;
  // 海岸からの近さ（ぼかした陸地）
  const c2 = document.createElement('canvas');
  c2.width = W;
  c2.height = H;
  const ctx2 = c2.getContext('2d', {willReadFrequently: true})!;
  ctx2.filter = 'blur(10px)';
  ctx2.drawImage(c, 0, 0);
  const coast = ctx2.getImageData(0, 0, W, H).data;
  cache = {land, coast};
  return cache;
};

const idx = (lon: number, lat: number) => {
  const x = Math.min(W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * W)));
  const y = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)));
  return (y * W + x) * 4;
};
export const sampleLand = (m: Mask, lon: number, lat: number) => m.land[idx(lon, lat)] / 255;
export const sampleCoast = (m: Mask, lon: number, lat: number) => m.coast[idx(lon, lat)] / 255;
