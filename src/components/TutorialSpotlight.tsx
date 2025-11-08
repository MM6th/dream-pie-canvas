import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TutorialSpotlightProps {
  targetElement: HTMLElement | null;
  isActive: boolean;
}

export const TutorialSpotlight = ({ targetElement, isActive }: TutorialSpotlightProps) => {
  const [dimensions, setDimensions] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!targetElement || !isActive) return;

    const updateDimensions = () => {
      const rect = targetElement.getBoundingClientRect();
      setDimensions({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('scroll', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
    };
  }, [targetElement, isActive]);

  if (!isActive || !targetElement) return null;

  return (
    <div
      className="fixed z-[9999] transition-all duration-300 pointer-events-none"
      style={{
        top: `${dimensions.top - 8}px`,
        left: `${dimensions.left - 8}px`,
        width: `${dimensions.width + 16}px`,
        height: `${dimensions.height + 16}px`,
        boxShadow: '0 0 20px 4px rgba(59, 130, 246, 0.6), inset 0 0 20px 4px rgba(59, 130, 246, 0.4)',
        borderRadius: '8px',
        border: '2px solid rgba(59, 130, 246, 0.8)',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    />
  );
};
