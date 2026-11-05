// Time helpers. Nothing here keeps state: the same t always gives the same answer, so any frame can be re-rendered alone.
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const sst = (x) => { const u = clamp(x); return u * u * (3 - 2 * u); };
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// a smooth wandering value between -1 and 1, for wind and small drifts
export const wander = (t, seed = 0) => Math.sin(t * 1.3 + seed) * .55 + Math.sin(t * 2.9 + seed * 2.1) * .3 + Math.sin(t * 5.3 + seed * 3.7) * .15;

// at('One bolt') gives the time those words start. A phrase that isn't there stops the render, on purpose.
export function wordClock(words) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  return (phrase, after = 0) => {
    const want = phrase.split(/\s+/).map(norm);
    for (let i = 0; i <= words.length - want.length; i++) {
      if (words[i].a < after) continue;
      if (want.every((w, k) => norm(words[i + k].w) === w)) return words[i].a;
    }
    throw new Error(`at(): "${phrase}" is not in the word list after ${after} s`);
  };
}
