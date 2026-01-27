import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHistoricalQuarterlyIncome } from "@/hooks/useHistoricalQuarterlyIncome";
import { 
  calculateQuarterlyTaxLiability, 
  formatCurrency, 
  generateQuarterlyDueDates 
} from "@/utils/taxCalculations";

interface QuarterlyDueDatesProps {
  userId?: string;
}

const QuarterlyDueDates = ({ userId }: QuarterlyDueDatesProps) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Fetch historical income data
  const { quarters: incomeData, loading } = useHistoricalQuarterlyIncome(userId);
  
  // Generate due dates for current year + Q4 from previous year (due in current year)
  const currentYearDueDates = generateQuarterlyDueDates(currentYear);
  const previousYearQ4 = generateQuarterlyDueDates(currentYear - 1).find(q => q.quarter === 4);
  
  // Combine: current year quarters first, then previous year Q4 at the end
  const dueDates = previousYearQ4 
    ? [...currentYearDueDates, previousYearQ4]
    : currentYearDueDates;

  const getQuarterStatus = (dueDate: Date) => {
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return { status: "past", color: "bg-red-600", text: "Past Due" };
    } else if (daysDiff <= 30) {
      return { status: "upcoming", color: "bg-yellow-600", text: "Due Soon" };
    } else {
      return { status: "future", color: "bg-green-600", text: "Upcoming" };
    }
  };

  const getNextDueDate = () => {
    const today = new Date();
    return dueDates.find(quarter => quarter.date > today);
  };

  // Find income data for a specific quarter
  const getQuarterIncome = (year: number, quarter: number) => {
    return incomeData.find(q => q.year === year && q.quarter === quarter);
  };

  const nextDue = getNextDueDate();

  return (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {currentYear} Quarterly Due Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Due Date Highlight */}
        {nextDue && (
          <div className="bg-blue-900/30 border border-blue-600 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-medium">Next Payment Due</span>
            </div>
            <div className="text-lg font-bold text-blue-300">{nextDue.dueDate}</div>
            <div className="text-blue-200 text-sm">Q{nextDue.quarter} {nextDue.year}</div>
          </div>
        )}

        {/* All Quarters */}
        <div className="space-y-3">
          <h4 className="text-gray-300 font-medium">All Quarterly Deadlines</h4>
          {dueDates.map((quarter) => {
            const status = getQuarterStatus(quarter.date);
            const incomeForQuarter = getQuarterIncome(quarter.year, quarter.quarter);
            const hasIncome = incomeForQuarter && incomeForQuarter.totalIncome > 0;
            
            // Calculate tax liability if there's income
            let taxLiability = null;
            if (hasIncome) {
              taxLiability = calculateQuarterlyTaxLiability(
                incomeForQuarter.totalIncome,
                0, // Default business expenses (user can customize in calculator)
                incomeForQuarter.processingFees
              );
            }
            
            return (
              <div key={`${quarter.year}-${quarter.quarter}`} className="bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Q{quarter.quarter} {quarter.year}</span>
                  <Badge className={`${status.color} text-white`}>
                    {status.text}
                  </Badge>
                </div>
                <div className="text-sm text-gray-400">
                  <div>Period: {quarter.period}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    Due: {quarter.dueDate}
                  </div>
                </div>
                
                {/* Show income and tax liability for past due quarters */}
                {status.status === "past" && userId && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    {loading ? (
                      <div className="text-gray-500 text-sm">Loading...</div>
                    ) : hasIncome && taxLiability ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Income:</span>
                          <span className="text-green-400 font-medium">
                            {formatCurrency(incomeForQuarter.totalIncome)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Est. Tax Due:
                          </span>
                          <span className="text-red-400 font-medium">
                            {formatCurrency(taxLiability.totalQuarterlyPayment)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          SE Tax: {formatCurrency(taxLiability.selfEmploymentTax)} | NY: {formatCurrency(taxLiability.nyStateTax)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No income recorded</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-900/30 border border-yellow-600 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-medium">Important Reminders</span>
          </div>
          <ul className="text-yellow-200 text-sm space-y-1">
            <li>• Payments must be postmarked by the due date</li>
            <li>• Electronic payments must be submitted by 11:59 PM ET</li>
            <li>• Consider making payments early to avoid last-minute issues</li>
            <li>• Keep records of all quarterly payments for tax filing</li>
          </ul>
        </div>

        {/* Payment Methods */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <h4 className="text-gray-300 font-medium mb-2">Payment Methods</h4>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• IRS Direct Pay (bank transfer)</li>
            <li>• EFTPS (Electronic Federal Tax Payment System)</li>
            <li>• Form 1040ES with check</li>
            <li>• Third-party payment processors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuarterlyDueDates;
