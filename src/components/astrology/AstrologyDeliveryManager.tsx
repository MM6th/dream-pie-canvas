import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Clock, AlertTriangle, Video, FileText, Send, Upload, Trash2 } from "lucide-react";
import { VideoRecorder } from "./VideoRecorder";
import { VideoFileUploader } from "./VideoFileUploader";
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
  draft_video_url: string | null;
  draft_saved_at: string | null;
  status: string;
  video_segments: any;
  attachment_url?: string | null;
  attachment_filename?: string | null;
  astrology_products: {
    title: string;
  };
}

export const AstrologyDeliveryManager = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [recordingDeliveryId, setRecordingDeliveryId] = useState<string | null>(null);
  const [uploadingDeliveryId, setUploadingDeliveryId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.is_admin || false);
      }
    };
    checkAdminStatus();
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

  const handleAutoSaveSegment = async (
    deliveryId: string,
    segment: Blob,
    segmentIndex: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get duration from blob using video metadata
      const getDurationFromBlob = (blob: Blob): Promise<number> => {
        return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            resolve(video.duration);
            video.remove();
          };
          video.onerror = () => {
            reject(new Error('Failed to load video metadata'));
            video.remove();
          };
          video.src = URL.createObjectURL(blob);
        });
      };

      const duration = await getDurationFromBlob(segment);

      // Upload segment to storage
      const segmentPath = `${user.id}/${deliveryId}/segment-${segmentIndex}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('user-media')
        .upload(segmentPath, segment, { 
          contentType: 'video/webm',
          upsert: false 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-media")
        .getPublicUrl(segmentPath);

      // Get existing segments
      const { data: delivery, error: fetchError } = await supabase
        .from('astrology_deliveries')
        .select('video_segments')
        .eq('id', deliveryId)
        .single();

      if (fetchError) throw fetchError;

      const existingSegments = (delivery?.video_segments as any[]) || [];
      const updatedSegments = [
        ...existingSegments,
        {
          id: Date.now().toString(),
          url: publicUrl,
          duration: duration,
          order: segmentIndex + 1,
        }
      ];

      // Update database with new segment including actual duration
      const { error: updateError } = await supabase
        .from('astrology_deliveries')
        .update({ 
          video_segments: updatedSegments,
          draft_saved_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error auto-saving segment:', error);
      throw error;
    }
  };

  const handleClearDraft = async (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    try {
      toast.loading("Clearing draft...", { id: "clear-draft" });

      // Delete all segment files from storage if they exist
      if (delivery.video_segments && Array.isArray(delivery.video_segments)) {
        for (const segment of delivery.video_segments as Array<{ url: string }>) {
          try {
            const url = new URL(segment.url);
            const filePath = url.pathname.split('/storage/v1/object/public/user-media/')[1];
            if (filePath) {
              await supabase.storage
                .from('user-media')
                .remove([filePath]);
            }
          } catch (err) {
            console.warn('Error deleting segment:', err);
          }
        }
      }

      // Also delete the draft video URL if it exists
      if (delivery.draft_video_url) {
        try {
          const url = new URL(delivery.draft_video_url);
          const filePath = url.pathname.split('/storage/v1/object/public/user-media/')[1];
          if (filePath) {
            await supabase.storage
              .from('user-media')
              .remove([filePath]);
          }
        } catch (err) {
          console.warn('Error deleting draft video:', err);
        }
      }

      // Clear draft data from database
      const { error } = await supabase
        .from('astrology_deliveries')
        .update({
          draft_video_url: null,
          video_segments: null,
          draft_saved_at: null,
        })
        .eq('id', deliveryId);

      if (error) throw error;

      toast.success("Draft cleared successfully", { id: "clear-draft" });
      await fetchDeliveries();
    } catch (error: any) {
      console.error('Error clearing draft:', error);
      toast.error("Failed to clear draft", { id: "clear-draft" });
      throw error; // Re-throw so VideoRecorder knows it failed
    }
  };

  const handleDraftSave = async (deliveryId: string, data: any, attachment?: File) => {
    try {
      setUploading(deliveryId);
      
      console.log("💾 === DRAFT SAVE STARTED ===");
      console.log("Delivery ID:", deliveryId);

      toast.loading("Saving draft...", { id: "draft" });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Handle multiple segments
      if (Array.isArray(data)) {
        const segments = data as Array<{ id: string; blob: Blob; duration: number }>;
        const uploadedSegments = [];

        // Upload each segment
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const filePath = `${user.id}/${deliveryId}/segment-${i + 1}-${Date.now()}.webm`;

          const { error: uploadError } = await supabase.storage
            .from("user-media")
            .upload(filePath, segment.blob, {
              contentType: "video/webm",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("user-media")
            .getPublicUrl(filePath);

          uploadedSegments.push({
            id: segment.id,
            url: publicUrl,
            duration: segment.duration,
            order: i + 1,
          });
        }

        // Handle attachment upload if provided
        let attachmentUrl = null;
        let attachmentFilename = null;
        
        if (attachment) {
          const attachmentPath = `${user.id}/${deliveryId}/attachment-${Date.now()}-${attachment.name}`;
          const { error: attachmentError } = await supabase.storage
            .from("user-media")
            .upload(attachmentPath, attachment);

          if (attachmentError) throw attachmentError;

          const { data: { publicUrl: attachmentPublicUrl } } = supabase.storage
            .from("user-media")
            .getPublicUrl(attachmentPath);

          attachmentUrl = attachmentPublicUrl;
          attachmentFilename = attachment.name;
        }

        // Save segment metadata
        const { error: updateError } = await supabase
          .from("astrology_deliveries")
          .update({
            video_segments: uploadedSegments,
            draft_saved_at: new Date().toISOString(),
            attachment_url: attachmentUrl,
            attachment_filename: attachmentFilename,
          })
          .eq("id", deliveryId);

        if (updateError) throw updateError;
      } else {
        // Handle single blob (backward compatibility)
        const blob = data as Blob;
        
        if (blob.size === 0) {
          throw new Error("Video file is empty");
        }

        if (!isAdmin && blob.size > 100 * 1024 * 1024) {
          throw new Error("Video file is too large (max 100MB)");
        }

        const fileName = `draft-${deliveryId}-${Date.now()}.webm`;
        const filePath = `astrology-deliveries/drafts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("user-media")
          .upload(filePath, blob, {
            contentType: "video/webm",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("user-media")
          .getPublicUrl(filePath);

        const { error: updateError } = await supabase
          .from("astrology_deliveries")
          .update({
            draft_video_url: publicUrl,
            draft_saved_at: new Date().toISOString(),
          })
          .eq("id", deliveryId);

        if (updateError) throw updateError;
      }

      toast.success("Draft saved! You can review and submit later.", { id: "draft" });
      console.log("✅ === DRAFT SAVED ===");
      
      // Don't close the recorder after draft save - allow user to continue working
      await fetchDeliveries();
    } catch (error: any) {
      console.error("❌ Draft save failed:", error);
      toast.error(`Failed to save draft: ${error?.message}`, { id: "draft", duration: 5000 });
    } finally {
      setUploading(null);
    }
  };

  const handleVideoUpload = async (deliveryId: string, data: any, attachment?: File) => {
    try {
      setUploading(deliveryId);
      
      console.log("🎥 === VIDEO UPLOAD STARTED ===");
      console.log("Delivery ID:", deliveryId);

      toast.loading("Uploading video...", { id: "upload" });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Handle multiple segments
      if (Array.isArray(data)) {
        const segments = data as Array<{ id: string; blob: Blob; duration: number }>;
        const uploadedSegments = [];

        // Upload each segment
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const filePath = `${user.id}/${deliveryId}/final-segment-${i + 1}-${Date.now()}.webm`;

          const { error: uploadError } = await supabase.storage
            .from("user-media")
            .upload(filePath, segment.blob, {
              contentType: "video/webm",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("user-media")
            .getPublicUrl(filePath);

          uploadedSegments.push({
            id: segment.id,
            url: publicUrl,
            duration: segment.duration,
            order: i + 1,
          });
        }

        // Handle attachment upload if provided
        let attachmentUrl = null;
        let attachmentFilename = null;
        
        if (attachment) {
          const attachmentPath = `${user.id}/${deliveryId}/attachment-${Date.now()}-${attachment.name}`;
          const { error: attachmentError } = await supabase.storage
            .from("user-media")
            .upload(attachmentPath, attachment);

          if (attachmentError) throw attachmentError;

          const { data: { publicUrl: attachmentPublicUrl } } = supabase.storage
            .from("user-media")
            .getPublicUrl(attachmentPath);

          attachmentUrl = attachmentPublicUrl;
          attachmentFilename = attachment.name;
        }

        // Submit final video
        const { error: updateError } = await supabase
          .from("astrology_deliveries")
          .update({
            admin_video_url: uploadedSegments[0].url, // Use first segment as main URL
            video_segments: uploadedSegments,
            status: "delivered",
            delivered_at: new Date().toISOString(),
            attachment_url: attachmentUrl,
            attachment_filename: attachmentFilename,
          })
          .eq("id", deliveryId);

        if (updateError) throw updateError;
      } else {
        // Handle single blob
        const blob = data as Blob;
        
        if (blob.size === 0) {
          throw new Error("Video file is empty");
        }

        if (!isAdmin && blob.size > 100 * 1024 * 1024) {
          throw new Error("Video file is too large (max 100MB)");
        }

        const fileName = `${deliveryId}-${Date.now()}.webm`;
        const filePath = `astrology-deliveries/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("user-media")
          .upload(filePath, blob, {
            contentType: "video/webm",
            upsert: true,
          });

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
      }

      toast.success("Video uploaded successfully!", { id: "upload" });
      console.log("✅ === VIDEO UPLOADED ===");
      setRecordingDeliveryId(null);
      
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: delivery.buyer_id,
            title: "Astrology Reading Ready",
            message: "Your personalized astrology reading is ready! You can now view and download it.",
            type: "ready",
            related_delivery_id: deliveryId,
          });

        if (notifError) console.warn("⚠️ Notification error:", notifError);
      }

      toast.success("Video uploaded and delivered!", { id: "upload" });
      console.log("🎉 === UPLOAD COMPLETE ===");
      
      setRecordingDeliveryId(null);
      await fetchDeliveries();
    } catch (error: any) {
      console.error("❌ Upload failed:", error);
      toast.error(`Upload failed: ${error?.message}`, { id: "upload", duration: 5000 });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDraft = async (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery?.draft_video_url) return;

    try {
      setUploading(deliveryId);
      toast.loading("Deleting draft...", { id: "delete-draft" });

      // Extract file path from URL
      const url = new URL(delivery.draft_video_url);
      const filePath = url.pathname.split('/storage/v1/object/public/user-media/')[1];

      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from("user-media")
          .remove([filePath]);

        if (deleteError) console.warn("⚠️ Storage delete error:", deleteError);
      }

      const { error: updateError } = await supabase
        .from("astrology_deliveries")
        .update({
          draft_video_url: null,
          draft_saved_at: null,
        })
        .eq("id", deliveryId);

      if (updateError) throw updateError;

      toast.success("Draft deleted", { id: "delete-draft" });
      await fetchDeliveries();
    } catch (error: any) {
      console.error("❌ Delete draft failed:", error);
      toast.error(`Failed to delete: ${error?.message}`, { id: "delete-draft" });
    } finally {
      setUploading(null);
    }
  };

  const handleSubmitDraft = async (deliveryId: string) => {
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery?.draft_video_url) return;

    try {
      setUploading(deliveryId);
      toast.loading("Submitting draft to buyer...", { id: "submit-draft" });

      const { error: updateError } = await supabase
        .from("astrology_deliveries")
        .update({
          admin_video_url: delivery.draft_video_url,
          status: "delivered",
          delivered_at: new Date().toISOString(),
          draft_video_url: null,
        })
        .eq("id", deliveryId);

      if (updateError) throw updateError;

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: delivery.buyer_id,
          title: "Astrology Reading Ready",
          message: "Your personalized astrology reading is ready! You can now view and download it.",
          type: "ready",
          related_delivery_id: deliveryId,
        });

      if (notifError) console.warn("⚠️ Notification error:", notifError);

      toast.success("Draft submitted to buyer!", { id: "submit-draft" });
      await fetchDeliveries();
    } catch (error: any) {
      console.error("❌ Submit draft failed:", error);
      toast.error(`Failed to submit: ${error?.message}`, { id: "submit-draft" });
    } finally {
      setUploading(null);
    }
  };

  const getStatusBadge = (delivery: Delivery) => {
    if (delivery.status === "delivered") {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
    }
    // Check for either draft_video_url OR video_segments
    if (delivery.draft_video_url || (delivery.video_segments && Array.isArray(delivery.video_segments) && delivery.video_segments.length > 0)) {
      return <Badge variant="secondary"><FileText className="w-3 h-3 mr-1" />Draft Saved</Badge>;
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
                  {delivery.draft_saved_at && delivery.status === "pending" && (
                    <p className="text-blue-600">
                      Draft saved: {new Date(delivery.draft_saved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Auto-saved segments preview */}
                {delivery.status === "pending" && 
                 !delivery.draft_video_url && 
                 delivery.video_segments && 
                 Array.isArray(delivery.video_segments) && 
                 delivery.video_segments.length > 0 && 
                 recordingDeliveryId !== delivery.id && (
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {delivery.video_segments.length} segment{delivery.video_segments.length !== 1 ? 's' : ''} auto-saved to cloud
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => setRecordingDeliveryId(delivery.id)}
                        disabled={uploading === delivery.id}
                        className="w-full sm:w-auto"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Continue Editing
                      </Button>
                      <Button
                        onClick={() => handleClearDraft(delivery.id)}
                        variant="outline"
                        disabled={uploading === delivery.id}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear & Start Over
                      </Button>
                    </div>
                  </div>
                )}

                {delivery.draft_video_url && delivery.status === "pending" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Draft Preview:</p>
                      <video
                        src={delivery.draft_video_url}
                        controls
                        className="w-full max-w-2xl rounded-lg"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => setRecordingDeliveryId(delivery.id)}
                        variant="outline"
                        disabled={uploading === delivery.id}
                        className="w-full sm:w-auto"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Re-record
                      </Button>
                      <Button
                        onClick={() => setUploadingDeliveryId(delivery.id)}
                        variant="outline"
                        disabled={uploading === delivery.id}
                        className="w-full sm:w-auto"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Re-upload
                      </Button>
                      <Button
                        onClick={() => handleDeleteDraft(delivery.id)}
                        variant="outline"
                        disabled={uploading === delivery.id}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Draft
                      </Button>
                      <Button
                        onClick={() => handleSubmitDraft(delivery.id)}
                        disabled={uploading === delivery.id}
                        className="w-full sm:w-auto"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit to Buyer
                      </Button>
                    </div>
                  </div>
                )}

                {delivery.status === "pending" && 
                 !delivery.draft_video_url && 
                 (!delivery.video_segments || !Array.isArray(delivery.video_segments) || delivery.video_segments.length === 0) &&
                 recordingDeliveryId !== delivery.id && 
                 uploadingDeliveryId !== delivery.id && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => setRecordingDeliveryId(delivery.id)}
                      disabled={uploading === delivery.id}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Record Video
                    </Button>
                    <Button 
                      onClick={() => setUploadingDeliveryId(delivery.id)}
                      disabled={uploading === delivery.id}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Video
                    </Button>
                  </div>
                )}

                {recordingDeliveryId === delivery.id && (
                  <VideoRecorder
                    onVideoRecorded={(data, isDraft, attachment) => {
                      if (isDraft) {
                        handleDraftSave(delivery.id, data, attachment);
                      } else {
                        handleVideoUpload(delivery.id, data, attachment);
                      }
                    }}
                    onCancel={() => setRecordingDeliveryId(null)}
                    onClearDraft={async () => await handleClearDraft(delivery.id)}
                    onAutoSaveSegment={(segment, index) => handleAutoSaveSegment(delivery.id, segment, index)}
                    isUploading={uploading === delivery.id}
                    existingSegments={delivery.video_segments as any || []}
                  />
                )}

                {uploadingDeliveryId === delivery.id && (
                  <VideoFileUploader
                    deliveryId={delivery.id}
                    onDraftSave={(blob) => handleDraftSave(delivery.id, blob)}
                    onSubmit={(blob) => handleVideoUpload(delivery.id, blob)}
                    onCancel={() => setUploadingDeliveryId(null)}
                    isUploading={uploading === delivery.id}
                  />
                )}

                {delivery.admin_video_url && delivery.status === "delivered" && (
                  <div>
                    <p className="text-sm font-medium mb-2">Delivered Video:</p>
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