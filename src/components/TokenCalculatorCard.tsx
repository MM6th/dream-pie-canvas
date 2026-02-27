import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

const fields = [
  { label: "Tokens Purchased", placeholder: "0" },
  { label: "Initial Price Per Token", placeholder: "$0.00" },
  { label: "Full Market Cap", placeholder: "$0.00" },
  { label: "Circulating Supply", placeholder: "0" },
  { label: "Tokens Left", placeholder: "0" },
  { label: "New Price Per Token", placeholder: "$0.00" },
];

const TokenCalculatorCard = () => {
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
            <Input
              disabled
              placeholder={field.placeholder}
              className="bg-gray-900/50 border-gray-600 text-white disabled:opacity-70"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default TokenCalculatorCard;
