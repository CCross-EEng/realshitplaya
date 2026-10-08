/* PCB-style controller schematic generator + anime.js animation.
   A chip in the middle, pins on each side, traces fanned out at 45° so they never cross,
   pads/components on the ends, and signal pulses running in (sensors) or out (actuators). */
window.PCB = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const DIR = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };

  function rng(seed) {
    let s = seed | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / L; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  const inRect = (x, y, r) => x > r[0] && x < r[2] && y > r[1] && y < r[3];

  function build(svg, o) {
    const R = rng(o.seed || 7);
    const ink = o.ink || '#000', paper = o.paper || '#fff', sw = o.stroke || 2;
    const view = o.view, avoid = o.avoid || [];
    const half = o.size / 2;
    const root = el('g', { class: 'pcb-root' }, svg);
    const gDeco = el('g', {}, root), gTr = el('g', {}, root), gMk = el('g', {}, root), gCap = el('g', {}, root);
    const gLbl = el('g', {}, root), gPin = el('g', {}, root), gChip = el('g', {}, root), gPulse = el('g', {}, root);
    const traces = [], segs = [];

    Object.keys(o.sides).forEach((side) => {
      const sd = o.sides[side];
      const [dx, dy] = DIR[side];
      const [px, py] = dy ? [1, 0] : [0, 1];
      const n = sd.pins || o.pins, mid = (n - 1) / 2;
      for (let i = 0; i < n; i++) {
        const k = i - mid, off = k * o.pitch;
        const p0 = [o.cx + dx * half + px * off, o.cy + dy * half + py * off];
        const p1 = [p0[0] + dx * 12, p0[1] + dy * 12];
        el('line', { class: 'pin', x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: ink, 'stroke-width': o.pinW || 5 }, gPin);
        if (sd.skip && sd.skip.includes(i)) continue;

        const a = sd.stub || 22;
        const p2 = [p1[0] + dx * a, p1[1] + dy * a];
        const fan = k * (sd.spread || 20) + k * Math.abs(k) * (sd.curve || 2.5);
        const p3 = [p2[0] + px * fan + dx * Math.abs(fan), p2[1] + py * fan + dy * Math.abs(fan)];
        const scale = sd.lenFn ? sd.lenFn(k, mid) : 1;
        const L = (sd.minLen + R() * (sd.maxLen - sd.minLen)) * scale;
        const p4 = [p3[0] + dx * L, p3[1] + dy * L];
        const pts = [p1, p2, p3, p4];

        // outermost traces may sweep away diagonally, like long runs to a connector
        if (sd.sweep && (i === 0 || i === n - 1) && !(sd.sweepOnly === 'neg' && k > 0) && !(sd.sweepOnly === 'pos' && k < 0) && R() < 0.85) {
          const s = Math.sign(k) || 1, b = sd.sweep * (0.6 + R() * 0.6);
          const p5 = [p4[0] + px * s * b + dx * b, p4[1] + py * s * b + dy * b];
          pts.push(p5);
          if (R() < 0.6) { const c = 40 + R() * 120; pts.push([p5[0] + dx * c, p5[1] + dy * c]); }
        }
        for (let j = 0; j < pts.length - 1; j++) segs.push([pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]]);
        const d = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
        const path = el('path', { class: 'trace', d, fill: 'none', stroke: ink, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gTr);
        const end = pts[pts.length - 1], prev = pts[pts.length - 2];
        const ex = Math.sign(end[0] - prev[0]), ey = Math.sign(end[1] - prev[1]);

        // end cap
        const roll = R();
        let cap;
        if (roll < 0.42) cap = el('circle', { cx: end[0], cy: end[1], r: o.capR || 6, fill: paper, stroke: ink, 'stroke-width': sw }, gCap);
        else if (roll < 0.78) cap = el('circle', { cx: end[0], cy: end[1], r: (o.capR || 6) * 0.6, fill: ink }, gCap);
        else if (roll < 0.94) cap = el('rect', { x: end[0] - 5, y: end[1] - 5, width: 10, height: 10, fill: ink }, gCap);
        else cap = el('rect', { x: end[0] - (dx ? 12 : 7), y: end[1] - (dy ? 12 : 7), width: dx ? 24 : 14, height: dy ? 24 : 14, rx: 2, fill: ink }, gCap);
        cap.setAttribute('class', 'cap');

        // inline marks on the long straight run: solder dashes or a two-pad SMD part
        if (L > 70 && R() < (o.markP || 0.5)) {
          const t = 0.25 + R() * 0.5, mx = p3[0] + dx * L * t, my = p3[1] + dy * L * t;
          if (R() < 0.7) {
            el('rect', { class: 'mark', x: mx - (dx ? 8 : 2.6), y: my - (dy ? 8 : 2.6), width: dx ? 16 : 5.2, height: dy ? 16 : 5.2, rx: 1, fill: ink }, gMk);
          } else {
            const g = el('g', { class: 'mark' }, gMk);
            const w = dx ? 30 : 14, h = dy ? 30 : 14;
            el('rect', { x: mx - w / 2, y: my - h / 2, width: w, height: h, rx: 2, fill: paper, stroke: ink, 'stroke-width': sw }, g);
            el('rect', { x: mx - (dx ? 7 : 4), y: my - (dy ? 7 : 4), width: dx ? 14 : 8, height: dy ? 14 : 8, fill: ink }, g);
          }
        }

        // label
        if (sd.names && o.labels && R() < (sd.labelP == null ? 0.7 : sd.labelP)) {
          const name = sd.names[i % sd.names.length];
          const okView = end[0] > 40 && end[0] < view[0] - 40 && end[1] > 80 && end[1] < view[1] - 40;
          if (okView && !avoid.some((r) => inRect(end[0], end[1], r))) {
            const gap = 14;
            let t;
            if (ex !== 0 && ey === 0) {
              t = el('text', { class: 'lbl', x: end[0] + ex * gap, y: end[1] + 4, 'text-anchor': ex > 0 ? 'start' : 'end', fill: ink }, gLbl);
            } else {
              const x = end[0] + 4, y = end[1] + (ey < 0 ? -gap : gap);
              t = el('text', { class: 'lbl', x, y, transform: `rotate(-90 ${x} ${y})`, 'text-anchor': ey < 0 ? 'start' : 'end', fill: ink }, gLbl);
            }
            t.textContent = name;
          }
        }

        traces.push({ path, side, k, flow: sd.flow || 'out', len: L });
      }
    });

    // chip
    const chip = el('g', { class: 'chipbody' }, gChip);
    el('rect', { x: o.cx - half, y: o.cy - half, width: o.size, height: o.size, fill: paper, stroke: ink, 'stroke-width': sw * 1.3 }, chip);
    el('rect', { x: o.cx - half + 8, y: o.cy - half + 8, width: o.size - 16, height: o.size - 16, rx: 5, fill: ink }, chip);
    el('rect', { x: o.cx - half + 8, y: o.cy - half + 8, width: o.size - 16, height: o.size - 16, rx: 5, fill: 'none', stroke: paper, 'stroke-width': 4, 'stroke-dasharray': '0 10', 'stroke-linecap': 'round' }, chip);
    let readout = null, led = null;
    if (o.chipText) {
      const f = o.size / 190;
      const t1 = el('text', { class: 'chip-big', x: o.cx, y: o.cy + 2 * f, 'text-anchor': 'middle', 'font-size': 52 * f, 'font-weight': 200, 'letter-spacing': -1, fill: paper }, chip);
      t1.textContent = 'C(s)';
      const t2 = el('text', { class: 'chip-t', x: o.cx, y: o.cy - 52 * f, 'text-anchor': 'middle', 'font-size': 10 * f, fill: paper }, chip);
      t2.textContent = 'CONTROLLER';
      const t3 = el('text', { class: 'chip-t', x: o.cx, y: o.cy + 30 * f, 'text-anchor': 'middle', 'font-size': 11 * f, fill: paper }, chip);
      t3.textContent = 'u = −Kx + Nr';
      readout = el('text', { class: 'chip-t', x: o.cx, y: o.cy + 56 * f, 'text-anchor': 'middle', 'font-size': 10 * f, fill: paper, opacity: 0.75 }, chip);
      readout.textContent = 'θ +0.00°  u +0.00V';
      led = el('circle', { cx: o.cx + half - 24 * f, cy: o.cy - half + 24 * f, r: 4 * f, fill: paper }, chip);
      el('circle', { cx: o.cx - half + 24 * f, cy: o.cy + half - 24 * f, r: 5 * f, fill: 'none', stroke: paper, 'stroke-width': 1.4 }, chip);
    }

    // scattered decorations where nothing else is
    const decoN = o.deco || 0;
    const tooClose = (x, y, m) => segs.some((s) => segDist(x, y, s[0], s[1], s[2], s[3]) < m);
    let placed = 0;
    for (let tries = 0; tries < decoN * 12 && placed < decoN; tries++) {
      const x = 30 + R() * (view[0] - 60), y = 30 + R() * (view[1] - 60);
      if (Math.abs(x - o.cx) < half + 60 && Math.abs(y - o.cy) < half + 60) continue;
      if (avoid.some((r) => inRect(x, y, r))) continue;
      if (tooClose(x, y, 26)) continue;
      const g = el('g', { class: 'deco' }, gDeco), kind = R();
      if (kind < 0.3) { for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) el('circle', { cx: x + a * 8, cy: y + b * 8, r: 2.4, fill: ink }, g); }
      else if (kind < 0.55) { const vert = R() < 0.5; for (let a = 0; a < 3; a++) el('rect', { x: x + (vert ? 0 : a * 9), y: y + (vert ? a * 9 : 0), width: vert ? 12 : 4, height: vert ? 4 : 12, fill: ink }, g); }
      else if (kind < 0.75) { el('rect', { x: x - 9, y: y - 9, width: 18, height: 18, fill: paper, stroke: ink, 'stroke-width': sw }, g); el('rect', { x: x - 5, y: y - 5, width: 10, height: 10, fill: ink }, g); }
      else if (kind < 0.9) { el('rect', { x: x - 20, y: y - 3, width: 12, height: 6, fill: ink }, g); el('rect', { x: x + 8, y: y - 3, width: 12, height: 6, fill: ink }, g); }
      else {
        const rot = R() < 0.5 ? 0 : 45;
        const ic = el('g', { transform: `rotate(${rot} ${x} ${y})` }, g);
        el('rect', { x: x - 22, y: y - 11, width: 44, height: 22, rx: 2, fill: paper, stroke: ink, 'stroke-width': sw }, ic);
        el('rect', { x: x - 16, y: y - 6, width: 32, height: 12, fill: ink }, ic);
        for (let a = 0; a < 4; a++) { el('line', { x1: x - 13 + a * 9, y1: y - 11, x2: x - 13 + a * 9, y2: y - 16, stroke: ink, 'stroke-width': 2 }, ic); el('line', { x1: x - 13 + a * 9, y1: y + 11, x2: x - 13 + a * 9, y2: y + 16, stroke: ink, 'stroke-width': 2 }, ic); }
      }
      placed++;
    }

    return { root, traces, gPulse, chip, readout, led, ink, paper };
  }

  function animate(b, o = {}) {
    const A = window.anime;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const q = (sel) => b.root.querySelectorAll(sel);
    if (!A || reduce) {
      q('.trace').forEach((p) => { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = 0; });
      q('.cap, .mark, .deco, .lbl, .pin, .chipbody').forEach((e) => (e.style.opacity = 1));
      return;
    }
    // starting state, applied before the first paint so nothing flashes
    q('.trace').forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    q('.cap, .mark, .deco, .lbl, .pin').forEach((e) => (e.style.opacity = 0));
    b.chip.style.opacity = 0;
    const sp = o.speed || 1;
    const tl = A.timeline({ easing: 'easeOutExpo', autoplay: o.autoplay !== false });
    tl.add({ targets: b.chip, opacity: [0, 1], scale: [0.7, 1], duration: 900 * sp })
      .add({ targets: q('.pin'), opacity: [0, 1], duration: 200 * sp, delay: A.stagger(6 * sp) }, '-=600')
      .add({ targets: q('.trace'), strokeDashoffset: [A.setDashoffset, 0], easing: 'easeInOutSine', duration: 1500 * sp, delay: A.stagger(14 * sp, { from: 'center' }) }, '-=300')
      .add({ targets: q('.cap, .mark'), opacity: [0, 1], scale: [0, 1], easing: 'easeOutBack', duration: 500 * sp, delay: A.stagger(10 * sp) }, '-=900')
      .add({ targets: q('.deco'), opacity: [0, 1], scale: [0.4, 1], duration: 600 * sp, delay: A.stagger(25 * sp) }, '-=800')
      .add({ targets: q('.lbl'), opacity: [0, 1], duration: 700 * sp, delay: A.stagger(25 * sp) }, '-=900');

    // signal pulses
    const pool = b.traces.filter((t) => t.len > (o.minPulseLen || 120));
    const count = Math.min(o.pulses || 14, pool.length);
    const chosen = pool.sort(() => 0.5 - Math.random()).slice(0, count);
    tl.finished.then(() => {
      chosen.forEach((t, i) => {
        const g = el('g', { class: 'pulse-g' }, b.gPulse);
        el('circle', { r: o.haloR || 9, fill: 'none', stroke: b.ink, 'stroke-width': 1, opacity: 0.3 }, g);
        el('circle', { r: o.pulseR || 3.6, fill: b.ink }, g);
        g.style.opacity = 0;
        const path = A.path(t.path);
        const inward = t.flow === 'in' || (t.flow === 'both' && i % 2);
        const dur = (1400 + t.len * 5) * (o.pulseSlow || 1);
        A({
          targets: g,
          translateX: path('x'),
          translateY: path('y'),
          opacity: [{ value: 1, duration: dur * 0.12 }, { value: 1, duration: dur * 0.72 }, { value: 0, duration: dur * 0.16 }],
          direction: inward ? 'reverse' : 'normal',
          easing: 'easeInOutSine',
          duration: dur,
          delay: i * 380 + Math.random() * 900,
          endDelay: 600 + Math.random() * 2400,
          loop: true,
        });
      });
    });

    if (b.led) A({ targets: b.led, opacity: [1, 0.15], duration: 600, direction: 'alternate', loop: true, easing: 'steps(1)' });
    return tl;
  }

  return { build, animate };
})();
