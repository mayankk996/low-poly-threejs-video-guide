#!/usr/bin/env python3
# Builds the film's sound from cues, keeps each stem separate, and masters to -14 LUFS. The voice is never processed or cut.
#   python mix.py <cues.json> <out folder>
# cues.json: {"voice": "voice.wav", "end": 16, "sfx": [{"file": "hit.wav", "t": 13.9, "peak": -8}],
#             "music": [{"file": "bed.wav", "from": 0, "to": 16, "level": -34}]}
# "peak" is the effect's loudest point in dB. "level" is music loudness in dB RMS. Keep music well under the voice, or leave it out.
import json, os, re, subprocess, sys
import numpy as np
SR = 48000
def read(p): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()
def write(p, x): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', p], input=x.astype(np.float32).tobytes(), check=True)
def lufs(p): return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', subprocess.run(['ffmpeg', '-nostats', '-i', p, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr)[-1])
cues = json.load(open(sys.argv[1])); base = os.path.dirname(os.path.abspath(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
N = int(cues['end'] * SR); voice, sfx, music = (np.zeros((N, 2), np.float32) for _ in range(3))
def put(dst, x, t):
    i = int(t * SR)
    if i < N: dst[i:i + len(x)] += x[:N - i]
if cues.get('voice'): put(voice, read(os.path.join(base, cues['voice'])), cues.get('voice_at', 0))   # a film with no narrator just leaves it out
for c in cues.get('sfx', []):
    x = read(os.path.join(base, c['file'])); x = x[:int(c.get('cut', 99) * SR)].copy()
    fo = int(.02 * SR)
    if len(x) > fo: x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    put(sfx, x * 10 ** (c.get('peak', -12) / 20) / (np.abs(x).max() + 1e-9), c['t'])
for c in cues.get('music', []):
    x = read(os.path.join(base, c['file'])); n = int((c['to'] - c['from']) * SR); x = x[:n].copy()   # one long piece, never looped
    f = int(1.5 * SR); x[:f] *= np.linspace(0, 1, f)[:, None]; x[-f:] *= np.linspace(1, 0, f)[:, None]
    put(music, x * 10 ** (c.get('level', -34) / 20) / (np.sqrt((x ** 2).mean()) + 1e-9), c['from'])
for name, x in (('voice', voice), ('sfx', sfx), ('music', music)): write(f'{out}/{name}.wav', x)
mix = voice + sfx + music; write(f'{out}/mix_raw.wav', mix); g = -14 - lufs(f'{out}/mix_raw.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{out}/mix_raw.wav', '-af', f'volume={g:.2f}dB,aresample=192000,alimiter=limit=0.79:attack=4:release=60:level=disabled,aresample=48000', '-c:a', 'pcm_s24le', f'{out}/master.wav'], check=True)
print('master', round(lufs(f'{out}/master.wav'), 1), 'LUFS, gain', round(g, 1), 'dB')
