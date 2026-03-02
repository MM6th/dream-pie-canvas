import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, MessageSquare, Users, BookOpen, Film, LogOut, Coins } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

interface AppNavBarProps {
  showBackToDashboard?: boolean;
  onBackToDashboard?: () => void;
}

const AppNavBar = ({ showBackToDashboard, onBackToDashboard }: AppNavBarProps = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { signOut } = useAuth();

  const isActivePage = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  const handleStoreView = () => {
    navigate('/');
    setTimeout(() => {
      window.dispatchEvent(new Event('navigateToStore'));
    }, 100);
  };

  const btnClass = (active: boolean) =>
    `border ${active ? 'bg-primary border-primary' : 'bg-transparent border-gray-600'} text-white hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`;

  const iconClass = isMobile ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-4 relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className={`flex gap-2 ${isMobile ? 'flex-wrap w-full' : ''}`}>
          {(location.pathname !== '/' || showBackToDashboard) && (
            <Button
              onClick={onBackToDashboard || (() => navigate('/'))}
              className={`bg-black text-white border-0 hover:bg-black ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
            >
              <ArrowLeft className={`${iconClass} mr-1`} />
              {isMobile ? 'Dashboard' : 'Back to Dashboard'}
            </Button>
          )}
          <Button onClick={handleStoreView} variant="outline" className={btnClass(false)}>
            <ShoppingBag className={`${iconClass} mr-1`} />
            Store
          </Button>
          <Button onClick={() => navigate('/bulletin')} variant="outline" className={btnClass(isActivePage('/bulletin'))}>
            <MessageSquare className={`${iconClass} mr-1`} />
            Community
          </Button>
          <Button onClick={() => navigate('/profiles')} variant="outline" className={btnClass(isActivePage('/profiles'))}>
            <Users className={`${iconClass} mr-1`} />
            Trending
          </Button>
          <Button onClick={() => navigate('/about-author')} variant="outline" className={btnClass(isActivePage('/about-author'))}>
            <BookOpen className={`${iconClass} mr-1`} />
            {isMobile ? 'Founder' : 'About Founder'}
          </Button>
          <Button onClick={() => navigate('/films')} variant="outline" className={btnClass(isActivePage('/films'))}>
            <Film className={`${iconClass} mr-1`} />
            Films
          </Button>
          <Button onClick={() => navigate('/mint')} variant="outline" className={btnClass(isActivePage('/mint'))}>
            <img src={sixthCoinLogo} alt="SIXTH" className={`${iconClass} rounded-full object-cover mr-1`} />
            Mint
          </Button>
          <Button
            onClick={() => navigate('/my-assets')}
            variant="outline"
            className={`border ${isActivePage('/my-assets') ? 'bg-primary border-primary' : 'border-amber-600/50 bg-transparent'} text-amber-400 hover:bg-amber-900/20 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
          >
            <img src={sixthCoinLogo} alt="SIXTH" className={`${iconClass} rounded-full mr-1`} />
            {isMobile ? 'Assets' : 'My Assets'}
          </Button>
        </div>

        <Button
          onClick={handleSignOut}
          className={`bg-white text-black hover:bg-gray-100 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full sm:w-auto' : ''}`}
        >
          <LogOut className={`${iconClass} mr-1`} />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default AppNavBar;
