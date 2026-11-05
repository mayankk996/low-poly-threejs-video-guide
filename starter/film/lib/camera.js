// Camera shots. Keys hold t, position, look-at and lens. Between keys the move never stops dead, so every cut lands inside movement.
import * as THREE from 'three';
import { clamp, lerp, sst, wander } from './timing.js';

export const K = (t, pos, at, fov = 34) => ({ t, pos, at, fov });
export function shotList(list, end) {
  const shots = [...list].sort((a, b) => a.a - b.a);
  shots.forEach((s, i) => { s.b = shots[i + 1] ? shots[i + 1].a : end; s.next = shots[i + 1]; s.prev = shots[i - 1]; });
  return { shots, at: (t) => { let i = 0; while (i < shots.length - 1 && t >= shots[i + 1].a) i++; return shots[i]; } };
}
// a shot that ends on a cut keeps its speed at the cut; a shot that starts on a cut starts moving
const flow = (u, s) => lerp(s.prev ? .3 * u + .7 * u * u : sst(u), s.next ? .35 * u + .65 * u * u : 1 - (1 - u) ** 2, u);
const p = new THREE.Vector3(), l = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
// energy: 0 quiet to 1 peak, shake: a list of { t, amp } impacts
export function placeCam(cam, s, t, { energy = .2, shake = [], whip = true } = {}) {
  const k = s.keys; let i = 0; while (i < k.length - 2 && t >= k[i + 1].t) i++;
  const A = k[i], B = k[i + 1] || k[i], u = B === A ? 0 : flow(clamp((t - A.t) / (B.t - A.t)), s);
  p.lerpVectors(a.set(...A.pos), b.set(...B.pos), u); l.lerpVectors(c.set(...A.at), d.set(...B.at), u);
  // never fully still: a small drift, stronger at peaks
  const dist = p.distanceTo(l), n = dist * (.0016 + energy * .002);
  p.x += wander(t * .7, 2) * n; p.y += wander(t * .9, 5) * n; l.x += wander(t * .6, 8) * n * .6;
  // an impact shake flips direction each frame and dies away within about 7 frames
  for (const h of shake) { const q = t - h.t; if (q >= 0 && q < .3) { const f = Math.floor(q * 30); const m = h.amp * dist * .02 * (1 - q / .3) * (f % 2 ? 1 : -1); p.x += m; p.y += m * .7; } }
  cam.position.copy(p); cam.lookAt(l); cam.fov = lerp(A.fov, B.fov, u);
  // a whip swings the lens hard into the cut and lands hard out of it, so the frame at the cut is all streaks
  let yaw = 0;
  if (whip && s.whipOut && s.next && t > s.b - .11) { const w = (t - (s.b - .11)) / .11; yaw += .55 * w * w * w; }
  if (whip && s.whipIn && s.prev && t < s.a + .26) { const w = (t - s.a) / .26; yaw -= .75 * (1 - w) ** 3; }
  if (yaw) cam.rotateY(yaw);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  return { focus: dist, moving: yaw !== 0 };
}
