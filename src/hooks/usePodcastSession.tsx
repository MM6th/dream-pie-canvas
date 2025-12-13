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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
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

  // Initialize audio context for mixing - use stream's sample rate to avoid mismatch
  const initAudioMixer = useCallback((stream?: MediaStream) => {
    if (!audioContextRef.current) {
      // Get the actual sample rate from the stream if available
      const sampleRate = stream?.getAudioTracks()[0]?.getSettings()?.sampleRate || 48000;
      console.log('[PodcastSession] Creating AudioContext with sample rate:', sampleRate);
      audioContextRef.current = new AudioContext({ sampleRate });
      mixedDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
      setMixedAudioStream(mixedDestinationRef.current.stream);
    }
  }, []);

  // Add stream to mixer
  const addStreamToMixer = useCallback((stream: MediaStream, peerId: string) => {
    if (!audioContextRef.current || !mixedDestinationRef.current) {
      console.warn('[PodcastSession] AudioContext not initialized, cannot add stream to mixer');
      return;
    }
    
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
    if (!sessionIdRef.current || !userIdRef.current) {
      console.error('[PodcastSession] Cannot send signal - missing session or user ID');
      return;
    }
    
    console.log('[PodcastSession] Sending signal:', message.type, 'to session:', sessionIdRef.current);
    
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
      
      if (error) {
        console.error('[PodcastSession] Signal insert error:', error);
        throw error;
      }
      console.log('[PodcastSession] Signal sent successfully:', message.type);
    } catch (err) {
      console.error('[PodcastSession] Exception sending signal:', err);
      throw err;
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
        // Fetch participant info and add to list
        console.log('[PodcastSession] New participant joined:', fromUserId);
        
        // Fetch their profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', fromUserId)
          .single();
        
        setParticipants(prev => {
          // Check if already exists
          if (prev.find(p => p.id === fromUserId)) return prev;
          return [...prev, {
            id: fromUserId,
            displayName: profile?.display_name || 'Guest',
            role: 'guest',
            isMuted: false,
            isConnected: false,
          }];
        });
        
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

  // Setup channel function - returns a promise that resolves when subscribed
  const setupChannel = useCallback(async (targetSessionId: string): Promise<boolean> => {
    if (!targetSessionId || !userIdRef.current) {
      console.error('[PodcastSession] Cannot setup channel - missing session or user ID');
      return false;
    }

    // Clean up existing channel
    if (channelRef.current) {
      console.log('[PodcastSession] Cleaning up existing channel');
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log(`[PodcastSession] Setting up realtime for session ${targetSessionId}`);

    return new Promise((resolve) => {
      const channelName = `podcast-session-${targetSessionId}-${Date.now()}`;
      console.log('[PodcastSession] Creating channel:', channelName);
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'podcast_session_signals',
            filter: `session_id=eq.${targetSessionId}`,
          },
          (payload) => {
            console.log('[PodcastSession] Received realtime payload:', payload);
            const { from_user_id, to_user_id, signal_type, signal_data } = payload.new as any;
            handleSignalingMessageRef.current(signal_type, from_user_id, to_user_id, signal_data);
          }
        )
        .subscribe((status, err) => {
          console.log('[PodcastSession] Subscription status:', status, err ? `Error: ${err.message}` : '');
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionError(null);
            resolve(true);
          } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
            console.error('[PodcastSession] Subscription failed:', status);
            setConnectionError(`Connection failed: ${status}`);
            resolve(false);
          }
        });

      channelRef.current = channel;
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!channelRef.current) {
          console.error('[PodcastSession] Channel setup timeout');
          resolve(false);
        }
      }, 10000);
    });
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

  // Join session - FIXED ORDER OF OPERATIONS
  const joinSession = useCallback(async (overrideSessionId?: string) => {
    const effectiveSessionId = overrideSessionId || sessionIdRef.current;
    
    if (!effectiveSessionId) {
      console.error('[PodcastSession] Cannot join - no session ID');
      throw new Error('No session ID provided');
    }
    
    // CRITICAL: Get the current user ID directly from Supabase auth
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser?.id) {
      console.error('[PodcastSession] Cannot join - user not authenticated');
      throw new Error('You must be logged in to join');
    }
    
    // Update the ref with the verified user ID
    userIdRef.current = currentUser.id;
    console.log('[PodcastSession] Verified user ID from auth:', currentUser.id);

    console.log('[PodcastSession] ====== JOIN SESSION START ======');
    console.log('[PodcastSession] Session ID:', effectiveSessionId);
    console.log('[PodcastSession] User ID:', userIdRef.current);
    console.log('[PodcastSession] Is Host:', isHostRef.current);
    
    try {
      // Update the session ref
      sessionIdRef.current = effectiveSessionId;
      
      // STEP 1: Get microphone access FIRST (fail fast if denied)
      console.log('[PodcastSession] Step 1: Getting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      console.log('[PodcastSession] Microphone access granted');
      console.log('[PodcastSession] Audio track settings:', stream.getAudioTracks()[0]?.getSettings());
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Initialize mixer with correct sample rate if host
      if (isHostRef.current) {
        initAudioMixer(stream);
        addStreamToMixer(stream, userIdRef.current);
      }

      // STEP 2: Insert participant to database BEFORE setting up channel
      // This ensures RLS policies will allow us to receive signals
      console.log('[PodcastSession] Step 2: Adding participant to database...');
      const { data: participantData, error: participantError } = await supabase
        .from('podcast_session_participants')
        .upsert({
          session_id: effectiveSessionId,
          user_id: userIdRef.current,
          role: isHostRef.current ? 'host' : 'guest',
          joined_at: new Date().toISOString(),
          left_at: null,
        }, {
          onConflict: 'session_id,user_id'
        })
        .select()
        .single();
      
      if (participantError) {
        console.error('[PodcastSession] CRITICAL: Failed to add participant to database:', participantError);
        throw new Error(`Failed to join session: ${participantError.message}`);
      }
      
      console.log('[PodcastSession] Participant added to database:', participantData);

      // STEP 3: Setup realtime channel (now RLS will allow us to see signals)
      console.log('[PodcastSession] Step 3: Setting up realtime channel...');
      const channelConnected = await setupChannel(effectiveSessionId);
      
      if (!channelConnected) {
        console.error('[PodcastSession] Failed to connect to realtime channel');
        throw new Error('Failed to connect to session - please try again');
      }
      
      console.log('[PodcastSession] Realtime channel connected successfully');

      // STEP 4: Send participant-joined signal
      console.log('[PodcastSession] Step 4: Sending participant-joined signal...');
      await sendSignal({ type: 'participant-joined', from: userIdRef.current });
      console.log('[PodcastSession] Signal sent successfully');
      
      // STEP 5: Fetch existing participants
      console.log('[PodcastSession] Step 5: Fetching existing participants...');
      const { data: existingParticipants, error: fetchError } = await supabase
        .from('podcast_session_participants')
        .select(`
          user_id,
          role,
          is_muted,
          profiles:user_id (display_name)
        `)
        .eq('session_id', effectiveSessionId)
        .is('left_at', null);

      if (fetchError) {
        console.error('[PodcastSession] Error fetching participants:', fetchError);
      } else if (existingParticipants) {
        console.log('[PodcastSession] Found participants:', existingParticipants.length);
        const participantList: Participant[] = existingParticipants.map((p: any) => ({
          id: p.user_id,
          displayName: p.profiles?.display_name || 'Unknown',
          role: p.role,
          isMuted: p.is_muted || false,
          isConnected: p.user_id === userIdRef.current,
        }));
        setParticipants(participantList);
      }

      console.log('[PodcastSession] ====== JOIN SESSION COMPLETE ======');
    } catch (error) {
      console.error('[PodcastSession] ====== JOIN SESSION FAILED ======');
      console.error('[PodcastSession] Error:', error);
      
      // Clean up on failure
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      
      throw error;
    }
  }, [sendSignal, initAudioMixer, addStreamToMixer, setupChannel]);

  // Leave session
  const leaveSession = useCallback(async () => {
    console.log('[PodcastSession] Leaving session...');
    
    const effectiveSessionId = sessionIdRef.current;
    
    // Notify others
    await sendSignal({ type: 'participant-left', from: userIdRef.current });

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
    if (effectiveSessionId && userIdRef.current) {
      await supabase
        .from('podcast_session_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('session_id', effectiveSessionId)
        .eq('user_id', userIdRef.current);
    }

    setParticipants([]);
    setIsConnected(false);
  }, [sendSignal]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (localStreamRef.current) {
      const newMutedState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
      
      const effectiveSessionId = sessionIdRef.current;
      
      // Update database
      if (effectiveSessionId && userIdRef.current) {
        await supabase
          .from('podcast_session_participants')
          .update({ is_muted: newMutedState })
          .eq('session_id', effectiveSessionId)
          .eq('user_id', userIdRef.current);
      }

      // Notify others
      await sendSignal({ 
        type: 'mute-status', 
        from: userIdRef.current, 
        data: { isMuted: newMutedState } 
      });
    }
  }, [isMuted, sendSignal]);

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
    connectionError,
    joinSession,
    leaveSession,
    toggleMute,
  };
};
