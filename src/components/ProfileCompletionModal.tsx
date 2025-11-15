import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
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
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please upload a profile picture to continue using the platform.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="bg-blue-500/10 border-blue-500/20">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-sm">
            A profile picture is required for all users. This helps build trust and community on the platform.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col items-center space-y-6 py-4">
          <AvatarUpload
            avatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
          />
          
          <div className="w-full">
            <SkillsInput
              skills={skills}
              onSkillsChange={setSkills}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Optional: Add your skills to help others discover your expertise
            </p>
          </div>
        </div>

        <Button 
          onClick={handleComplete} 
          disabled={!avatarUrl || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Saving..." : "Complete Profile"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionModal;
