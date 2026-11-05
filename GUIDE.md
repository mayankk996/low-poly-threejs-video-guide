# How to make low poly what-if videos with three.js

A blocky, colourful 3D world, one hero, and one thing that keeps getting worse in sharp pulses. There's no narrator, so sound effects and physics tell the story. You write it all in code, and Chrome renders it frame by frame.

**What you end up with:** a vertical 1080x1920 film of 40 to 80 s, and a short promo that sells it.

**What this folder gives you:**

| Path | What it is |
|---|---|
| `GUIDE.md` | This guide |
| `SKILL.md` | The same method as instructions for an AI coding agent |
| `starter/` | A working project that renders a 20-second demo. Your film starts as a copy of it |
| `tools/` | Shot sheets, sound mixing, sound checks and the promo tool |
| `examples/` | A sound template |

**Who this is for:** you don't need to be an animator, but you do need to be comfortable running commands. An AI coding agent can write most of the code if you give it `SKILL.md`.

## What you need

- **Node.js** 20 or newer, **Google Chrome**, **ffmpeg** and **Python** 3.10 or newer
- A computer with a decent graphics chip. A recent laptop is fine
- A sound effects library you are licensed to use

### Set it up and render the demo

Run these from this folder:

```bash
cd starter
npm install
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install -r ../tools/requirements.txt
./build.sh 20 demo
```

**You'll know it worked when** `starter/review/demo.mp4` plays and shows a town, a hero who grows, and traffic thrown into the air.

If it stops, the error from the page is printed in the terminal.

## The order of work

1. Pick the idea
2. Write the pulses
3. Build the world and the hero
4. Add the physics
5. Move the camera
6. Add the words on screen
7. Add sound
8. Render and check every shot
9. Make the promo

Keep this order. Keep a `NOTES.md` beside each film with its status, decisions and fixes.

## 1. Pick the idea

The best ideas are about the viewer's own body or daily life, and they're strange enough to send to a friend: your weight doubles every hour, you stop being able to blink, your shadow gets heavy.

- Pick one change that can only get worse
- Pick funny or peculiar over merely large
- Imply anything gross and never show it
- Avoid "How X works" and "The science behind X"

**You'll know it worked when** you can say it in one line starting "What if you..." and picture the last pulse straight away.

## 2. Write the pulses

A pulse is one step of the change. The film is a list of them, and `PULSES` at the top of `film/main.js` holds that list:

```js
{ t: 5.2, kg: '280 KG', hour: 2, fat: .32, size: 1.05, line: 'The pavement splits open.', power: 2.2, radius: 10 },
```

Rules for pulses:

- Space them about 2.6 s apart. Each one lands, then holds for a moment so the eye can read the damage
- Make every pulse bigger than the one before, in what you see and what you hear
- Do the real arithmetic. In the demo, 70 kg doubling 15 times is 2,294 tonnes, and the film shows that number
- Show the result on the hero's body first, then on the world
- Cut to a reaction close-up at least twice, because a face sells the scale

**You'll know it worked when** you can read the list aloud and each line tops the last.

## 3. Build the world and the hero

Low poly means few polygons, flat shading and strong colour. `film/lib/town.js` builds the demo town and `film/lib/hero.js` builds the hero.

- **Flat shading:** set `flatShading: true`, so each face reads as one clean colour
- **Colour:** saturated and bright, with one colour for the hero that nothing else uses
- **Detail:** put it on the hero. The world can be boxes as long as it has a lot of them
- **Ground contact:** every object casts a real shadow, or it floats
- **Hero:** give them a readable face, because a face that reacts is worth more than extra geometry
- **Clothes:** invent your own character and leave any brand or name off the clothes

**You'll know it worked when** a still of any shot reads clearly at phone size in under a second.

## 4. Add the physics

The starter runs real rigid-body physics in `film/lib/physics.js`, using cannon-es, and bakes it when the page loads.

