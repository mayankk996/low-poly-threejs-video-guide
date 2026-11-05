# Low poly what-if videos with three.js

Make vertical low poly videos where one strange change keeps getting worse, told in sharp pulses with no narrator. Everything is code, and it renders frame by frame on your own computer with free tools.

## Start here

You need Node.js 20 or newer, Google Chrome, ffmpeg and Python 3.10 or newer.

```bash
cd starter
npm install
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r ../tools/requirements.txt
./build.sh 20 demo
```

Then open `starter/review/demo.mp4`.

## What's inside

| Path | What it is |
|---|---|
| `GUIDE.md` | The full method, step by step |
| `SKILL.md` | The same method for an AI coding agent |
| `prompt.txt` | Paste this into any AI model to direct a film with you |
| `starter/` | The project that renders the demo |
| `tools/` | Shot sheets, sound mixing, checks and the promo tool |
| `examples/` | A sound template |

## Licence

MIT. See `LICENSE`. The tools and assets you install have their own licences, listed at the end of `GUIDE.md`.
