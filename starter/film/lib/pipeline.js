// The picture chain. Each slice of the shutter: world, then gentle depth blur. The slices average into real motion blur.
// Then bloom on what is really bright (above 1.0), then the grade: tone, colour, vignette and film grain.
import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const LENS = `varying vec2 vUv; uniform sampler2D col; uniform sampler2D dep; uniform vec2 px; uniform float focus; uniform float amount; uniform float near; uniform float far;
float lin(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
float coc(float z){ float fa = smoothstep(focus * 1.4, focus * 6., z); float ne = smoothstep(focus * .5, focus * .2, z) * 2.; return max(fa, ne) * amount; }
void main(){
  float r = coc(lin(texture2D(dep, vUv).r));
  vec3 sum = texture2D(col, vUv).rgb; float n = 1.;
  if (r > .4) for (int i = 1; i < 24; i++) {
    float a = float(i) * 2.39996, q = sqrt(float(i) / 24.);
    vec2 uv = vUv + vec2(cos(a), sin(a)) * q * r * px;
    float w = clamp(coc(lin(texture2D(dep, uv).r)) / r, .05, 1.);
    sum += texture2D(col, uv).rgb * w; n += w;
  }
  gl_FragColor = vec4(sum / n, 1.);
}`;
const COPY = 'varying vec2 vUv; uniform sampler2D t; uniform float k; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * k, 1.); }';
const BRIGHT = 'varying vec2 vUv; uniform sampler2D t; uniform float cut; void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(cut, cut + .7, l), 1.); }';
const BLUR = `varying vec2 vUv; uniform sampler2D t; uniform vec2 dir;
void main(){ vec3 c = texture2D(t, vUv).rgb * .2270; c += (texture2D(t, vUv + dir * 1.38).rgb + texture2D(t, vUv - dir * 1.38).rgb) * .3162; c += (texture2D(t, vUv + dir * 3.23).rgb + texture2D(t, vUv - dir * 3.23).rgb) * .0703; gl_FragColor = vec4(c, 1.); }`;
const GRADE = `varying vec2 vUv; uniform sampler2D t; uniform sampler2D b0; uniform sampler2D b1; uniform sampler2D b2; uniform vec2 px;
uniform float bloom; uniform float expo; uniform float sat; uniform float contrast; uniform float pop; uniform float flash; uniform float grain; uniform float seed; uniform float vig; uniform vec3 lift; uniform vec3 gain;
vec3 tone(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
float rnd(vec2 p){ return fract(sin(dot(p + seed, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 c = texture2D(t, vUv).rgb;
  vec3 near = (texture2D(t, vUv + vec2(px.x, 0.)).rgb + texture2D(t, vUv - vec2(px.x, 0.)).rgb + texture2D(t, vUv + vec2(0., px.y)).rgb + texture2D(t, vUv - vec2(0., px.y)).rgb) * .25;
  c = max(c + (c - near) * pop, vec3(0.));
  c += (texture2D(b0, vUv).rgb * .5 + texture2D(b1, vUv).rgb * .3 + texture2D(b2, vUv).rgb * .2) * bloom;
  c = tone(c * expo * gain);
  c = pow(c, vec3(1. / 2.2));
  float l = dot(c, vec3(.299, .587, .114));
  c = mix(vec3(l), c, sat);
  c = (c - .5) * contrast + .5;
  c += lift * (1. - l);
  vec2 v = vUv - .5; c *= 1. - dot(v, v) * vig;
  c += (rnd(vUv * 1000.) - .5) * grain;
  c = mix(c, vec3(1.), flash);
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`;

