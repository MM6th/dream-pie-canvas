
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Shield, Lock, Cake, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { SkillsInput } from "@/components/profile/SkillsInput";
import { getZodiacSign } from "@/utils/zodiacUtils";

interface MerchantProfileModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  profile?: any;
  onProfileUpdate?: () => void;
  children?: React.ReactNode;
}

const MerchantProfileModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  profile, 
  onProfileUpdate,
  children 
}: MerchantProfileModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [businessName, setBusinessName] = useState(profile?.business_name || '');
  const [businessDescription, setBusinessDescription] = useState(profile?.business_description || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [youtubeUrl, setYoutubeUrl] = useState(profile?.youtube_url || '');
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagram_url || '');
  const [facebookUrl, setFacebookUrl] = useState(profile?.facebook_url || '');
  const [snapchatUrl, setSnapchatUrl] = useState(profile?.snapchat_url || '');
  const [pinterestUrl, setPinterestUrl] = useState(profile?.pinterest_url || '');
  const [onlyfansUrl, setOnlyfansUrl] = useState(profile?.onlyfans_url || '');
  const [isAdultCreator, setIsAdultCreator] = useState(profile?.is_adult_creator || false);
  const [isPrivate, setIsPrivate] = useState(profile?.is_private || false);
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
  const [showAge, setShowAge] = useState(profile?.show_age || false);
  const [showZodiacSign, setShowZodiacSign] = useState(profile?.show_zodiac_sign || false);
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBusinessName(profile.business_name || '');
      setBusinessDescription(profile.business_description || '');
      setWebsite(profile.website || '');
      setYoutubeUrl(profile.youtube_url || '');
      setInstagramUrl(profile.instagram_url || '');
      setFacebookUrl(profile.facebook_url || '');
      setSnapchatUrl(profile.snapchat_url || '');
      setPinterestUrl(profile.pinterest_url || '');
      setOnlyfansUrl(profile.onlyfans_url || '');
      setIsAdultCreator(profile.is_adult_creator || false);
      setIsPrivate(profile.is_private || false);
      setSkills(profile.skills || []);
      setDateOfBirth(profile.date_of_birth || '');
      setShowAge(profile.show_age || false);
      setShowZodiacSign(profile.show_zodiac_sign || false);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          business_name: businessName,
          business_description: businessDescription,
          website: website,
          youtube_url: youtubeUrl,
          instagram_url: instagramUrl,
          facebook_url: facebookUrl,
          snapchat_url: snapchatUrl,
          pinterest_url: pinterestUrl,
          onlyfans_url: onlyfansUrl,
          is_adult_creator: isAdultCreator,
          is_private: isPrivate,
          skills: skills,
          date_of_birth: dateOfBirth || null,
          show_age: showAge,
          show_zodiac_sign: showZodiacSign,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });

      if (onSuccess) onSuccess();
      if (onProfileUpdate) onProfileUpdate();
      if (onClose) onClose();
      setInternalOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
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
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Update Merchant Profile</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-3">
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
                <Label htmlFor="youtubeUrl" className="text-white">YouTube URL</Label>
                <Input
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@username"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            {/* Private Profile Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-blue-400" />
                <div>
                  <Label htmlFor="isPrivate" className="text-white font-medium">
                    Make Profile Private
                  </Label>
                  <p className="text-sm text-gray-400">
                    Only approved followers can view your posts, social links, and playlist
                  </p>
                </div>
              </div>
              <Switch
                id="isPrivate"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
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
        </DialogContent>
      </Dialog>
    );
  }

  // Original controlled pattern
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Update Merchant Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3">
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
              <Label htmlFor="youtubeUrl2" className="text-white">YouTube URL</Label>
              <Input
                id="youtubeUrl2"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/@username"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="instagramUrl2" className="text-white">Instagram URL</Label>
              <Input
                id="instagramUrl2"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/username"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="facebookUrl2" className="text-white">Facebook URL</Label>
              <Input
                id="facebookUrl2"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/username"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="snapchatUrl2" className="text-white">Snapchat URL</Label>
              <Input
                id="snapchatUrl2"
                value={snapchatUrl}
                onChange={(e) => setSnapchatUrl(e.target.value)}
                placeholder="https://snapchat.com/add/username"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pinterestUrl2" className="text-white">Pinterest URL</Label>
              <Input
                id="pinterestUrl2"
                value={pinterestUrl}
                onChange={(e) => setPinterestUrl(e.target.value)}
                placeholder="https://pinterest.com/username"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="onlyfansUrl2" className="text-white">OnlyFans URL</Label>
              <Input
                id="onlyfansUrl2"
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

          {/* Private Profile Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-blue-400" />
              <div>
                <Label htmlFor="isPrivate2" className="text-white font-medium">
                  Make Profile Private
                </Label>
                <p className="text-sm text-gray-400">
                  Only approved followers can view your posts, social links, and playlist
                </p>
              </div>
            </div>
            <Switch
              id="isPrivate2"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
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
      </DialogContent>
    </Dialog>
  );
};

export default MerchantProfileModal;
