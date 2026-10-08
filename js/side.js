/* Faint PCB traces running down the left edge of dark pages. */
(function () {
  if (!window.PCB) return;
  document.querySelectorAll('svg.pcb-side').forEach((svg, i) => {
    svg.setAttribute('viewBox', '0 0 460 1000');
    svg.setAttribute('preserveAspectRatio', 'xMinYMid slice');
    const seed = +(svg.dataset.seed || 11 + i * 7);
    const b = PCB.build(svg, {
      seed,
      view: [460, 1000],
      cx: 64, cy: 540, size: 118, pins: 7, pitch: 14,
      ink: '#fff', paper: '#000', stroke: 1.6, pinW: 4, capR: 5,
      labels: false, chipText: false, deco: 16, markP: 0.5,
      sides: {
        top:    { flow: 'both', minLen: 120, maxLen: 380, spread: 16, sweep: 120 },
        right:  { flow: 'out',  minLen: 40,  maxLen: 280, spread: 18 },
        bottom: { flow: 'in',   minLen: 120, maxLen: 380, spread: 16, sweep: 120 },
        left:   { flow: 'in',   minLen: 30,  maxLen: 60,  spread: 10 },
      },
    });
    PCB.animate(b, { speed: 1.5, pulses: 7, minPulseLen: 100, pulseR: 3, haloR: 7, pulseSlow: 1.8 });
  });
})();
