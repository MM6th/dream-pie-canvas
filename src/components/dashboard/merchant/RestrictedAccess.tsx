
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import MerchantBenefitsModal from "@/components/profile/MerchantBenefitsModal";

interface RestrictedAccessProps {
  onProfileUpdate: () => void;
}

const RestrictedAccess = ({ onProfileUpdate: _onProfileUpdate }: RestrictedAccessProps) => {
  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardContent className="p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-4">Access Restricted</h3>
        <p className="text-gray-300 mb-3">
          Upload and posting features are restricted until your merchant application is approved.
        </p>
        <p className="text-gray-400 mb-6">
          No action is required right now—your application is pending admin review.
        </p>

        <div className="flex flex-col items-center gap-2">
          <MerchantBenefitsModal />
        </div>
      </CardContent>
    </Card>
  );
};

export default RestrictedAccess;

