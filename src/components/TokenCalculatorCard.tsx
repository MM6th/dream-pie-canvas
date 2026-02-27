import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { useTokenCalculation } from "@/hooks/useTokenCalculation";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";

const FULL_MARKET_CAP = 22_000_000;
const INITIAL_PRICE = 0.00001;

const fmt = (n: number) => n.toLocaleString();

const TokenCalculatorCard = () => {
  const {
    tokensPurchased,
    circulatingSupply,
    tokensLeft,
    newPricePerToken,
    totalDollarValue,
    bondingCurveData,
    isLoading,
  } = useTokenCalculation();

  const formatPrice = (price: number) => {
    if (price === 0) return "$0.00";
    if (price < 0.01) return `$${price.toFixed(8)}`;
    return `$${price.toFixed(2)}`;
  };

  const fields = [
    { label: "Total Credit Revenue (USD)", placeholder: isLoading ? "Loading..." : `$${totalDollarValue.toFixed(2)}`, hasCoinIcon: false },
    { label: "Tokens Purchased", placeholder: isLoading ? "Loading..." : fmt(tokensPurchased), hasCoinIcon: false },
    { label: "Initial Price Per Token", placeholder: `$${INITIAL_PRICE}`, hasCoinIcon: false },
    { label: "Full Market Cap", placeholder: fmt(FULL_MARKET_CAP), hasCoinIcon: true },
    { label: "Circulating Supply", placeholder: isLoading ? "Loading..." : fmt(circulatingSupply), hasCoinIcon: true },
    { label: "Tokens Left", placeholder: isLoading ? "Loading..." : fmt(tokensLeft), hasCoinIcon: true },
    { label: "New Price Per Token", placeholder: isLoading ? "Loading..." : formatPrice(newPricePerToken), hasCoinIcon: false },
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {fields.map((field) => (
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
                    placeholder={field.placeholder}
                    className="bg-gray-900/50 border-gray-600 text-white disabled:opacity-70 pl-8"
                  />
                </div>
              ) : (
                <Input
                  disabled
                  placeholder={field.placeholder}
                  className="bg-gray-900/50 border-gray-600 text-white disabled:opacity-70"
                />
              )}
            </div>
          ))}
        </div>

        {/* Bonding Curve Chart */}
        <div className="pt-2">
          <Label className="text-xs text-gray-400 mb-2 block">Bonding Curve — Price vs Tokens Sold</Label>
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
                  tickFormatter={(v) => `$${v.toFixed(5)}`}
                  stroke="#6b7280"
                  fontSize={10}
                  width={72}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelFormatter={(v) => `Tokens Sold: ${Number(v).toLocaleString()}`}
                  formatter={(value: number) => [`$${value.toFixed(8)}`, "Price"]}
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
      </CardContent>
    </Card>
  );
};

export default TokenCalculatorCard;
