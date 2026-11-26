export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// YouTube Shorts の UI と重ならない領域（テロップはこの中に置く）
export const SAFE = {top: 220, bottom: 420, left: 60, right: 160};
export const SAFE_BOX = {
  x: SAFE.left,
  y: SAFE.top,
  w: WIDTH - SAFE.left - SAFE.right,
  h: HEIGHT - SAFE.top - SAFE.bottom,
};

export const FONT = "'M PLUS Rounded 1c', sans-serif";

export const C = {
  white: '#ffffff',
  black: '#14121f',
  yellow: '#FFE500',
  red: '#FF3B4E',
  cyan: '#4FE3FF',
  orange: '#FF8A1F',
  // 3D パレット
  space: '#0b0f2e',
  ocean: '#2f8cf0',
  oceanDeep: '#1f5fc8',
  land: '#59c76b',
  landDark: '#3f9e58',
  sand: '#f2c879',
  seabed: '#d9a56a',
  ice: '#eef7ff',
  sky: '#8fd3ff',
  skyWarm: '#ffc58a',
  grass: '#7ed66f',
  road: '#5b6270',
  skin: '#ffd9b8',
  bodyColors: ['#ff6b6b', '#4dabf7', '#ffd43b', '#b197fc', '#63e6be', '#ff922b'],
  houseColors: ['#fff4e0', '#ffe3e3', '#e7f5ff', '#fff9db', '#f3f0ff'],
  roofColors: ['#ff6b6b', '#4c6ef5', '#f59f00', '#12b886', '#e64980'],
};
