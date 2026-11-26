import {Easing, interpolate} from 'remotion';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeIO = Easing.inOut(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.quad);

export const ramp = (f: number, a: number, b: number, ease: (t: number) => number = easeIO) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

export type V3 = [number, number, number];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
