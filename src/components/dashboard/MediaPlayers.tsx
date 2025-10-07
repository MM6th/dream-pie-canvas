
import React from "react";
import AudioPlayer from "@/components/AudioPlayer";
import VideoPlayer from "@/components/VideoPlayer";
import PodcastAudioPlayer from "@/components/PodcastAudioPlayer";
import PurchasedPortfoliosViewer from "@/components/dashboard/PurchasedPortfoliosViewer";

interface MediaPlayersProps {
  purchasedTracks: any[];
  purchasedPodcasts: any[];
  purchasedVideos: any[];
  purchasedPortfolios: any[];
}

const MediaPlayers = ({ purchasedTracks, purchasedPodcasts, purchasedVideos, purchasedPortfolios }: MediaPlayersProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AudioPlayer tracks={purchasedTracks} />
        <PodcastAudioPlayer tracks={purchasedPodcasts} />
      </div>
      <VideoPlayer videos={purchasedVideos} />
      <PurchasedPortfoliosViewer portfolios={purchasedPortfolios} />
    </div>
  );
};

export default MediaPlayers;
