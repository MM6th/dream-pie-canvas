import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'host-ready' | 'viewer-joined' | 'host-stopped' | 'request-status';
  from: string;
  to?: string;
  data?: any;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const useWebRTCStreaming = (
  roomId: string,
  userId: string,
  isHost: boolean
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hostIsLive, setHostIsLive] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isStreamingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Store stable refs for values used in signaling handler
  const isHostRef = useRef(isHost);
  const userIdRef = useRef(userId);
  const roomIdRef = useRef(roomId);
  
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);
  
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Send signal by inserting into database
  const sendSignal = useCallback(async (message: SignalingMessage) => {
    if (!roomIdRef.current || !userIdRef.current) return;
    
    console.log('[WebRTC] Sending signal via DB:', message.type, message.to || 'broadcast');
    
    try {
      const { error } = await supabase
        .from('webrtc_signals')
        .insert({
          room_id: roomIdRef.current,
          from_user_id: userIdRef.current,
          to_user_id: message.to || null,
          signal_type: message.type,
          signal_data: message.data || null,
        });
      
      if (error) {
        console.error('[WebRTC] Error sending signal:', error);
      }
    } catch (err) {
      console.error('[WebRTC] Exception sending signal:', err);
    }
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    console.log(`[WebRTC] Creating peer connection for ${peerId}`);
    
    // Close existing connection if any
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
      console.log(`[WebRTC] Connection state for ${peerId}: ${pc.connectionState}`);
      setConnectionState(pc.connectionState);
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track');
      setRemoteStream(event.streams[0]);
      setHostIsLive(true);
    };

    // If host, add local stream tracks
    if (isHostRef.current && localStreamRef.current) {
      console.log('[WebRTC] Adding local tracks to peer connection');
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [sendSignal]);

  // Handle incoming signaling message
  const handleSignalingMessage = useCallback(async (
    signalType: string,
    fromUserId: string,
    toUserId: string | null,
    signalData: any
  ) => {
    const currentUserId = userIdRef.current;
    const currentIsHost = isHostRef.current;
    
    // Ignore own messages
    if (fromUserId === currentUserId) return;
    
    // If message is targeted, ignore if not for us
    if (toUserId && toUserId !== currentUserId) return;

    console.log('[WebRTC] Received signal:', signalType, 'from:', fromUserId, '| isHost:', currentIsHost);

    switch (signalType) {
      case 'host-ready':
        if (!currentIsHost) {
          console.log('[WebRTC] ✓ Host is ready signal received! Setting hostIsLive=true');
          setHostIsLive(true);
          // Viewer: request connection from host
          await sendSignal({ type: 'viewer-joined', from: currentUserId });
        }
        break;

      case 'host-stopped':
        if (!currentIsHost) {
          console.log('[WebRTC] Host stopped streaming');
          setHostIsLive(false);
          setRemoteStream(null);
          // Close peer connections
          peerConnections.current.forEach(pc => pc.close());
          peerConnections.current.clear();
        }
        break;

      case 'request-status':
        // Host responds to status request if streaming
        if (currentIsHost && isStreamingRef.current) {
          console.log('[WebRTC] Responding to status request from', fromUserId);
          await sendSignal({ type: 'host-ready', from: currentUserId });
        }
        break;

      case 'viewer-joined':
        // Use ref to check streaming state (avoids stale closure)
        if (currentIsHost && isStreamingRef.current && localStreamRef.current) {
          console.log('[WebRTC] Creating offer for viewer:', fromUserId);
          const pc = createPeerConnection(fromUserId);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal({
              type: 'offer',
              from: currentUserId,
              to: fromUserId,
              data: offer,
            });
          } catch (err) {
            console.error('[WebRTC] Error creating offer:', err);
          }
        } else {
          console.log('[WebRTC] Ignoring viewer-joined:', { isHost: currentIsHost, isStreaming: isStreamingRef.current, hasStream: !!localStreamRef.current });
        }
        break;

      case 'offer':
        if (!currentIsHost) {
          console.log('[WebRTC] Handling offer from host');
          let pc = peerConnections.current.get(fromUserId);
          if (!pc) {
            pc = createPeerConnection(fromUserId);
          }
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal({
              type: 'answer',
              from: currentUserId,
              to: fromUserId,
              data: answer,
            });
          } catch (err) {
            console.error('[WebRTC] Error handling offer:', err);
          }
        }
        break;

      case 'answer':
        if (currentIsHost) {
          console.log('[WebRTC] Handling answer from viewer');
          const pc = peerConnections.current.get(fromUserId);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            } catch (err) {
              console.error('[WebRTC] Error setting remote description:', err);
            }
          }
        }
        break;

      case 'ice-candidate':
        const pc = peerConnections.current.get(fromUserId);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData));
          } catch (err) {
            console.error('[WebRTC] Error adding ICE candidate:', err);
          }
        }
        break;
    }
  }, [sendSignal, createPeerConnection]);

  // Store handler ref for use in subscription
  const handleSignalingMessageRef = useRef(handleSignalingMessage);
  useEffect(() => {
    handleSignalingMessageRef.current = handleSignalingMessage;
  }, [handleSignalingMessage]);

  // Initialize signaling via database realtime subscription
  useEffect(() => {
    if (!roomId || !userId) return;

    console.log(`[WebRTC] Initializing DB-based signaling for room ${roomId}, user ${userId}, isHost: ${isHost}`);
    setConnectionState('connecting');

    // Subscribe to realtime changes on webrtc_signals table
    const channel = supabase
      .channel(`webrtc-signals-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const { from_user_id, to_user_id, signal_type, signal_data } = payload.new as any;
          console.log('[WebRTC] DB signal received:', signal_type, 'from:', from_user_id);
          handleSignalingMessageRef.current(signal_type, from_user_id, to_user_id, signal_data);
        }
      )
      .subscribe((status) => {
        console.log('[WebRTC] Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
          
          // If viewer, request current host status
          if (!isHostRef.current) {
            console.log('[WebRTC] Viewer subscribed, requesting host status');
            // Send multiple requests with delays to catch host
            const delays = [500, 2000, 4000];
            delays.forEach((delay, index) => {
              setTimeout(async () => {
                if (!peerConnections.current.size) {
                  console.log(`[WebRTC] Viewer retry ${index + 1}: requesting host connection`);
                  await sendSignal({ type: 'request-status', from: userIdRef.current });
                  await sendSignal({ type: 'viewer-joined', from: userIdRef.current });
                }
              }, delay);
            });
          }
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[WebRTC] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, userId, isHost, sendSignal]);

  // Periodic host status broadcast while streaming
  useEffect(() => {
    if (!isHost || !isStreaming) return;
    
    // Send host-ready immediately and every 3 seconds while streaming
    const broadcastHostStatus = async () => {
      if (isStreamingRef.current) {
        console.log('[WebRTC] Broadcasting host status (periodic)');
        await sendSignal({ type: 'host-ready', from: userId });
      }
    };
    
    broadcastHostStatus();
    const interval = setInterval(broadcastHostStatus, 3000);
    
    return () => clearInterval(interval);
  }, [isHost, isStreaming, userId, sendSignal]);

  // Cleanup old signals periodically (host only)
  useEffect(() => {
    if (!isHost || !roomId) return;

    const cleanupOldSignals = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await supabase
        .from('webrtc_signals')
        .delete()
        .eq('room_id', roomId)
        .lt('created_at', fiveMinutesAgo);
    };

    // Clean up on mount and every 2 minutes
    cleanupOldSignals();
    const interval = setInterval(cleanupOldSignals, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isHost, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const startStreaming = useCallback(async () => {
    if (!isHost) return;

    try {
      console.log('[WebRTC] Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true,
      });

      localStreamRef.current = stream;
      isStreamingRef.current = true;
      setLocalStream(stream);
      setIsStreaming(true);

      // Announce to all viewers
      await sendSignal({ type: 'host-ready', from: userId });

      console.log('[WebRTC] Camera started, host-ready signal sent');
    } catch (error) {
      console.error('[WebRTC] Error starting camera:', error);
      throw error;
    }
  }, [isHost, userId, sendSignal]);

  const stopStreaming = useCallback(async () => {
    console.log('[WebRTC] Stopping streaming...');
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    isStreamingRef.current = false;
    setLocalStream(null);
    setIsStreaming(false);

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Notify viewers
    if (isHost) {
      await sendSignal({ type: 'host-stopped', from: userId });
    }

    setHostIsLive(false);
    setRemoteStream(null);
  }, [isHost, userId, sendSignal]);

  const toggleMic = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, []);

  return {
    localStream,
    remoteStream,
    isStreaming,
    hostIsLive,
    connectionState,
    startStreaming,
    stopStreaming,
    toggleMic,
  };
};
