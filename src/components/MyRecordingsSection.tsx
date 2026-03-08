import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Play, Download, Trash2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Recording {
  id: string;
  title: string;
  recording_url: string;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
}

export const MyRecordingsSection = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchRecordings = async () => {
    if (!user) return;

    const { data, error } = await (supabase
      .from("live_streams") as any)
      .select("id, title, recording_url, started_at, ended_at, viewer_count")
      .eq("merchant_id", user.id)
      .not("recording_url", "is", null)
      .order("started_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setRecordings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecordings();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await (supabase
      .from("live_streams") as any)
      .update({ recording_url: null })
      .eq("id", id)
      .eq("merchant_id", user?.id);

    if (error) {
      toast({ title: "Failed to delete recording", variant: "destructive" });
    } else {
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Recording removed" });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-purple-400" />
            My Recordings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading recordings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-purple-400" />
          My Recordings
          <Badge variant="secondary" className="ml-1">{recordings.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recordings.length === 0 ? (
          <div className="text-center py-8">
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No recordings yet</p>
            <p className="text-gray-500 text-sm">Start a live stream and hit Record to save your first recording.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div key={rec.id}>
                <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{rec.title}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {rec.started_at && (
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(rec.started_at))} ago
                        </span>
                      )}
                      <span className="text-gray-500 text-xs">
                        {rec.viewer_count} viewer{rec.viewer_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-600"
                      onClick={() => setPlayingId(playingId === rec.id ? null : rec.id)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      {playingId === rec.id ? "Hide" : "Play"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-600"
                      asChild
                    >
                      <a href={rec.recording_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => handleDelete(rec.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {playingId === rec.id && (
                  <div className="mt-2 rounded-lg overflow-hidden bg-black">
                    <video
                      src={rec.recording_url}
                      controls
                      autoPlay
                      className="w-full max-h-[300px]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
