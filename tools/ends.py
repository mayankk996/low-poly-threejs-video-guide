#!/usr/bin/env python3
# The start and end of each shot. This catches what middle frames miss: numbers cut off, a sign drifting over someone.
#   python ends.py <frames folder> <out folder>     (run shots.py first)
import cv2, json, sys
import numpy as np
fr, out = sys.argv[1:3]; cols = 6; cells = []
for s, a, b in json.load(open(f'{out}/shots.json')):
    for n, tag in ((min(a + 7, b), 'start'), (max(b - 7, a), 'end')):
        im = cv2.imread(f'{fr}/f{n}.jpg'); w = 1960 // cols; h = w * im.shape[0] // im.shape[1]; im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA); t = f'#{s} {tag}'
        cv2.putText(im, t, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, .55, (0, 0, 0), 3, cv2.LINE_AA); cv2.putText(im, t, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, .55, (0, 255, 255), 1, cv2.LINE_AA); cells.append(im)
while len(cells) % cols: cells.append(np.zeros_like(cells[0]))
rows = [np.hstack(cells[i:i + cols]) for i in range(0, len(cells), cols)]
for p in range(0, len(rows), 6):
    cv2.imwrite(f'{out}/ends_{p // 6}.jpg', np.vstack(rows[p:p + 6]), [cv2.IMWRITE_JPEG_QUALITY, 86])
print('sheets written to', out)
