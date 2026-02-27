import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_PRICE = 0.00001;
const FULL_MARKET_CAP = 22_000_000;
const BASE_CIRCULATING_SUPPLY = Math.floor(FULL_MARKET_CAP * 0.49);

export interface BondingCurvePoint {
  tokensSold: number;
  price: number;
}

interface TokenCalculationResult {
  tokensPurchased: number;
  circulatingSupply: number;
  tokensLeft: number;
  newPricePerToken: number;
  totalDollarValue: number;
  bondingCurveData: BondingCurvePoint[];
  isLoading: boolean;
}

/**
 * Calculates SIXTH token metrics from platform messaging credit activity.
 * - Total $ from credit purchases (platform_revenue) / initial price = tokens purchased
 * - Tokens purchased are subtracted from the circulating supply
 * - New price per token = tokens purchased × initial price
 */
export const useTokenCalculation = (): TokenCalculationResult => {
  const [totalDollarValue, setTotalDollarValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get total gross revenue from all credit purchases
        // platform_revenue.amount is net (after PayPal fees),
        // but metadata contains the gross price. We'll sum net revenue
        // as that represents actual dollars backing the tokens.
        const { data: revenueRows, error } = await supabase
          .from("platform_revenue")
          .select("amount")
          .eq("revenue_type", "credit_purchase");

        if (error) {
          console.error("Error fetching platform revenue:", error);
          return;
        }

        const totalRevenue = (revenueRows || []).reduce(
          (sum, row) => sum + (row.amount || 0),
          0
        );

        // Also get admin's current credit balance and convert to dollar value
        // Admin balance represents purchased credits not yet spent
        // We already count those in platform_revenue, so no double-counting needed.
        // The total revenue already represents admin balance + spent credits in $ terms.

        setTotalDollarValue(totalRevenue);
      } catch (err) {
        console.error("Token calculation error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const tokensPurchased = totalDollarValue > 0
    ? Math.floor(totalDollarValue / INITIAL_PRICE)
    : 0;

  const circulatingSupply = Math.max(1, BASE_CIRCULATING_SUPPLY - tokensPurchased);
  const tokensLeft = FULL_MARKET_CAP - circulatingSupply;

  // Bonding curve: price = INITIAL_PRICE × (initialSupply / remainingSupply)
  const newPricePerToken = INITIAL_PRICE * (BASE_CIRCULATING_SUPPLY / circulatingSupply);

  // Generate bonding curve data points for the chart
  const bondingCurveData: BondingCurvePoint[] = [];
  const steps = 20;
  const maxTokens = Math.min(BASE_CIRCULATING_SUPPLY - 1, Math.max(tokensPurchased * 3, BASE_CIRCULATING_SUPPLY * 0.5));
  for (let i = 0; i <= steps; i++) {
    const sold = Math.floor((maxTokens / steps) * i);
    const remaining = Math.max(1, BASE_CIRCULATING_SUPPLY - sold);
    const price = INITIAL_PRICE * (BASE_CIRCULATING_SUPPLY / remaining);
    bondingCurveData.push({ tokensSold: sold, price });
  }

  return {
    tokensPurchased,
    circulatingSupply,
    tokensLeft,
    newPricePerToken,
    totalDollarValue,
    bondingCurveData,
    isLoading,
  };
};
