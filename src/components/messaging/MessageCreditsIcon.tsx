import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";
import { CreditPurchaseModal } from "./CreditPurchaseModal";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface MessageCreditsIconProps {
  userId: string;
  userType?: 'merchant' | 'supporter';
}

export const MessageCreditsIcon = ({ userId, userType = 'supporter' }: MessageCreditsIconProps) => {
  const { balance, loading, refetch } = useMessagingCredits(userId);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handlePurchaseComplete = () => {
    refetch();
  };

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
          {loading ? "..." : balance}
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
