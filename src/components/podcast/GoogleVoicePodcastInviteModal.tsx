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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Send, 
  Phone, 
  AlertTriangle, 
  User,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoogleVoicePodcastInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionTitle: string;
  googleVoiceNumber: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
}

export const GoogleVoicePodcastInviteModal = ({
  open,
  onOpenChange,
  sessionTitle,
  googleVoiceNumber,
}: GoogleVoicePodcastInviteModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, user_type')
          .neq('id', user?.id)
          .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  const sendInvite = async (recipientId: string, recipientName: string) => {
    if (!user) return;

    setSendingTo(recipientId);
    try {
      // Format phone number for tel: link
      const phoneDigits = googleVoiceNumber.replace(/\D/g, '');
      const telLink = `tel:+1${phoneDigits}`;

      // Create the invite message
      const messageBody = `
🎙️ **Podcast Recording Invitation**

You're invited to join a podcast recording session!

**Topic:** ${sessionTitle}

${customMessage ? `**Note from host:** ${customMessage}\n\n` : ''}
📞 **Click to Call:** ${telLink}
Or dial: ${googleVoiceNumber}

⚠️ **IMPORTANT: This call will be recorded for podcast purposes.**

**Instructions:**
1. Click the phone number above or dial it manually
2. The host will record the call through Google Voice
3. Speak clearly and have fun!

Looking forward to chatting with you!
      `.trim();

      // Send via edge function
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          recipientId,
          subject: `🎙️ Podcast Invite: ${sessionTitle}`,
          body: messageBody,
        }
      });

      if (error) throw error;

      toast({
        title: "Invite Sent!",
        description: `Your podcast invitation has been sent to ${recipientName}.`,
      });

      // Clear search and close modal
      setSearchQuery("");
      setSearchResults([]);
      setCustomMessage("");
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: "Failed to Send",
        description: "Could not send the invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Invite Guest to Podcast
          </DialogTitle>
          <DialogDescription>
            Search for a user to invite to your podcast recording. They'll receive a message with your Google Voice number.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recording Notice */}
          <Alert variant="default" className="border-amber-500/20 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
              Your guest will be informed that the call will be recorded for podcast purposes.
            </AlertDescription>
          </Alert>

          {/* Session Info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="text-sm font-medium">Session: {sessionTitle}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {googleVoiceNumber}
            </p>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">Add a personal note (optional)</Label>
            <Textarea
              id="custom-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="E.g., Looking forward to discussing your latest project..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* User Search */}
          <div className="space-y-2">
            <Label htmlFor="user-search">Search for a guest</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="user-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {isSearching && (
              <div className="text-center py-4 text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No users found matching "{searchQuery}"
              </div>
            )}

            {searchResults.map((profile) => (
              <div 
                key={profile.id}
                className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {profile.display_name || 'Anonymous User'}
                    </p>
                    {profile.user_type && (
                      <Badge variant="secondary" className="text-xs">
                        {profile.user_type}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendInvite(profile.id, profile.display_name || 'Guest')}
                  disabled={sendingTo === profile.id}
                  className="gap-1"
                >
                  {sendingTo === profile.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleVoicePodcastInviteModal;
