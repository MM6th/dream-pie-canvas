import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
  steps: TutorialStep[],
  userCreatedAt?: string | null
): UseDashboardTutorialReturn => {
  const { user } = useAuth();
  // Include user ID in storage key to track tutorial state per user
  const storageKey = user?.id ? `tutorial_completed_${userType}_${user.id}` : `tutorial_completed_${userType}`;
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Check if user was created within the last hour (truly new signup)
  const isNewlyCreatedUser = () => {
    if (!userCreatedAt) return false;
    const createdDate = new Date(userCreatedAt);
    const now = new Date();
    const hourInMs = 60 * 60 * 1000;
    return (now.getTime() - createdDate.getTime()) < hourInMs;
  };

  // Check if this is a first-time user on mount
  useEffect(() => {
    if (!user?.id) return;
    const isCompleted = localStorage.getItem(storageKey);
    // Only consider as first-time user if they're newly created AND haven't completed tutorial
    setIsFirstTimeUser(!isCompleted && isNewlyCreatedUser());
  }, [storageKey, user?.id, userCreatedAt]);

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
    if (!user?.id) return;
    const isCompleted = localStorage.getItem(storageKey);
    // Only auto-show tutorial for newly created users who haven't completed it
    if (!isCompleted && isNewlyCreatedUser() && steps.length > 0) {
      // Delay to let the dashboard render first
      setTimeout(() => {
        setIsActive(true);
      }, 1500);
    }
  }, [storageKey, steps.length, user?.id, userCreatedAt]);

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
