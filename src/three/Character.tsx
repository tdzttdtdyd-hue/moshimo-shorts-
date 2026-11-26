import React from 'react';
import {C} from '../theme';
import {V3} from '../lib/anim';

export type Expr = 'happy' | 'surprised' | 'scared' | 'hot' | 'frozen' | 'think';

type Props = {
  position?: V3;
  rotation?: V3;
  scale?: number;
  color?: string;
  expr?: Expr;
  walk?: number; // 歩行位相（ラジアン）
  walkAmp?: number;
  armL?: number; // 腕の振り上げ角（ラジアン, 0=下）
  armR?: number;
  breathe?: number; // 0..1 呼吸位相
  squash?: number; // 1=通常
  hat?: string;
};

const SEG = 24;
const Smooth: React.FC<{color: string; emissive?: string; roughness?: number}> = ({color, emissive, roughness = 0.45}) => (
  <meshStandardMaterial color={color} roughness={roughness} metalness={0} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.25 : 0} />
);

// 2.3頭身のつるっとしたキャラクター（分割数多め＋スムーズシェーディング）
export const Character: React.FC<Props> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color = C.bodyColors[0],
  expr = 'happy',
  walk = 0,
  walkAmp = 0,
  armL = 0.2,
  armR = 0.2,
  breathe = 0,
  squash = 1,
  hat,
}) => {
  const frozen = expr === 'frozen';
  const body = frozen ? '#9fd8ff' : color;
  const skin = frozen ? '#cfeeff' : C.skin;
  const legA = Math.sin(walk) * walkAmp;
  const bob = Math.abs(Math.sin(walk)) * walkAmp * 0.08 + Math.sin(breathe * Math.PI * 2) * 0.012;
  const eyeScaleY = expr === 'hot' || expr === 'frozen' ? 0.25 : expr === 'surprised' || expr === 'scared' ? 1.25 : 1;
  const eyeY = expr === 'think' ? 1.47 : 1.42;
  return (
    <group position={position} rotation={rotation} scale={[scale, scale * squash, scale]}>
      <group position={[0, bob, 0]}>
        {/* 脚 */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.15, 0.42, 0]} rotation={[s * legA, 0, 0]}>
            <mesh position={[0, -0.2, 0]} castShadow>
              <capsuleGeometry args={[0.11, 0.2, 8, SEG]} />
              <Smooth color={frozen ? '#7fb8e6' : '#3d3a5c'} />
            </mesh>
          </group>
        ))}
        {/* 胴体 */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <capsuleGeometry args={[0.34, 0.26, 12, SEG]} />
          <Smooth color={body} />
        </mesh>
        {/* 腕 */}
        {[
          [-1, armL],
          [1, armR],
        ].map(([s, a]) => (
          <group key={s} position={[s * 0.36, 0.92, 0]} rotation={[-legA * 0.8 * (walkAmp > 0 ? s : 0), 0, s * (0.25 + a)]}>
            <mesh position={[0, -0.22, 0]} castShadow>
              <capsuleGeometry args={[0.095, 0.24, 8, SEG]} />
              <Smooth color={body} />
            </mesh>
            <mesh position={[0, -0.4, 0]}>
              <sphereGeometry args={[0.1, SEG, SEG]} />
              <Smooth color={skin} />
            </mesh>
          </group>
        ))}
        {/* 頭 */}
        <mesh position={[0, 1.36, 0]} castShadow>
          <sphereGeometry args={[0.44, 32, 32]} />
          <Smooth color={skin} roughness={0.55} />
        </mesh>
        {/* 目 */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.15, eyeY, 0.39]}>
            <mesh scale={[0.065, 0.095 * eyeScaleY, 0.04]}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshStandardMaterial color="#1b1530" roughness={0.2} />
            </mesh>
            {eyeScaleY > 0.5 && (
              <mesh position={[0.02, 0.03, 0.035]} scale={0.022}>
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial color="#fff" />
              </mesh>
            )}
          </group>
        ))}
        {/* ほっぺ */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.27, 1.3, 0.33]} scale={[0.07, 0.045, 0.03]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color={frozen ? '#a5d8ff' : '#ff9aa8'} transparent opacity={0.85} />
          </mesh>
        ))}
        {/* 口 */}
        {expr === 'happy' || expr === 'think' ? (
          <mesh position={[0, 1.25, 0.415]} rotation={[0, 0, Math.PI]} scale={expr === 'think' ? 0.6 : 1}>
            <torusGeometry args={[0.07, 0.018, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#5a1f2b" />
          </mesh>
        ) : (
          <mesh position={[0, 1.23, 0.41]} scale={expr === 'frozen' ? [0.08, 0.02, 0.03] : expr === 'scared' ? [0.07, 0.09, 0.04] : [0.08, 0.11, 0.04]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#5a1f2b" />
          </mesh>
        )}
        {/* 汗 */}
        {(expr === 'hot' || expr === 'scared') && (
          <mesh position={[0.36, 1.55, 0.2]} scale={[0.05, 0.08, 0.05]}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial color="#7cc8ff" transparent opacity={0.9} roughness={0.1} />
          </mesh>
        )}
        {hat && (
          <mesh position={[0, 1.74, 0]} castShadow>
            <sphereGeometry args={[0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Smooth color={hat} />
          </mesh>
        )}
      </group>
    </group>
  );
};
