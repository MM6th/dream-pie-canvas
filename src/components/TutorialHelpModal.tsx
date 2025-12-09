import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { TutorialStep } from '@/constants/tutorialContent';

interface TutorialHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TutorialStep[];
  userType: 'merchant' | 'supporter' | 'admin';
}

export const TutorialHelpModal = ({ isOpen, onClose, steps, userType }: TutorialHelpModalProps) => {
  const getUserTypeLabel = () => {
    switch (userType) {
      case 'merchant':
        return 'Merchant';
      case 'supporter':
        return 'Supporter';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gray-800 border-gray-700 text-white max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            {getUserTypeLabel()} Dashboard Guide
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Here's everything you need to know about your dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="p-4 rounded-lg bg-gray-700/50 border-l-4 border-blue-500"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-300">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <span className="text-sm text-gray-400">{steps.length} steps</span>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
