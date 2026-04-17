// Coin/tip sound — uses the high-quality MP3 asset (replaces older synthesized "ching")
const SOUND_PATH = '/sounds/SIXTH_deposit_coin_deposit.mp3';

let audio: HTMLAudioElement | null = null;

const getAudio = () => {
  if (!audio) audio = new Audio(SOUND_PATH);
  return audio;
};

export const playCoinSound = () => {
  try {
    const a = getAudio();
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (err) {
    console.warn('Could not play coin sound:', err);
  }
};
