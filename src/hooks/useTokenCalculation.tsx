import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;
const FULL_MARKET_CAP = 22_000_000;
const BASE_CIRCULATING_SUPPLY = Math.floor(FULL_MARKET_CAP * 0.49);
const RESERVE_RATIO = 0.70;

// Exponential bonding curve: P(s) = P0 * e^(k * s)
// k calibrated so P(maxSupply) = TARGET_PRICE
const K = Math.log(TARGET_PRICE / INITIAL_PRICE) / BASE_CIRCULATING_SUPPLY;

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
  reserveBalance: number;
  requiredReserve: number;
  bondingCurveData: BondingCurvePoint[];
  isLoading: boolean;
}

/** Exponential price at s tokens sold */
const priceAt = (s: number) => INITIAL_PRICE * Math.exp(K * s);

/** Reserve collected (integral of price curve from 0 to s) */
const reserveAt = (s: number) =>
  s === 0 ? 0 : (INITIAL_PRICE / K) * (Math.exp(K * s) - 1);

/**
 * Calculates SIXTH token metrics using an exponential bonding curve.
 * - Price increases exponentially as tokens are purchased
 * - Reserve ratio: 70% of market cap must be held in reserve
 * - Target price: $0.01 when full circulating supply is sold
 */
export const useTokenCalculation = (): TokenCalculationResult => {
  const [totalDollarValue, setTotalDollarValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
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

      setTotalDollarValue(totalRevenue);
    } catch (err) {
      console.error("Token calculation error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("token-calc-revenue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_revenue" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const tokensPurchased = totalDollarValue > 0
    ? Math.floor(totalDollarValue / INITIAL_PRICE)
    : 0;

  const circulatingSupply = Math.max(1, BASE_CIRCULATING_SUPPLY - tokensPurchased);
  const tokensLeft = FULL_MARKET_CAP - circulatingSupply;

  // Exponential bonding curve price
  const newPricePerToken = priceAt(tokensPurchased);

  // Actual USD collected via the integral of the curve
  const reserveBalance = reserveAt(tokensPurchased);

  // Required reserve = 70% of current market cap (price × tokens outstanding)
  const requiredReserve = newPricePerToken * tokensPurchased * RESERVE_RATIO;

  // Generate bonding curve data points
  const bondingCurveData: BondingCurvePoint[] = [];
  const steps = 25;
  const maxTokens = Math.min(
    BASE_CIRCULATING_SUPPLY,
    Math.max(tokensPurchased * 3, BASE_CIRCULATING_SUPPLY * 0.5)
  );
  for (let i = 0; i <= steps; i++) {
    const sold = Math.floor((maxTokens / steps) * i);
    bondingCurveData.push({ tokensSold: sold, price: priceAt(sold) });
  }

  return {
    tokensPurchased,
    circulatingSupply,
    tokensLeft,
    newPricePerToken,
    totalDollarValue,
    reserveBalance,
    requiredReserve,
    bondingCurveData,
    isLoading,
  };
};
