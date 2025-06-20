
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FullMerchantProfileModal from "@/components/profile/FullMerchantProfileModal";
import TunecoreRoyaltyModal from "@/components/profile/TunecoreRoyaltyModal";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, User } from "lucide-react";

interface AccountSetupProps {
  userProfile: any;
  onProfileUpdate: () => void;
}

const AccountSetup = ({ userProfile, onProfileUpdate }: AccountSetupProps) => {
  const handleComingSoon = () => {
    toast({
      title: "Coming Soon!",
      description: "This feature is currently under development. Stay tuned!",
    });
  };

  return (
    <Card className="mb-8 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white text-xl">Account Setup & Agreements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
          {userProfile?.paypal_email ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Payment Information Complete</p>
                <p className="text-gray-400 text-sm">Your PayPal email is on file for payouts.</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-white font-medium">Action Required: Add Payment Information</p>
                <p className="text-gray-400 text-sm">Please add your PayPal email to receive payments.</p>
              </div>
              <FullMerchantProfileModal 
                profile={userProfile}
                onProfileUpdate={onProfileUpdate}
              >
                <Button size="sm" className="ml-auto">Update Profile</Button>
              </FullMerchantProfileModal>
            </>
          )}
        </div>

        {userProfile && (
          <div className="p-4 bg-gray-700/50 rounded-lg">
            <h3 className="text-white font-medium mb-3">Current Profile Information</h3>
            <div className="flex items-center gap-4 mb-3">
              {userProfile.avatar_url && (
                <img
                  src={userProfile.avatar_url}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="text-white">{userProfile.display_name || 'No display name set'}</p>
                <p className="text-gray-400 text-sm">{userProfile.business_name || 'No business name set'}</p>
              </div>
            </div>
            <FullMerchantProfileModal 
              profile={userProfile}
              onProfileUpdate={onProfileUpdate}
            >
              <Button size="sm" variant="outline" className="text-white border-gray-600">
                <User className="w-4 h-4 mr-2" />
                Edit Full Profile
              </Button>
            </FullMerchantProfileModal>
          </div>
        )}

        <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
          <div className="flex flex-col items-start space-y-2">
            <Button 
              variant="link" 
              className="text-blue-400 hover:text-blue-300 p-0 h-auto justify-start"
              onClick={handleComingSoon}
            >
              Independent Contractor Agreement (Coming Soon)
            </Button>
            <TunecoreRoyaltyModal />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountSetup;
