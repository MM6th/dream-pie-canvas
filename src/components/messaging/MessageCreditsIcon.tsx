import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { useMessagingCredits } from "@/hooks/useMessagingCredits";
import { CreditPurchaseModal } from "./CreditPurchaseModal";

interface MessageCreditsIconProps {
  userId: string;
}

export const MessageCreditsIcon = ({ userId }: MessageCreditsIconProps) => {
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
        <Coins className="w-4 h-4" />
        <span className="text-sm font-medium">
          {loading ? "..." : balance}
        </span>
      </Button>

      <CreditPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
};
