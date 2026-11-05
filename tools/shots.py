#!/usr/bin/env python3
# One frame from the middle of each shot, on sheets. Also writes shots.json, which ends.py reads.
#   python shots.py <frames folder> <out folder> [columns, default 6]
import cv2, glob, json, os, sys
import numpy as np
fr, out = sys.argv[1:3]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6; os.makedirs(out, exist_ok=True)
ns = sorted(int(os.path.basename(f)[1:-5]) for f in glob.glob(fr + '/a*.json')); spans = []
for n in ns:
    s = json.load(open(f'{fr}/a{n}.json'))['anchors']['shot']
    if not spans or spans[-1][0] != s: spans.append([s, n, n])
    spans[-1][2] = n
json.dump(spans, open(f'{out}/shots.json', 'w'))
def cell(n, label):
    im = cv2.imread(f'{fr}/f{n}.jpg'); w = 1960 // cols; h = w * im.shape[0] // im.shape[1]; im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
    cv2.putText(im, label, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, .55, (0, 0, 0), 3, cv2.LINE_AA); cv2.putText(im, label, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, .55, (0, 255, 255), 1, cv2.LINE_AA); return im
cells = [cell((a + b) // 2, f'#{s} {(a + b) / 60:.1f}s') for s, a, b in spans]
while len(cells) % cols: cells.append(np.zeros_like(cells[0]))
rows = [np.hstack(cells[i:i + cols]) for i in range(0, len(cells), cols)]
for p in range(0, len(rows), 6):
    cv2.imwrite(f'{out}/shots_{p // 6}.jpg', np.vstack(rows[p:p + 6]), [cv2.IMWRITE_JPEG_QUALITY, 86])
print(len(spans), 'shots')
