/* Faint PCB traces down the left edge of each band — black on light bands, white on dark.
   Each one is built and animated the first time its band scrolls into view. */
(function () {
  if (!window.PCB) return;
  function make(svg, i) {
    const dark = !!svg.closest('.dark');
    svg.setAttribute('viewBox', '0 0 460 1000');
    svg.setAttribute('preserveAspectRatio', 'xMinYMin slice');
    const b = PCB.build(svg, {
      seed: +(svg.dataset.seed || 11 + i * 7),
      view: [460, 1000],
      cx: 64, cy: 520, size: 118, pins: 7, pitch: 14,
      ink: dark ? '#fff' : '#000', paper: dark ? '#000' : '#efefec',
      stroke: 1.6, pinW: 4, capR: 5,
      labels: false, chipText: false, deco: 14, markP: 0.5,
      sides: {
        top:    { flow: 'both', minLen: 120, maxLen: 380, spread: 16, sweep: 120 },
        right:  { flow: 'out',  minLen: 40,  maxLen: 280, spread: 18 },
        bottom: { flow: 'in',   minLen: 120, maxLen: 380, spread: 16, sweep: 120 },
        left:   { flow: 'in',   minLen: 30,  maxLen: 60,  spread: 10 },
      },
    });
    PCB.animate(b, { speed: 1.5, pulses: 6, minPulseLen: 100, pulseR: 3, haloR: 7, pulseSlow: 1.8 });
  }
  const svgs = [...document.querySelectorAll('svg.pcb-side')];
  if (!('IntersectionObserver' in window)) { svgs.forEach(make); return; }
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); make(e.target, svgs.indexOf(e.target)); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  svgs.forEach((s) => io.observe(s));
})();
