import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { useTokenCalculation } from "@/hooks/useTokenCalculation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { TrendingUp, Wallet, History, Calculator } from "lucide-react";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SixthTokenEducationModal from "@/components/SixthTokenEducationModal";
import SellTokenCard from "@/components/SellTokenCard";

const LIQUIDITY_POOL_SIZE = 10_780_000;
const INITIAL_PRICE = 0.00001;
const TARGET_PRICE = 0.01;

const fmt = (n: number) => n.toLocaleString();
const formatPrice = (price: number) => {
  if (price === 0) return "$0.00";
  if (price < 0.01) return `$${price.toFixed(8)}`;
  return `$${price.toFixed(4)}`;
};

const MintTokens = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: approvalLoading } = useApprovalStatus();
  const {
    tokensPurchased, circulatingSupply, liquidityPool, tokensLeft,
    newPricePerToken, totalDollarValue, reserveBalance, totalReserve,
    bondingCurveData, isLoading, buyTaxRate,
  } = useTokenCalculation();

  const [usdInput, setUsdInput] = useState("");
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [estimatedAvgPrice, setEstimatedAvgPrice] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // Handle return from PayPal
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      const amount = searchParams.get("amount");
      toast({ title: "Purchase Successful!", description: `$${amount} converted to SIXTH tokens. Check your balance below.` });
    } else if (searchParams.get("error")) {
      toast({ title: "Purchase Failed", description: searchParams.get("error") || "Unknown error", variant: "destructive" });
    } else if (searchParams.get("cancelled") === "true") {
      toast({ title: "Purchase Cancelled", description: "Your token purchase was cancelled." });
    }
  }, [searchParams]);

  // Price calculator
  useEffect(() => {
    const usd = parseFloat(usdInput);
    if (!usd || usd <= 0 || isLoading) {
      setEstimatedTokens(0);
      setEstimatedAvgPrice(0);
      return;
    }
    const k = Math.log(TARGET_PRICE / INITIAL_PRICE) / LIQUIDITY_POOL_SIZE;
    const taxed = usd * (1 - buyTaxRate);
    const currentReserve = circulatingSupply === 0 ? 0 : (INITIAL_PRICE / k) * (Math.exp(k * circulatingSupply) - 1);
    const targetReserve = currentReserve + taxed;
    const sAfter = Math.log(targetReserve * k / INITIAL_PRICE + 1) / k;
    const tokens = Math.max(0, Math.min(Math.floor(sAfter - circulatingSupply), LIQUIDITY_POOL_SIZE - circulatingSupply));
    setEstimatedTokens(tokens);
    setEstimatedAvgPrice(tokens > 0 ? usd / tokens : 0);
  }, [usdInput, circulatingSupply, isLoading, buyTaxRate]);

  // Fetch transaction history
  useEffect(() => {
    if (!user) return;
    const fetchTx = async () => {
      setLoadingTx(true);
      const { data } = await supabase
        .from("platform_revenue")
        .select("*")
        .eq("source_user_id", user.id)
        .eq("revenue_type", "credit_purchase")
        .order("created_at", { ascending: false })
        .limit(20);
      setTransactions(data || []);
      setLoadingTx(false);
    };
    fetchTx();
  }, [user, searchParams]);

  // Fetch user token balance
  const [userBalance, setUserBalance] = useState(0);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("token_balances")
      .select("balance, total_purchased, total_spent_usd")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUserBalance(data.balance);
      });
  }, [user, searchParams]);

  const handlePurchase = async () => {
    const usd = parseFloat(usdInput);
    if (!usd || usd < 1 || usd > 10000) {
      toast({ title: "Invalid Amount", description: "Enter between $1 and $10,000", variant: "destructive" });
      return;
    }
    setIsPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-token-purchase", {
        body: { usdAmount: usd },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error("No approval URL returned");
      }
    } catch (err: any) {
      toast({ title: "Purchase Error", description: err.message, variant: "destructive" });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (authLoading || approvalLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <Card className="bg-gray-800/50 border-gray-700 max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400">Please sign in to access the token page.</p>
            <Button onClick={() => navigate("/")} className="mt-4">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = bondingCurveData.map((d) => ({ tokensSold: d.tokensSold, price: d.price }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white overflow-x-hidden">
      <DashboardHeader
        onStoreView={() => navigate("/")}
        onBulletinView={() => navigate("/bulletin")}
        onProfilesView={() => navigate("/profiles")}
        onSignOut={async () => { await supabase.auth.signOut(); navigate("/"); }}
        userType="merchant"
        onProfileUpdate={() => {}}
        isApproved={true}
        isAdmin={isAdmin}
        hideTokenCalculator
      />

      <div className="max-w-6xl mx-auto px-4 pb-8">
        {/* SIXTH branding + Education CTA */}
        <div className="flex flex-col items-center py-6 mb-4">
          <h1 className="text-xl font-bold text-white mb-2 text-center">Crypto Token Simulation</h1>
          <img src={sixthCoinLogo} alt="SIXTH Coin" className="w-20 h-20 rounded-full shadow-lg shadow-amber-500/20 border-2 border-amber-500/30 mb-2" />
          <p className="text-xs text-amber-400/80 mb-3 text-center max-w-md">All assets will be transferred to blockchain when converting</p>
          <p className="text-sm text-gray-400 mb-3 text-center max-w-md">Invest in your community's future — learn how SIXTH works before you buy.</p>
          <SixthTokenEducationModal />
        </div>

        {/* Purchase + Sell + Balance row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Purchase Card */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <img src={sixthCoinLogo} alt="SIXTH" className="w-5 h-5 rounded-full" /> Purchase SIXTH Tokens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-gray-400">USD Amount ($1 – $10,000)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={usdInput}
                  onChange={(e) => setUsdInput(e.target.value)}
                  placeholder="Enter USD amount"
                  className="bg-gray-900/50 border-gray-600 text-white mt-1"
                />
              </div>

              {estimatedTokens > 0 && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated tokens:</span>
                    <span className="text-amber-400 font-bold">{fmt(estimatedTokens)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Avg price/token:</span>
                    <span className="text-gray-300">{formatPrice(estimatedAvgPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Buy tax (1%):</span>
                    <span className="text-red-400">-${(parseFloat(usdInput) * buyTaxRate).toFixed(4)}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={isPurchasing || !usdInput || parseFloat(usdInput) < 1}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isPurchasing ? "Redirecting to PayPal..." : "Buy with PayPal"}
              </Button>
            </CardContent>
          </Card>

          {/* Sell Card */}
          <SellTokenCard
            userBalance={userBalance}
            circulatingSupply={circulatingSupply}
            spotPrice={newPricePerToken}
            isLoading={isLoading}
            userId={user!.id}
          />

          {/* Your Balance */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="w-5 h-5 text-emerald-400" /> Your Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <img src={sixthCoinLogo} alt="SIXTH" className="w-8 h-8 rounded-full" />
                <div>
                  <p className="text-2xl font-bold text-white">{fmt(userBalance)}</p>
                  <p className="text-xs text-gray-400">≈ {formatPrice(userBalance * newPricePerToken)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Stats */}
        <Card className="bg-gray-800/50 border-gray-700 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" /> Live Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: "Spot Price", value: formatPrice(newPricePerToken) },
                { label: "Total Supply", value: fmt(circulatingSupply) },
                { label: "Remaining", value: fmt(tokensLeft) },
                { label: "Total Reserve", value: `$${totalReserve.toFixed(2)}` },
                { label: "Total Revenue", value: `$${totalDollarValue.toFixed(2)}` },
                { label: "Liquidity Pool", value: fmt(liquidityPool) },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-sm font-bold text-white">{isLoading ? "..." : stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bonding Curve Chart */}
        <Card className="bg-gray-800/50 border-gray-700 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Bonding Curve — Price vs Supply</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="tokensSold"
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis
                  tickFormatter={(v) => v < 0.001 ? `$${v.toFixed(6)}` : `$${v.toFixed(4)}`}
                  stroke="#6b7280"
                  fontSize={10}
                  width={78}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelFormatter={(v) => `Supply: ${Number(v).toLocaleString()}`}
                  formatter={(value: number) => [formatPrice(value), "Price"]}
                />
                <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} />
                {tokensPurchased > 0 && (
                  <ReferenceDot x={tokensPurchased} y={newPricePerToken} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
                )}
              </LineChart>
            </ResponsiveContainer>
            {tokensPurchased > 0 && (
              <p className="text-[10px] text-gray-500 text-center mt-1">
                ● {fmt(tokensPurchased)} tokens → {formatPrice(newPricePerToken)}/token
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Estimates + Purchase History row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quick Estimates */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="w-5 h-5 text-purple-400" /> Quick Estimates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[5, 10, 25, 50, 100, 500].map((usd) => {
                  const k = Math.log(TARGET_PRICE / INITIAL_PRICE) / LIQUIDITY_POOL_SIZE;
                  const taxed = usd * (1 - buyTaxRate);
                  const curReserve = circulatingSupply === 0 ? 0 : (INITIAL_PRICE / k) * (Math.exp(k * circulatingSupply) - 1);
                  const tgtReserve = curReserve + taxed;
                  const sAfter = Math.log(tgtReserve * k / INITIAL_PRICE + 1) / k;
                  const tokens = Math.max(0, Math.min(Math.floor(sAfter - circulatingSupply), LIQUIDITY_POOL_SIZE - circulatingSupply));
                  return (
                    <div key={usd} className="flex items-center justify-between bg-gray-900/50 rounded p-2 border border-gray-700">
                      <span className="text-sm text-gray-300">${usd}</span>
                      <span className="text-sm text-amber-400 font-medium">{isLoading ? "..." : fmt(tokens)} SIXTH</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
                        onClick={() => setUsdInput(usd.toString())}
                      >
                        Use
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Purchase History */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-gray-400" /> Purchase History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTx ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-gray-500">No purchases yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="bg-gray-900/50 rounded p-2 border border-gray-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-white font-medium">${tx.amount?.toFixed(2)}</span>
                        <span className="text-gray-500 text-xs">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {tx.metadata?.type === 'direct_token_purchase' && (
                        <span className="text-[10px] text-purple-400">Direct purchase</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MintTokens;
