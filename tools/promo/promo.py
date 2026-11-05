#!/usr/bin/env python3
"""Builds a short vertical promo for a finished film: you talk, the film plays in a glowing window, a comment gets typed.

    python promo.py <project folder> cut      keep the parts of your take you want, and trim the film
    python promo.py <project folder> mix      your voice as recorded, plus a few exact sound effects
    python promo.py <project folder> html     writes index.html for the render
    python promo.py <project folder> all      all three

Everything is set in <project folder>/config.json. See sample/config.json.
All times in the config are seconds in your raw take, so re-cutting never moves a caption off its word.
"""
import json, os, shutil, subprocess, sys

P = os.path.abspath(sys.argv[1])
STEP = sys.argv[2]
C = json.load(open(f'{P}/config.json'))
SEG = C['segments']
RAW = os.path.join(P, C['take'])
FILM = os.path.join(P, C['film'])
os.makedirs(f'{P}/assets', exist_ok=True)

# The safe area. Instagram's buttons and caption cover everything outside it, so nothing that matters goes there.
SAFE = {'top': 210, 'bottom': 1570, 'right_low': 940, 'left': 40}
HOLD_SHARE = 1.3   # how long the share screen stays up, in seconds
ORANGE, RING = '#FF8A1F', '#FF9A3C'
FONT = C.get('font_family', '"Archivo Black", Arial, sans-serif')


def run(*a):
    subprocess.run(a, check=True)


def out(raw):
    """Where a moment in the raw take lands in the finished cut."""
    t = 0
    for a, b in SEG:
        if a - 1e-6 <= raw <= b + 1e-6:
            return round(t + raw - a, 3)
        t += b - a
    raise SystemExit(f'{raw} s in the take is outside your segments. Add it to a segment or change the time.')


CUT_END = round(sum(b - a for a, b in SEG), 3)
CARD = round(CUT_END - .03, 3)
SHARE = round(CARD + .2, 3)
DUR = round(SHARE + HOLD_SHARE + .05, 3)
POP_IN, POP_END = out(C['film_in']), out(C['film_out'])
BAR_IN = out(C['comment_at'])
SAID_A, SAID_B = out(C['comment_said'][0]), out(C['comment_said'][1])   # when the word is spoken
POSTED = round(SAID_B + .25, 3)
HEART = round(POSTED + .3, 3)
if SAID_A - BAR_IN < .25:
    raise SystemExit('comment_at must be at least 0.25 s before the word is said, so the bar has landed when typing starts.')

if STEP in ('cut', 'all'):
    trims = ''.join(f'[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];' for i, (a, b) in enumerate(SEG))
    chain = trims + ''.join(f'[v{i}]' for i in range(len(SEG))) + f'concat=n={len(SEG)}:v=1:a=0,fps=60,format=yuv420p[o]'
    run('ffmpeg', '-v', 'error', '-y', '-i', RAW, '-filter_complex', chain, '-map', '[o]', '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-map_metadata', '-1', f'{P}/assets/src.mp4')
    # the film never brings its own sound: a song belongs in the app, added at posting time
    run('ffmpeg', '-v', 'error', '-y', '-ss', str(C.get('film_start', 0)), '-t', str(round(POP_END - POP_IN + .2, 3)), '-i', FILM, '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-map_metadata', '-1', f'{P}/assets/film.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-ss', str(max(0, CUT_END - .05)), '-i', f'{P}/assets/src.mp4', '-frames:v', '1', '-q:v', '2', '-map_metadata', '-1', f'{P}/assets/end_frame.jpg')

if STEP in ('mix', 'all'):
    # The voice stays exactly as recorded, with 5 ms fades on each cut so no cut clicks.
    # "mute" silences parts of the room sound, such as a song leaking into the mic. Muting can't save a line you spoke over the song: re-record it.
    fc = '[0:a]aformat=sample_rates=48000:channel_layouts=stereo'
    for a, b in C.get('mute', []):
        fc += f",volume=enable='between(t,{a},{b})':volume=0"
    fc += f',asplit={len(SEG)}' + ''.join(f'[r{i}]' for i in range(len(SEG))) + ';'
    for i, (a, b) in enumerate(SEG):
        fc += f'[r{i}]atrim={a}:{b},asetpts=N/SR/TB,afade=t=in:d=0.005,afade=t=out:st={round(b - a - .005, 3)}:d=0.005[s{i}];'
    fc += ''.join(f'[s{i}]' for i in range(len(SEG))) + f'concat=n={len(SEG)}:v=0:a=1,apad=whole_dur={DUR}[voice];'
    fx = C.get('sfx', {})
    hits = [('pop', POP_IN + 1.0, -10), ('pop', POSTED, -9), ('pop', HEART, -11), ('pop', SHARE + .2, -7), ('whoosh', POP_IN - .08, -13), ('whoosh', POP_END - .28, -13), ('whoosh', SHARE - .1, -12)]
    hits = [h for h in hits if h[0] in fx]
    inputs, labels = ['-i', RAW], ''
    for i, (name, t, db) in enumerate(hits):
        inputs += ['-i', os.path.join(P, fx[name])]
        fc += f'[{i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume={db}dB,adelay={max(0, int(t * 1000))}:all=1[h{i}];'
        labels += f'[h{i}]'
    fc += f'[voice]{labels}amix=inputs={1 + len(hits)}:normalize=0:duration=first[o]'
    run('ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[o]', '-c:a', 'pcm_s24le', '-map_metadata', '-1', f'{P}/assets/mix.wav')

