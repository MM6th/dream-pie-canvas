
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface PieWelcomeModalProps {
  children?: React.ReactNode;
}

const PieWelcomeModal = ({ children }: PieWelcomeModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="link" className="text-blue-400 hover:text-blue-300 p-0 h-auto">
            <Info className="w-4 h-4 mr-2" />
            What is PIE?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl mb-4">Welcome to PIE</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            PIE is your 1 stop shop Entertainment hub to be informed when the most uniquely 
            and innovative selected talents create exclusive content, and get notified when they 
            create content tailored to your favorite social media sites.
          </p>
          
          <p className="text-gray-300 leading-relaxed">
            Earn percentages from their exclusive PIE content if you make your playlists live, 
            and users purchase content creators content from them.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PieWelcomeModal;
