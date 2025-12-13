import React from 'react';
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import MerchantDashboard from "@/components/dashboard/MerchantDashboard";
import SupporterDashboard from "@/components/dashboard/SupporterDashboard";
import AudioPodcasterDashboard from "@/components/dashboard/AudioPodcasterDashboard";
import MusicArtistDashboard from "@/components/dashboard/MusicArtistDashboard";
import { TutorialHelpButton } from "@/components/TutorialHelpButton";
import { supporterTutorialSteps, merchantTutorialSteps, adminTutorialSteps, musicArtistTutorialSteps } from "@/constants/tutorialContent";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
}

interface DashboardViewProps {
  userProfile: any;
  profileLoading: boolean;
  onStoreView: () => void;
  onBulletinView: () => void;
  onProfilesView: () => void;
  onSignOut: () => void;
  onProfileUpdate: () => void;
  isApproved: boolean;
  isAdmin: boolean;
  onSuccess: () => void;
  onBackgroundUpload: (url: string) => void;
  purchasedTracks: AudioTrack[];
  purchasedPodcasts: AudioTrack[];
}

const DashboardView = ({
  userProfile,
  profileLoading,
  onStoreView,
  onBulletinView,
  onProfilesView,
  onSignOut,
  onProfileUpdate,
  isApproved,
  isAdmin,
  onSuccess,
  onBackgroundUpload,
  purchasedTracks,
  purchasedPodcasts,
}: DashboardViewProps) => {
  const backgroundStyle = userProfile?.background_image_url 
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${userProfile.background_image_url})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }
    : {};

  // Determine which tutorial to show based on user type
  const getTutorialHelpButton = () => {
    if (isAdmin) {
      return <TutorialHelpButton steps={adminTutorialSteps} userType="admin" />;
    } else if (userProfile?.user_type === "merchant") {
      // Use industry-specific tutorial for Music Artists
      if (userProfile?.industry === 'Music Artist') {
        return <TutorialHelpButton steps={musicArtistTutorialSteps} userType="merchant" />;
      }
      return <TutorialHelpButton steps={merchantTutorialSteps} userType="merchant" />;
    } else {
      return <TutorialHelpButton steps={supporterTutorialSteps} userType="supporter" />;
    }
  };

  // Determine which dashboard to render based on user type and skills
  const renderDashboard = () => {
    if (profileLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading profile...</div>
        </div>
      );
    }

    // Check if user is a supporter (not a merchant)
    if (userProfile?.user_type !== "merchant") {
      return (
        <SupporterDashboard 
          onBackgroundUpload={onBackgroundUpload}
          purchasedTracks={purchasedTracks}
          purchasedPodcasts={purchasedPodcasts}
        />
      );
    }

    // For merchants, check industry to determine specialized dashboard
    const industry = userProfile?.industry;

    // Route Music Artists to their specialized dashboard
    if (industry === 'Music Artist') {
      return (
        <MusicArtistDashboard 
          onBackgroundUpload={onBackgroundUpload}
          purchasedTracks={purchasedTracks}
          purchasedPodcasts={purchasedPodcasts}
          onSuccess={onSuccess}
        />
      );
    }

    // Route Audio Podcasters to their specialized dashboard
    if (industry === 'Audio Podcaster') {
      return (
        <AudioPodcasterDashboard 
          onBackgroundUpload={onBackgroundUpload}
          purchasedTracks={purchasedTracks}
          purchasedPodcasts={purchasedPodcasts}
          onSuccess={onSuccess}
        />
      );
    }

    // Default merchant dashboard for all other merchant types
    return (
      <MerchantDashboard 
        onSuccess={onSuccess}
        onViewStore={onStoreView}
        onBackgroundUpload={onBackgroundUpload}
        purchasedTracks={purchasedTracks}
        purchasedPodcasts={purchasedPodcasts}
        userProfile={userProfile}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 overflow-x-hidden" style={backgroundStyle}>
      <DashboardHeader 
        onStoreView={onStoreView} 
        onBulletinView={onBulletinView}
        onProfilesView={onProfilesView}
        onSignOut={onSignOut}
        userType={userProfile?.user_type}
        onProfileUpdate={onProfileUpdate}
        isApproved={isApproved}
        isAdmin={isAdmin}
        tutorialHelpButton={getTutorialHelpButton()}
      />
      
      {renderDashboard()}
    </div>
  );
};

export default DashboardView;
