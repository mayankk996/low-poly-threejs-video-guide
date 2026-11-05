// Captions for a phone frame. 2-3 words at a time in capitals, with the spoken word in orange, on a soft dark oval.
// They sit just below the middle of the frame. The top 210, bottom 310 and right 84 px belong to the app's buttons.
const DIGITS = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', twenty: '20', thirty: '30', hundred: '100' };
const show = (w) => { const m = w.toLowerCase().replace(/[^a-z]/g, ''); return (DIGITS[m] ? w.toLowerCase().replace(m, DIGITS[m]) : w).toUpperCase(); };

export function buildLines(words, maxWords = 3, maxChars = 20, maxGap = .45) {
  const lines = []; let cur = [], len = 0;
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (cur.length && (cur.length >= maxWords || len + w.w.length > maxChars || w.a - prev.b > maxGap || /[.?!,]$/.test(prev.w))) { lines.push(cur); cur = []; len = 0; }
    cur.push(w); len += w.w.length + 1;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

export function drawCaptions(g, W, H, t, lines, y = .578) {
  const k = W / 1080, line = lines.find((l) => t >= l[0].a - .04 && t <= l[l.length - 1].b + .2); if (!line) return;
  g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.textAlign = 'left';
  g.font = `900 ${58 * k}px "Arial Black", Impact, sans-serif`;
  const parts = line.map((w) => show(w.w)), gap = 15 * k, total = parts.reduce((s, p) => s + g.measureText(p).width, 0) + gap * (parts.length - 1);
  let x = (W - total) / 2; const yy = H * y;
  const r = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  r.addColorStop(0, 'rgba(0,0,0,.62)'); r.addColorStop(.6, 'rgba(0,0,0,.42)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.translate(W / 2, yy - 20 * k); g.scale(total * .72 + 60 * k, 66 * k); g.fillStyle = r; g.fillRect(-1, -1, 2, 2); g.restore();
  line.forEach((w, i) => {
    const on = t >= w.a && t < (line[i + 1] ? line[i + 1].a : w.b + .2);
    g.strokeStyle = 'rgba(0,0,0,.9)'; g.lineWidth = 9 * k; g.strokeText(parts[i], x, yy);
    g.fillStyle = on ? '#ff8a1f' : '#fff'; g.fillText(parts[i], x, yy);
    x += g.measureText(parts[i]).width + gap;
  });
}

// One big line at a time, for films with no narrator.
export function drawLine(g, W, H, t, beats, y = .578) {
  const k = W / 1080, b = beats.find((x) => t >= x.a && t < x.b); if (!b) return;
  const u = Math.min(1, (t - b.a) / .12), s = 1.12 - .12 * (1 - (1 - u) ** 3);
  g.save(); g.translate(W / 2, H * y); g.scale(s, s); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  g.font = `900 ${56 * k}px "Arial Black", Impact, sans-serif`;
  g.strokeStyle = 'rgba(0,0,0,.92)'; g.lineWidth = 11 * k; g.strokeText(b.text, 0, 0); g.fillStyle = '#fff'; g.fillText(b.text, 0, 0);
  g.restore();
}
