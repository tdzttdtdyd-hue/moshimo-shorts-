"""1円玉がジャラジャラ落ちる音（70個のチャリンをランダムに重ねる）"""
import sys
import wave

import numpy as np

SR = 48000
N = int(SR * 1.6)
out = np.zeros(N)
r = np.random.default_rng(3)
t = np.arange(int(SR * 0.3)) / SR
for _ in range(70):
    st = int(r.uniform(0, 1.2) * SR)
    f = r.uniform(2800, 6200)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * r.uniform(18, 40)) + 0.4 * np.sin(2 * np.pi * f * 1.48 * t) * np.exp(-t * 50)) * r.uniform(0.2, 0.6)
    e = min(N, st + len(s))
    out[st:e] += s[: e - st]
out *= np.linspace(1, 0.4, N)
out /= np.abs(out).max()
out *= 10 ** (-6 / 20)
pcm = (np.stack([out, out], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "coins.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
