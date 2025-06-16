
import React from "react";
import { Button } from "@/components/ui/button";
import { Store, LogOut, Film, MessageSquare, User } from "lucide-react";
import MerchantProfileModal from "@/components/profile/MerchantProfileModal";

interface DashboardHeaderProps {
  onStoreView: () => void;
  onFilmsView: () => void;
  onBulletinView: () => void;
  onSignOut: () => void;
  userType?: string;
  onProfileUpdate?: () => void;
  isApproved?: boolean;
  isAdmin?: boolean;
}

const DashboardHeader = ({ 
  onStoreView, 
  onFilmsView, 
  onBulletinView, 
  onSignOut, 
  userType,
  onProfileUpdate,
  isApproved,
  isAdmin,
}: DashboardHeaderProps) => {
  const showNavigation = userType === 'supporter' || isApproved || isAdmin;

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
      <div className="flex gap-2">
        {userType === "merchant" && (
          <MerchantProfileModal onProfileUpdate={onProfileUpdate}>
            <Button
              variant="outline"
              className="border-gray-600 text-white bg-transparent"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </MerchantProfileModal>
        )}
        {showNavigation && (
          <>
            <Button
              onClick={onStoreView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent"
            >
              <Store className="w-4 h-4 mr-2" />
              Browse Store
            </Button>
            <Button
              onClick={onFilmsView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent"
            >
              <Film className="w-4 h-4 mr-2" />
              Browse Films
            </Button>
            <Button
              onClick={onBulletinView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Browse Bulletin
            </Button>
          </>
        )}
      </div>
      <Button
        onClick={onSignOut}
        className="bg-white text-black"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default DashboardHeader;
