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
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
      {icon}
      <span>{label}</span>
    </a>
  );
};

const ApprovedMerchantCard = ({ merchant }: ApprovedMerchantCardProps) => {
  return (
    <Card className="bg-gray-800/50 border-gray-700 text-white flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={merchant.avatar_url || undefined} alt={merchant.display_name || 'avatar'} />
            <AvatarFallback>
              <Users className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <CardTitle className="text-lg truncate">{merchant.display_name || "N/A"}</CardTitle>
            <p className="text-sm text-gray-400 truncate">{merchant.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div>
          <h4 className="font-semibold mb-2 text-gray-300 text-sm">Profile Details</h4>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" /> PayPal: {merchant.paypal_email || "Not set"}</p>
            <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> Joined: {format(new Date(merchant.created_at), "PPP")}</p>
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 mt-2">Approved</Badge>
          </div>
        </div>
        
        <div className="pt-2">
          <h4 className="font-semibold mb-2 text-gray-300 text-sm">Social Links</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <SocialLink url={merchant.facebook_url} icon={<Facebook className="w-4 h-4" />} label="Facebook" />
            <SocialLink url={merchant.instagram_url} icon={<Instagram className="w-4 h-4" />} label="Instagram" />
            <SocialLink url={merchant.youtube_url} icon={<Youtube className="w-4 h-4" />} label="YouTube" />
            <SocialLink url={merchant.pinterest_url} icon={<Link className="w-4 h-4" />} label="Pinterest" />
            <SocialLink url={merchant.onlyfans_url} icon={<Link className="w-4 h-4" />} label="OnlyFans" />
            <SocialLink url={merchant.snapchat_url} icon={<Link className="w-4 h-4" />} label="Snapchat" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovedMerchantCard;
