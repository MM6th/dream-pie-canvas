import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Play, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface AstrologyReading {
  id: string;
  astrology_product_id: string;
  delivery_deadline: string;
  delivered_at: string | null;
  is_overdue: boolean;
  admin_video_url: string | null;
  status: string;
  astrology_products: {
    title: string;
    description: string;
  };
}

export const BuyerAstrologyLibrary = () => {
  const [readings, setReadings] = useState<AstrologyReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("astrology_deliveries")
        .select(`
          *,
          astrology_products (
            title,
            description
          )
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReadings(data || []);
    } catch (error) {
      console.error("Error fetching readings:", error);
      toast.error("Failed to load astrology readings");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (videoUrl: string, title: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Download started");
    } catch (error) {
      console.error("Error downloading video:", error);
      toast.error("Failed to download video");
    }
  };

  const getStatusInfo = (reading: AstrologyReading) => {
    if (reading.status === "delivered") {
      return {
        badge: <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Ready</Badge>,
        message: "Your reading is ready!",
      };
    }
    if (reading.is_overdue) {
      return {
        badge: <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />In Progress</Badge>,
        message: "Your reading is taking a bit longer. The admin is working on your personalized reading.",
      };
    }
    const daysRemaining = Math.ceil(
      (new Date(reading.delivery_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      badge: <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>,
      message: `Expected within ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`,
    };
  };

  if (loading) {
    return <div className="text-center py-8">Loading your astrology readings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Astrology Readings</h2>
      
      {readings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven't purchased any astrology readings yet
          </CardContent>
        </Card>
      ) : (
        readings.map((reading) => {
          const statusInfo = getStatusInfo(reading);
          
          return (
            <Card key={reading.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {reading.astrology_products.title}
                  </CardTitle>
                  {statusInfo.badge}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {reading.astrology_products.description}
                </p>
                
                <p className="text-sm font-medium">{statusInfo.message}</p>

                {reading.admin_video_url ? (
                  <div className="space-y-4">
                    {playingVideo === reading.id ? (
                      <div>
                        <video
                          src={reading.admin_video_url}
                          controls
                          autoPlay
                          className="w-full max-w-2xl rounded-lg"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setPlayingVideo(null)}
                          className="mt-2"
                        >
                          Close Video
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={() => setPlayingVideo(reading.id)}>
                          <Play className="w-4 h-4 mr-2" />
                          Watch Reading
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleDownload(
                              reading.admin_video_url!,
                              reading.astrology_products.title
                            )
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Your personalized reading will appear here once completed
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
