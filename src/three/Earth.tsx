import React, {useMemo} from 'react';
import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {V3} from '../lib/anim';
import {fbm3, mulberry32, noise3} from '../lib/rand';

// 高精細な地球：起伏のある地形（バイオーム別の色）＋ 光沢のある海 ＋ 雲 ＋ 大気の光 ＋ 夜景

type Props = {
  radius?: number;
  spin?: number;
  tilt?: number;
  oceanShift?: number; // 0: 現在の海, 1: 自転停止で海が両極に集まった状態
  sunDir?: V3; // heat > 0 のとき 昼側=灼熱 / 夜側=氷
  heat?: number;
  cityLights?: V3; // 指定した太陽方向の反対側（夜側）に街明かり
  position?: V3;
  clouds?: boolean;
  cloudSpin?: number;
  detail?: number;
};

const col = (h: string) => new THREE.Color(h);
const B = {
  deep: col('#0b3a8c'),
  ocean: col('#1660c4'),
  shallow: col('#2fa6d8'),
  reef: col('#58d0d0'),
  beach: col('#e8d39a'),
  grass: col('#6fb64a'),
  forest: col('#2f7d3a'),
  jungle: col('#1f6b33'),
  savanna: col('#b8b45a'),
  desert: col('#e0b46a'),
  desertRed: col('#c98a4b'),
  rock: col('#8a7560'),
  mountain: col('#6e6258'),
  snow: col('#f4f8ff'),
  tundra: col('#9aa58a'),
  ice: col('#e6f2ff'),
  seabed: col('#c9a777'),
  seabedDark: col('#9c7c58'),
  hot: col('#ff8a3a'),
  hotDark: col('#d2562a'),
  frost: col('#d6e6ff'),
  night: col('#33407a'),
};

// 大陸らしい形を作る標高（ドメインワープ付き fbm）
const elevation = (v: THREE.Vector3) => {
  const w = 0.6;
  const wx = fbm3(v.x * 1.3 + 11, v.y * 1.3, v.z * 1.3, 5, 3) * w;
  const wy = fbm3(v.x * 1.3, v.y * 1.3 + 7, v.z * 1.3, 6, 3) * w;
  const wz = fbm3(v.x * 1.3, v.y * 1.3, v.z * 1.3 + 3, 7, 3) * w;
  const x = v.x + wx, y = v.y + wy, z = v.z + wz;
  const continents = fbm3(x * 1.15 + 4, y * 1.15, z * 1.15, 11, 4);
  const detail = fbm3(v.x * 5.5, v.y * 5.5, v.z * 5.5, 21, 4) * 0.22;
  const ridges = Math.pow(1 - Math.abs(noise3(v.x * 3.2, v.y * 3.2, v.z * 3.2, 31)), 3) * 0.25;
  const h = continents * 1.05 + detail - 0.05;
  return h > 0 ? h + ridges * Math.min(1, h * 4) : h;
};
const moisture = (v: THREE.Vector3) => fbm3(v.x * 2.2 + 40, v.y * 2.2, v.z * 2.2, 51, 3);

