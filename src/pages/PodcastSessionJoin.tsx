import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePodcastSession } from '@/hooks/usePodcastSession';
import { AudioLevelMeter } from '@/components/podcast/AudioLevelMeter';
import { 
  Mic, MicOff, Radio, Users, LogOut, Loader2, 
  AlertCircle, CheckCircle2 
} from 'lucide-react';

interface SessionInfo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  host: {
    display_name: string;
    avatar_url: string | null;
  };
}

const PodcastSessionJoin = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const {
    localStream,
    participants,
    isConnected,
    isMuted,
    connectionError,
    joinSession,
    leaveSession,
    toggleMute,
  } = usePodcastSession(sessionInfo?.id || '', user?.id || '', false);

  // Fetch session info
  useEffect(() => {
    const fetchSession = async () => {
      if (!inviteToken) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        console.log('[PodcastSessionJoin] Fetching session with token:', inviteToken);
        const { data, error: fetchError } = await supabase
          .from('podcast_sessions')
          .select(`
            id,
            title,
            description,
            status,
            host:profiles!podcast_sessions_host_id_fkey (
              display_name,
              avatar_url
            )
          `)
          .eq('invite_token', inviteToken)
          .single();

        if (fetchError || !data) {
          console.error('[PodcastSessionJoin] Session fetch error:', fetchError);
          setError('Session not found or has expired');
          return;
        }

        console.log('[PodcastSessionJoin] Session found:', data);

        if (data.status === 'completed' || data.status === 'cancelled') {
          setError('This session has already ended');
          return;
        }

        setSessionInfo({
          id: data.id,
          title: data.title,
          description: data.description,
          status: data.status,
          host: data.host as { display_name: string; avatar_url: string | null },
        });
      } catch (err) {
        console.error('[PodcastSessionJoin] Error fetching session:', err);
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [inviteToken]);

  // Handle join
  const handleJoin = useCallback(async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to join this podcast session.",
        variant: "destructive"
      });
      navigate(`/auth?redirect=/podcast-session/${inviteToken}`);
      return;
    }

    if (!sessionInfo?.id) {
      toast({
        title: "Session Error",
        description: "Session information not available. Please refresh.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    console.log('[PodcastSessionJoin] Joining session:', sessionInfo.id);

    try {
      await joinSession(sessionInfo.id);
      setHasJoined(true);
      toast({
        title: "Joined Session",
        description: `You've joined "${sessionInfo.title}"`,
      });
    } catch (err: any) {
      console.error('[PodcastSessionJoin] Error joining session:', err);
      
      let errorMessage = "Could not join the session.";
      if (err.message?.includes('microphone') || err.message?.includes('getUserMedia')) {
        errorMessage = "Please allow microphone access to join.";
      } else if (err.message?.includes('Failed to join')) {
        errorMessage = err.message;
      } else if (err.message?.includes('connect')) {
        errorMessage = "Connection failed. Please check your internet and try again.";
      }
      
      toast({
        title: "Join Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  }, [user, joinSession, sessionInfo, inviteToken, navigate, toast]);

  // Handle leave
  const handleLeave = useCallback(async () => {
    await leaveSession();
    setHasJoined(false);
    navigate('/');
    toast({
      title: "Left Session",
      description: "You have left the podcast session.",
    });
  }, [leaveSession, navigate, toast]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">Session Unavailable</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button 
              onClick={() => navigate('/')} 
              className="mt-6"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-join state
  if (!hasJoined && sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Radio className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>{sessionInfo.title}</CardTitle>
            {sessionInfo.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {sessionInfo.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Hosted by <span className="font-medium text-foreground">{sessionInfo.host.display_name}</span></p>
              <Badge className="mt-2" variant={sessionInfo.status === 'recording' ? 'destructive' : 'default'}>
                {sessionInfo.status === 'recording' ? 'Recording in Progress' : 'Waiting for participants'}
              </Badge>
            </div>

            {user ? (
              <Button 
                onClick={handleJoin} 
                className="w-full gap-2"
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Join Session
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={() => navigate(`/auth?redirect=/podcast-session/${inviteToken}`)} 
                  className="w-full"
                >
                  Login to Join
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  You need to be logged in to participate
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active session state
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary animate-pulse" />
                {sessionInfo?.title}
              </CardTitle>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</>
                ) : (
                  'Connecting...'
                )}
              </Badge>
            </div>
            {connectionError && (
              <p className="text-sm text-destructive mt-2">{connectionError}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Participants */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                Participants ({participants.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Waiting for others to join...</p>
                ) : (
                  participants.map((participant) => (
                    <Badge 
                      key={participant.id} 
                      variant={participant.isConnected ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {participant.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      {participant.displayName}
                      {participant.role === 'host' && ' (Host)'}
                      {participant.id === user?.id && ' (You)'}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Audio Level */}
            <AudioLevelMeter stream={localStream} isRecording={!isMuted && isConnected} />

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <Button 
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                className="gap-2"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>

              <Button 
                onClick={handleLeave}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <LogOut className="w-5 h-5" />
                Leave Session
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              The host controls the recording. Your audio is being mixed with other participants.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PodcastSessionJoin;
