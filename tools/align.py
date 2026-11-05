#!/usr/bin/env python3
# Gets a time for every word from the voice, keeps your script's spelling, and writes words.json for the picture.
#   python align.py <voice.wav> <script.txt> <words.json>
# Needs: pip install -r requirements-voice.txt. Mismatches are printed, so check them by ear before you trust the timings.
import difflib, json, re, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
wav, script_path, out = sys.argv[1:4]
audio = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32)
segments, _ = WhisperModel(sys.argv[4] if len(sys.argv) > 4 else 'large-v3', device='cpu', compute_type='int8').transcribe(audio, language='en', word_timestamps=True, beam_size=5)
heard = [dict(w=w.word.strip(), a=round(w.start, 3), b=round(w.end, 3)) for s in segments for w in s.words]
norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower().replace('\u2019', "'"))
script = open(script_path).read().split(); A = [norm(x) for x in script]; B = [norm(x['w']) for x in heard]
words = [None] * len(script)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
    if tag == 'equal':
        for k in range(i2 - i1): words[i1 + k] = dict(w=script[i1 + k], a=heard[j1 + k]['a'], b=heard[j1 + k]['b'])
    else: print(f"{tag}: script [{' '.join(script[i1:i2])}] heard [{' '.join(x['w'] for x in heard[j1:j2])}]")
# anything unmatched is spread evenly between its neighbours
i = 0
while i < len(words):
    if words[i] is None:
        j = i
        while j < len(words) and words[j] is None: j += 1
        a = words[i - 1]['b'] if i else 0; b = words[j]['a'] if j < len(words) else a + .3 * (j - i)
        for k in range(i, j): words[k] = dict(w=script[k], a=round(a + (b - a) * (k - i) / (j - i), 3), b=round(a + (b - a) * (k - i + 1) / (j - i), 3))
        i = j
    else: i += 1
json.dump({'words': words}, open(out, 'w'), indent=0)
print(len(words), 'words, ends at', words[-1]['b'], 's')
