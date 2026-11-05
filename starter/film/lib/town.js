// A clean, bright town: flat-shaded solids, popping colours and very little detail. The hero and the destruction are the stars.
import * as THREE from 'three';
import { hash, wander } from './timing.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, flatShading: true, ...o });
const paint = (w, h, draw, repeat) => { const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 12; if (repeat) t.repeat.set(...repeat); return t; };
const box = (parent, w, h, d, material, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
const COLORS = [0xff7f9e, 0x53c7ff, 0x8fe388, 0xffc247, 0xb68cff, 0x4fd6c0, 0xff9a57, 0xf2f2ee];

function facade(base) {
  return paint(256, 512, (g, w, h) => {
    g.fillStyle = '#' + base.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h);
    for (let y = 18; y < h - 40; y += 62) for (let x = 20; x < w - 30; x += 58) { g.fillStyle = 'rgba(20,28,60,.72)'; g.fillRect(x, y, 34, 42); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x + 3, y + 3, 12, 14); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x - 3, y + 42, 40, 5); }
  });
}

export function buildTown(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd8ff); scene.fog = new THREE.Fog(0xbfe6ff, 55, 300);
  const sun = new THREE.DirectionalLight(0xfff2dd, 3.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target, new THREE.HemisphereLight(0xcfeaff, 0x8a9a80, 1.5));
  sun.fit = (x, z, r) => { sun.target.position.set(x, 0, z); sun.position.set(x + 38, 64, z + 30); const c = sun.shadow.camera; c.left = c.bottom = -r; c.right = c.top = r; c.near = 1; c.far = 240; c.updateProjectionMatrix(); };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat(0x8fd16a)); ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true; scene.add(ground);
  // the road runs along x; the pavement the hero walks on sits in front of the shops
  const road = paint(512, 256, (g, w, h) => { g.fillStyle = '#4c5260'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7d44c'; for (let x = 12; x < w; x += 128) g.fillRect(x, h / 2 - 5, 70, 10); g.fillStyle = '#f2f2ee'; g.fillRect(0, 10, w, 7); g.fillRect(0, h - 17, w, 7); }, [40, 1]);
  const roadM = new THREE.Mesh(new THREE.PlaneGeometry(600, 11), new THREE.MeshStandardMaterial({ map: road, roughness: .9 })); roadM.rotation.x = -Math.PI / 2; roadM.position.set(0, .005, 8); roadM.receiveShadow = true; scene.add(roadM);
  const path = paint(512, 512, (g, w, h) => { g.fillStyle = '#e8e4da'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9c4b8'; g.lineWidth = 5; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); } }, [120, 2]);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(600, .16, 8), new THREE.MeshStandardMaterial({ map: path, roughness: .85 })); walk.position.set(0, .08, -.5); walk.receiveShadow = true; scene.add(walk);
  // buildings stand in rows, so a pulse can flatten them row by row (see main.js)
  const buildings = [];
  const shopA = paint(512, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { g.fillStyle = x % 128 ? '#2d8bff' : '#fff'; g.fillRect(x, 0, 64, h); } });
  for (let row = 0; row < 6; row++) for (let i = -9; i <= 9; i++) {
    const c = COLORS[Math.floor(hash(i * 3.1 + row * 7.7) * COLORS.length)], h = row === 0 ? 8 + hash(i + 1) * 9 : 7 + hash(i * 2.3 + row) * (10 + row * 7), w = 9.2, x = i * 10, z = -9.5 - row * 13 - (row ? 2 : 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 9), [new THREE.MeshStandardMaterial({ color: c, roughness: .8 }), new THREE.MeshStandardMaterial({ color: c, roughness: .8 }), mat(0xd9d9d9), mat(c), new THREE.MeshStandardMaterial({ map: facade(c), roughness: .55 }), mat(c)]);
    m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
    m.userData = { h, x, z, shake: hash(i + row * 9) * 6 }; buildings.push(m);
    if (row === 0) { const aw = new THREE.Mesh(new THREE.BoxGeometry(w - .8, .35, 1.7), [mat(0xffffff), mat(0xffffff), new THREE.MeshStandardMaterial({ map: shopA }), mat(0xffffff), mat(0xffffff), mat(0xffffff)]); aw.position.set(0, -h / 2 + 3.2, 5.2); aw.rotation.x = .2; aw.castShadow = true; m.add(aw); }
  }
  // small props: benches, lamp posts, trees. Moving things: birds and clouds.
  const iron = mat(0x2c3244, { metalness: .4, roughness: .4 }), wood = mat(0xb5733f), leaf = mat(0x35b45a);
  for (let i = -14; i <= 14; i++) {
    if (i % 2) { const t = new THREE.Group(); t.position.set(i * 6 + 2, .16, 2.9); const tr = box(t, .28, 1.5, .28, wood, 0, .75, 0); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), leaf); c.position.y = 2.2; c.castShadow = true; t.add(c); scene.add(t); }
    else { box(scene, .12, 4, .12, iron, i * 6, 2.1, 3.1); box(scene, 1, .1, .1, iron, i * 6, 4.1, 2.75); const b = new THREE.Mesh(new THREE.BoxGeometry(.3, .12, .3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1) })); b.position.set(i * 6, 4.03, 2.4); scene.add(b); }
  }
  const clouds = []; for (let i = 0; i < 12; i++) { const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(5 + hash(k + i) * 6, 1), mat(0xffffff, { roughness: 1 })); c.position.set(k * 7 - 10, hash(k * i + 2) * 3, hash(k + i * 3) * 5); g.add(c); } g.position.set(-260 + i * 48, 72 + hash(i) * 26, -210 + hash(i * 3) * 80); scene.add(g); clouds.push(g); }
  const birds = []; for (let i = 0; i < 8; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(.12, .5, 3), mat(0x2c3244)); b.rotation.z = Math.PI / 2; scene.add(b); birds.push(b); }
  const tick = (t, panic = 0) => {
    clouds.forEach((c, i) => { c.position.x = -260 + i * 48 + t * 1.3; });
    birds.forEach((b, i) => { b.visible = true; b.position.set(-14 + i * 1.3 + t * 2.2 * (1 + panic * 3), 9 + Math.sin(t * 2 + i) * .5 + i * .3 + panic * t, -3 + wander(t, i)); });
  };
  return { scene, sun, buildings, tick };
}

// Bodies a pulse throws around: paving tiles, crates and cars. They look simple, and the baked physics makes them feel real.
export function buildCar(color) {
  const g = new THREE.Group(), C = mat(color, { roughness: .35, metalness: .2 }), K = mat(0x1b1f2b), G = mat(0xa8e1ff, { roughness: .1, metalness: .3 });
  box(g, 3.6, .7, 1.7, C, 0, 0, 0); box(g, 1.9, .6, 1.5, C, -.1, .62, 0); box(g, 1.75, .46, 1.56, G, -.1, .64, 0);
  for (const x of [-1.15, 1.15]) for (const z of [-.86, .86]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .24, 12), K); w.rotation.x = Math.PI / 2; w.position.set(x, -.34, z); w.castShadow = true; g.add(w); }
  return g;
}
