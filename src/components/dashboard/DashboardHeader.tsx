
import React from "react";
import { Button } from "@/components/ui/button";
import { LogOut, ShoppingBag, MessageSquare, User, Users, BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import FullMerchantProfileModal from "@/components/profile/FullMerchantProfileModal";

interface DashboardHeaderProps {
  onStoreView: () => void;
  onBulletinView: () => void;
  onProfilesView: () => void;
  onSignOut: () => void;
  userType?: string;
  onProfileUpdate: () => void;
  isApproved: boolean;
  isAdmin: boolean;
}

const DashboardHeader = ({ 
  onStoreView, 
  onBulletinView,
  onProfilesView, 
  onSignOut, 
  userType, 
  onProfileUpdate,
  isApproved,
  isAdmin
}: DashboardHeaderProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Main Navigation */}
        <div className={`flex gap-2 ${isMobile ? 'flex-wrap w-full' : ''}`}>
          {(isApproved || isAdmin) && (
            <>
              <Button
                onClick={onStoreView}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <ShoppingBag className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {isMobile ? 'Store' : 'Browse Store'}
              </Button>
              <Button
                onClick={onBulletinView}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {isMobile ? 'Community' : 'Browse Community'}
              </Button>
              <Button
                onClick={onProfilesView}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {isMobile ? 'Profiles' : 'Browse Profiles'}
              </Button>
              <Button
                onClick={() => navigate('/about-author')}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <BookOpen className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {isMobile ? 'Founder' : 'About Founder'}
              </Button>
            </>
          )}
          {userType === "merchant" && (
            <FullMerchantProfileModal onProfileUpdate={onProfileUpdate}>
              <Button
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <User className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {isMobile ? 'Profile' : 'Edit Profile'}
              </Button>
            </FullMerchantProfileModal>
          )}
        </div>
        
        {/* Sign Out Button */}
        <Button
          onClick={onSignOut}
          className={`bg-white text-black hover:bg-gray-100 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full sm:w-auto' : ''}`}
        >
          <LogOut className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
