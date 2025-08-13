import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  Link,
  Calendar,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";

interface Merchant {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  pinterest_url?: string | null;
  onlyfans_url?: string | null;
  snapchat_url?: string | null;
  paypal_email?: string | null;
  approval_status: string;
  created_at: string;
}

interface ApprovedMerchantCardProps {
  merchant: Merchant;
}

const SocialLink = ({ url, icon, label }: { url: string | null | undefined, icon: React.ReactNode, label: string }) => {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white flex items-center gap-1 text-xs transition-colors bg-gray-700/50 px-2 py-1 rounded">
      {icon}
      <span>{label}</span>
    </a>
  );
};

const ApprovedMerchantCard = ({ merchant }: ApprovedMerchantCardProps) => {
  return (
    <Card className="bg-gray-800/50 border-gray-700 text-white h-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-4 h-full">
          <Avatar className="w-16 h-16 flex-shrink-0">
            <AvatarImage src={merchant.avatar_url || undefined} alt={merchant.display_name || 'avatar'} />
            <AvatarFallback>
              <Users className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <h3 className="text-lg font-semibold truncate">{merchant.display_name || "N/A"}</h3>
              <p className="text-sm text-gray-400 truncate">{merchant.email}</p>
              <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 mt-1">Approved</Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" /> 
                <span className="truncate">PayPal: {merchant.paypal_email || "Not set"}</span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" /> 
                <span>Joined: {format(new Date(merchant.created_at), "MMM d, yyyy")}</span>
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-300 text-sm">Social Links</h4>
              <div className="flex flex-wrap gap-2">
                <SocialLink url={merchant.facebook_url} icon={<Facebook className="w-3 h-3" />} label="FB" />
                <SocialLink url={merchant.instagram_url} icon={<Instagram className="w-3 h-3" />} label="IG" />
                <SocialLink url={merchant.youtube_url} icon={<Youtube className="w-3 h-3" />} label="YT" />
                <SocialLink url={merchant.pinterest_url} icon={<Link className="w-3 h-3" />} label="PIN" />
                <SocialLink url={merchant.onlyfans_url} icon={<Link className="w-3 h-3" />} label="OF" />
                <SocialLink url={merchant.snapchat_url} icon={<Link className="w-3 h-3" />} label="SC" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovedMerchantCard;
