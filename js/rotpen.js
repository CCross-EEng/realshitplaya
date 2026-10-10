/* Rotary inverted pendulum (Quanser SRV02-ET + ROTPEN-E), simulated with the parameters and gains
   from Chris's EE 4760 labs 4–6. Nonlinear equations of motion, RK4 at 1 kHz.
   States: θ (arm), α (pendulum, 0 = upright, + matches the Quanser convention), θ̇, α̇.
   Controller: energy-based swing-up, switching to the Lab 5 full-state feedback u = −Kx when |α| ≤ ε.
   The swing-up gains differ from the lab's (μ = 8, u_max = 11.6 m/s²): the simulated arm has no cable
   or end stops, so it gets a soft centring term and a stiffer pump to swing up cleanly. */
(function (root) {
  const P = {
    mp: 0.127, Lp: 0.337, Lr: 0.216, Jr: 9.9829e-4, Jp: 0.0012, g: 9.81, Dr: 0.0024, Dp: 0.0024,
    Kg: 70, kt: 0.0077, km: 0.0077, Rm: 2.6, Vmax: 10,
  };
  const K = [-5.262, 28.1577, -2.7576, 3.2191];   // Lab 5 balance gain (poles −2.8 ± j2.86, −30, −40)
  const EPS = 12 * Math.PI / 180;                // balance enable window (epsilon = 0.2094 rad)
  const l = P.Lp / 2, Jpp = P.Jp + P.mp * l * l;
  const Er = P.mp * P.g * P.Lp;                  // energy at upright (≈ 0.42 J)

  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const clamp = (v, m) => Math.max(-m, Math.min(m, v));

  function deriv(x, V, out) {
    const [, a, td, ad] = x;
    const s = Math.sin(a), c = Math.cos(a);
    const tau = P.Kg * P.kt * (V - P.Kg * P.km * td) / P.Rm;
    const m11 = P.Jr + P.mp * P.Lr * P.Lr + P.mp * l * l * s * s;
    const m12 = -P.mp * P.Lr * l * c;
    const r1 = tau - P.Dr * td - 2 * P.mp * l * l * s * c * td * ad - P.mp * P.Lr * l * s * ad * ad;
    const r2 = -P.Dp * ad + P.mp * l * l * s * c * td * td + P.mp * P.g * l * s;
    const det = m11 * Jpp - m12 * m12;
    out[0] = td; out[1] = ad;
    out[2] = (Jpp * r1 - m12 * r2) / det;
    out[3] = (m11 * r2 - m12 * r1) / det;
  }

  function create() {
    const S = {
      x: [0, Math.PI - 0.06, 0, 0],   // hanging, slightly off centre
      V: 0, on: true, mode: 'Swing-up', label: 'Swing-up', held: 0, E: 0, t: 0,
      mu: 30, umax: 6, Er: Er, kh: 40, kd: 2,   // swing-up gain, pivot accel limit (m/s²), arm centring
    };
    const k1 = [0, 0, 0, 0], k2 = [0, 0, 0, 0], k3 = [0, 0, 0, 0], k4 = [0, 0, 0, 0], tmp = [0, 0, 0, 0];
    const H = 0.001;

    function control() {
      const [th, a, td, ad] = S.x;
      const aw = wrap(a);
      S.E = 0.5 * Jpp * ad * ad + P.mp * P.g * l * (1 + Math.cos(aw));
      if (!S.on) { S.mode = 'Motor off'; return 0; }
      if (Math.abs(aw) <= EPS) {
        S.mode = 'Balance';
        return clamp(-(K[0] * wrap(th) + K[1] * aw + K[2] * td + K[3] * ad), P.Vmax);
      }
      S.mode = 'Swing-up';
      const sg = ad * Math.cos(aw) >= 0 ? 1 : -1;
      const u = clamp(S.mu * (S.Er - S.E) * sg, S.umax);   // pivot acceleration, m/s²
      // pivot acceleration → arm acceleration (with a soft pull back to centre) → motor voltage
      const thdd = u / P.Lr - S.kh * wrap(th) - S.kd * td;
      const s = Math.sin(aw), c = Math.cos(aw);
      const m11 = P.Jr + P.mp * P.Lr * P.Lr + P.mp * l * l * s * s, m12 = -P.mp * P.Lr * l * c;
      const r2 = -P.Dp * ad + P.mp * l * l * s * c * td * td + P.mp * P.g * l * s;
      const tau = m11 * thdd + m12 * (r2 - m12 * thdd) / Jpp + P.Dr * td
        + 2 * P.mp * l * l * s * c * td * ad + P.mp * P.Lr * l * s * ad * ad;
      return clamp(tau * P.Rm / (P.Kg * P.kt) + P.Kg * P.km * td, P.Vmax);
    }

    function step() {
      S.V = control();
      const x = S.x;
      deriv(x, S.V, k1);
      for (let i = 0; i < 4; i++) tmp[i] = x[i] + 0.5 * H * k1[i]; deriv(tmp, S.V, k2);
      for (let i = 0; i < 4; i++) tmp[i] = x[i] + 0.5 * H * k2[i]; deriv(tmp, S.V, k3);
      for (let i = 0; i < 4; i++) tmp[i] = x[i] + H * k3[i]; deriv(tmp, S.V, k4);
      for (let i = 0; i < 4; i++) x[i] += (H / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      S.t += H;
      // debounced mode for display: the switch can chatter for a few ms while catching
      if (S.mode === S.label) S.held = 0;
      else if ((S.held += H) > 0.35) { S.label = S.mode; S.held = 0; }
    }

    S.advance = function (dt) {
      const n = Math.min(80, Math.round(dt / H));
      for (let i = 0; i < n; i++) step();
    };
    S.nudge = function (dir, mag) { S.x[3] += dir * (mag || 1.6); };
    S.reset = function () { S.x = [0, Math.PI - 0.06, 0, 0]; S.V = 0; S.on = true; S.label = 'Swing-up'; };
    S.upright = function () { S.x = [0, 0, 0, 0]; S.V = 0; S.on = true; S.mode = S.label = 'Balance'; };
    S.alpha = () => wrap(S.x[1]);
    S.theta = () => S.x[0];
    return S;
  }

  const api = { create, P, K, EPS, Er };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RotPen = api;
})(typeof window !== 'undefined' ? window : globalThis);
