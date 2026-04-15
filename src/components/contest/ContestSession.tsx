import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLiveKitToken } from "@/hooks/useLiveKitToken";
import { Button } from "@/components/ui/button";
import { Clock, Loader2, Video, VideoOff, Mic, MicOff, User, Timer } from "lucide-react";
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
  onEnd: () => void;
}

const safePlay = (el: HTMLMediaElement | null) => {
  if (!el) return;
  el.play().catch(() => {});
};

type Phase = "warmup" | "live" | "overtime" | "ended";

const WARMUP_SECONDS = 5 * 60; // 5 minutes
const OVERTIME_SECONDS = 3 * 60; // 3 minutes
const POLL_PENALTY = 15;

const ContestSession = ({
  roomName,
  role,
  championId,
  challengerId,
  durationMinutes,
  challengeType,
  bulletinPostId,
  onEnd,
}: ContestSessionProps) => {
  const { user } = useAuth();
  const { getToken } = useLiveKitToken();
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

  // ─── Session lifecycle ───
  const [phase, setPhase] = useState<Phase | "connecting">("connecting");
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ─── Computed scoring ───
  const championSample = SAMPLE_RATIO_FORMULA.calculate({ voters: championTippers, viewers: Math.max(championSpectators, 1) });
  const challengerSample = SAMPLE_RATIO_FORMULA.calculate({ voters: challengerTippers, viewers: Math.max(challengerSpectators, 1) });
  const skillValue = phase === 'overtime' ? Math.round((timeLeft / OVERTIME_SECONDS) * 100) : (phase === 'ended' ? 0 : 100);
  const LIVE_SECONDS = durationMinutes * 60;

  const championTipVotesRaw = championTips + championVotePower;
  const challengerTipVotesRaw = challengerTips + challengerVotePower;
  const championTipVotes = Math.min(championTipVotesRaw, 100);
  const challengerTipVotes = Math.min(challengerTipVotesRaw, 100);

  const isLiveOrOvertime = phase === 'live' || phase === 'overtime';
  const championPower = isLiveOrOvertime ? Math.round((championTipVotesRaw + skillValue + championSample) / 3) : 0;
  const challengerPower = isLiveOrOvertime ? Math.round((challengerTipVotesRaw + skillValue + challengerSample) / 3) : 0;

  const championPointsRaw = CONTEST_SCORING_FORMULA.calculate({
    gifts: championTips, pollVotesWon: championVotePower, skillPercent: skillValue, sampleIntensity: championSample,
  });
  const challengerPointsRaw = CONTEST_SCORING_FORMULA.calculate({
    gifts: challengerTips, pollVotesWon: challengerVotePower, skillPercent: skillValue, sampleIntensity: challengerSample,
  });
  const championPoints = phase === 'ended' ? Math.max(0, championPointsRaw - (championPollSubmitted ? 0 : POLL_PENALTY)) : championPointsRaw;
  const challengerPoints = phase === 'ended' ? Math.max(0, challengerPointsRaw - (challengerPollSubmitted ? 0 : POLL_PENALTY)) : challengerPointsRaw;
  const isRevealed = phase === 'ended';

  const championTanks = { tip: championTipVotes, tipRaw: championTipVotesRaw, skill: skillValue, sample: championSample, power: championPower, points: championPoints };
  const challengerTanks = { tip: challengerTipVotes, tipRaw: challengerTipVotesRaw, skill: skillValue, sample: challengerSample, power: challengerPower, points: challengerPoints };

  // ─── Timer helpers ───
  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startCountdown = useCallback((seconds: number, onComplete: () => void) => {
    clearTimer();
    setTimeLeft(seconds);
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearTimer(); onComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // ─── Start lifecycle after connection ───
  useEffect(() => {
    if (connecting) return;
    // Begin warmup phase
    setPhase('warmup');
    playPrepareSound();
    startCountdown(WARMUP_SECONDS, () => {
      setPhase('live');
      playStartSound();
      startCountdown(LIVE_SECONDS, () => {
        setPhase('overtime');
        playOvertime();
        startCountdown(OVERTIME_SECONDS, () => {
          setPhase('ended');
        });
      });
    });
    return () => clearTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting]);

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

  const handleEndContest = () => {
    clearTimer();
    setPhase('ended');
    onEnd();
  };

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

            {/* Own tanks — left side */}
            <div className="absolute left-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3">
              <VerticalTank label="Tips/Votes" value={myTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={myTanks.tipRaw > 100} />
              <VerticalTank label="Skill" value={myTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
              <VerticalTank label="Sample" value={myTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
            </div>

            {/* Opponent tanks — right side */}
            <div className="absolute right-3 top-[44%] -translate-y-1/2 z-10 flex flex-col gap-3 items-end">
              <div className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-1 text-center w-full">{oppLabel}</div>
              <VerticalTank label="Tips/Votes" value={oppTanks.tip} color="bg-cyan-400" bgColor="bg-cyan-900/40" bubbles overflowing={oppTanks.tipRaw > 100} />
              <VerticalTank label="Skill" value={oppTanks.skill} color="bg-green-500" bgColor="bg-green-900/40" glow={isActive} />
              <VerticalTank label="Sample" value={oppTanks.sample} color="bg-purple-500" bgColor="bg-purple-900/40" fusion />
            </div>

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

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
              <Button variant="outline" size="sm" onClick={toggleCamera}
                className={`rounded-full ${!cameraOn ? "border-destructive text-destructive" : "border-white/30 text-white"} bg-black/40 hover:bg-black/60`}>
                {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleMic}
                className={`rounded-full ${!micOn ? "border-destructive text-destructive" : "border-white/30 text-white"} bg-black/40 hover:bg-black/60`}>
                {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleEndContest} className="rounded-full px-4">
                End Contest
              </Button>
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

          {/* Power flow bar — left, parallel with coin meter */}
          <div className="absolute top-4 left-28 z-10 w-[150px]">
            <PowerFlowBar value={myTanks.power} />
          </div>

          {/* Total points bar */}
          <div className="absolute bottom-14 left-14 right-14 z-10 mx-auto max-w-[200px]">
            <TotalPointsBar points={myTanks.points} revealed={isRevealed} penalized={isRevealed && !myPollSubmitted} />
          </div>

          {/* Poll widget */}
          {isLiveOrOvertime && (
            <div className="absolute bottom-4 right-3 z-10 pointer-events-auto">
              <PollWidget
                key={`poll-${mySide}-${pollResetKey}`}
                side={mySide}
                disabled={!isActive}
                onVotePowerChange={setVotePower}
                onSubmittedChange={setPollSubmitted}
              />
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="h-36 shrink-0 overflow-hidden border-t border-white/10 sm:h-48">
        <OneOnOneChat roomName={myChatRoom} channelSuffix={mySide} readOnly={false} />
      </div>

      {/* Tip button */}
      {spectatorInviterId && (
        <div className="flex items-center justify-center gap-4 p-3 bg-black/80 border-t border-white/10">
          <OneOnOneTipButton roomName={myTipRoom} recipientId={myRecipientId} />
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
    </div>
  );
};

export default ContestSession;
