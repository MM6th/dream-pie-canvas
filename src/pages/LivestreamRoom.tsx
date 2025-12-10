
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Clock, Users, ArrowLeft, Loader2, Lock, VideoOff, Mic, MicOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format, differenceInSeconds, isPast, isFuture } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface LivestreamData {
  id: string;
  title: string;
  content: string;
  scheduled_at: string;
  timezone: string;
  room_id: string;
  merchant_id: string;
  is_paid_livestream: boolean;
  livestream_credits_per_minute: number | null;
  session_ended_at: string | null;
  profiles: {
    display_name: string;
    avatar_url: string;
  };
}

const LivestreamRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [livestream, setLivestream] = useState<LivestreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isArtist, setIsArtist] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(1);
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (roomId) {
      fetchLivestreamData();
    }
  }, [roomId, user]);

  useEffect(() => {
    if (!livestream?.scheduled_at) return;

    const updateCountdown = () => {
      const scheduledTime = new Date(livestream.scheduled_at);
      const now = new Date();
      const diff = differenceInSeconds(scheduledTime, now);

      if (diff <= 0) {
        setIsLive(true);
        setCountdown("LIVE NOW");
      } else {
        setIsLive(false);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setCountdown(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [livestream?.scheduled_at]);

  // Real-time presence for viewer count
  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`room:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  const fetchLivestreamData = async () => {
    try {
      const { data, error } = await supabase
        .from("bulletin_posts")
        .select(`
          id, title, content, scheduled_at, timezone, room_id, merchant_id,
          is_paid_livestream, livestream_credits_per_minute, session_ended_at,
          profiles!bulletin_posts_merchant_id_fkey (display_name, avatar_url)
        `)
        .eq("room_id", roomId)
        .eq("post_type", "tv_guide")
        .single();

      if (error || !data) {
        toast({
          title: "Stream Not Found",
          description: "This livestream doesn't exist or has ended.",
          variant: "destructive",
        });
        navigate("/bulletin");
        return;
      }

      setLivestream(data as unknown as LivestreamData);
      setIsArtist(user?.id === data.merchant_id);

      // Check access for paid streams
      if (data.is_paid_livestream && user) {
        const { data: entry } = await supabase
          .from("livestream_entries")
          .select("id")
          .eq("bulletin_post_id", data.id)
          .eq("user_id", user.id)
          .single();

        setHasAccess(!!entry || user.id === data.merchant_id);
      } else {
        setHasAccess(!data.is_paid_livestream || user?.id === data.merchant_id);
      }
    } catch (err) {
      console.error("Error fetching livestream:", err);
    } finally {
      setLoading(false);
    }
  };

  // Camera controls
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: true
      });
      
      setStream(mediaStream);
      setIsCameraOn(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      toast({
        title: "Camera Started",
        description: "Your camera is now live!",
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraOn(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleEndSession = async () => {
    if (!livestream || !isArtist) return;

    const { error } = await supabase
      .from("bulletin_posts")
      .update({ session_ended_at: new Date().toISOString() })
      .eq("id", livestream.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Session Ended",
        description: "Your livestream session has ended.",
      });
      navigate("/bulletin");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Login Required</h2>
            <p className="text-gray-400 mb-4">Please log in to access this livestream.</p>
            <Button onClick={() => navigate("/")} className="bg-purple-600 hover:bg-purple-700">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess && !isArtist) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Paid Stream</h2>
            <p className="text-gray-400 mb-4">
              You need to pay credits to access this livestream.
            </p>
            <Button onClick={() => navigate("/bulletin")} className="bg-purple-600 hover:bg-purple-700">
              Go to TV Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (livestream?.session_ended_at) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Stream Ended</h2>
            <p className="text-gray-400 mb-4">This livestream session has ended.</p>
            <Button onClick={() => navigate("/bulletin")} className="bg-purple-600 hover:bg-purple-700">
              Back to TV Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/bulletin")}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to TV Guide
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Users className="w-4 h-4" />
              <span>{viewerCount} watching</span>
            </div>
            {isLive && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 lg:p-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center relative">
                {isCameraOn && isArtist ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : isLive ? (
                  <div className="text-center">
                    <Video className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {isArtist 
                        ? "Click 'Start Camera' below to begin streaming" 
                        : "Waiting for the host to start streaming..."}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Clock className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                    <p className="text-2xl font-mono text-white mb-2">{countdown}</p>
                    <p className="text-gray-400">Stream starts soon</p>
                  </div>
                )}
                
                {/* Live indicator overlay */}
                {isCameraOn && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                      LIVE
                    </span>
                    <span className="bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Users className="w-3 h-3" /> {viewerCount}
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h1 className="text-xl font-bold text-white mb-2">{livestream?.title}</h1>
                <p className="text-gray-400 text-sm">{livestream?.content}</p>
                {livestream?.scheduled_at && (
                  <p className="text-gray-500 text-sm mt-2">
                    Scheduled: {format(new Date(livestream.scheduled_at), "PPpp")} ({livestream.timezone})
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Artist Controls */}
            {isArtist && (
              <Card className="bg-gray-800 border-gray-700 mt-4">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Stream Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    {!isCameraOn ? (
                      <Button
                        onClick={startCamera}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Start Camera
                      </Button>
                    ) : (
                      <Button
                        onClick={stopCamera}
                        variant="outline"
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                      >
                        <VideoOff className="w-4 h-4 mr-2" />
                        Stop Camera
                      </Button>
                    )}
                    
                    <Button
                      onClick={toggleMic}
                      variant="outline"
                      className={`${isMicOn ? 'border-gray-600' : 'border-red-500 text-red-500'}`}
                      disabled={!isCameraOn}
                    >
                      {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <Button
                    onClick={handleEndSession}
                    variant="destructive"
                    className="w-full"
                  >
                    End Session
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Artist Info & Chat */}
          <div className="space-y-4">
            {/* Artist Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {livestream?.profiles?.avatar_url ? (
                    <img
                      src={livestream.profiles.avatar_url}
                      alt="Artist"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                      <Video className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {livestream?.profiles?.display_name || "Artist"}
                    </p>
                    <p className="text-gray-400 text-sm">Host</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chat Placeholder */}
            <Card className="bg-gray-800 border-gray-700 h-96">
              <CardHeader className="border-b border-gray-700">
                <CardTitle className="text-white text-lg">Live Chat</CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-full flex items-center justify-center">
                <p className="text-gray-400 text-center">
                  Chat feature coming soon!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivestreamRoom;
