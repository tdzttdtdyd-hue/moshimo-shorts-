import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Human, IDLE, Pose} from '../three/Human';
import {V3} from '../lib/anim';
import {Ball, Gym, GYM, Net, Scoreboard} from './Gym';
import {BLUE, RED, REF, SETTER_POS, blocker, setter, spiker} from './rally';

export type Actor = {pos: V3; rot?: V3; p: Pose; hide?: boolean};

// 体育館の照明（天井の照明＋窓からの光）
export const GymLights: React.FC = () => (
  <>
    <hemisphereLight args={['#fff6e6', '#8a6a48', 1.0]} />
    <ambientLight intensity={0.25} />
    <directionalLight
      position={[6, 11, 8]}
      intensity={1.6}
      color="#fff3df"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-16}
      shadow-camera-right={16}
      shadow-camera-top={16}
      shadow-camera-bottom={-16}
      shadow-radius={6}
      shadow-bias={-0.0005}
    />
    <pointLight position={[0, 9, 0]} intensity={60} distance={30} color="#fff4dc" />
  </>
);

// 主審台と主審
export const Referee: React.FC<{p?: Pose; rotY?: number}> = ({p = IDLE, rotY = 0}) => (
  <group position={[0, 0, -5.9]}>
    {[-0.35, 0.35].map((x) => (
      <mesh key={x} position={[x, 0.8, 0]} castShadow>
        <boxGeometry args={[0.08, 1.6, 0.08]} />
        <meshStandardMaterial color="#c8ccd2" metalness={0.5} roughness={0.4} />
      </mesh>
    ))}
    <mesh position={[0, 1.6, 0]} castShadow>
      <boxGeometry args={[0.9, 0.08, 0.8]} />
      <meshStandardMaterial color="#c8ccd2" metalness={0.5} roughness={0.4} />
    </mesh>
    <Human position={[0, 1.64, 0]} rotation={[0, rotY, 0]} outfit={REF} p={p} scale={1.02} />
  </group>
);

type Props = {
  H: number; // 打つ瞬間（シーン内フレーム）
  ball?: V3 | null;
  ballHeat?: number;
  receivers?: Actor[];
  extraOurs?: Actor[];
  score?: [number, number];
  scoreFlash?: number;
  shatter?: number;
  hole?: boolean;
  wallHole?: boolean;
  netShake?: number;
  refPose?: Pose;
  children?: React.ReactNode;
  hideSpiker?: boolean;
};

export const Court: React.FC<Props> = ({H, ball, ballHeat = 0, receivers, extraOurs = [], score = [23, 24], scoreFlash = 0, shatter = 0, hole, wallHole, netShake = 0, refPose, children, hideSpiker}) => {
  const f = useCurrentFrame();
  const sp = spiker(f, H);
  const bl = blocker(f, H);
  const recv: Actor[] = receivers ?? [
    {pos: [-6.2, 0, -1.4], rot: [0, Math.PI / 2, 0], p: IDLE},
    {pos: [-6.0, 0, 2.2], rot: [0, Math.PI / 2, 0], p: IDLE},
  ];
  return (
    <>
      <GymLights />
      <Gym shatter={shatter} hole={hole} wallHole={wallHole} />
      <Net shake={netShake} t={f} />
      <Scoreboard us={score[0]} them={score[1]} position={[0, 8.2, -GYM.z + 0.15]} flash={scoreFlash} />
      <Referee p={refPose} rotY={0} />
      {/* 自分たち（赤） */}
      {!hideSpiker && <Human position={sp.pos} rotation={[0, -Math.PI / 2, 0]} outfit={RED[0]} p={sp.p} scale={1.08} />}
      <Human position={SETTER_POS} rotation={[0, -Math.PI / 2 + 0.6, 0]} outfit={RED[1]} p={setter(f, H)} scale={1.02} />
      <Human position={[6.5, 0, -2.6]} rotation={[0, -Math.PI / 2, 0]} outfit={RED[2]} p={IDLE} scale={1.0} />
      {extraOurs.map((a, i) => !a.hide && <Human key={`o${i}`} position={a.pos} rotation={a.rot ?? [0, -Math.PI / 2, 0]} outfit={RED[i % 2]} p={a.p} scale={1.04} />)}
      {/* 相手（青）：前衛2人がブロック */}
      {[-0.5, -1.6].map((z, i) => (
        <Human key={`b${i}`} position={[-0.55, bl.y, z]} rotation={[0, Math.PI / 2, 0]} outfit={BLUE[i]} p={bl.p} scale={1.08} />
      ))}
      {recv.map((a, i) => !a.hide && <Human key={`r${i}`} position={a.pos} rotation={a.rot ?? [0, Math.PI / 2, 0]} outfit={BLUE[2 + (i % 2)]} p={a.p} scale={1.04} />)}
      {ball && <Ball position={ball} spin={f * 0.6} heat={ballHeat} />}
      {children}
    </>
  );
};

