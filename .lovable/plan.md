

## Plan: Convert and Integrate Custom Audio Files into Contest UI

### Audio File Mapping

Based on the filenames and parenthetical descriptions, here's where each file belongs:

| File | Trigger Point |
|------|--------------|
| `prepare_before_contest.m4a` | When **warmup** phase begins (5s countdown) |
| `beging_start_contest.m4a` | When **live** phase starts (warmup ends) |
| `SIXTH_deposit_coin_deposit.m4a` | When a **tip** is sent (replaces current `playDepositSound()`) |
| `love_it_tips_votes_tank_fills.m4a` | When tips/votes tank **overflows** past 100 (the "LOVE" burst) |
| `authentic_sample_tank.m4a` | When a **fan enters** the sample tank (fan button clicked) |
| `hurry_get_out_and_vote_poll_submission_warning.m4a` | When the **poll warning** appears (≤60 seconds remaining, poll not submitted) |
| `overtime_time_s_up.m4a` | When **overtime** phase begins (live phase ends) |
| `and_still_champion_champion_wins.m4a` | When contest ends and **champion wins** (belt stays) |
| `and_the_new_champion_challenger_wins.m4a` | When contest ends and **challenger wins** (replaces SpeechSynthesis announcer) |

### Steps

1. **Convert all 9 M4A files to MP3** using ffmpeg in the sandbox.

2. **Copy MP3 files to `public/sounds/`** so they can be loaded via simple URL paths without bundler overhead (audio files are runtime-loaded, not imported as modules).

3. **Create `src/utils/contestSounds.ts`** — a utility module that:
   - Pre-creates `Audio` objects for each sound file
   - Exports named functions: `playPrepareSound()`, `playStartSound()`, `playCoinDeposit()`, `playLoveIt()`, `playSampleTank()`, `playPollWarning()`, `playOvertime()`, `playChampionWins()`, `playChallengerWins()`

4. **Update `ContestTestPage.tsx`**:
   - Import the new sound functions
   - Remove the `playDepositSound` import and the SpeechSynthesis block
   - Wire each sound to its trigger:
     - `handleStart` → `playPrepareSound()` at warmup, `playStartSound()` when live begins
     - `handleTip` → `playCoinDeposit()` (replaces `playDepositSound()`)
     - Tip/vote overflow detection → `playLoveIt()` (play once when crossing 100)
     - Fan button click → `playSampleTank()`
     - Poll warning appearance → `playPollWarning()` (play once)
     - Overtime transition → `playOvertime()`
     - End-of-contest effect → `playChampionWins()` or `playChallengerWins()` based on winner (removes SpeechSynthesis)

### Technical Notes

- Audio objects will be lazily created on first call to avoid browser autoplay restrictions.
- Each "play once" trigger (overflow, poll warning, overtime) will use a ref flag to prevent repeated firing.
- The existing `depositSound.ts` utility remains untouched (used elsewhere); only the contest page import changes.

