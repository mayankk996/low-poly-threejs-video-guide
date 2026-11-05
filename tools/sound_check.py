#!/usr/bin/env python3
# Two checks that catch hiss and buzz before your ears get tired of them. A pass doesn't prove the sound is clean: always listen too.
#   python sound_check.py source <file.wav> ...           run on every new sound. Reject heavy hiss (above about -8 dB), steady tones or flutter
#   python sound_check.py gaps <voice.wav> <master.wav>   what you hear when nobody is talking
import subprocess, sys
import numpy as np
SR = 48000
def read(p): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
def hiss_of(x):
    Z = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2; F = np.fft.rfftfreq(len(x), 1 / SR); return 10 * np.log10(Z[F > 7000].sum() / Z.sum() + 1e-12)
def source(p):
    x = read(p); x = x - x.mean(); N = 8192; w = np.hanning(N); S = np.array([np.abs(np.fft.rfft(x[i:i + N] * w)) for i in range(0, max(1, len(x) - N), N // 2)]); M = S.mean(0) + 1e-9; F = np.fft.rfftfreq(N, 1 / SR)
    band = (F > 40) & (F < 12000); ratio = 20 * np.log10(M / np.convolve(M, np.ones(41) / 41, 'same')); tone = np.sort(ratio[band])[-12:].mean()
    h = 240; env = np.sqrt(np.convolve(x ** 2, np.ones(h) / h, 'same'))[::h]; env = env - np.convolve(env, np.ones(40) / 40, 'same'); sp = np.abs(np.fft.rfft(env * np.hanning(len(env)))); fq = np.fft.rfftfreq(len(env), h / SR); b = (fq > 8) & (fq < 60); flutter = sp[b].max() / (np.median(sp[b]) + 1e-9)
    print(f'{p}: tone {tone:.1f}  flutter {flutter:.1f} at {fq[b][np.argmax(sp[b])]:.0f} Hz  hiss {hiss_of(x):.1f} dB')
if sys.argv[1] == 'source':
    for p in sys.argv[2:]: source(p)
else:
    v, m = read(sys.argv[2]), read(sys.argv[3]); n = min(len(v), len(m)); h = int(.02 * SR); e = np.sqrt(np.convolve(v[:n] ** 2, np.ones(h) / h, 'same'))[::h]; quiet = e < 10 ** (-48 / 20); gaps = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) * .02 >= .2:
                w = m[i * h:j * h]; gaps.append((round(i * .02, 1), round((j - i) * .02, 2), round(float(hiss_of(w)), 1)))
            i = j
        else: i += 1
    print(len(gaps), 'gaps. Hissiest (start s, length s, share above 7 kHz in dB):', sorted(gaps, key=lambda g: -g[2])[:8])
