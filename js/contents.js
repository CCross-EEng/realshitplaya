/* Contents: a slowly turning geodesic constellation. The sections of the portfolio
   ride on the outer vertices and point outward with schematic leader lines. */
(function () {
  const SECTIONS = [
    { n: 'I',    t: 'About',                 s: 'Welcome · career objective', href: 'about.html' },
    { n: 'II',   t: 'Senior Design',         s: 'EE 4910 / 4920 capstone',    href: 'senior-design.html' },
    { n: 'III',  t: 'Projects',              s: 'Pendulum · quad · PLC · CMOS', href: 'projects.html' },
    { n: 'IV',   t: 'Résumé',                s: 'View or download',           href: 'resume.html' },
    { n: 'V',    t: 'Gen Ed Reflection',     s: 'Beyond the lab',             href: 'reflections.html#gen-ed' },
    { n: 'VI',   t: 'Cumulative Reflection', s: 'Four years in review',       href: 'reflections.html#cumulative' },
    { n: 'VII',  t: 'Ethics',                s: 'Engineering ethics paper',   href: 'ethics.html' },
    { n: 'VIII', t: 'Contact',               s: 'Email · phone · links',      href: 'about.html#contact' },
  ];

  const canvas = document.getElementById('net');
  const ctx = canvas.getContext('2d');
  const nodesEl = document.getElementById('nodes');
  const toc = document.getElementById('toc');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Seeded randomness so the shape is the same every visit ----------
  let seed = 29;
  const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const norm = (p) => { const l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // ---------- Geometry (unit radius) ----------
  const P = (1 + Math.sqrt(5)) / 2;
  const ico = [[-1, P, 0], [1, P, 0], [-1, -P, 0], [1, -P, 0], [0, -1, P], [0, 1, P], [0, -1, -P], [0, 1, -P], [P, 0, -1], [P, 0, 1], [-P, 0, -1], [-P, 0, 1]].map(norm);
  const pts = ico.map((p) => ({ p, shell: true, size: 1.5 }));
  const edges = [];
  const edgeSet = new Set();
  const addEdge = (a, b, w = 1) => { if (a === b) return; const k = a < b ? a + '-' + b : b + '-' + a; if (edgeSet.has(k)) return; edgeSet.add(k); edges.push([a, b, w]); };

  // icosahedron edges + geodesic midpoints (frequency-2 shell)
  const icoEdges = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (dist(ico[i], ico[j]) < 1.1) icoEdges.push([i, j]);
  icoEdges.forEach(([i, j]) => {
    const m = norm([(ico[i][0] + ico[j][0]) / 2, (ico[i][1] + ico[j][1]) / 2, (ico[i][2] + ico[j][2]) / 2]);
    const r = 0.96 + rnd() * 0.06;
    pts.push({ p: [m[0] * r, m[1] * r, m[2] * r], shell: true, size: 1.1 });
    addEdge(i, j, 1.2);
  });
  const shellN = pts.length;
  for (let i = 0; i < shellN; i++) for (let j = i + 1; j < shellN; j++) if (dist(pts[i].p, pts[j].p) < 0.62) addEdge(i, j, 0.9);

  // interior: two bright clusters + a loose cloud
  const clusters = [[0.12, 0.30, 0.18], [-0.05, -0.28, -0.08]];
  clusters.forEach((c) => {
    for (let k = 0; k < 26; k++) {
      const s = 0.16;
      pts.push({ p: [c[0] + gauss() * s, c[1] + gauss() * s, c[2] + gauss() * s], shell: false, size: 0.8 + rnd() * 0.6 });
    }
  });
  for (let k = 0; k < 60; k++) {
    const d = norm([gauss(), gauss(), gauss()]), r = Math.cbrt(rnd()) * 0.86;
    pts.push({ p: [d[0] * r, d[1] * r, d[2] * r], shell: false, size: 0.7 + rnd() * 0.8 });
  }
  // wire interior points to their nearest neighbours and to the shell
  for (let i = shellN; i < pts.length; i++) {
    const near = pts.map((q, j) => [j, dist(pts[i].p, q.p)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
    for (let k = 0; k < 3; k++) addEdge(i, near[k][0], 0.7);
    if (rnd() < 0.55) addEdge(i, Math.floor(rnd() * shellN), 0.6);
    if (rnd() < 0.35) addEdge(i, shellN + Math.floor(rnd() * (pts.length - shellN)), 0.5);
  }
  // long chords across the shell
  for (let k = 0; k < 46; k++) {
    const a = Math.floor(rnd() * shellN), b = Math.floor(rnd() * shellN);
    if (dist(pts[a].p, pts[b].p) > 0.9) addEdge(a, b, 0.55);
  }

  // which outer vertices carry a section label
  const LABEL_V = [0, 9, 4, 3, 6, 10, 7, 11];

  document.getElementById('nCount').textContent = pts.length;
  document.getElementById('eCount').textContent = edges.length;

  // ---------- DOM: labels + table of contents ----------
  let hot = -1;
  const labels = SECTIONS.map((sec, i) => {
    const a = document.createElement('a');
    a.className = 'node';
    a.href = sec.href;
    a.innerHTML = `<span class="n">${sec.n}</span><span class="t">${sec.t}</span><span class="s">${sec.s}</span>`;
    a.addEventListener('mouseenter', () => setHot(i));
    a.addEventListener('mouseleave', () => setHot(-1));
    a.addEventListener('focus', () => setHot(i));
    a.addEventListener('blur', () => setHot(-1));
    nodesEl.appendChild(a);

    const li = document.createElement('li');
    li.innerHTML = `<a href="${sec.href}"><span class="n">${sec.n}</span><span class="t">${sec.t}</span><span class="a">→</span></a>`;
    const la = li.firstChild;
    la.addEventListener('mouseenter', () => setHot(i));
    la.addEventListener('mouseleave', () => setHot(-1));
    la.addEventListener('focus', () => setHot(i));
    la.addEventListener('blur', () => setHot(-1));
    toc.appendChild(li);
    return { el: a, toc: la };
  });
  function setHot(i) {
    hot = i;
    labels.forEach((l, j) => { l.el.classList.toggle('hot', j === i); l.toc.classList.toggle('hot', j === i); });
  }

  // ---------- Glow sprite ----------
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  (function () {
    const g = sprite.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.12, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.35)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.08)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
  })();

  // ---------- Sizing ----------
  let W = 0, H = 0, DPR = 1, CX = 0, CY = 0, R = 100, mobile = false;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    mobile = innerWidth <= 860;
    if (mobile) { CX = W / 2; CY = H / 2; R = Math.min(W, H) * 0.27; }
    else if (W < 1280) { CX = W * 0.52; CY = H * 0.5; R = Math.min(H * 0.29, W * 0.19); }
    else { CX = W * 0.6; CY = H * 0.52; R = Math.min(H * 0.31, W * 0.2); }
    measure();
  }
  // label sizes, so they can be kept inside the viewport
  let widths = [];
  function measure() { widths = labels.map((l) => l.el.offsetWidth); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  resize();
  addEventListener('resize', resize);

  // ---------- Interaction ----------
  let yaw = 0.6, pitch = -0.32, vy = 0, vp = 0, dragging = false, lx = 0, ly = 0, speed = 1;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.classList.add('drag'); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    vy = dx * 0.006; vp = mobile ? 0 : dy * 0.006;
    yaw += vy; pitch = Math.max(-1.2, Math.min(1.2, pitch + vp));
  });
  const end = () => { dragging = false; canvas.classList.remove('drag'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // ---------- Render loop ----------
  const proj = new Array(pts.length);
  let t0 = null;
  const D = 3.4; // camera distance in radii

  function frame(now) {
    if (t0 === null) t0 = now;
    const t = (now - t0) / 1000;
    const grow = 1 - Math.pow(1 - Math.min(1, t / 1.8), 3);
    const labelIn = Math.max(0, Math.min(1, (t - 1.1) / 0.9));

    const target = hot >= 0 ? 0.12 : 1;
    speed += (target - speed) * 0.05;
    if (!dragging) {
      if (!reduce) yaw += 0.0022 * speed;
      yaw += vy; pitch = Math.max(-1.2, Math.min(1.2, pitch + vp));
      vy *= 0.94; vp *= 0.94;
    }
    const wob = reduce ? 0 : Math.sin(t * 0.21) * 0.08;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch + wob), sp = Math.sin(pitch + wob);
    const r = R * (0.25 + 0.75 * grow);

    for (let i = 0; i < pts.length; i++) {
      const [x, y, z] = pts[i].p;
      const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const s = D / (D - z2);
      proj[i] = { x: CX + x1 * r * s, y: CY - y2 * r * s, z: z2, s, d: (z2 + 1) / 2 };
    }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // edges
    for (const [a, b, w] of edges) {
      const A = proj[a], B = proj[b];
      const d = (A.d + B.d) / 2;
      ctx.strokeStyle = `rgba(255,255,255,${((0.05 + 0.3 * d * d) * w * grow).toFixed(3)})`;
      ctx.lineWidth = 0.45 + 0.55 * d;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }

    // points
    for (let i = 0; i < pts.length; i++) {
      const p = proj[i];
      const sz = (pts[i].shell ? 13 : 9) * pts[i].size * (0.55 + 0.6 * p.d) * p.s;
      ctx.globalAlpha = (0.3 + 0.7 * p.d) * grow;
      ctx.drawImage(sprite, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // labels + leader lines
    const placed = [];
    LABEL_V.forEach((vi, li) => {
      const p = proj[vi];
      let dx = p.x - CX, dy = p.y - CY;
      const L = Math.hypot(dx, dy) || 1;
      dx /= L; dy /= L;
      const lead = (mobile ? 18 : 34) * p.s;
      const qx = p.x + dx * lead, qy = p.y + dy * lead;
      const left = dx < 0;
      placed.push({ li, p, qx, qy, left, ay: qy });
    });
    // keep labels on the same side from stacking on top of each other
    const gap = mobile ? 22 : 40;
    [true, false].forEach((side) => {
      const group = placed.filter((o) => o.left === side).sort((a, b) => a.ay - b.ay);
      for (let k = 1; k < group.length; k++) if (group[k].ay - group[k - 1].ay < gap) group[k].ay = group[k - 1].ay + gap;
      const overflow = group.length ? group[group.length - 1].ay - (H - 24) : 0;
      if (overflow > 0) group.forEach((o) => (o.ay -= overflow));
    });

    ctx.globalCompositeOperation = 'source-over';
    placed.forEach((o) => {
      const { li, p, qx, qy, left, ay } = o;
      const isHot = li === hot;
      const vis = (0.22 + 0.78 * Math.pow(p.d, 1.3)) * labelIn;
      const run = mobile ? 10 : 22;
      const ax = qx + (left ? -run : run);

      ctx.strokeStyle = `rgba(255,255,255,${(isHot ? 0.95 : 0.45 * vis).toFixed(3)})`;
      ctx.lineWidth = isHot ? 1.1 : 0.8;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(qx, qy); ctx.lineTo(qx + (left ? -6 : 6), ay); ctx.lineTo(ax, ay); ctx.stroke();
      // ring on the vertex
      ctx.beginPath(); ctx.arc(p.x, p.y, isHot ? 7 : 4, 0, Math.PI * 2); ctx.stroke();
      if (isHot) {
        ctx.globalCompositeOperation = 'lighter';
        const sz = 46;
        ctx.drawImage(sprite, p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.globalCompositeOperation = 'source-over';
      }

      const el = labels[li].el;
      el.classList.toggle('left', left);
      const wdt = widths[li] || 160, pad = mobile ? 10 : 30;
      let lx = left ? ax - 8 - wdt : ax + 8;
      lx = Math.max(pad, Math.min(W - pad - wdt, lx));
      el.style.transform = `translate(${lx.toFixed(1)}px, ${ay.toFixed(1)}px) translateY(-50%)`;
      el.style.opacity = isHot ? 1 : vis.toFixed(3);
      el.style.zIndex = Math.round(p.d * 100) + (isHot ? 200 : 0);
    });

    if (visible) requestAnimationFrame(frame); else running = false;
  }
  // only spin while the contents section is on screen
  let visible = !('IntersectionObserver' in window), running = false;
  const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.02 })
      .observe(canvas.parentElement);
  }
  if (visible) start();
})();
