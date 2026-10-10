/* Scroll reveals, dark / light theme, and the header (sliding current-section pill, mobile menu). */
(function () {
  const items = document.querySelectorAll('.rv, .rv-draw');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('in'));
  }

  // ---------- theme (the initial value is set in <head> before first paint) ----------
  const root = document.documentElement;
  const themeBtn = document.querySelector('.theme-btn');
  function applyTheme(t, save) {
    root.dataset.theme = t;
    if (themeBtn) themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (save) { try { localStorage.setItem('theme', t); } catch (e) {} }
    dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light', false);
  if (themeBtn) themeBtn.addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));

  const nav = document.getElementById('nav');
  if (!nav) return;
  const bands = [...document.querySelectorAll('.band')];
  const links = [...nav.querySelectorAll('ul a')];
  const pill = nav.querySelector('.pill');
  const menu = nav.querySelector('.nav-menu');

  // the glass follows what's behind it: light over light bands, dark over black ones (or everywhere in dark mode)
  let ticking = false;
  function glass() {
    ticking = false;
    const y = nav.getBoundingClientRect().top + nav.offsetHeight / 2;
    const under = bands.find((b) => { const r = b.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    nav.classList.toggle('on-dark', root.dataset.theme === 'dark' || (!!under && under.classList.contains('dark')));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(glass); } }, { passive: true });
  addEventListener('resize', glass);
  addEventListener('themechange', glass);
  glass();

  // current section → link state + sliding pill
  function movePill() {
    const cur = links.find((a) => a.classList.contains('cur'));
    if (!pill) return;
    if (!cur || getComputedStyle(pill).display === 'none') { pill.classList.remove('on'); return; }
    pill.style.width = cur.offsetWidth + 'px';
    pill.style.transform = `translateX(${cur.offsetLeft}px)`;
    pill.classList.add('on');
  }
  const map = { quadcopter: 'projects', plc: 'projects', cmos: 'projects', cover: '' };
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id in map ? map[e.target.id] : e.target.id;
        links.forEach((a) => a.classList.toggle('cur', !!id && a.getAttribute('href') === '#' + id));
        movePill();
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    bands.filter((b) => b.id).forEach((s) => so.observe(s));
  }
  addEventListener('resize', movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);

  // mobile menu
  function setOpen(open) {
    nav.classList.toggle('open', open);
    if (menu) menu.setAttribute('aria-expanded', String(open));
  }
  if (menu) menu.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); menu.focus(); } });
  document.addEventListener('click', (e) => { if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false); });
})();
