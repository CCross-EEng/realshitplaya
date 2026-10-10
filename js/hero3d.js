/* Cover: a to-scale line drawing of the Quanser SRV02-ET servo with the ROTPEN-E pendulum (three.js),
   driven live by js/rotpen.js. Drag to orbit, click near the pendulum (or use the buttons / arrow keys)
   to push it; the energy swing-up and the Lab 5 balance gain do the rest. Units are cm. */
(function () {
  const host = document.getElementById('hero3d');
  if (!host || !window.THREE || !window.RotPen) return;
  const cover = document.getElementById('cover');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEG = Math.PI / 180;
  const sim = RotPen.create();
  const LR = RotPen.P.Lr * 100, LP = RotPen.P.Lp * 100;   // 21.6 cm arm, 33.7 cm pendulum

  // ---------- Renderer / scene ----------
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 800);

  // ink and paper follow the cover band's theme tokens (paper must match the band so fills hide back edges)
  let INK = 0x0a0a0a, PAPER = 0xf7f7f5, inkRGB = '10,10,10';
  function readTheme() {
    const cs = getComputedStyle(cover);
    const ink = new THREE.Color(cs.getPropertyValue('--ink').trim() || '#0a0a0a');
    const paper = new THREE.Color(cs.getPropertyValue('--bg').trim() || '#f7f7f5');
    INK = ink.getHex(); PAPER = paper.getHex();
    inkRGB = [ink.r, ink.g, ink.b].map((c) => Math.round(c * 255)).join(',');
  }
  readTheme();
  const lineMats = [], fillMats = [];

  function lineMat(op, dashed) {
    const m = dashed
      ? new THREE.LineDashedMaterial({ color: INK, dashSize: 0.7, gapSize: 0.55, transparent: true, opacity: 0 })
      : new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0 });
    m.userData.to = op;
    lineMats.push(m);
    return m;
  }
  function part(geom, parent, pos, rot, op, thresh) {
    const g = new THREE.Group();
    const fm = new THREE.MeshBasicMaterial({ color: PAPER, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, transparent: true, opacity: 0 });
    fillMats.push(fm);
    g.add(new THREE.Mesh(geom, fm));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, thresh || 20), lineMat(op || 0.92)));
    if (pos) g.position.set(pos[0], pos[1], pos[2]);
    if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(g);
    return g;
  }
  function line(points, parent, op, dashed) {
    const geo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const l = new THREE.Line(geo, lineMat(op, dashed));
    if (dashed) l.computeLineDistances();
    parent.add(l);
    return l;
  }
  function segs(pairs, parent, op) {
    const pts = [];
    pairs.forEach((p) => pts.push(new THREE.Vector3(p[0], p[1], p[2]), new THREE.Vector3(p[3], p[4], p[5])));
    const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(op));
    parent.add(l);
    return l;
  }
  function arcPts(r, a0, a1, n, f) {
    const out = [];
    for (let i = 0; i <= n; i++) out.push(f(r, a0 + (a1 - a0) * (i / n)));
    return out;
  }
  // a cylinder that reads as a drum: cap circles from the edges plus a few axial lines
  function cyl(r, h, parent, pos, rot, axial, op) {
    const g = part(new THREE.CylinderGeometry(r, r, h, 48), parent, pos, rot, op);
    const n = axial === undefined ? 4 : axial;
    const pairs = [];
    for (let i = 0; i < n; i++) {
      const a = (45 + (360 / n) * i) * DEG, x = Math.cos(a) * r, z = Math.sin(a) * r;
      pairs.push([x, -h / 2, z, x, h / 2, z]);
    }
    if (n) segs(pairs, g, (op || 0.92) * 0.55);
    return g;
  }
  // flat spur gear: toothed outline extruded along y
  function gear(r, teeth, h, parent, pos) {
    const s = new THREE.Shape(), d = Math.min(0.32, r * 0.12);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2, w = (Math.PI * 2) / teeth;
      const p = [[r - d, a], [r, a + w * 0.18], [r, a + w * 0.5], [r - d, a + w * 0.68]];
      p.forEach(([rr, aa], k) => (i === 0 && k === 0 ? s.moveTo : s.lineTo).call(s, Math.cos(aa) * rr, Math.sin(aa) * rr));
    }
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, r * 0.28, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 24 });
    geo.rotateX(-Math.PI / 2);
    return part(geo, parent, pos, null, 0.8, 30);
  }

  // ---------- SRV02-ET rotary servo (load shaft on the y axis) ----------
  const rig = new THREE.Group();
  scene.add(rig);
  const X0 = -9.4, X1 = 3.8, ZH = 4.7, XM = -4.8, PX = 2.4, PZ = 3.4;
  const cx = (X0 + X1) / 2, wx = X1 - X0;
  part(new THREE.BoxGeometry(wx, 0.6, ZH * 2), rig, [cx, 0.3, 0]);                       // bottom plate
  part(new THREE.BoxGeometry(wx, 0.6, ZH * 2), rig, [cx, 10.7, 0]);                      // top plate
  [[X0 + 0.9, ZH - 0.9], [X0 + 0.9, -ZH + 0.9], [X1 - 0.9, ZH - 0.9], [X1 - 0.9, -ZH + 0.9]]
    .forEach(([x, z]) => cyl(0.32, 9.8, rig, [x, 5.5, z], null, 0));                     // stand-offs
  part(new THREE.BoxGeometry(0.4, 9.8, ZH * 2 - 2.4), rig, [X0 + 0.2, 5.5, 0]);         // connector panel
  [7.6, 5.4, 3.2].forEach((y) => cyl(0.62, 0.5, rig, [X0 - 0.25, y, -1.2], [0, 0, Math.PI / 2], 0));
  cyl(1.85, 7.4, rig, [XM, 6.5, 0]);                                                     // DC motor (hangs under the plate)
  cyl(1.5, 0.7, rig, [XM, 2.45, 0], null, 0);                                            // motor end cap
  cyl(1.7, 1.5, rig, [0, 4.6, 0]);                                                       // optical encoder on the load shaft
  cyl(0.3, 9.4, rig, [0, 8.1, 0], null, 0);                                              // load shaft
  cyl(0.95, 2.2, rig, [PX, 9.3, PZ], null, 2);                                           // potentiometer
  gear(3.0, 60, 0.5, rig, [0, 11.0, 0]);                                                 // 120T load gear (drawn at half count)
  gear(1.8, 36, 0.5, rig, [XM, 11.0, 0]);                                                // 72T motor pinion
  gear(1.15, 24, 0.5, rig, [PX, 11.0, PZ]);                                              // anti-backlash gear to the pot
  cyl(1.0, 1.3, rig, [0, 12.15, 0], null, 6);                                            // load hub
  line(arcPts(15, 0, Math.PI * 2, 120, (r, a) => [Math.cos(a) * r, 0, Math.sin(a) * r]), rig, 0.14);   // table

  // ---------- ROTPEN-E: rotary arm + pendulum ----------
  const ARM_Y = 13.1;
  const arm = new THREE.Group();
  arm.position.set(0, ARM_Y, 0);
  rig.add(arm);
  part(new THREE.BoxGeometry(2.6, 1.0, 2.4), arm, [0, 0, 0]);                           // clamp block
  [-0.6, 0.6].forEach((z) => cyl(0.32, 0.5, arm, [0.6, 0.75, z], null, 0));             // thumbscrews
  part(new THREE.BoxGeometry(LR - 1.6 + 3, 0.6, 1.3), arm, [(LR - 1.6 - 3) / 2, 0, 0]); // arm bar
  cyl(1.15, 2.4, arm, [LR - 1.6, 0, 0], [0, 0, Math.PI / 2]);                           // pendulum encoder (shaft along the arm)
  cyl(0.4, 0.6, arm, [LR - 0.1, 0, 0], [0, 0, Math.PI / 2], 0);                         // encoder shaft
  line([[LR + 0.3, 0, 0], [LR + 0.3, LP + 4, 0]], arm, 0.32, true);                              // upright reference

  const pend = new THREE.Group();
  pend.position.set(LR + 0.3, 0, 0);
  arm.add(pend);
  cyl(0.62, 1.0, pend, [0, 0, 0], [0, 0, Math.PI / 2], 0);                             // pendulum hub
  cyl(0.32, LP, pend, [0, LP / 2, 0], null, 2);                                         // aluminium rod

  // ---------- Dimensions, references and the live angle arcs ----------
  const DZ = 3.4;   // Lr dimension sits beside the arm
  segs([[0, 0, 1.4, 0, 0, DZ + 0.8], [LR, 0, 1.4, LR, 0, DZ + 0.8], [0, 0, DZ, LR, 0, DZ],
        [0, 0, DZ - 0.5, 0.9, 0, DZ], [0, 0, DZ + 0.5, 0.9, 0, DZ], [LR, 0, DZ - 0.5, LR - 0.9, 0, DZ], [LR, 0, DZ + 0.5, LR - 0.9, 0, DZ]], arm, 0.45);
  const DX = 2.8;   // Lp dimension runs alongside the rod
  segs([[0.8, 0, 0, DX + 0.8, 0, 0], [0.6, LP, 0, DX + 0.8, LP, 0], [DX, 0, 0, DX, LP, 0],
        [DX - 0.5, 0.9, 0, DX, 0, 0], [DX + 0.5, 0.9, 0, DX, 0, 0], [DX - 0.5, LP - 0.9, 0, DX, LP, 0], [DX + 0.5, LP - 0.9, 0, DX, LP, 0]], pend, 0.45);
  line(arcPts(LR, 0, Math.PI * 2, 160, (r, a) => [Math.cos(a) * r, ARM_Y, Math.sin(a) * r]), rig, 0.2, true);   // arm sweep
  line([[0, ARM_Y, 0], [LR + 4, ARM_Y, 0]], rig, 0.3, true);                                                     // θ = 0

  function liveArc(parent, n, op) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 3), 3));
    const l = new THREE.Line(geo, lineMat(op));
    l.frustumCulled = false;
    parent.add(l);
    return { l, n, set(f) { const p = geo.attributes.position.array; for (let i = 0; i <= n; i++) f(i / n, p, i * 3); geo.attributes.position.needsUpdate = true; } };
  }
  const thArc = liveArc(rig, 64, 0.95), alArc = liveArc(arm, 64, 0.95);
  const R_TH = LR + 2.2, R_AL = 10;

  // ---------- HTML labels pinned to the model ----------
  const lblHost = document.getElementById('lbls');
  const LBL = [
    { t: 'θ', cls: 'sym', obj: rig, p: () => { const a = sim.theta() / 2; return [Math.cos(a) * (R_TH + 2.4), ARM_Y, -Math.sin(a) * (R_TH + 2.4)]; } },
    { t: 'α', cls: 'sym', obj: arm, p: () => { const a = sim.alpha() / 2; return [LR, Math.cos(a) * (R_AL + 2.2), Math.sin(a) * (R_AL + 2.2) + 1.8]; } },
    { t: 'L<sub>r</sub> 216 mm', obj: arm, p: () => [LR / 2, 0, DZ + 1.6] },
    { t: 'L<sub>p</sub> 337 mm', obj: pend, p: () => [DX + 1.2, LP * 0.62, 0] },
    { t: 'SRV02-ET servo', cls: 'end', obj: rig, p: () => [X0, 6, ZH] },
    { t: 'Pendulum encoder', obj: arm, p: () => [LR - 1.6, -2.6, 0] },
  ].map((d) => {
    const el = document.createElement('span');
    el.className = 'lbl3d ' + (d.cls || '');
    el.innerHTML = d.cls === 'end' ? '<span>' + d.t + '</span>' : d.t;
    if (lblHost) lblHost.appendChild(el);
    return Object.assign(d, { el });
  });

  // ---------- Camera ----------
  const T = new THREE.Vector3(6, 22.5, 0);
  let W = 1, H = 1, dist = 150, portrait = false;
  const view = { az: 36, el: 15, vaz: 0, vel: 0, user: false };
  function resize() {
    W = host.clientWidth || 1; H = host.clientHeight || 1;
    renderer.setSize(W, H, false);
    const aspect = W / H;
    portrait = aspect < 0.95;
    camera.aspect = aspect;
    const t = Math.tan(12 * DEG);
    dist = portrait ? Math.max(170, 35 / (t * aspect)) : Math.max(178, 36 / (t * aspect));
    if (portrait) camera.setViewOffset(W, H, 0, -H * 0.02, W, H);   // sit between the readouts and the name
    else camera.setViewOffset(W, H, -W * 0.02, H * 0.03, W, H);
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // ---------- Projection helpers ----------
  const v = new THREE.Vector3();
  function screen(obj, x, y, z) {
    v.set(x, y, z);
    obj.localToWorld(v);
    v.project(camera);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  }

  // ---------- Interaction ----------
  let idleSince = performance.now(), autoN = 0, nextAuto = 0;
  const touched = () => { idleSince = performance.now(); };
  // which way does +α move the pendulum tip on screen right now?
  function screenSign() {
    const a = sim.alpha();
    const p0 = screen(arm, LR, Math.cos(a) * LP * 0.8, Math.sin(a) * LP * 0.8);
    const p1 = screen(arm, LR, Math.cos(a + 0.05) * LP * 0.8, Math.sin(a + 0.05) * LP * 0.8);
    return p1[0] >= p0[0] ? 1 : -1;
  }
  function push(dirScreen, mag) {
    sim.on = true; syncMotor();
    sim.nudge(dirScreen * screenSign(), mag || 1.5);
  }
  function ripple(x, y) {
    const r = document.createElement('span');
    r.className = 'poke';
    r.style.left = x + 'px'; r.style.top = y + 'px';
    host.parentNode.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }

  let down = null;
  host.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, drag: false, id: e.pointerId };
    touched();
  });
  addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
    if (!down.drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
      down.drag = true; view.user = true; host.classList.add('drag');
      try { host.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (down.drag) {
      view.vaz = -dx * 0.28; view.vel = dy * 0.16;
      view.az += view.vaz; view.el = Math.max(2, Math.min(55, view.el + view.vel));
    }
    down.lx = e.clientX; down.ly = e.clientY;
  });
  function up(e) {
    if (!down || e.pointerId !== down.id) return;
    if (!down.drag) {
      const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const a = sim.alpha(), tip = screen(arm, LR, Math.cos(a) * LP * 0.75, Math.sin(a) * LP * 0.75);
      push(x < tip[0] ? 1 : -1, 1.5);   // poke from the left pushes it right, and vice versa
      ripple(x, y);
    }
    host.classList.remove('drag');
    down = null;
    touched();
  }
  addEventListener('pointerup', up);
  addEventListener('pointercancel', (e) => { if (down && e.pointerId === down.id) { host.classList.remove('drag'); down = null; } });

  const motorBtn = document.querySelector('.cv-ctrl [data-act="motor"]');
  function syncMotor() {
    if (!motorBtn) return;
    motorBtn.setAttribute('aria-pressed', String(sim.on));
    motorBtn.textContent = sim.on ? 'Motor on' : 'Motor off';
  }
  document.querySelectorAll('.cv-ctrl [data-act]').forEach((b) => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'left') push(-1, 1.5);
    else if (act === 'right') push(1, 1.5);
    else if (act === 'motor') { sim.on = !sim.on; syncMotor(); }
    else if (act === 'reset') { sim.reset(); syncMotor(); scopeBuf.length = 0; }
    touched();
  }));
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const r = cover.getBoundingClientRect();
    if (r.bottom < innerHeight * 0.5) return;
    push(e.key === 'ArrowLeft' ? -1 : 1, 1.5);
    touched();
  });

  // ---------- HUD + scope ----------
  const $ = (id) => document.getElementById(id);
  const hMode = $('hMode'), hTh = $('hTh'), hAl = $('hAl'), hV = $('hV'), hE = $('hE'), hud = document.querySelector('.cv-hud');
  const sgn = (x, d) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(d);
  const scope = $('scope'), sctx = scope && scope.getContext('2d');
  const scopeBuf = [], SCOPE_S = 10;
  let sW = 0, sH = 0, sDpr = 1;
  function sizeScope() {
    if (!scope) return;
    sDpr = Math.min(window.devicePixelRatio || 1, 2);
    sW = scope.clientWidth; sH = scope.clientHeight;
    scope.width = Math.round(sW * sDpr); scope.height = Math.round(sH * sDpr);
  }
  sizeScope();
  addEventListener('resize', sizeScope);

  function drawScope() {
    if (!sctx || !sW) return;
    const c = sctx;
    c.setTransform(sDpr, 0, 0, sDpr, 0, 0);
    c.clearRect(0, 0, sW, sH);
    c.strokeStyle = `rgba(${inkRGB},.08)`; c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < 10; i++) { const x = Math.round((sW * i) / 10) + 0.5; c.moveTo(x, 0); c.lineTo(x, sH); }
    for (let i = 1; i < 4; i++) { const y = Math.round((sH * i) / 4) + 0.5; c.moveTo(0, y); c.lineTo(sW, y); }
    c.stroke();
    c.strokeStyle = `rgba(${inkRGB},.22)`;
    c.beginPath(); c.moveTo(0, sH / 2 + 0.5); c.lineTo(sW, sH / 2 + 0.5); c.stroke();
    if (scopeBuf.length < 2) return;
    const tEnd = scopeBuf[scopeBuf.length - 1][0];
    const X = (t) => sW - ((tEnd - t) / SCOPE_S) * sW, Y = (u) => sH / 2 - u * (sH / 2 - 4);
    function trace(k, scale, style, w, dash) {
      c.strokeStyle = style; c.lineWidth = w; c.setLineDash(dash || []);
      c.beginPath();
      let prev = null;
      scopeBuf.forEach((s, i) => {
        const val = s[k] / scale;
        if (prev !== null && Math.abs(val - prev) > 1.2) c.moveTo(X(s[0]), Y(val));   // α wraps at ±180°
        else i ? c.lineTo(X(s[0]), Y(val)) : c.moveTo(X(s[0]), Y(val));
        prev = val;
      });
      c.stroke();
      c.setLineDash([]);
    }
    trace(3, 10, `rgba(${inkRGB},.3)`, 1);
    trace(1, 180, `rgba(${inkRGB},.6)`, 1.2, [4, 3]);
    trace(2, 180, `rgb(${inkRGB})`, 1.6);
  }

  // ---------- Loop ----------
  let running = false, visible = true, last = performance.now(), born = last, frameN = 0, lastMode = '';
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sim.advance(dt);

    // idle demo: small taps while balancing, and now and then a knock-down to show the swing-up
    if (!reduce && now - idleSince > 9000 && now > nextAuto) {
      if (!sim.on) { sim.on = true; syncMotor(); }
      else if (sim.label === 'Balance') {
        autoN++;
        const big = autoN % 4 === 0;
        sim.nudge(Math.random() < 0.5 ? -1 : 1, big ? 6 : 0.9 + Math.random() * 0.5);
      }
      nextAuto = now + (sim.label === 'Balance' ? 6500 : 3000);
    }

    // fade the drawing in
    const k = reduce ? 1 : ease((now - born) / 1400);
    if (k < 1 || frameN < 2) {
      lineMats.forEach((m) => (m.opacity = m.userData.to * k));
      fillMats.forEach((m) => { m.opacity = k; if (k >= 1) { m.transparent = false; m.needsUpdate = true; } });
    }

    // camera: gentle drift until the visitor takes over, then a little inertia
    if (!view.user && !reduce) view.az = 36 + 14 * Math.sin((now - born) / 9000);
    else if (!down) { view.vaz *= 0.92; view.vel *= 0.92; view.az += view.vaz; view.el = Math.max(2, Math.min(55, view.el + view.vel)); }
    const az = view.az * DEG, el = view.el * DEG;
    camera.position.set(T.x + dist * Math.cos(el) * Math.sin(az), T.y + dist * Math.sin(el), T.z + dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(T);

    const th = sim.theta(), al = sim.alpha();
    arm.rotation.y = th;
    pend.rotation.x = al;
    thArc.set((u, p, i) => { const a = th * u; p[i] = Math.cos(a) * R_TH; p[i + 1] = ARM_Y; p[i + 2] = -Math.sin(a) * R_TH; });
    alArc.set((u, p, i) => { const a = al * u; p[i] = LR + 0.3; p[i + 1] = Math.cos(a) * R_AL; p[i + 2] = Math.sin(a) * R_AL; });
    rig.updateMatrixWorld(true);
    renderer.render(scene, camera);

    LBL.forEach((d) => {
      const p = d.p(), s = screen(d.obj, p[0], p[1], p[2]);
      d.el.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
    });

    scopeBuf.push([sim.t, th / DEG, al / DEG, sim.V]);
    while (scopeBuf.length && scopeBuf[scopeBuf.length - 1][0] - scopeBuf[0][0] > SCOPE_S) scopeBuf.shift();
    if (frameN % 2 === 0) drawScope();
    if (frameN % 4 === 0) {
      if (hTh) hTh.textContent = sgn(th / DEG, 1) + '°';
      if (hAl) hAl.textContent = sgn(al / DEG, 1) + '°';
      if (hV) hV.textContent = sgn(sim.V, 2) + ' V';
      if (hE) hE.textContent = sim.E.toFixed(3) + ' J';
      if (sim.label !== lastMode) {
        lastMode = sim.label;
        if (hMode) hMode.textContent = lastMode;
        if (hud) hud.dataset.mode = lastMode.toLowerCase().replace(/\s+/g, '-');
      }
    }
    frameN++;
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  const start = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } };

  addEventListener('themechange', () => {
    readTheme();
    lineMats.forEach((m) => m.color.setHex(INK));
    fillMats.forEach((m) => m.color.setHex(PAPER));
    drawScope();
  });

  if (reduce) sim.upright();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) start(); }, { threshold: 0.01 }).observe(host);
  }
  if (lblHost) lblHost.classList.add('on');
  start();
})();
