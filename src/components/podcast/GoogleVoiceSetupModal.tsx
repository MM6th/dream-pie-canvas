import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Phone, Info, ExternalLink, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoogleVoiceSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetupComplete?: (phoneNumber: string) => void;
}

export const GoogleVoiceSetupModal = ({
  open,
  onOpenChange,
  onSetupComplete,
}: GoogleVoiceSetupModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [existingNumber, setExistingNumber] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing Google Voice number
  useEffect(() => {
    const fetchExistingNumber = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('google_voice_number')
          .eq('id', user.id)
          .single();

        if (!error && data?.google_voice_number) {
          setExistingNumber(data.google_voice_number);
          setPhoneNumber(data.google_voice_number);
        }
      } catch (error) {
        console.error('Error fetching Google Voice number:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchExistingNumber();
    }
  }, [open, user]);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate phone number (should have 10 digits)
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ google_voice_number: phoneNumber })
        .eq('id', user.id);

      if (error) throw error;

      setExistingNumber(phoneNumber);
      toast({
        title: "Google Voice Number Saved",
        description: "Your Google Voice number has been saved successfully.",
      });
      
      onSetupComplete?.(phoneNumber);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Google Voice number:', error);
      toast({
        title: "Error",
        description: "Could not save your Google Voice number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Set Up Google Voice for Podcasting
          </DialogTitle>
          <DialogDescription>
            Use Google Voice to record podcast calls with guests. It's free and allows call recording.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Get a free Google Voice number if you don't have one</li>
                <li>Enable call recording in Google Voice settings</li>
                <li>Invite guests through this app - they'll receive a clickable call link</li>
                <li>During the call, press <strong>4</strong> to start/stop recording</li>
                <li>Download recordings from Google Voice and upload here</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Setup Instructions */}
          <Alert variant="default" className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Enable Call Recording</AlertTitle>
            <AlertDescription className="text-sm">
              <p className="mb-2">To record calls in Google Voice:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Google Voice → Settings</li>
                <li>Go to "Calls" section</li>
                <li>Enable "Incoming call options"</li>
              </ol>
              <a 
                href="https://voice.google.com/settings" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
              >
                Open Google Voice Settings <ExternalLink className="w-3 h-3" />
              </a>
            </AlertDescription>
          </Alert>

          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="google-voice-number">Your Google Voice Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="google-voice-number"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 555-5555"
                className="pl-10"
                maxLength={14}
                disabled={isLoading}
              />
            </div>
            {existingNumber && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" />
                Currently set to: {existingNumber}
              </p>
            )}
          </div>

          {/* Get Google Voice Link */}
          <div className="text-center">
            <a 
              href="https://voice.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Don't have Google Voice? Get it free here <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || phoneNumber.replace(/\D/g, '').length !== 10}
          >
            {isSaving ? "Saving..." : "Save Number"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleVoiceSetupModal;
