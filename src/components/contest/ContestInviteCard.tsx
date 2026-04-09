import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trophy, Users, Send, X, Loader2 } from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  challenge_type: string;
  scheduled_at: string;
  champion_user_id: string | null;
  challenger_user_ids?: string[];
}

interface UserOption {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Invitation {
  id: string;
  invitee_id: string;
  status: string;
  invitee?: UserOption;
}

const ContestInviteCard = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch challenges where user is champion or accepted challenger
  useEffect(() => {
    if (!user?.id) return;
    const fetchChallenges = async () => {
      const now = new Date().toISOString();

      // Get challenges where user is champion
      const { data: championPosts } = await supabase
        .from("bulletin_posts")
        .select("id, title, challenge_type, scheduled_at, champion_user_id")
        .not("challenge_type", "is", null)
        .not("scheduled_at", "is", null)
        .is("session_ended_at", null)
        .eq("champion_user_id", user.id)
        .gte("scheduled_at", now);

      // Get challenges where user is an accepted challenger
      const { data: acceptances } = await supabase
        .from("challenge_acceptances")
        .select("bulletin_post_id")
        .eq("user_id", user.id);

      let challengerPosts: Challenge[] = [];
      if (acceptances?.length) {
        const postIds = acceptances.map((a) => a.bulletin_post_id);
        const { data } = await supabase
          .from("bulletin_posts")
          .select("id, title, challenge_type, scheduled_at, champion_user_id")
          .in("id", postIds)
          .not("challenge_type", "is", null)
          .is("session_ended_at", null)
          .gte("scheduled_at", now);
        challengerPosts = (data || []) as Challenge[];
      }

      const all = [...(championPosts || []), ...challengerPosts] as Challenge[];
      // Deduplicate
      const unique = Array.from(new Map(all.map((c) => [c.id, c])).values());

      // Enrich each challenge with challenger user IDs
      for (const challenge of unique) {
        const { data: acceptanceData } = await supabase
          .from("challenge_acceptances")
          .select("user_id")
          .eq("bulletin_post_id", challenge.id);
        challenge.challenger_user_ids = (acceptanceData || []).map(a => a.user_id);
      }

      setChallenges(unique);
    };
    fetchChallenges();
  }, [user?.id]);

  // Fetch all site users to invite
  useEffect(() => {
    if (!user?.id) return;
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .neq("id", user.id)
        .order("display_name");

      setUsers((profiles || []) as UserOption[]);
    };
    fetchUsers();
  }, [user?.id]);

  // Fetch existing invitations for selected challenge
  useEffect(() => {
    if (!selectedChallenge) { setInvitations([]); return; }
    const fetchInvites = async () => {
      const { data } = await supabase
        .from("contest_invitations")
        .select("id, invitee_id, status")
        .eq("bulletin_post_id", selectedChallenge)
        .eq("inviter_id", user?.id || "");

      if (!data) return;

      // Enrich with profile data
      const inviteeIds = data.map((i) => i.invitee_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", inviteeIds);

      const enriched = data.map((inv) => ({
        ...inv,
        invitee: profiles?.find((p) => p.id === inv.invitee_id) as UserOption | undefined,
      }));
      setInvitations(enriched);
    };
    fetchInvites();
  }, [selectedChallenge, user?.id]);

  const sendInvite = async () => {
    if (!selectedChallenge || !selectedUser || !user?.id) return;
    setLoading(true);
    try {
      // Fetch challenge title and inviter name for richer notification
      const challenge = challenges.find(c => c.id === selectedChallenge);
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      const inviterName = inviterProfile?.display_name || "Someone";
      const challengeTitle = challenge?.title || "a live contest";

      const { data: inviteData, error } = await supabase.from("contest_invitations").insert({
        bulletin_post_id: selectedChallenge,
        inviter_id: user.id,
        invitee_id: selectedUser,
      }).select().single();
      if (error) throw error;

      // Send notification with linked invitation ID
      await supabase.from("notifications").insert({
        user_id: selectedUser,
        type: "contest_invite",
        title: "Contest Invitation",
        message: `${inviterName} has invited you to watch "${challengeTitle}" live! Accept or decline below.`,
        related_contest_invitation_id: inviteData.id,
      });

      toast.success("Invitation sent!");
      setSelectedUser("");
      // Refresh invitations
      const { data } = await supabase
        .from("contest_invitations")
        .select("id, invitee_id, status")
        .eq("bulletin_post_id", selectedChallenge)
        .eq("inviter_id", user.id);
      if (data) {
        const inviteeIds = data.map((i) => i.invitee_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", inviteeIds);
        setInvitations(data.map((inv) => ({
          ...inv,
          invitee: profiles?.find((p) => p.id === inv.invitee_id) as UserOption | undefined,
        })));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const removeInvite = async (inviteId: string) => {
    await supabase.from("contest_invitations").delete().eq("id", inviteId);
    setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    toast.success("Invitation removed");
  };

  if (!challenges.length) return null;

  const alreadyInvited = invitations.map((i) => i.invitee_id);
  // Exclude already invited + other participant(s) in the selected challenge
  const selectedChallengeData = challenges.find(c => c.id === selectedChallenge);
  const excludeIds = new Set(alreadyInvited);
  if (selectedChallengeData) {
    if (selectedChallengeData.champion_user_id) {
      excludeIds.add(selectedChallengeData.champion_user_id);
    }
    (selectedChallengeData.challenger_user_ids || []).forEach(id => excludeIds.add(id));
  }
  const availableUsers = users.filter((u) => !excludeIds.has(u.id));

  return (
    <Card className="bg-card border-border backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Contest Invitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Invite followers to watch your upcoming contest live.
        </p>

        {/* Challenge selector */}
        <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a contest..." />
          </SelectTrigger>
          <SelectContent>
            {challenges.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title} — {c.challenge_type?.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedChallenge && (
          <>
            {/* User selector */}
            <div className="flex gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a user to invite..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.avatar_url || ""} />
                          <AvatarFallback><Users className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                        {u.display_name || "User"}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={sendInvite} disabled={!selectedUser || loading} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {/* Sent invitations */}
            {invitations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Sent Invitations</p>
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={inv.invitee?.avatar_url || ""} />
                        <AvatarFallback><Users className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{inv.invitee?.display_name || "User"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inv.status === "accepted" ? "default" : "secondary"} className="text-xs">
                        {inv.status}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => removeInvite(inv.id)} className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ContestInviteCard;
