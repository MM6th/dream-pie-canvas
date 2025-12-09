import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Facebook,
  Instagram,
  Youtube,
  Link,
  Calendar,
  DollarSign,
  Video
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
  is_live_stream_artist?: boolean | null;
}

interface ApprovedMerchantCardProps {
  merchant: Merchant;
  onToggleLiveStreamArtist: (merchantId: string, value: boolean) => Promise<void>;
}

const SocialLink = ({ url, icon, label }: { url: string | null | undefined, icon: React.ReactNode, label: string }) => {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors bg-muted/50 px-2 py-1 rounded">
      {icon}
      <span>{label}</span>
    </a>
  );
};

const ApprovedMerchantCard = ({ merchant, onToggleLiveStreamArtist }: ApprovedMerchantCardProps) => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleToggle = async (value: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleLiveStreamArtist(merchant.id, value);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="bg-card/50 border-border text-foreground h-full">
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
              <p className="text-sm text-muted-foreground truncate">{merchant.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">Approved</Badge>
                {merchant.is_live_stream_artist && (
                  <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Live Streamer</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Switch 
                checked={merchant.is_live_stream_artist ?? false}
                onCheckedChange={handleToggle}
                disabled={isUpdating}
              />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Video className="w-3 h-3" />
                Live Stream Artist
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" /> 
                <span className="truncate">PayPal: {merchant.paypal_email || "Not set"}</span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" /> 
                <span>Joined: {format(new Date(merchant.created_at), "MMM d, yyyy")}</span>
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground text-sm">Social Links</h4>
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
