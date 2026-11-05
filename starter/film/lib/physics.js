// Physics is baked once at load, in fixed steps with no randomness at render time, so every render gives the same frames.
import * as CANNON from 'cannon-es';

export const RATE = 60;
// bodies: [{ size: [x,y,z], pos: [x,y,z], yaw, mass }], kicks: [{ t, at: [x,z], power, radius }], walls: fixed boxes
export function bake(bodies, kicks, end) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.defaultContactMaterial.friction = .5; world.defaultContactMaterial.restitution = .22;
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() }); ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
  const list = bodies.map((b) => {
    const r = new CANNON.Body({ mass: b.mass, shape: new CANNON.Box(new CANNON.Vec3(b.size[0] / 2, b.size[1] / 2, b.size[2] / 2)), linearDamping: .04, angularDamping: .06 });
    r.position.set(...b.pos); if (b.yaw) r.quaternion.setFromEuler(0, b.yaw, 0); world.addBody(r); return r;
  });
  const steps = Math.ceil(end * RATE) + 1, data = new Float32Array(steps * list.length * 7), done = new Set();
  for (let s = 0; s < steps; s++) {
    const t = s / RATE;
    kicks.forEach((k, i) => {
      if (done.has(i) || t < k.t) return; done.add(i);
      list.forEach((r, n) => {
        const dx = r.position.x - k.at[0], dz = r.position.z - k.at[1], d = Math.hypot(dx, dz); if (d > k.radius) return;
        const f = (1 - d / k.radius) * k.power * r.mass * (.7 + .6 * Math.random()), out = .35 * f / (d + 1);
        r.wakeUp(); r.applyImpulse(new CANNON.Vec3(dx * out, f, dz * out)); r.angularVelocity.set((Math.random() - .5) * 9, (Math.random() - .5) * 6, (Math.random() - .5) * 9);
      });
    });
    list.forEach((r, n) => { const o = (s * list.length + n) * 7; data.set([r.position.x, r.position.y, r.position.z, r.quaternion.x, r.quaternion.y, r.quaternion.z, r.quaternion.w], o); });
    world.step(1 / RATE);
  }
  return { count: list.length, steps, data };
}
// sets a mesh from the bake at time t
export function apply(mesh, bakeData, n, t) {
  const s = Math.max(0, Math.min(bakeData.steps - 1, Math.round(t * RATE))), o = (s * bakeData.count + n) * 7, d = bakeData.data;
  mesh.position.set(d[o], d[o + 1], d[o + 2]); mesh.quaternion.set(d[o + 3], d[o + 4], d[o + 5], d[o + 6]);
}
