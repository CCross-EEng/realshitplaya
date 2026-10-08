/* Cover: a controller chip wired to the sensors and actuators of the projects in this
   portfolio, drawn and animated with anime.js. */
(function () {
  const svg = document.getElementById('pcb');
  if (!svg || !window.PCB) return;

  const b = PCB.build(svg, {
    seed: 29,
    view: [1600, 900],
    cx: 575, cy: 380, size: 190, pins: 11, pitch: 15,
    ink: '#000', paper: '#fff', stroke: 2,
    labels: true, chipText: true, deco: 36, markP: 0.55,
    avoid: [[740, 590, 1600, 900], [0, 0, 1600, 80], [0, 760, 460, 900], [0, 0, 150, 900], [1460, 0, 1600, 900]],
    sides: {
      left:   { flow: 'in',   minLen: 90, maxLen: 470, spread: 22, sweep: 170, sweepOnly: 'pos', labelP: 0.75,
                names: ['ENC_A', 'ENC_B', 'IMU_SDA', 'IMU_SCL', 'ADC0 · θ', 'ADC1 · α', 'PROX', 'IR_SNS', 'IND_SNS', 'CAP_SNS', 'LIMIT_SW'] },
      top:    { flow: 'both', minLen: 50, maxLen: 260, spread: 20, sweep: 150, labelP: 0.6,
                names: ['3V3', 'UART_TX', 'UART_RX', 'CAN_H', 'CAN_L', 'SPI_CLK', 'MOSI', 'MISO', 'CS', 'RADIO', 'GND'] },
      right:  { flow: 'out',  minLen: 70, maxLen: 520, spread: 20, labelP: 0.8, lenFn: (k) => (k > 1 ? 0.42 : 1),
                names: ['PWM1 · ω1', 'PWM2 · ω2', 'PWM3 · ω3', 'PWM4 · ω4', 'SERVO · Vm', 'SOL_SORT', 'SOL_ROT', 'SOL_REJ', 'CONV_EN', 'E-STOP', 'FAULT'] },
      bottom: { flow: 'out',  minLen: 80, maxLen: 330, spread: 20, sweep: 230, sweepOnly: 'neg', labelP: 0.6, lenFn: (k) => (k > 2 ? 0.3 : k > 0 ? 0.5 : 1),
                names: ['DAC · u(t)', 'Vm', 'RESET', 'DCS_A', 'DCS_B', 'SAFE_OUT', 'GND', '5V', 'TOF', 'CTU', 'CTD'] },
    },
  });

  // portrait screens: keep the chip in frame
  function frameView() {
    svg.setAttribute('viewBox', innerWidth / innerHeight < 0.9 ? '125 0 900 900' : '0 0 1600 900');
  }
  frameView();
  addEventListener('resize', frameView);

  PCB.animate(b, { pulses: 18, minPulseLen: 140 });

  // live readout inside the chip: pendulum angle and control voltage after a periodic kick
  if (b.readout && window.anime && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const clock = { t: 0 };
    anime({
      targets: clock, t: 5.6, duration: 5600, easing: 'linear', loop: true, delay: 3200,
      update() {
        const tp = clock.t, e = Math.exp(-1.25 * tp);
        const th = 8.3 * e * Math.sin(6.2 * tp);
        const thd = 8.3 * e * (6.2 * Math.cos(6.2 * tp) - 1.25 * Math.sin(6.2 * tp));
        const u = Math.max(-10, Math.min(10, -(0.38 * th + 0.022 * thd)));
        const f = (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);
        b.readout.textContent = `θ ${f(th, 2)}°  u ${f(u, 2)}V`;
      },
    });
  }

  // Enter / arrow-down jumps to the contents
  addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === 'ArrowDown') && scrollY < innerHeight * 0.5 && document.activeElement === document.body) {
      e.preventDefault();
      document.getElementById('contents').scrollIntoView({ behavior: 'smooth' });
    }
  });
})();
