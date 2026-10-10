/* Skills: 3D favicons that tilt toward the pointer, and slow dust drifting through the spotlight. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.sk-cells li').forEach((li) => {
      const fav = li.querySelector('.fav');
      if (!fav) return;
      li.addEventListener('pointermove', (e) => {
        const r = fav.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        const cx = Math.max(-1, Math.min(2, x)) - 0.5, cy = Math.max(-1, Math.min(2, y)) - 0.5;
        fav.style.setProperty('--ry', (cx * 26).toFixed(1) + 'deg');
        fav.style.setProperty('--rx', (-cy * 26).toFixed(1) + 'deg');
        fav.style.setProperty('--mx', Math.round(Math.max(0, Math.min(1, x)) * 100) + '%');
        fav.style.setProperty('--my', Math.round(Math.max(0, Math.min(1, y)) * 100) + '%');
      });
      li.addEventListener('pointerleave', () => ['--rx', '--ry', '--mx', '--my'].forEach((k) => fav.style.removeProperty(k)));
    });
  }

  const canvas = document.querySelector('.skills .dust');
  if (!canvas || reduce) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, motes = [], running = false, visible = false;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const n = Math.round(Math.min(140, (W * H) / 9000));
    motes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.4 + Math.random() * 1.3, vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.18,
      p: Math.random() * Math.PI * 2,
    }));
  }
  // brighter inside the cone of light that falls from the top, right of centre
  function light(x, y) {
    const cx = W * 0.62, spread = W * 0.12 + y * 0.45;
    const d = Math.abs(x - cx) / spread;
    return Math.max(0.08, 1 - d * d) * (1 - (y / H) * 0.5);
  }
  function frame(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    motes.forEach((m) => {
      m.x += m.vx + Math.sin(t / 2400 + m.p) * 0.06;
      m.y += m.vy;
      if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
      if (m.x < -4) m.x = W + 4; else if (m.x > W + 4) m.x = -4;
      const a = light(m.x, m.y) * (0.35 + 0.35 * Math.sin(t / 900 + m.p * 3));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    });
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  size();
  addEventListener('resize', size);
  new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    if (visible && !running) { running = true; requestAnimationFrame(frame); }
  }).observe(canvas);
})();
