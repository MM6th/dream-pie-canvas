import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownToLine } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;
const LIQUIDITY_POOL_SIZE = 10_780_000;
const K = Math.log(TARGET_PRICE / INITIAL_PRICE) / LIQUIDITY_POOL_SIZE;
const SELL_TAX_RATE = 0.03;

const fmt = (n: number) => n.toLocaleString();
const formatPrice = (price: number) => {
  if (price === 0) return "$0.00";
  if (price < 0.01) return `$${price.toFixed(8)}`;
  return `$${price.toFixed(4)}`;
};

interface SellTokenCardProps {
  userBalance: number;
  circulatingSupply: number;
  spotPrice: number;
  isLoading: boolean;
  userId: string;
}

const SellTokenCard = ({ userBalance, circulatingSupply, spotPrice, isLoading, userId }: SellTokenCardProps) => {
  const [tokenInput, setTokenInput] = useState("");
  const [estimatedUsd, setEstimatedUsd] = useState(0);
  const [sellTaxAmount, setSellTaxAmount] = useState(0);
  const [netPayout, setNetPayout] = useState(0);
  const [isSelling, setIsSelling] = useState(false);

  useEffect(() => {
    const tokens = parseInt(tokenInput);
    if (!tokens || tokens <= 0 || isLoading || tokens > userBalance) {
      setEstimatedUsd(0);
      setSellTaxAmount(0);
      setNetPayout(0);
      return;
    }

    // Selling tokens: USD returned = integral from (supply - tokens) to supply
    // reserveAt(supply) - reserveAt(supply - tokens)
    const reserveAt = (s: number) =>
      s === 0 ? 0 : (INITIAL_PRICE / K) * (Math.exp(K * s) - 1);

    const grossUsd = reserveAt(circulatingSupply) - reserveAt(Math.max(0, circulatingSupply - tokens));
    const tax = grossUsd * SELL_TAX_RATE;
    const net = grossUsd - tax;

    setEstimatedUsd(grossUsd);
    setSellTaxAmount(tax);
    setNetPayout(net);
  }, [tokenInput, circulatingSupply, isLoading, userBalance]);

  const handleSell = async () => {
    const tokens = parseInt(tokenInput);
    if (!tokens || tokens <= 0 || tokens > userBalance) {
      toast({ title: "Invalid Amount", description: "Enter a valid number of tokens to sell.", variant: "destructive" });
      return;
    }
    setIsSelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("sell-tokens", {
        body: { tokenAmount: tokens },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      toast({ title: "Sell Order Submitted", description: `Sold ${fmt(tokens)} SIXTH for ~${formatPrice(netPayout)}.` });
      setTokenInput("");
    } catch (err: any) {
      toast({ title: "Sell Error", description: err.message || "Could not process sell order.", variant: "destructive" });
    } finally {
      setIsSelling(false);
    }
  };

  const quickAmounts = [
    { label: "25%", value: Math.floor(userBalance * 0.25) },
    { label: "50%", value: Math.floor(userBalance * 0.5) },
    { label: "75%", value: Math.floor(userBalance * 0.75) },
    { label: "Max", value: userBalance },
  ];

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowDownToLine className="w-5 h-5 text-red-400" /> Sell SIXTH Tokens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-gray-400">Tokens to Sell (Balance: {fmt(userBalance)})</Label>
          <Input
            type="number"
            min="1"
            max={userBalance}
            step="1"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Enter token amount"
            className="bg-gray-900/50 border-gray-600 text-white mt-1"
          />
        </div>

        {/* Quick amount buttons */}
        {userBalance > 0 && (
          <div className="flex gap-2">
            {quickAmounts.map((q) => (
              <Button
                key={q.label}
                size="sm"
                variant="outline"
                className="flex-1 text-xs border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white h-7"
                onClick={() => setTokenInput(q.value.toString())}
                disabled={q.value <= 0}
              >
                {q.label}
              </Button>
            ))}
          </div>
        )}

        {estimatedUsd > 0 && (
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Gross value:</span>
              <span className="text-gray-300">{formatPrice(estimatedUsd)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Sell tax (3%):</span>
              <span className="text-red-400">-{formatPrice(sellTaxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-300">Net payout:</span>
              <span className="text-emerald-400">{formatPrice(netPayout)}</span>
            </div>
          </div>
        )}

        <Button
          onClick={handleSell}
          disabled={isSelling || !tokenInput || parseInt(tokenInput) <= 0 || parseInt(tokenInput) > userBalance}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          {isSelling ? "Processing..." : "Sell Tokens"}
        </Button>

        <p className="text-[10px] text-gray-500 text-center">
          Tokens are sold back along the bonding curve. A 3% sell tax applies.
        </p>
      </CardContent>
    </Card>
  );
};

export default SellTokenCard;
