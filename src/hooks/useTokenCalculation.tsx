import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;
const FULL_MARKET_CAP = 22_000_000;
const LIQUIDITY_POOL_SIZE = Math.floor(FULL_MARKET_CAP * 0.49);
const RESERVE_RATIO = 0.70;
const INITIAL_SEED = 70; // USD manually deposited into reserve
const BUY_TAX_RATE = 0.01; // 1% buy tax → vault
const SELL_TAX_RATE = 0.03; // 3% sell tax → vault

// Exponential bonding curve: P(s) = P0 * e^(k * s)
// k calibrated so P(maxSupply) = TARGET_PRICE
const K = Math.log(TARGET_PRICE / INITIAL_PRICE) / LIQUIDITY_POOL_SIZE;

export interface BondingCurvePoint {
  tokensSold: number;
  price: number;
}

export interface WhaleImpact {
  usdAmount: number;
  tokensAcquired: number;
  avgPrice: number;
  spotPriceAfter: number;
  slippagePercent: number;
  reserveAfter: number;
  reserveRatioAfter: number;
}

interface TokenCalculationResult {
  tokensPurchased: number;
  circulatingSupply: number;
  liquidityPool: number;
  tokensLeft: number;
  newPricePerToken: number;
  totalDollarValue: number;
  reserveBalance: number;
  requiredReserve: number;
  initialSeed: number;
  totalReserve: number;
  reserveHealthRatio: number;
  bondingCurveData: BondingCurvePoint[];
  isLoading: boolean;
  slippagePercent: number;
  dangerPrice: number;
  dangerTokensSold: number;
  whaleImpacts: WhaleImpact[];
  buyTaxRate: number;
  sellTaxRate: number;
  buyTaxRevenue: number;
  sellTaxRevenue: number;
  totalTaxRevenue: number;
  reserveFromCurve: number;
  reserveFromSeed: number;
  reserveFromTax: number;
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

  // Circulating supply = tokens in holders' hands
  const circulatingSupply = tokensPurchased;
  // Liquidity pool = unsold tokens available on the bonding curve
  const liquidityPool = Math.max(0, LIQUIDITY_POOL_SIZE - tokensPurchased);
  const tokensLeft = FULL_MARKET_CAP - tokensPurchased;

  // Exponential bonding curve price
  const newPricePerToken = priceAt(tokensPurchased);

  // Actual USD collected via the integral of the curve
  const reserveBalance = reserveAt(tokensPurchased);

  // Tax revenue: 1% buy tax on all purchases
  const buyTaxRevenue = totalDollarValue * BUY_TAX_RATE;
  // Sell tax placeholder: simulated as 3% of total volume sold back (placeholder — no real sells yet)
  const sellTaxRevenue = 0; // Will accumulate when sell-back mechanism is live
  const totalTaxRevenue = buyTaxRevenue + sellTaxRevenue;

  // Required reserve = 70% of current market cap (price × tokens outstanding)
  const requiredReserve = newPricePerToken * tokensPurchased * RESERVE_RATIO;

  // Reserve breakdown
  const reserveFromSeed = INITIAL_SEED;
  const reserveFromCurve = reserveBalance;
  const reserveFromTax = totalTaxRevenue;

  // Total reserve = curve-collected reserve + initial seed + tax revenue
  const totalReserve = reserveBalance + INITIAL_SEED + totalTaxRevenue;

  // Reserve ratio = total reserve / full market cap value
  const fullMarketCapValue = newPricePerToken * FULL_MARKET_CAP;
  const reserveHealthRatio = fullMarketCapValue > 0 ? totalReserve / fullMarketCapValue : 1;
  // --- Slippage: difference between spot price and average price paid ---
  const avgPrice = tokensPurchased > 0 ? reserveBalance / tokensPurchased : INITIAL_PRICE;
  const slippagePercent = tokensPurchased > 0
    ? ((newPricePerToken - avgPrice) / avgPrice) * 100
    : 0;

  // --- Danger zone: find the token count where reserve ratio drops below threshold ---
  // Reserve ratio = (reserveAt(s) + INITIAL_SEED) / (priceAt(s) * FULL_MARKET_CAP)
  // We search for the point where this drops below e.g. 10%
  const DANGER_THRESHOLD = 0.10;
  let dangerTokensSold = 0;
  let dangerPrice = 0;
  for (let s = 0; s <= LIQUIDITY_POOL_SIZE; s += 1000) {
    const p = priceAt(s);
    const r = reserveAt(s) + INITIAL_SEED;
    const mcv = p * FULL_MARKET_CAP;
    if (mcv > 0 && r / mcv < DANGER_THRESHOLD) {
      dangerTokensSold = s;
      dangerPrice = p;
      break;
    }
  }

  // --- Whale impact: simulate large USD purchases from current position ---
  const whaleAmounts = [10, 50, 100, 500, 1000];
  const whaleImpacts: WhaleImpact[] = whaleAmounts.map((usd) => {
    // Find how many tokens `usd` buys starting from tokensPurchased
    // Integral from tokensPurchased to tokensPurchased+n = usd
    // reserveAt(tokensPurchased+n) - reserveAt(tokensPurchased) = usd
    const currentReserve = reserveAt(tokensPurchased);
    const targetReserve = currentReserve + usd;
    // Solve: (P0/K)(e^(K*s) - 1) = targetReserve => s = ln(targetReserve*K/P0 + 1) / K
    const sAfter = Math.log(targetReserve * K / INITIAL_PRICE + 1) / K;
    const tokensAcquired = Math.max(0, Math.floor(sAfter - tokensPurchased));
    const spotAfter = priceAt(sAfter);
    const avg = tokensAcquired > 0 ? usd / tokensAcquired : spotAfter;
    const slip = ((spotAfter - avg) / avg) * 100;
    const rAfter = reserveAt(sAfter) + INITIAL_SEED;
    const mcvAfter = spotAfter * FULL_MARKET_CAP;
    const rrAfter = mcvAfter > 0 ? rAfter / mcvAfter : 1;
    return {
      usdAmount: usd,
      tokensAcquired,
      avgPrice: avg,
      spotPriceAfter: spotAfter,
      slippagePercent: slip,
      reserveAfter: rAfter,
      reserveRatioAfter: rrAfter,
    };
  });

  const bondingCurveData: BondingCurvePoint[] = [];
  const steps = 25;
  const maxTokens = Math.min(
    LIQUIDITY_POOL_SIZE,
    Math.max(tokensPurchased * 3, LIQUIDITY_POOL_SIZE * 0.5)
  );
  for (let i = 0; i <= steps; i++) {
    const sold = Math.floor((maxTokens / steps) * i);
    bondingCurveData.push({ tokensSold: sold, price: priceAt(sold) });
  }

  return {
    tokensPurchased,
    circulatingSupply,
    liquidityPool,
    tokensLeft,
    newPricePerToken,
    totalDollarValue,
    reserveBalance,
    requiredReserve,
    initialSeed: INITIAL_SEED,
    totalReserve,
    reserveHealthRatio,
    bondingCurveData,
    isLoading,
    slippagePercent,
    dangerPrice,
    dangerTokensSold,
    whaleImpacts,
    buyTaxRate: BUY_TAX_RATE,
    sellTaxRate: SELL_TAX_RATE,
    buyTaxRevenue,
    sellTaxRevenue,
    totalTaxRevenue,
    reserveFromCurve,
    reserveFromSeed,
    reserveFromTax,
  };
};
