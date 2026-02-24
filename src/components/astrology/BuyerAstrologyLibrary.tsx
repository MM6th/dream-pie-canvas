import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Play, Clock, CheckCircle, AlertTriangle, FileText, Gift, Headphones } from "lucide-react";
import { FreeResourceDownloadModal } from "@/components/FreeResourceDownloadModal";
import { useAuth } from "@/hooks/useAuth";

interface VideoSegment {
  id: string;
  url: string;
  duration: number;
  order: number;
}

interface AstrologyReading {
  id: string;
  astrology_product_id: string;
  delivery_deadline: string;
  delivered_at: string | null;
  is_overdue: boolean;
  admin_video_url: string | null;
  video_segments: VideoSegment[] | null;
  status: string;
  astrology_products: {
    title: string;
    description: string;
    delivery_type: string;
  };
}

export const BuyerAstrologyLibrary = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState<AstrologyReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(0);
  const [hasAcceptedFreeResource, setHasAcceptedFreeResource] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Check if user has accepted the free resource
  useEffect(() => {
    const checkFreeResource = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("user_free_resources")
        .select("status")
        .eq("user_id", user.id)
        .eq("resource_key", "salt_mineral_chart")
        .maybeSingle();
      
      setHasAcceptedFreeResource(data?.status === "accepted");
    };
    
    checkFreeResource();
  }, [user]);

  useEffect(() => {
    fetchReadings();
    
    // Set up realtime subscription for delivery updates
    const channel = supabase
      .channel("astrology-deliveries-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "astrology_deliveries",
        },
        (payload) => {
          console.log("📡 Delivery update received:", payload);
          fetchReadings(); // Refresh when deliveries change
        }
      )
      .subscribe();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchReadings();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
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
            description,
            delivery_type
          )
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Type cast video_segments from Json to VideoSegment[]
      const typedReadings = (data || []).map(reading => ({
        ...reading,
        video_segments: reading.video_segments as unknown as VideoSegment[] | null
      }));
      
      setReadings(typedReadings);
    } catch (error) {
      console.error("Error fetching readings:", error);
      toast.error("Failed to load astrology readings");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (videoUrl: string, title: string, deliveryType?: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = deliveryType === 'audio_file' ? 'mp3' : 'mp4';
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Download started");
    } catch (error) {
      console.error("Error downloading:", error);
      toast.error("Failed to download. Try opening the URL directly.");
    }
  };

  const handleTestVideoUrl = (videoUrl: string) => {
    console.log('Testing video URL:', videoUrl);
    window.open(videoUrl, '_blank');
    toast.info("Opening video in new tab");
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>, reading: AstrologyReading) => {
    const video = e.currentTarget;
    console.error('Video playback error:', {
      error: video.error,
      errorCode: video.error?.code,
      errorMessage: video.error?.message,
      networkState: video.networkState,
      readyState: video.readyState,
      src: video.src,
      readingId: reading.id,
    });
    
    toast.error(`Video playback error (code: ${video.error?.code}). Try downloading instead.`);
  };

  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    console.log('Video metadata loaded successfully:', {
      duration: video.duration,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
    });
  };

  const handleSegmentEnded = (reading: AstrologyReading) => {
    const segments = reading.video_segments || [];
    if (currentSegmentIndex < segments.length - 1) {
      console.log(`Moving to segment ${currentSegmentIndex + 1} of ${segments.length}`);
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    } else {
      console.log('All segments completed');
      toast.success('Completed all segments of your reading');
    }
  };

  const getCurrentVideoUrl = (reading: AstrologyReading): string => {
    if (reading.video_segments && reading.video_segments.length > 0) {
      const sortedSegments = [...reading.video_segments].sort((a, b) => a.order - b.order);
      return sortedSegments[currentSegmentIndex]?.url || reading.admin_video_url || '';
    }
    return reading.admin_video_url || '';
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
      
      {/* Free Astrology Resources Section */}
      {hasAcceptedFreeResource && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Free Astrology Resources
          </h3>
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-4">
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-3 w-full text-left hover:bg-primary/10 rounded-lg p-2 transition-colors"
              >
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Salt & Mineral Deficiency Chart</p>
                  <p className="text-sm text-muted-foreground">Click to download your free PDF resource</p>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      <FreeResourceDownloadModal 
        open={showDownloadModal} 
        onOpenChange={setShowDownloadModal} 
      />
      
      {readings.length === 0 && !hasAcceptedFreeResource ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven't purchased any astrology readings yet
          </CardContent>
        </Card>
      ) : readings.length === 0 ? (
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
                      <div className="space-y-2">
                        {reading.astrology_products.delivery_type === 'audio_file' ? (
                          <audio
                            src={getCurrentVideoUrl(reading)}
                            controls
                            autoPlay
                            className="w-full"
                          />
                        ) : (
                          <>
                            {reading.video_segments && reading.video_segments.length > 0 && (
                              <div className="text-sm font-medium mb-2">
                                Segment {currentSegmentIndex + 1} of {reading.video_segments.length}
                              </div>
                            )}
                            <video
                              key={currentSegmentIndex}
                              src={getCurrentVideoUrl(reading)}
                              controls
                              autoPlay
                              className="w-full max-w-2xl rounded-lg"
                              onError={(e) => handleVideoError(e, reading)}
                              onLoadedMetadata={handleVideoLoaded}
                              onEnded={() => handleSegmentEnded(reading)}
                              preload="metadata"
                            >
                              Your browser does not support the video tag.
                            </video>
                            <div className="text-xs text-muted-foreground text-center">
                              {reading.video_segments && reading.video_segments.length > 1 
                                ? 'Video will auto-advance to next segment when current one finishes'
                                : 'If video doesn\'t play, try opening it in a new tab or downloading it'}
                            </div>
                          </>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPlayingVideo(null);
                            setCurrentSegmentIndex(0);
                          }}
                          className="mt-2"
                        >
                          {reading.astrology_products.delivery_type === 'audio_file' ? 'Close Audio' : 'Close Video'}
                        </Button>
                      </div>
                     ) : (
                      <div className="space-y-2">
                        {reading.astrology_products.delivery_type !== 'audio_file' && 
                         reading.video_segments && reading.video_segments.length > 1 && (
                          <div className="text-sm text-muted-foreground mb-2">
                            This reading contains {reading.video_segments.length} video segments
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={() => {
                            setPlayingVideo(reading.id);
                            setCurrentSegmentIndex(0);
                          }} className="w-full sm:w-auto">
                            {reading.astrology_products.delivery_type === 'audio_file' ? (
                              <><Headphones className="w-4 h-4 mr-2" />Listen to Reading</>
                            ) : (
                              <><Play className="w-4 h-4 mr-2" />Watch Reading</>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleDownload(
                                reading.admin_video_url!,
                                reading.astrology_products.title,
                                reading.astrology_products.delivery_type
                              )
                            }
                            className="w-full sm:w-auto"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleTestVideoUrl(reading.admin_video_url!)}
                          className="w-full sm:w-auto"
                          variant="ghost"
                          size="sm"
                        >
                          Test URL (Opens in New Tab)
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
