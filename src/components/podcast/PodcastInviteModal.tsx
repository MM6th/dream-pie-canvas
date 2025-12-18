import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMessagingCredits } from '@/hooks/useMessagingCredits';
import { Search, Send, Copy, Link, Check, Coins, AlertCircle } from 'lucide-react';

interface PodcastInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  inviteToken: string;
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  user_type: string;
}

const INVITE_CREDIT_COST = 5; // Credits required to send a podcast invitation

export const PodcastInviteModal = ({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  inviteToken,
}: PodcastInviteModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { balance: credits, refetch: refreshCredits } = useMessagingCredits(user?.id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, user_type')
          .neq('id', user?.id)
          .ilike('display_name', `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  // Send invite via messaging
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

      const inviteLink = `${window.location.origin}/podcast-session/${inviteToken}`;
      
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          senderId: user.id,
          recipientId,
          subject: `🎙️ Podcast Recording Invite: ${sessionTitle}`,
          body: `You've been invited to join a collaborative podcast recording session!\n\n📻 Session: ${sessionTitle}\n\n🔗 Click the link below to join:\n${inviteLink}\n\nThis link will take you directly to the recording session where you can participate in real-time.`,
        }
      });

      if (error) throw error;

      setSentTo(prev => new Set([...prev, recipientId]));
      refreshCredits();
      toast({
        title: "Invite Sent",
        description: `Invitation sent to ${recipientName} (${INVITE_CREDIT_COST} credits used)`,
      });
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: "Failed to send invite. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingTo(null);
    }
  };

  // Copy invite link
  const copyInviteLink = () => {
    const link = `${window.location.origin}/podcast-session/${inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link Copied",
      description: "Invite link copied to clipboard.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Guests</DialogTitle>
          <DialogDescription>
            Send invites via messaging or share the invite link. Each invitation costs {INVITE_CREDIT_COST} credits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
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

          {/* Copy Link Section */}
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg min-w-0">
              <Link className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <code className="text-xs flex-1 truncate min-w-0 overflow-hidden">
                .../{inviteToken.slice(0, 8)}...
              </code>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyInviteLink}
                className="flex-shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search Users */}
          <div className="space-y-2">
            <Label>Search Users to Invite</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by display name..."
                className="pl-10"
              />
            </div>
          </div>

          {/* User Results */}
          {users.length > 0 && (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {users.map((profile) => (
                  <div 
                    key={profile.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile.display_name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{profile.display_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {profile.user_type}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={sentTo.has(profile.id) ? "outline" : "default"}
                      disabled={sendingTo === profile.id || sentTo.has(profile.id) || credits < INVITE_CREDIT_COST}
                      onClick={() => sendInvite(profile.id, profile.display_name)}
                      className="gap-1"
                    >
                      {sentTo.has(profile.id) ? (
                        <>
                          <Check className="w-3 h-3" />
                          Sent
                        </>
                      ) : sendingTo === profile.id ? (
                        'Sending...'
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
            </ScrollArea>
          )}

          {searchQuery.length >= 2 && users.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No users found matching "{searchQuery}"
            </p>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Searching...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
