import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Phone, Users, UserPlus, Settings, Upload, 
  Info, ExternalLink, Check, AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GoogleVoiceSetupModal } from "./GoogleVoiceSetupModal";
import { GoogleVoicePodcastInviteModal } from "./GoogleVoicePodcastInviteModal";

interface CollaborativePodcastStudioProps {
  onRecordingSaved?: () => void;
}

export const CollaborativePodcastStudio = ({ onRecordingSaved }: CollaborativePodcastStudioProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [googleVoiceNumber, setGoogleVoiceNumber] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing Google Voice number
  useEffect(() => {
    const fetchGoogleVoiceNumber = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('google_voice_number')
          .eq('id', user.id)
          .single();

        if (!error && data?.google_voice_number) {
          setGoogleVoiceNumber(data.google_voice_number);
        }
      } catch (error) {
        console.error('Error fetching Google Voice number:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoogleVoiceNumber();
  }, [user]);

  const handleSetupComplete = (phoneNumber: string) => {
    setGoogleVoiceNumber(phoneNumber);
    toast({
      title: "Setup Complete",
      description: "You can now invite guests to your podcast!",
    });
  };

  const handleInviteClick = () => {
    if (!sessionTitle.trim()) {
      toast({
        title: "Session Title Required",
        description: "Please enter a topic for your podcast session.",
        variant: "destructive",
      });
      return;
    }
    setShowInviteModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid File",
        description: "Please select an audio file (MP3, WAV, M4A, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 100MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `podcast-recordings/${user.id}/${timestamp}-uploaded.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      // Create audio element to get duration
      const audio = new Audio(URL.createObjectURL(file));
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => resolve();
      });

      const duration = Math.round(audio.duration) || null;

      // Save to database
      const { error: dbError } = await supabase
        .from('podcast_recordings')
        .insert({
          merchant_id: user.id,
          title: sessionTitle.trim() || `Uploaded Recording - ${new Date().toLocaleDateString()}`,
          description: 'Uploaded from Google Voice recording',
          audio_url: publicUrl,
          duration_seconds: duration,
          file_size_bytes: file.size,
          status: 'draft'
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload Complete",
        description: "Your recording has been uploaded successfully.",
      });

      setSessionTitle("");
      onRecordingSaved?.();
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload your recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border backdrop-blur-sm">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 border-border backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5" />
            Collaborative Podcast Studio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Voice Status */}
          {googleVoiceNumber ? (
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">Google Voice Connected</p>
                  <p className="text-xs text-muted-foreground">{googleVoiceNumber}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowSetupModal(true)}>
                <Settings className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Set Up Google Voice</AlertTitle>
              <AlertDescription>
                To invite guests to your podcast, you need to set up your Google Voice number first.
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-primary ml-1"
                  onClick={() => setShowSetupModal(true)}
                >
                  Set up now →
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* How It Works */}
          <Alert variant="default" className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">How It Works</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Set up your Google Voice number (free from Google)</li>
                <li>Enter a topic and invite guests via this app</li>
                <li>Guests call your Google Voice number</li>
                <li>Press <strong>4</strong> during the call to record</li>
                <li>Download from Google Voice and upload here</li>
              </ol>
              <a 
                href="https://voice.google.com/voicemail" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
              >
                Open Google Voice to download recordings <ExternalLink className="w-3 h-3" />
              </a>
            </AlertDescription>
          </Alert>

          {/* Session Setup */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-topic">Podcast Topic / Episode Title</Label>
              <Input
                id="session-topic"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g., Interview with John about AI trends"
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Invite Guest Button */}
              <Button
                onClick={handleInviteClick}
                disabled={!googleVoiceNumber}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Invite Guest
              </Button>

              {/* Upload Recording Button */}
              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? "Uploading..." : "Upload Recording"}
                </Button>
              </div>
            </div>

            {!googleVoiceNumber && (
              <p className="text-xs text-muted-foreground text-center">
                Set up your Google Voice number to invite guests
              </p>
            )}
          </div>

          {/* Setup Instructions */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSetupModal(true)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Phone className="w-4 h-4" />
              {googleVoiceNumber ? 'Update Google Voice Settings' : 'Set Up Google Voice'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <GoogleVoiceSetupModal
        open={showSetupModal}
        onOpenChange={setShowSetupModal}
        onSetupComplete={handleSetupComplete}
      />

      {googleVoiceNumber && (
        <GoogleVoicePodcastInviteModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          sessionTitle={sessionTitle}
          googleVoiceNumber={googleVoiceNumber}
        />
      )}
    </>
  );
};

export default CollaborativePodcastStudio;
