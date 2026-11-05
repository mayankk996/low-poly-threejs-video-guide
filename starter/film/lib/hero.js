// The hero: one detailed blocky character built from flat-shaded parts. fat (0 to 1) puffs his cheeks, belly and limbs.
// Every part has a pivot, so a pose is only a few rotations. Change the colours and hair to make him yours.
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .62, metalness: 0, flatShading: true, ...o });
const add = (parent, geo, material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ball = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);

export function buildHero({ jacket = 0xe0262f, trim = 0xffffff, jeans = 0x2a5bd7, skin = 0xc98a5e, cap = 0xd8202a, shoe = 0xffffff } = {}) {
  const J = mat(jacket), T = mat(trim), N = mat(jeans), S = mat(skin), C = mat(cap), W = mat(shoe), K = mat(0x1a1420), H = mat(0x24140f);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = .92;
  // torso and the belly that grows out of it
  const torso = add(body, box(.54, .62, .32), J, 0, .31, 0), front = add(body, box(.2, .58, .02), T, 0, .31, .165);
  const belly = add(body, ball(.36, 2), J, 0, .16, .08), panel = add(body, ball(.3, 2), T, 0, .14, .14);
  const collar = add(body, box(.34, .08, .24), T, 0, .63, 0);
  // head: block nose, block ears, slab brows, square eyes with catch-lights, chunky hair under a cap
  const head = new THREE.Group(); head.position.set(0, .67, 0); body.add(head);
  const skull = add(head, box(.42, .4, .38), S, 0, .22, 0);
  const cheekL = add(head, ball(.14), S, -.17, .13, .1), cheekR = add(head, ball(.14), S, .17, .13, .1);
  add(head, box(.07, .1, .08), S, 0, .2, .21); add(head, box(.05, .11, .09), S, -.235, .22, 0); add(head, box(.05, .11, .09), S, .235, .22, 0);
  const eyeL = add(head, box(.07, .09, .02), K, -.1, .27, .195), eyeR = add(head, box(.07, .09, .02), K, .1, .27, .195);
  add(eyeL, box(.022, .022, .01), new THREE.MeshBasicMaterial({ color: 0xffffff }), .015, .022, .012); add(eyeR, box(.022, .022, .01), new THREE.MeshBasicMaterial({ color: 0xffffff }), .015, .022, .012);
  const browL = add(head, box(.11, .028, .03), K, -.1, .345, .2), browR = add(head, box(.11, .028, .03), K, .1, .345, .2);
  const mouth = add(head, box(.13, .03, .02), mat(0x5a1c20), 0, .09, .195);
  add(head, box(.44, .1, .4), H, 0, .36, -.02); add(head, box(.08, .16, .34), H, -.2, .3, -.03); add(head, box(.08, .16, .34), H, .2, .3, -.03);
  add(head, box(.46, .1, .42), C, 0, .45, -.01); add(head, box(.36, .03, .18), C, 0, .405, .27); add(head, ball(.04, 0), T, 0, .51, 0);
  // limbs hang from pivots
  const limb = (x, y, w, h, material, end, endMat) => { const p = new THREE.Group(); p.position.set(x, y, 0); const seg = add(p, box(w, h, w), material, 0, -h / 2, 0); const tip = add(p, end, endMat, 0, -h - .03, end.parameters?.depth ? .04 : 0); return { p, seg, tip }; };
  const armL = limb(-.35, .56, .15, .52, J, box(.13, .13, .13), S), armR = limb(.35, .56, .15, .52, J, box(.13, .13, .13), S);
  const legL = limb(-.14, 0, .2, .8, N, box(.22, .12, .34), W), legR = limb(.14, 0, .2, .8, N, box(.22, .12, .34), W);
  body.add(armL.p, armR.p, legL.p, legR.p);
  const faces = { calm: [0, .09, .13, .03], worry: [.28, .1, .1, .05], shock: [.05, .08, .1, .1], strain: [-.25, .09, .15, .05] };

  function pose({ t = 0, fat = 0, walk = 0, sit = 0, face = 'calm', look = 0, armsUp = 0 } = {}) {
    const f = Math.min(1.6, fat), wide = 1 + f * .55;
    torso.scale.set(wide, 1, 1 + f * .4); front.visible = f < .15; belly.scale.setScalar(f * (1 + f * .4)); belly.visible = f > .08; panel.scale.setScalar(f * (1 + f * .45)); panel.visible = f > .3;
    belly.position.z = .06 + f * .16; panel.position.z = .16 + f * .22; collar.scale.x = wide;
    for (const c of [cheekL, cheekR]) { c.scale.setScalar(.3 + f * 1.15); }
    cheekL.position.x = -.17 - f * .08; cheekR.position.x = .17 + f * .08;
    const armW = 1 + f * 1.1, legW = 1 + f * .9;
    for (const a of [armL, armR]) { a.seg.scale.set(armW, 1, armW); a.tip.scale.setScalar(1 + f * .8); }
    for (const l of [legL, legR]) { l.seg.scale.set(legW, 1, legW); }
    armL.p.position.x = -.35 - f * .22; armR.p.position.x = .35 + f * .22; legL.p.position.x = -.14 - f * .08; legR.p.position.x = .14 + f * .08;
    const swing = Math.sin(t * 7.5) * .55 * walk;
    legL.p.rotation.x = swing - sit * 1.5; legR.p.rotation.x = -swing - sit * 1.5;
    armL.p.rotation.x = -swing * .8 - armsUp * 2.2; armR.p.rotation.x = swing * .8 - armsUp * 2.2;
    armL.p.rotation.z = -.14 - f * .35 - armsUp * .3; armR.p.rotation.z = .14 + f * .35 + armsUp * .3;
    body.position.y = .92 + Math.abs(Math.cos(t * 7.5)) * .035 * walk - sit * .62;
    body.rotation.z = Math.sin(t * 7.5) * .025 * walk; body.rotation.x = -sit * .08;
    head.rotation.y = look; head.position.y = .67 - f * .03;
    const [brow, my, mw, mh] = faces[face] || faces.calm;
    browL.rotation.z = brow; browR.rotation.z = -brow; mouth.scale.set(mw / .13, mh / .03, 1); mouth.position.y = my;
    const blink = (t * .7 + .3) % 1 < .05 ? .08 : 1; eyeL.scale.y = eyeR.scale.y = blink * (face === 'shock' ? 1.35 : 1);
  }
  pose();
  return { root, pose };
}

// Simple townsfolk: blocks in solid colours, a face made of two eyes.
export function buildPerson(shirt, trousers = 0x37425c, skin = 0xe8b48c) {
  const g = new THREE.Group(), S = mat(skin), K = mat(0x1a1420);
  add(g, box(.32, .42, .2), mat(shirt), 0, 1.02, 0); const head = add(g, box(.26, .26, .24), S, 0, 1.38, 0);
  add(head, box(.04, .05, .01), K, -.06, .02, .125); add(head, box(.04, .05, .01), K, .06, .02, .125);
  const a = add(g, box(.1, .4, .1), mat(shirt), -.22, 1.04, 0), b = add(g, box(.1, .4, .1), mat(shirt), .22, 1.04, 0);
  const l = add(g, box(.13, .8, .13), mat(trousers), -.09, .4, 0), r = add(g, box(.13, .8, .13), mat(trousers), .09, .4, 0);
  g.userData = { a, b, l, r };
  return g;
}
