import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle } from "lucide-react";
import { DistributionObligation } from "@/hooks/useDistributionObligations";

interface DistributionObligationsCardProps {
  obligations: DistributionObligation[];
  totalOwed: number;
  isLoading: boolean;
}

const DistributionObligationsCard = ({ obligations, totalOwed, isLoading }: DistributionObligationsCardProps) => {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (isLoading) {
    return (
      <Card className="bg-orange-900/20 border-orange-600/50">
        <CardContent className="p-4">
          <p className="text-gray-400 text-sm">Loading distribution data...</p>
        </CardContent>
      </Card>
    );
  }

  if (obligations.length === 0) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Users className="w-4 h-4" />
            <span>No outstanding distributions owed</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-orange-900/20 border-orange-600/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-orange-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          PIE Distribution Obligations
          <Badge className="bg-orange-600 text-white text-xs ml-auto">
            {formatCurrency(totalOwed)} owed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-gray-400 text-xs mb-3">
          Revenue owed to users from paid messaging (90% recipient share)
        </p>

        {obligations.map((obligation) => (
          <div
            key={obligation.recipientId}
            className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium">
                {obligation.recipientName}
              </span>
              <span className="text-gray-500 text-xs">
                {obligation.messageCount} paid message{obligation.messageCount !== 1 ? 's' : ''} received
                {' '}• {obligation.totalCreditsReceived} credits
              </span>
            </div>
            <span className="text-orange-400 font-semibold text-sm">
              {formatCurrency(obligation.amountOwed)}
            </span>
          </div>
        ))}

        <div className="flex justify-between items-center border-t border-orange-600/30 pt-2 mt-2">
          <span className="text-orange-300 font-medium text-sm">Total Owed</span>
          <span className="text-orange-400 font-bold text-lg">{formatCurrency(totalOwed)}</span>
        </div>

        <p className="text-orange-200/60 text-xs mt-1">
          Users can cash out once they reach the $100 threshold. Amounts shown are after 10% platform fee deduction.
        </p>
      </CardContent>
    </Card>
  );
};

export default DistributionObligationsCard;
