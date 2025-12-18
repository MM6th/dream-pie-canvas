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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Send, 
  Phone, 
  AlertTriangle, 
  User,
  Loader2,
  CalendarIcon,
  Clock,
  Coins,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

const INVITE_CREDIT_COST = 5; // Credits required to send a podcast invitation

export const GoogleVoicePodcastInviteModal = ({
  open,
  onOpenChange,
  sessionTitle,
  googleVoiceNumber,
}: GoogleVoicePodcastInviteModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { balance: credits, refetch: refreshCredits } = useMessagingCredits(user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState("");

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

  const formatScheduledDateTime = () => {
    if (!scheduledDate) return null;
    
    const dateStr = format(scheduledDate, "EEEE, MMMM d, yyyy");
    if (scheduledTime) {
      return `${dateStr} at ${scheduledTime}`;
    }
    return dateStr;
  };

  const sendInvite = async (recipientId: string, recipientName: string) => {
    if (!user) return;

    // Check credits before sending
    if (credits < INVITE_CREDIT_COST) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${INVITE_CREDIT_COST} credits to send an invitation. Purchase more credits to continue.`,
        variant: "destructive"
      });
      return;
    }

    setSendingTo(recipientId);
    try {
      // Deduct credits first
      const { data: currentCredits } = await supabase
        .from('messaging_credits')
        .select('total_spent')
        .eq('user_id', user.id)
        .single();

      const { error: creditError } = await supabase
        .from('messaging_credits')
        .update({ 
          balance: credits - INVITE_CREDIT_COST,
          total_spent: (currentCredits?.total_spent || 0) + INVITE_CREDIT_COST
        })
        .eq('user_id', user.id);

      if (creditError) throw creditError;

      // Record the credit transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: -INVITE_CREDIT_COST,
          type: 'podcast_invitation',
          description: `Podcast invitation sent for "${sessionTitle}"`
        });

      // Format phone number for tel: link
      const phoneDigits = googleVoiceNumber.replace(/\D/g, '');
      const telLink = `tel:+1${phoneDigits}`;

      // Build scheduled date/time section
      const scheduledSection = formatScheduledDateTime() 
        ? `📅 **Scheduled:** ${formatScheduledDateTime()}\n\n` 
        : '';

      // Create the invite message with exclusive deal terms
      const messageBody = `
🎙️ **Podcast Recording Invitation**

You're invited to join a podcast recording session!

**Topic:** ${sessionTitle}

${scheduledSection}${customMessage ? `**Note from host:** ${customMessage}\n\n` : ''}📞 **Call to Join:** ${telLink}

⚠️ **IMPORTANT: This call will be recorded for podcast purposes.**

💰 **EXCLUSIVE DEAL - Revenue Split Agreement:**
When you accept this invitation, you agree to a 50/50 revenue split for each podcast episode sold:
• After PayPal processing fees (~3%)
• After PIE's 10% platform fee
• Remaining revenue split 50/50 between host and guest

Example: For a $5 episode purchase:
• PayPal fee: ~$0.15 (3%)
• PIE Platform: $0.49 (10% of $4.85)
• Host: $2.18 (50% of $4.36)
• Guest (You): $2.18 (50% of $4.36)

**Instructions:**
1. Click the blue "Click to Call" link above to dial
2. The host will record the call through Google Voice
3. After recording, you'll receive a contract to sign
4. Speak clearly and have fun!

**[ACCEPT_PODCAST_DEAL:${sessionTitle}]**

By accepting this invitation, you agree to the revenue split terms above.

Looking forward to chatting with you!
      `.trim();

      // Create podcast invitation record
      const { data: invitation, error: invitationError } = await supabase
        .from('podcast_invitations')
        .insert({
          host_user_id: user.id,
          guest_user_id: recipientId,
          session_title: sessionTitle,
          status: 'pending'
        })
        .select()
        .single();

      // Send via edge function
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          recipientId,
          subject: `🎙️ Podcast Invite: ${sessionTitle}`,
          body: messageBody,
        }
      });

      if (error) throw error;

      refreshCredits();
      toast({
        title: "Invite Sent!",
        description: `Your podcast invitation has been sent to ${recipientName} (${INVITE_CREDIT_COST} credits used).`,
      });

      // Clear search and close modal
      setSearchQuery("");
      setSearchResults([]);
      setCustomMessage("");
      setScheduledDate(undefined);
      setScheduledTime("");
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Invite Guest to Podcast
          </DialogTitle>
          <DialogDescription>
            Search for a user to invite to your podcast recording. They'll receive a message with instructions to call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Credit Requirement Info */}
          <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <Coins className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Credit Required:</strong> Sending a podcast invitation costs {INVITE_CREDIT_COST} credits per invite.
            </p>
          </div>

          {/* Credits Display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">Your Credits</span>
            </div>
            <Badge variant={credits >= INVITE_CREDIT_COST ? "default" : "destructive"}>
              {credits} credits
            </Badge>
          </div>

          {credits < INVITE_CREDIT_COST && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-destructive text-sm">
                You need at least {INVITE_CREDIT_COST} credits to send invitations. Purchase more credits from your dashboard.
              </p>
            </div>
          )}

          {/* Recording Notice */}
          <Alert variant="default" className="border-amber-500/20 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
              Your guest will be informed that the call will be recorded for podcast purposes.
            </AlertDescription>
          </Alert>

          {/* Exclusive Deal Info */}
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
            <h4 className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
              💰 Revenue Split Agreement
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your guest will be offered a <strong>50/50 revenue split</strong> after:
            </p>
            <ul className="text-xs text-green-600 dark:text-green-400 list-disc list-inside space-y-1">
              <li>PayPal processing fees (~3%)</li>
              <li>PIE's 10% platform fee</li>
              <li>Remaining revenue split equally between you and your guest</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              A downloadable contract will be generated when your guest accepts.
            </p>
          </div>

          {/* Session Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Session: {sessionTitle}</p>
          </div>

          {/* Schedule Date & Time */}
          <div className="space-y-3">
            <Label>Schedule Date & Time (optional)</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="pl-10 w-[130px]"
                  placeholder="Time"
                />
              </div>
            </div>
            {scheduledDate && (
              <p className="text-xs text-muted-foreground">
                Scheduled: {formatScheduledDateTime()}
              </p>
            )}
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
                  disabled={sendingTo === profile.id || credits < INVITE_CREDIT_COST}
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
