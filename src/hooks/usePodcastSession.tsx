import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'participant-joined' | 'participant-left' | 'mute-status';
  from: string;
  to?: string;
  data?: any;
}

interface Participant {
  id: string;
  displayName: string;
  role: 'host' | 'guest';
  isMuted: boolean;
  isConnected: boolean;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const usePodcastSession = (
  sessionId: string,
  userId: string,
  isHost: boolean
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mixedAudioStream, setMixedAudioStream] = useState<MediaStream | null>(null);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreams = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mixedDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const userIdRef = useRef(userId);
  const sessionIdRef = useRef(sessionId);
  const isHostRef = useRef(isHost);

  useEffect(() => {
    userIdRef.current = userId;
    sessionIdRef.current = sessionId;
    isHostRef.current = isHost;
  }, [userId, sessionId, isHost]);

  // Initialize audio context for mixing
  const initAudioMixer = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      mixedDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
      setMixedAudioStream(mixedDestinationRef.current.stream);
    }
  }, []);

  // Add stream to mixer
  const addStreamToMixer = useCallback((stream: MediaStream, peerId: string) => {
    if (!audioContextRef.current || !mixedDestinationRef.current) return;
    
    try {
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(mixedDestinationRef.current);
      console.log(`[PodcastSession] Added stream from ${peerId} to mixer`);
    } catch (error) {
      console.error('[PodcastSession] Error adding stream to mixer:', error);
    }
  }, []);

  // Send signal to database
  const sendSignal = useCallback(async (message: SignalingMessage) => {
    if (!sessionIdRef.current || !userIdRef.current) return;
    
    console.log('[PodcastSession] Sending signal:', message.type);
    
    try {
      const { error } = await supabase
        .from('podcast_session_signals')
        .insert({
          session_id: sessionIdRef.current,
          from_user_id: userIdRef.current,
          to_user_id: message.to || null,
          signal_type: message.type,
          signal_data: message.data || null,
        });
      
      if (error) console.error('[PodcastSession] Signal error:', error);
    } catch (err) {
      console.error('[PodcastSession] Exception sending signal:', err);
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log(`[PodcastSession] Creating peer connection for ${peerId}`);
    
    const existing = peerConnections.current.get(peerId);
    if (existing) {
      existing.close();
      peerConnections.current.delete(peerId);
    }
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          from: userIdRef.current,
          to: peerId,
          data: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[PodcastSession] Connection state for ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        setParticipants(prev => prev.map(p => 
          p.id === peerId ? { ...p, isConnected: true } : p
        ));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setParticipants(prev => prev.map(p => 
          p.id === peerId ? { ...p, isConnected: false } : p
        ));
      }
    };

    pc.ontrack = (event) => {
      console.log(`[PodcastSession] Received remote track from ${peerId}`);
      const stream = event.streams[0];
      remoteStreams.current.set(peerId, stream);
      
      // Add to mixer if host
      if (isHostRef.current) {
        addStreamToMixer(stream, peerId);
      }
    };

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [sendSignal, addStreamToMixer]);

  // Handle signaling messages
  const handleSignalingMessage = useCallback(async (
    signalType: string,
    fromUserId: string,
    toUserId: string | null,
    signalData: any
  ) => {
    if (fromUserId === userIdRef.current) return;
    if (toUserId && toUserId !== userIdRef.current) return;

    console.log('[PodcastSession] Received signal:', signalType, 'from:', fromUserId);

    switch (signalType) {
      case 'participant-joined':
        // Create offer for new participant
        if (localStreamRef.current) {
          const pc = createPeerConnection(fromUserId);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal({
              type: 'offer',
              from: userIdRef.current,
              to: fromUserId,
              data: offer,
            });
          } catch (err) {
            console.error('[PodcastSession] Error creating offer:', err);
          }
        }
        break;

      case 'offer':
        {
          let pc = peerConnections.current.get(fromUserId);
          if (!pc) pc = createPeerConnection(fromUserId);
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal({
              type: 'answer',
              from: userIdRef.current,
              to: fromUserId,
              data: answer,
            });
          } catch (err) {
            console.error('[PodcastSession] Error handling offer:', err);
          }
        }
        break;

      case 'answer':
        {
          const pc = peerConnections.current.get(fromUserId);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            } catch (err) {
              console.error('[PodcastSession] Error setting remote description:', err);
            }
          }
        }
        break;

      case 'ice-candidate':
        {
          const pc = peerConnections.current.get(fromUserId);
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signalData));
            } catch (err) {
              console.error('[PodcastSession] Error adding ICE candidate:', err);
            }
          }
        }
        break;

      case 'mute-status':
        setParticipants(prev => prev.map(p => 
          p.id === fromUserId ? { ...p, isMuted: signalData.isMuted } : p
        ));
        break;

      case 'participant-left':
        {
          const pc = peerConnections.current.get(fromUserId);
          if (pc) {
            pc.close();
            peerConnections.current.delete(fromUserId);
          }
          remoteStreams.current.delete(fromUserId);
          setParticipants(prev => prev.filter(p => p.id !== fromUserId));
        }
        break;
    }
  }, [createPeerConnection, sendSignal]);

  const handleSignalingMessageRef = useRef(handleSignalingMessage);
  useEffect(() => {
    handleSignalingMessageRef.current = handleSignalingMessage;
  }, [handleSignalingMessage]);

  // Setup channel function - can be called to reconnect with a new session ID
  const setupChannel = useCallback((targetSessionId: string) => {
    if (!targetSessionId || !userIdRef.current) return;

    // Clean up existing channel
    if (channelRef.current) {
      console.log('[PodcastSession] Cleaning up existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log(`[PodcastSession] Setting up realtime for session ${targetSessionId}`);

    const channel = supabase
      .channel(`podcast-session-${targetSessionId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_session_signals',
          filter: `session_id=eq.${targetSessionId}`,
        },
        (payload) => {
          const { from_user_id, to_user_id, signal_type, signal_data } = payload.new as any;
          handleSignalingMessageRef.current(signal_type, from_user_id, to_user_id, signal_data);
        }
      )
      .subscribe((status) => {
        console.log('[PodcastSession] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    channelRef.current = channel;
  }, []);

  // Set up realtime subscription on mount (for host who has session ID)
  useEffect(() => {
    if (!sessionId || !userId) return;

    setupChannel(sessionId);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, userId, setupChannel]);

  // Join session
  const joinSession = useCallback(async (overrideSessionId?: string) => {
    const effectiveSessionId = overrideSessionId || sessionIdRef.current;
    
    if (!effectiveSessionId) {
      console.error('[PodcastSession] Cannot join - no session ID');
      throw new Error('No session ID provided');
    }
    
    try {
      console.log('[PodcastSession] Joining session...', effectiveSessionId);
      
      // Update the ref and set up channel if we have an override
      if (overrideSessionId) {
        sessionIdRef.current = overrideSessionId;
        // Re-establish channel with correct session ID for guests
        setupChannel(overrideSessionId);
      }
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Initialize mixer if host
      if (isHostRef.current) {
        initAudioMixer();
        addStreamToMixer(stream, userIdRef.current);
      }

      // Add self as participant in database
      const { error: participantError } = await supabase
        .from('podcast_session_participants')
        .upsert({
          session_id: effectiveSessionId,
          user_id: userIdRef.current,
          role: isHostRef.current ? 'host' : 'guest',
          joined_at: new Date().toISOString(),
        });
      
      if (participantError) {
        console.error('[PodcastSession] Error adding participant:', participantError);
      }

      // Notify others
      await sendSignal({ type: 'participant-joined', from: userIdRef.current });
      
      // Fetch existing participants
      const { data: existingParticipants } = await supabase
        .from('podcast_session_participants')
        .select(`
          user_id,
          role,
          is_muted,
          profiles:user_id (display_name)
        `)
        .eq('session_id', effectiveSessionId)
        .is('left_at', null);

      if (existingParticipants) {
        const participantList: Participant[] = existingParticipants.map((p: any) => ({
          id: p.user_id,
          displayName: p.profiles?.display_name || 'Unknown',
          role: p.role,
          isMuted: p.is_muted || false,
          isConnected: p.user_id === userIdRef.current,
        }));
        setParticipants(participantList);
      }

      console.log('[PodcastSession] Joined session successfully');
    } catch (error) {
      console.error('[PodcastSession] Error joining session:', error);
      throw error;
    }
  }, [sendSignal, initAudioMixer, addStreamToMixer, setupChannel]);

  // Leave session
  const leaveSession = useCallback(async () => {
    console.log('[PodcastSession] Leaving session...');
    
    // Notify others
    await sendSignal({ type: 'participant-left', from: userId });

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    remoteStreams.current.clear();

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Update database
    await supabase
      .from('podcast_session_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    setParticipants([]);
    setIsConnected(false);
  }, [sessionId, userId, sendSignal]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (localStreamRef.current) {
      const newMutedState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
      
      // Update database
      await supabase
        .from('podcast_session_participants')
        .update({ is_muted: newMutedState })
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      // Notify others
      await sendSignal({ 
        type: 'mute-status', 
        from: userId, 
        data: { isMuted: newMutedState } 
      });
    }
  }, [isMuted, sessionId, userId, sendSignal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach(pc => pc.close());
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    localStream,
    mixedAudioStream,
    participants,
    isConnected,
    isMuted,
    joinSession,
    leaveSession,
    toggleMute,
  };
};
