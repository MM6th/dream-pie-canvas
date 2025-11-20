import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, Video } from "lucide-react";
import { VideoRecorder } from "./VideoRecorder";
import { Button } from "@/components/ui/button";

interface Delivery {
  id: string;
  astrology_product_id: string;
  buyer_id: string;
  delivery_deadline: string;
  delivered_at: string | null;
  is_overdue: boolean;
  admin_video_url: string | null;
  buyer_video_url: string | null;
  status: string;
  astrology_products: {
    title: string;
  };
}

export const AstrologyDeliveryManager = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [recordingDeliveryId, setRecordingDeliveryId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("astrology_deliveries")
        .select(`
          *,
          astrology_products (
            title
          )
        `)
        .eq("admin_id", user.id)
        .order("delivery_deadline", { ascending: true });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoUpload = async (deliveryId: string, blob: Blob) => {
    try {
      setUploading(deliveryId);
      
      console.log("🎥 === VIDEO UPLOAD STARTED ===");
      console.log("Delivery ID:", deliveryId);
      console.log("Blob size:", blob.size, "bytes", `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log("Blob type:", blob.type);

      // Validate blob
      if (blob.size === 0) {
        throw new Error("Video file is empty");
      }

      if (blob.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error("Video file is too large (max 100MB)");
      }

      toast.loading("Uploading video...", { id: "upload" });

      const fileName = `${deliveryId}-${Date.now()}.webm`;
      const filePath = `astrology-deliveries/${fileName}`;

      console.log("📤 Uploading to:", filePath);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("user-media")
        .upload(filePath, blob, {
          contentType: "video/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("✅ Upload successful:", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from("user-media")
        .getPublicUrl(filePath);

      console.log("🔗 Public URL:", publicUrl);

      toast.loading("Processing delivery...", { id: "upload" });

      const { error: updateError, data: updateData } = await supabase
        .from("astrology_deliveries")
        .update({
          admin_video_url: publicUrl,
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", deliveryId)
        .select();

      if (updateError) {
        console.error("❌ Database update error:", updateError);
        throw updateError;
      }

      console.log("✅ Delivery updated:", updateData);

      // Get delivery details for notification
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        console.log("📧 Sending notification to buyer:", delivery.buyer_id);
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: delivery.buyer_id,
            title: "Astrology Reading Ready",
            message: "Your personalized astrology reading is ready! You can now view and download it.",
            type: "ready",
            related_delivery_id: deliveryId,
          });

        if (notifError) {
          console.warn("⚠️ Notification error (non-critical):", notifError);
        } else {
          console.log("✅ Notification sent successfully");
        }
      }

      toast.success("Video uploaded and delivered!", { id: "upload" });
      console.log("🎉 === UPLOAD COMPLETE ===");
      
      setRecordingDeliveryId(null);
      await fetchDeliveries();
    } catch (error: any) {
      console.error("❌ === UPLOAD FAILED ===");
      console.error("Error type:", error?.name);
      console.error("Error message:", error?.message);
      console.error("Full error:", error);
      
      const errorMessage = error?.message || "Unknown error occurred";
      toast.error(`Upload failed: ${errorMessage}`, { id: "upload", duration: 5000 });
    } finally {
      setUploading(null);
    }
  };

  const getStatusBadge = (delivery: Delivery) => {
    if (delivery.status === "delivered") {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
    }
    if (delivery.is_overdue) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <div className="text-center py-8">Loading deliveries...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Astrology Delivery Queue</h2>
      
      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No pending deliveries
          </CardContent>
        </Card>
      ) : (
        deliveries.map((delivery) => {
          const daysRemaining = getDaysRemaining(delivery.delivery_deadline);
          
          return (
            <Card key={delivery.id} className={delivery.is_overdue ? "border-destructive" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {delivery.astrology_products.title}
                  </CardTitle>
                  {getStatusBadge(delivery)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Deadline: {new Date(delivery.delivery_deadline).toLocaleDateString()}</p>
                  {delivery.status === "pending" && (
                    <p className={daysRemaining < 1 ? "text-destructive font-semibold" : ""}>
                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Overdue"}
                    </p>
                  )}
                  {delivery.delivered_at && (
                    <p className="text-green-600">
                      Delivered: {new Date(delivery.delivered_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {delivery.status === "pending" && recordingDeliveryId !== delivery.id && (
                  <Button 
                    onClick={() => setRecordingDeliveryId(delivery.id)}
                    disabled={uploading === delivery.id}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Record Reading
                  </Button>
                )}

                {recordingDeliveryId === delivery.id && (
                  <VideoRecorder
                    onVideoRecorded={(blob) => handleVideoUpload(delivery.id, blob)}
                    onCancel={() => setRecordingDeliveryId(null)}
                    isUploading={uploading === delivery.id}
                  />
                )}

                {delivery.admin_video_url && (
                  <div>
                    <video
                      src={delivery.admin_video_url}
                      controls
                      className="w-full max-w-2xl rounded-lg"
                    />
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