if STEP in ('html', 'all'):
    # the animation library lives beside this tool after npm install, so no page ever depends on a web link
    shutil.copyfile(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'node_modules/gsap/dist/gsap.min.js'), f'{P}/assets/gsap.min.js')
    W, H = C.get('film_width', 420), round(C.get('film_width', 420) * 16 / 9)
    left, top = C.get('film_left', 290), C.get('film_top', 620)
    CAP_LOW, CAP_HIGH = 1440, 1180   # captions sit low, and move up while the comment bar is on screen

    # captions: one short group at a time, the word being said in orange
    caps, js = [], []
    groups = C['captions']
    for i, group in enumerate(groups):
        s = out(group[0][1])
        e = out(groups[i + 1][0][1]) if i + 1 < len(groups) else CUT_END
        e = min(e, out(group[-1][1]) + .75)
        y = CAP_HIGH if group[0][1] >= C['comment_at'] else CAP_LOW
        spans = ''
        for j, (word, t) in enumerate(group):
            spans += f'<span id="w{i}_{j}" class="w">{word}</span> '
            js.append(f'tl.set("#w{i}_{j}",{{color:"{ORANGE}"}},{out(t)});')
            if j + 1 < len(group):
                js.append(f'tl.set("#w{i}_{j}",{{color:"#FFFFFF"}},{out(group[j + 1][1])});')
        js.append(f'tl.fromTo("#cin{i}",{{scale:.86,y:10}},{{scale:1,y:0,duration:.11,ease:"back.out(2.4)"}},{s});')
        caps.append(f'<div id="cap{i}" class="clip cap safe" data-start="{s}" data-duration="{round(e - s, 3)}" data-track-index="5" style="top:{y - 60}px"><div class="capin safe-text" id="cin{i}">{spans.strip()}</div></div>')

    # the comment types as the word is said: first letter on the word's first sound, last letter by its end
    word = C['comment_word']
    letters = ''.join(f'<span class="ch" id="c{i}">{"&nbsp;" if c == " " else c}</span>' for i, c in enumerate(word))
    step = round((SAID_B - SAID_A) / len(word), 3)
    typing = [f'tl.set("#ph",{{display:"none"}},{SAID_A});', f'tl.set("#caret",{{display:"inline-block"}},{SAID_A});', f'tl.set("#post",{{color:"#0095F6"}},{SAID_A});']
    typing += [f'tl.set("#c{i}",{{display:"inline"}},{round(SAID_A + i * step, 3)});' for i in range(len(word))]
    typing += [f'tl.set("#c{i}",{{display:"none"}},{POSTED});' for i in range(len(word))]
    typing += [f'tl.set("#caret",{{display:"none"}},{POSTED});', f'tl.set("#ph",{{display:"inline"}},{POSTED});', f'tl.set("#post",{{color:"#B4D2F0"}},{POSTED});']

    # logos: only real official files that you supply yourself
    logos, logo_js = '', []
    for i, (path, t) in enumerate(C.get('logos', [])):
        logos += f'<div class="clip logo safe" data-start="{out(t)}" data-duration="{round(POP_IN - out(t), 3)}" data-track-index="3" style="top:{300 + i * 190}px"><img id="logo{i}" src="{path}" alt=""></div>'
        logo_js.append(f'tl.fromTo("#logo{i}",{{scale:0,rotation:-40}},{{scale:1,rotation:0,duration:.3,ease:"back.out(2.2)"}},{out(t)});')

    zoom = C.get('lean_in', 1.25)
    anim = f'''
// you lean in as the comment bar lands, a push that keeps the end of the cut moving
tl.fromTo("#v0",{{scale:1}},{{scale:{zoom},duration:{round(CUT_END - BAR_IN, 3)},ease:"power1.inOut"}},{BAR_IN});
// the film pops out, plays uncut, and drops back
tl.fromTo("#pop",{{y:70,scale:.72,opacity:0}},{{y:0,scale:1,opacity:1,duration:.3,ease:"back.out(1.5)"}},{POP_IN});
tl.fromTo("#pop",{{scale:1}},{{scale:.34,y:120,opacity:0,duration:.26,ease:"power3.in",immediateRender:false}},{round(POP_END - .26, 3)});
tl.fromTo("#rim",{{boxShadow:"0 0 26px 6px rgba(255,138,31,.75), 0 0 90px 22px rgba(255,138,31,.32)"}},{{boxShadow:"0 0 44px 12px rgba(255,138,31,1), 0 0 130px 40px rgba(255,138,31,.48)",duration:.5,ease:"sine.inOut",yoyo:true,repeat:{int((POP_END - POP_IN) / .5)}}},{POP_IN});
// the comment bar comes up, the comment lands, a heart answers it
tl.fromTo("#barIn",{{y:300,opacity:0}},{{y:0,opacity:1,duration:.26,ease:"power3.out"}},{BAR_IN});
tl.fromTo("#post",{{scale:1}},{{scale:.78,duration:.08,ease:"power2.in",yoyo:true,repeat:1}},{round(POSTED - .04, 3)});
tl.fromTo("#cm",{{y:50,opacity:0,scale:.9}},{{y:0,opacity:1,scale:1,duration:.22,ease:"back.out(1.8)"}},{POSTED});
tl.fromTo("#hrt",{{scale:0}},{{scale:1,duration:.24,ease:"back.out(2.6)"}},{HEART});
tl.fromTo("#barFade",{{opacity:1}},{{opacity:0,duration:.14,immediateRender:false}},{CARD});
tl.fromTo("#uiW",{{opacity:1}},{{opacity:0,duration:.14,immediateRender:false}},{CARD});
// the last frame blurs and darkens under very little text
tl.fromTo("#endImg",{{filter:"blur(0px)",scale:{zoom}}},{{filter:"blur(30px)",scale:{zoom + .08},duration:.22,ease:"power2.out"}},{CARD});
tl.fromTo("#endDim",{{opacity:0}},{{opacity:.72,duration:.22,ease:"power2.out"}},{CARD});
["#l1","#l2","#l3"].forEach((id,i)=>tl.fromTo(id,{{y:46,opacity:0}},{{y:0,opacity:1,duration:.18,ease:"power3.out"}},{SHARE}+i*.08));
tl.fromTo("#plane",{{x:-300,y:120,rotation:-25,opacity:0}},{{x:0,y:0,rotation:0,opacity:1,duration:.24,ease:"power3.out"}},{round(SHARE + .2, 3)});
'''
    face = f'@font-face{{font-family:"Promo";src:url("{C["font_file"]}")}}' if C.get('font_file') else ''
    family = '"Promo",' + FONT if C.get('font_file') else FONT
    html = f'''<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920"><title>Promo</title>
<script src="assets/gsap.min.js"></script>
<style>
{face}
body{{margin:0;background:#000}}
#root{{position:relative;width:100%;height:100%;overflow:hidden;background:#000;font-family:{family}}}
.vw{{position:absolute;inset:0;overflow:hidden}}
video{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.cap{{position:absolute;left:60px;width:880px;height:120px;display:flex;align-items:center;justify-content:center}}
.capin{{font-size:62px;line-height:1;color:#fff;white-space:nowrap;text-align:center;-webkit-text-stroke:11px #000;paint-order:stroke fill;text-shadow:0 6px 18px rgba(0,0,0,.55)}}
.w{{display:inline-block;color:#fff}}
.logo{{position:absolute;left:760px}}.logo img{{width:160px;height:160px;display:block}}
#pop{{position:absolute;left:{left}px;top:{top}px;width:{W}px;height:{H}px;transform-origin:50% 50%;opacity:0}}
#popClip{{position:absolute;inset:0;border-radius:24px;overflow:hidden;background:#000}}
#rim{{position:absolute;inset:-5px;border:5px solid {RING};border-radius:29px}}
#end{{position:absolute;inset:0;overflow:hidden}}
#endImg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
#endDim{{position:absolute;inset:0;background:#000;opacity:0}}
#endCol{{position:absolute;left:60px;width:880px;top:560px;display:flex;flex-direction:column;align-items:center;gap:40px}}
#plane{{width:120px;height:120px;display:block;opacity:0}}
#endTxt{{font-size:84px;line-height:1.1;color:#fff;text-align:center}}
#endTxt div{{white-space:nowrap;opacity:0}}
#l3{{color:{ORANGE}}}
#bar{{position:absolute;left:60px;top:1400px;width:860px;height:110px}}
#barIn{{position:absolute;inset:0;opacity:0}}
#barFade{{position:absolute;inset:0;display:flex;align-items:center;border-radius:55px;background:#fff;box-shadow:0 12px 34px rgba(0,0,0,.4);font-family:Helvetica,Arial,sans-serif;font-size:40px;font-weight:600;color:#141414;box-sizing:border-box;padding:0 34px 0 22px}}
.av{{flex:none;border-radius:50%;background:#2a9d8f}}
#barFade .av{{width:68px;height:68px;margin-right:24px}}
#typed{{flex:1;white-space:nowrap;overflow:hidden}}
#ph{{color:#969696;font-weight:500}}
.ch{{display:none}}
#caret{{display:none;width:4px;height:44px;background:#0095F6;margin-left:3px;vertical-align:-8px}}
#post{{flex:none;color:#B4D2F0;font-weight:700}}
#uiW{{position:absolute;inset:0;font-family:Helvetica,Arial,sans-serif;color:#141414}}
#cm{{position:absolute;left:60px;top:1280px;width:600px;height:104px;background:#fff;border-radius:32px;box-sizing:border-box;display:flex;align-items:center;gap:20px;padding:0 30px 0 22px;opacity:0}}
#cm .av{{width:62px;height:62px}}
.who{{font-size:25px;font-weight:500;color:#787878;line-height:1.2}}
.txt{{font-size:38px;font-weight:700;line-height:1.2;white-space:nowrap}}
.grow{{flex:1}}
#hrt{{width:48px;height:48px;display:block}}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="{DUR}">
<div class="vw"><video id="v0" src="assets/src.mp4" muted playsinline data-start="0" data-duration="{CUT_END}" data-media-start="0" data-track-index="0"></video></div>
<div id="pop" class="safe"><div id="popClip"><video id="film" src="assets/film.mp4" muted playsinline data-start="{POP_IN}" data-duration="{round(POP_END - POP_IN, 3)}" data-media-start="0" data-track-index="1"></video></div><div id="rim" class="clip" data-start="{POP_IN}" data-duration="{round(POP_END - POP_IN, 3)}" data-track-index="2"></div></div>
<audio id="mix" src="assets/mix.wav" data-start="0" data-duration="{DUR}" data-track-index="9" data-volume="1"></audio>
{logos}
{"".join(caps)}
<div id="end" class="clip" data-start="{CARD}" data-duration="{round(DUR - CARD, 3)}" data-track-index="6"><img id="endImg" src="assets/end_frame.jpg" alt=""><div id="endDim"></div><div id="endCol" class="safe"><svg id="plane" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M22 3 2.5 9.5l7.5 3.5 3.5 7.5z"/><path d="M22 3 10 13"/></svg><div id="endTxt" class="safe-text"><div id="l1">SHARE IT</div><div id="l2">WITH YOUR</div><div id="l3">FRIENDS</div></div></div></div>
<div id="ui" class="clip" data-start="{POSTED}" data-duration="{round(SHARE - POSTED, 3)}" data-track-index="7" style="position:absolute;inset:0"><div id="uiW"><div id="cm" class="safe"><div class="av"></div><div class="grow"><div class="who">you</div><div class="txt">{word}</div></div><svg id="hrt" viewBox="0 0 24 24"><path fill="#FF3040" d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 7a4.8 4.8 0 0 1 8.5 2.8C20.500 15.700 12 21 12 21z"/></svg></div></div></div>
<div id="bar" class="clip safe" data-start="{BAR_IN}" data-duration="{round(SHARE - BAR_IN, 3)}" data-track-index="8"><div id="barIn"><div id="barFade"><div class="av"></div><div id="typed"><span id="ph">Add a comment...</span>{letters}<span id="caret"></span></div><div id="post">Post</div></div></div></div>
</div>
<script>
window.__timelines=window.__timelines||{{}};
const tl=gsap.timeline({{paused:true}});
{anim}
{chr(10).join(logo_js)}
{chr(10).join(typing)}
{chr(10).join(js)}
window.__timelines["main"]=tl;
</script></body></html>'''
    open(f'{P}/index.html', 'w').write(html)

print(f'length {DUR} s. Film window {POP_IN} to {POP_END}. Comment bar {BAR_IN}, typing {SAID_A} to {SAID_B}, posted {POSTED}.')
