// Connects a film to render.mjs. The film gives world(t) and overlay(g, t); this file averages the shutter and draws the frame.
import { Pipeline } from './pipeline.js';

export async function film(setup) {
  const Q = new URLSearchParams(location.search), W = +(Q.get('w') || 1080), H = +(Q.get('h') || 1920), SS = +(Q.get('ss') || 2);
  const pipe = new Pipeline(W, H, SS);
  const out = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = out.getContext('2d');
  const api = await setup({ pipe, r: pipe.r, W, H });
  const gl = pipe.r.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info');
  window.gpuInfo = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
  window.frameAt = (t, { mb = 8, shutter = .5, fps = 30 } = {}) => {
    const first = api.world(t), n = first.moving ? mb * 3 : mb; // whips get more samples, so a smear is a smear and not a row of ghosts
    pipe.clear(pipe.rSum);
    for (let i = 0; i < n; i++) { const f = api.world(t + (i / n) * shutter / fps); pipe.slice(f.scene, f.cam, f.focus, f.blur ?? 1.2, 1 / n); }
    pipe.finish(first.look, Math.round(t * fps), first.flash || 0);
    g.drawImage(pipe.r.domElement, 0, 0, W, H);
    api.overlay?.(g, t, W, H);
    return { img: out.toDataURL('image/jpeg', .95), anchors: { shot: first.shot } };
  };
  window.ready = true;
}
