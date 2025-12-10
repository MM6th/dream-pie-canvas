
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Video, Coins, Clock, Globe, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface TVGuideModalProps {
  onSuccess?: () => void;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

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
    scheduledDate: "",
    scheduledTime: "",
    timezone: "America/New_York",
    isPaidLivestream: false,
  });
  const [generatedRoomId, setGeneratedRoomId] = useState<string>("");

  useEffect(() => {
    if (user && open) {
      checkLiveStreamArtistStatus();
      // Generate a new room ID when modal opens
      setGeneratedRoomId(crypto.randomUUID());
    }
  }, [user, open]);

  const checkLiveStreamArtistStatus = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_live_stream_artist')
      .eq('id', user.id)
      .single();

    if (profile?.is_live_stream_artist) {
      setIsLiveStreamArtist(true);

      const { data: settings } = await supabase
        .from('livestream_settings')
        .select('credits_per_minute, session_duration_minutes')
        .eq('merchant_id', user.id)
        .single();

      if (settings) {
        setLivestreamSettings(settings);
      } else {
        setLivestreamSettings({ credits_per_minute: 1, session_duration_minutes: 3 });
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

    if (!formData.scheduledDate || !formData.scheduledTime) {
      toast({
        title: "Error",
        description: "Please select a date and time for your stream",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Combine date and time into ISO string
      const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();

      const { error } = await supabase
        .from('bulletin_posts')
        .insert({
          title: formData.title.trim(),
          content: formData.content.trim(),
          post_type: 'tv_guide',
          merchant_id: user.id,
          is_paid_livestream: formData.isPaidLivestream,
          scheduled_at: scheduledAt,
          timezone: formData.timezone,
          room_id: generatedRoomId,
          livestream_credits_per_minute: formData.isPaidLivestream && livestreamSettings 
            ? livestreamSettings.credits_per_minute 
            : null,
        });

      if (error) throw error;

      // Get timezone label for notification
      const timezoneLabel = TIMEZONES.find(tz => tz.value === formData.timezone)?.label || formData.timezone;
      const scheduledDate = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      const formattedDate = scheduledDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const formattedTime = scheduledDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Create notification for the artist
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'livestream_scheduled',
          title: 'Livestream Scheduled',
          message: `Your livestream "${formData.title.trim()}" is scheduled for ${formattedDate} at ${formattedTime} (${timezoneLabel}).`,
        });

      toast({
        title: "Success",
        description: "Livestream scheduled successfully! Check your notifications for details."
      });

      setFormData({
        title: "",
        content: "",
        scheduledDate: "",
        scheduledTime: "",
        timezone: "America/New_York",
        isPaidLivestream: false,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Error creating TV guide entry:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to create TV guide entry",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const roomLink = `${window.location.origin}/livestream/room/${generatedRoomId}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-blue-600 hover:bg-blue-700">
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Livestream
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Schedule Livestream
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
            <Label htmlFor="content">Description *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Describe your livestream..."
              rows={3}
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="scheduledDate" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date *
              </Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>
            <div>
              <Label htmlFor="scheduledTime" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time *
              </Label>
              <Input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <Label htmlFor="timezone" className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Timezone *
            </Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value} className="text-white hover:bg-gray-700">
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generated Room Link Preview */}
          <div className="rounded-lg bg-gray-700/50 border border-gray-600 p-3">
            <Label className="flex items-center gap-1 text-sm text-gray-300 mb-2">
              <LinkIcon className="w-3 h-3" />
              Your Stream Link
            </Label>
            <p className="text-xs text-purple-400 break-all font-mono">
              {roomLink}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Share this link with your audience. It will become active at the scheduled time.
            </p>
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
              {loading ? "Scheduling..." : "Schedule Stream"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TVGuideModal;
