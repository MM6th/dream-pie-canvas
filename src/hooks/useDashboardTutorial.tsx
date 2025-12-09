import { useState, useEffect, useCallback } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  duration?: number;
  target?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface UseDashboardTutorialReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TutorialStep | null;
  targetElement: HTMLElement | null;
  nextStep: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  isFirstTimeUser: boolean;
}

export const useDashboardTutorial = (
  userType: 'merchant' | 'supporter' | 'admin',
  steps: TutorialStep[]
): UseDashboardTutorialReturn => {
  const storageKey = `tutorial_completed_${userType}`;
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Check if this is a first-time user on mount
  useEffect(() => {
    const isCompleted = localStorage.getItem(storageKey);
    setIsFirstTimeUser(!isCompleted);
  }, [storageKey]);

  const scrollToTarget = useCallback((element: HTMLElement) => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }, []);

  const findAndSetTarget = useCallback(() => {
    const step = steps[currentStep];
    if (!step?.target) {
      setTargetElement(null);
      return;
    }

    // Small delay to ensure DOM is updated (e.g., tabs have switched)
    setTimeout(() => {
      const element = document.querySelector(step.target!) as HTMLElement;
      if (element) {
        setTargetElement(element);
        scrollToTarget(element);
      } else {
        console.warn(`Tutorial target not found: ${step.target}`);
        setTargetElement(null);
      }
    }, 300);
  }, [currentStep, steps, scrollToTarget]);

  useEffect(() => {
    const isCompleted = localStorage.getItem(storageKey);
    // Only auto-show tutorial for first-time users
    if (!isCompleted && steps.length > 0) {
      // Delay to let the dashboard render first
      setTimeout(() => {
        setIsActive(true);
      }, 1500);
    }
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (isActive) {
      findAndSetTarget();
    }
  }, [isActive, currentStep, findAndSetTarget]);

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
    targetElement,
    nextStep,
    skipTutorial,
    restartTutorial,
    isFirstTimeUser,
  };
};
