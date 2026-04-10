// Synthesized "money deposit" sound using Web Audio API
// Simulates coins dropping into a register with a satisfying metallic cascade

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

export const playDepositSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Low thud — the "drop" into the register
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(180, now);
    thud.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.4, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    thud.connect(thudGain).connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.2);

    // Coin settle — short metallic ring
    const settle = ctx.createOscillator();
    settle.type = 'triangle';
    settle.frequency.setValueAtTime(1200, now + 0.05);
    settle.frequency.exponentialRampToValueAtTime(800, now + 0.25);
    const settleGain = ctx.createGain();
    settleGain.gain.setValueAtTime(0.25, now + 0.05);
    settleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    settle.connect(settleGain).connect(ctx.destination);
    settle.start(now + 0.05);
    settle.stop(now + 0.35);

    // Second coin clink — slight delay for cascade feel
    const clink = ctx.createOscillator();
    clink.type = 'triangle';
    clink.frequency.setValueAtTime(1600, now + 0.12);
    clink.frequency.exponentialRampToValueAtTime(1100, now + 0.3);
    const clinkGain = ctx.createGain();
    clinkGain.gain.setValueAtTime(0.18, now + 0.12);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    clink.connect(clinkGain).connect(ctx.destination);
    clink.start(now + 0.12);
    clink.stop(now + 0.4);

    // Register "ka-ching" — high shimmer
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(3200, now + 0.18);
    shimmer.frequency.exponentialRampToValueAtTime(2400, now + 0.5);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.12, now + 0.18);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    shimmer.connect(shimmerGain).connect(ctx.destination);
    shimmer.start(now + 0.18);
    shimmer.stop(now + 0.55);
  } catch (err) {
    console.warn('Could not play deposit sound:', err);
  }
};
