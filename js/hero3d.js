/* Cover: a 3D line drawing of the Quanser SRV02 rotary inverted pendulum (three.js),
   driven by anime.js — energy swing-up, catch, balance, disturbance rejection, release, repeat. */
(function () {
  const host = document.getElementById('hero3d');
  if (!host || !window.THREE) return;
  const A = window.anime;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEG = Math.PI / 180;

  // ---------- Renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 400);

  const INK = 0x111111;
  const PAPER = 0xf7f7f5; // same as the cover band
  const fades = [];

  function part(geom, parent, pos, rot) {
    const g = new THREE.Group();
    const fm = new THREE.MeshBasicMaterial({ color: PAPER, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, transparent: true, opacity: 0 });
    const lm = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0 });
    g.add(new THREE.Mesh(geom, fm));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), lm));
    fades.push({ m: fm, to: 1 }, { m: lm, to: 1 });
    if (pos) g.position.set(pos[0], pos[1], pos[2]);
    if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(g);
    return g;
  }
  function polyline(points, parent, op, dashed) {
    const geo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const m = dashed
      ? new THREE.LineDashedMaterial({ color: INK, dashSize: 0.32, gapSize: 0.28, transparent: true, opacity: 0 })
      : new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0 });
    const l = new THREE.Line(geo, m);
    if (dashed) l.computeLineDistances();
    fades.push({ m, to: op });
    parent.add(l);
    return l;
  }
  function ring(r, y, parent, op, dashed) {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
    return polyline(pts, parent, op, dashed);
  }
  // smooth cylinder: cap circles from the edges + four axial lines so it reads as a drum
  function cyl(r, h, parent, pos, rot) {
    const g = part(new THREE.CylinderGeometry(r, r, h, 40), parent, pos, rot);
    [45, 135, 225, 315].forEach((a) => {
      const x = Math.cos(a * DEG) * r, z = Math.sin(a * DEG) * r;
      polyline([[x, -h / 2, z], [x, h / 2, z]], g, 1);
    });
    return g;
  }

  // ---------- Model (units ≈ cm) ----------
  const root = new THREE.Group();
  scene.add(root);
  part(new THREE.BoxGeometry(11, 0.35, 7.5), root, [0, 0.175, 0]);              // base plate
  part(new THREE.BoxGeometry(4.6, 5.0, 4.4), root, [0, 2.85, 0]);               // SRV02 gearbox
  cyl(1.15, 3.6, root, [-4.1, 1.7, 0], [0, 0, Math.PI / 2]);                    // DC motor
  cyl(0.55, 0.5, root, [-6.15, 1.7, 0], [0, 0, Math.PI / 2]);                   // motor encoder
  cyl(1.55, 0.5, root, [0, 5.6, 0]);                                           // output gear cap
  cyl(0.32, 0.9, root, [0, 6.3, 0]);                                           // output shaft
  ring(10.5, 0, root, 0.16);                                                    // table circle
  ring(8.3, 7.1, root, 0.22, true);                                             // arm sweep

  const arm = new THREE.Group();
  arm.position.set(0, 6.75, 0);
  root.add(arm);
  cyl(0.85, 0.7, arm, [0, 0.35, 0]);                                           // hub
  part(new THREE.BoxGeometry(7.4, 0.42, 0.42), arm, [3.7, 0.35, 0]);            // rotary arm
  cyl(0.6, 1.1, arm, [7.6, 0.35, 0], [0, 0, Math.PI / 2]);                      // pendulum encoder
  polyline([[8.3, 0.35, 0], [8.3, 7.6, 0]], arm, 0.3, true);                   // upright reference

  const pend = new THREE.Group();
  pend.position.set(8.3, 0.35, 0);
  arm.add(pend);
  part(new THREE.BoxGeometry(0.24, 6.2, 0.24), pend, [0, 3.1, 0]);              // pendulum rod
  part(new THREE.BoxGeometry(0.5, 0.5, 0.5), pend, [0, 0, 0]);                  // hinge block

  // ---------- Camera framing ----------
  const T = new THREE.Vector3(2.6, 4.8, 0);
  let W = 1, H = 1, dist = 48, portrait = false;
  function resize() {
    W = host.clientWidth || 1; H = host.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    portrait = W / H < 0.95;
    const aspect = W / H;
    dist = Math.max(64, 24 / (0.462 * aspect * 0.85));
    if (portrait) camera.setViewOffset(W, H, 0, H * 0.12, W, H);
    else camera.setViewOffset(W, H, W * 0.1, H * 0.02, W, H);
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // ---------- State ----------
  const S = { th: 0, al: 180, az: 34 };
  let mode = 'Standby', kicks = 0, mx = 0, my = 0, pmx = 0, pmy = 0;
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  const hMode = document.getElementById('hMode'), hTh = document.getElementById('hTh'), hAl = document.getElementById('hAl');
  const lTh = document.getElementById('lTh'), lAl = document.getElementById('lAl');
  const setMode = (m) => { mode = m; if (hMode) hMode.textContent = m; };
  const sgn = (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);

  // ---------- Motion (anime.js) ----------
  function swingUp() {
    setMode('Swing-up');
    const dev = [16, -24, 36, -52, 72, -98, 138];
    const arm = [-9, 13, -17, 21, -25, 28, -22];
    const tl = A.timeline({ targets: S, easing: 'easeInOutSine' });
    dev.forEach((d, i) => tl.add({ al: 180 + d, th: arm[i], duration: 560 }));
    tl.add({ al: 360, th: 0, duration: 900, easing: 'easeOutQuad' });
    tl.finished.then(() => { S.al = 0; setMode('Balance'); setTimeout(() => kick(1), 2400); });
  }
  function kick(sign) {
    setMode('Disturbance');
    A({ targets: S, al: [{ value: 10 * sign, duration: 180, easing: 'easeOutQuad' }, { value: 0, easing: 'spring(1, 80, 9, 0)' }] });
    A({
      targets: S,
      th: [{ value: S.th + 22 * sign, duration: 420, easing: 'easeOutQuad' }, { value: 0, easing: 'spring(1, 60, 10, 0)' }],
      complete() {
        setMode('Balance');
        kicks++;
        if (kicks % 3 === 0) setTimeout(release, 2200);
        else setTimeout(() => kick(-sign), 2600);
      },
    });
  }
  function release() {
    setMode('Released');
    A({ targets: S, th: 0, duration: 1200, easing: 'easeOutQuad' });
    A({
      targets: S,
      al: [
        { value: 180, duration: 1100, easing: 'easeInQuad' },
        { value: 228, duration: 520, easing: 'easeOutQuad' },
        { value: 180, easing: 'spring(1, 45, 4, 0)' },
      ],
      complete() { setTimeout(swingUp, 700); },
    });
  }

  // ---------- Render ----------
  const v = new THREE.Vector3();
  function place(el, obj, x, y, z) {
    if (!el) return;
    v.set(x, y, z);
    obj.localToWorld(v);
    v.project(camera);
    el.style.transform = `translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px)`;
  }

  let running = false, visible = true, t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    pmx += (mx - pmx) * 0.04; pmy += (my - pmy) * 0.04;
    const jitter = mode === 'Balance' ? 0.35 * Math.sin(t * 9.1) * Math.sin(t * 2.3) : 0;
    arm.rotation.y = S.th * DEG;
    pend.rotation.x = (S.al + jitter) * DEG;

    const az = (S.az + pmx * 8) * DEG, el = (21 - pmy * 4) * DEG;
    camera.position.set(T.x + dist * Math.cos(el) * Math.sin(az), T.y + dist * Math.sin(el), T.z + dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(T);
    renderer.render(scene, camera);

    place(lTh, arm, 4.6, 1.1, 0);
    place(lAl, pend, 0.2, 3.4, 0.9);
    const a = (((S.al + jitter) % 360) + 360) % 360, dev = a > 180 ? a - 360 : a;
    if (hTh) hTh.textContent = sgn(S.th, 1) + '°';
    if (hAl) hAl.textContent = sgn(dev, 1) + '°';

    if (visible) requestAnimationFrame(frame); else running = false;
  }
  const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  if (reduce || !A) {
    S.al = 0;
    fades.forEach((f) => (f.m.opacity = f.to));
    [lTh, lAl].forEach((e) => e && (e.style.opacity = 1));
    setMode('Balance');
    start();
    return;
  }

  // draw-in, then start the control sequence
  A({
    targets: fades.map((f) => f.m),
    opacity: (m, i) => fades[i].to,
    duration: 1100,
    delay: A.stagger(28),
    easing: 'easeOutQuad',
    complete() {
      fades.forEach((f) => { if (f.to === 1) { f.m.transparent = false; f.m.needsUpdate = true; } });
      [lTh, lAl].forEach((e) => e && (e.style.opacity = 1));
      swingUp();
    },
  });
  A({ targets: S, az: [26, 58], duration: 18000, direction: 'alternate', loop: true, easing: 'easeInOutSine' });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.01 }).observe(host);
  }
  start();
})();
