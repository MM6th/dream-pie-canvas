
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Film, MessageSquare } from "lucide-react";
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
      {/* Header with proper alignment */}
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              onClick={onBackToDashboard}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button
              onClick={onFilmsView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <Film className="w-4 h-4 mr-2" />
              Browse Films
            </Button>
            <Button
              onClick={onBulletinView}
              variant="outline"
              className="border-gray-600 text-white bg-transparent hover:bg-gray-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Browse Bulletin
            </Button>
          </div>
          <Button
            onClick={onSignOut}
            className="bg-white text-black hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
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
