
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar, Video, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import ImagePicker from "./ImagePicker";

interface TVGuideModalProps {
  onSuccess?: () => void;
}

const TVGuideModal = ({ onSuccess }: TVGuideModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLiveStreamArtist, setIsLiveStreamArtist] = useState(false);
  const [livestreamSettings, setLivestreamSettings] = useState<{
    credits_per_minute: number;
    session_duration_minutes: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    imageUrl: "",
    linkUrl: "",
    isPaidLivestream: false,
  });

  useEffect(() => {
    if (user && open) {
      checkLiveStreamArtistStatus();
    }
  }, [user, open]);

  const checkLiveStreamArtistStatus = async () => {
    if (!user) return;

    // Check if user is a live stream artist
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_live_stream_artist')
      .eq('id', user.id)
      .single();

    if (profile?.is_live_stream_artist) {
      setIsLiveStreamArtist(true);

      // Fetch livestream settings
      const { data: settings } = await supabase
        .from('livestream_settings')
        .select('credits_per_minute, session_duration_minutes')
        .eq('merchant_id', user.id)
        .single();

      if (settings) {
        setLivestreamSettings(settings);
      } else {
        // Default settings
        setLivestreamSettings({ credits_per_minute: 5, session_duration_minutes: 20 });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const insertData: any = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        image_url: formData.imageUrl.trim() || null,
        link_url: formData.linkUrl.trim() || null,
        post_type: 'tv_guide',
        merchant_id: user.id,
        is_paid_livestream: formData.isPaidLivestream,
      };

      // Add livestream credits if this is a paid livestream
      if (formData.isPaidLivestream && livestreamSettings) {
        insertData.livestream_credits_per_minute = livestreamSettings.credits_per_minute;
      }

      const { error } = await supabase
        .from('bulletin_posts')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: formData.isPaidLivestream 
          ? "Paid livestream entry created successfully!" 
          : "TV Guide entry created successfully!"
      });

      setFormData({
        title: "",
        content: "",
        imageUrl: "",
        linkUrl: "",
        isPaidLivestream: false,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating TV guide entry:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create TV guide entry",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          <Calendar className="w-4 h-4 mr-2" />
          Create TV Guide Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create TV Guide Entry
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Show/Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter show or event title"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">Description & Schedule *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Describe the show and include schedule details..."
              rows={4}
              required
            />
          </div>


          <div>
            <Label htmlFor="linkUrl">
              {formData.isPaidLivestream ? "Livestream Link URL *" : "Link URL (Optional)"}
            </Label>
            <Input
              id="linkUrl"
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://example.com"
              required={formData.isPaidLivestream}
            />
            {formData.isPaidLivestream && (
              <p className="text-xs text-gray-400 mt-1">
                Users will be directed to this link after paying to enter
              </p>
            )}
          </div>

          {isLiveStreamArtist && (
            <div className="rounded-lg bg-blue-900/30 border border-blue-700/50 p-4 space-y-4">
              <div className="flex items-center gap-2 text-blue-300">
                <Video className="w-5 h-5" />
                <span className="font-medium">Paid Livestream Session</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="paid-livestream" className="text-white">Enable Paid Entry</Label>
                  <p className="text-xs text-gray-400">
                    Users must pay credits to enter this stream
                  </p>
                </div>
                <Switch
                  id="paid-livestream"
                  checked={formData.isPaidLivestream}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPaidLivestream: checked })}
                />
              </div>

              {formData.isPaidLivestream && livestreamSettings && (
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300">Entry Cost:</span>
                    <span className="font-semibold text-white">
                      {livestreamSettings.credits_per_minute * livestreamSettings.session_duration_minutes} credits
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {livestreamSettings.credits_per_minute} credits/min × {livestreamSettings.session_duration_minutes} min session
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {loading ? "Creating..." : "Create Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TVGuideModal;
