
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface ApprovalStatusBannerProps {
  approvalStatus: string;
  isAdmin: boolean;
}

const ApprovalStatusBanner = ({ approvalStatus, isAdmin }: ApprovalStatusBannerProps) => {
  if (isAdmin || approvalStatus === 'approved') {
    return null;
  }

  const getStatusConfig = () => {
    switch (approvalStatus) {
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          title: "Pending Approval",
          description: "Your merchant application is under review. You'll be able to upload content once approved by an admin.",
          className: "border-yellow-500 bg-yellow-500/10 text-yellow-500"
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-5 h-5" />,
          title: "Application Rejected",
          description: "Your merchant application has been rejected. Please contact support for more information.",
          className: "border-red-500 bg-red-500/10 text-red-500"
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <Alert className={`mb-6 ${config.className}`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <div>
          <h4 className="font-semibold">{config.title}</h4>
          <AlertDescription className="mt-1">
            {config.description}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default ApprovalStatusBanner;
