import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "lucide-react";

interface TransitMeterProps {
  currentSales: number;
  maxSales?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const TransitMeter = ({ 
  currentSales, 
  maxSales = 30, 
  showLabel = true,
  size = "md" 
}: TransitMeterProps) => {
  // Clamp sales between 0 and maxSales
  const clampedSales = Math.min(Math.max(currentSales, 0), maxSales);
  const percentage = (clampedSales / maxSales) * 100;
  
  // Calculate solid color based on progress zones
  const getProgressColor = () => {
    if (percentage <= 40) {
      // Blue zone (0-40%, sales 0-12)
      return `hsl(210, 100%, 55%)`;
    } else if (percentage <= 65) {
      // Purple zone (40-65%, sales 12-19)
      return `hsl(280, 80%, 55%)`;
    } else {
      // Red zone (65-100%, sales 19-30)
      return `hsl(0, 80%, 55%)`;
    }
  };
  
  const progressColor = getProgressColor();
  
  // Size configurations
  const sizeConfig = {
    sm: { width: 140, height: 50, strokeWidth: 10, fontSize: "text-xs" },
    md: { width: 180, height: 60, strokeWidth: 12, fontSize: "text-sm" },
    lg: { width: 220, height: 75, strokeWidth: 14, fontSize: "text-base" }
  };
  
  const config = sizeConfig[size];
  const centerX = config.width / 2;
  const radius = (config.width - config.strokeWidth * 2) / 2 - 10;
  
  // Arc calculations for semicircle (180 degrees)
  const startAngle = 180;
  const endAngle = 0;
  const currentAngle = startAngle - (percentage * 1.8); // 180 degrees spread
  
  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: config.height - 10 + radius * Math.sin(rad)
    };
  };
  
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const current = polarToCartesian(currentAngle);
  
  // Create arc path
  const createArc = (startPt: {x: number, y: number}, endPt: {x: number, y: number}, largeArc: number = 0) => {
    return `M ${startPt.x} ${startPt.y} A ${radius} ${radius} 0 ${largeArc} 0 ${endPt.x} ${endPt.y}`;
  };
  
  const backgroundArc = createArc(start, end, 0);
  const progressArc = createArc(start, current, percentage > 50 ? 1 : 0);
  
  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardContent className="p-4">
        {showLabel && (
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-purple-400" />
            <span className="text-white font-medium text-sm">Transit Meter</span>
          </div>
        )}
        
        <div className="flex flex-col items-center">
          <svg width={config.width} height={config.height} className="overflow-visible">
            {/* Background arc */}
            <path
              d={backgroundArc}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
            
            {/* Progress arc with solid color based on progress */}
            {clampedSales > 0 && (
              <path
                d={progressArc}
                fill="none"
                stroke={progressColor}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            )}
          </svg>
          
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-blue-400 text-sm font-bold">{clampedSales}</span>
            <span className="text-red-400 text-sm font-bold">{maxSales}</span>
          </div>
          
          {clampedSales >= maxSales && (
            <div className="mt-2 text-green-400 text-xs font-medium animate-pulse">
              🎉 Milestone reached! You can publish a new film.
            </div>
          )}
          
          {clampedSales < maxSales && clampedSales > 0 && (
            <div className="mt-2 text-gray-400 text-xs text-center">
              {maxSales - clampedSales} more sale{maxSales - clampedSales !== 1 ? 's' : ''} to unlock next film
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransitMeter;
