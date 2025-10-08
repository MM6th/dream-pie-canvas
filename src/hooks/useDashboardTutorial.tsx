import { useState, useEffect } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  duration?: number;
}

interface UseDashboardTutorialReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TutorialStep | null;
  nextStep: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
}

export const useDashboardTutorial = (
  userType: 'merchant' | 'supporter' | 'admin',
  steps: TutorialStep[]
): UseDashboardTutorialReturn => {
  const storageKey = `tutorial_completed_${userType}`;
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const isCompleted = localStorage.getItem(storageKey);
    if (!isCompleted && steps.length > 0) {
      // Small delay to let the dashboard render first
      setTimeout(() => {
        setIsActive(true);
      }, 1000);
    }
  }, [storageKey, steps.length]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tutorial completed
      localStorage.setItem(storageKey, 'true');
      setIsActive(false);
      setCurrentStep(0);
    }
  };

  const skipTutorial = () => {
    localStorage.setItem(storageKey, 'true');
    setIsActive(false);
    setCurrentStep(0);
  };

  const restartTutorial = () => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setIsActive(true);
  };

  const currentStepData = isActive && steps[currentStep] ? steps[currentStep] : null;

  return {
    isActive,
    currentStep,
    totalSteps: steps.length,
    currentStepData,
    nextStep,
    skipTutorial,
    restartTutorial,
  };
};
