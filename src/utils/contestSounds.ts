// Contest audio announcements — lazily created to respect autoplay policies

const soundPaths = {
  prepare: '/sounds/prepare_before_contest.mp3',
  start: '/sounds/beging_start_contest.mp3',
  coinDeposit: '/sounds/SIXTH_deposit_coin_deposit.mp3',
  loveIt: '/sounds/love_it_tips_votes_tank_fills.mp3',
  sampleTank: '/sounds/authentic_sample_tank.mp3',
  pollWarning: '/sounds/hurry_get_out_and_vote_poll_submission_warning.mp3',
  overtime: '/sounds/overtime_time_s_up.mp3',
  championWins: '/sounds/and_still_champion_champion_wins.mp3',
  challengerWins: '/sounds/and_the_new_champion_challenger_wins.mp3',
  winnerContest: '/sounds/winner_a_challenger_wins_contest.mp3',
} as const;

const cache = new Map<string, HTMLAudioElement>();

const play = (key: keyof typeof soundPaths) => {
  try {
    let audio = cache.get(key);
    if (!audio) {
      audio = new Audio(soundPaths[key]);
      cache.set(key, audio);
    }
    // Reset to start if already playing
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (err) {
    console.warn('Contest sound error:', err);
  }
};

/**
 * Prime all contest audio elements during a user gesture so the browser
 * autoplay policy lets us play them later from effects/timers (critical on
 * desktop Chrome/Safari, where Audio.play() without a prior gesture is blocked).
 */
export const unlockContestSounds = async () => {
  const keys = Object.keys(soundPaths) as (keyof typeof soundPaths)[];
  await Promise.all(keys.map(async (key) => {
    try {
      let audio = cache.get(key);
      if (!audio) {
        audio = new Audio(soundPaths[key]);
        cache.set(key, audio);
      }
      audio.muted = true;
      audio.currentTime = 0;
      await audio.play().catch(() => {});
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    } catch {
      // ignore — best-effort unlock
    }
  }));
};

export const playPrepareSound = () => play('prepare');
export const playStartSound = () => play('start');
export const playCoinDeposit = () => play('coinDeposit');
export const playLoveIt = () => play('loveIt');
export const playSampleTank = () => play('sampleTank');
export const playPollWarning = () => play('pollWarning');
export const playOvertime = () => play('overtime');
export const playChampionWins = () => play('championWins');
export const playChallengerWins = () => play('challengerWins');
export const playWinnerContest = () => play('winnerContest');
