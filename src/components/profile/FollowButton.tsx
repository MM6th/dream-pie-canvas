import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, Clock, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FollowRequestModal } from "./FollowRequestModal";
import type { FollowStatus } from "@/hooks/useFollowRequest";

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  followStatus: FollowStatus;
  onRequestSent: () => void;
  className?: string;
}

export const FollowButton = ({
  targetUserId,
  targetUserName,
  followStatus,
  onRequestSent,
  className = ""
}: FollowButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getButtonContent = () => {
    switch (followStatus) {
      case 'following':
        return {
          icon: <UserCheck className="w-4 h-4 mr-2" />,
          text: "Following",
          variant: "default" as const,
          disabled: true,
          className: "bg-green-600 hover:bg-green-600 text-white"
        };
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4 mr-2" />,
          text: "Request Pending",
          variant: "outline" as const,
          disabled: true
        };
      default:
        return {
          icon: <UserPlus className="w-4 h-4 mr-2" />,
          text: "Request to Follow",
          variant: "default" as const,
          disabled: false
        };
    }
  };

  const buttonContent = getButtonContent();

  const handleClick = () => {
    if (followStatus === 'none') {
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleRequestSuccess = () => {
    setIsModalOpen(false);
    onRequestSent();
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={buttonContent.variant}
        disabled={buttonContent.disabled}
        className={cn(buttonContent.className, className)}
      >
        {buttonContent.icon}
        {buttonContent.text}
      </Button>

      <FollowRequestModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        targetMerchantId={targetUserId}
        targetMerchantName={targetUserName}
        onSuccess={handleRequestSuccess}
      />
    </>
  );
};

export default FollowButton;