- Physics runs once at a fixed 60 steps a second, and each frame looks up its result by time
- Never step physics while drawing a frame. Every frame must be a pure function of `t`, so any stretch can be re-rendered on its own
- Seed all randomness. `film/index.html` replaces `Math.random` with a seeded one
- Each pulse is an outward force with a `power` and a `radius`. Raise both a little every pulse

**You'll know it worked when** rendering the same frame twice gives the same picture, and rendering from the middle of the film matches a full run.

## 5. Move the camera

Camera keys sit in `SHOTS` as `K(time, position, lookAt, fov)`. `placeCam` moves between them.

- Cut on motion: a cut lands while the camera is moving, with no ease to a stop before it
- Never let the camera go dead. Add slow drift between pulses and a sharp shake on each hit. The shake flips direction every frame and dies quickly
- Each pulse gets a new angle, usually lower and wider as the hero grows
- Show the hero's face in most shots
- Anything within 3.2 units of the camera is hidden, so debris can't pass through the lens and fill the frame

**You'll know it worked when** `tools/shots.py` shows the hero or the damage clearly in every shot.

## 6. Add the words on screen

There's no voice, so the words do that job.

- One short line per pulse, in capitals
- One big number that counts up, placed inside the safe area
- Last screen: a question that makes people reply, such as "Which hour would you stop it?"
- Safe area: nothing that matters in the top 210 px, the bottom 310 px or the right 84 px. For Instagram, also nothing below y 1570 or right of x 940 in the lower half

**You'll know it worked when** the film makes sense with the sound off.

## 7. Add sound

With no narrator, sound carries the film. Build `starter/sound/cues.json` from `examples/cues_template.json`:

```json
{ "end": 20, "sfx": [{ "file": "sound/slam.wav", "t": 5.2, "peak": -6 }], "music": [] }
```

- Use a few exact hits. Each pulse gets one big impact, and each one is bigger than the last
- Build up to each pulse with a short rise, and leave a beat of near-silence just before the biggest hit
- Don't use looping or continuous ambience
- Run every new sound through the check. Reject heavy hiss above about -8 dB: `python ../tools/sound_check.py source sound/slam.wav`
- The master comes out at -14 LUFS, with true peak at or under -1.5 dBTP

**You'll know it worked when** you can look away and still tell when each pulse hits.

## 8. Render and check every shot

Make sure the Python environment is active, then run:

```bash
./build.sh 20 v1
python ../tools/shots.py out/full out/sheets
python ../tools/ends.py out/full out/sheets
python ../tools/sheet.py out/full out/sheets/whole.jpg
```

Open all the sheets and check for these:

- Numbers or words cut off
- The hero's face hidden
- Parts of the body passing through each other
- A camera inside a building
- A shot that holds on nothing

**You'll know it worked when** you've looked at every sheet and fixed each thing you found. Render a 3 s piece with `node render.mjs film/index.html 5 8 out/test --ss 1 --mb 2` while you're iterating.

## 9. Make the promo

Use the promo section below once the film is final.

## Make the Instagram promo

This cuts a short vertical video that sells the film: you talk to camera, the film plays in a glowing window, and a comment gets typed as you say the word. The tool is in `tools/promo/`.

**Set it up:**

```bash
cd tools/promo
npm install
mkdir -p my_promo/raw
cp sample/config.json my_promo/
```

Put your recording at `my_promo/raw/take.mp4` and your finished film at `my_promo/raw/film.mp4`.

**1. Record.** Film yourself vertically, 1080x1920. Start on the fastest thing you can say about the film, and finish by asking for one comment word.

Play the film silently while you record. A song playing in the room goes into your mic and you can't take it out later.

**You'll know it worked when** you can play the take in headphones and hear only your voice.

**2. Fill in `config.json`.** Every time is in seconds in your raw take, so re-cutting never moves a caption off its word.

