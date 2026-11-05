#!/usr/bin/env python3
# A contact sheet of the whole film, one frame every so often. Test frames miss what the whole film shows: an arm breaking for half a second, a number cut off.
#   python sheet.py <frames folder> <out.jpg> [every n frames, default 12] [columns, default 12]
import glob, os, sys
import cv2, numpy as np
src, out = sys.argv[1:3]; every = int(sys.argv[3]) if len(sys.argv) > 3 else 12; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 12
ns = sorted(int(os.path.basename(p)[1:-4]) for p in glob.glob(src + '/f*.jpg'))[::every]; cells = []
if not ns: raise SystemExit('no frames named f<number>.jpg in ' + src)
for n in ns:
    im = cv2.imread(f'{src}/f{n}.jpg'); w = 160; im = cv2.resize(im, (w, w * im.shape[0] // im.shape[1]), interpolation=cv2.INTER_AREA)
    cv2.putText(im, str(n), (4, 16), cv2.FONT_HERSHEY_SIMPLEX, .45, (0, 0, 0), 3, cv2.LINE_AA); cv2.putText(im, str(n), (4, 16), cv2.FONT_HERSHEY_SIMPLEX, .45, (0, 255, 255), 1, cv2.LINE_AA); cells.append(im)
while len(cells) % cols: cells.append(np.zeros_like(cells[0]))
cv2.imwrite(out, np.vstack([np.hstack(cells[i:i + cols]) for i in range(0, len(cells), cols)]), [cv2.IMWRITE_JPEG_QUALITY, 88]); print(out, len(ns), 'frames')
