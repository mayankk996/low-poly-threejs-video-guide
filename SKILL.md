---
name: low-poly-whatif-film
description: Make a vertical low poly what-if film in three.js with no narrator, where one change gets worse in sharp pulses, plus an Instagram promo. Use when asked for a low poly, blocky or no-narrator what-if video.
---

# Low poly what-if film

Read `GUIDE.md` for the reasoning, numbers and checks. This page tells you what to do and in what order.

## Rules that never bend

- Every frame is a pure function of `t`. No `Date.now()`, no state carried between frames. Seed all randomness.
- Physics bakes once at load, at a fixed 60 Hz. Frames only look up the result by time.
- Each pulse is bigger than the last, in picture and in sound.
- Numbers come from real arithmetic. Show your working in `NOTES.md`.
- Cuts land inside camera movement. No ease to a stop before a cut.
- Imply anything gross and never show it.
- Use only assets and sounds the user is licensed to use. Credit what the licence requires.
- Keep API keys in environment variables, never in project files.

## Step 0: Ask before writing

Ask the user, then write the answers to `NOTES.md`:

1. What is the what-if? Offer 5 peculiar or funny ones if they have no idea.
2. Who would a viewer send this to, and why?
3. What does the hero look like?
4. How long should it be? Default 60 s, and 40 to 80 s is the range.
5. Which sound library is licensed for this channel?

Offer 3 first-pulse openings and let the user pick.

## Step 1: Pulses

Rewrite `PULSES` in `starter/film/main.js`: 5 to 8 pulses about 2.6 s apart for a 20 s test, and more for a longer film. Each gets a number, a line, hero changes and a `power` and `radius`. Do the arithmetic and save it. Show the user the list before you build.

## Step 2: World and hero

Edit `film/lib/town.js` and `film/lib/hero.js`. Use flat shading, saturated colours and one colour reserved for the hero. Keep a readable face. Render stills:

```bash
node render.mjs film/index.html 0 1 out/test --times 1,5,10,15 --ss 1 --mb 2
```

Look at the stills before going on. If a still doesn't read at phone size, fix it.

## Step 3: Physics and camera

Tune `power` and `radius`. Re-key `SHOTS` so each pulse has a new angle, the hero's face shows in most shots and cuts land on motion. Keep the rule that hides meshes within 3.2 units of the camera.

## Step 4: Words

One short line per pulse, a counting number and an end question. Stay in the safe area: top 210, bottom 310, right 84. For Instagram, also nothing below y 1570 or right of x 940 in the lower half.

## Step 5: Sound

Write `sound/cues.json` from `examples/cues_template.json`. Run `tools/sound_check.py source` on each sound. Use a few exact hits and no looping ambience. Master at -14 LUFS with true peak at or under -1.5 dBTP.

## Step 6: Render and review

```bash
source ../.venv/bin/activate
./build.sh <end seconds> v1
python ../tools/shots.py out/full out/sheets
python ../tools/ends.py out/full out/sheets
python ../tools/sheet.py out/full out/sheets/whole.jpg
```

Open every sheet and look. Fix what you find and re-render only that stretch. Listen to the mix with `tools/sound_check.py gaps` if there's a voice, and with your own ears either way. Never say a film is finished until you've looked at the sheets and listened.

## Step 7: Promo

Follow the promo section of `GUIDE.md`. `tools/promo/safe_check.mjs` must print OK. The comment types as the word is spoken. No song in the file.

## Report

Tell the user what you made, what you checked by eye and by ear, and anything you couldn't check.
