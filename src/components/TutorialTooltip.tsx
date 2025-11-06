import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialTooltipProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  targetElement: HTMLElement | null;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

export const TutorialTooltip = ({
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  targetElement,
  preferredPlacement = 'right',
}: TutorialTooltipProps) => {
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!targetElement) {
      // Fallback: center of screen
      setPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 200,
        placement: 'bottom',
      });
      setIsVisible(true);
      return;
    }

    const calculatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const tooltipWidth = 400;
      const tooltipHeight = 200;
      const padding = 20;
      const arrowSize = 12;

      let top = 0;
      let left = 0;
      let placement: 'top' | 'bottom' | 'left' | 'right' = preferredPlacement;

      // Calculate available space in each direction
      const spaceTop = rect.top;
      const spaceBottom = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;

      // Determine best placement based on available space
      if (preferredPlacement === 'right' && spaceRight >= tooltipWidth + padding) {
        placement = 'right';
        left = rect.right + arrowSize + padding;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
      } else if (preferredPlacement === 'left' && spaceLeft >= tooltipWidth + padding) {
        placement = 'left';
        left = rect.left - tooltipWidth - arrowSize - padding;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
      } else if (preferredPlacement === 'bottom' && spaceBottom >= tooltipHeight + padding) {
        placement = 'bottom';
        top = rect.bottom + arrowSize + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      } else if (preferredPlacement === 'top' && spaceTop >= tooltipHeight + padding) {
        placement = 'top';
        top = rect.top - tooltipHeight - arrowSize - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      } else {
        // Auto-select best placement
        if (spaceRight >= tooltipWidth + padding) {
          placement = 'right';
          left = rect.right + arrowSize + padding;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
        } else if (spaceBottom >= tooltipHeight + padding) {
          placement = 'bottom';
          top = rect.bottom + arrowSize + padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
        } else if (spaceLeft >= tooltipWidth + padding) {
          placement = 'left';
          left = rect.left - tooltipWidth - arrowSize - padding;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
        } else {
          placement = 'top';
          top = rect.top - tooltipHeight - arrowSize - padding;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }
      }

      // Ensure tooltip stays within viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

      setPosition({ top, left, placement });
    };

    calculatePosition();
    setIsVisible(true);

    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [targetElement, preferredPlacement]);

  if (!position) return null;

  const getArrowStyle = () => {
    const arrowSize = 12;
    const baseStyle = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (position.placement) {
      case 'right':
        return {
          ...baseStyle,
          left: `-${arrowSize}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderColor: 'transparent rgb(37 99 235 / 0.95) transparent transparent',
        };
      case 'left':
        return {
          ...baseStyle,
          right: `-${arrowSize}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent transparent rgb(37 99 235 / 0.95)',
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: `-${arrowSize}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
          borderColor: 'transparent transparent rgb(37 99 235 / 0.95) transparent',
        };
      case 'top':
        return {
          ...baseStyle,
          bottom: `-${arrowSize}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
          borderColor: 'rgb(37 99 235 / 0.95) transparent transparent transparent',
        };
    }
  };

  return (
    <div
      className={cn(
        "fixed z-[10000] w-[400px] max-w-[90vw] transition-all duration-300",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Arrow */}
      <div style={getArrowStyle()} />
      
      {/* Tooltip content */}
      <div className="bg-primary/95 backdrop-blur-sm border border-primary-foreground/20 rounded-lg shadow-2xl p-4">
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
            onClick={onSkip}
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
              onClick={onSkip}
            >
              Skip Tutorial
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={onNext}
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
    </div>
  );
};
