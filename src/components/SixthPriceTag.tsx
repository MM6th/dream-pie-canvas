import React from "react";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { useSpotPrice } from "@/hooks/useSpotPrice";

interface SixthPriceTagProps {
  usdPrice: number;
  className?: string;
  showUsd?: boolean;
  size?: "sm" | "md" | "lg";
}

const fmt = (n: number) => n.toLocaleString();

const SixthPriceTag = ({ usdPrice, className = "", showUsd = true, size = "sm" }: SixthPriceTagProps) => {
  const { usdToSixth, isLoading } = useSpotPrice();

  if (!usdPrice || usdPrice <= 0) return null;

  const sixthAmount = usdToSixth(usdPrice);

  const sizeClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  const iconSize = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span className={`inline-flex items-center gap-1 text-amber-400 ${sizeClasses[size]} ${className}`}>
      {showUsd && <span className="text-gray-400">(</span>}
      <img src={sixthCoinLogo} alt="SIXTH" className={`${iconSize[size]} rounded-full object-cover`} />
      <span className="font-medium">{isLoading ? "..." : fmt(sixthAmount)}</span>
      {showUsd && <span className="text-gray-400">SIXTH)</span>}
      {!showUsd && <span className="text-gray-400">SIXTH</span>}
    </span>
  );
};

export default SixthPriceTag;
