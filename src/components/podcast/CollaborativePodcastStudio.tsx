import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Users, UserPlus, Settings, 
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

            {/* Invite Guest Button */}
            <Button
              onClick={handleInviteClick}
              disabled={!googleVoiceNumber}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Guest
            </Button>

          {!googleVoiceNumber && (
              <p className="text-xs text-muted-foreground text-center">
                Set up your Google Voice number to invite guests
              </p>
            )}
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
