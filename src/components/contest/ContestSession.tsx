import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Loader2, Video, VideoOff, Mic, MicOff, User, Timer, Volume2 } from "lucide-react";
import OneOnOneTipButton from "@/components/live/OneOnOneTipButton";
import OneOnOneChat from "@/components/live/OneOnOneChat";
import { toast } from "@/hooks/use-toast";
import { Room, RoomEvent, Track, VideoPresets } from "livekit-client";
import pieTitleBelt from "@/assets/pie-title-belt.png";
import pieTitleTwerk from "@/assets/pie-title-twerk.png";
import {
  VerticalTank,
  PollWidget,
  PowerFlowBar,
  TotalPointsBar,
} from "@/components/contest/ContestOverlays";
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
  unlockContestSounds,
} from "@/utils/contestSounds";
import OneOnOneTipMeter from "@/components/live/OneOnOneTipMeter";

interface ContestSessionProps {
  roomName: string;
  role: "champion" | "challenger" | "spectator";
  championId: string;
  challengerId: string;
  durationMinutes: number;
  challengeType: string;
  bulletinPostId: string;
  /** ISO timestamp from contest_sessions.started_at — single source of truth for the clock. Optional for legacy/test flows. */
  startedAt?: string;
  /** contest_sessions.id — required to persist per-contestant overtime state. Optional for legacy/test flows. */
  sessionId?: string;
  onEnd: () => void;
}

type OvertimeChoice = "yes" | "no" | null;
interface OvertimeState {
  championChoice: OvertimeChoice;
  challengerChoice: OvertimeChoice;
  championStartedAt: string | null;
  championEndedAt: string | null;
  challengerStartedAt: string | null;
  challengerEndedAt: string | null;
}
const EMPTY_OT: OvertimeState = {
  championChoice: null,
  challengerChoice: null,
  championStartedAt: null,
  championEndedAt: null,
  challengerStartedAt: null,
  challengerEndedAt: null,
};

const OT_GRACE_SECONDS = 10; // window after LIVE ends to lock in a "no" default

const safePlay = (el: HTMLMediaElement | null) => {
  if (!el) return;
  el.play().catch(() => {});
};

type Phase = "warmup" | "live" | "overtime" | "ended";

const WARMUP_SECONDS = 30; // 30 seconds (TESTING — was 5 * 60)
const OVERTIME_SECONDS = 3 * 60; // 3 minutes
const POLL_PENALTY = 15;

/**
 * Compact overtime opt-in card. Mutually-exclusive Yes/No checkboxes + Submit.
 * Lives inside the bottom controls row of the participant view.
 */
const OvertimeDecisionCard = ({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (choice: 'yes' | 'no') => void;
}) => {
  const [choice, setChoice] = React.useState<'yes' | 'no' | null>(null);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/70 border border-orange-500/50 backdrop-blur-sm">
      <span className="text-orange-300 text-[11px] font-bold uppercase tracking-wider">Overtime?</span>
      <label className="flex items-center gap-1 cursor-pointer text-white text-xs">
        <Checkbox
          checked={choice === 'yes'}
          onCheckedChange={(v) => setChoice(v ? 'yes' : null)}
          className="h-4 w-4"
        />
        Yes
      </label>
      <label className="flex items-center gap-1 cursor-pointer text-white text-xs">
        <Checkbox
          checked={choice === 'no'}
          onCheckedChange={(v) => setChoice(v ? 'no' : null)}
          className="h-4 w-4"
        />
        No
      </label>
      <Button
        size="sm"
        disabled={!choice || submitting}
        onClick={() => choice && onSubmit(choice)}
        className="rounded-full px-3 py-1 h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white"
      >
        {submitting ? '…' : 'Submit'}
      </Button>
    </div>
  );
};

