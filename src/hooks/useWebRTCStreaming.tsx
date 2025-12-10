import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PeerConnection {
  pc: RTCPeerConnection;
  peerId: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'host-ready' | 'viewer-joined' | 'host-stopped';
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

  // Initialize signaling channel
  useEffect(() => {
    if (!roomId || !userId) return;

    console.log(`[WebRTC] Initializing signaling for room ${roomId}, user ${userId}, isHost: ${isHost}`);

    const channel = supabase.channel(`webrtc:${roomId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        handleSignalingMessage(payload as SignalingMessage);
      })
      .subscribe((status) => {
        console.log(`[WebRTC] Channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          // If viewer, announce presence
          if (!isHost) {
            sendSignal({ type: 'viewer-joined', from: userId });
          }
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[WebRTC] Cleaning up...');
      stopStreaming();
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, isHost]);

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
          setHostIsLive(true);
          // Viewer: request connection from host
          sendSignal({ type: 'viewer-joined', from: userId });
        }
        break;

      case 'host-stopped':
        if (!isHost) {
          setHostIsLive(false);
          setRemoteStream(null);
          // Close peer connections
          peerConnections.current.forEach(pc => pc.close());
          peerConnections.current.clear();
        }
        break;

      case 'viewer-joined':
        if (isHost && isStreaming) {
          // Host: create offer for new viewer
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
        }
        break;

      case 'offer':
        if (!isHost) {
          // Viewer: handle offer from host
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
          // Host: handle answer from viewer
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
  }, [userId, isHost, isStreaming, createPeerConnection, sendSignal]);

  const startStreaming = useCallback(async () => {
    if (!isHost) return;

    try {
      console.log('[WebRTC] Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true,
      });

      localStreamRef.current = stream;
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
    setLocalStream(null);
    setIsStreaming(false);

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Notify viewers
    if (isHost) {
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
