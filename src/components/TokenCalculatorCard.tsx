import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { useTokenCalculation } from "@/hooks/useTokenCalculation";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { ShieldCheck, AlertTriangle, TrendingUp, Waves, PieChart, LogOut } from "lucide-react";

const FULL_MARKET_CAP = 22_000_000;
const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;
const RESERVE_RATIO = 0.70;

const fmt = (n: number) => n.toLocaleString();

const TokenCalculatorCard = () => {
  const {
    tokensPurchased,
    circulatingSupply,
    liquidityPool,
    tokensLeft,
    newPricePerToken,
    totalDollarValue,
    reserveBalance,
    requiredReserve,
    initialSeed,
    totalReserve,
    reserveHealthRatio,
    bondingCurveData,
    isLoading,
    slippagePercent,
    dangerPrice,
    dangerTokensSold,
    whaleImpacts,
    buyTaxRate,
    sellTaxRate,
    buyTaxRevenue,
    sellTaxRevenue,
    totalTaxRevenue,
    reserveFromCurve,
    reserveFromSeed,
    reserveFromTax,
    exitCostAnalysis,
  } = useTokenCalculation();

  const formatPrice = (price: number) => {
    if (price === 0) return "$0.00";
    if (price < 0.01) return `$${price.toFixed(8)}`;
    return `$${price.toFixed(4)}`;
  };

  const fields = [
    { label: "Total Credit Revenue (USD)", placeholder: isLoading ? "Loading..." : `$${totalDollarValue.toFixed(2)}`, hasCoinIcon: false },
    { label: "Tokens Purchased", placeholder: isLoading ? "Loading..." : fmt(tokensPurchased), hasCoinIcon: false },
    { label: "Initial Price Per Token", placeholder: `$${INITIAL_PRICE}`, hasCoinIcon: false },
    { label: "Target Price", placeholder: `$${TARGET_PRICE}`, hasCoinIcon: false },
    { label: "Reserve Ratio", placeholder: `${(RESERVE_RATIO * 100).toFixed(0)}%`, hasCoinIcon: false },
    { label: "Full Market Cap", placeholder: fmt(FULL_MARKET_CAP), hasCoinIcon: true },
    { label: "Full Market Cap Value", placeholder: isLoading ? "Loading..." : `$${(FULL_MARKET_CAP * newPricePerToken).toFixed(2)}`, hasCoinIcon: false },
    { label: "Circulating Supply", placeholder: isLoading ? "Loading..." : fmt(circulatingSupply), hasCoinIcon: true },
    { label: "Circulating Supply Value", placeholder: isLoading ? "Loading..." : `$${(circulatingSupply * newPricePerToken).toFixed(2)}`, hasCoinIcon: false },
    { label: "Liquidity Pool", placeholder: isLoading ? "Loading..." : fmt(liquidityPool), hasCoinIcon: true },
    { label: "Liquidity Pool Value", placeholder: isLoading ? "Loading..." : `$${(liquidityPool * newPricePerToken).toFixed(2)}`, hasCoinIcon: false },
    { label: "Tokens Left", placeholder: isLoading ? "Loading..." : fmt(tokensLeft), hasCoinIcon: true },
    { label: "Tokens Left Value", placeholder: isLoading ? "Loading..." : `$${(tokensLeft * newPricePerToken).toFixed(2)}`, hasCoinIcon: false },
    { label: "Spot Price", placeholder: isLoading ? "Loading..." : formatPrice(newPricePerToken), hasCoinIcon: false },
    { label: "Average Price", placeholder: isLoading ? "Loading..." : (tokensPurchased > 0 ? formatPrice(reserveBalance / tokensPurchased) : "$0.00"), hasCoinIcon: false },
    { label: "Initial Seed", placeholder: `$${initialSeed.toFixed(2)}`, hasCoinIcon: false },
    { label: "Curve Reserve", placeholder: isLoading ? "Loading..." : `$${reserveBalance.toFixed(2)}`, hasCoinIcon: false },
    { label: "Total Reserve", placeholder: isLoading ? "Loading..." : `$${totalReserve.toFixed(2)}`, hasCoinIcon: false },
    { label: "Buy Tax (1%)", placeholder: isLoading ? "Loading..." : `$${buyTaxRevenue.toFixed(4)}`, hasCoinIcon: false },
    { label: "Buy Tax (1%)", placeholder: isLoading ? "Loading..." : `$${buyTaxRevenue.toFixed(4)}`, hasCoinIcon: false },
    { label: "Sell Tax (3%)", placeholder: `$${sellTaxRevenue.toFixed(4)} (placeholder)`, hasCoinIcon: false },
    { label: "Total Tax Revenue", placeholder: isLoading ? "Loading..." : `$${totalTaxRevenue.toFixed(4)}`, hasCoinIcon: false },
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

        {/* Slippage Warning */}
        <div className={`rounded-lg p-4 flex items-start gap-3 border ${
          Math.abs(slippagePercent) < 5
            ? "bg-emerald-950/30 border-emerald-700/40"
            : Math.abs(slippagePercent) < 20
            ? "bg-amber-950/30 border-amber-700/40"
            : "bg-red-950/30 border-red-700/40"
        }`}>
          <TrendingUp className={`w-5 h-5 mt-0.5 shrink-0 ${
            Math.abs(slippagePercent) < 5 ? "text-emerald-400" : Math.abs(slippagePercent) < 20 ? "text-amber-400" : "text-red-400"
          }`} />
          <div className="space-y-1">
            <p className={`text-sm font-medium ${
              Math.abs(slippagePercent) < 5 ? "text-emerald-300" : Math.abs(slippagePercent) < 20 ? "text-amber-300" : "text-red-300"
            }`}>
              Slippage: {isLoading ? "..." : `${slippagePercent.toFixed(2)}%`}
              {!isLoading && (Math.abs(slippagePercent) < 5 ? " ✓ Minimal" : Math.abs(slippagePercent) < 20 ? " ⚠ Moderate" : " 🚨 High")}
            </p>
            <p className="text-xs text-gray-400">
              Spot: {formatPrice(newPricePerToken)} vs Avg: {formatPrice(tokensPurchased > 0 ? reserveBalance / tokensPurchased : 0)}.
              Buyers paying spot price vs historical average.
            </p>
          </div>
        </div>

        {/* Reserve Health Card */}
        <div className={`rounded-lg p-4 flex items-start gap-3 border ${
          reserveHealthRatio >= 1
            ? "bg-emerald-950/30 border-emerald-700/40"
            : reserveHealthRatio >= 0.10
            ? "bg-amber-950/30 border-amber-700/40"
            : "bg-red-950/30 border-red-700/40"
        }`}>
          <ShieldCheck className={`w-5 h-5 mt-0.5 shrink-0 ${
            reserveHealthRatio >= 1 ? "text-emerald-400" : reserveHealthRatio >= 0.10 ? "text-amber-400" : "text-red-400"
          }`} />
          <div className="space-y-1">
            <p className={`text-sm font-medium ${
              reserveHealthRatio >= 1 ? "text-emerald-300" : reserveHealthRatio >= 0.10 ? "text-amber-300" : "text-red-300"
            }`}>
              Reserve Health: {isLoading ? "..." : `${(reserveHealthRatio * 100).toFixed(1)}%`}
              {!isLoading && (reserveHealthRatio >= 1 ? " ✓ Fully Collateralized" : reserveHealthRatio >= 0.10 ? " ⚠ Monitor" : " 🚨 Add Liquidity")}
            </p>
            <p className="text-xs text-gray-400">
              Total reserve: <span className="font-semibold text-amber-400">${isLoading ? "..." : totalReserve.toFixed(2)}</span>{" "}
              (seed ${initialSeed.toFixed(2)} + curve ${isLoading ? "..." : reserveBalance.toFixed(2)}).
              Full market cap value: ${isLoading ? "..." : (22_000_000 * newPricePerToken).toFixed(2)}.
            </p>
          </div>
        </div>

        {/* Reserve Source Breakdown */}
        <div className="rounded-lg p-4 border bg-gray-900/50 border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-amber-400" />
            <p className="text-sm font-medium text-gray-200">Vault Reserve Breakdown</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-blue-950/30 border border-blue-800/40">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Initial Seed</p>
              <p className="text-lg font-bold text-blue-300">${reserveFromSeed.toFixed(2)}</p>
              <p className="text-[10px] text-gray-500">
                {totalReserve > 0 ? ((reserveFromSeed / totalReserve) * 100).toFixed(1) : "0"}%
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-950/30 border border-amber-800/40">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Curve Revenue</p>
              <p className="text-lg font-bold text-amber-300">${isLoading ? "..." : reserveFromCurve.toFixed(4)}</p>
              <p className="text-[10px] text-gray-500">
                {totalReserve > 0 ? ((reserveFromCurve / totalReserve) * 100).toFixed(1) : "0"}%
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tax Revenue</p>
              <p className="text-lg font-bold text-emerald-300">${isLoading ? "..." : reserveFromTax.toFixed(4)}</p>
              <p className="text-[10px] text-gray-500">
                {totalReserve > 0 ? ((reserveFromTax / totalReserve) * 100).toFixed(1) : "0"}%
              </p>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Buy tax: {(buyTaxRate * 100).toFixed(0)}% on purchases → vault. Sell tax: {(sellTaxRate * 100).toFixed(0)}% on sell-backs → vault. Dynamic reserve grows with trading friction.
          </p>
        </div>


        {dangerPrice > 0 && (
          <div className="rounded-lg p-4 flex items-start gap-3 border bg-red-950/30 border-red-700/40">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-300">⚠ Danger Zone Threshold</p>
              <p className="text-xs text-gray-400">
                Reserve ratio drops below <span className="text-red-400 font-semibold">10%</span> at{" "}
                <span className="text-amber-400 font-semibold">{formatPrice(dangerPrice)}</span>/token
                ({fmt(dangerTokensSold)} tokens sold). Consider adding liquidity before this point.
              </p>
            </div>
          </div>
        )}

        {/* Total Exit Cost Analysis */}
        {tokensPurchased > 0 && (
          <div className="rounded-lg p-4 border bg-gray-900/50 border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <LogOut className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-medium text-gray-200">Total Exit Cost — Slippage + Tax Reality</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="text-center p-2 rounded-lg bg-gray-800/50 border border-gray-700">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Paper Value</p>
                <p className="text-sm font-bold text-white">{formatPrice(exitCostAnalysis.spotValueAllTokens)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-950/30 border border-amber-800/40">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Curve Payout</p>
                <p className="text-sm font-bold text-amber-300">{formatPrice(exitCostAnalysis.grossExitValue)}</p>
                <p className="text-[10px] text-gray-500">-{formatPrice(exitCostAnalysis.curveSlippageLoss)} slippage</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-950/30 border border-red-800/40">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sell Tax (3%)</p>
                <p className="text-sm font-bold text-red-300">-{formatPrice(exitCostAnalysis.sellTaxCost)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Net Payout</p>
                <p className="text-sm font-bold text-emerald-300">{formatPrice(exitCostAnalysis.netExitPayout)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-gray-700 pt-2">
              <span className="text-gray-400">
                Total exit loss: <span className={`font-semibold ${exitCostAnalysis.totalExitLossPercent < 10 ? "text-emerald-400" : exitCostAnalysis.totalExitLossPercent < 30 ? "text-amber-400" : "text-red-400"}`}>
                  {exitCostAnalysis.totalExitLossPercent.toFixed(2)}%
                </span>
              </span>
              <span className="text-gray-400">
                Vault surplus after exit: <span className="font-semibold text-emerald-400">${exitCostAnalysis.vaultSurplus.toFixed(4)}</span>
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              If all {fmt(tokensPurchased)} tokens sold back at once: holders lose {exitCostAnalysis.totalExitLossPercent.toFixed(1)}% to curve slippage + sell tax. Vault keeps ${exitCostAnalysis.vaultRetained.toFixed(4)}.
            </p>
          </div>
        )}

        {/* Whale Impact Meter */}
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-3">
            <Waves className="w-4 h-4 text-blue-400" />
            <Label className="text-xs text-gray-400">Whale Impact Simulator — Large Purchase Effects</Label>
          </div>
          <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="px-3 py-2 text-left">Buy (USD)</th>
                  <th className="px-3 py-2 text-right">Tokens</th>
                  <th className="px-3 py-2 text-right">Avg Price</th>
                  <th className="px-3 py-2 text-right">Spot After</th>
                  <th className="px-3 py-2 text-right">Slippage</th>
                  <th className="px-3 py-2 text-right">Reserve %</th>
                </tr>
              </thead>
              <tbody>
                {whaleImpacts.map((w) => (
                  <tr key={w.usdAmount} className="border-b border-gray-800 text-gray-300">
                    <td className="px-3 py-2 font-medium text-white">${w.usdAmount}</td>
                    <td className="px-3 py-2 text-right">{fmt(w.tokensAcquired)}</td>
                    <td className="px-3 py-2 text-right">{formatPrice(w.avgPrice)}</td>
                    <td className="px-3 py-2 text-right">{formatPrice(w.spotPriceAfter)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${
                      w.slippagePercent < 5 ? "text-emerald-400" : w.slippagePercent < 20 ? "text-amber-400" : "text-red-400"
                    }`}>{w.slippagePercent.toFixed(1)}%</td>
                    <td className={`px-3 py-2 text-right font-medium ${
                      w.reserveRatioAfter >= 0.10 ? "text-emerald-400" : "text-red-400"
                    }`}>{(w.reserveRatioAfter * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Simulates purchases from current position. Slippage = how much more a buyer pays vs their average fill price.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenCalculatorCard;
