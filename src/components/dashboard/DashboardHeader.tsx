
import React from "react";
import { Button } from "@/components/ui/button";
import { Store, LogOut, Film } from "lucide-react";

interface DashboardHeaderProps {
  onStoreView: () => void;
  onFilmsView: () => void;
  onSignOut: () => void;
}

const DashboardHeader = ({ onStoreView, onFilmsView, onSignOut }: DashboardHeaderProps) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
      <div className="flex gap-2">
        <Button
          onClick={onStoreView}
          variant="outline"
          className="border-gray-600 text-white hover:bg-white hover:text-black"
        >
          <Store className="w-4 h-4 mr-2" />
          Browse Store
        </Button>
        <Button
          onClick={onFilmsView}
          variant="outline"
          className="border-gray-600 text-white hover:bg-white hover:text-black"
        >
          <Film className="w-4 h-4 mr-2" />
          Browse Films
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
  );
};

export default DashboardHeader;