const ContestSession = ({
  roomName,
  role,
  championId,
  challengerId,
  durationMinutes,
  challengeType,
  bulletinPostId,
  startedAt,
  sessionId,
  onEnd,
}: ContestSessionProps) => {
  const { user } = useAuth();
  const { getToken } = useLiveKitToken();
  const isMobile = useIsMobile();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteChampionVideoRef = useRef<HTMLVideoElement>(null);
  const remoteChampionAudioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const connectingRef = useRef(false);
  const [connecting, setConnecting] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [cameraOn, setCameraOn] = useState(role !== "spectator");
  const [micOn, setMicOn] = useState(role !== "spectator");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [spectatorInviterId, setSpectatorInviterId] = useState<string | null>(null);

  // ─── Session lifecycle (server-anchored from contest_sessions.started_at) ───
  // Anchor — frozen on first render so all clients compute identical phase/timeLeft.
  const anchorMs = useMemo(() => {
    const parsed = startedAt ? Date.parse(startedAt) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [startedAt]);
  const [phase, setPhase] = useState<Phase | "connecting">("connecting");
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Audio unlock (browsers require a user gesture before .play()) ───
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const handleEnterContest = useCallback(async () => {
    await unlockContestSounds();
    setAudioUnlocked(true);
  }, []);

  // ─── Scoring state ───
  const [championTips, setChampionTips] = useState(0);
  const [challengerTips, setChallengerTips] = useState(0);
  const [championVotePower, setChampionVotePower] = useState(0);
  const [challengerVotePower, setChallengerVotePower] = useState(0);
  const [championPollSubmitted, setChampionPollSubmitted] = useState(false);
  const [challengerPollSubmitted, setChallengerPollSubmitted] = useState(false);
  const [pollResetKey, setPollResetKey] = useState(0);

  // Sample: real spectator counts from LiveKit (tracked locally)
  const [championSpectators, setChampionSpectators] = useState(0);
  const [challengerSpectators, setChallengerSpectators] = useState(0);
  const [championTippers, setChampionTippers] = useState(0);
  const [challengerTippers, setChallengerTippers] = useState(0);

  // ─── Per-contestant overtime state (server-synced via contest_sessions row) ───
  const [overtime, setOvertime] = useState<OvertimeState>(EMPTY_OT);
  const [overtimeSubmitting, setOvertimeSubmitting] = useState(false);
  const otStartStampedRef = useRef(false); // local guard to avoid double-stamping started_at

  // Belt ceremony
  const [beltWinner, setBeltWinner] = useState<'champion' | 'challenger' | 'tie' | null>(null);
  const [showTitleChange, setShowTitleChange] = useState(false);
  const [badgesSwapped, setBadgesSwapped] = useState(false);

  // One-time sound refs
  const loveChampionPlayedRef = useRef(false);
  const loveChallengerPlayedRef = useRef(false);
  const pollWarningPlayedRef = useRef(false);
  const sampleFullChampionRef = useRef(false);
  const sampleFullChallengerRef = useRef(false);

  const isParticipant = role === "champion" || role === "challenger";

  // Room names for separated chat & tips
  const championChatRoom = `${roomName}_champion`;
  const challengerChatRoom = `${roomName}_challenger`;
  const championTipRoom = `${roomName}_champion_tips`;
  const challengerTipRoom = `${roomName}_challenger_tips`;

  // ─── Computed scoring (per-side skill so overtime can be per-contestant) ───
  const championSample = SAMPLE_RATIO_FORMULA.calculate({ voters: championTippers, viewers: Math.max(championSpectators, 1) });
  const challengerSample = SAMPLE_RATIO_FORMULA.calculate({ voters: challengerTippers, viewers: Math.max(challengerSpectators, 1) });
  const LIVE_SECONDS = durationMinutes * 60;

  const championTipVotesRaw = championTips + championVotePower;
  const challengerTipVotesRaw = challengerTips + challengerVotePower;
  const championTipVotes = Math.min(championTipVotesRaw, 100);
  const challengerTipVotes = Math.min(challengerTipVotesRaw, 100);

  // ─── Server-anchored clock + overtime state machine ───
  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const liveSecondsTotal = Math.max(1, (durationMinutes || 0) * 60);

  // Per-side overtime remaining seconds (computed each tick).
  const [championOtRemaining, setChampionOtRemaining] = useState(0);
  const [challengerOtRemaining, setChallengerOtRemaining] = useState(0);

  const computeSideOtRemaining = useCallback((startedAtIso: string | null, endedAtIso: string | null): number => {
    if (!startedAtIso) return OVERTIME_SECONDS;
    const startMs = Date.parse(startedAtIso);
    if (!Number.isFinite(startMs)) return 0;
    const endRef = endedAtIso ? Date.parse(endedAtIso) : Date.now();
    const elapsed = Math.max(0, Math.floor((endRef - startMs) / 1000));
    return Math.max(0, OVERTIME_SECONDS - elapsed);
  }, []);

  const computePhaseAndRemaining = useCallback((): { phase: Phase; remaining: number } => {
    const elapsed = Math.max(0, Math.floor((Date.now() - anchorMs) / 1000));
    if (elapsed < WARMUP_SECONDS) {
      return { phase: 'warmup', remaining: WARMUP_SECONDS - elapsed };
    }
    const liveElapsed = elapsed - WARMUP_SECONDS;
    if (liveElapsed < liveSecondsTotal) {
      return { phase: 'live', remaining: liveSecondsTotal - liveElapsed };
    }

    // LIVE has elapsed → consult per-contestant overtime decisions.
    const liveOverBy = liveElapsed - liveSecondsTotal; // seconds since live ended
    const champYes = overtime.championChoice === 'yes';
    const chalYes = overtime.challengerChoice === 'yes';
    const decisionsLocked = liveOverBy >= OT_GRACE_SECONDS
      || (overtime.championChoice !== null && overtime.challengerChoice !== null);

    // Nobody opted in (and decisions are locked) → end immediately.
    if (decisionsLocked && !champYes && !chalYes) {
      return { phase: 'ended', remaining: 0 };
    }

    // At least one side has yes (or we're still in the grace window): overtime phase.
    // Compute per-side remaining; use the larger value for the header timer.
    const champRem = champYes ? computeSideOtRemaining(overtime.championStartedAt, overtime.championEndedAt) : 0;
    const chalRem = chalYes ? computeSideOtRemaining(overtime.challengerStartedAt, overtime.challengerEndedAt) : 0;

    const champStillRunning = champYes && (overtime.championEndedAt == null) && champRem > 0;
    const chalStillRunning = chalYes && (overtime.challengerEndedAt == null) && chalRem > 0;

    // If decisions are locked and no side is still running → ended.
    if (decisionsLocked && !champStillRunning && !chalStillRunning) {
      return { phase: 'ended', remaining: 0 };
    }

    return { phase: 'overtime', remaining: Math.max(champRem, chalRem) };
  }, [anchorMs, liveSecondsTotal, overtime, computeSideOtRemaining]);

  // Per-side skill (drives points & power flow during overtime).
  const championInOt = phase === 'overtime' && overtime.championChoice === 'yes';
  const challengerInOt = phase === 'overtime' && overtime.challengerChoice === 'yes';
  const championSkill = phase === 'live' ? 100
    : championInOt ? Math.round((championOtRemaining / OVERTIME_SECONDS) * 100)
    : (phase === 'ended' || phase === 'overtime') ? 0 : 100;
  const challengerSkill = phase === 'live' ? 100
    : challengerInOt ? Math.round((challengerOtRemaining / OVERTIME_SECONDS) * 100)
    : (phase === 'ended' || phase === 'overtime') ? 0 : 100;

  const isLiveOrOvertime = phase === 'live' || phase === 'overtime';
  const championPower = isLiveOrOvertime ? Math.round((championTipVotesRaw + championSkill + championSample) / 3) : 0;
  const challengerPower = isLiveOrOvertime ? Math.round((challengerTipVotesRaw + challengerSkill + challengerSample) / 3) : 0;

  const championPointsRaw = CONTEST_SCORING_FORMULA.calculate({
    gifts: championTips, pollVotesWon: championVotePower, skillPercent: championSkill, sampleIntensity: championSample,
  });
  const challengerPointsRaw = CONTEST_SCORING_FORMULA.calculate({
    gifts: challengerTips, pollVotesWon: challengerVotePower, skillPercent: challengerSkill, sampleIntensity: challengerSample,
  });
  const championPoints = phase === 'ended' ? Math.max(0, championPointsRaw - (championPollSubmitted ? 0 : POLL_PENALTY)) : championPointsRaw;
  const challengerPoints = phase === 'ended' ? Math.max(0, challengerPointsRaw - (challengerPollSubmitted ? 0 : POLL_PENALTY)) : challengerPointsRaw;
  const isRevealed = phase === 'ended';

  const championTanks = { tip: championTipVotes, tipRaw: championTipVotesRaw, skill: championSkill, sample: championSample, power: championPower, points: championPoints };
  const challengerTanks = { tip: challengerTipVotes, tipRaw: challengerTipVotesRaw, skill: challengerSkill, sample: challengerSample, power: challengerPower, points: challengerPoints };

  // Track which phases have already had their announcement sound played on this
  // device, so a late joiner / refresh doesn't replay earlier announcements.
  const announcedPhasesRef = useRef<Set<Phase>>(new Set());

  useEffect(() => {
    if (connecting) return;
    if (!audioUnlocked) return; // wait for the user gesture before starting clock+sound

    console.log('[Contest] Lifecycle starting. durationMinutes prop =', durationMinutes, '→ LIVE_SECONDS =', liveSecondsTotal, 'anchor =', new Date(anchorMs).toISOString());

    const tick = () => {
      const { phase: nextPhase, remaining } = computePhaseAndRemaining();
      setPhase(prev => {
        if (prev !== nextPhase) {
          if (!announcedPhasesRef.current.has(nextPhase)) {
            announcedPhasesRef.current.add(nextPhase);
            if (nextPhase === 'warmup') playPrepareSound();
            else if (nextPhase === 'live') playStartSound();
            else if (nextPhase === 'overtime') playOvertime();
          }
          console.log('[Contest] Phase →', nextPhase, 'remaining', remaining);
        }
        return nextPhase;
      });
      setTimeLeft(remaining);
      // Keep per-side OT remaining in sync for skill/power calculations.
      setChampionOtRemaining(overtime.championChoice === 'yes'
        ? computeSideOtRemaining(overtime.championStartedAt, overtime.championEndedAt) : 0);
      setChallengerOtRemaining(overtime.challengerChoice === 'yes'
        ? computeSideOtRemaining(overtime.challengerStartedAt, overtime.challengerEndedAt) : 0);
    };

    tick(); // immediate sync on mount/refresh
    intervalRef.current = setInterval(tick, 1000);
    return () => clearTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, audioUnlocked, anchorMs, liveSecondsTotal, overtime]);

  // ─── Overtime row sync (initial fetch + realtime) ───
  const applyOtRow = useCallback((row: any) => {
    if (!row) return;
    setOvertime({
      championChoice: (row.champion_overtime_choice ?? null) as OvertimeChoice,
      challengerChoice: (row.challenger_overtime_choice ?? null) as OvertimeChoice,
      championStartedAt: row.champion_overtime_started_at ?? null,
      championEndedAt: row.champion_overtime_ended_at ?? null,
      challengerStartedAt: row.challenger_overtime_started_at ?? null,
      challengerEndedAt: row.challenger_overtime_ended_at ?? null,
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from('contest_sessions') as any)
        .select('champion_overtime_choice, challenger_overtime_choice, champion_overtime_started_at, champion_overtime_ended_at, challenger_overtime_started_at, challenger_overtime_ended_at')
        .eq('id', sessionId).maybeSingle();
      if (!cancelled && data) applyOtRow(data);
    })();

    const channel = supabase
      .channel(`contest-ot-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contest_sessions', filter: `id=eq.${sessionId}` }, (payload: any) => {
        applyOtRow(payload.new);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [sessionId, applyOtRow]);

  // ─── Overtime decision actions (participants only) ───
  const mySideKey: 'champion' | 'challenger' | null = role === 'champion' ? 'champion' : role === 'challenger' ? 'challenger' : null;
  const myChoice: OvertimeChoice = mySideKey === 'champion' ? overtime.championChoice : mySideKey === 'challenger' ? overtime.challengerChoice : null;
  const myStartedAt = mySideKey === 'champion' ? overtime.championStartedAt : mySideKey === 'challenger' ? overtime.challengerStartedAt : null;
  const myEndedAt = mySideKey === 'champion' ? overtime.championEndedAt : mySideKey === 'challenger' ? overtime.challengerEndedAt : null;
  const oppChoice = mySideKey === 'champion' ? overtime.challengerChoice : mySideKey === 'challenger' ? overtime.championChoice : null;

  // Decision card: last 60s of LIVE, or grace window after LIVE, or while
  // opponent is in overtime (lets a stragger join in).
  const elapsedNow = Math.max(0, Math.floor((Date.now() - anchorMs) / 1000));
  const liveOverBy = elapsedNow - WARMUP_SECONDS - liveSecondsTotal;
  const inGrace = liveOverBy >= 0 && liveOverBy < OT_GRACE_SECONDS;
  const showOvertimeCard = isParticipant
    && myChoice === null
    && (
      (phase === 'live' && timeLeft <= 60)
      || inGrace
      || (phase === 'overtime' && oppChoice === 'yes')
    );

  const submitOvertimeChoice = useCallback(async (choice: 'yes' | 'no') => {
    if (!sessionId || !mySideKey || overtimeSubmitting) return;
    setOvertimeSubmitting(true);
    const update: any = mySideKey === 'champion'
      ? { champion_overtime_choice: choice }
      : { challenger_overtime_choice: choice };
    const elapsed = Math.max(0, Math.floor((Date.now() - anchorMs) / 1000));
    const liveEnded = elapsed >= WARMUP_SECONDS + liveSecondsTotal;
    let stamp: string | null = null;
    if (choice === 'yes' && liveEnded) {
      stamp = new Date().toISOString();
      if (mySideKey === 'champion') update.champion_overtime_started_at = stamp;
      else update.challenger_overtime_started_at = stamp;
    }

    // ── Optimistic local update so the UI flips immediately, even if realtime
    // is delayed. The opponent's client still picks this up via realtime.
    setOvertime(prev => ({
      ...prev,
      ...(mySideKey === 'champion'
        ? { championChoice: choice, championStartedAt: stamp ?? prev.championStartedAt }
        : { challengerChoice: choice, challengerStartedAt: stamp ?? prev.challengerStartedAt }),
    }));

    const { error } = await (supabase.from('contest_sessions') as any).update(update).eq('id', sessionId);
    setOvertimeSubmitting(false);
    if (error) {
      // Roll back optimistic update on failure
      setOvertime(prev => ({
        ...prev,
        ...(mySideKey === 'champion'
          ? { championChoice: null, championStartedAt: stamp ? null : prev.championStartedAt }
          : { challengerChoice: null, challengerStartedAt: stamp ? null : prev.challengerStartedAt }),
      }));
      toast({ title: 'Could not submit overtime choice', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: choice === 'yes' ? 'Overtime confirmed' : 'No overtime',
        description: choice === 'yes'
          ? 'You\'ll get 3 extra minutes. End it any time with the End Overtime button.'
          : 'Your points lock in when the live clock hits zero.',
      });
    }
  }, [sessionId, mySideKey, overtimeSubmitting, anchorMs, liveSecondsTotal]);

  // When phase transitions to overtime and our side opted yes but no
  // started_at exists yet, stamp it once. Other clients pick it up via realtime.
  useEffect(() => {
    if (!sessionId || !mySideKey || phase !== 'overtime') return;
    if (myChoice !== 'yes' || myStartedAt) return;
    if (otStartStampedRef.current) return;
    otStartStampedRef.current = true;
    const stamp = new Date().toISOString();
    // Optimistic — same reasoning as submitOvertimeChoice.
    setOvertime(prev => ({
      ...prev,
      ...(mySideKey === 'champion'
        ? { championStartedAt: stamp }
        : { challengerStartedAt: stamp }),
    }));
    const update: any = mySideKey === 'champion'
      ? { champion_overtime_started_at: stamp }
      : { challenger_overtime_started_at: stamp };
    (supabase.from('contest_sessions') as any).update(update).eq('id', sessionId);
  }, [sessionId, mySideKey, phase, myChoice, myStartedAt]);

  const endMyOvertime = useCallback(async () => {
    if (!sessionId || !mySideKey) return;
    if (myChoice !== 'yes' || myEndedAt) return;
    const stamp = new Date().toISOString();
    // Optimistic — flip the UI immediately.
    setOvertime(prev => ({
      ...prev,
      ...(mySideKey === 'champion'
        ? { championEndedAt: stamp }
        : { challengerEndedAt: stamp }),
    }));
    const update: any = mySideKey === 'champion'
      ? { champion_overtime_ended_at: stamp }
      : { challenger_overtime_ended_at: stamp };
    const { error } = await (supabase.from('contest_sessions') as any).update(update).eq('id', sessionId);
    if (error) {
      // Roll back
      setOvertime(prev => ({
        ...prev,
        ...(mySideKey === 'champion'
          ? { championEndedAt: null }
          : { challengerEndedAt: null }),
      }));
      toast({ title: 'Could not end overtime', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Overtime ended', description: 'Your final score is locked in.' });
    }
  }, [sessionId, mySideKey, myChoice, myEndedAt]);

  // When phase reaches 'ended' (computed from per-side state), trigger onEnd once.
  const endedFiredRef = useRef(false);
  useEffect(() => {
    if (phase === 'ended' && !endedFiredRef.current) {
      endedFiredRef.current = true;
      setTimeout(() => onEnd(), 4500);
    }
  }, [phase, onEnd]);

  // ─── Sound triggers ───
  const showPollWarning = phase === 'live' && timeLeft > 0 && timeLeft <= 60;

  useEffect(() => {
    if (championTipVotesRaw > 100 && !loveChampionPlayedRef.current) { loveChampionPlayedRef.current = true; playLoveIt(); }
  }, [championTipVotesRaw]);
  useEffect(() => {
    if (challengerTipVotesRaw > 100 && !loveChallengerPlayedRef.current) { loveChallengerPlayedRef.current = true; playLoveIt(); }
  }, [challengerTipVotesRaw]);
  useEffect(() => {
    if (showPollWarning && !pollWarningPlayedRef.current) { pollWarningPlayedRef.current = true; playPollWarning(); }
  }, [showPollWarning]);
  useEffect(() => {
    if (championSample >= 100 && !sampleFullChampionRef.current) { sampleFullChampionRef.current = true; playSampleTank(); }
  }, [championSample]);
  useEffect(() => {
    if (challengerSample >= 100 && !sampleFullChallengerRef.current) { sampleFullChallengerRef.current = true; playSampleTank(); }
  }, [challengerSample]);

  // ─── Winner ceremony ───
  useEffect(() => {
    if (phase !== 'ended') return;
    const timeout = setTimeout(() => {
      if (championPoints > challengerPoints) {
        setBeltWinner('champion');
        playChampionWins();
      } else if (challengerPoints > championPoints) {
        setBeltWinner('challenger');
        // Determine if there's a title on the line (champion has belt) vs two challengers
        // For now use playChallengerWins for title matches, playWinnerContest for non-title
        playChallengerWins();
        setTimeout(() => {
          setShowTitleChange(true);
          setTimeout(() => { setBadgesSwapped(true); setShowTitleChange(false); }, 5000);
        }, 1500);
      } else {
        setBeltWinner('tie');
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [phase, championPoints, challengerPoints]);

  // ─── Real-time tip tracking ───
  useEffect(() => {
    const champChannel = supabase
      .channel(`contest-tips-champ-${roomName}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "one_on_one_tips", filter: `room_name=eq.${championTipRoom}` }, (payload: any) => {
        playCoinDeposit();
        setChampionTips(prev => prev + (payload.new?.amount || 0));
        setChampionTippers(prev => prev + 1);
      })
      .subscribe();

    const chalChannel = supabase
      .channel(`contest-tips-chal-${roomName}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "one_on_one_tips", filter: `room_name=eq.${challengerTipRoom}` }, (payload: any) => {
        playCoinDeposit();
        setChallengerTips(prev => prev + (payload.new?.amount || 0));
        setChallengerTippers(prev => prev + 1);
      })
      .subscribe();

    // Initial tip fetch
    const fetchTips = async (room: string, setter: React.Dispatch<React.SetStateAction<number>>) => {
      const { data } = await (supabase.from("one_on_one_tips") as any).select("amount").eq("room_name", room);
      if (data) setter(data.reduce((s: number, t: any) => s + (t.amount || 0), 0));
    };
    fetchTips(championTipRoom, setChampionTips);
    fetchTips(challengerTipRoom, setChallengerTips);

    return () => { supabase.removeChannel(champChannel); supabase.removeChannel(chalChannel); };
  }, [roomName, championTipRoom, challengerTipRoom]);

  // ─── Spectator inviter lookup ───
  useEffect(() => {
    if (role !== "spectator" || !user?.id || !bulletinPostId) return;
    const lookup = async () => {
      const { data } = await supabase
        .from("contest_invitations").select("inviter_id")
        .eq("bulletin_post_id", bulletinPostId).eq("invitee_id", user.id).eq("status", "accepted").maybeSingle();
      if (data?.inviter_id) setSpectatorInviterId(data.inviter_id);
    };
    lookup();
  }, [role, user?.id, bulletinPostId]);

  // ─── Avatar fetch ───
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("avatar_url").eq("id", user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); });
  }, [user?.id]);

  // ─── Camera/mic controls ───
  const attachLocalCamera = useCallback((room: Room | null, element: HTMLVideoElement | null = localVideoRef.current) => {
    if (!room || !element) return false;
    const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (!camPub?.track) return false;
    const mediaTrack = (camPub.track as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack;
    if (mediaTrack) { camPub.track.detach(); element.srcObject = new MediaStream([mediaTrack]); }
    else { camPub.track.detach(); camPub.track.attach(element); }
    element.muted = true; element.autoplay = true; element.playsInline = true;
    safePlay(element);
    return true;
  }, []);

  const setLocalVideoElement = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (!node || !roomRef.current) return;
    attachLocalCamera(roomRef.current, node);
  }, [attachLocalCamera]);

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || !isParticipant) return;
    try {
      if (cameraOn) { await room.localParticipant.setCameraEnabled(false); if (localVideoRef.current) localVideoRef.current.srcObject = null; }
      else { await room.localParticipant.setCameraEnabled(true); setTimeout(() => attachLocalCamera(room), 300); }
      setCameraOn(!cameraOn);
    } catch (err) { console.error("Toggle camera error:", err); }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room || !isParticipant) return;
    try { await room.localParticipant.setMicrophoneEnabled(!micOn); setMicOn(!micOn); }
    catch (err) { console.error("Toggle mic error:", err); }
  };

  // ─── LiveKit connection (unchanged pattern) ───
  useEffect(() => {
    if (!user || !roomName) return;
    let cancelled = false;
    connectingRef.current = false;

    const getTokenWithRetry = async (retries = 3, delayMs = 1500): Promise<{ token: string; wsUrl: string }> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const result = await getToken(roomName, isParticipant);
          return result;
        } catch (err: any) {
          if (attempt === retries) throw err;
          await new Promise(r => setTimeout(r, delayMs));
          if (cancelled) throw new Error("Cancelled");
        }
      }
      throw new Error("Failed to get token");
    };

    const connect = async () => {
      if (connectingRef.current) return;
      connectingRef.current = true;
      try {
        const delay = role === "champion" ? 2500 : 800;
        await new Promise(r => setTimeout(r, delay));
        if (cancelled) return;

        const { token, wsUrl } = await getTokenWithRetry();
        if (cancelled) return;

        const room = new Room({ adaptiveStream: true, dynacast: true, videoCaptureDefaults: { resolution: VideoPresets.h720.resolution } });

        // Track spectator counts via participant events
        const updateSpectatorCounts = () => {
          let champCount = 0, chalCount = 0;
          for (const p of room.remoteParticipants.values()) {
            const pUserId = p.identity.split(":")[0];
            if (pUserId !== championId && pUserId !== challengerId) {
              // This is a spectator — attribute to their inviter's side
              // We can't easily know here, so count all spectators equally for now
              // The sample formula will use tippers (from tip events) vs total spectators
              champCount++;
              chalCount++;
            }
          }
          setChampionSpectators(Math.max(champCount, 1));
          setChallengerSpectators(Math.max(chalCount, 1));
        };

        room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (cancelled) return;
          const pidUserId = participant.identity.split(":")[0];
          const isChampionTrack = pidUserId === championId;
          const isChallengerTrack = pidUserId === challengerId;

          if (role === "spectator") {
            if (isChampionTrack) {
              if (track.source === Track.Source.Camera && remoteChampionVideoRef.current) { track.attach(remoteChampionVideoRef.current); safePlay(remoteChampionVideoRef.current); }
              if (track.source === Track.Source.Microphone && remoteChampionAudioRef.current) { track.attach(remoteChampionAudioRef.current); safePlay(remoteChampionAudioRef.current); }
            }
            if (isChallengerTrack) {
              if (track.source === Track.Source.Camera && remoteVideoRef.current) { track.attach(remoteVideoRef.current); safePlay(remoteVideoRef.current); setRemoteConnected(true); }
              if (track.source === Track.Source.Microphone && remoteAudioRef.current) { track.attach(remoteAudioRef.current); safePlay(remoteAudioRef.current); }
            }
          } else {
            if (track.source === Track.Source.Camera && remoteVideoRef.current) { track.attach(remoteVideoRef.current); safePlay(remoteVideoRef.current); setRemoteConnected(true); }
            if (track.source === Track.Source.Microphone && remoteAudioRef.current) { track.attach(remoteAudioRef.current); safePlay(remoteAudioRef.current); }
          }
          updateSpectatorCounts();
        });

        room.on(RoomEvent.LocalTrackPublished, () => { if (!cancelled) attachLocalCamera(room); });
        room.on(RoomEvent.TrackUnsubscribed, (track) => { track.detach(); if (track.source === Track.Source.Camera) setRemoteConnected(false); });
        room.on(RoomEvent.ParticipantDisconnected, () => { setRemoteConnected(false); updateSpectatorCounts(); });
        room.on(RoomEvent.ParticipantConnected, () => { updateSpectatorCounts(); });

        await room.connect(wsUrl, token);
        if (cancelled) { room.disconnect(); return; }
        roomRef.current = room;

        if (isParticipant) {
          const enableWithRetry = async (retries = 3) => {
            for (let i = 1; i <= retries; i++) {
              try { await room.localParticipant.enableCameraAndMicrophone(); return true; }
              catch (err: any) { if (i < retries) { await new Promise(r => setTimeout(r, 2000)); if (cancelled) return false; } }
            }
            return false;
          };
          const enabled = await enableWithRetry();
          if (cancelled) { room.disconnect(); return; }
          if (!enabled) toast({ title: "Camera/mic failed to start", description: "You can still see and hear the other participant.", variant: "destructive" });
          const tryAttach = (retriesLeft: number) => {
            if (cancelled || retriesLeft <= 0) return;
            if (!attachLocalCamera(room)) window.setTimeout(() => tryAttach(retriesLeft - 1), 300);
          };
          tryAttach(15);
        }

        // Attach already-published remote tracks
        for (const p of room.remoteParticipants.values()) {
          const pidUserId = p.identity.split(":")[0];
          for (const pub of p.trackPublications.values()) {
            if (pub.isSubscribed && pub.track) {
              if (role === "spectator") {
                if (pidUserId === championId) {
                  if (pub.source === Track.Source.Camera && remoteChampionVideoRef.current) { pub.track.attach(remoteChampionVideoRef.current); safePlay(remoteChampionVideoRef.current); }
                  if (pub.source === Track.Source.Microphone && remoteChampionAudioRef.current) { pub.track.attach(remoteChampionAudioRef.current); safePlay(remoteChampionAudioRef.current); }
                } else if (pidUserId === challengerId) {
                  if (pub.source === Track.Source.Camera && remoteVideoRef.current) { pub.track.attach(remoteVideoRef.current); safePlay(remoteVideoRef.current); setRemoteConnected(true); }
                  if (pub.source === Track.Source.Microphone && remoteAudioRef.current) { pub.track.attach(remoteAudioRef.current); safePlay(remoteAudioRef.current); }
                }
              } else {
                if (pub.source === Track.Source.Camera && remoteVideoRef.current) { pub.track.attach(remoteVideoRef.current); safePlay(remoteVideoRef.current); setRemoteConnected(true); }
                if (pub.source === Track.Source.Microphone && remoteAudioRef.current) { pub.track.attach(remoteAudioRef.current); safePlay(remoteAudioRef.current); }
              }
            }
          }
        }

        updateSpectatorCounts();
        setConnecting(false);
      } catch (err: any) {
        connectingRef.current = false;
        if (cancelled) return;
        console.error("Contest connect error:", err);
        toast({ title: "Connection failed", description: "Retrying…", variant: "destructive" });
        setTimeout(() => { if (!cancelled && !roomRef.current) { connectingRef.current = false; connect(); } }, 3000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (roomRef.current) {
        for (const pub of roomRef.current.localParticipant.trackPublications.values()) {
          if (pub.track) { pub.track.stop(); pub.track.detach(); }
        }
        roomRef.current.disconnect(); roomRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
      if (remoteChampionVideoRef.current) remoteChampionVideoRef.current.srcObject = null;
      if (remoteChampionAudioRef.current) remoteChampionAudioRef.current.srcObject = null;
      connectingRef.current = false;
    };
  }, [attachLocalCamera, roomName, user?.id]);

  const challengeLabel = challengeType?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Contest";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerLabel = phase === 'warmup' ? 'WARMUP' : phase === 'live' ? 'LIVE' : phase === 'overtime' ? 'OVERTIME' : phase === 'ended' ? 'ENDED' : '';
  const timerBorderColor = phase === 'warmup' ? 'border-yellow-500/50' : phase === 'overtime' ? 'border-orange-500/50' : phase === 'live' ? 'border-red-600/50' : 'border-white/20';
  const timerIconColor = phase === 'warmup' ? 'text-yellow-500' : phase === 'overtime' ? 'text-orange-500' : phase === 'live' ? 'text-red-500' : 'text-white/40';
  const isActive = phase === 'live' || phase === 'overtime';

  // Determine which side the spectator supports
  const spectatorSide = spectatorInviterId === championId ? 'champion' : spectatorInviterId === challengerId ? 'challenger' : null;

  // ─── Tank Overlay for a single panel ───
  const renderTankOverlay = (side: 'champion' | 'challenger') => {
    const tanks = side === 'champion' ? championTanks : challengerTanks;
    const pollSubmitted = side === 'champion' ? championPollSubmitted : challengerPollSubmitted;
    const setVotePower = side === 'champion' ? setChampionVotePower : setChallengerVotePower;
    const setPollSubmitted = side === 'champion' ? setChampionPollSubmitted : setChallengerPollSubmitted;

    // Spectators see polls only for their inviter's side
    const showPoll = role === 'spectator' && spectatorSide === side;

    return (
      <>
        {/* Three vertical tanks — left edge */}
        <div className="absolute left-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3">
          <VerticalTank label="Tips/Votes" value={tanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={tanks.tipRaw > 100} />
          <VerticalTank label="Skill" value={tanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
          <VerticalTank label="Sample" value={tanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
        </div>

        {/* Power flow bar — top area */}
        <div className="absolute top-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
          <PowerFlowBar value={tanks.power} />
        </div>

        {/* Total points bar — bottom area */}
        <div className="absolute bottom-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
          <TotalPointsBar points={tanks.points} revealed={isRevealed} penalized={isRevealed && !pollSubmitted} />
        </div>

        {/* Poll widget — bottom left, only for spectator on their side */}
        {showPoll && (
          <div className="absolute bottom-4 left-3 z-10">
            <PollWidget
              key={`poll-${side}-${pollResetKey}`}
              side={side}
              disabled={!isActive}
              onVotePowerChange={setVotePower}
              onSubmittedChange={setPollSubmitted}
            />
          </div>
        )}
      </>
    );
  };

  // ─── PARTICIPANT VIEW: full-screen own feed + opponent stats ───
  if (isParticipant && !connecting) {
    const mySide = role === 'champion' ? 'champion' : 'challenger';
    const oppSide = mySide === 'champion' ? 'challenger' : 'champion';
    const myTanks = mySide === 'champion' ? championTanks : challengerTanks;
    const oppTanks = mySide === 'champion' ? challengerTanks : championTanks;
    const myPollSubmitted = mySide === 'champion' ? championPollSubmitted : challengerPollSubmitted;
    const oppPollSubmitted = mySide === 'champion' ? challengerPollSubmitted : championPollSubmitted;
    const myChatRoom = mySide === 'champion' ? championChatRoom : challengerChatRoom;
    const myTipRoom = mySide === 'champion' ? championTipRoom : challengerTipRoom;
    const myLabel = mySide === 'champion' ? 'Champion' : 'Challenger';
    const oppLabel = mySide === 'champion' ? 'Challenger' : 'Champion';

    return (
      <div className="flex flex-col h-full bg-black relative">
        {/* Timer */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <div className={`bg-black/80 border ${timerBorderColor} rounded-full px-6 py-2 flex items-center gap-2`}>
            <Timer className={`w-4 h-4 ${timerIconColor}`} />
            <div className="flex flex-col items-center">
              {timerLabel && (
                <span className={`text-[8px] font-bold uppercase tracking-widest ${phase === 'warmup' ? 'text-yellow-400' : phase === 'overtime' ? 'text-orange-400 animate-pulse' : phase === 'live' ? 'text-red-400' : 'text-white/50'}`}>
                  {timerLabel}
                </span>
              )}
              <span className="text-white font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>

        {/* Challenge label */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="text-2xl sm:text-3xl font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide">
            {challengeLabel}
          </span>
        </div>

        {/* Poll warning */}
        {showPollWarning && (
          <div className="absolute top-[100px] left-1/2 -translate-x-1/2 z-[60] animate-pulse">
            <div className="bg-yellow-500/90 text-black font-bold text-sm px-6 py-2 rounded-full shadow-lg shadow-yellow-500/30">
              ⚠️ Submit your polls! {formatTime(timeLeft)} remaining
            </div>
          </div>
        )}

        {/* Full-screen own video */}
        <div className="flex-1 min-h-0 relative isolate overflow-hidden">
          <div className="absolute inset-0 z-0">
            <video ref={setLocalVideoElement} autoPlay muted playsInline className={`w-full h-full object-cover ${!cameraOn ? 'hidden' : ''}`} />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-white/20" /> : <User className="w-16 h-16 text-muted-foreground" />}
              </div>
            )}
          </div>

          {/* Hidden audio for remote participant (no video shown) */}
          <audio ref={remoteAudioRef} autoPlay className="hidden" />

          <div className="relative z-10 w-full h-full pointer-events-none">
            {/* Own badge — left side, below tip meter (kept away from opponent's tanks/power on the right) */}
            <div className="absolute top-12 left-4 pointer-events-auto">
              <span className={`${mySide === 'champion' ? 'bg-yellow-600/80' : 'bg-red-600/80'} text-white text-xs px-2 py-1 rounded flex items-center gap-1`}>
                {mySide === 'champion' && <img src={pieTitleBelt} className="h-6 w-8 object-contain" alt="Belt" />}
                {myLabel}
              </span>
            </div>

            {/* Tip meter */}
            <div className="absolute top-4 left-4 pointer-events-auto">
              <OneOnOneTipMeter roomName={myTipRoom} />
            </div>

            {/* Own tanks — left side */}
            <div className="absolute left-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3">
              <VerticalTank label="Tips/Votes" value={myTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={myTanks.tipRaw > 100} />
              <VerticalTank label="Skill" value={myTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
              <VerticalTank label="Sample" value={myTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
            </div>

            {/* Opponent tanks — right side (mirrors own side layout for alignment parity) */}
            <div className="absolute right-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3">
              <div className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1 text-center">{oppLabel}</div>
              <VerticalTank label="Tips/Votes" value={oppTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={oppTanks.tipRaw > 100} />
              <VerticalTank label="Skill" value={oppTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
              <VerticalTank label="Sample" value={oppTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
            </div>

            {/* Own + opponent power flow.
                Mobile: stacked, centered under the challenge title (avoids the
                coin meter / opponent tank collision on narrow screens).
                Desktop: original side-by-side placement next to the coin meter. */}
            {isMobile ? (
              <div className="absolute top-[88px] left-1/2 -translate-x-1/2 z-10 w-[80%] max-w-[280px] flex flex-col gap-1">
                <div>
                  <div className="text-[8px] text-white/40 text-center mb-0.5">You</div>
                  <PowerFlowBar value={myTanks.power} />
                </div>
                <div>
                  <div className="text-[8px] text-white/40 text-center mb-0.5">{oppLabel}</div>
                  <PowerFlowBar value={oppTanks.power} />
                </div>
              </div>
            ) : (
              <>
                {/* Own power flow — right of coin meter, aligned to its height */}
                <div className="absolute top-[10px] left-[280px] z-10 w-[150px]">
                  <div className="text-[8px] text-white/40 text-center mb-0.5">You</div>
                  <PowerFlowBar value={myTanks.power} />
                </div>

                {/* Opponent power flow — right, parallel with coin meter */}
                <div className="absolute top-4 right-28 z-10 w-[150px]">
                  <div className="text-[8px] text-white/40 text-center mb-0.5">{oppLabel}</div>
                  <PowerFlowBar value={oppTanks.power} />
                </div>
              </>
            )}

            {/* Own total points — bottom left area */}
            <div className="absolute bottom-14 left-14 z-10 w-[180px]">
              <div className="text-[8px] text-white/40 text-center mb-0.5">You</div>
              <TotalPointsBar points={myTanks.points} revealed={isRevealed} penalized={isRevealed && !myPollSubmitted} />
            </div>

            {/* Opponent total points — bottom right area */}
            <div className="absolute bottom-14 right-14 z-10 w-[180px]">
              <div className="text-[8px] text-white/40 text-center mb-0.5">{oppLabel}</div>
              <TotalPointsBar points={oppTanks.points} revealed={isRevealed} penalized={isRevealed && !oppPollSubmitted} />
            </div>

            {/* Controls — no early-exit. Countdown is the sole authority for ending live.
                During the wind-down/overtime an Overtime card or End Session button shows. */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
              <Button variant="outline" size="sm" onClick={toggleCamera}
                className={`rounded-full ${!cameraOn ? "border-destructive text-destructive" : "border-white/30 text-white"} bg-black/40 hover:bg-black/60`}>
                {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleMic}
                className={`rounded-full ${!micOn ? "border-destructive text-destructive" : "border-white/30 text-white"} bg-black/40 hover:bg-black/60`}>
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>

              {/* Overtime: yes/no decision card (only before submission) */}
              {showOvertimeCard && (
                <OvertimeDecisionCard
                  submitting={overtimeSubmitting}
                  onSubmit={submitOvertimeChoice}
                />
              )}

              {/* After submitting YES → button converts from "Submit" to "End Overtime".
                  Visible during the live wind-down (waiting for OT to start) and during OT itself. */}
              {isParticipant && myChoice === 'yes' && !myEndedAt && phase !== 'ended' && (
                <Button
                  size="sm"
                  onClick={endMyOvertime}
                  disabled={phase !== 'overtime'}
                  className="rounded-full px-4 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-70"
                >
                  {phase === 'overtime' ? 'End Overtime' : 'Overtime queued…'}
                </Button>
              )}

              {/* After submitting NO → confirmation pill, then "Awaiting opponent…" once OT starts */}
              {isParticipant && myChoice === 'no' && phase !== 'ended' && (
                <span className="text-white/70 text-xs px-3 py-1 rounded-full bg-black/40 border border-white/10">
                  {phase === 'overtime' ? 'Awaiting opponent…' : 'No overtime'}
                </span>
              )}

              {/* Already ended overtime — passive label until match closes */}
              {isParticipant && myChoice === 'yes' && myEndedAt && phase !== 'ended' && (
                <span className="text-white/70 text-xs px-3 py-1 rounded-full bg-black/40 border border-white/10">
                  Awaiting opponent…
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Own chat */}
        <div className="h-36 shrink-0 overflow-hidden border-t border-white/10 sm:h-48">
          <OneOnOneChat roomName={myChatRoom} channelSuffix={mySide} readOnly={false} />
        </div>

        {/* Belt ceremony */}
        {beltWinner && beltWinner !== 'tie' && (
          <div className={`absolute z-[70] pointer-events-none transition-all duration-[1.5s] ease-in-out bottom-1/2 left-1/2 -translate-x-1/2 scale-150`}>
            <img src={pieTitleBelt} className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]" alt="Belt" />
            <div className="text-center mt-1 animate-[fadeIn_0.8s_ease-in_1s_both]">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider drop-shadow">
                {beltWinner === mySide ? 'You Win!' : 'You Lose'}
              </span>
            </div>
          </div>
        )}

        {/* Title change overlay */}
        {showTitleChange && (
          <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 animate-[fadeIn_0.3s_ease-out_both]" />
            <div className="relative text-center" style={{ animation: 'title-text-appear 1.2s ease-out 0.3s both' }}>
              <p className="text-amber-400/80 text-lg font-bold uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">And The New...</p>
              <p className="text-white text-4xl sm:text-5xl font-black uppercase tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">CHAMPION</p>
              <img src={pieTitleBelt} className="w-20 h-20 object-contain mx-auto mt-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-pulse" alt="Belt" />
            </div>
          </div>
        )}

        {/* Audio unlock overlay — required so desktop browsers allow contest
            announcement sounds (Prepare/Start/Overtime/Winner) to play. */}
        {!audioUnlocked && !connecting && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm">
            <button
              onClick={handleEnterContest}
              className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-black font-bold shadow-2xl hover:scale-105 transition-transform"
            >
              <Volume2 className="w-10 h-10" />
              <span className="text-lg uppercase tracking-wider">Tap to Enter Contest</span>
              <span className="text-xs font-normal opacity-80">Enables audio announcements</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── SPECTATOR VIEW: single panel of their inviter's contestant ───
  const mySide = spectatorInviterId === championId ? 'champion' : 'challenger';
  const myVideoRef = mySide === 'champion' ? remoteChampionVideoRef : remoteVideoRef;
  const myAudioRef = mySide === 'champion' ? remoteChampionAudioRef : remoteAudioRef;
  const myChatRoom = mySide === 'champion' ? championChatRoom : challengerChatRoom;
  const myTipRoom = mySide === 'champion' ? championTipRoom : challengerTipRoom;
  const myTanks = mySide === 'champion' ? championTanks : challengerTanks;
  const myPollSubmitted = mySide === 'champion' ? championPollSubmitted : challengerPollSubmitted;
  const myRecipientId = mySide === 'champion' ? championId : challengerId;
  const myLabel = mySide === 'champion' ? 'Champion' : 'Challenger';
  const setVotePower = mySide === 'champion' ? setChampionVotePower : setChallengerVotePower;
  const setPollSubmitted = mySide === 'champion' ? setChampionPollSubmitted : setChallengerPollSubmitted;

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Timer */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
        <div className={`bg-black/80 border ${timerBorderColor} rounded-full px-6 py-2 flex items-center gap-2`}>
          <Timer className={`w-4 h-4 ${timerIconColor}`} />
          <div className="flex flex-col items-center">
            {timerLabel && (
              <span className={`text-[8px] font-bold uppercase tracking-widest ${phase === 'warmup' ? 'text-yellow-400' : phase === 'overtime' ? 'text-orange-400 animate-pulse' : phase === 'live' ? 'text-red-400' : 'text-white/50'}`}>
                {timerLabel}
              </span>
            )}
            <span className="text-white font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Challenge label */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="text-2xl sm:text-3xl font-black uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide">
          {challengeLabel}
        </span>
      </div>

      {/* Poll warning */}
      {showPollWarning && (
        <div className="absolute top-[100px] left-1/2 -translate-x-1/2 z-[60] animate-pulse">
          <div className="bg-yellow-500/90 text-black font-bold text-sm px-6 py-2 rounded-full shadow-lg shadow-yellow-500/30">
            ⚠️ Submit your polls! {formatTime(timeLeft)} remaining
          </div>
        </div>
      )}

      {/* Belt ceremony */}
      {beltWinner && beltWinner !== 'tie' && (
        <div className={`absolute z-[70] pointer-events-none transition-all duration-[1.5s] ease-in-out bottom-1/2 left-1/2 -translate-x-1/2 scale-150`}>
          <img src={pieTitleBelt} className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]" alt="Belt" />
          <div className="text-center mt-1 animate-[fadeIn_0.8s_ease-in_1s_both]">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider drop-shadow">Winner!</span>
          </div>
        </div>
      )}

      {/* Title change overlay */}
      {showTitleChange && (
        <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 animate-[fadeIn_0.3s_ease-out_both]" />
          <div className="relative text-center" style={{ animation: 'title-text-appear 1.2s ease-out 0.3s both' }}>
            <p className="text-amber-400/80 text-lg font-bold uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">And The New...</p>
            <p className="text-white text-4xl sm:text-5xl font-black uppercase tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">CHAMPION</p>
            <img src={pieTitleBelt} className="w-20 h-20 object-contain mx-auto mt-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-pulse" alt="Belt" />
          </div>
        </div>
      )}

      {/* Full-screen inviter's video */}
      <div className="flex-1 min-h-0 relative isolate overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video ref={myVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <audio ref={myAudioRef} autoPlay className="hidden" />
        </div>

        <div className="relative z-10 w-full h-full pointer-events-none">
          {/* Badge */}
          <div className="absolute top-4 right-4 pointer-events-auto">
            <span className={`${mySide === 'champion' ? 'bg-yellow-600/80' : 'bg-red-600/80'} text-white text-xs px-2 py-1 rounded flex items-center gap-1`}>
              {mySide === 'champion' && <img src={pieTitleBelt} className="h-6 w-8 object-contain" alt="Belt" />}
              {myLabel}
            </span>
          </div>

          {/* Tip meter */}
          <div className="absolute top-4 left-4 pointer-events-auto">
            <OneOnOneTipMeter roomName={myTipRoom} />
          </div>

          {/* Tanks */}
          <div className="absolute left-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3">
            <VerticalTank label="Tips/Votes" value={myTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={myTanks.tipRaw > 100} />
            <VerticalTank label="Skill" value={myTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
            <VerticalTank label="Sample" value={myTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
          </div>

          {/* Power flow bar.
              Mobile: centered under the challenge title (avoids overlap with the
              coin meter on narrow screens — user-requested layout).
              Desktop: original placement parallel to the coin meter. */}
          {isMobile ? (
            <div className="absolute top-[88px] left-1/2 -translate-x-1/2 z-10 w-[80%] max-w-[280px]">
              <PowerFlowBar value={myTanks.power} />
            </div>
          ) : (
            <div className="absolute top-4 left-28 z-10 w-[150px]">
              <PowerFlowBar value={myTanks.power} />
            </div>
          )}

          {/* Total points bar */}
          <div className="absolute bottom-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
            <TotalPointsBar points={myTanks.points} revealed={isRevealed} penalized={isRevealed && !myPollSubmitted} />
          </div>

          {/* Poll widget — desktop only inside the video overlay (mobile gets a
              dedicated row below to guarantee visibility & tappability). */}
          {!isMobile && isLiveOrOvertime && (
            <div className="absolute bottom-4 right-3 z-10 pointer-events-auto">
              <PollWidget
                key={`poll-${mySide}-${pollResetKey}-desktop`}
                side={mySide}
                disabled={!isActive}
                onVotePowerChange={setVotePower}
                onSubmittedChange={setPollSubmitted}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile poll row — sits above the chat so it is always visible &
          tappable on small screens (the in-overlay placement was clipped by
          the chat area on phones). */}
      {isMobile && isLiveOrOvertime && spectatorInviterId && (
        <div className="shrink-0 px-2 py-2 bg-black/80 border-t border-white/10 flex justify-center">
          <PollWidget
            key={`poll-${mySide}-${pollResetKey}-mobile`}
            side={mySide}
            disabled={!isActive}
            onVotePowerChange={setVotePower}
            onSubmittedChange={setPollSubmitted}
          />
        </div>
      )}

      {/* Chat */}
      <div className="h-36 shrink-0 overflow-hidden border-t border-white/10 sm:h-48">
        <OneOnOneChat roomName={myChatRoom} channelSuffix={mySide} readOnly={false} />
      </div>

      {/* Tip button */}
      {spectatorInviterId && (
        <div className="flex items-center justify-center gap-4 p-3 bg-black/80 border-t border-white/10">
          <OneOnOneTipButton
            roomName={myTipRoom}
            recipientId={myRecipientId}
            disabled={!isActive}
            disabledReason={phase === 'warmup' ? 'Tipping unlocks when the contest goes live' : 'Contest has ended'}
          />
          <span className="text-white/40 text-xs">Tip {myLabel}</span>
        </div>
      )}

      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-white text-sm">Connecting to contest...</p>
          </div>
        </div>
      )}

      {/* Audio unlock overlay — required so desktop browsers allow contest
          announcement sounds (Prepare/Start/Overtime/Winner) to play. */}
      {!audioUnlocked && !connecting && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <button
            onClick={handleEnterContest}
            className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-black font-bold shadow-2xl hover:scale-105 transition-transform"
          >
            <Volume2 className="w-10 h-10" />
            <span className="text-lg uppercase tracking-wider">Tap to Enter Contest</span>
            <span className="text-xs font-normal opacity-80">Enables audio announcements</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ContestSession;
