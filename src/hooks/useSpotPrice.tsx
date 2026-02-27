import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;
const LIQUIDITY_POOL_SIZE = Math.floor(22_000_000 * 0.49); // 10,780,000

const K = Math.log(TARGET_PRICE / INITIAL_PRICE) / LIQUIDITY_POOL_SIZE;

export const useSpotPrice = () => {
  const [spotPrice, setSpotPrice] = useState(INITIAL_PRICE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpotPrice = async () => {
      try {
        const { data } = await supabase
          .from("token_balances")
          .select("balance");

        const totalSupply = data?.reduce((sum, row) => sum + (row.balance || 0), 0) || 0;
        const price = INITIAL_PRICE * Math.exp(K * totalSupply);
        setSpotPrice(price);
      } catch (err) {
        console.error("Error fetching spot price:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpotPrice();

    // Refresh every 30 seconds for real-time feel
    const interval = setInterval(fetchSpotPrice, 30_000);
    return () => clearInterval(interval);
  }, []);

  const usdToSixth = (usd: number) => {
    if (!usd || spotPrice === 0) return 0;
    return Math.floor(usd / spotPrice);
  };

  return { spotPrice, isLoading, usdToSixth };
};
