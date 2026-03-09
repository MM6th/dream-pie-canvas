
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, ShoppingBag, MessageSquare, User, Users, BookOpen, DollarSign, Film, Coins, ChevronDown, Radio } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import FullMerchantProfileModal from "@/components/profile/FullMerchantProfileModal";
import SupporterProfileModal from "@/components/profile/SupporterProfileModal";
import SECalculatorModal from "@/components/SECalculatorModal";
import { useQuarterlyIncome } from "@/hooks/useQuarterlyIncome";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBellButton } from "@/components/NotificationBellButton";
import { MessageCreditsIcon } from "@/components/messaging/MessageCreditsIcon";
import TokenCalculatorCard from "@/components/TokenCalculatorCard";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

// Calculate current quarter and year
const getCurrentQuarterLabel = () => {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();
  return `Q${quarter} ${year}`;
};

interface DashboardHeaderProps {
  onStoreView: () => void;
  onBulletinView: () => void;
  onProfilesView: () => void;
  onSignOut: () => void;
  userType?: string;
  onProfileUpdate: () => void;
  isApproved: boolean;
  isAdmin: boolean;
  tutorialHelpButton?: React.ReactNode;
  hideTokenCalculator?: boolean;
}

const DashboardHeader = ({ 
  onStoreView, 
  onBulletinView,
  onProfilesView, 
  onSignOut, 
  userType, 
  onProfileUpdate,
  isApproved,
  isAdmin,
  tutorialHelpButton,
  hideTokenCalculator
}: DashboardHeaderProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentQuarterIncome, companyIncome, contractorIncome } = useQuarterlyIncome(user?.id);
  const [supporterProfile, setSupporterProfile] = useState<any>(null);

  useEffect(() => {
    const fetchSupporterProfile = async () => {
      if (!user || userType !== "supporter") return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) setSupporterProfile(data);
    };
    
    fetchSupporterProfile();
  }, [user, userType]);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-4">
      {/* Financial Reports Section - Prominent Position */}
      {(isApproved || isAdmin) && (
        <div className="mb-4 flex items-center justify-between gap-4 px-6 py-4 bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-600/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider">{getCurrentQuarterLabel()} Income</span>
              <span className="text-2xl font-bold text-green-400">
                ${currentQuarterIncome.toFixed(2)}
              </span>
              {(companyIncome > 0 || contractorIncome > 0) && (
                <span className="text-xs text-green-300/70">
                  Company: ${companyIncome.toFixed(2)} {contractorIncome > 0 && `• Contractor: $${contractorIncome.toFixed(2)}`}
                </span>
              )}
            </div>
          </div>
          <SECalculatorModal 
            userId={user?.id} 
            autoPopulateIncome={currentQuarterIncome} 
          />
        </div>
      )}

      {isAdmin && !hideTokenCalculator && (
        <Collapsible className="mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between border-gray-600 text-white bg-gray-800 hover:bg-gray-700 mb-2">
              <span className="font-semibold">SIXTH Token Economics Calculator</span>
              <ChevronDown className="w-4 h-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <TokenCalculatorCard />
          </CollapsibleContent>
        </Collapsible>
      )}
      
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
                Store
              </Button>
              <Button
                onClick={onBulletinView}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <MessageSquare className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                Community
              </Button>
              <Button
                onClick={onProfilesView}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
              <Users className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                Trending
              </Button>
              <Button
                onClick={() => navigate('/about-author')}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <BookOpen className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {isMobile ? 'Founder' : 'About Founder'}
              </Button>
              <Button
                onClick={() => navigate('/films')}
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <Film className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                Films
              </Button>
              <Button
                onClick={() => navigate('/live')}
                variant="outline"
                className={`border-red-600/50 text-red-400 bg-transparent hover:bg-red-900/20 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <Radio className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                Live
              </Button>
              <Button
                onClick={() => navigate('/my-assets')}
                variant="outline"
                className={`border-amber-600/50 text-amber-400 bg-transparent hover:bg-amber-900/20 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <img src={sixthCoinLogo} alt="SIXTH" className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} rounded-full mr-1`} />
                {isMobile ? 'Assets' : 'My Assets'}
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
          {userType === "supporter" && (
            <SupporterProfileModal profile={supporterProfile} onProfileUpdate={onProfileUpdate}>
              <Button
                variant="outline"
                className={`border-gray-600 text-white bg-transparent hover:bg-gray-700 ${isMobile ? 'text-xs px-3 py-2 h-8' : ''}`}
              >
                <User className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
                {isMobile ? 'Profile' : 'Edit Profile'}
              </Button>
            </SupporterProfileModal>
          )}
        </div>
        
        {/* Inbox, Credits, Help & Sign Out */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            {user && (
              <NotificationBellButton userId={user.id} userType={userType || ''} />
            )}
            {tutorialHelpButton}
          </div>
          <Button
            onClick={onSignOut}
            className={`bg-white text-black hover:bg-gray-100 ${isMobile ? 'text-xs px-3 py-2 h-8 w-full sm:w-auto' : ''}`}
          >
            <LogOut className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Token Balance + Mint row */}
      {(isApproved || isAdmin) && user && (
        <div className="mt-3 flex items-center gap-2 px-1">
          <MessageCreditsIcon userId={user.id} userType={userType === 'merchant' ? 'merchant' : 'supporter'} />
          <Button
            onClick={() => navigate('/mint')}
            variant="outline"
            size="sm"
            className={`border-amber-600/50 text-amber-400 bg-transparent hover:bg-amber-900/20 ${isMobile ? 'text-xs px-3 h-8' : 'h-8'}`}
          >
            <img src={sixthCoinLogo} alt="SIXTH" className="w-4 h-4 rounded-full object-cover mr-1" />
            Buy Tokens
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
