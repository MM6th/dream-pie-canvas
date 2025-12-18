import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, Send, AlertCircle, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";

interface Script {
  id: string;
  title: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface ScriptInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: Script;
}

const INVITE_CREDIT_COST = 5; // Credits required to send an invitation

const ScriptInviteModal = ({ isOpen, onClose, script }: ScriptInviteModalProps) => {
  const { user } = useAuth();
  const { balance: credits, refetch: refreshCredits } = useMessagingCredits(user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const fetchPendingInvites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('script_invitations')
        .select('invitee_id')
        .eq('script_id', script.id)
        .eq('inviter_id', user.id);

      if (!error && data) {
        setPendingInvites(data.map(inv => inv.invitee_id));
      }
    } catch (error) {
      console.error('Error fetching pending invites:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingInvites();
    }
  }, [isOpen, script.id]);

  // Auto-search with debouncing (like PodcastInviteModal)
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2 || !user) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, email')
          .or(`display_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .neq('id', user.id)
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

  const handleInvite = async (invitee: UserProfile) => {
    if (!user) return;

    if (credits < INVITE_CREDIT_COST) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${INVITE_CREDIT_COST} credits to send an invitation. Purchase more credits to continue.`,
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

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
          type: 'script_invitation',
          description: `Script invitation sent for "${script.title}"`
        });

      // Create the invitation
      const { error: inviteError } = await supabase
        .from('script_invitations')
        .insert({
          script_id: script.id,
          inviter_id: user.id,
          invitee_id: invitee.id,
          credits_spent: INVITE_CREDIT_COST,
          status: 'pending'
        });

      if (inviteError) throw inviteError;

      // Create notification for invitee
      await supabase
        .from('notifications')
        .insert({
          user_id: invitee.id,
          type: 'script_invitation',
          title: 'Script Reading Invitation',
          message: `You've been invited to read the script "${script.title}". Check your dashboard to accept or decline.`
        });

      toast({ 
        title: "Invitation Sent", 
        description: `${invitee.display_name || invitee.email} has been invited to read your script.` 
      });

      setPendingInvites([...pendingInvites, invitee.id]);
      refreshCredits();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Invite Script Readers
          </DialogTitle>
          <DialogDescription>
            Invite users to read "{script.title}". Each invitation costs {INVITE_CREDIT_COST} credits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credits Display */}
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="text-white">Your Credits</span>
            </div>
            <Badge variant={credits >= INVITE_CREDIT_COST ? "default" : "destructive"}>
              {credits} credits
            </Badge>
          </div>

          {credits < INVITE_CREDIT_COST && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">
                You need at least {INVITE_CREDIT_COST} credits to send invitations. Purchase more credits from your dashboard.
              </p>
            </div>
          )}

          {/* Search */}
          <div>
            <Label className="text-white">Search Users</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="bg-gray-700 border-gray-600 text-white pl-10"
              />
            </div>
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <p className="text-xs text-gray-400 mt-1">Type at least 2 characters to search</p>
            )}
          </div>

          {/* Search Results */}
          <ScrollArea className="max-h-[300px]">
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {(profile.display_name || profile.email)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">
                          {profile.display_name || 'Unnamed User'}
                        </p>
                        <p className="text-gray-400 text-sm">{profile.email}</p>
                      </div>
                    </div>
                    {pendingInvites.includes(profile.id) ? (
                      <Badge variant="secondary">Invited</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleInvite(profile)}
                        disabled={isSending || credits < INVITE_CREDIT_COST}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Invite
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 && !isSearching ? (
              <p className="text-gray-400 text-center py-4">No users found matching "{searchQuery}"</p>
            ) : isSearching ? (
              <p className="text-gray-400 text-center py-4">Searching...</p>
            ) : null}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScriptInviteModal;
