import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CreditPurchaseModal } from "./CreditPurchaseModal";
import { supabase } from "@/integrations/supabase/client";
import { useSpotPrice } from "@/hooks/useSpotPrice";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface MessageCreditsIconProps {
  userId: string;
  userType?: 'merchant' | 'supporter';
}

export const MessageCreditsIcon = ({ userId, userType = 'supporter' }: MessageCreditsIconProps) => {
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { spotPrice, isLoading: priceLoading } = useSpotPrice();

  const fetchBalance = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('token_balances')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching token balance:', error);
        setTokenBalance(0);
      } else {
        setTokenBalance((data as any)?.balance ?? 0);
      }
    } catch {
      setTokenBalance(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBalance();

    const channel = supabase
      .channel(`token-balance-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'token_balances', filter: `user_id=eq.${userId}` },
        () => fetchBalance()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBalance, userId]);

  const handlePurchaseComplete = () => {
    fetchBalance();
  };

  const fmt = (n: number) => n.toLocaleString();
  const balance = tokenBalance ?? 0;
  const usdValue = balance * spotPrice;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPurchaseModal(true)}
        className="text-gray-300 hover:text-white hover:bg-gray-700/50 flex items-center gap-1.5 px-2"
      >
        <img src={sixthCoinLogo} alt="SIXTH" className="w-4 h-4 rounded-full object-cover" />
        <span className="text-sm font-medium">
          {loading ? "..." : fmt(balance)}
        </span>
        <span className="text-xs text-gray-400">
          {loading || priceLoading ? "" : `≈ $${usdValue < 0.01 && usdValue > 0 ? usdValue.toFixed(4) : usdValue.toFixed(2)}`}
        </span>
      </Button>

      <CreditPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        onPurchaseComplete={handlePurchaseComplete}
        userType={userType}
      />
    </>
  );
};
