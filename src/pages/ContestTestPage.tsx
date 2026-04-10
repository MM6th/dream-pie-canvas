import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import pieTitleBelt from "@/assets/pie-title-belt.png";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Play, Square, Video, Send, Timer } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { playDepositSound } from "@/utils/depositSound";

/** Vertical tank gauge used for Tip / Skill / Sample meters */
const VerticalTank = ({
  label,
  value,
  color,
  bgColor,
}: {
  label: string;
  value: number; // 0-100
  color: string;
  bgColor: string;
}) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className={`w-5 h-20 rounded-sm ${bgColor} relative overflow-hidden border border-white/10`}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 ${color} transition-all duration-700`}
        style={{ height: `${value}%` }}
      />
    </div>
    <span className="text-[9px] text-white/70 font-medium leading-tight text-center whitespace-nowrap">
      {label}
    </span>
  </div>
);

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

/** Polling widget with 4 category sliders */
const PollWidget = ({ side, disabled }: { side: 'champion' | 'challenger'; disabled?: boolean }) => {
  const [values, setValues] = useState({ Outfit: 50, Makeup: 50, Personality: 50, Interaction: 50 });

  const handleChange = (label: string, newVal: number) => {
    setValues(prev => ({ ...prev, [label]: newVal }));
  };

  const getValueColor = (val: number) => {
    if (val < 50) return 'text-blue-400';
    if (val > 50) return 'text-red-400';
    return 'text-white/60';
  };

  return (
    <div className="bg-black/40 rounded-md p-2 w-[130px] space-y-1.5">
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
            disabled={disabled}
            onChange={(e) => handleChange(label, Number(e.target.value))}
            style={getSliderStyle(val)}
            className="w-full h-1.5 appearance-none rounded-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
          />
        </div>
      ))}
      <Button size="sm" disabled={disabled} className="w-full h-5 text-[9px] font-semibold uppercase tracking-wider mt-1">
        Submit
      </Button>
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

/** Total points bar */
const TotalPointsBar = ({ points }: { points: number }) => (
  <div className="space-y-1">
    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Total Points</span>
    <div className="w-full h-4 rounded-sm bg-white/10 overflow-hidden relative">
      <div
        className="h-full bg-amber-500 transition-all duration-700 rounded-sm"
        style={{ width: `${Math.min(points, 100)}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white drop-shadow">
        {points}
      </span>
    </div>
  </div>
);

