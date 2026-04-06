// Synthesized "ching ching" coin sound using Web Audio API
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

export const playCoinSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First "ching"
    playChing(ctx, now);
    // Second "ching" slightly delayed
    playChing(ctx, now + 0.12);
  } catch (err) {
    console.warn("Could not play coin sound:", err);
  }
};

const playChing = (ctx: AudioContext, startTime: number) => {
  // High metallic tone
  const osc1 = ctx.createOscillator();
  osc1.type = "square";
  osc1.frequency.setValueAtTime(2500, startTime);
  osc1.frequency.exponentialRampToValueAtTime(4000, startTime + 0.05);
  osc1.frequency.exponentialRampToValueAtTime(3000, startTime + 0.15);

  // Shimmer overtone
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(5000, startTime);
  osc2.frequency.exponentialRampToValueAtTime(6000, startTime + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(4500, startTime + 0.15);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(startTime);
  osc1.stop(startTime + 0.25);
  osc2.start(startTime);
  osc2.stop(startTime + 0.25);
};
