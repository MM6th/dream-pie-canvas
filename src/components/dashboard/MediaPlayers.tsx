
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer";

interface MediaPlayersProps {
  purchasedTracks: any[];
}

const MediaPlayers = ({ purchasedTracks }: MediaPlayersProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AudioPlayer tracks={purchasedTracks} />

      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Video className="text-gray-400" size={24} />
            <h3 className="text-xl font-bold text-white">Video Player</h3>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="aspect-video bg-gray-800 rounded mb-4 flex items-center justify-center">
              <Video className="text-gray-600" size={48} />
            </div>
            <div className="flex items-center gap-4">
              <Button size="sm" className="bg-gray-600 hover:bg-gray-700" disabled>
                Play
              </Button>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full w-0"></div>
              </div>
              <span className="text-gray-400 text-sm">0:00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MediaPlayers;
