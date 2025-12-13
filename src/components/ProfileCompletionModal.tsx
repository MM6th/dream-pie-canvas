import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AvatarUpload from "@/components/profile/AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SkillsInput } from "@/components/profile/SkillsInput";

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const ProfileCompletionModal = ({ isOpen, onComplete }: ProfileCompletionModalProps) => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [skills, setSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
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

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: avatarUrl,
          skills: skills,
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
        className="sm:max-w-xs max-h-[90vh] overflow-y-auto p-4" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-xs">
            Upload a profile picture to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-2 py-2">
          <AvatarUpload
            avatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
            compact
          />
          
          <div className="w-full">
            <SkillsInput
              skills={skills}
              onSkillsChange={setSkills}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Add skills to help others find you
            </p>
          </div>
        </div>

        <Button 
          onClick={handleComplete} 
          disabled={!avatarUrl || isSubmitting}
          className="w-full h-8 text-sm"
        >
          {isSubmitting ? "Saving..." : "Complete Profile"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionModal;
