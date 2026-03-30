import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import AvatarUpload from "@/components/profile/AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { calculateAge, getZodiacSign } from "@/utils/zodiacUtils";
import { Cake, Star } from "lucide-react";

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const ProfileCompletionModal = ({ isOpen, onComplete }: ProfileCompletionModalProps) => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get user type from auth metadata
  const userType = user?.user_metadata?.user_type || "supporter";
  const isMerchant = userType === "merchant";
  
  // Social links state (only used for merchants)
  const [website, setWebsite] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [snapchatUrl, setSnapchatUrl] = useState("");
  const [pinterestUrl, setPinterestUrl] = useState("");
  const [onlyfansUrl, setOnlyfansUrl] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showAge, setShowAge] = useState(false);
  const [showZodiacSign, setShowZodiacSign] = useState(false);
  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
  };

  const hasAtLeastOneSocialLink = () => {
    return !!(
      website.trim() ||
      youtubeUrl.trim() ||
      instagramUrl.trim() ||
      facebookUrl.trim() ||
      snapchatUrl.trim() ||
      pinterestUrl.trim() ||
      onlyfansUrl.trim()
    );
  };

  const handleComplete = async () => {
    if (!avatarUrl) {
      toast({
        title: "Avatar Required",
        description: "Please upload a profile picture to continue.",
        variant: "destructive"
      });
      return;
    }

    // Validate DOB and age
    if (!dateOfBirth) {
      toast({
        title: "Date of Birth Required",
        description: "Please enter your date of birth to continue.",
        variant: "destructive"
      });
      return;
    }

    if (calculateAge(dateOfBirth) < 21) {
      toast({
        title: "Age Requirement",
        description: "You must be at least 21 years old to use this platform.",
        variant: "destructive"
      });
      return;
    }

    // Only require social links for merchants
    if (isMerchant && !hasAtLeastOneSocialLink()) {
      toast({
        title: "Social Link Required",
        description: "Please provide at least one social link so we can verify your account.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: avatarUrl,
          website: website.trim() || null,
          youtube_url: youtubeUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          snapchat_url: snapchatUrl.trim() || null,
          pinterest_url: pinterestUrl.trim() || null,
          onlyfans_url: onlyfansUrl.trim() || null,
          date_of_birth: dateOfBirth,
          show_age: showAge,
          show_zodiac_sign: showZodiacSign,
          profile_complete: true 
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Profile Complete",
        description: "Your profile has been completed successfully!"
      });

      onComplete();
    } catch (error) {
      console.error('Error completing profile:', error);
      toast({
        title: "Error",
        description: "Failed to complete profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-xs">
            {isMerchant 
              ? "Upload a profile picture and provide at least one social link for account verification."
              : "Upload a profile picture to complete your account setup."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-2 py-2">
          <AvatarUpload
            avatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
            compact
          />
        </div>

        {/* Social links section - only shown for merchants */}
        {isMerchant && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="website" className="text-xs">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="youtube" className="text-xs">YouTube</Label>
                <Input
                  id="youtube"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="YouTube URL"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="instagram" className="text-xs">Instagram</Label>
                <Input
                  id="instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="Instagram URL"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="facebook" className="text-xs">Facebook</Label>
                <Input
                  id="facebook"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="Facebook URL"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="snapchat" className="text-xs">Snapchat</Label>
                <Input
                  id="snapchat"
                  value={snapchatUrl}
                  onChange={(e) => setSnapchatUrl(e.target.value)}
                  placeholder="Snapchat URL"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pinterest" className="text-xs">Pinterest</Label>
                <Input
                  id="pinterest"
                  value={pinterestUrl}
                  onChange={(e) => setPinterestUrl(e.target.value)}
                  placeholder="Pinterest URL"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="onlyfans" className="text-xs">OnlyFans</Label>
                <Input
                  id="onlyfans"
                  value={onlyfansUrl}
                  onChange={(e) => setOnlyfansUrl(e.target.value)}
                  placeholder="OnlyFans URL"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              * At least one social link is required for verification
            </p>
          </div>
        )}

        <Button 
          onClick={handleComplete} 
          disabled={!avatarUrl || (isMerchant && !hasAtLeastOneSocialLink()) || isSubmitting}
          className="w-full h-8 text-sm mt-2"
        >
          {isSubmitting ? "Saving..." : "Complete Profile"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionModal;
