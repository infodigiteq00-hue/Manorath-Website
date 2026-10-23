/* The forge: each product line as a 3D metal object. Click a line to switch,
   drag to turn. Built with src/build.py into js/forge.min.js.
   Renders only while the section is on screen; without WebGL the photos show instead. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/RoomEnvironment.js';

const sec = document.querySelector('[data-forge]');
const canvas = sec && sec.querySelector('[data-forge-gl]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

if (sec && canvas && hasGL()) init();
else if (sec) sec.classList.add('no-gl');

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.2, 10.5);

  const key = new THREE.DirectionalLight(0xfff1dc, 1.4); key.position.set(4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff7a2a, 2.4); rim.position.set(-6, -1.5, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.5); fill.position.set(-5, 3, 5); scene.add(fill);

  const M = (color, roughness, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 1, roughness, side: THREE.DoubleSide }, extra || {}));
  const mat = {
    ss: M(0xe1e5ea, 0.14),
    ms: M(0x50555c, 0.46, { metalness: 0.85 }),
    msDark: M(0x3b3f45, 0.52, { metalness: 0.8 }),
    copper: M(0xd27a48, 0.2),
    brass: M(0xd6ae55, 0.26),
    alu: M(0xc9cdd2, 0.3),
    galv: M(0xb8bdc3, 0.34),
    bolt: M(0x6d7278, 0.4)
  };

  /* ── parts ── */
  // a hollow pipe along Y: outer and inner walls plus the two end rings
  function pipe(rOut, rIn, len, m) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(rOut, rOut, len, 64, 1, true), m));
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(rIn, rIn, len, 64, 1, true), m);
    g.add(inner);
    for (const s of [1, -1]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 64), m);
      ring.rotation.x = -s * Math.PI / 2; ring.position.y = s * len / 2;
      g.add(ring);
    }
    return g;
  }
  // a flange disk (axis Z, face at z = thick) with bolt holes; hub reaches back along -Z
  function flange(r, bore, thick, holes, m, hub) {
    const shape = new THREE.Shape(); shape.absarc(0, 0, r, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, bore, 0, Math.PI * 2, true); shape.holes.push(hole);
    const pcd = (r + bore) / 2 + r * 0.06;
    for (let i = 0; i < holes; i++) {
      const a = i / holes * Math.PI * 2 + Math.PI / holes, h = new THREE.Path();
      h.absarc(Math.cos(a) * pcd, Math.sin(a) * pcd, r * 0.075, 0, Math.PI * 2, true);
      shape.holes.push(h);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 48 });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, m));
    if (hub) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(bore * 1.18, bore * 1.55, hub, 64, 1, true), m);
      h.rotation.x = Math.PI / 2; h.position.z = -hub / 2;
      g.add(h);
    }
    g.userData.pcd = pcd;
    return g;
  }
  function iBeam(w, d, tf, tw, len, m) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, -d / 2 + tf); s.lineTo(tw / 2, -d / 2 + tf);
    s.lineTo(tw / 2, d / 2 - tf); s.lineTo(w / 2, d / 2 - tf); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2);
    s.lineTo(-w / 2, d / 2 - tf); s.lineTo(-tw / 2, d / 2 - tf); s.lineTo(-tw / 2, -d / 2 + tf); s.lineTo(-w / 2, -d / 2 + tf); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    geo.translate(0, 0, -len / 2);
    return new THREE.Mesh(geo, m);
  }
  function angle(a, t, len, m) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(a, 0); s.lineTo(a, t); s.lineTo(t, t); s.lineTo(t, a); s.lineTo(0, a); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
    geo.translate(-a / 2, -a / 2, -len / 2);
    return new THREE.Mesh(geo, m);
  }
  function hexBolt(len, m) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 6), m); head.rotation.x = Math.PI / 2; head.position.z = len / 2;
    const nut = head.clone(); nut.position.z = -len / 2;
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len + 0.16, 16), m); stud.rotation.x = Math.PI / 2;
    g.add(head, nut, stud);
    return g;
  }

  /* ── the four models ── */
  // 01 stainless: a pipe spool, flanged at both ends with an elbow turning up
  function makeSS() {
    const g = new THREE.Group(), R = 0.78, ro = 0.42, ri = 0.37;
    const run = pipe(ro, ri, 2.6, mat.ss); run.rotation.z = Math.PI / 2; g.add(run);
    const elbow = new THREE.Group();
    elbow.add(new THREE.Mesh(new THREE.TorusGeometry(R, ro, 40, 64, Math.PI / 2), mat.ss));
    elbow.add(new THREE.Mesh(new THREE.TorusGeometry(R, ri, 40, 64, Math.PI / 2), mat.ss));
    elbow.rotation.z = -Math.PI / 2; elbow.position.set(1.3, R, 0); g.add(elbow);
    const rise = pipe(ro, ri, 1.0, mat.ss); rise.position.set(1.3 + R, R + 0.5, 0); g.add(rise);
    const f1 = flange(0.95, ri, 0.16, 8, mat.ss, 0.34); f1.rotation.y = -Math.PI / 2; f1.position.x = -1.3; g.add(f1);
    const f2 = flange(0.95, ri, 0.16, 8, mat.ss, 0.34); f2.rotation.x = -Math.PI / 2; f2.position.set(1.3 + R, R + 1.0, 0); g.add(f2);
    // a weld bead where the run meets the elbow
    const bead = new THREE.Mesh(new THREE.TorusGeometry(ro + 0.005, 0.03, 10, 64), mat.galv); bead.rotation.y = Math.PI / 2; bead.position.x = 1.3; g.add(bead);
    return center(g);
  }
  // 02 mild steel: two I-beams crossed, with an angle on top
  function makeMS() {
    const g = new THREE.Group();
    const b1 = iBeam(1.0, 1.25, 0.13, 0.09, 4.0, mat.ms); b1.rotation.y = Math.PI / 2; g.add(b1);
    const b2 = iBeam(0.8, 1.0, 0.11, 0.08, 3.0, mat.msDark); b2.position.y = 1.13; g.add(b2);
    const a1 = angle(0.55, 0.07, 2.8, mat.ms); a1.rotation.set(0, Math.PI / 2, Math.PI / 4); a1.position.set(0, 1.95, 0.15); g.add(a1);
    // bolts through the crossing
    for (const x of [-0.25, 0.25]) for (const z of [-0.28, 0.28]) { const b = hexBolt(0.32, mat.bolt); b.rotation.x = Math.PI / 2; b.position.set(x, 0.62, z); g.add(b); }
    g.rotation.x = 0.1;
    return center(g);
  }
  // 03 non-ferrous: a copper coil with a brass hex bar and an aluminium bar
  function makeNF() {
    const g = new THREE.Group(), pts = [], turns = 5, r = 0.72, pitch = 0.27;
    pts.push(new THREE.Vector3(r + 0.9, -turns * pitch / 2 - 0.3, 0));
    for (let i = 0; i <= turns * 32; i++) {
      const a = i / 32 * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, -turns * pitch / 2 + i / 32 * pitch, Math.sin(a) * r));
    }
    pts.push(new THREE.Vector3(r + 0.9, turns * pitch / 2 + 0.3, 0));
    const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 900, 0.085, 16, false), mat.copper);
    coil.rotation.z = Math.PI / 2; g.add(coil);
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.4, 6), mat.brass); hex.rotation.set(0.35, 0, Math.PI / 2 - 0.22); hex.position.set(0, -0.15, -1.15); g.add(hex);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.6, 48), mat.alu); bar.rotation.set(-0.3, 0, Math.PI / 2 + 0.3); bar.position.set(0, 0.25, -1.6); g.add(bar);
    return center(g);
  }
  // 04 piping items: a bolted flange pair on a pipe stub, with a clamp
  function makePI() {
    const g = new THREE.Group(), ro = 0.44, ri = 0.38;
    const stub = pipe(ro, ri, 3.0, mat.galv); stub.rotation.x = Math.PI / 2; g.add(stub);
    const fa = flange(1.15, ri, 0.18, 8, mat.galv, 0.36); fa.position.z = 0.02; g.add(fa);
    const fb = flange(1.15, ri, 0.18, 8, mat.galv, 0.36); fb.rotation.y = Math.PI; fb.position.z = -0.02; g.add(fb);
    const pcd = fa.userData.pcd;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8, b = hexBolt(0.5, mat.bolt);
      b.position.set(Math.cos(a) * pcd, Math.sin(a) * pcd, 0); g.add(b);
    }
    // a two-piece clamp further down the stub
    const band = new THREE.Mesh(new THREE.TorusGeometry(ro + 0.05, 0.06, 12, 64), mat.bolt); band.position.z = 1.05; g.add(band);
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.16), mat.bolt); ear.position.set(s * (ro + 0.2), 0, 1.05); g.add(ear);
    }
    g.rotation.y = -0.6;
    return center(g);
  }
  function center(g) {
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group(); g.position.sub(c); holder.add(g);
    holder.userData.size = box.getSize(new THREE.Vector3()).length();
    return holder;
  }

  const models = [makeSS(), makeMS(), makeNF(), makePI()];
  models.forEach((m, i) => { m.visible = i === 0; m.userData.fit = 4.6 / m.userData.size; scene.add(m); });

  // embers drifting up behind the models
  const N = 220, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 9; pos[i * 3 + 1] = (Math.random() - 0.5) * 6; pos[i * 3 + 2] = -1 - Math.random() * 4; spd[i] = 0.15 + Math.random() * 0.5; }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  const dc = dot.getContext('2d'), grad = dc.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,220,170,1)'); grad.addColorStop(0.3, 'rgba(255,140,60,.8)'); grad.addColorStop(1, 'rgba(255,90,20,0)');
  dc.fillStyle = grad; dc.fillRect(0, 0, 32, 32);
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 0.07, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(embers);

  /* ── switching lines: the old model spins away, the new one drops in ── */
  let cur = 0, prev = -1, tSwitch = -10;
  const tabs = Array.from(sec.querySelectorAll('[data-line]'));
  const panels = Array.from(sec.querySelectorAll('[data-fp]'));
  const ghost = sec.querySelector('[data-ghost]'), hudNo = sec.querySelector('[data-forge-no]'), hudName = sec.querySelector('[data-forge-name]');
  const GHOST = ['Stainless', 'Mild steel', 'Non-ferrous', 'Piping'];
  function show(i) {
    if (i === cur) return;
    prev = cur; cur = i; tSwitch = clock.getElapsedTime();
    models[cur].visible = true;
    sec.dataset.line = String(i);
    tabs.forEach((t, j) => t.setAttribute('aria-selected', String(j === i)));
    panels.forEach((p, j) => { p.hidden = j !== i; p.classList.toggle('is-on', j === i); });
    ghost.textContent = GHOST[i]; ghost.classList.remove('is-in'); void ghost.offsetWidth; ghost.classList.add('is-in');
    hudNo.textContent = '0' + (i + 1); hudName.textContent = panels[i].querySelector('h2').textContent;
    wake();
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
  // the keyboard arrows move between lines while a tab has focus
  sec.querySelector('[role="tablist"]').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const n = (cur + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 3)) % 4;
    show(n); tabs[n].focus();
  });
  // lines advance on their own every few seconds until someone picks one
  let auto = !reduced, autoTimer = 0, hover = false;
  // ...but never while the pointer is over the section, so nothing changes mid-read
  sec.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  sec.addEventListener('pointerleave', () => { hover = false; autoTimer = clock.getElapsedTime(); });

  /* ── drag to turn, with a little momentum ── */
  let yaw = 0, pitch = 0, vYaw = 0, dragging = false, lx = 0, ly = 0, px = 0, py = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); auto = false; sec.classList.add('is-drag'); wake(); });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5;
    if (!dragging) return;
    vYaw = (e.clientX - lx) * 0.012; yaw += vYaw; pitch = Math.max(-0.6, Math.min(0.6, pitch + (e.clientY - ly) * 0.006));
    lx = e.clientX; ly = e.clientY;
  });
  const end = () => { dragging = false; sec.classList.remove('is-drag'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  tabs.forEach(t => t.addEventListener('click', () => { auto = false; }));

  /* ── size and loop ── */
  const clock = new THREE.Clock();
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  const ease = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t * t;
  let visible = false, raf = 0, lastT = 0;
  function frame() {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime(), dt = Math.min(0.05, t - lastT); lastT = t;
    if (auto && !hover && t - Math.max(tSwitch, autoTimer) > 5.5) { autoTimer = t; show((cur + 1) % 4); }
    if (!dragging) { vYaw *= 0.94; yaw += vYaw + (reduced ? 0 : 0.0035); }
    const k = Math.min(1, (t - tSwitch) / 0.9);
    models.forEach((m, i) => {
      if (!m.visible) return;
      const fit = m.userData.fit;
      if (i === cur) {
        const e = ease(k);
        m.scale.setScalar(fit * (0.55 + 0.45 * e));
        m.position.set(0, (1 - e) * 3.2, 0);
        m.rotation.set(0.25 + pitch + py * 0.15 + (1 - e) * 1.2, yaw + px * 0.4 + (1 - e) * -2.2, 0);
      } else if (i === prev) {
        const e = easeIn(Math.min(1, k * 1.4));
        m.scale.setScalar(fit * (1 - 0.6 * e));
        m.position.set(e * -1.5, e * -4, e * 2);
        m.rotation.set(0.25 + pitch + e * 1.5, yaw + e * 2.5, 0);
        if (e >= 1) { m.visible = false; prev = -1; }
      } else m.visible = false;
    });
    const a = eg.attributes.position.array;
    for (let i = 0; i < N; i++) { a[i * 3 + 1] += spd[i] * dt; if (a[i * 3 + 1] > 3.2) a[i * 3 + 1] = -3.2; a[i * 3] += Math.sin(t + i) * 0.002; }
    eg.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf && visible) { lastT = clock.getElapsedTime(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { resize(); wake(); } }, { rootMargin: '100px' }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  // catalogue links in each panel also pick that line in the catalogue
  sec.classList.add('has-gl');
}
