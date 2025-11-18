import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, CheckCircle, Clock, AlertTriangle } from "lucide-react";

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

  const handleVideoUpload = async (deliveryId: string, file: File) => {
    try {
      setUploading(deliveryId);

      const fileExt = file.name.split(".").pop();
      const fileName = `${deliveryId}-${Date.now()}.${fileExt}`;
      const filePath = `astrology-deliveries/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-media")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("astrology_deliveries")
        .update({
          admin_video_url: publicUrl,
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", deliveryId);

      if (updateError) throw updateError;

      // Get delivery details for notification
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        await supabase
          .from("notifications")
          .insert({
            user_id: delivery.buyer_id,
            title: "Astrology Reading Ready",
            message: "Your personalized astrology reading is ready! You can now view and download it.",
            type: "ready",
            related_delivery_id: deliveryId,
          });
      }

      toast.success("Video uploaded successfully!");
      fetchDeliveries();
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Failed to upload video");
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

                {delivery.status === "pending" && (
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(delivery.id, file);
                      }}
                      disabled={uploading === delivery.id}
                      className="max-w-md"
                    />
                    <Button disabled={uploading === delivery.id}>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading === delivery.id ? "Uploading..." : "Upload Reading"}
                    </Button>
                  </div>
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
