
import React from 'react';
import { Button } from "@/components/ui/button";
import { LogOut, Film, MessageSquare } from "lucide-react";
import StorePage from "@/components/StorePage";

interface StoreViewProps {
  onBackToDashboard: () => void;
  onFilmsView: () => void;
  onBulletinView: () => void;
  onSignOut: () => void;
}

const StoreView = ({ onBackToDashboard, onFilmsView, onBulletinView, onSignOut }: StoreViewProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800">
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
        <div className="flex gap-2">
          <Button
            onClick={onBackToDashboard}
            variant="outline"
            className="border-gray-600 text-white hover:bg-white hover:text-black"
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={onFilmsView}
            variant="outline"
            className="border-gray-600 text-white hover:bg-white hover:text-black"
          >
            <Film className="w-4 h-4 mr-2" />
            Browse Films
          </Button>
          <Button
            onClick={onBulletinView}
            variant="outline"
            className="border-gray-600 text-white hover:bg-white hover:text-black"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Browse Bulletin
          </Button>
        </div>
        <Button
          onClick={onSignOut}
          className="bg-white text-black hover:bg-gray-100 hover:text-black"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <div className="pt-20">
        <StorePage />
      </div>
    </div>
  );
};

export default StoreView;
