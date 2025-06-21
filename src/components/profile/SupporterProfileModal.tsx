
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, Trash2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import AvatarUpload from "./AvatarUpload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SupporterProfileModalProps {
  children?: React.ReactNode;
  profile?: any;
  onProfileUpdate?: () => void;
}

const SupporterProfileModal = ({ children, profile: initialProfile, onProfileUpdate }: SupporterProfileModalProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    display_name: "",
    contact_email: "",
    instagram_url: "",
    facebook_url: "",
    youtube_url: "",
    snapchat_url: "",
    onlyfans_url: "",
    pinterest_url: "",
    website: "",
    adult_content_restricted: false,
    avatar_url: "",
  });

  useEffect(() => {
    if (initialProfile) {
      setProfile({
        display_name: initialProfile.display_name || "",
        contact_email: initialProfile.contact_email || "",
        instagram_url: initialProfile.instagram_url || "",
        facebook_url: initialProfile.facebook_url || "",
        youtube_url: initialProfile.youtube_url || "",
        snapchat_url: initialProfile.snapchat_url || "",
        onlyfans_url: initialProfile.onlyfans_url || "",
        pinterest_url: initialProfile.pinterest_url || "",
        website: initialProfile.website || "",
        adult_content_restricted: initialProfile.adult_content_restricted || false,
        avatar_url: initialProfile.avatar_url || "",
      });
    } else if (user && isOpen) {
      fetchProfile();
    }
  }, [user, isOpen, initialProfile]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile({
          display_name: data.display_name || "",
          contact_email: data.contact_email || "",
          instagram_url: data.instagram_url || "",
          facebook_url: data.facebook_url || "",
          youtube_url: data.youtube_url || "",
          snapchat_url: data.snapchat_url || "",
          onlyfans_url: data.onlyfans_url || "",
          pinterest_url: data.pinterest_url || "",
          website: data.website || "",
          adult_content_restricted: data.adult_content_restricted || false,
          avatar_url: data.avatar_url || "",
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          contact_email: profile.contact_email,
          instagram_url: profile.instagram_url,
          facebook_url: profile.facebook_url,
          youtube_url: profile.youtube_url,
          snapchat_url: profile.snapchat_url,
          onlyfans_url: profile.onlyfans_url,
          pinterest_url: profile.pinterest_url,
          website: profile.website,
          adult_content_restricted: profile.adult_content_restricted,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });

      setIsOpen(false);
      onProfileUpdate?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        console.error('Error deleting profile:', error);
        toast({
          title: "Error",
          description: "Failed to delete profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Profile deleted successfully!"
      });
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Error",
        description: "Failed to delete profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAvatarChange = (url: string) => {
    setProfile(prev => ({ ...prev, avatar_url: url }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="border-gray-600 text-white bg-transparent hover:bg-gray-700">
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Supporter Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <AvatarUpload 
            avatarUrl={profile.avatar_url}
            onAvatarChange={handleAvatarChange}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_name" className="text-white">Display Name</Label>
              <Input
                id="display_name"
                value={profile.display_name}
                onChange={(e) => setProfile({...profile, display_name: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="contact_email" className="text-white">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={profile.contact_email}
                onChange={(e) => setProfile({...profile, contact_email: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instagram_url" className="text-white">Instagram URL</Label>
              <Input
                id="instagram_url"
                value={profile.instagram_url}
                onChange={(e) => setProfile({...profile, instagram_url: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://instagram.com/username"
              />
            </div>
            
            <div>
              <Label htmlFor="facebook_url" className="text-white">Facebook URL</Label>
              <Input
                id="facebook_url"
                value={profile.facebook_url}
                onChange={(e) => setProfile({...profile, facebook_url: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://facebook.com/username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="youtube_url" className="text-white">YouTube URL</Label>
              <Input
                id="youtube_url"
                value={profile.youtube_url}
                onChange={(e) => setProfile({...profile, youtube_url: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://youtube.com/channel/..."
              />
            </div>
            
            <div>
              <Label htmlFor="snapchat_url" className="text-white">Snapchat URL</Label>
              <Input
                id="snapchat_url"
                value={profile.snapchat_url}
                onChange={(e) => setProfile({...profile, snapchat_url: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://snapchat.com/add/username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="onlyfans_url" className="text-white">OnlyFans URL</Label>
              <Input
                id="onlyfans_url"
                value={profile.onlyfans_url}
                onChange={(e) => setProfile({...profile, onlyfans_url: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://onlyfans.com/username"
              />
            </div>
            
            <div>
              <Label htmlFor="pinterest_url" className="text-white">Pinterest URL</Label>
              <Input
                id="pinterest_url"
                value={profile.pinterest_url}
                onChange={(e) => setProfile({...profile, pinterest_url: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="https://pinterest.com/username"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="website" className="text-white">Website</Label>
            <Input
              id="website"
              value={profile.website}
              onChange={(e) => setProfile({...profile, website: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Adult Content Restriction Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_restriction" className="text-white font-medium">
                  Restrict Adult Content
                </Label>
                <p className="text-sm text-gray-400">
                  Hide all products and content marked as adult/18+
                </p>
              </div>
            </div>
            <Switch
              id="adult_restriction"
              checked={profile.adult_content_restricted}
              onCheckedChange={(checked) => setProfile({...profile, adult_content_restricted: checked})}
            />
          </div>

          <div className="flex justify-between pt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Profile
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-800 border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Delete Profile</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Are you sure you want to delete your profile? This action cannot be undone and will permanently remove all your data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-gray-600 text-white bg-transparent">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteProfile}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Profile
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupporterProfileModal;
