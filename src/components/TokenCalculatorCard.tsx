import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";
import { useTokenCalculation } from "@/hooks/useTokenCalculation";

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
    isLoading,
  } = useTokenCalculation();

  const formatPrice = (price: number) => {
    if (price === 0) return "$0.00";
    if (price < 0.01) return `$${price.toFixed(5)}`;
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

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <img src={sixthCoinLogo} alt="SIXTH Coin" className="w-8 h-8 rounded-full object-cover" />
          Token Economics Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
      </CardContent>
    </Card>
  );
};

export default TokenCalculatorCard;