const ContestTestPage = () => {
  const navigate = useNavigate();

  // Contest phase: 'idle' | 'warmup' | 'live' | 'ended'
  const [phase, setPhase] = useState<'idle' | 'warmup' | 'live' | 'ended'>('idle');
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tip state
  const [championTips, setChampionTips] = useState(0);
  const [challengerTips, setChallengerTips] = useState(0);

  const championTanks = { tip: championTips, skill: 100, sample: 0, power: 0, points: 0 };
  const challengerTanks = { tip: challengerTips, skill: 100, sample: 0, power: 0, points: 0 };

  const handleTip = useCallback((side: 'champion' | 'challenger', amount: number) => {
    if (phase !== 'live') return;
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
    setPhase('warmup');
    // 5-second warmup for testing
    startCountdown(5, () => {
      setPhase('live');
      // 5:00 contest timer
      startCountdown(300, () => {
        setPhase('ended');
      });
    });
  }, [startCountdown]);

  const handleStop = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setTimeLeft(0);
    setChampionTips(0);
    setChallengerTips(0);
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerLabel = phase === 'warmup' ? 'WARMUP' : phase === 'live' ? 'LIVE' : phase === 'ended' ? 'ENDED' : 'READY';
  const timerBorderColor = phase === 'warmup' ? 'border-yellow-500/50' : phase === 'live' ? 'border-red-600/50' : 'border-white/20';
  const timerIconColor = phase === 'warmup' ? 'text-yellow-500' : phase === 'live' ? 'text-red-500' : 'text-white/40';
  const isActive = phase === 'live';

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Floating timer */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50">
        <div className={`bg-black/80 border ${timerBorderColor} rounded-full px-6 py-2 flex items-center gap-2`}>
          <Timer className={`w-4 h-4 ${timerIconColor}`} />
          <div className="flex flex-col items-center">
            {phase !== 'idle' && (
              <span className={`text-[8px] font-bold uppercase tracking-widest ${phase === 'warmup' ? 'text-yellow-400' : phase === 'live' ? 'text-red-400' : 'text-white/50'}`}>
                {timerLabel}
              </span>
            )}
            <span className="text-white font-mono text-lg font-bold">
              {phase === 'idle' ? '00:00' : formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="absolute top-28 left-4 z-50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-white bg-black/50 hover:bg-black/70 text-xs px-2 py-1">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back
        </Button>
      </div>

      {/* Challenge label overlay */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <span className="text-2xl sm:text-3xl font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide">
          Twerk Off
        </span>
      </div>

      {/* Championship belt — centered between both sides */}
      <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <img src={pieTitleBelt} className="w-16 h-16 object-contain drop-shadow-lg" alt="Championship Belt" />
      </div>

      {/* Formula overlay — bottom center above controls */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="bg-black/70 rounded-lg px-4 py-1.5">
          <p className="text-[9px] text-white/60 font-mono text-center">
            gifts + poll votes won × skill % × sample intensity = final points
          </p>
        </div>
      </div>

      {/* Split screen layout */}
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

            {/* Champion badge — top right */}
            <div className="absolute top-4 right-4 z-10">
              <span className="bg-yellow-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
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
              <VerticalTank label="Tip" value={championTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" />
              <VerticalTank label="Skill" value={championTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" />
              <VerticalTank label="Sample" value={championTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" />
            </div>

            {/* Power flow bar — top area below badge row */}
            <div className="absolute top-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <PowerFlowBar value={championTanks.power} />
            </div>

            {/* Total points bar — bottom area above tip button */}
            <div className="absolute bottom-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <TotalPointsBar points={championTanks.points} />
            </div>

            {/* Champion poll widget — bottom left */}
            <div className="absolute bottom-4 left-3 z-10">
              <PollWidget side="champion" disabled={!isActive} />
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
                      <Button key={amt} size="sm" variant="outline" className="text-amber-400 border-amber-600/30 hover:bg-amber-900/20">
                        <img src={sixthCoinLogo} className="w-3 h-3 rounded-full mr-1" alt="" />
                        {amt}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Champion chat */}
          <Card className="rounded-none border-x-0 border-b-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Champion Chat</p>
              <div className="h-28 overflow-y-auto space-y-1.5 text-xs">
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-blue-400 font-medium">Fan1:</span> <span className="text-foreground">Go champion! 🔥</span></div>
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-blue-400 font-medium">Fan2:</span> <span className="text-foreground">You got this!</span></div>
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-blue-400 font-medium">Fan3:</span> <span className="text-foreground">💪💪💪</span></div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="text-xs h-8" readOnly />
                <Button size="sm" className="h-8 px-3"><Send className="w-3 h-3" /></Button>
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

            {/* Challenger badge — top right */}
            <div className="absolute top-4 right-4 z-10">
              <span className="bg-red-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
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
              <VerticalTank label="Tip" value={challengerTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" />
              <VerticalTank label="Skill" value={challengerTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" />
              <VerticalTank label="Sample" value={challengerTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" />
            </div>

            {/* Power flow bar — top area */}
            <div className="absolute top-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <PowerFlowBar value={challengerTanks.power} />
            </div>

            {/* Total points bar — bottom area */}
            <div className="absolute bottom-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
              <TotalPointsBar points={challengerTanks.points} />
            </div>

            {/* Challenger poll widget — bottom left */}
            <div className="absolute bottom-4 left-3 z-10">
              <PollWidget side="challenger" disabled={!isActive} />
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
                      <Button key={amt} size="sm" variant="outline" className="text-amber-400 border-amber-600/30 hover:bg-amber-900/20">
                        <img src={sixthCoinLogo} className="w-3 h-3 rounded-full mr-1" alt="" />
                        {amt}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Challenger chat */}
          <Card className="rounded-none border-x-0 border-b-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Challenger Chat</p>
              <div className="h-28 overflow-y-auto space-y-1.5 text-xs">
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-red-400 font-medium">Viewer1:</span> <span className="text-foreground">Let's go! 🎉</span></div>
                <div className="bg-muted/50 rounded px-2 py-1"><span className="text-red-400 font-medium">Viewer2:</span> <span className="text-foreground">Show them what you got!</span></div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Type a message..." className="text-xs h-8" readOnly />
                <Button size="sm" className="h-8 px-3"><Send className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls bar — Start/Stop */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/80 border-t border-border/30 p-3 flex items-center justify-center gap-4">
        {phase === 'idle' ? (
          <Button onClick={handleStart} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 h-12 text-sm rounded-full gap-2">
            <Play className="w-5 h-5" /> Start Contest
          </Button>
        ) : (
          <Button onClick={handleStop} variant="destructive" className="font-bold px-8 h-12 text-sm rounded-full gap-2">
            <Square className="w-5 h-5" /> Stop Contest
          </Button>
        )}
      </div>
    </div>
  );
};

export default ContestTestPage;
