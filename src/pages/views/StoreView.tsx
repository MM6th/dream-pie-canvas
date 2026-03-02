
import React from "react";
import StorePage from "@/components/StorePage";
import AppNavBar from "@/components/AppNavBar";

interface StoreViewProps {
  onBackToDashboard: () => void;
  onBulletinView: () => void;
  onSignOut: () => void;
}

const StoreView = ({ onBackToDashboard, onBulletinView, onSignOut }: StoreViewProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 overflow-x-hidden">
      <AppNavBar />

      {/* Store content with proper container */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <StorePage />
      </div>
    </div>
  );
};

export default StoreView;
