import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { useTokenCalculation } from "@/hooks/useTokenCalculation";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { ShieldCheck } from "lucide-react";

const DEFAULT_MARKET_CAP = 22_000_000;
const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;
const RESERVE_RATIO = 0.70;

const fmt = (n: number) => n.toLocaleString();

const TokenCalculatorCard = () => {
  const [fullMarketCap, setFullMarketCap] = useState(DEFAULT_MARKET_CAP);
  const [circulatingSupply, setCirculatingSupply] = useState(Math.floor(DEFAULT_MARKET_CAP * 0.49));

  const {
    tokensPurchased,
    circulatingSupplyRemaining,
    tokensLeft,
    newPricePerToken,
    totalDollarValue,
    reserveBalance,
    requiredReserve,
    bondingCurveData,
    isLoading,
  } = useTokenCalculation({ fullMarketCap, circulatingSupply });

  const formatPrice = (price: number) => {
    if (price === 0) return "$0.00";
    if (price < 0.01) return `$${price.toFixed(8)}`;
    return `$${price.toFixed(4)}`;
  };

  const handleMarketCapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val > 0) {
      setFullMarketCap(val);
    } else if (raw === "") {
      setFullMarketCap(0);
    }
  };

  const handleCirculatingSupplyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val > 0) {
      setCirculatingSupply(val);
    } else if (raw === "") {
      setCirculatingSupply(0);
    }
  };

  const readOnlyFields = [
    { label: "Total Credit Revenue (USD)", value: isLoading ? "Loading..." : `$${totalDollarValue.toFixed(2)}` },
    { label: "Tokens Purchased", value: isLoading ? "Loading..." : fmt(tokensPurchased) },
    { label: "Initial Price Per Token", value: `$${INITIAL_PRICE}` },
    { label: "Target Price", value: `$${TARGET_PRICE}` },
    { label: "Reserve Ratio", value: `${(RESERVE_RATIO * 100).toFixed(0)}%` },
    { label: "Remaining Supply", value: isLoading ? "Loading..." : fmt(circulatingSupplyRemaining), hasCoinIcon: true },
    { label: "Tokens Left", value: isLoading ? "Loading..." : fmt(tokensLeft), hasCoinIcon: true },
    { label: "Current Price Per Token", value: isLoading ? "Loading..." : formatPrice(newPricePerToken) },
  ];

  const chartData = bondingCurveData.map((d) => ({
    tokensSold: d.tokensSold,
    price: d.price,
  }));

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <img src={sixthCoinLogo} alt="SIXTH Coin" className="w-8 h-8 rounded-full object-cover" />
          Token Economics Calculator
          <span className="ml-auto text-[10px] font-normal text-gray-500 uppercase tracking-wider">Exponential Curve</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Editable inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-amber-400">Full Market Cap (USD)</Label>
            <div className="relative">
              <img
                src={sixthCoinLogo}
                alt="SIXTH"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full object-cover pointer-events-none"
              />
              <Input
                value={fullMarketCap > 0 ? fmt(fullMarketCap) : ""}
                onChange={handleMarketCapChange}
                placeholder="e.g. 22,000,000"
                className="bg-gray-900/80 border-amber-700/50 text-white pl-8 focus:border-amber-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-amber-400">Circulating Supply</Label>
            <div className="relative">
              <img
                src={sixthCoinLogo}
                alt="SIXTH"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full object-cover pointer-events-none"
              />
              <Input
                value={circulatingSupply > 0 ? fmt(circulatingSupply) : ""}
                onChange={handleCirculatingSupplyChange}
                placeholder="e.g. 10,780,000"
                className="bg-gray-900/80 border-amber-700/50 text-white pl-8 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Read-only fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {readOnlyFields.map((field) => (
            <div key={field.label} className="space-y-1">
              <Label className="text-xs text-gray-400">{field.label}</Label>
              {field.hasCoinIcon ? (
                <div className="relative">
                  <img
                    src={sixthCoinLogo}
                    alt="SIXTH"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full object-cover pointer-events-none"
                  />
                  <Input
                    disabled
                    placeholder={field.value}
                    className="bg-gray-900/50 border-gray-600 text-white disabled:opacity-70 pl-8"
                  />
                </div>
              ) : (
                <Input
                  disabled
                  placeholder={field.value}
                  className="bg-gray-900/50 border-gray-600 text-white disabled:opacity-70"
                />
              )}
            </div>
          ))}
        </div>

        {/* Bonding Curve Chart */}
        <div className="pt-2">
          <Label className="text-xs text-gray-400 mb-2 block">Exponential Bonding Curve — Price vs Tokens Sold</Label>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="tokensSold"
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  stroke="#6b7280"
                  fontSize={11}
                  label={{ value: "Tokens Sold", position: "insideBottomRight", offset: -5, fill: "#9ca3af", fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={(v) => v < 0.001 ? `$${v.toFixed(6)}` : `$${v.toFixed(4)}`}
                  stroke="#6b7280"
                  fontSize={10}
                  width={78}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelFormatter={(v) => `Tokens Sold: ${Number(v).toLocaleString()}`}
                  formatter={(value: number) => [formatPrice(value), "Price"]}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                {tokensPurchased > 0 && (
                  <ReferenceDot
                    x={tokensPurchased}
                    y={newPricePerToken}
                    r={5}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            {tokensPurchased > 0 && (
              <p className="text-[10px] text-gray-500 text-center mt-1">
                ● Current position: {fmt(tokensPurchased)} tokens sold → {formatPrice(newPricePerToken)}/token
              </p>
            )}
          </div>
        </div>

        {/* Reserve Requirement Card */}
        <div className="bg-amber-950/30 border border-amber-700/40 rounded-lg p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-300">Reserve Requirement (70%)</p>
            <p className="text-xs text-gray-400">
              PIE's bank account must hold at least{" "}
              <span className="text-amber-400 font-semibold">
                {isLoading ? "..." : `$${requiredReserve.toFixed(2)}`}
              </span>{" "}
              (70% of market cap at {formatPrice(newPricePerToken)}/token × {isLoading ? "..." : fmt(tokensPurchased)} tokens).
              Actual reserve collected via curve: {isLoading ? "..." : `$${reserveBalance.toFixed(2)}`}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenCalculatorCard;
