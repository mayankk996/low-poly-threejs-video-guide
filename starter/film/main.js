// The demo film: "What if your weight doubled?" Twenty seconds, one town, one hero, six pulses, no narrator.
// Copy this file's shape for your own idea: PULSES holds the story, SHOTS holds the camera, world(t) holds what happens.
import * as THREE from 'three';
import { film } from './lib/runtime.js';
import { buildHero, buildPerson } from './lib/hero.js';
import { buildTown, buildCar } from './lib/town.js';
import { bake, apply } from './lib/physics.js';
import { K, shotList, placeCam } from './lib/camera.js';
import { drawLine } from './lib/captions.js';
import { clamp, lerp, sst, hash } from './lib/timing.js';

// Each pulse is one step of the change: a number, a line and bigger damage than the last. Everything is timed from this list.
const PULSES = [
  { t: 2.6, kg: '140 KG', hour: 1, fat: .12, size: 1, line: 'Your shoes sink in.', power: 1.4, radius: 7 },
  { t: 5.2, kg: '280 KG', hour: 2, fat: .32, size: 1.05, line: 'The pavement splits open.', power: 2.2, radius: 10 },
  { t: 7.8, kg: '1.1 TONNES', hour: 4, fat: .62, size: 1.25, line: 'As heavy as a car.', power: 3.2, radius: 14, pill: 'AS HEAVY AS A CAR' },
  { t: 10.4, kg: '9 TONNES', hour: 7, fat: .9, size: 2.1, line: 'Traffic takes off.', power: 6.5, radius: 26 },
  { t: 13, kg: '72 TONNES', hour: 10, fat: 1.15, size: 4, line: 'Whole shops go down.', power: 11, radius: 42 },
  { t: 15.6, kg: '2,294 TONNES', hour: 15, fat: 1.4, size: 9, line: 'Every pulse flattens a ring.', power: 16, radius: 90 },
];
const END = 20, CARD = 18.4;
const pulseAt = (t) => { let p = null; for (const q of PULSES) if (t >= q.t) p = q; return p; };
const hit = (t, q, d) => { const u = (t - q.t) / d; return u >= 0 && u < 1 ? 1 - u : 0; };

