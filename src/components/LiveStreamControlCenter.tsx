import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Clock, Users, Radio, Calendar, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isFuture, isPast } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ScheduledStream {
  id: string;
  title: string;
  scheduled_at: string;
  timezone: string;
  room_id: string;
  is_paid_livestream: boolean;
  livestream_credits_per_minute: number | null;
  session_ended_at: string | null;
}

export const LiveStreamControlCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scheduledStreams, setScheduledStreams] = useState<ScheduledStream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduledStreams = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select('id, title, scheduled_at, timezone, room_id, is_paid_livestream, livestream_credits_per_minute, session_ended_at')
        .eq('merchant_id', user.id)
        .eq('post_type', 'tv_guide')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (!error && data) {
        setScheduledStreams(data as ScheduledStream[]);
      }
    } catch (error) {
      console.error('Error fetching scheduled streams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledStreams();
  }, [user]);

  const getStreamStatus = (stream: ScheduledStream) => {
    if (stream.session_ended_at) return 'ended';
    const scheduledDate = parseISO(stream.scheduled_at);
    if (isPast(scheduledDate)) return 'live';
    return 'upcoming';
  };

  const enterStream = (roomId: string) => {
    navigate(`/livestream/${roomId}`);
  };

  const upcomingStreams = scheduledStreams.filter(s => getStreamStatus(s) === 'upcoming');
  const liveStreams = scheduledStreams.filter(s => getStreamStatus(s) === 'live');
  const pastStreams = scheduledStreams.filter(s => getStreamStatus(s) === 'ended').slice(0, 3);

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          Live Stream Control Center
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Now Section */}
        {liveStreams.length > 0 && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-semibold">LIVE NOW</span>
            </div>
            {liveStreams.map(stream => (
              <div key={stream.id} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{stream.title}</p>
                  <p className="text-gray-400 text-sm">
                    Started {format(parseISO(stream.scheduled_at), 'h:mm a')}
                  </p>
                </div>
                <Button 
                  onClick={() => enterStream(stream.room_id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Enter Studio
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Streams */}
        <div>
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Upcoming Streams ({upcomingStreams.length})
          </h3>
          
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : upcomingStreams.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming streams scheduled</p>
          ) : (
            <div className="space-y-2">
              {upcomingStreams.slice(0, 5).map(stream => (
                <div 
                  key={stream.id} 
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{stream.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(stream.scheduled_at), 'MMM d, h:mm a')}
                      </span>
                      {stream.is_paid_livestream && (
                        <Badge variant="secondary" className="text-xs">
                          {stream.livestream_credits_per_minute} credits/min
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => enterStream(stream.room_id)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-600"
                  >
                    Preview
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-700">
          <div className="text-center p-3 bg-gray-700/30 rounded-lg">
            <p className="text-2xl font-bold text-white">{scheduledStreams.length}</p>
            <p className="text-gray-400 text-xs">Total Streams</p>
          </div>
          <div className="text-center p-3 bg-gray-700/30 rounded-lg">
            <p className="text-2xl font-bold text-green-400">{upcomingStreams.length}</p>
            <p className="text-gray-400 text-xs">Upcoming</p>
          </div>
          <div className="text-center p-3 bg-gray-700/30 rounded-lg">
            <p className="text-2xl font-bold text-red-400">{liveStreams.length}</p>
            <p className="text-gray-400 text-xs">Live Now</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
