/* Papers (reflections, ethics): each .doc shows page 1 of its <template> on a sheet. Opening it lifts that sheet
   into the reader (a modal <dialog>) with every page; closing drops the page back onto the stack. */
(function () {
  const dlg = document.getElementById('reader');
  const docs = [...document.querySelectorAll('.doc[data-doc]')];
  if (!dlg || !docs.length) return;
  const scroller = dlg.querySelector('.rd-scroll');
  const pagesEl = dlg.querySelector('.rd-pages');
  const metaEl = dlg.querySelector('.rd-meta');
  const titleEl = dlg.querySelector('.rd-title');
  const countEl = dlg.querySelector('.rd-count');
  const dlEl = dlg.querySelector('.rd-dl');
  const closeBtn = dlg.querySelector('.rd-x');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.2, .7, .1, 1)';
  let doc = null, opener = null, busy = false, ticking = false;

  const pagesOf = (d) => d.querySelector('template').content;
  docs.forEach((d) => d.querySelector('.sheet-pg').appendChild(pagesOf(d).querySelector('.pg').cloneNode(true)));

  const onScreen = (r) => r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  // the transform that lays a reader page exactly over the sheet
  const over = (sheet, page) =>
    `translate(${sheet.left - page.left}px, ${sheet.top - page.top}px) scale(${sheet.width / page.width})`;

  function tally() {
    ticking = false;
    const pages = pagesEl.children;
    const line = innerHeight * 0.45;
    let n = 1;
    for (let i = 0; i < pages.length; i++) if (pages[i].getBoundingClientRect().top < line) n = i + 1;
    countEl.textContent = `Page ${n} of ${pages.length}`;
  }

  function open(d, trigger) {
    if (dlg.open || busy) return;
    doc = d; opener = trigger;
    const sheet = d.querySelector('.sheet');
    const from = sheet.getBoundingClientRect();
    pagesEl.replaceChildren(pagesOf(d).cloneNode(true));
    metaEl.textContent = d.dataset.meta;
    titleEl.textContent = d.dataset.title;
    dlEl.href = d.dataset.pdf;
    dlEl.download = d.dataset.file;
    dlg.showModal();
    scroller.scrollTop = 0;
    closeBtn.focus({ preventScroll: true });
    tally();
    requestAnimationFrame(() => dlg.classList.add('on'));
    if (reduce.matches || !dlg.animate) return;

    const pages = [...pagesEl.children];
    let rest = pages;
    if (onScreen(from)) {
      sheet.classList.add('lifted');
      pages[0].animate([{ transform: over(from, pages[0].getBoundingClientRect()) }, { transform: 'none' }], { duration: 750, easing: EASE });
      rest = pages.slice(1);
    }
    rest.forEach((p, i) => p.animate(
      [{ opacity: 0, transform: 'translateY(48px)' }, { opacity: 1, transform: 'none' }],
      { duration: 700, delay: 200 + i * 70, easing: EASE, fill: 'backwards' }
    ));
  }

  function close() {
    if (!dlg.open || busy) return;
    busy = true;
    dlg.classList.remove('on');
    const shut = () => dlg.close();
    if (reduce.matches || !dlg.animate) return shut();
    const sheet = doc.querySelector('.sheet');
    const first = pagesEl.firstElementChild;
    const s = sheet.getBoundingClientRect(), p = first.getBoundingClientRect();
    let anim;
    if (sheet.classList.contains('lifted') && onScreen(s) && onScreen(p)) {
      [...pagesEl.children].slice(1).forEach((pg) => pg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }));
      anim = first.animate([{ transform: 'none' }, { transform: over(s, p) }], { duration: 600, easing: 'cubic-bezier(.6, 0, .2, 1)', fill: 'forwards' });
    } else {
      anim = pagesEl.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 320, easing: 'ease-in', fill: 'forwards' });
    }
    anim.finished.then(shut, shut);
  }

  // however the dialog ends up closed, put the sheet back and tidy up
  dlg.addEventListener('close', () => {
    dlg.classList.remove('on');
    dlg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    if (doc) doc.querySelector('.sheet').classList.remove('lifted');
    pagesEl.replaceChildren();
    busy = false;
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });   // Esc
  closeBtn.addEventListener('click', close);
  scroller.addEventListener('click', (e) => { if (e.target === scroller || e.target === pagesEl) close(); });
  scroller.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tally); } }, { passive: true });

  docs.forEach((d) => d.querySelector('.sheet-open').addEventListener('click', (e) => open(d, e.currentTarget)));
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    const d = docs.find((x) => x.dataset.doc === b.dataset.open);
    if (d) open(d, b);
  }));
})();