export class Pipeline {
  constructor(W, H, ss) {
    this.W = W; this.H = H; this.ss = ss; const w = W * ss, h = H * ss;
    const r = this.r = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(W, H); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NoToneMapping; r.autoClear = false;
    document.body.appendChild(r.domElement);
    const hdr = (a, b, depth) => {
      const t = new THREE.WebGLRenderTarget(a, b, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth, samples: depth ? 4 : 0 });
      if (depth) { t.depthTexture = new THREE.DepthTexture(a, b); t.depthTexture.type = THREE.UnsignedIntType; }
      return t;
    };
    this.rWorld = hdr(w, h, true); this.rLens = hdr(w, h); this.rSum = hdr(w, h);
    this.levels = [2, 4, 8].map((d) => [hdr(W / d, H / d), hdr(W / d, H / d)]);
    this.cam2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad);
    const M = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra });
    this.mLens = M(LENS, { col: { value: null }, dep: { value: null }, px: { value: new THREE.Vector2(1 / w, 1 / h) }, focus: { value: 5 }, amount: { value: 2 }, near: { value: 0 }, far: { value: 0 } });
    this.mAdd = M(COPY, { t: { value: null }, k: { value: 1 } }, { transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation });
    this.mBright = M(BRIGHT, { t: { value: null }, cut: { value: 1 } });
    this.mBlur = M(BLUR, { t: { value: null }, dir: { value: new THREE.Vector2() } });
    this.mGrade = M(GRADE, { t: { value: null }, b0: { value: null }, b1: { value: null }, b2: { value: null }, px: { value: new THREE.Vector2(1 / W, 1 / H) }, bloom: { value: .3 }, expo: { value: 1 }, sat: { value: 1 }, contrast: { value: 1 }, pop: { value: .5 }, flash: { value: 0 }, grain: { value: 0 }, seed: { value: 0 }, vig: { value: .32 }, lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) } });
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.cam2); }
  clear(target) { this.r.setRenderTarget(target); this.r.setClearColor(0, 1); this.r.clear(); }
  // one slice of the shutter, added to the running total with weight k
  slice(scene, cam, focus, blur, k) {
    this.clear(this.rWorld); this.r.setRenderTarget(this.rWorld); this.r.render(scene, cam);
    const L = this.mLens.uniforms; L.near.value = cam.near; L.far.value = cam.far; L.col.value = this.rWorld.texture; L.dep.value = this.rWorld.depthTexture; L.focus.value = focus; L.amount.value = blur * this.ss;
    this.pass(this.mLens, this.rLens);
    this.mAdd.uniforms.t.value = this.rLens.texture; this.mAdd.uniforms.k.value = k; this.pass(this.mAdd, this.rSum);
  }
  finish(look = {}, seed = 0, flash = 0) {
    let src = this.rSum.texture; const out = [];
    this.mBright.uniforms.cut.value = look.bloomCut ?? 1;
    this.levels.forEach(([a, b], i) => {
      if (i === 0) { this.mBright.uniforms.t.value = src; this.pass(this.mBright, a); } else { this.mBlur.uniforms.t.value = src; this.mBlur.uniforms.dir.value.set(0, 0); this.pass(this.mBlur, a); }
      this.mBlur.uniforms.t.value = a.texture; this.mBlur.uniforms.dir.value.set(1 / a.width, 0); this.pass(this.mBlur, b);
      this.mBlur.uniforms.t.value = b.texture; this.mBlur.uniforms.dir.value.set(0, 1 / a.height); this.pass(this.mBlur, a);
      out.push(a.texture); src = a.texture;
    });
    const u = this.mGrade.uniforms; u.t.value = this.rSum.texture; u.b0.value = out[0]; u.b1.value = out[1]; u.b2.value = out[2];
    u.bloom.value = look.bloom ?? .35; u.expo.value = look.expo ?? 1; u.sat.value = look.sat ?? 1.06; u.contrast.value = look.contrast ?? 1.08; u.pop.value = look.pop ?? .6; u.flash.value = flash; u.grain.value = look.grain ?? 0; u.seed.value = seed % 97; u.vig.value = look.vig ?? .32;
    u.lift.value.set(...(look.lift || [0, 0, 0])); u.gain.value.set(...(look.gain || [1, 1, 1]));
    this.r.setViewport(0, 0, this.W, this.H); this.pass(this.mGrade, null);
  }
}