| Setting | What it is |
|---|---|
| `segments` | The parts of the take to keep, as `[start, end]` pairs |
| `film_in`, `film_out` | When the film window opens and closes |
| `film_start` | Where in the film the window starts playing |
| `comment_at` | When the comment bar comes up, at least 0.25 s before the word |
| `comment_said` | The start and end of the comment word as you speak it |
| `comment_word` | The word that gets typed |
| `captions` | Groups of `[word, time]`, 2 or 3 words each, in capitals |
| `mute` | Parts of the room sound to silence, as `[start, end]` pairs |
| `sfx` | Optional: `{"pop": "sfx/pop.wav", "whoosh": "sfx/whoosh.wav"}` with files you are licensed to use |
| `logos` | Optional: `[["assets/logo.png", time]]`. Only real official files you may use |

Get the times from `tools/align.py`, not by guessing. Set `comment_said` from the start and end of the word in `words.json`.

**3. Build it and measure it.**

```bash
python3 promo.py my_promo all
node safe_check.mjs my_promo
```

**You'll know it worked when** the check prints `OK: all ... elements are inside the safe area`. If it prints `FAIL`, fix what it names and run it again. Measure every time, because a safe area that looks fine on your computer can still sit under Instagram's buttons on a phone.

**4. Render it.**

```bash
cd my_promo
../node_modules/.bin/hyperframes render --output promo.mp4
```

**You'll know it worked when** `my_promo/promo.mp4` plays with your voice, and these all hold when you step through it:

- The first letter of the comment appears on the first sound of the spoken word, and the last letter by its end
- The film window plays without a cut
- The share screen stays up for about 1.3 s
- No music is audible anywhere

**The rules:**

- **Hook:** fast, in the first words. Don't introduce yourself.
- **Film window:** the film plays uncut, in a window with a glowing rim. Keep the window inside the safe area.
- **Captions:** white with a black outline, the spoken word in orange, centred near y 1440 of 1920. They move up while the comment bar is on screen.
- **Safe area:** nothing that matters above y 210, below y 1570, or right of x 940 in the lower half.
- **Comment:** it types as you say the word, never after it. Typing that trails the voice looks like a mistake.
- **End screen:** blur and darken the last frame, with very little text.
- **Voice:** as recorded, with 5 ms fades on each cut. No compressor, de-esser or noise removal.
- **Sound effects:** a few exact ones. Pop on the comment, whoosh on the window. If in doubt, leave it out.
- **Songs:** never in this file. Add a licensed song inside the app when you post.
- **Claims:** say what you did. Don't talk about tools you didn't use, and don't show logos you may not use.

## Common traps

| What you see | Why | What to do |
|---|---|---|
| Debris fills the frame for a few frames | A piece flew through the lens | Keep the near-camera hide rule, and lower the `power` |
| A different result on each render | Physics or randomness depends on real time | Bake once and seed everything |
| The town looks dull | Colours are too close together, or the light is too flat | Raise saturation and use a strong sun with shadows |
| The hero looks stiff | Only the size changes | Add breathing, looks and a reaction on every pulse |
| Later pulses feel weaker | The picture grows but the sound doesn't, or the reverse | Raise both together |
| The camera sits in a wall | A key was placed without looking | Check `shots.py` and move the key |

## Make it your own

Replace `PULSES`, the hero, the town and the end question. Invent your own character and world, and don't copy another creator's characters or shots.

## Tools and licences

Install these yourself. The code in this folder is MIT, as `LICENSE` says.

| Tool | Licence | What you need to do |
|---|---|---|
| three.js | MIT | Nothing extra for your videos |
| cannon-es | MIT | Nothing extra for your videos |
| playwright-core | Apache-2.0 | Nothing extra for your videos |
| hyperframes (promo) | Apache-2.0 | Nothing extra for your videos |
| GSAP (promo) | Its own free standard licence | Read its terms before commercial use |
| ffmpeg, Node.js, Python, Chrome | Their own licences | Free to install and use |
| Archivo Black font (promo) | SIL Open Font License | Free to use in videos |

**Assets:** CC0 needs no credit. CC BY needs a credit in your description, and GPL assets carry their own terms. Keep a note of every model and sound with its licence. No music or sound effects are included here, so use a library you are licensed for.
