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
import { CONTEST_SCORING_FORMULA, SAMPLE_RATIO_FORMULA } from "@/constants/contestFormulas";
import {
  playPrepareSound,
  playStartSound,
  playCoinDeposit,
  playLoveIt,
  playSampleTank,
  playPollWarning,
  playOvertime,
  playChampionWins,
  playChallengerWins,
  playWinnerContest,
} from "@/utils/contestSounds";

import {
  VerticalTank,
  PollWidget,
  PowerFlowBar,
  TotalPointsBar,
  CoinMeter,
} from "@/components/contest/ContestOverlays";

const TOTAL_FANS = 27;

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
  const [badgesSwapped, setBadgesSwapped] = useState(false);

  // Fan/sample state — tracks which fans have "entered" per side
  const [championFans, setChampionFans] = useState<Set<number>>(new Set());
  const [challengerFans, setChallengerFans] = useState<Set<number>>(new Set());

  // Viewer counts per side (simulated — in production these come from LiveKit participant counts)
  const [championViewers, setChampionViewers] = useState(100);
  const [challengerViewers, setChallengerViewers] = useState(100);

  // Sample intensity uses the ratio formula with log dampening
  const championSample = SAMPLE_RATIO_FORMULA.calculate({ voters: championFans.size, viewers: championViewers });
  const challengerSample = SAMPLE_RATIO_FORMULA.calculate({ voters: challengerFans.size, viewers: challengerViewers });

  // Skill decreases during overtime from 100% to 0% over the overtime period
  const skillValue = phase === 'overtime' ? Math.round((timeLeft / overtimeTotal) * 100) : 100;

  // Tips/Votes tank combines tips + vote power — uncapped for scoring, visually capped at 100
  const championTipVotesRaw = championTips + championVotePower;
  const challengerTipVotesRaw = challengerTips + challengerVotePower;
  const championTipVotes = Math.min(championTipVotesRaw, 100);
  const challengerTipVotes = Math.min(challengerTipVotesRaw, 100);

  const isLiveOrOvertime = phase === 'live' || phase === 'overtime';
  // Power uses uncapped tipVotes so overflow still contributes
  const championPower = isLiveOrOvertime ? Math.round((championTipVotesRaw + skillValue + championSample) / 3) : 0;
  const challengerPower = isLiveOrOvertime ? Math.round((challengerTipVotesRaw + skillValue + challengerSample) / 3) : 0;

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

  const championTanks = { tip: championTipVotes, tipRaw: championTipVotesRaw, skill: skillValue, sample: championSample, power: championPower, points: championPoints };
  const challengerTanks = { tip: challengerTipVotes, tipRaw: challengerTipVotesRaw, skill: skillValue, sample: challengerSample, power: challengerPower, points: challengerPoints };

  const handleTip = useCallback((side: 'champion' | 'challenger', amount: number) => {
    if (phase !== 'live' && phase !== 'overtime') return;
    playCoinDeposit();
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
    playPrepareSound();
    startCountdown(5, () => {
      setPhase('live');
      playStartSound();
      startCountdown(105, () => {
        setPhase('overtime');
        playOvertime();
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
    setChampionViewers(100);
    setChallengerViewers(100);
    setChampionPollSubmitted(false);
    setChallengerPollSubmitted(false);
    setShowTitleChange(false);
    setBadgesSwapped(false);
    setBeltWinner(null);
  }, []);

  /** Underdog Scenario: auto-sets viewers, fans, and tips so the challenger
   *  (fewer viewers but high engagement) beats the champion (many viewers,
   *  low engagement). Then starts the contest — just submit polls & stop. */
  const handleUnderdogScenario = useCallback(() => {
    // Reset first
    setPhase('idle');
    setTimeLeft(0);
    setPollResetKey(prev => prev + 1);
    setChampionPollSubmitted(false);
    setChallengerPollSubmitted(false);
    setShowTitleChange(false);
    setBadgesSwapped(false);
    setBeltWinner(null);

    // Champion: 500 viewers, only 3 fans voted — low engagement
    setChampionViewers(500);
    const champFans = new Set<number>([1, 2, 3]);
    setChampionFans(champFans);
    setChampionTips(15);

    // Challenger: 50 viewers, 22 fans voted — high engagement (underdog)
    setChallengerViewers(50);
    const chalFans = new Set<number>(Array.from({ length: 22 }, (_, i) => i + 1));
    setChallengerFans(chalFans);
    setChallengerTips(10);

    // Set vote power to simulate submitted polls with strong opinions
    setChampionVotePower(20);  // weak poll engagement
    setChallengerVotePower(75); // strong poll engagement

    // Start the contest after a tick so state settles
    setTimeout(() => {
      setBeltWinner(null);
      setPhase('warmup');
      playPrepareSound();
      startCountdown(5, () => {
        setPhase('live');
        playStartSound();
        startCountdown(105, () => {
          setPhase('overtime');
          playOvertime();
          setOvertimeTotal(OVERTIME_SECONDS);
          startCountdown(OVERTIME_SECONDS, () => {
            setPhase('ended');
          });
        });
      });
    }, 100);
  }, [startCountdown, OVERTIME_SECONDS]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Trigger belt animation + title change ceremony when contest ends
  // One-time sound refs
  const loveChampionPlayedRef = useRef(false);
  const loveChallengerPlayedRef = useRef(false);
  const pollWarningPlayedRef = useRef(false);
  const sampleFullChampionRef = useRef(false);
  const sampleFullChallengerRef = useRef(false);

  // Reset one-time refs when contest resets
  useEffect(() => {
    if (phase === 'idle') {
      loveChampionPlayedRef.current = false;
      loveChallengerPlayedRef.current = false;
      pollWarningPlayedRef.current = false;
      sampleFullChampionRef.current = false;
      sampleFullChallengerRef.current = false;
    }
  }, [phase]);

  // Play "LOVE" sound when tip/vote tank overflows past 100
  useEffect(() => {
    if (championTipVotesRaw > 100 && !loveChampionPlayedRef.current) {
      loveChampionPlayedRef.current = true;
      playLoveIt();
    }
  }, [championTipVotesRaw]);

  useEffect(() => {
    if (challengerTipVotesRaw > 100 && !loveChallengerPlayedRef.current) {
      loveChallengerPlayedRef.current = true;
      playLoveIt();
    }
  }, [challengerTipVotesRaw]);

  const showPollWarning = phase === 'live' && timeLeft > 0 && timeLeft <= 60;

  // Play poll warning sound once when ≤60s remaining
  useEffect(() => {
    if (showPollWarning && !pollWarningPlayedRef.current) {
      pollWarningPlayedRef.current = true;
      playPollWarning();
    }
  }, [showPollWarning]);

  // Play sample tank sound when sample meter reaches 100
  useEffect(() => {
    if (championSample >= 100 && !sampleFullChampionRef.current) {
      sampleFullChampionRef.current = true;
      playSampleTank();
    }
  }, [championSample]);

  useEffect(() => {
    if (challengerSample >= 100 && !sampleFullChallengerRef.current) {
      sampleFullChallengerRef.current = true;
      playSampleTank();
    }
  }, [challengerSample]);

  useEffect(() => {
    if (phase === 'ended') {
      const timeout = setTimeout(() => {
        if (championPoints > challengerPoints) {
          setBeltWinner('champion');
          playChampionWins();
        } else if (challengerPoints > championPoints) {
          setBeltWinner('challenger');
          playChallengerWins();
          // Challenger wins = belt changes hands → criss-cross + announcer
          setTimeout(() => {
            setShowTitleChange(true);
            // Keep badges swapped, just hide the overlay
            setTimeout(() => {
              setBadgesSwapped(true);
              setShowTitleChange(false);
            }, 5000);
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
  // showPollWarning moved above (before the useEffect that needs it)

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

      {/* Start/Stop/Scenario buttons — far right */}
      <div className="absolute top-28 right-4 z-50 flex gap-2">
        {phase === 'idle' && (
          <Button onClick={handleUnderdogScenario} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 h-9 text-xs rounded-full gap-1">
            🐕 Underdog Scenario
          </Button>
        )}
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
            <div className={`absolute top-4 right-4 z-[80] ${showTitleChange ? 'animate-[badge-fly-right_1.5s_ease-in-out_forwards]' : ''}`}
              style={badgesSwapped ? { transform: 'translateX(50vw)' } : undefined}>
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
            <div className="absolute left-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3">
              <VerticalTank label="Tips/Votes" value={championTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={championTanks.tipRaw > 100} />
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
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-foreground">Supporters ({championFans.size}/{championViewers} viewers)</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setChampionViewers(v => Math.max(1, v - 50))} className="text-[8px] bg-muted px-1 rounded">-50</button>
                  <span className="text-[8px] text-muted-foreground">{championViewers}</span>
                  <button onClick={() => setChampionViewers(v => v + 50)} className="text-[8px] bg-muted px-1 rounded">+50</button>
                </div>
              </div>
              <p className="text-[8px] text-muted-foreground">Sample: {championSample}% (ratio × log dampening)</p>
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
            <div className={`absolute top-4 right-4 z-[80] ${showTitleChange ? 'animate-[badge-fly-left_1.5s_ease-in-out_forwards]' : ''}`}
              style={badgesSwapped ? { transform: 'translateX(-50vw)' } : undefined}>
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
            <div className="absolute left-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3">
              <VerticalTank label="Tips/Votes" value={challengerTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={challengerTanks.tipRaw > 100} />
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
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-foreground">Supporters ({challengerFans.size}/{challengerViewers} viewers)</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setChallengerViewers(v => Math.max(1, v - 50))} className="text-[8px] bg-muted px-1 rounded">-50</button>
                  <span className="text-[8px] text-muted-foreground">{challengerViewers}</span>
                  <button onClick={() => setChallengerViewers(v => v + 50)} className="text-[8px] bg-muted px-1 rounded">+50</button>
                </div>
              </div>
              <p className="text-[8px] text-muted-foreground">Sample: {challengerSample}% (ratio × log dampening)</p>
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
