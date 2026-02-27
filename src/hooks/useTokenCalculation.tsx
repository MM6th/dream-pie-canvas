import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;
const RESERVE_RATIO = 0.70;

export interface BondingCurvePoint {
  tokensSold: number;
  price: number;
}

interface TokenCalculationConfig {
  fullMarketCap?: number;
  circulatingSupply?: number;
}

interface TokenCalculationResult {
  tokensPurchased: number;
  circulatingSupplyRemaining: number;
  tokensLeft: number;
  newPricePerToken: number;
  totalDollarValue: number;
  reserveBalance: number;
  requiredReserve: number;
  bondingCurveData: BondingCurvePoint[];
  isLoading: boolean;
}

/** Exponential price at s tokens sold */
const priceAt = (s: number, k: number) => INITIAL_PRICE * Math.exp(k * s);

/** Reserve collected (integral of price curve from 0 to s) */
const reserveAt = (s: number, k: number) =>
  s === 0 ? 0 : (INITIAL_PRICE / k) * (Math.exp(k * s) - 1);

export const useTokenCalculation = (
  config?: TokenCalculationConfig
): TokenCalculationResult => {
  const fullMarketCap = config?.fullMarketCap ?? 22_000_000;
  const baseCirculatingSupply = config?.circulatingSupply ?? Math.floor(fullMarketCap * 0.49);

  // k calibrated so P(maxSupply) = TARGET_PRICE
  const K = useMemo(
    () => Math.log(TARGET_PRICE / INITIAL_PRICE) / baseCirculatingSupply,
    [baseCirculatingSupply]
  );

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

  const circulatingSupplyRemaining = Math.max(1, baseCirculatingSupply - tokensPurchased);
  const tokensLeft = fullMarketCap - circulatingSupplyRemaining;

  const newPricePerToken = priceAt(tokensPurchased, K);
  const reserveBalance = reserveAt(tokensPurchased, K);
  const requiredReserve = newPricePerToken * tokensPurchased * RESERVE_RATIO;

  const bondingCurveData: BondingCurvePoint[] = useMemo(() => {
    const data: BondingCurvePoint[] = [];
    const steps = 25;
    const maxTokens = Math.min(
      baseCirculatingSupply,
      Math.max(tokensPurchased * 3, baseCirculatingSupply * 0.5)
    );
    for (let i = 0; i <= steps; i++) {
      const sold = Math.floor((maxTokens / steps) * i);
      data.push({ tokensSold: sold, price: priceAt(sold, K) });
    }
    return data;
  }, [baseCirculatingSupply, tokensPurchased, K]);

  return {
    tokensPurchased,
    circulatingSupplyRemaining,
    tokensLeft,
    newPricePerToken,
    totalDollarValue,
    reserveBalance,
    requiredReserve,
    bondingCurveData,
    isLoading,
  };
};
