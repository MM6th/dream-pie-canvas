
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
import { Settings, Trash2, Shield, Cake, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getZodiacSign } from "@/utils/zodiacUtils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import ContentPicker from "@/components/ContentPicker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { SkillsInput } from "@/components/profile/SkillsInput";
import { VisibilityToggleWithHelp } from "./VisibilityToggleWithHelp";
import { Switch } from "@/components/ui/switch";
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
    adult_content_restricted: false,
    avatar_url: "",
    skills: [] as string[],
    playlist_public: false,
    portfolios_public: false,
    social_links_public: false,
    date_of_birth: "",
    show_age: false,
    show_zodiac_sign: false,
  });

  useEffect(() => {
    if (initialProfile) {
      setProfile({
        display_name: initialProfile.display_name || "",
        adult_content_restricted: initialProfile.adult_content_restricted || false,
        avatar_url: initialProfile.avatar_url || "",
        skills: initialProfile.skills || [],
        playlist_public: initialProfile.playlist_public || false,
        portfolios_public: initialProfile.portfolios_public || false,
        social_links_public: initialProfile.social_links_public || false,
        date_of_birth: initialProfile.date_of_birth || "",
        show_age: initialProfile.show_age || false,
        show_zodiac_sign: initialProfile.show_zodiac_sign || false,
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
          adult_content_restricted: data.adult_content_restricted || false,
          avatar_url: data.avatar_url || "",
          skills: data.skills || [],
          playlist_public: data.playlist_public || false,
          portfolios_public: data.portfolios_public || false,
          social_links_public: data.social_links_public || false,
          date_of_birth: data.date_of_birth || "",
          show_age: data.show_age || false,
          show_zodiac_sign: data.show_zodiac_sign || false,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate required fields for supporters
    if (!profile.display_name || profile.display_name.trim() === "") {
      toast({
        title: "Display Name Required",
        description: "Please enter a display name for your profile.",
        variant: "destructive"
      });
      return;
    }

    if (!profile.avatar_url || profile.avatar_url.trim() === "") {
      toast({
        title: "Avatar Required",
        description: "Please upload an avatar for your profile.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          adult_content_restricted: profile.adult_content_restricted,
          avatar_url: profile.avatar_url,
          skills: profile.skills,
          playlist_public: profile.playlist_public,
          portfolios_public: profile.portfolios_public,
          social_links_public: profile.social_links_public,
          date_of_birth: profile.date_of_birth || null,
          show_age: profile.show_age,
          show_zodiac_sign: profile.show_zodiac_sign,
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
      // Call the edge function to delete the user account
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        console.error('Error deleting account:', error);
        toast({
          title: "Error",
          description: "Failed to delete account. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Show success message
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted. You will be signed out.",
      });

      // Sign out the user
      await supabase.auth.signOut();
      
      // Redirect to home page
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error in handleDeleteProfile:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleAvatarChange = (url: string, type: 'image' | 'video') => {
    if (type === 'image') {
      setProfile(prev => ({ ...prev, avatar_url: url }));
      toast({
        title: "Avatar Updated",
        description: "Your avatar has been updated successfully!"
      });
    }
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
      <DialogContent className="max-w-lg bg-gray-800 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Supporter Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-gray-700">
                <User className="w-12 h-12 text-gray-400" />
              </AvatarFallback>
            </Avatar>
            <ContentPicker 
              onContentSelect={handleAvatarChange}
              currentContentUrl={profile.avatar_url}
            />
          </div>
          
          <div>
            <Label htmlFor="display_name" className="text-white">
              Display Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="display_name"
              value={profile.display_name}
              onChange={(e) => setProfile({...profile, display_name: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter your display name"
              required
            />
          </div>

          {/* Skills Input */}
          <SkillsInput
            skills={profile.skills}
            onSkillsChange={(skills) => setProfile({...profile, skills})}
          />

          {/* Adult Content Restriction Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-400" />
              <div>
                <Label htmlFor="adult_restriction" className="text-white font-medium">
                  Restrict Adult Content
                </Label>
                <p className="text-sm text-gray-400">
                  Hide all products and content marked as adult/18+. This includes content that may be sexually suggestive, seductive, reveals excessive skin, or contains wardrobe malfunctions.
                </p>
              </div>
            </div>
            <Switch
              id="adult_restriction"
              checked={profile.adult_content_restricted}
              onCheckedChange={(checked) => setProfile({...profile, adult_content_restricted: checked})}
            />
          </div>

          {/* Visibility Toggles with Help Icons */}
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-2">
              All profiles are private by default. Choose what non-followers can see:
            </p>
            <VisibilityToggleWithHelp
              type="playlist"
              checked={profile.playlist_public}
              onCheckedChange={(checked) => setProfile({...profile, playlist_public: checked})}
            />
            <VisibilityToggleWithHelp
              type="portfolios"
              checked={profile.portfolios_public}
              onCheckedChange={(checked) => setProfile({...profile, portfolios_public: checked})}
            />
            <VisibilityToggleWithHelp
              type="social_links"
              checked={profile.social_links_public}
              onCheckedChange={(checked) => setProfile({...profile, social_links_public: checked})}
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
