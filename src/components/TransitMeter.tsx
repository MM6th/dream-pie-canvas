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
  
  // Calculate color gradient from blue (0) to red (30)
  // HSL: Blue is ~220, Red is ~0
  const hue = 220 - (percentage * 2.2); // 220 -> 0 as percentage goes 0 -> 100
  const color = `hsl(${hue}, 80%, 50%)`;
  
  // Size configurations
  const sizeConfig = {
    sm: { width: 120, height: 70, strokeWidth: 6, fontSize: "text-xs" },
    md: { width: 160, height: 90, strokeWidth: 8, fontSize: "text-sm" },
    lg: { width: 200, height: 110, strokeWidth: 10, fontSize: "text-base" }
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
  
  // Create gradient definition
  const gradientId = `transit-gradient-${Math.random().toString(36).substr(2, 9)}`;
  
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
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(220, 80%, 50%)" />
                <stop offset="50%" stopColor="hsl(280, 80%, 50%)" />
                <stop offset="100%" stopColor="hsl(0, 80%, 50%)" />
              </linearGradient>
            </defs>
            
            {/* Background arc */}
            <path
              d={backgroundArc}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
            />
            
            {/* Progress arc */}
            {clampedSales > 0 && (
              <path
                d={progressArc}
                fill="none"
                stroke={color}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            )}
            
            {/* Needle indicator */}
            <circle
              cx={current.x}
              cy={current.y}
              r={config.strokeWidth / 2 + 2}
              fill={color}
              stroke="white"
              strokeWidth={2}
              className="transition-all duration-500 ease-out"
            />
            
            {/* Center text */}
            <text
              x={centerX}
              y={config.height - 5}
              textAnchor="middle"
              className={`fill-white font-bold ${config.fontSize}`}
              style={{ fontSize: size === "sm" ? "14px" : size === "md" ? "18px" : "22px" }}
            >
              {clampedSales}
            </text>
          </svg>
          
          <div className="flex items-center justify-between w-full mt-2 px-2">
            <span className="text-blue-400 text-xs font-medium">0</span>
            <span className={`text-gray-400 ${config.fontSize}`}>
              {clampedSales}/{maxSales} Sales
            </span>
            <span className="text-red-400 text-xs font-medium">{maxSales}</span>
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
