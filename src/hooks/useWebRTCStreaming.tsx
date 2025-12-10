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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isStreamingRef = useRef(false); // Use ref to avoid stale closure

  const sendSignal = useCallback((message: SignalingMessage) => {
    console.log('[WebRTC] Sending signal:', message.type, message.to || 'broadcast');
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: message,
    });
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
          from: userId,
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
    if (isHost && localStreamRef.current) {
      console.log('[WebRTC] Adding local tracks to peer connection');
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [userId, isHost, sendSignal]);

  const handleSignalingMessage = useCallback(async (message: SignalingMessage) => {
    // Ignore own messages
    if (message.from === userId) return;
    
    // If message is targeted, ignore if not for us
    if (message.to && message.to !== userId) return;

    console.log('[WebRTC] Received signal:', message.type, 'from:', message.from);

    switch (message.type) {
      case 'host-ready':
        if (!isHost) {
          console.log('[WebRTC] Host is ready, announcing as viewer');
          setHostIsLive(true);
          // Viewer: request connection from host
          sendSignal({ type: 'viewer-joined', from: userId });
        }
        break;

      case 'host-stopped':
        if (!isHost) {
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
        if (isHost && isStreamingRef.current) {
          console.log('[WebRTC] Responding to status request from', message.from);
          sendSignal({ type: 'host-ready', from: userId });
        }
        break;

      case 'viewer-joined':
        // Use ref to check streaming state (avoids stale closure)
        if (isHost && isStreamingRef.current && localStreamRef.current) {
          console.log('[WebRTC] Creating offer for viewer:', message.from);
          const pc = createPeerConnection(message.from);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({
              type: 'offer',
              from: userId,
              to: message.from,
              data: offer,
            });
          } catch (err) {
            console.error('[WebRTC] Error creating offer:', err);
          }
        } else {
          console.log('[WebRTC] Ignoring viewer-joined:', { isHost, isStreaming: isStreamingRef.current, hasStream: !!localStreamRef.current });
        }
        break;

      case 'offer':
        if (!isHost) {
          console.log('[WebRTC] Handling offer from host');
          let pc = peerConnections.current.get(message.from);
          if (!pc) {
            pc = createPeerConnection(message.from);
          }
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(message.data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({
              type: 'answer',
              from: userId,
              to: message.from,
              data: answer,
            });
          } catch (err) {
            console.error('[WebRTC] Error handling offer:', err);
          }
        }
        break;

      case 'answer':
        if (isHost) {
          console.log('[WebRTC] Handling answer from viewer');
          const pc = peerConnections.current.get(message.from);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(message.data));
            } catch (err) {
              console.error('[WebRTC] Error setting remote description:', err);
            }
          }
        }
        break;

      case 'ice-candidate':
        const pc = peerConnections.current.get(message.from);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(message.data));
          } catch (err) {
            console.error('[WebRTC] Error adding ICE candidate:', err);
          }
        }
        break;
    }
  }, [userId, isHost, createPeerConnection, sendSignal]);

  // Store isHost in a ref to avoid stale closures
  const isHostRef = useRef(isHost);
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // Initialize signaling channel
  useEffect(() => {
    if (!roomId || !userId) return;

    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout | null = null;

    const setupChannel = () => {
      console.log(`[WebRTC] Initializing signaling for room ${roomId}, user ${userId}, isHost: ${isHost}, attempt: ${retryCount + 1}`);

      // Clean up any existing channel first
      if (channelRef.current) {
        console.log('[WebRTC] Removing existing channel before creating new one');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channelName = `webrtc-${roomId}`;
      
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      })
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          console.log('[WebRTC] Raw signal received:', (payload as SignalingMessage).type);
          handleSignalingMessage(payload as SignalingMessage);
        });
      
      // Store reference before subscribing
      channelRef.current = channel;
      
      channel.subscribe((status, err) => {
        console.log(`[WebRTC] Channel status: ${status}`, err ? `Error: ${err.message}` : '');
        
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
          retryCount = 0; // Reset retry count on success
          
          // If viewer, request current host status with retries
          if (!isHost) {
            console.log('[WebRTC] Viewer subscribed, requesting host status');
            setTimeout(() => {
              sendSignal({ type: 'request-status', from: userId });
              sendSignal({ type: 'viewer-joined', from: userId });
            }, 500);
            setTimeout(() => {
              if (!peerConnections.current.size) {
                console.log('[WebRTC] No connection yet, retrying status request...');
                sendSignal({ type: 'request-status', from: userId });
                sendSignal({ type: 'viewer-joined', from: userId });
              }
            }, 2500);
          }
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          console.error('[WebRTC] Channel connection failed');
          setConnectionState('disconnected');
          
          // Retry with a new channel instance
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[WebRTC] Retrying channel connection (${retryCount}/${maxRetries})...`);
            retryTimeout = setTimeout(() => {
              setupChannel();
            }, 2000 * retryCount); // Exponential backoff
          } else {
            console.error('[WebRTC] Max retries reached, giving up');
          }
        }
      });
    };

    setupChannel();

    return () => {
      console.log('[WebRTC] Cleaning up...');
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, userId, isHost, handleSignalingMessage, sendSignal]);

  // Periodic host status broadcast while streaming
  useEffect(() => {
    if (!isHost || !isStreaming || !channelRef.current) return;
    
    // Send host-ready immediately and every 3 seconds while streaming
    const broadcastHostStatus = () => {
      if (isStreamingRef.current) {
        console.log('[WebRTC] Broadcasting host status (periodic)');
        sendSignal({ type: 'host-ready', from: userId });
      }
    };
    
    broadcastHostStatus();
    const interval = setInterval(broadcastHostStatus, 3000);
    
    return () => clearInterval(interval);
  }, [isHost, isStreaming, userId, sendSignal]);

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
      sendSignal({ type: 'host-ready', from: userId });

      console.log('[WebRTC] Camera started, host-ready signal sent');
    } catch (error) {
      console.error('[WebRTC] Error starting camera:', error);
      throw error;
    }
  }, [isHost, userId, sendSignal]);

  const stopStreaming = useCallback(() => {
    console.log('[WebRTC] Stopping streaming...');
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    isStreamingRef.current = false; // Update ref
    setLocalStream(null);
    setIsStreaming(false);

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Notify viewers
    if (isHost && channelRef.current) {
      sendSignal({ type: 'host-stopped', from: userId });
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
