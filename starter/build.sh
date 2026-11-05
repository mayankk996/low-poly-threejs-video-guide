#!/bin/bash
# ./build.sh <end seconds> <name> [fps]: final-quality picture, then the mix if sound/cues.json exists, encoded to review/<name>.mp4
E=$1; N=$2; F=${3:-30}; cd "$(dirname "$0")"; mkdir -p review; rm -rf out/full
node render.mjs film/index.html 0 "$E" out/full --fps "$F" --ss 2 --mb 8 --shutter 0.5 || exit 1
if [ -f sound/cues.json ]; then
  python3 ../tools/mix.py sound/cues.json sound/stems || exit 1
  ffmpeg -v error -y -framerate "$F" -i out/full/f%d.jpg -i sound/stems/master.wav -map 0:v -map 1:a -c:v libx264 -crf 15 -preset slow -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart "review/$N.mp4"
else
  ffmpeg -v error -y -framerate "$F" -i out/full/f%d.jpg -c:v libx264 -crf 15 -preset slow -pix_fmt yuv420p -movflags +faststart "review/$N.mp4"
fi
echo "review/$N.mp4"
