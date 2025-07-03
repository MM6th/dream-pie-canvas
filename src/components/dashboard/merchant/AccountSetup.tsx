
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FullMerchantProfileModal from "@/components/profile/FullMerchantProfileModal";
import PublishingRoyaltiesModal from "@/components/profile/PublishingRoyaltiesModal";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle } from "lucide-react";

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

        <div className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-lg">
          <div className="flex flex-col items-start space-y-2">
            <Button 
              variant="link" 
              className="text-blue-400 hover:text-blue-300 p-0 h-auto justify-start"
              onClick={handleComingSoon}
            >
              Independent Contractor Agreement (Coming Soon)
            </Button>
            <PublishingRoyaltiesModal />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccountSetup;
