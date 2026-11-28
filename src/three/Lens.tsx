// ブラックホールの「重力レンズ」：シーンをいったん画像に描いてから、画面全体を加工して表示する
// ・まわりの景色が、黒い穴のまわりでぐにゃっと曲がる（点レンズの式 β = θ − θE²/θ）
// ・中心に向かう放射状のぶれ（光の筋が吸い込まれていく見え方）
// ・黒い影と、そのまわりの細い光の輪（フォトンリング）
import React, {useEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useFrame, useThree} from '@react-three/fiber';
import {V3} from '../lib/anim';

export type LensParams = {
  target: V3; // ブラックホールの位置（3D）
  shadow: number; // 黒い影の半径（画面の高さに対する割合）
  einstein: number; // ゆがみの強さ（アインシュタイン半径・画面の高さに対する割合）
  streak: number; // 中心へ向かうぶれの強さ（0〜1）
  glow: number; // 光の輪の明るさ
  flash?: number; // 画面全体の白い光（0〜1）
  visible?: boolean; // false なら加工せずそのまま
};

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const frag = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 center;
uniform float aspect;
uniform float shadowR;
uniform float einR;
uniform float streak;
uniform float glow;
uniform float flash;
uniform float onScreen;
varying vec2 vUv;
void main() {
  vec2 d = vUv - center;
  d.x *= aspect;
  float r = length(d);
  vec2 dir = r > 1e-5 ? d / r : vec2(0.0, 1.0);
  // レンズ：見えている向き θ から、もとの景色の向き β を計算
  float beta = r - (einR * einR) / max(r, 1e-4);
  vec2 sd = dir * beta;
  vec2 src = center + vec2(sd.x / aspect, sd.y);
  // 中心へ向かう放射状のぶれ（遠くほど弱く）
  vec3 col = vec3(0.0);
  float tot = 0.0;
  float k = streak * clamp(0.6 / (r * 4.0 + 0.6), 0.0, 1.0);
  for (int i = 0; i < 28; i++) {
    float t = float(i) / 27.0;
    vec2 p = mix(src, center, t * k);
    float w = 1.0 - t * 0.6;
    vec2 cp = clamp(p, vec2(0.001), vec2(0.999));
    col += texture2D(tScene, cp).rgb * w;
    tot += w;
  }
  col /= tot;
  // 画面の外から来る景色は少し暗く（ふちの不自然さを隠す）
  vec2 o = abs(src - 0.5);
  col *= 1.0 - 0.6 * smoothstep(0.5, 0.75, max(o.x, o.y));
  // 黒い影と光の輪
  float sh = smoothstep(shadowR * 0.98, shadowR * 1.06, r);
  col *= mix(1.0, sh, onScreen);
  float ringW = max(shadowR * 0.1, 0.0015);
  float ring = exp(-pow((r - shadowR * 1.12) / ringW, 2.0));
  float halo = exp(-pow((r - shadowR * 1.12) / (ringW * 5.0), 2.0)) * 0.35;
  col += vec3(1.0, 0.93, 0.8) * (ring + halo) * glow * onScreen;
  col = mix(col, vec3(1.0, 0.97, 0.9), flash);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const Lens: React.FC<LensParams> = ({target, shadow, einstein, streak, glow, flash = 0, visible = true}) => {
  const {gl, size} = useThree();
  const dpr = gl.getPixelRatio();
  const rt = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(size.width * dpr)), Math.max(1, Math.floor(size.height * dpr)), {samples: 4, type: THREE.HalfFloatType});
    return t;
  }, [size.width, size.height, dpr]);
  useEffect(() => () => rt.dispose(), [rt]);
  const quad = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        tScene: {value: null},
        center: {value: new THREE.Vector2(0.5, 0.5)},
        aspect: {value: 1},
        shadowR: {value: 0.01},
        einR: {value: 0.05},
        streak: {value: 0},
        glow: {value: 1},
        flash: {value: 0},
        onScreen: {value: 1},
      },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    return {mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)};
  }, []);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({scene, camera}) => {
    if (!visible) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }
    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    v.set(...target).project(camera);
    const u = quad.mat.uniforms;
    u.tScene.value = rt.texture;
    u.center.value.set((v.x + 1) / 2, (v.y + 1) / 2);
    u.aspect.value = size.width / size.height;
    u.shadowR.value = shadow;
    u.einR.value = einstein;
    u.streak.value = streak;
    u.glow.value = glow;
    u.flash.value = flash;
    u.onScreen.value = v.z < 1 ? 1 : 0;
    gl.render(quad.scene, quad.cam);
  }, 1);
  return null;
};
