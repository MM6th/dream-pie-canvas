
import React from 'react';
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import MerchantDashboard from "@/components/dashboard/MerchantDashboard";
import SupporterDashboard from "@/components/dashboard/SupporterDashboard";
import LiveStreamArtistDashboard from "@/components/dashboard/LiveStreamArtistDashboard";
import { TutorialHelpButton } from "@/components/TutorialHelpButton";
import { supporterTutorialSteps, merchantTutorialSteps, adminTutorialSteps } from "@/constants/tutorialContent";

interface AudioTrack {
  id: string;
  title: string;
  artist_name: string | null;
  audio_file_url: string;
  thumbnail_url: string | null;
}

interface VideoTrack {
  id: string;
  title: string;
  description: string | null;
  video_file_url: string;
  thumbnail_url: string | null;
  background_music_url: string | null;
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
  purchasedVideos: VideoTrack[];
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
  purchasedVideos,
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
      return <TutorialHelpButton steps={merchantTutorialSteps} userType="merchant" />;
    } else {
      return <TutorialHelpButton steps={supporterTutorialSteps} userType="supporter" />;
    }
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
      
      {profileLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading profile...</div>
        </div>
      ) : (
        <>
          {userProfile?.user_type === "merchant" ? (
            <MerchantDashboard 
              onSuccess={onSuccess}
              onViewStore={onStoreView}
              onBackgroundUpload={onBackgroundUpload}
              purchasedTracks={purchasedTracks}
              purchasedPodcasts={purchasedPodcasts}
              purchasedVideos={purchasedVideos}
              userProfile={userProfile}
            />
          ) : userProfile?.skills?.includes('Live Stream Artist') ? (
            <LiveStreamArtistDashboard 
              onBackgroundUpload={onBackgroundUpload}
              purchasedTracks={purchasedTracks}
              purchasedPodcasts={purchasedPodcasts}
              purchasedVideos={purchasedVideos}
            />
          ) : (
            <SupporterDashboard 
              onBackgroundUpload={onBackgroundUpload}
              purchasedTracks={purchasedTracks}
              purchasedPodcasts={purchasedPodcasts}
              purchasedVideos={purchasedVideos}
            />
          )}
        </>
      )}
    </div>
  );
};

export default DashboardView;
