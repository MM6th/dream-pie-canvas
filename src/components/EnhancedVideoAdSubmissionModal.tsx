import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoEditor } from './VideoEditor';
import { Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Video, Music, Send } from 'lucide-react';

// Simple audio preview component
const SimpleAudioPlayer: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center space-x-2 mt-2">
      <Button 
        size="sm" 
        variant="outline" 
        onClick={togglePlay}
        className="flex items-center space-x-1"
      >
        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </Button>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
};

interface VideoAdOpportunity {
  id: string;
  title: string;
  description: string | null;
  audio_file_url: string;
  artist_name?: string | null;
  target_platform: string;
  payment_amount: number;
}

interface EnhancedVideoAdSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  opportunity: VideoAdOpportunity | null;
}

interface MixingPreferences {
  backgroundAudioVolume: number;
  videoAudioVolume: number;
  audioSyncOffset: number;
}

export const EnhancedVideoAdSubmissionModal: React.FC<EnhancedVideoAdSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  opportunity
}) => {
  // Don't render if opportunity is null
  if (!opportunity) {
    return null;
  }
  const [step, setStep] = useState<'upload' | 'edit' | 'submit'>('upload');
  const [loading, setLoading] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [mixingPreferences, setMixingPreferences] = useState<MixingPreferences>({
    backgroundAudioVolume: 0.5,
    videoAudioVolume: 0.5,
    audioSyncOffset: 0
  });
  const [formData, setFormData] = useState({
    whyMeText: '',
    negotiationText: ''
  });

  const validateFileSize = (file: File): boolean => {
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    return file.size <= maxSize;
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFileSize(file)) {
      toast.error('File size must be 50MB or less');
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    setSelectedVideoFile(file);
    toast.success('Video file selected successfully');
  };

  const handleMixingChange = useCallback((mixing: MixingPreferences) => {
    setMixingPreferences(mixing);
  }, []);

  const handleNext = () => {
    if (step === 'upload' && selectedVideoFile) {
      setStep('edit');
    } else if (step === 'edit') {
      setStep('submit');
    }
  };

  const handleBack = () => {
    if (step === 'edit') {
      setStep('upload');
    } else if (step === 'submit') {
      setStep('edit');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedVideoFile) {
      toast.error('Please select a video file');
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to submit');
        return;
      }

      // Upload video file
      const videoFileName = `${Date.now()}.${selectedVideoFile.name.split('.').pop()}`;
      const videoPath = `video-ad-submissions/${opportunity.id}/${videoFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(videoPath, selectedVideoFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get video file URL
      const { data: { publicUrl: videoFileUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(videoPath);

      // Create submission record
      const { error: submissionError } = await supabase
        .from('video_ad_submissions')
        .insert({
          video_ad_opportunity_id: opportunity.id,
          merchant_id: user.id,
          video_file_url: videoFileUrl,
          why_me_text: formData.whyMeText,
          negotiation_text: formData.negotiationText,
          background_audio_volume: mixingPreferences.backgroundAudioVolume,
          video_audio_volume: mixingPreferences.videoAudioVolume,
          audio_sync_offset: mixingPreferences.audioSyncOffset,
          mixing_preferences: JSON.stringify(mixingPreferences),
          status: 'pending'
        });

      if (submissionError) {
        throw submissionError;
      }

      toast.success('Video ad submission created successfully!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating submission:', error);
      toast.error('Failed to create submission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('upload');
    setSelectedVideoFile(null);
    setMixingPreferences({
      backgroundAudioVolume: 0.5,
      videoAudioVolume: 0.5,
      audioSyncOffset: 0
    });
    setFormData({
      whyMeText: '',
      negotiationText: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Create Video Ad - {opportunity.title}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Opportunity Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Opportunity Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Artist:</span> {opportunity.artist_name}
              </div>
              <div>
                <span className="font-medium">Platform:</span> {opportunity.target_platform}
              </div>
              <div>
                <span className="font-medium">Payment:</span> ${opportunity.payment_amount}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Audio Track:</span>
                <SimpleAudioPlayer audioUrl={opportunity.audio_file_url} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Upload Video */}
        {step === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Step 1: Upload Your Video</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label htmlFor="video-upload">Select Video File (Max 50MB)</Label>
                  <Input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                  />
                  
                  {selectedVideoFile && (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm">
                        <strong>Selected:</strong> {selectedVideoFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Size: {(selectedVideoFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!selectedVideoFile}>
                Next: Edit Video
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Edit Video */}
        {step === 'edit' && selectedVideoFile && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Music className="h-5 w-5" />
                <span>Step 2: Mix Your Video with Background Audio</span>
              </h3>
            </div>

            <VideoEditor
              videoFile={selectedVideoFile}
              audioUrl={opportunity.audio_file_url}
              onMixingChange={handleMixingChange}
            />

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back: Change Video
              </Button>
              <Button onClick={handleNext}>
                Next: Submit
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Submit */}
        {step === 'submit' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Step 3: Finalize Submission</span>
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="why-me">Why should you be chosen for this opportunity?</Label>
                <Textarea
                  id="why-me"
                  placeholder="Explain why you're the perfect fit for this video ad opportunity..."
                  value={formData.whyMeText}
                  onChange={(e) => setFormData(prev => ({ ...prev, whyMeText: e.target.value }))}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="negotiation">Payment negotiation or additional notes (optional)</Label>
                <Textarea
                  id="negotiation"
                  placeholder="Any additional notes or payment negotiation details..."
                  value={formData.negotiationText}
                  onChange={(e) => setFormData(prev => ({ ...prev, negotiationText: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Mixing Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audio Mixing Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>Background Music Volume: {Math.round(mixingPreferences.backgroundAudioVolume * 100)}%</p>
                    <p>Video Audio Volume: {Math.round(mixingPreferences.videoAudioVolume * 100)}%</p>
                    <p>Audio Sync Offset: {mixingPreferences.audioSyncOffset}ms</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back: Edit Video
              </Button>
              <div className="space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Video Ad'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};