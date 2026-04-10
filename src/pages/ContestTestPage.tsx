import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import pieTitleBelt from "@/assets/pie-title-belt.png";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, Square, Video, Timer, Send } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { CONTEST_SCORING_FORMULA } from "@/constants/contestFormulas";
import { playDepositSound } from "@/utils/depositSound";

/** Fizzy bubble + criss-cross keyframes — injected once */
const bubbleStyleId = 'contest-bubble-styles';
if (typeof document !== 'undefined' && !document.getElementById(bubbleStyleId)) {
  const style = document.createElement('style');
  style.id = bubbleStyleId;
  style.textContent = `
    @keyframes bubble-rise {
      0% { transform: translateX(0) scale(1); opacity: 0.7; bottom: 0%; }
      25% { transform: translateX(1px) scale(1.1); opacity: 0.8; }
      50% { transform: translateX(-1px) scale(0.9); opacity: 0.6; }
      75% { transform: translateX(1px) scale(1.05); opacity: 0.4; }
      100% { transform: translateX(0) scale(0.8); opacity: 0; bottom: 100%; }
    }
    @keyframes badge-fly-right {
      0% { transform: translateX(0) scale(1); opacity: 1; }
      30% { transform: translateX(20%) scale(1.3); opacity: 1; }
      70% { transform: translateX(calc(50vw - 100%)) scale(1.4); opacity: 1; }
      100% { transform: translateX(calc(50vw - 100%)) scale(1); opacity: 1; }
    }
    @keyframes badge-fly-left {
      0% { transform: translateX(0) scale(1); opacity: 1; }
      30% { transform: translateX(-20%) scale(1.3); opacity: 1; }
      70% { transform: translateX(calc(-50vw + 100%)) scale(1.4); opacity: 1; }
      100% { transform: translateX(calc(-50vw + 100%)) scale(1); opacity: 1; }
    }
    @keyframes title-text-appear {
      0% { opacity: 0; transform: translateY(30px) scale(0.8); letter-spacing: 0.5em; }
      50% { opacity: 1; transform: translateY(0) scale(1.1); letter-spacing: 0.2em; }
      100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.15em; }
    }
  `;
  document.head.appendChild(style);
}

/** Fizzy bubbles inside a tank */
const TankBubbles = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const bubbles = [
    { size: 2, left: '20%', delay: '0s', duration: '1.2s' },
    { size: 3, left: '50%', delay: '0.3s', duration: '1s' },
    { size: 2, left: '70%', delay: '0.6s', duration: '1.4s' },
    { size: 1.5, left: '35%', delay: '0.15s', duration: '0.9s' },
    { size: 2.5, left: '60%', delay: '0.8s', duration: '1.1s' },
    { size: 1.5, left: '15%', delay: '0.45s', duration: '1.3s' },
  ];
  return (
    <>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/40"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            bottom: '0%',
            animation: `bubble-rise ${b.duration} ease-in-out ${b.delay} infinite`,
          }}
        />
      ))}
    </>
  );
};

/** Vertical tank gauge used for Tip / Skill / Sample meters */
const VerticalTank = ({
  label,
  value,
  color,
  bgColor,
  bubbles = false,
  fusion = false,
  glow = false,
}: {
  label: string;
  value: number; // 0-100
  color: string;
  bgColor: string;
  bubbles?: boolean;
  fusion?: boolean;
  glow?: boolean;
}) => {
  // Fusion: multi-color gradient that shifts as value increases
  const fusionStyle: React.CSSProperties = fusion
    ? {
        height: `${value}%`,
        background: value > 0
          ? `linear-gradient(0deg, #7c3aed ${0}%, #a855f7 ${Math.min(value, 40)}%, #f472b6 ${Math.min(value, 70)}%, #fbbf24 ${Math.min(value, 100)}%)`
          : undefined,
        boxShadow: value > 30
          ? `0 0 ${4 + value / 10}px rgba(168,85,247,0.6), inset 0 0 ${value / 8}px rgba(251,191,36,0.4)`
          : undefined,
        transition: 'all 0.7s ease',
      }
    : { height: `${value}%` };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-5 h-20 rounded-sm ${bgColor} relative overflow-hidden border border-white/10 transition-shadow duration-500 ${
          glow ? 'shadow-[0_0_10px_rgba(34,197,94,0.5),0_0_20px_rgba(34,197,94,0.2)]' : ''
        }`}
      >
        <div
          className={`absolute bottom-0 left-0 right-0 ${fusion ? '' : color} transition-all duration-700`}
          style={fusionStyle}
        >
          <TankBubbles active={bubbles && value > 0} />
          {/* Fusion shimmer overlay */}
          {fusion && value > 20 && (
            <div
              className="absolute inset-0 animate-pulse opacity-40"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              }}
            />
          )}
        </div>
      </div>
      <span className="text-[9px] text-white/70 font-medium leading-tight text-center whitespace-nowrap">
        {label}
      </span>
    </div>
  );
};

/** Get slider track gradient based on value relative to 50 */
const getSliderStyle = (value: number) => {
  const pct = value;
  if (value < 50) {
    // Blue on the left portion
    return {
      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
    };
  } else if (value > 50) {
    // Red on the right portion  
    return {
      background: `linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 50%, #ef4444 50%, #ef4444 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
    };
  }
  return { background: 'rgba(255,255,255,0.1)' };
};

/** Polling widget with 4 category sliders — feeds real-time vote power */
const PollWidget = ({ side, disabled, onVotePowerChange, onSubmittedChange }: { side: 'champion' | 'challenger'; disabled?: boolean; onVotePowerChange?: (power: number) => void; onSubmittedChange?: (submitted: boolean) => void }) => {
  const [values, setValues] = useState({ Outfit: 50, Makeup: 50, Personality: 50, Interaction: 50 });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (label: string, newVal: number) => {
    if (submitted) return;
    const next = { ...values, [label]: newVal };
    setValues(next);
    const totalDeviation = Object.values(next).reduce((sum, v) => sum + Math.abs(v - 50), 0);
    const maxDeviation = 4 * 50;
    const votePower = Math.round((totalDeviation / maxDeviation) * 100);
    onVotePowerChange?.(votePower);
  };

  const handleSubmit = () => {
    if (submitted || disabled) return;
    setSubmitted(true);
    onSubmittedChange?.(true);
  };

  const getValueColor = (val: number) => {
    if (val < 50) return 'text-blue-400';
    if (val > 50) return 'text-red-400';
    return 'text-white/60';
  };

  return (
    <div className={`bg-black/40 rounded-md p-2 w-[130px] space-y-1.5 ${submitted ? 'ring-1 ring-green-500/50' : ''}`}>
      {Object.entries(values).map(([label, val]) => (
        <div key={label} className="space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/60 font-semibold uppercase tracking-wider">{label}</span>
            <span className={`text-[9px] font-mono font-bold ${getValueColor(val)}`}>{val}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={val}
            disabled={disabled || submitted}
            onChange={(e) => handleChange(label, Number(e.target.value))}
            style={getSliderStyle(val)}
            className="w-full h-1.5 appearance-none rounded-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
          />
        </div>
      ))}
      {submitted ? (
        <div className="w-full h-5 flex items-center justify-center text-[9px] font-semibold uppercase tracking-wider text-green-400 mt-1">
          ✓ Submitted
        </div>
      ) : (
        <Button size="sm" disabled={disabled} onClick={handleSubmit} className="w-full h-5 text-[9px] font-semibold uppercase tracking-wider mt-1">
          Submit
        </Button>
      )}
    </div>
  );
};

