
import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut, ShoppingBag, Film, MessageSquare, User } from "lucide-react";
import FullMerchantProfileModal from "@/components/profile/FullMerchantProfileModal";

interface DashboardHeaderProps {
  onStoreView: () => void;
  onFilmsView: () => void;
  onBulletinView: () => void;
  onSignOut: () => void;
  userType?: string;
  onProfileUpdate: () => void;
  isApproved: boolean;
  isAdmin: boolean;
}

const DashboardHeader = ({ 
  onStoreView, 
  onFilmsView, 
  onBulletinView, 
  onSignOut, 
  userType, 
  onProfileUpdate,
  isApproved,
  isAdmin 
}: DashboardHeaderProps) => {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-4 pb-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {(isApproved || isAdmin) && (
            <>
              <Button
                onClick={onStoreView}
                variant="outline"
                className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Browse Store
              </Button>
              <Button
                onClick={onFilmsView}
                variant="outline"
                className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
              >
                <Film className="w-4 h-4 mr-2" />
                Browse Films
              </Button>
              <Button
                onClick={onBulletinView}
                variant="outline"
                className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Browse Bulletin
              </Button>
            </>
          )}
          {userType === "merchant" && (
            <FullMerchantProfileModal onProfileUpdate={onProfileUpdate}>
              <Button
                variant="outline"
                className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
              >
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </FullMerchantProfileModal>
          )}
        </div>
        <Button
          onClick={onSignOut}
          className="bg-white text-black hover:bg-gray-100"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
