import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Video, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface VideoAdSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  opportunity: {
    id: string;
    title: string;
    description: string;
    audio_file_url: string;
    payment_amount: number;
    target_platform: string;
  };
}

const VideoAdSubmissionModal = ({ isOpen, onClose, onSuccess, opportunity }: VideoAdSubmissionModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  
  const [formData, setFormData] = useState({
    why_me_text: '',
    negotiation_text: ''
  });

  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFileSize = (file: File) => {
    if (file.size > MAX_VIDEO_SIZE) {
      toast({
        title: "File too large",
        description: "Video file must be smaller than 50MB",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFileSize(file)) {
      setVideoFile(file);
    } else {
      e.target.value = '';
      setVideoFile(null);
    }
  };

  const toggleAudio = () => {
    if (!audioRef) {
      const audio = new Audio(opportunity.audio_file_url);
      audio.onended = () => setIsPlaying(false);
      setAudioRef(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioRef.pause();
        setIsPlaying(false);
      } else {
        audioRef.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile) {
      toast({
        title: "Error",
        description: "Please select a video file to submit",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload video file
      const videoFileExt = videoFile.name.split('.').pop();
      const videoFileName = `video-ad-submissions/${user.id}/${Date.now()}.${videoFileExt}`;
      
      const { data: videoData, error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoFileName, videoFile);

      if (videoError) throw videoError;

      const { data: { publicUrl: videoPublicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(videoData.path);

      // Record upload in user_uploads table
      await supabase
        .from('user_uploads')
        .insert({
          user_id: user.id,
          file_name: videoFile.name,
          file_path: videoData.path,
          file_size: videoFile.size,
          file_type: videoFile.type,
          storage_bucket: 'videos'
        });

      // Create video ad submission
      const { error: insertError } = await supabase
        .from('video_ad_submissions')
        .insert({
          video_ad_opportunity_id: opportunity.id,
          merchant_id: user.id,
          video_file_url: videoPublicUrl,
          why_me_text: formData.why_me_text || null,
          negotiation_text: formData.negotiation_text || null,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Your video submission has been sent for review!"
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error submitting video:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      why_me_text: '',
      negotiation_text: ''
    });
    setVideoFile(null);
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }
    setIsPlaying(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Submit Video for: {opportunity.title}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-white">Opportunity Audio</h4>
            <Button
              type="button"
              onClick={toggleAudio}
              variant="outline"
              size="sm"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'} Audio
            </Button>
          </div>
          <p className="text-sm text-gray-400">
            Platform: <span className="text-white capitalize">{opportunity.target_platform}</span> | 
            Payment: <span className="text-green-400">${opportunity.payment_amount}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="videoFile">Video Submission * (Max 50MB)</Label>
            <Input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Upload your video with the provided audio playing in the background
            </p>
          </div>

          <div>
            <Label htmlFor="why_me_text">Why should you get this opportunity?</Label>
            <Textarea
              id="why_me_text"
              value={formData.why_me_text}
              onChange={(e) => setFormData({ ...formData, why_me_text: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Explain why you're the best fit for this video ad opportunity..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="negotiation_text">Payment Negotiation (Optional)</Label>
            <Textarea
              id="negotiation_text"
              value={formData.negotiation_text}
              onChange={(e) => setFormData({ ...formData, negotiation_text: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="If you'd like to negotiate the payment, explain your reasoning (e.g., social media following, engagement rates, etc.)..."
              rows={3}
            />
            <p className="text-xs text-gray-400 mt-1">
              Reference your social media traction from your profile to support your negotiation
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !videoFile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Video
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAdSubmissionModal;