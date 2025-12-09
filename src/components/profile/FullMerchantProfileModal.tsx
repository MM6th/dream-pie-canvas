import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AvatarUpload from "./AvatarUpload";
import { Trash2, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SkillsInput } from "@/components/profile/SkillsInput";
import { VisibilityToggleWithHelp } from "./VisibilityToggleWithHelp";

interface FullMerchantProfileModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  profile?: any;
  onProfileUpdate?: () => void;
  children?: React.ReactNode;
}

const FullMerchantProfileModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  profile, 
  onProfileUpdate,
  children 
}: FullMerchantProfileModalProps) => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [snapchatUrl, setSnapchatUrl] = useState('');
  const [pinterestUrl, setPinterestUrl] = useState('');
  const [onlyfansUrl, setOnlyfansUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAdultCreator, setIsAdultCreator] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [playlistPublic, setPlaylistPublic] = useState(false);
  const [portfoliosPublic, setPortfoliosPublic] = useState(false);
  const [socialLinksPublic, setSocialLinksPublic] = useState(false);
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
      console.log('Setting merchant profile form data:', profileToUse);
      setDisplayName(profileToUse.display_name || '');
      setBusinessName(profileToUse.business_name || '');
      setBusinessDescription(profileToUse.business_description || '');
      setWebsite(profileToUse.website || '');
      setContactEmail(profileToUse.contact_email || '');
      setPaypalEmail(profileToUse.paypal_email || '');
      setInstagramUrl(profileToUse.instagram_url || '');
      setFacebookUrl(profileToUse.facebook_url || '');
      setYoutubeUrl(profileToUse.youtube_url || '');
      setSnapchatUrl(profileToUse.snapchat_url || '');
      setPinterestUrl(profileToUse.pinterest_url || '');
      setOnlyfansUrl(profileToUse.onlyfans_url || '');
      setAvatarUrl(profileToUse.avatar_url || '');
      setIsAdultCreator(profileToUse.is_adult_creator || false);
      setSkills(profileToUse.skills || []);
      setPlaylistPublic(profileToUse.playlist_public || false);
      setPortfoliosPublic(profileToUse.portfolios_public || false);
      setSocialLinksPublic(profileToUse.social_links_public || false);
    }
  }, [profile, currentProfile]);

  const fetchProfileData = async () => {
    if (!user) return;

    console.log('Fetching profile data for merchant modal:', user.id);
    setFetchingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile in merchant modal:', error);
      } else {
        console.log('Profile fetched in merchant modal:', data);
        setCurrentProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile in merchant modal:', error);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    console.log('Submitting merchant profile update:', {
      displayName, businessName, paypalEmail
    });

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          business_name: businessName,
          business_description: businessDescription,
          website: website,
          contact_email: contactEmail,
          paypal_email: paypalEmail,
          instagram_url: instagramUrl,
          facebook_url: facebookUrl,
          youtube_url: youtubeUrl,
          snapchat_url: snapchatUrl,
          pinterest_url: pinterestUrl,
          onlyfans_url: onlyfansUrl,
          avatar_url: avatarUrl,
          is_adult_creator: isAdultCreator,
          skills: skills,
          playlist_public: playlistPublic,
          portfolios_public: portfoliosPublic,
          social_links_public: socialLinksPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log('Merchant profile updated successfully');
      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });

      if (onSuccess) onSuccess();
      if (onProfileUpdate) onProfileUpdate();
      if (onClose) onClose();
      setInternalOpen(false);
    } catch (error) {
      console.error('Error updating merchant profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user) return;

    setDeleteLoading(true);
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
    } finally {
      setDeleteLoading(false);
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
        <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Update Merchant Profile</DialogTitle>
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
              
              <div>
                <Label htmlFor="businessName" className="text-white">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="businessDescription" className="text-white">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Describe your business..."
                  rows={4}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              {/* Skills Input */}
              <SkillsInput
                skills={skills}
                onSkillsChange={setSkills}
              />
              
              <div>
                <Label htmlFor="website" className="text-white">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://your-website.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactEmail" className="text-white">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@email.com"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="paypalEmail" className="text-white">PayPal Email</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="paypal@email.com"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instagramUrl" className="text-white">Instagram URL</Label>
                  <Input
                    id="instagramUrl"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/username"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="facebookUrl" className="text-white">Facebook URL</Label>
                  <Input
                    id="facebookUrl"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/username"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="youtubeUrl" className="text-white">YouTube URL</Label>
                  <Input
                    id="youtubeUrl"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/channel/..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="snapchatUrl" className="text-white">Snapchat URL</Label>
                  <Input
                    id="snapchatUrl"
                    value={snapchatUrl}
                    onChange={(e) => setSnapchatUrl(e.target.value)}
                    placeholder="https://snapchat.com/add/username"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pinterestUrl" className="text-white">Pinterest URL</Label>
                  <Input
                    id="pinterestUrl"
                    value={pinterestUrl}
                    onChange={(e) => setPinterestUrl(e.target.value)}
                    placeholder="https://pinterest.com/username"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="onlyfansUrl" className="text-white">OnlyFans URL</Label>
                  <Input
                    id="onlyfansUrl"
                    value={onlyfansUrl}
                    onChange={(e) => setOnlyfansUrl(e.target.value)}
                    placeholder="https://onlyfans.com/username"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              
              {/* Adult Creator Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <Label htmlFor="isAdultCreator" className="text-white font-medium">
                      I am an Adult Content Creator
                    </Label>
                    <p className="text-sm text-gray-400">
                      Check this if you create adult content. This will allow you to see and participate in adult/18+ opportunities.
                    </p>
                  </div>
                </div>
                <Switch
                  id="isAdultCreator"
                  checked={isAdultCreator}
                  onCheckedChange={setIsAdultCreator}
                />
              </div>

              {/* Visibility Toggles with Help Icons */}
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-2">
                  All profiles are private by default. Choose what non-followers can see:
                </p>
                <VisibilityToggleWithHelp
                  type="playlist"
                  checked={playlistPublic}
                  onCheckedChange={setPlaylistPublic}
                />
                <VisibilityToggleWithHelp
                  type="portfolios"
                  checked={portfoliosPublic}
                  onCheckedChange={setPortfoliosPublic}
                />
                <VisibilityToggleWithHelp
                  type="social_links"
                  checked={socialLinksPublic}
                  onCheckedChange={setSocialLinksPublic}
                />
              </div>
              
              <div className="flex justify-between items-center gap-2 pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Profile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-800 border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Profile</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This action cannot be undone. This will permanently delete your profile and remove all your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteProfile}
                        disabled={deleteLoading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deleteLoading ? 'Deleting...' : 'Delete Profile'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="flex gap-2">
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
      <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Update Merchant Profile</DialogTitle>
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
            
            <div>
              <Label htmlFor="businessName" className="text-white">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="businessDescription" className="text-white">Business Description</Label>
              <Textarea
                id="businessDescription"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Describe your business..."
                rows={4}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="website" className="text-white">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://your-website.com"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail" className="text-white">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@email.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="paypalEmail" className="text-white">PayPal Email</Label>
                <Input
                  id="paypalEmail"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="paypal@email.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagramUrl" className="text-white">Instagram URL</Label>
                <Input
                  id="instagramUrl"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/username"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="facebookUrl" className="text-white">Facebook URL</Label>
                <Input
                  id="facebookUrl"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/username"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="youtubeUrl" className="text-white">YouTube URL</Label>
                <Input
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/channel/..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="snapchatUrl" className="text-white">Snapchat URL</Label>
                <Input
                  id="snapchatUrl"
                  value={snapchatUrl}
                  onChange={(e) => setSnapchatUrl(e.target.value)}
                  placeholder="https://snapchat.com/add/username"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pinterestUrl" className="text-white">Pinterest URL</Label>
                <Input
                  id="pinterestUrl"
                  value={pinterestUrl}
                  onChange={(e) => setPinterestUrl(e.target.value)}
                  placeholder="https://pinterest.com/username"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="onlyfansUrl" className="text-white">OnlyFans URL</Label>
                <Input
                  id="onlyfansUrl"
                  value={onlyfansUrl}
                  onChange={(e) => setOnlyfansUrl(e.target.value)}
                  placeholder="https://onlyfans.com/username"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            
            {/* Adult Creator Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-400" />
                <div>
                  <Label htmlFor="isAdultCreator2" className="text-white font-medium">
                    I am an Adult Content Creator
                  </Label>
                  <p className="text-sm text-gray-400">
                    Check this if you create adult content. This will allow you to see and participate in adult/18+ opportunities.
                  </p>
                </div>
              </div>
              <Switch
                id="isAdultCreator2"
                checked={isAdultCreator}
                onCheckedChange={setIsAdultCreator}
              />
            </div>

            {/* Visibility Toggles with Help Icons */}
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-2">
                All profiles are private by default. Choose what non-followers can see:
              </p>
              <VisibilityToggleWithHelp
                type="playlist"
                checked={playlistPublic}
                onCheckedChange={setPlaylistPublic}
              />
              <VisibilityToggleWithHelp
                type="portfolios"
                checked={portfoliosPublic}
                onCheckedChange={setPortfoliosPublic}
              />
              <VisibilityToggleWithHelp
                type="social_links"
                checked={socialLinksPublic}
                onCheckedChange={setSocialLinksPublic}
              />
            </div>
            
            <div className="flex justify-between items-center gap-2 pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Profile
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-800 border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Delete Profile</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      This action cannot be undone. This will permanently delete your profile and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteProfile}
                      disabled={deleteLoading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete Profile'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
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
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FullMerchantProfileModal;
