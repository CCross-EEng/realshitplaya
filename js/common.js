/* Shared behaviour for inner sheets: scroll reveals + soft page transitions. */
(function () {
  // Reveal on scroll
  const items = document.querySelectorAll('.rv, .rv-draw');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('in'));
  }

  // Fade-out veil on internal navigation
  const veil = document.createElement('div');
  veil.className = 'veil';
  document.body.appendChild(veil);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || /^https?:/.test(href) || /\.pdf$/i.test(href)) return;
    if (href.split('#')[0] === location.pathname.split('/').pop()) return;
    e.preventDefault();
    veil.classList.add('on');
    setTimeout(() => { location.href = href; }, 380);
  });
  window.addEventListener('pageshow', () => veil.classList.remove('on'));
})();
