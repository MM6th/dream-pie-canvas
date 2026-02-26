import React from "react";
import AudioPlayer from "@/components/AudioPlayer";
import PodcastAudioPlayer from "@/components/PodcastAudioPlayer";
import PurchasedPortfoliosViewer from "@/components/dashboard/PurchasedPortfoliosViewer";
import PurchasedFilmsViewer from "@/components/dashboard/PurchasedFilmsViewer";

interface MediaPlayersProps {
  purchasedTracks: any[];
  purchasedPodcasts: any[];
  purchasedPortfolios: any[];
}

const MediaPlayers = ({ purchasedTracks, purchasedPodcasts, purchasedPortfolios }: MediaPlayersProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AudioPlayer tracks={purchasedTracks} />
        <PodcastAudioPlayer tracks={purchasedPodcasts} />
        <PurchasedFilmsViewer />
      </div>
      <PurchasedPortfoliosViewer portfolios={purchasedPortfolios} />
    </div>
  );
};

export default MediaPlayers;
