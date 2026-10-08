/* Scroll reveals, nav visibility and the current-section marker. */
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

  const nav = document.getElementById('nav');
  const cover = document.getElementById('cover');
  if (!nav || !cover) return;
  const onScroll = () => nav.classList.toggle('on', scrollY > cover.offsetHeight * 0.6);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // highlight the section in view
  const links = [...nav.querySelectorAll('ul a')];
  const map = { quadcopter: 'projects', plc: 'projects', cmos: 'projects' };
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = map[e.target.id] || e.target.id;
        links.forEach((a) => a.classList.toggle('cur', a.getAttribute('href') === '#' + id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.band[id]').forEach((s) => so.observe(s));
  }
})();
