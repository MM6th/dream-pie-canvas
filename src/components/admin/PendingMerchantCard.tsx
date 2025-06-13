
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle, XCircle, ExternalLink, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface PendingMerchant {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  pinterest_url?: string;
  onlyfans_url?: string;
  snapchat_url?: string;
  approval_status: string;
  created_at: string;
}

interface PendingMerchantCardProps {
  merchant: PendingMerchant;
  onApprovalChange: (merchantId: string, newStatus: string) => Promise<void>;
}

const PendingMerchantCard = ({ merchant, onApprovalChange }: PendingMerchantCardProps) => {
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

  const socialLinks = [
    { url: merchant.facebook_url, name: 'Facebook', color: 'bg-blue-600' },
    { url: merchant.instagram_url, name: 'Instagram', color: 'bg-pink-600' },
    { url: merchant.youtube_url, name: 'YouTube', color: 'bg-red-600' },
    { url: merchant.pinterest_url, name: 'Pinterest', color: 'bg-red-500' },
    { url: merchant.onlyfans_url, name: 'OnlyFans', color: 'bg-blue-500' },
    { url: merchant.snapchat_url, name: 'Snapchat', color: 'bg-yellow-500' },
  ].filter(link => link.url);

  const openLink = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://${url}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
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
              <p className="text-lg">{merchant.display_name || 'No Display Name'}</p>
              <p className="text-sm text-gray-400 font-normal">{merchant.email}</p>
            </div>
          </CardTitle>
          <Badge className="bg-yellow-500 text-black">
            Pending
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Application Date */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          Applied: {new Date(merchant.created_at).toLocaleDateString()}
        </div>

        {/* Social Media Links */}
        {socialLinks.length > 0 && (
          <div>
            <p className="text-white font-medium mb-3">Social Media Profiles:</p>
            <div className="grid grid-cols-2 gap-2">
              {socialLinks.map((link, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => openLink(link.url!)}
                  className={`${link.color} border-none text-white hover:opacity-80 text-xs`}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {link.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Approval Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-600">
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
  );
};

export default PendingMerchantCard;