// 雲のテクスチャ（正距円筒、決定的に生成）
const makeCloudTexture = () => {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    const lat = (0.5 - j / H) * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2;
      const x = Math.cos(lat) * Math.cos(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.sin(lon);
      const band = 0.12 * Math.cos(lat * 6); // 緯度ごとの雲帯
      let n = fbm3(x * 3.5 + 2, y * 4.5, z * 3.5, 77, 5) + band;
      n += fbm3(x * 9, y * 14, z * 9, 79, 3) * 0.25;
      const a = Math.max(0, Math.min(1, (n - 0.16) * 2.6));
      const k = (j * W + i) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = a * 215;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};

const atmosphereVS = `
varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const rimFS = `
uniform vec3 uColor; uniform float uPow; uniform float uStr; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), uPow); gl_FragColor = vec4(uColor * f * uStr, f * uStr); }`;
const haloFS = `
uniform vec3 uColor; uniform float uStr; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(max(0.0, 0.62 + dot(vN, vV)), 3.0); gl_FragColor = vec4(uColor * f * uStr, f * uStr); }`;

export const Atmosphere: React.FC<{color?: string; strength?: number}> = ({color = '#5fb8ff', strength = 1}) => {
  const rim = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVS,
        fragmentShader: rimFS,
        uniforms: {uColor: {value: new THREE.Color(color)}, uPow: {value: 2.6}, uStr: {value: 1.1 * strength}},
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color, strength],
  );
  const halo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVS,
        fragmentShader: haloFS,
        uniforms: {uColor: {value: new THREE.Color(color)}, uStr: {value: 0.9 * strength}},
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color, strength],
  );
  return (
    <>
      <mesh scale={1.035} material={rim}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <mesh scale={1.16} material={halo}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
    </>
  );
};

type Base = {land: THREE.BufferGeometry; ocean: THREE.BufferGeometry; dirs: THREE.Vector3[]; h: Float32Array; m: Float32Array; oh: Float32Array; odirs: THREE.Vector3[]};

const buildBase = (detail: number): Base => {
  const land = mergeVertices(new THREE.IcosahedronGeometry(1, detail));
  const p = land.attributes.position;
  const dirs: THREE.Vector3[] = [];
  const h = new Float32Array(p.count);
  const m = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    dirs.push(v);
    h[i] = elevation(v);
    m[i] = moisture(v);
  }
  const ocean = mergeVertices(new THREE.IcosahedronGeometry(1, Math.max(12, Math.floor(detail * 0.7))));
  const op = ocean.attributes.position;
  const odirs: THREE.Vector3[] = [];
  const oh = new Float32Array(op.count);
  for (let i = 0; i < op.count; i++) {
    const v = new THREE.Vector3(op.getX(i), op.getY(i), op.getZ(i)).normalize();
    odirs.push(v);
    oh[i] = elevation(v);
  }
  return {land, ocean, dirs, h, m, oh, odirs};
};

const seaLevel = (absLat: number, shift: number) => shift * (absLat * 1.2 - 0.6);

const landColor = (h: number, sea: number, m: number, v: THREE.Vector3, shift: number, out: THREE.Color) => {
  const e = h - sea;
  const absY = Math.abs(v.y);
  if (h <= 0) {
    // 元は海底だった土地（自転停止後に出現）
    out.copy(B.seabed).lerp(B.seabedDark, Math.min(1, -h * 2.5));
    if (e < 0.03) out.lerp(B.beach, 0.6);
    return out;
  }
  const polar = shift < 0.5 && absY > 0.86;
  if (polar) return out.copy(B.ice);
  if (e < 0.025) return out.copy(B.beach);
  // 山・雪は元の標高で決める（海が退いても雪山にはならない）
  if (h > 0.68) return out.copy(B.snow);
  if (h > 0.54) return out.copy(B.mountain).lerp(B.snow, ((h - 0.54) / 0.14) * 0.5);
  if (h > 0.42) return out.copy(B.rock);
  // 緯度と湿度でバイオーム
  if (absY > 0.72) return out.copy(B.tundra).lerp(B.forest, Math.max(0, m) * 0.6);
  if (absY > 0.22 && absY < 0.5 && m < -0.02) return out.copy(B.desert).lerp(B.desertRed, Math.min(1, -m * 4));
  if (absY < 0.22 && m > 0) return out.copy(B.jungle).lerp(B.forest, absY * 2);
  if (m < -0.08) return out.copy(B.savanna);
  return out.copy(B.grass).lerp(B.forest, Math.min(1, Math.max(0, m * 3 + 0.4)));
};

export const Earth: React.FC<Props> = ({
  radius = 2,
  spin = 0,
  tilt = 0.41,
  oceanShift = 0,
  sunDir,
  heat = 0,
  cityLights,
  position = [0, 0, 0],
  clouds = true,
  cloudSpin,
  detail = 72,
}) => {
  const base = useMemo(() => buildBase(detail), [detail]);
  const cloudTex = useMemo(() => (clouds ? makeCloudTexture() : null), [clouds]);

  const shiftKey = Math.round(oceanShift * 90) / 90;
  const heatKey = Math.round(heat * 40) / 40;
  const sunKey = sunDir ? sunDir.map((v) => Math.round(v * 50) / 50).join(',') : '';

  const {land, ocean} = useMemo(() => {
    const sd = sunDir ? new THREE.Vector3(...sunDir).normalize() : null;
    const tmp = new THREE.Color();
    // 地形
    const g = base.land.clone();
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const v = base.dirs[i];
      const h = base.h[i];
      const sea = seaLevel(Math.abs(v.y), shiftKey);
      const e = h - sea;
      const r = 1 + (e > 0 ? Math.min(e, h > 0 ? h + 0.15 : e) * 0.06 : Math.max(-0.02, e * 0.06));
      p.setXYZ(i, v.x * r, v.y * r, v.z * r);
      landColor(h, sea, base.m[i], v, shiftKey, tmp);
      if (sd && heatKey > 0) {
        const d = v.dot(sd);
        const t = d > 0.12 ? (e > 0.3 ? B.hotDark : B.hot) : d < -0.12 ? B.frost : B.grass;
        tmp.lerp(t, heatKey * (Math.abs(d) > 0.12 ? Math.min(1, (Math.abs(d) - 0.12) * 3 + 0.4) : 0.7));
      }
      cols.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    // 海（深さで色を変える）
    const o = base.ocean.clone();
    const op = o.attributes.position;
    const oc = new Float32Array(op.count * 3);
    for (let i = 0; i < op.count; i++) {
      const v = base.odirs[i];
      const depth = seaLevel(Math.abs(v.y), shiftKey) - base.oh[i];
      tmp.copy(B.deep);
      if (depth < 0.35) tmp.copy(B.ocean).lerp(B.deep, depth / 0.35);
      if (depth < 0.08) tmp.copy(B.shallow).lerp(B.ocean, depth / 0.08);
      if (depth < 0.02) tmp.copy(B.reef);
      if (shiftKey < 0.5 && Math.abs(v.y) > 0.9) tmp.copy(B.ice);
      if (sd && heatKey > 0) {
        const d = v.dot(sd);
        if (d > 0.12) tmp.lerp(col('#e9a25a'), heatKey * 0.75);
        else if (d < -0.12) tmp.lerp(B.night, heatKey * 0.6).lerp(B.frost, heatKey * Math.min(1, -d) * 0.6);
      }
      const r = 1 + Math.min(0.004, Math.max(0, seaLevel(Math.abs(v.y), shiftKey)) * 0.01);
      op.setXYZ(i, v.x * r, v.y * r, v.z * r);
      oc.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    o.setAttribute('color', new THREE.BufferAttribute(oc, 3));
    o.computeVertexNormals();
    return {land: g, ocean: o};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, shiftKey, heatKey, sunKey]);

  // 夜景：候補点は一度だけ作り、毎フレーム「夜側にあるもの」だけを残す（ちらつき防止）
  const lightCandidates = useMemo(() => {
    const r = mulberry32(99);
    const out: {v: THREE.Vector3; p: THREE.Vector3}[] = [];
    base.dirs.forEach((v, i) => {
      const e = base.h[i];
      const keep = r() < 0.22 + base.m[i] * 0.8;
      const j = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.012);
      if (e > 0.02 && e < 0.4 && Math.abs(v.y) < 0.75 && keep) out.push({v, p: v.clone().add(j).normalize().multiplyScalar(1.012 + e * 0.06)});
    });
    return out;
  }, [base]);
  const lightKey = cityLights ? cityLights.map((v) => Math.round(v * 100) / 100).join(',') : '';
  const lights = useMemo(() => {
    if (!cityLights) return null;
    const sd = new THREE.Vector3(...cityLights).normalize();
    const pts: number[] = [];
    lightCandidates.forEach(({v, p}) => {
      if (v.dot(sd) < -0.06) pts.push(p.x, p.y, p.z);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightCandidates, lightKey]);

  return (
    <group position={position} rotation={[0, 0, tilt]} scale={radius}>
      <group rotation={[0, spin, 0]}>
        <mesh geometry={land} castShadow receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.9} />
        </mesh>
        <mesh geometry={ocean} receiveShadow>
          <meshPhysicalMaterial vertexColors roughness={0.22} metalness={0} clearcoat={0.6} clearcoatRoughness={0.25} />
        </mesh>
        {lights && (
          <points geometry={lights}>
            <pointsMaterial color="#ffd27a" size={0.03} sizeAttenuation transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
          </points>
        )}
        {cloudTex && (
          <mesh scale={1.055} rotation={[0, cloudSpin ?? spin * 0.15, 0]}>
            <sphereGeometry args={[1, 96, 64]} />
            <meshStandardMaterial map={cloudTex} transparent depthWrite={false} roughness={1} />
          </mesh>
        )}
      </group>
      <Atmosphere />
    </group>
  );
};

// 星空：大きさの異なる星 ＋ 天の川の帯
export const Stars: React.FC<{count?: number; radius?: number; seed?: number}> = ({count = 1600, radius = 140, seed = 5}) => {
  const layers = useMemo(() => {
    const r = mulberry32(seed);
    const make = (n: number, band: boolean) => {
      const arr = new Float32Array(n * 3);
      const colors = new Float32Array(n * 3);
      const c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        let v: THREE.Vector3;
        if (band) {
          const th = r() * Math.PI * 2;
          const off = (r() + r() + r() - 1.5) * 0.18;
          v = new THREE.Vector3(Math.cos(th), off, Math.sin(th)).normalize().applyAxisAngle(new THREE.Vector3(1, 0, 0.3).normalize(), 1.0);
        } else {
          const th = r() * Math.PI * 2;
          const ph = Math.acos(r() * 2 - 1);
          v = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
        }
        v.multiplyScalar(radius * (0.8 + r() * 0.2));
        arr.set([v.x, v.y, v.z], i * 3);
        c.setHSL(0.55 + (r() - 0.5) * 0.25, 0.5, 0.7 + r() * 0.3);
        colors.set([c.r, c.g, c.b], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return g;
    };
    return {small: make(count, false), big: make(Math.floor(count / 8), false), band: make(count * 2, true)};
  }, [count, radius, seed]);
  return (
    <group>
      <points geometry={layers.band}>
        <pointsMaterial vertexColors size={0.35} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
      </points>
      <points geometry={layers.small}>
        <pointsMaterial vertexColors size={0.5} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
      </points>
      <points geometry={layers.big}>
        <pointsMaterial vertexColors size={1.1} sizeAttenuation transparent opacity={1} depthWrite={false} />
      </points>
    </group>
  );
};

// 宇宙の背景（かすかな星雲のグラデーション）
export const SpaceBackdrop: React.FC<{radius?: number}> = ({radius = 180}) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 64, 32);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    const a = col('#05071a'), b = col('#1a1450'), c = col('#0c2a5a');
    const tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const n1 = Math.max(0, fbm3(v.x * 2, v.y * 2, v.z * 2, 3, 4) + 0.1);
      const n2 = Math.max(0, fbm3(v.x * 2.5 + 9, v.y * 2.5, v.z * 2.5, 4, 4));
      tmp.copy(a).lerp(b, Math.min(1, n1 * 1.6)).lerp(c, Math.min(1, n2 * 1.6));
      cols.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g;
  }, [radius]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  );
};

// 太陽：グロー（放射グラデーションのスプライト）付き
const glowTex = (() => {
  let t: THREE.Texture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,250,230,1)');
    g.addColorStop(0.15, 'rgba(255,220,140,0.9)');
    g.addColorStop(0.4, 'rgba(255,160,60,0.35)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

export const Sun: React.FC<{position: V3; size?: number}> = ({position, size = 6}) => {
  const tex = useMemo(() => glowTex(), []);
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 48, 48]} />
        <meshBasicMaterial color="#fff6dc" fog={false} />
      </mesh>
      <sprite scale={size * 7}>
        <spriteMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
      </sprite>
    </group>
  );
};
