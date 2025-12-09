import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Users, Calendar, Video } from "lucide-react";
import { format } from "date-fns";

interface Supporter {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
  is_live_stream_artist?: boolean | null;
}

interface SupporterCardProps {
  supporter: Supporter;
  onToggleLiveStreamArtist: (userId: string, value: boolean) => Promise<void>;
}

const SupporterCard = ({ supporter, onToggleLiveStreamArtist }: SupporterCardProps) => {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleToggle = async (value: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleLiveStreamArtist(supporter.id, value);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="bg-card/50 border-border text-foreground h-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-4 h-full">
          <Avatar className="w-12 h-12 flex-shrink-0">
            <AvatarImage src={supporter.avatar_url || undefined} alt={supporter.display_name || 'avatar'} />
            <AvatarFallback>
              <Users className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <h3 className="text-base font-semibold truncate">{supporter.display_name || "N/A"}</h3>
              <p className="text-sm text-muted-foreground truncate">{supporter.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">Supporter</Badge>
                {supporter.is_live_stream_artist && (
                  <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Live Streamer</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Switch 
                checked={supporter.is_live_stream_artist ?? false}
                onCheckedChange={handleToggle}
                disabled={isUpdating}
              />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Video className="w-3 h-3" />
                Live Stream Artist
              </span>
            </div>
            
            <p className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" /> 
              <span>Joined: {format(new Date(supporter.created_at), "MMM d, yyyy")}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupporterCard;
