import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle, XCircle, Calendar, Mail, Eye } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ViewApplicantProfileModal from "./ViewApplicantProfileModal";

interface PendingMerchant {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  business_name?: string;
  business_description?: string;
  industry?: string;
  skills?: string[];
  website?: string;
  contact_email?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  pinterest_url?: string;
  onlyfans_url?: string;
  snapchat_url?: string;
  paypal_email?: string;
  is_adult_creator?: boolean;
  approval_status: string;
  created_at: string;
}

interface PendingMerchantCardProps {
  merchant: PendingMerchant;
  onApprovalChange: (merchantId: string, newStatus: string) => Promise<void>;
}

const PendingMerchantCard = ({ merchant, onApprovalChange }: PendingMerchantCardProps) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleApprove = async () => {
    await onApprovalChange(merchant.id, 'approved');
    toast({
      title: "Merchant Approved",
      description: `${merchant.display_name || merchant.email} has been approved and can now upload content.`
    });
  };

  const handleReject = async () => {
    await onApprovalChange(merchant.id, 'rejected');
    toast({
      title: "Merchant Rejected",
      description: `${merchant.display_name || merchant.email} has been rejected.`,
      variant: "destructive"
    });
  };

  const hasSocialLinks = merchant.facebook_url || merchant.instagram_url || 
    merchant.youtube_url || merchant.pinterest_url || 
    merchant.onlyfans_url || merchant.snapchat_url || merchant.website;

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700 hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {merchant.avatar_url ? (
                <img
                  src={merchant.avatar_url}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
              <div>
                <CardTitle className="text-white text-lg">{merchant.display_name || 'No Display Name'}</CardTitle>
                <div className="mt-1 space-y-1">
                   <p className="text-sm text-gray-300 font-normal flex items-center gap-2" title={merchant.contact_email || 'Primary contact email not provided'}>
                    <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="truncate">
                      {merchant.contact_email || <span className="text-yellow-400 italic">No Contact Email</span>}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 font-normal truncate" title={merchant.email}>Login: {merchant.email}</p>
                </div>
              </div>
            </div>
            <Badge className="bg-yellow-500 text-black">
              Pending
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4 mt-4 border-t border-gray-700">
          {/* Application Date */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            Applied: {new Date(merchant.created_at).toLocaleDateString()}
          </div>

          {/* Social Links Status */}
          {!hasSocialLinks && (
            <div className="p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-xs text-yellow-400">
              ⚠️ No social links provided
            </div>
          )}

          {/* View Profile Button */}
          <Button
            onClick={() => setIsProfileModalOpen(true)}
            variant="outline"
            size="sm"
            className="w-full border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Full Profile
          </Button>

          {/* Approval Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-600">
            <Button
              onClick={handleApprove}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      <ViewApplicantProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        applicant={merchant}
      />
    </>
  );
};

export default PendingMerchantCard;
