"""柔らかいアンビエント BGM を合成する（外部素材なし・ライセンスフリー）。

構成：パッド（ゆっくり立ち上がる和音）＋ ピアノ風アルペジオ ＋ ベース ＋ 小さなベル
     → FFT 畳み込みリバーブ → フェードイン／アウト。
usage: python3 scripts/make-bgm.py public/bgm/bgm.wav 37.0
"""
import sys
import wave

import numpy as np

OUT = sys.argv[1] if len(sys.argv) > 1 else "public/bgm/bgm.wav"
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 37.0
SR = 48000
BPM = 76
BEAT = 60 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(int(sys.argv[3]) if len(sys.argv) > 3 else 7)
N = int(SR * (DUR + 3.0))  # 余韻ぶん長めに作って最後に切る
L = np.zeros(N)
R = np.zeros(N)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# Fmaj9 → Em7 → Dm9 → Cmaj7(onE) を繰り返す、穏やかで少し切ない進行
CHORDS = [
    [53, 60, 64, 67, 69],  # F A C E G 系
    [52, 59, 62, 67, 71],  # Em7
    [50, 57, 60, 64, 65],  # Dm9
    [48, 55, 59, 64, 67],  # Cmaj7
]
BASS = [41, 40, 38, 36]


def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    L[i : i + len(sig)] += sig * gain * l
    R[i : i + len(sig)] += sig * gain * r


def env_adsr(n, a, d, s, rel):
    t = np.arange(n) / SR
    e = np.ones(n) * s
    e[t < a] = t[t < a] / a
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / d
    rs = n / SR - rel
    m = t >= rs
    e[m] *= np.clip(1 - (t[m] - rs) / rel, 0, 1)
    return e


def pad(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.0025 * np.sin(2 * np.pi * 4.5 * t + rng.random() * 6)
    s = np.zeros(n)
    for det in (-0.004, 0.0, 0.0045):
        ph = 2 * np.pi * freq * (1 + det) * np.cumsum(vib) / SR
        s += np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    return s / 3 * env_adsr(n, 1.4, 0.8, 0.8, 1.6)


def piano(freq, dur=2.6, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for k, (amp, dec) in enumerate([(1.0, 1.8), (0.45, 1.2), (0.22, 0.8), (0.1, 0.5), (0.05, 0.35)], start=1):
        inh = 1 + 0.0004 * k * k  # 弦の不協和を少し
        s += amp * np.sin(2 * np.pi * freq * k * inh * t) * np.exp(-t * (1 / dec) * 1.6)
    att = np.clip(t / 0.006, 0, 1)
    return s * att * vel * 0.5


def bell(freq, dur=3.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 3)
    return s * np.exp(-t * 1.4) * np.clip(t / 0.004, 0, 1) * 0.35


bars = int(np.ceil(DUR / BAR)) + 1
ARP = [0, 2, 3, 4, 3, 2, 1, 2]  # 8分音符のアルペジオの並び
for b in range(bars):
    c = CHORDS[b % 4]
    t0 = b * BAR
    # パッド（和音の上3音）
    for i, m in enumerate(c[1:]):
        add(pad(hz(m), BAR + 1.6), t0, pan=(i - 1.5) * 0.35, gain=0.11)
    # ベース
    add(pad(hz(BASS[b % 4]), BAR + 1.2) * 0.9, t0, pan=0, gain=0.16)
    # ピアノのアルペジオ（2小節目から入る）
    if b >= 1:
        for k, idx in enumerate(ARP):
            m = c[idx] + 12
            vel = 0.55 + 0.25 * rng.random() - (0.15 if k % 2 else 0)
            jitter = rng.normal(0, 0.008)
            add(piano(hz(m), vel=vel), t0 + k * BEAT / 2 + jitter, pan=-0.3 + 0.6 * (idx / 4), gain=0.2)
    # ときどき高いベルのメロディ
    if b >= 2 and b % 2 == 0:
        mel = [c[4] + 12, c[3] + 12, c[2] + 12]
        for k, m in enumerate(mel):
            add(bell(hz(m)), t0 + BEAT * (1 + k * 1.5), pan=0.25, gain=0.12)

# リバーブ（指数減衰ノイズのインパルス応答で畳み込み）
ir_len = int(2.8 * SR)
t = np.arange(ir_len) / SR
ir_l = rng.normal(0, 1, ir_len) * np.exp(-t * 2.4)
ir_r = rng.normal(0, 1, ir_len) * np.exp(-t * 2.4)
ir_l[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
ir_r[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
ir_l /= np.sqrt(np.sum(ir_l**2))
ir_r /= np.sqrt(np.sum(ir_r**2))


def conv(x, h):
    n = len(x) + len(h) - 1
    nfft = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[: len(x)]


wetL = conv(L, ir_l)
wetR = conv(R, ir_r)
outL = 0.75 * L + 0.55 * wetL
outR = 0.75 * R + 0.55 * wetR

# やわらかくするための軽いローパス（一次 IIR を FFT 上で近似）
def lowpass(x, fc=5500):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** 2), len(x))


outL = lowpass(outL)
outR = lowpass(outR)

n = int(DUR * SR)
out = np.stack([outL[:n], outR[:n]], axis=1)
fade_in = int(1.5 * SR)
fade_out = int(3.0 * SR)
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.5
out /= np.max(np.abs(out))
out *= 10 ** (-3 / 20)  # ピーク -3dBFS（音量は動画側で調整）

pcm = (out * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", OUT, f"{DUR}s")
