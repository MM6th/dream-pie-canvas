import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AvatarUpload from "./AvatarUpload";

interface SupporterProfileModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  profile?: any;
  onProfileUpdate?: () => void;
  children?: React.ReactNode;
}

const SupporterProfileModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  profile, 
  onProfileUpdate,
  children 
}: SupporterProfileModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(profile);

  // Fetch profile data if not provided
  useEffect(() => {
    if (!profile && user && (isOpen || internalOpen)) {
      fetchProfileData();
    }
  }, [profile, user, isOpen, internalOpen]);

  // Update form when profile data changes
  useEffect(() => {
    const profileToUse = profile || currentProfile;
    if (profileToUse) {
      console.log('Setting supporter profile form data:', profileToUse);
      setDisplayName(profileToUse.display_name || '');
      setAvatarUrl(profileToUse.avatar_url || '');
    }
  }, [profile, currentProfile]);

  const fetchProfileData = async () => {
    if (!user) return;

    console.log('Fetching profile data for supporter modal:', user.id);
    setFetchingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile in modal:', error);
      } else {
        console.log('Profile fetched in supporter modal:', data);
        setCurrentProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile in modal:', error);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    console.log('Submitting supporter profile update:', { displayName, avatarUrl });
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log('Supporter profile updated successfully');
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });

      if (onSuccess) onSuccess();
      if (onProfileUpdate) onProfileUpdate();
      if (onClose) onClose();
      setInternalOpen(false);
    } catch (error) {
      console.error('Error updating supporter profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const dialogOpen = isOpen !== undefined ? isOpen : internalOpen;
  const setDialogOpen = onClose !== undefined ? 
    (open: boolean) => { if (!open) onClose(); } : 
    setInternalOpen;

  // If children are provided, use trigger pattern
  if (children) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Update Profile</DialogTitle>
          </DialogHeader>
          
          {fetchingProfile ? (
            <div className="text-center py-4">
              <p className="text-gray-400">Loading profile data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center mb-4">
                <AvatarUpload onAvatarChange={setAvatarUrl} avatarUrl={avatarUrl} />
              </div>

              <div>
                <Label htmlFor="displayName" className="text-white">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="bg-black text-white border-0 hover:bg-black"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-white hover:bg-gray-100 text-black"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Original controlled pattern
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-[400px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Update Profile</DialogTitle>
        </DialogHeader>
        
        {fetchingProfile ? (
          <div className="text-center py-4">
            <p className="text-gray-400">Loading profile data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-4">
              <AvatarUpload onAvatarChange={setAvatarUrl} avatarUrl={avatarUrl} />
            </div>

            <div>
              <Label htmlFor="displayName" className="text-white">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                required
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="bg-black text-white border-0 hover:bg-black"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-white hover:bg-gray-100 text-black"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupporterProfileModal;
