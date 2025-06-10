
import React from "react";
import AudioPlayer from "@/components/AudioPlayer";
import VideoPlayer from "@/components/VideoPlayer";

interface MediaPlayersProps {
  purchasedTracks: any[];
  purchasedVideos: any[];
}

const MediaPlayers = ({ purchasedTracks, purchasedVideos }: MediaPlayersProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AudioPlayer tracks={purchasedTracks} />
      <VideoPlayer videos={purchasedVideos} />
    </div>
  );
};

export default MediaPlayers;
