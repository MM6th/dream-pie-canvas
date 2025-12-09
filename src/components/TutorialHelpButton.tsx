import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TutorialHelpModal } from '@/components/TutorialHelpModal';
import { TutorialStep } from '@/constants/tutorialContent';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TutorialHelpButtonProps {
  steps: TutorialStep[];
  userType: 'merchant' | 'supporter' | 'admin';
  className?: string;
}

export const TutorialHelpButton = ({ steps, userType, className = '' }: TutorialHelpButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className={`text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 ${className}`}
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              <span className="text-xs">Help</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Dashboard Tutorial</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TutorialHelpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        steps={steps}
        userType={userType}
      />
    </>
  );
};
