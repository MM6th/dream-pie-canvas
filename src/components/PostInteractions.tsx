
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface PostInteractionsProps {
  postId: string;
  recipientId?: string;
  disableComments?: boolean;
}

const PostInteractions = ({ postId, recipientId }: PostInteractionsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tipCount, setTipCount] = useState(0);
  const [isTipping, setIsTipping] = useState(false);
  const [showTipSelector, setShowTipSelector] = useState(false);
  const tipSelectorRef = useRef<HTMLDivElement>(null);

  const fetchTipCount = async () => {
    try {
      const { data, error } = await supabase
        .from('post_tips')
        .select('amount')
        .eq('post_id', postId);

      if (error) {
        console.error('Error fetching tip count:', error);
        return;
      }
      const total = data?.reduce((sum, tip) => sum + (tip.amount || 0), 0) || 0;
      setTipCount(total);
    } catch (error) {
      console.error('Error in fetchTipCount:', error);
    }
  };

  useEffect(() => {
    fetchTipCount();

    const tipsChannel = supabase
      .channel(`tips-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_tips',
          filter: `post_id=eq.${postId}`
        },
        () => {
          fetchTipCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tipsChannel);
    };
  }, [postId]);

  const handleTip = async (amount: number) => {
    if (!user) return;

    if (!recipientId) {
      toast({ title: "Error", description: "Unable to identify the post author.", variant: "destructive" });
      return;
    }

    if (user.id === recipientId) {
      toast({ title: "Oops!", description: "You can't tip yourself.", variant: "destructive" });
      return;
    }

    setShowTipSelector(false);
    setIsTipping(true);
    try {
      const { data, error } = await supabase.rpc('tip_post', {
        p_post_id: postId,
        p_recipient_id: recipientId,
        p_amount: amount
      });

      if (error) {
        if (error.message.includes('Insufficient token balance')) {
          toast({
            title: "No SIXTH Tokens",
            description: "You don't have enough SIXTH tokens to tip. Visit the Crypto Token Simulation page to purchase some!",
            variant: "destructive",
            action: (
              <Button
                variant="outline"
                size="sm"
                className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20"
                onClick={() => navigate('/mint')}
              >
                Buy Tokens
              </Button>
            ),
          });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Tip Sent! 🎉", description: `You tipped ${amount} SIXTH token${amount > 1 ? 's' : ''} to this creator.` });
    } catch (error: any) {
      console.error('Error tipping:', error);
      toast({ title: "Error", description: "Could not send tip. Please try again.", variant: "destructive" });
    } finally {
      setIsTipping(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tipSelectorRef.current && !tipSelectorRef.current.contains(event.target as Node)) {
        setShowTipSelector(false);
      }
    };
    if (showTipSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTipSelector]);

  const tipAmounts = [1, 5, 10, 25];

  return (
    <div className="flex items-center text-sm text-gray-400">
      {recipientId && (
        <div className="relative" ref={tipSelectorRef}>
          <Button
            onClick={() => setShowTipSelector(!showTipSelector)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300"
            disabled={!user || isTipping}
          >
            <img src={sixthCoinLogo} alt="SIXTH" className="w-4 h-4 rounded-full" />
            {tipCount > 0 ? tipCount : 'Tip'}
          </Button>
          {showTipSelector && (
            <div className="absolute bottom-full right-0 mb-1 bg-gray-800 border border-gray-600 rounded-lg p-1.5 flex gap-0.5 z-50 shadow-lg whitespace-nowrap">
              {tipAmounts.map((amount) => (
                <Button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  variant="ghost"
                  size="sm"
                  className="text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 text-xs px-2 py-1"
                >
                  {amount}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostInteractions;
