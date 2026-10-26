/**
 * 효과음 — 파일 없이 Web Audio 로 그 자리에서 만든다(뽁·딩동·짝).
 * 브라우저는 아이가 화면을 한 번 누른 뒤에야 소리를 내준다 — 첫 터치 때 깨운다.
 */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; at?: number; to?: number } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, freq: number, gain: number) {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = c.createBufferSource();
  src.buffer = buf;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(band).connect(g).connect(c.destination);
  src.start();
}

export const sfx = {
  /** 첫 터치 때 불러 소리를 깨운다 */
  wake() {
    ac();
  },
  pop() {
    tone(520, 0.09, { gain: 0.2, to: 900 });
    tone(1040, 0.07, { gain: 0.08, at: 0.04 });
  },
  ding() {
    tone(880, 0.16, { type: "triangle", gain: 0.16 });
    tone(1320, 0.26, { type: "triangle", gain: 0.13, at: 0.09 });
  },
  boop() {
    tone(320, 0.18, { gain: 0.14, to: 220 });
  },
  /** 딩동댕 — 맞았을 때 올라가는 실로폰 세 음 */
  dingdong() {
    [784, 988, 1175].forEach((f, i) => {
      tone(f, 0.34, { type: "triangle", gain: 0.16, at: i * 0.17 });
      tone(f * 2, 0.18, { gain: 0.04, at: i * 0.17 });
    });
  },
  /** 땡 — 틀렸을 때. 아이가 놀라지 않게 낮고 부드럽게 두 음 */
  ddaeng() {
    tone(330, 0.2, { type: "triangle", gain: 0.15, to: 300 });
    tone(247, 0.34, { type: "triangle", gain: 0.13, at: 0.19, to: 220 });
  },
  clap() {
    noise(0.09, 1800, 1.4);
  },
  tick() {
    tone(1200, 0.04, { gain: 0.06 });
  },
  /** 반짝 — 반짝이 펜이 지나갈 때 아주 작게 */
  sparkle() {
    tone(1900 + Math.random() * 900, 0.09, { type: "triangle", gain: 0.035 });
  },
  cheer() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: "triangle", gain: 0.13, at: i * 0.09 }));
  },
};