film(async ({ r, W, H }) => {
  const town = buildTown(r), scene = town.scene, hero = buildHero();
  scene.add(hero.root);
  const cam = new THREE.PerspectiveCamera(34, W / H, .1, 900);
  // the things physics moves
  const bodies = [], meshes = [];
  const tile = new THREE.MeshStandardMaterial({ color: 0xdcd8cc, flatShading: true, roughness: .85 }), crate = new THREE.MeshStandardMaterial({ color: 0xc08a4a, flatShading: true });
  for (let i = 0; i < 70; i++) {
    const s = .5 + hash(i) * .9, a = hash(i + 9) * 6.28, d = 1.6 + hash(i + 3) * 22, x = Math.cos(a) * d, z = -.5 + Math.sin(a) * Math.min(3.4, d);
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, .16, s * .8), i % 7 ? tile : crate); m.castShadow = m.receiveShadow = true; scene.add(m); meshes.push(m);
    bodies.push({ size: [s, .16, s * .8], pos: [x, .24, z], yaw: hash(i + 1) * .3, mass: 12 });
  }
  const carColors = [0xffcf33, 0x2d8bff, 0xff4f8b, 0x35d6a0, 0xffffff, 0xff7a2f];
  for (let i = 0; i < 12; i++) { const g = buildCar(carColors[i % 6]); scene.add(g); meshes.push(g); bodies.push({ size: [3.6, 1.3, 1.7], pos: [-44 + i * 8 + hash(i) * 2, .7, i % 2 ? 6 : 10], mass: 900 }); }
  const kicks = PULSES.map((p) => ({ t: p.t, at: [0, 0], power: p.power, radius: p.radius }));
  const baked = bake(bodies, kicks, END);
  // townsfolk stand, then run
  const folk = []; [0xff4f8b, 0x2d8bff, 0xffcf33, 0x35d6a0, 0xff7a2f, 0xb68cff, 0xffffff, 0x4fd6c0].forEach((c, i) => { const p = buildPerson(c); p.position.set(i % 2 ? 3 + i * 1.5 : -3 - i * 1.5, .16, 1.2 - (i % 3) * 1.4); scene.add(p); folk.push(p); });
  // each pulse: a ring on the ground, and cracks that spread
  const rings = PULSES.map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.4), transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .22; scene.add(m); return m; });
  const crackC = Object.assign(document.createElement('canvas'), { width: 1024, height: 1024 }), cg = crackC.getContext('2d'); cg.strokeStyle = '#2a2730'; cg.lineCap = 'round';
  for (let i = 0; i < 26; i++) { let x = 512, y = 512; const a = i / 26 * 6.283 + hash(i) * .3; cg.lineWidth = 5 - (i % 3); cg.beginPath(); cg.moveTo(x, y); for (let k = 0; k < 14; k++) { x += Math.cos(a + (hash(i * 3 + k) - .5) * 1.3) * 34; y += Math.sin(a + (hash(i * 5 + k) - .5) * 1.3) * 34; cg.lineTo(x, y); } cg.stroke(); }
  const crackT = new THREE.CanvasTexture(crackC); crackT.colorSpace = THREE.SRGBColorSpace;
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: crackT, transparent: true, depthWrite: false })); crack.rotation.x = -Math.PI / 2; crack.position.y = .185; scene.add(crack);
  // dust that rolls out on each pulse
  const puffC = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), pg = puffC.getContext('2d'); for (let i = 0; i < 14; i++) { const a = i * 2.4, q = Math.sqrt(i / 14) * 34, x = 64 + Math.cos(a) * q, y = 64 + Math.sin(a) * q, g = pg.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); pg.fillStyle = g; pg.fillRect(0, 0, 128, 128); }
  const puffT = new THREE.CanvasTexture(puffC), dust = []; for (let i = 0; i < 44; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, color: 0xece6d8, transparent: true, depthWrite: false })); scene.add(s); dust.push(s); }

  // Camera: low and close at first, pulling higher and wider as he grows. Each key lands on a pulse, so the move snaps with the hit.
  const { shots, at: shotAt } = shotList([
    { id: 1, a: 0, keys: [K(0, [1.4, .55, 3.7], [-3.2, 1.2, -.5], 30), K(2.75, [1.5, .85, 3.1], [-1.3, 1.2, -.5], 30)] },
    { id: 2, a: 2.75, keys: [K(2.75, [1.7, .32, 2.5], [-1.2, .7, -.5], 42), K(5.3, [3.2, .95, 4.1], [.2, 1.15, -.5], 34)] },
    { id: 3, a: 5.3, keys: [K(5.3, [3.9, 2.3, 4.6], [.6, .5, -.5], 40), K(7.9, [3.2, 1.3, 4.3], [.6, 1.2, -.5], 36)] },
    { id: 4, a: 7.9, keys: [K(7.9, [3.8, .55, 4.9], [.6, 1.05, -.3], 38), K(10.5, [5.2, 2.2, 8], [.6, 1.8, -.3], 36)] },
    { id: 5, a: 10.5, keys: [K(10.5, [-9, 1.3, 15], [0, 2.8, 0], 36), K(13.1, [-13, 6, 23], [0, 3.2, 0], 36)] },
    { id: 6, a: 13.1, keys: [K(13.1, [18, 11, 38], [0, 5, -2], 38), K(15.7, [30, 30, 62], [0, 5, -4], 38)] },
    { id: 7, a: 15.7, keys: [K(15.7, [20, 66, 74], [0, 5, -10], 40), K(20, [-14, 104, 110], [0, 7, -10], 40)] },
  ], END);
  const SHAKES = PULSES.map((p, i) => ({ t: p.t, amp: .7 + i * .35 }));
  const LOOK = { expo: 1.02, bloom: .22, sat: 1.12, contrast: 1.06, pop: .55, bloomCut: 1.15, vig: .22 };
  town.sun.fit(0, 0, 40);

  const world = (t) => {
    const s = shotAt(t), p = pulseAt(t), i = p ? PULSES.indexOf(p) : -1;
    // the hero: each value snaps toward the new pulse fast, then holds, so nothing inflates smoothly
    const ease = p ? sst((t - p.t) / .28) : 1, prev = i > 0 ? PULSES[i - 1] : { fat: 0, size: 1 }, fat = p ? lerp(prev.fat, p.fat, ease) : 0, size = p ? lerp(prev.size, p.size, ease) : 1;
    const walk = t < 5.2 ? 1 : t < 6.2 ? 1 - (t - 5.2) : 0, sit = sst((t - 7.8) / .4);
    const heroX = -3.2 + Math.min(t, 5.6) * .68 - 3.2 * 0;
    hero.root.position.set(heroX, .16 + hit(t, p || { t: 99 }, .18) * .06, -.5); hero.root.scale.setScalar(size); hero.root.rotation.y = Math.PI / 2 * (1 - sit) - .2 * sit + (walk ? 0 : .9 * (1 - sit));
    hero.pose({ t, fat, walk, sit, face: !p ? 'calm' : i < 2 ? 'worry' : hit(t, p, .8) > 0 ? 'shock' : 'strain', look: walk ? -.5 : 0 });
    for (let n = 0; n < meshes.length; n++) apply(meshes[n], baked, n, t);
    // people look, then run
    folk.forEach((f, n) => { const q = sst((t - 5.2 - n * .05) / .4), dir = n % 2 ? 1 : -1; f.position.x = (n % 2 ? 3 + n * 1.5 : -3 - n * 1.5) + q * dir * (t - 5.2) * 4.2; f.rotation.y = q ? dir * Math.PI / 2 : Math.atan2(heroX - f.position.x, -.5 - f.position.z); const u = f.userData, w = Math.sin(t * 14 + n) * .9 * q; u.l.rotation.x = w; u.r.rotation.x = -w; u.a.rotation.x = -w + (t > 2.6 ? -1.6 * (1 - q) : 0); u.b.rotation.x = w; });
    // rings, cracks and dust
    PULSES.forEach((q, n) => { const u = (t - q.t) / .9; rings[n].visible = u >= 0 && u < 1; if (rings[n].visible) { const R = q.radius * (.1 + (1 - (1 - u) ** 3) * 1.2); rings[n].scale.set(R, R, 1); rings[n].position.x = hero.root.position.x; rings[n].position.z = -.5; rings[n].material.opacity = (1 - u) * .85; } });
    const crackR = !p ? 0 : lerp(i ? PULSES[i - 1].radius * .7 : 0, p.radius * .7, sst((t - p.t) / .22)); crack.visible = crackR > 0; crack.scale.set(crackR * 2, crackR * 2, 1); crack.position.x = hero.root.position.x; crack.position.z = -.5;
    let di = 0; PULSES.forEach((q, n) => { const u = (t - q.t) / 1.7; if (u < 0 || u >= 1) return; for (let k = 0; k < 7 && di < dust.length; k++) { const a = hash(n * 11 + k) * 6.28, g = 1 - Math.exp(-u * 4), R = q.radius * .55 * g * (.6 + hash(k) * .5), d = dust[di++]; d.visible = true; d.position.set(hero.root.position.x + Math.cos(a) * R, .3 + g * (.5 + q.radius * .03), -.5 + Math.sin(a) * R); d.scale.setScalar((.5 + q.radius * .1) * (.35 + g)); d.material.opacity = .5 * (1 - u) ** 1.3; } });
    for (; di < dust.length; di++) dust[di].visible = false;
    // buildings tremble on every pulse, then the rings reached flatten
    town.buildings.forEach((b) => { const u = b.userData, d = Math.hypot(u.x - hero.root.position.x, u.z + .5); let down = 0, sh = 0; for (const q of PULSES) { const arrive = q.t + d / (q.radius * 1.3); if (t > arrive) { if (q.radius > d * 1.15 && q.radius > 25) down = Math.max(down, sst((t - arrive) / .5)); sh = Math.max(sh, Math.exp(-(t - arrive) * 7)); } } const k = 1 - down * .86; b.scale.y = Math.max(.03, k); b.position.y = u.h * k / 2; b.position.x = u.x + Math.sin(t * 60 + u.shake) * sh * .12; b.rotation.z = down * (u.shake - 3) * .012; });
    town.tick(t, p ? 1 : 0);
    const f = placeCam(cam, s, t, { energy: .6, shake: SHAKES, whip: false });
    town.sun.fit(0, 0, 16 + Math.min(95, f.focus));
    // nothing passes through the lens: anything this close to the camera is hidden
    for (const m of meshes) m.visible = m.position.distanceTo(cam.position) > 3.2;
    for (const d of dust) if (d.visible && d.position.distanceTo(cam.position) < 3.5) d.visible = false;
    return { scene, cam, shot: s.id, look: LOOK, focus: f.focus, blur: s.id < 5 ? .9 : 0, flash: p ? hit(t, p, .1) * .32 : 0, moving: false };
  };

  const big = (g, text, x, y, size, color, align = 'left', stroke = 10) => { g.font = `900 ${size}px "Arial Black", Impact, sans-serif`; g.textAlign = align; g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,0,0,.72)'; g.lineWidth = stroke; g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y); };
  const beats = PULSES.map((p, i) => ({ a: p.t + .06, b: (PULSES[i + 1]?.t || CARD) - .15, text: p.line }));
  const overlay = (g, t, W2, H2) => {
    const k = W2 / 1080, p = pulseAt(t), u = p ? clamp((t - p.t) / .16) : 1, pop = 1 + (1 - u) * .3;
    if (t < CARD) {
      big(g, 'HOUR', 56 * k, 262 * k, 34 * k, '#fff', 'left', 7 * k);
      g.save(); g.translate(56 * k, 362 * k); g.scale(pop, pop); big(g, String(p ? p.hour : 0), 0, 0, 104 * k, '#fff', 'left', 14 * k); g.restore();
      g.save(); g.translate(56 * k, 426 * k); g.scale(pop, pop); big(g, p ? p.kg : '70 KG', 0, 0, 46 * k, '#ffc247', 'left', 9 * k); g.restore();
      if (p?.pill) { g.font = `900 ${32 * k}px "Arial Black", Impact, sans-serif`; const w = g.measureText(p.pill).width + 40 * k; g.fillStyle = '#ff2f6b'; g.fillRect(56 * k, 450 * k, w, 54 * k); g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(p.pill, 76 * k, 489 * k); }
      drawLine(g, W2, H2, t, beats);
    } else {
      const v = sst((t - CARD) / .4); g.fillStyle = `rgba(6,10,24,${.58 * v})`; g.fillRect(0, 0, W2, H2); g.globalAlpha = v;
      big(g, 'Which hour would', W2 / 2, H2 * .47, 72 * k, '#fff', 'center', 11 * k); big(g, 'you stop it?', W2 / 2, H2 * .47 + 92 * k, 72 * k, '#ffc247', 'center', 11 * k); g.globalAlpha = 1;
    }
  };
  return { world, overlay };
});
