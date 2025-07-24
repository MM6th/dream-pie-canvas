
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
  const [isAdultCreator, setIsAdultCreator] = useState(profile?.is_adult_creator || false);
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBusinessName(profile.business_name || '');
      setBusinessDescription(profile.business_description || '');
      setWebsite(profile.website || '');
      setIsAdultCreator(profile.is_adult_creator || false);
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
          is_adult_creator: isAdultCreator,
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
        <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Update Merchant Profile</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
      <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Update Merchant Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
