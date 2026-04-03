
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Swords, UserCheck, X } from "lucide-react";

interface Acceptance {
  id: string;
  slot: string;
  user_id: string;
  accepted_at: string;
  profile?: {
    display_name: string;
    avatar_url: string;
  };
}

interface ChallengeAcceptanceButtonsProps {
  postId: string;
  hasTitleOnTheLine: boolean;
  championUserId?: string | null;
  merchantId: string;
}

const ChallengeAcceptanceButtons = ({ postId, hasTitleOnTheLine, championUserId, merchantId }: ChallengeAcceptanceButtonsProps) => {
  const { user } = useAuth();
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(false);

  const slotsNeeded = hasTitleOnTheLine ? 1 : 2;

  useEffect(() => {
    fetchAcceptances();
  }, [postId]);

  const fetchAcceptances = async () => {
    const { data, error } = await supabase
      .from('challenge_acceptances')
      .select('*')
      .eq('bulletin_post_id', postId);

    if (error) {
      console.error('Error fetching acceptances:', error);
      return;
    }

    // Fetch profiles for accepted users
    const withProfiles: Acceptance[] = [];
    for (const acc of data || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', acc.user_id)
        .single();
      withProfiles.push({ ...acc, profile: profile || undefined });
    }
    setAcceptances(withProfiles);
  };

  const handleAccept = async (slot: string) => {
    if (!user) {
      toast.error("You must be logged in to accept a challenge");
      return;
    }

    // Only approved merchants can participate
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, approval_status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'merchant' || profile.approval_status !== 'approved') {
      toast.error("Only approved merchants can participate in live challenges");
      return;
    }

    if (user.id === merchantId) {
      toast.error("You cannot accept your own challenge");
      return;
    }

    if (user.id === championUserId) {
      toast.error("You are the champion — you cannot also be the challenger");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('challenge_acceptances')
      .insert({ bulletin_post_id: postId, user_id: user.id, slot });

    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        toast.error("You have already accepted this challenge or this slot is taken");
      } else {
        toast.error("Failed to accept challenge");
        console.error(error);
      }
      return;
    }

    // Fetch post details for contextual notification
    const { data: post } = await supabase
      .from('bulletin_posts')
      .select('title, scheduled_at, timezone')
      .eq('id', postId)
      .single();

    const challengeName = post?.title || 'Live Challenge';
    let scheduleText = '';
    if (post?.scheduled_at) {
      const scheduledDate = new Date(post.scheduled_at);
      scheduleText = ` scheduled at ${scheduledDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}${post.timezone ? ` (${post.timezone})` : ''}`;
    }

    // Send notification to the user who accepted
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'challenge_accepted',
      title: 'Challenge Accepted!',
      message: `You have accepted the "${challengeName}"${scheduleText}. Be sure to attend on time or risk losing a percentage of your accountability score. 🥊`
    });

    toast.success("Challenge accepted! 🥊");
    fetchAcceptances();
  };

  const handleWithdraw = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from('challenge_acceptances')
      .delete()
      .eq('bulletin_post_id', postId)
      .eq('user_id', user.id);

    setLoading(false);
    if (error) {
      toast.error("Failed to withdraw");
      return;
    }

    // Send notification about withdrawal
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'challenge_withdrawn',
      title: 'Challenge Withdrawal',
      message: 'You have withdrawn from a live challenge.'
    });

    toast.success("You withdrew from the challenge");
    fetchAcceptances();
  };

  const getSlotAcceptance = (slot: string) => acceptances.find(a => a.slot === slot);
  const userHasAccepted = acceptances.some(a => a.user_id === user?.id);

  const renderSlot = (slot: string, label: string) => {
    const acc = getSlotAcceptance(slot);

    if (acc) {
      return (
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg p-2">
          <Avatar className="h-8 w-8 border border-green-500">
            <AvatarImage src={acc.profile?.avatar_url || ''} />
            <AvatarFallback className="bg-green-700 text-white text-xs">
              {(acc.profile?.display_name || '?')[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-green-400 text-xs font-semibold truncate">{acc.profile?.display_name || 'Accepted'}</p>
            <p className="text-gray-400 text-[10px]">{label}</p>
          </div>
          {acc.user_id === user?.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWithdraw}
              disabled={loading}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 h-auto"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAccept(slot)}
        disabled={loading || userHasAccepted}
        className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-600/20 hover:text-yellow-300 text-xs py-2"
      >
        <Swords className="w-3 h-3 mr-1" />
        Accept as {label}
      </Button>
    );
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-2 my-2 border border-gray-600">
      <p className="text-white font-semibold text-xs mb-2 flex items-center gap-1">
        <UserCheck className="w-3 h-3" />
        {hasTitleOnTheLine
          ? (getSlotAcceptance('challenger_1') ? 'Challenger Confirmed ✅' : 'Challenger Needed')
          : (getSlotAcceptance('challenger_1') && getSlotAcceptance('challenger_2')
              ? 'Challengers Confirmed ✅'
              : getSlotAcceptance('challenger_1') || getSlotAcceptance('challenger_2')
                ? '1 Challenger Confirmed ✅ — 1 More Needed'
                : 'Challengers Needed'
            )
        }
      </p>
      <div className={`${slotsNeeded === 2 ? 'space-y-2' : ''}`}>
        {renderSlot('challenger_1', hasTitleOnTheLine ? 'Challenger' : 'Challenger 1')}
        {slotsNeeded === 2 && renderSlot('challenger_2', 'Challenger 2')}
      </div>
    </div>
  );
};

export default ChallengeAcceptanceButtons;