/** Power flow horizontal bar */
const PowerFlowBar = ({ value }: { value: number }) => (
  <div className="space-y-1">
    <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Power Flow</span>
    <div className="w-full h-3 rounded-sm bg-white/10 overflow-hidden">
      <div
        className="h-full bg-red-500 transition-all duration-700 rounded-sm"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

/** Total points bar — hidden until contest ends, then revealed with penalty info */
const TotalPointsBar = ({ points, revealed, penalized }: { points: number; revealed: boolean; penalized?: boolean }) => (
  <div className="space-y-1">
    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Total Points</span>
    <div className="w-full h-4 rounded-sm bg-white/10 overflow-hidden relative">
      {revealed ? (
        <>
          <div
            className="h-full bg-amber-500 rounded-sm animate-[grow_1.5s_ease-out_forwards]"
            style={{ width: `${Math.min(points, 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white drop-shadow animate-[fadeIn_0.8s_ease-in_0.5s_both]">
            {points.toFixed(1)}
          </span>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white/30">
          ???
        </span>
      )}
    </div>
    {revealed && penalized && (
      <span className="text-[8px] text-red-400 font-semibold animate-[fadeIn_0.8s_ease-in_1s_both]">
        ⚠ -15 pts (poll not submitted)
      </span>
    )}
  </div>
);

const TOTAL_FANS = 27; // 27 fans per side

const ContestTestPage = () => {
  const navigate = useNavigate();

  // Contest phase: 'idle' | 'warmup' | 'live' | 'overtime' | 'ended'
  const [phase, setPhase] = useState<'idle' | 'warmup' | 'live' | 'overtime' | 'ended'>('idle');
  const OVERTIME_SECONDS = 60;
  const [overtimeTotal, setOvertimeTotal] = useState(OVERTIME_SECONDS);
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tip state
  const [championTips, setChampionTips] = useState(0);
  const [challengerTips, setChallengerTips] = useState(0);
  const [pollResetKey, setPollResetKey] = useState(0);

  // Real-time poll vote power (0-100) per side
  const [championVotePower, setChampionVotePower] = useState(0);
  const [challengerVotePower, setChallengerVotePower] = useState(0);

  // Poll submission tracking
  const [championPollSubmitted, setChampionPollSubmitted] = useState(false);
  const [challengerPollSubmitted, setChallengerPollSubmitted] = useState(false);

  // Belt animation state
  const [beltWinner, setBeltWinner] = useState<'champion' | 'challenger' | 'tie' | null>(null);

  // Criss-cross title change animation
  const [showTitleChange, setShowTitleChange] = useState(false);

  // Fan/sample state — tracks which fans have "entered" per side
  const [championFans, setChampionFans] = useState<Set<number>>(new Set());
  const [challengerFans, setChallengerFans] = useState<Set<number>>(new Set());

  const championSample = Math.round((championFans.size / TOTAL_FANS) * 100);
  const challengerSample = Math.round((challengerFans.size / TOTAL_FANS) * 100);

  // Skill decreases during overtime from 100% to 0% over the overtime period
  const skillValue = phase === 'overtime' ? Math.round((timeLeft / overtimeTotal) * 100) : 100;

  // Tips/Votes tank combines tips + vote power in real-time
  const championTipVotes = Math.min(championTips + championVotePower, 100);
  const challengerTipVotes = Math.min(challengerTips + challengerVotePower, 100);

  const isLiveOrOvertime = phase === 'live' || phase === 'overtime';
  const championPower = isLiveOrOvertime ? Math.round((championTipVotes + skillValue + championSample) / 3) : 0;
  const challengerPower = isLiveOrOvertime ? Math.round((challengerTipVotes + skillValue + challengerSample) / 3) : 0;

  // Poll penalty: unsubmitted polls deduct 15 points from that side's total
  const POLL_PENALTY = 15;

  // Calculate final points using the contest formula + poll penalty
  const championPointsRaw = CONTEST_SCORING_FORMULA.calculate({
    gifts: championTips,
    pollVotesWon: championVotePower,
    skillPercent: skillValue,
    sampleIntensity: championSample,
  });
  const challengerPointsRaw = CONTEST_SCORING_FORMULA.calculate({
    gifts: challengerTips,
    pollVotesWon: challengerVotePower,
    skillPercent: skillValue,
    sampleIntensity: challengerSample,
  });

  // Apply penalty only at reveal time (ended phase)
  const championPoints = phase === 'ended'
    ? Math.max(0, championPointsRaw - (championPollSubmitted ? 0 : POLL_PENALTY))
    : championPointsRaw;
  const challengerPoints = phase === 'ended'
    ? Math.max(0, challengerPointsRaw - (challengerPollSubmitted ? 0 : POLL_PENALTY))
    : challengerPointsRaw;

  const isRevealed = phase === 'ended';

  const championTanks = { tip: championTipVotes, skill: skillValue, sample: championSample, power: championPower, points: championPoints };
  const challengerTanks = { tip: challengerTipVotes, skill: skillValue, sample: challengerSample, power: challengerPower, points: challengerPoints };

  const handleTip = useCallback((side: 'champion' | 'challenger', amount: number) => {
    if (phase !== 'live' && phase !== 'overtime') return;
    playDepositSound();
    if (side === 'champion') {
      setChampionTips(prev => prev + amount);
    } else {
      setChallengerTips(prev => prev + amount);
    }
  }, [phase]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback((seconds: number, onComplete: () => void) => {
    clearTimer();
    setTimeLeft(seconds);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const handleStart = useCallback(() => {
    setBeltWinner(null);
    setPhase('warmup');
    startCountdown(5, () => {
      setPhase('live');
      startCountdown(105, () => {
        setPhase('overtime');
        setOvertimeTotal(OVERTIME_SECONDS);
        startCountdown(OVERTIME_SECONDS, () => {
          setPhase('ended');
        });
      });
    });
  }, [startCountdown, OVERTIME_SECONDS]);

  const handleStop = useCallback(() => {
    clearTimer();
    setPhase('ended');
  }, [clearTimer]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setTimeLeft(0);
    setChampionTips(0);
    setChallengerTips(0);
    setChampionVotePower(0);
    setChallengerVotePower(0);
    setPollResetKey(prev => prev + 1);
    setChampionFans(new Set());
    setChallengerFans(new Set());
    setChampionPollSubmitted(false);
    setChallengerPollSubmitted(false);
    setShowTitleChange(false);
    setBeltWinner(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Trigger belt animation + title change ceremony when contest ends
  useEffect(() => {
    if (phase === 'ended') {
      const timeout = setTimeout(() => {
        if (championPoints > challengerPoints) {
          setBeltWinner('champion');
        } else if (challengerPoints > championPoints) {
          setBeltWinner('challenger');
          // Challenger wins = belt changes hands → criss-cross + announcer
          setTimeout(() => {
            setShowTitleChange(true);
            // Announcer voice via SpeechSynthesis
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance('AND THE NEW... CHAMPION!');
              utterance.rate = 0.8;
              utterance.pitch = 0.7;
              utterance.volume = 1;
              // Pick a deep male voice if available
              const voices = speechSynthesis.getVoices();
              const deep = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) || voices.find(v => v.lang.startsWith('en'));
              if (deep) utterance.voice = deep;
              speechSynthesis.speak(utterance);
            }
            // Auto-hide after 5 seconds
            setTimeout(() => setShowTitleChange(false), 5000);
          }, 1500);
        } else {
          setBeltWinner('tie');
        }
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [phase, championPoints, challengerPoints]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerLabel = phase === 'warmup' ? 'WARMUP' : phase === 'live' ? 'LIVE' : phase === 'overtime' ? 'OVERTIME' : phase === 'ended' ? 'ENDED' : 'READY';
  const timerBorderColor = phase === 'warmup' ? 'border-yellow-500/50' : phase === 'overtime' ? 'border-orange-500/50' : phase === 'live' ? 'border-red-600/50' : 'border-white/20';
  const timerIconColor = phase === 'warmup' ? 'text-yellow-500' : phase === 'overtime' ? 'text-orange-500' : phase === 'live' ? 'text-red-500' : 'text-white/40';
  const isActive = phase === 'live' || phase === 'overtime';
  const showPollWarning = phase === 'live' && timeLeft > 0 && timeLeft <= 60;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Floating timer */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50">
        <div className={`bg-black/80 border ${timerBorderColor} rounded-full px-6 py-2 flex items-center gap-2`}>
          <Timer className={`w-4 h-4 ${timerIconColor}`} />
          <div className="flex flex-col items-center">
            {phase !== 'idle' && (
              <span className={`text-[8px] font-bold uppercase tracking-widest ${phase === 'warmup' ? 'text-yellow-400' : phase === 'overtime' ? 'text-orange-400 animate-pulse' : phase === 'live' ? 'text-red-400' : 'text-white/50'}`}>
                {timerLabel}
              </span>
            )}
            <span className="text-white font-mono text-lg font-bold">
              {phase === 'idle' ? '00:00' : formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Poll submission warning — flashes at 1 minute remaining */}
      {showPollWarning && (
        <div className="absolute top-[100px] left-1/2 -translate-x-1/2 z-[60] animate-pulse">
          <div className="bg-yellow-500/90 text-black font-bold text-sm px-6 py-2 rounded-full shadow-lg shadow-yellow-500/30">
            ⚠️ Submit your polls! {formatTime(timeLeft)} remaining
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="absolute top-28 left-4 z-50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white bg-black/50 hover:bg-black/70 text-xs px-2 py-1">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back
        </Button>
      </div>

      {/* Challenge label — top center */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
        <span className="text-2xl sm:text-3xl font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide pointer-events-none">
          Twerk Off
        </span>
      </div>

      {/* Start/Stop button — far right of challenger side */}
      <div className="absolute top-28 right-4 z-50">
        {phase === 'idle' ? (
          <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 h-9 text-xs rounded-full gap-2">
            <Play className="w-4 h-4" /> Start Contest
          </Button>
        ) : phase === 'ended' ? (
          <Button onClick={handleReset} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 h-9 text-xs rounded-full gap-2">
            Reset
          </Button>
        ) : (
          <Button onClick={handleStop} variant="destructive" className="font-bold px-6 h-9 text-xs rounded-full gap-2">
            <Square className="w-4 h-4" /> Stop Contest
          </Button>
        )}
      </div>

      {/* Championship belt — centered, flies to winner on end */}
      <div
        className={`absolute z-[70] pointer-events-none transition-all duration-[1.5s] ease-in-out ${
          beltWinner === 'champion'
            ? 'bottom-1/2 left-[25%] -translate-x-1/2 scale-150'
            : beltWinner === 'challenger'
            ? 'bottom-1/2 right-[25%] translate-x-1/2 left-auto scale-150'
            : 'bottom-44 left-1/2 -translate-x-1/2 scale-100'
        }`}
      >
        <img
          src={pieTitleBelt}
          className={`w-16 h-16 object-contain drop-shadow-lg ${beltWinner ? 'drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]' : ''}`}
          alt="Championship Belt"
        />
        {beltWinner && beltWinner !== 'tie' && (
          <div className="text-center mt-1 animate-[fadeIn_0.8s_ease-in_1s_both]">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider drop-shadow">Winner!</span>
          </div>
        )}
      </div>

      {/* Title change announcer overlay — text only, badges animate in-place */}
      {showTitleChange && (
        <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 animate-[fadeIn_0.3s_ease-out_both]" />
          <div className="relative text-center" style={{ animation: 'title-text-appear 1.2s ease-out 0.3s both' }}>
            <p className="text-amber-400/80 text-lg font-bold uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
              And The New...
            </p>
            <p className="text-white text-4xl sm:text-5xl font-black uppercase tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              CHAMPION
            </p>
            <img src={pieTitleBelt} className="w-20 h-20 object-contain mx-auto mt-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-pulse" alt="Belt" />
          </div>
        </div>
      )}
      <div className="flex flex-col lg:flex-row h-screen">
        {/* ─── Champion side ─── */}
        <div className="flex-1 flex flex-col border-r border-border/30">
          <div className="flex-1 bg-gradient-to-br from-blue-950 to-blue-900 relative flex items-center justify-center">
            {/* Video placeholder */}
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full bg-blue-800/60 border-2 border-blue-400/40 mx-auto flex items-center justify-center">
                <Video className="w-8 h-8 text-blue-300/60" />
              </div>
              <p className="text-blue-300/80 font-semibold text-sm">Champion</p>
              <p className="text-blue-400/50 text-xs">@champion_user</p>
            </div>

            {/* Champion badge — top right, flies RIGHT to challenger side on title change */}
            <div className={`absolute top-4 right-4 z-[80] ${showTitleChange ? 'animate-[badge-fly-right_1.5s_ease-in-out_forwards]' : ''}`}>
              <span className={`bg-yellow-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1 ${showTitleChange ? 'shadow-[0_0_20px_rgba(234,179,8,0.6)]' : ''}`}>
                <img src={pieTitleBelt} className="h-6 w-8 object-contain" alt="Belt" />
                Champion
              </span>
            </div>

            {/* Champion coin meter — top left */}
            <div className="absolute top-4 left-4 z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 min-w-[120px]">
                <img src={sixthCoinLogo} className="w-4 h-4 rounded-full flex-shrink-0" alt="SIXTH" />
                <Progress value={championTanks.tip} className="h-2 flex-1 bg-white/10 [&>div]:bg-amber-500" />
                <span className="text-amber-400 text-xs font-mono font-medium whitespace-nowrap">{championTanks.tip}</span>
              </div>
            </div>

            {/* Three vertical tanks — left edge */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
              <VerticalTank label="Tips/Votes" value={championTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles />
              <VerticalTank label="Skill" value={championTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
              <VerticalTank label="Sample" value={championTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
            </div>

            {/* Power flow bar — top area below badge row */}
            <div className="absolute top-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <PowerFlowBar value={championTanks.power} />
            </div>

            {/* Total points bar — bottom area above tip button */}
            <div className="absolute bottom-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <TotalPointsBar points={championTanks.points} revealed={isRevealed} penalized={isRevealed && !championPollSubmitted} />
            </div>

            {/* Champion poll widget — bottom left */}
            <div className="absolute bottom-4 left-3 z-10">
              <PollWidget key={`champ-${pollResetKey}`} side="champion" disabled={!isActive} onVotePowerChange={setChampionVotePower} onSubmittedChange={setChampionPollSubmitted} />
            </div>

            {/* Champion tip button — bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!isActive} className="border-amber-600/50 text-amber-400 hover:bg-amber-900/20 text-xs h-7 disabled:opacity-40">
                    <img src={sixthCoinLogo} className="w-3 h-3 rounded-full mr-1" alt="SIXTH" />
                    Tip
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="center">
                  <p className="text-xs text-muted-foreground mb-2 px-1">Send SIXTH tokens</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 5, 10, 25].map((amt) => (
                      <Button key={amt} size="sm" variant="outline" className="text-amber-400 border-amber-600/30 hover:bg-amber-900/20" onClick={() => handleTip('champion', amt)}>
                        <img src={sixthCoinLogo} className="w-3 h-3 rounded-full mr-1" alt="" />
                        {amt}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Champion supporters + chat */}
          <Card className={`rounded-none border-x-0 border-b-0 bg-card/80 backdrop-blur-sm transition-all duration-500 ${isActive ? 'opacity-100 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'opacity-40'}`}>
            <CardContent className="p-2 space-y-2">
              {/* Fan grid */}
              <p className="text-[10px] font-bold text-foreground">Supporters ({championFans.size}/{TOTAL_FANS})</p>
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: TOTAL_FANS }, (_, i) => {
                  const fanNum = i + 1;
                  const entered = championFans.has(fanNum);
                  return (
                    <div key={fanNum} className="flex items-center gap-0.5">
                      <button
                        disabled={!isActive}
                        onClick={() => {
                          setChampionFans(prev => {
                            const next = new Set(prev);
                            if (next.has(fanNum)) next.delete(fanNum);
                            else next.add(fanNum);
                            return next;
                          });
                        }}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 transition-colors border disabled:cursor-not-allowed ${entered ? 'bg-green-500 border-green-400 text-white shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-muted border-border text-foreground hover:bg-accent hover:border-accent'}`}
                      >
                        +
                      </button>
                      <span className={`text-[8px] font-semibold truncate ${entered ? 'text-blue-400' : 'text-muted-foreground'}`}>
                        F{fanNum}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Chat */}
              <div className="border-t border-border/50 pt-2">
                <p className="text-[10px] font-bold text-foreground mb-1">Champion Chat</p>
                <div className="h-16 overflow-y-auto space-y-1 text-xs">
                  {/* Live messages will appear here */}
                </div>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Type a message..." className="text-xs h-7" disabled={!isActive} />
                  <Button size="sm" className="h-7 px-2" disabled={!isActive}><Send className="w-3 h-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Challenger side ─── */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-gradient-to-br from-red-950 to-red-900 relative flex items-center justify-center">
            {/* Video placeholder */}
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full bg-red-800/60 border-2 border-red-400/40 mx-auto flex items-center justify-center">
                <Video className="w-8 h-8 text-red-300/60" />
              </div>
              <p className="text-red-300/80 font-semibold text-sm">Challenger</p>
              <p className="text-red-400/50 text-xs">@challenger_user</p>
            </div>

            {/* Challenger badge — top right, flies LEFT to champion side on title change */}
            <div className={`absolute top-4 right-4 z-[80] ${showTitleChange ? 'animate-[badge-fly-left_1.5s_ease-in-out_forwards]' : ''}`}>
              <span className={`bg-red-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1 ${showTitleChange ? 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' : ''}`}>
                Challenger
              </span>
            </div>

            {/* Challenger coin meter — top left */}
            <div className="absolute top-4 left-4 z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 min-w-[120px]">
                <img src={sixthCoinLogo} className="w-4 h-4 rounded-full flex-shrink-0" alt="SIXTH" />
                <Progress value={challengerTanks.tip} className="h-2 flex-1 bg-white/10 [&>div]:bg-amber-500" />
                <span className="text-amber-400 text-xs font-mono font-medium whitespace-nowrap">{challengerTanks.tip}</span>
              </div>
            </div>

            {/* Three vertical tanks — left edge */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
              <VerticalTank label="Tips/Votes" value={challengerTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles />
              <VerticalTank label="Skill" value={challengerTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
              <VerticalTank label="Sample" value={challengerTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
            </div>

            {/* Power flow bar — top area */}
            <div className="absolute top-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <PowerFlowBar value={challengerTanks.power} />
            </div>

            {/* Total points bar — bottom area */}
            <div className="absolute bottom-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <TotalPointsBar points={challengerTanks.points} revealed={isRevealed} penalized={isRevealed && !challengerPollSubmitted} />
            </div>

            {/* Challenger poll widget — bottom left */}
            <div className="absolute bottom-4 left-3 z-10">
              <PollWidget key={`chal-${pollResetKey}`} side="challenger" disabled={!isActive} onVotePowerChange={setChallengerVotePower} onSubmittedChange={setChallengerPollSubmitted} />
            </div>

            {/* Challenger tip button — bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!isActive} className="border-amber-600/50 text-amber-400 hover:bg-amber-900/20 text-xs h-7 disabled:opacity-40">
                    <img src={sixthCoinLogo} className="w-3 h-3 rounded-full mr-1" alt="SIXTH" />
                    Tip
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="center">
                  <p className="text-xs text-muted-foreground mb-2 px-1">Send SIXTH tokens</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 5, 10, 25].map((amt) => (
                      <Button key={amt} size="sm" variant="outline" className="text-amber-400 border-amber-600/30 hover:bg-amber-900/20" onClick={() => handleTip('challenger', amt)}>
                        <img src={sixthCoinLogo} className="w-3 h-3 rounded-full mr-1" alt="" />
                        {amt}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Challenger supporters + chat */}
          <Card className={`rounded-none border-x-0 border-b-0 bg-card/80 backdrop-blur-sm transition-all duration-500 ${isActive ? 'opacity-100 shadow-[0_0_12px_rgba(34,197,94,0.3)]' : 'opacity-40'}`}>
            <CardContent className="p-2 space-y-2">
              <p className="text-[10px] font-bold text-foreground">Supporters ({challengerFans.size}/{TOTAL_FANS})</p>
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: TOTAL_FANS }, (_, i) => {
                  const fanNum = i + 1;
                  const entered = challengerFans.has(fanNum);
                  return (
                    <div key={fanNum} className="flex items-center gap-0.5">
                      <button
                        disabled={!isActive}
                        onClick={() => {
                          setChallengerFans(prev => {
                            const next = new Set(prev);
                            if (next.has(fanNum)) next.delete(fanNum);
                            else next.add(fanNum);
                            return next;
                          });
                        }}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 transition-colors border disabled:cursor-not-allowed ${entered ? 'bg-green-500 border-green-400 text-white shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-muted border-border text-foreground hover:bg-accent hover:border-accent'}`}
                      >
                        +
                      </button>
                      <span className={`text-[8px] font-semibold truncate ${entered ? 'text-red-400' : 'text-muted-foreground'}`}>
                        F{fanNum}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border/50 pt-2">
                <p className="text-[10px] font-bold text-foreground mb-1">Challenger Chat</p>
                <div className="h-16 overflow-y-auto space-y-1 text-xs">
                </div>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Type a message..." className="text-xs h-7" disabled={!isActive} />
                  <Button size="sm" className="h-7 px-2" disabled={!isActive}><Send className="w-3 h-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContestTestPage;
