
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, MessageSquare, Users, ShoppingBag, BookOpen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import StorePage from "@/components/StorePage";

interface StoreViewProps {
  onBackToDashboard: () => void;
  onBulletinView: () => void;
  onSignOut: () => void;
}

const StoreView = ({ onBackToDashboard, onBulletinView, onSignOut }: StoreViewProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Main Navigation */}
          <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
            <Button
              onClick={onBackToDashboard}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full' : ''}`}
            >
              <ArrowLeft className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Dashboard' : 'Back to Dashboard'}
            </Button>
            <Button
              variant="outline"
              className={`border bg-primary border-primary text-white hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full' : ''}`}
            >
              <ShoppingBag className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Store' : 'Browse Store'}
            </Button>
            <Button
              onClick={onBulletinView}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full' : ''}`}
            >
              <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Community' : 'Browse Community'}
            </Button>
            <Button
              onClick={() => navigate('/profiles')}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full' : ''}`}
            >
              <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Profiles' : 'Browse Profiles'}
            </Button>
            <Button
              onClick={() => navigate('/about-author')}
              variant="outline"
              className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full' : ''}`}
            >
              <BookOpen className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
              {isMobile ? 'Founder' : 'About Founder'}
            </Button>
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

      {/* Store content with proper container */}
      <div className="max-w-6xl mx-auto px-6">
        <StorePage />
      </div>
    </div>
  );
};

export default StoreView;
