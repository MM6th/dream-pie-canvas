import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppNavBar from "@/components/AppNavBar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Users, Eye, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LiveStream {
  id: string;
  merchant_id: string;
  title: string;
  description: string | null;
  status: string;
  started_at: string | null;
  viewer_count: number;
  thumbnail_url: string | null;
  is_paid: boolean;
  credits_per_minute: number | null;
  merchant_name?: string;
  merchant_avatar?: string;
}

const Live = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreams = async () => {
    const activeCutoff = new Date(Date.now() - 60_000).toISOString();

    const { data, error } = await (supabase
      .from("live_streams") as any)
      .select("*")
      .eq("status", "live")
      .gte("updated_at", activeCutoff)
      .order("started_at", { ascending: false });

    if (!error && data) {
      // Fetch merchant profiles
      const merchantIds = [...new Set(data.map((s: any) => s.merchant_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", merchantIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      setStreams(
        data.map((s: any) => ({
          ...s,
          merchant_name: profileMap.get(s.merchant_id)?.display_name || "Streamer",
          merchant_avatar: profileMap.get(s.merchant_id)?.avatar_url,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    cleanupStaleStreams().then(() => fetchStreams());

    // Subscribe to live stream changes
    const channel = supabase
      .channel("live-streams-browse")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        () => fetchStreams()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavBar />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-8">
          <Radio className="w-8 h-8 text-red-500 animate-pulse" />
          <h1 className="text-3xl font-bold">Live</h1>
          <Badge variant="secondary" className="text-sm">
            {streams.length} streaming now
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-muted/50 border-border animate-pulse">
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No one is live right now</h2>
            <p className="text-muted-foreground">Check back later or follow your favorite creators to get notified.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => (
              <Card
                key={stream.id}
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group overflow-hidden"
                onClick={() => navigate(`/live/${stream.id}`)}
              >
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted relative flex items-center justify-center">
                    {stream.thumbnail_url ? (
                      <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
                    ) : (
                      <Radio className="w-12 h-12 text-muted-foreground" />
                    )}
                    <div className="absolute top-2 left-2 flex gap-2">
                      <Badge className="bg-red-600 text-white border-0 animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full mr-1.5 inline-block" />
                        LIVE
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="bg-black/60 text-white border-0">
                        <Eye className="w-3 h-3 mr-1" />
                        {stream.viewer_count}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {stream.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {stream.merchant_avatar ? (
                        <img src={stream.merchant_avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">{stream.merchant_name}</span>
                    </div>
                    {stream.started_at && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Started {formatDistanceToNow(new Date(stream.started_at))} ago
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Live;
