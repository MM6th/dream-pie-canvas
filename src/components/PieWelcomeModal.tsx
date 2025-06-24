
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
            PIE is your 1 stop shop TV/Film & Media hub to be informed when the most uniquely 
            and innovative selected talents of the new age post, and go live on your favorite platforms.
          </p>
          
          <p className="text-gray-300 leading-relaxed">
            Also be privy to some of their work before it is publicized, and interact on threads with them.
          </p>
          
          <p className="text-gray-300 leading-relaxed">
            Stay tuned as we also create our own PIE original content.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PieWelcomeModal;
