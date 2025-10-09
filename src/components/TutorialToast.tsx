import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, ChevronRight } from 'lucide-react';

interface TutorialToastProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  duration?: number;
}

export const TutorialToast = ({
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  duration = 10000,
}: TutorialToastProps) => {
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    // Dismiss any existing toast first
    if (toastIdRef.current !== null) {
      toast.dismiss(toastIdRef.current);
    }

    // Small delay to ensure previous toast is fully dismissed
    const timer = setTimeout(() => {
      const toastId = toast.custom(
        (t) => (
          <div className="bg-primary/95 backdrop-blur-sm border border-primary-foreground/20 rounded-lg shadow-lg p-4 max-w-md w-full">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-primary-foreground font-semibold text-sm mb-1">
                  {title}
                </h4>
                <p className="text-primary-foreground/90 text-xs leading-relaxed">
                  {description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => {
                  toast.dismiss(t);
                  onSkip();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-primary-foreground/20">
              <span className="text-primary-foreground/70 text-xs font-medium">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => {
                    toast.dismiss(t);
                    onSkip();
                  }}
                >
                  Skip Tutorial
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  onClick={() => {
                    toast.dismiss(t);
                    onNext();
                  }}
                >
                  {currentStep + 1 === totalSteps ? 'Finish' : 'Next'}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-foreground transition-all duration-300"
                style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        ),
        {
          duration: duration,
          position: 'top-center',
        }
      );

      toastIdRef.current = toastId;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, [title, description, currentStep, totalSteps, duration, onNext, onSkip]);

  return null;
};
