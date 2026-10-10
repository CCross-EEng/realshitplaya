/* Contact: a great sword standing in a pool of light, drawn as ASCII.
   The scene is painted small (one pixel per character cell), then each cell's brightness picks a glyph.
   The light follows the pointer, a glint runs down the blade, and characters near the cursor scramble. */
(function () {
  const host = document.querySelector('.contact-ascii');
  if (!host) return;
  const canvas = host.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const scene = document.createElement('canvas');
  const sc = scene.getContext('2d', { willReadFrequently: true });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAMP = " .'`,:;-~=+*xoO0#%&@";
  const SCRAMBLE = '/\\|_<>{}[]#%&@*+=';
  const FONT_PX = 10, LINE = 12;

  let W = 0, H = 0, dpr = 1, cw = 7, cols = 0, rows = 0;
  let px = 0.32, py = 0.2, tpx = 0.32, tpy = 0.2, mx = -1, my = -1;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `400 ${FONT_PX}px 'Geist Mono', ui-monospace, Consolas, monospace`;
    cw = ctx.measureText('M').width || 7;
    cols = Math.max(1, Math.floor(W / cw)); rows = Math.max(1, Math.floor(H / LINE));
    scene.width = cols; scene.height = rows;
  }

  // ---------- paint the scene in CSS px; the transform squeezes it to one pixel per cell ----------
  function paint(t) {
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.fillStyle = '#000';
    sc.fillRect(0, 0, cols, rows);
    sc.setTransform(cols / W, 0, 0, rows / H, 0, 0);

    const size = Math.min(W * 1.15, H * 0.95);
    const S = size * 0.6;                              // blade length
    const bw = S * 0.25;                               // blade width
    const tip = { x: W * 0.28, y: H * 0.42 + size * 0.32 };   // sword sits level with the headline and rows
    const ang = -56 * Math.PI / 180;                   // leaning up and to the right
    const lx = W * (0.25 + px * 0.5), ly = H * (0.05 + py * 0.25);   // light source

    // spotlight cone and the pool it makes on the floor
    const pool = { x: tip.x + S * 0.06, y: tip.y + S * 0.035 };
    let g = sc.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, S * 0.62);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    sc.save();
    sc.translate(pool.x, pool.y); sc.scale(1, 0.2); sc.translate(-pool.x, -pool.y);
    sc.fillStyle = g;
    sc.beginPath(); sc.arc(pool.x, pool.y, S * 0.62, 0, Math.PI * 2); sc.fill();
    sc.restore();

    const mid = { x: tip.x + Math.cos(ang) * S * 0.45, y: tip.y + Math.sin(ang) * S * 0.45 };
    g = sc.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, S * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    sc.save();
    sc.translate(mid.x, mid.y); sc.rotate(ang); sc.scale(1, 0.42); sc.translate(-mid.x, -mid.y);
    sc.fillStyle = g;
    sc.beginPath(); sc.arc(mid.x, mid.y, S * 0.6, 0, Math.PI * 2); sc.fill();
    sc.restore();

    // the blade's shadow across the pool, thrown away from the light
    const away = Math.atan2(tip.y - ly, tip.x - lx);
    sc.save();
    sc.translate(tip.x, tip.y);
    sc.scale(1, 0.22);
    sc.rotate(away);
    sc.fillStyle = 'rgba(0,0,0,.85)';
    sc.beginPath();
    sc.moveTo(0, -bw * 0.25); sc.lineTo(S * 0.75, -bw * 0.45); sc.lineTo(S * 0.75, bw * 0.45); sc.lineTo(0, bw * 0.25);
    sc.fill();
    sc.restore();

    // ---------- the sword, in its own frame: x runs from the tip (0) up to the pommel ----------
    sc.save();
    sc.translate(tip.x, tip.y);
    sc.rotate(ang);
    const hw = bw / 2, gt = S * 0.075, hl = S * 0.34, hr = bw * 0.11;
    const lit = 0.55 + 0.35 * Math.max(0, Math.cos(Math.atan2(ly - tip.y, lx - tip.x) - ang + Math.PI / 2));

    // flat of the blade, brightest near the floor light
    g = sc.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, `rgba(235,235,235,${lit})`);
    g.addColorStop(0.45, `rgba(170,170,170,${lit * 0.9})`);
    g.addColorStop(1, `rgba(120,120,120,${lit * 0.85})`);
    sc.fillStyle = g;
    sc.beginPath();
    sc.moveTo(0, hw); sc.lineTo(S, hw); sc.lineTo(S, -hw); sc.lineTo(bw * 0.95, -hw); sc.closePath();
    sc.fill();
    // bevelled cutting edge catches the most light
    g = sc.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(225,225,225,.95)');
    sc.fillStyle = g;
    sc.beginPath();
    sc.moveTo(bw * 0.95, -hw); sc.lineTo(S, -hw); sc.lineTo(S, -hw + bw * 0.2); sc.lineTo(bw * 0.95 + bw * 0.2, -hw + bw * 0.2); sc.closePath();
    sc.fill();
    // spine in shade
    sc.fillStyle = 'rgba(40,40,40,.9)';
    sc.fillRect(bw * 0.2, hw - bw * 0.1, S - bw * 0.2, bw * 0.1);
    // engraving along the flat
    sc.strokeStyle = 'rgba(60,60,60,.7)'; sc.lineWidth = Math.max(1, bw * 0.03);
    sc.beginPath();
    sc.moveTo(bw * 1.6, hw * 0.25); sc.lineTo(S * 0.82, hw * 0.25);
    sc.moveTo(bw * 2.4, -hw * 0.15); sc.lineTo(S * 0.6, -hw * 0.15);
    sc.stroke();
    // a one-character rim of light so the silhouette stays crisp
    sc.strokeStyle = 'rgba(255,255,255,.6)'; sc.lineWidth = cw * 1.1; sc.lineJoin = 'round';
    sc.beginPath();
    sc.moveTo(0, hw); sc.lineTo(S, hw); sc.lineTo(S, -hw); sc.lineTo(bw * 0.95, -hw); sc.closePath();
    sc.stroke();
    // the two holes near the guard
    sc.fillStyle = '#000';
    [[S - bw * 0.42, hw * 0.12], [S - bw * 0.82, hw * 0.12]].forEach(([x, y]) => { sc.beginPath(); sc.arc(x, y, bw * 0.1, 0, Math.PI * 2); sc.fill(); });

    // a glint that travels up the edge every few seconds
    if (!reduce) {
      const k = ((t / 1000) % 4.5) / 4.5, gx = -S * 0.2 + k * S * 1.4;
      g = sc.createLinearGradient(gx - S * 0.12, 0, gx + S * 0.12, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      sc.save();
      sc.beginPath(); sc.moveTo(0, hw); sc.lineTo(S, hw); sc.lineTo(S, -hw); sc.lineTo(bw * 0.95, -hw); sc.closePath(); sc.clip();
      sc.fillStyle = g; sc.fillRect(gx - S * 0.12, -hw, S * 0.24, bw);
      sc.restore();
    }

    // guard, grip with its wrap, pommel
    sc.fillStyle = 'rgba(205,205,205,1)';
    sc.fillRect(S, -hw * 1.24, gt, hw * 2.48);
    sc.fillStyle = 'rgba(70,70,70,1)';
    [[-hw * 0.8], [hw * 0.8]].forEach(([y]) => { sc.beginPath(); sc.arc(S + gt / 2, y, gt * 0.22, 0, Math.PI * 2); sc.fill(); });
    sc.fillStyle = 'rgba(95,95,95,1)';
    sc.fillRect(S + gt, -hr, hl, hr * 2);
    sc.fillStyle = 'rgba(30,30,30,1)';
    for (let x = S + gt + hl * 0.06; x < S + gt + hl * 0.95; x += hl * 0.09) sc.fillRect(x, -hr, hl * 0.035, hr * 2);
    sc.fillStyle = 'rgba(190,190,190,1)';
    sc.beginPath(); sc.arc(S + gt + hl + hr * 0.6, 0, hr * 1.25, 0, Math.PI * 2); sc.fill();
    sc.restore();
  }

  // ---------- brightness → glyph ----------
  function draw(t) {
    paint(t);
    const img = sc.getImageData(0, 0, cols, rows).data;
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    const near = mx >= 0 ? 7 : 0;
    const buckets = new Map();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4;
        let l = (img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114) / 255;
        if (!reduce && l < 0.05 && Math.random() < 0.0016) l = 0.12 + Math.random() * 0.1;   // dust
        if (l < 0.045) continue;
        let ch = RAMP[Math.min(RAMP.length - 1, Math.floor(l * RAMP.length))];
        if (near) {
          const dx = (c * cw - mx) / cw, dy = (r * LINE - my) / LINE * 1.8;
          if (dx * dx + dy * dy < near * near && Math.random() < 0.55) ch = SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        }
        const shade = Math.round(Math.min(1, 0.25 + l * 0.85) * 12) / 12;
        let list = buckets.get(shade);
        if (!list) buckets.set(shade, (list = []));
        list.push(ch, c * cw, r * LINE);
      }
    }
    buckets.forEach((list, shade) => {
      const v = Math.round(shade * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      for (let k = 0; k < list.length; k += 3) ctx.fillText(list[k], list[k + 1], list[k + 2]);
    });
  }

  // ---------- loop (about 24 fps, only while on screen) ----------
  let visible = false, running = false, last = 0;
  function loop(t) {
    if (!visible) { running = false; return; }
    requestAnimationFrame(loop);
    if (t - last < 40) return;
    last = t;
    px += (tpx - px) * 0.08; py += (tpy - py) * 0.08;
    draw(t);
  }
  const section = host.closest('section, footer') || document.body;
  section.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    tpx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    tpy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    mx = e.clientX - r.left; my = e.clientY - r.top;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { tpx = 0.32; tpy = 0.2; mx = my = -1; });

  function start() {
    size();
    if (reduce) { draw(0); return; }
    new IntersectionObserver((es) => {
      visible = es[es.length - 1].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(loop); }
    }).observe(host);
  }
  addEventListener('resize', () => { size(); if (reduce) draw(0); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
