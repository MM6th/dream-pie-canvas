
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, AlertTriangle, Download, Info } from "lucide-react";
import RevenueBreakdownModal from "./RevenueBreakdownModal";

interface TaxResults {
  netEarnings: number;
  selfEmploymentTax: number;
  nyStateTax: number;
  totalQuarterlyPayment: number;
  annualProjection: number;
}

interface TaxData {
  quarterlyIncome: number;
  businessExpenses: number;
  filingStatus: string;
  previousYearAGI: number;
}

interface TaxResultsDisplayProps {
  results: TaxResults;
  taxData: TaxData;
}

const TaxResultsDisplay = ({ results, taxData }: TaxResultsDisplayProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handlePrint = () => {
    const printContent = `
      Self-Employment Tax Calculation Results
      Generated: ${new Date().toLocaleDateString()}
      
      Income Information:
      Quarterly Gross Income: ${formatCurrency(taxData.quarterlyIncome)}
      Business Expenses: ${formatCurrency(taxData.businessExpenses)}
      Net Earnings: ${formatCurrency(results.netEarnings)}
      Filing Status: ${taxData.filingStatus}
      
      Tax Calculations:
      Self-Employment Tax: ${formatCurrency(results.selfEmploymentTax)}
      NY State Income Tax: ${formatCurrency(results.nyStateTax)}
      Total Quarterly Payment: ${formatCurrency(results.totalQuarterlyPayment)}
      Annual Projection: ${formatCurrency(results.annualProjection)}
      
      Disclaimer: This is an estimate for planning purposes only. Consult a tax professional.
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>SE Tax Calculator Results</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <pre>${printContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const safeHarborAmount = taxData.previousYearAGI > 150000 
    ? taxData.previousYearAGI * 0.11 / 4  // 110% of prior year tax
    : taxData.previousYearAGI * 0.10 / 4; // 100% of prior year tax

  return (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Tax Calculation Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Breakdown Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-blue-400 font-semibold mb-1">Your Merchant Revenue (90%)</h4>
                <p className="text-sm text-gray-400">
                  Income shown is your 90% merchant share after PayPal fees and PIE's 10% platform fee.
                  PIE handles distribution to your PayPal account.
                </p>
              </div>
            </div>
            <RevenueBreakdownModal />
          </div>
        </div>

        {/* Income Summary */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <h4 className="text-gray-300 font-medium mb-2">Income Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Merchant Revenue (90%):</span>
              <span className="text-white">{formatCurrency(taxData.quarterlyIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Business Expenses:</span>
              <span className="text-white">-{formatCurrency(taxData.businessExpenses)}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-gray-600 pt-1">
              <span className="text-gray-300">Net Earnings:</span>
              <span className="text-green-400">{formatCurrency(results.netEarnings)}</span>
            </div>
          </div>
        </div>

        {/* Detailed SE Tax Breakdown */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <h4 className="text-gray-300 font-medium mb-3">Self-Employment Tax Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">1. Net Earnings:</span>
              <span className="text-white">{formatCurrency(results.netEarnings)}</span>
            </div>
            
            <div className="bg-blue-900/20 p-2 rounded space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-300">2. SE Tax Base (92.35% of net):</span>
                <span className="text-blue-200">{formatCurrency(results.netEarnings * 0.9235)}</span>
              </div>
              <p className="text-blue-200 text-xs italic pl-2">
                This accounts for the employer portion deduction under FICA
              </p>
            </div>

            <div className="bg-purple-900/20 p-2 rounded space-y-1">
              <div className="text-purple-300 font-medium">3. SE Tax Rate: 15.3%</div>
              <div className="pl-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-200">• Social Security (12.4%):</span>
                  <span className="text-purple-200">{formatCurrency(results.netEarnings * 0.9235 * 0.124)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-200">• Medicare (2.9%):</span>
                  <span className="text-purple-200">{formatCurrency(results.netEarnings * 0.9235 * 0.029)}</span>
                </div>
              </div>
              <p className="text-purple-200 text-xs italic pl-2 mt-1">
                Self-employed individuals pay both employee (7.65%) and employer (7.65%) portions
              </p>
            </div>

            <div className="flex justify-between font-medium border-t border-gray-600 pt-2">
              <span className="text-yellow-400">4. Total SE Tax:</span>
              <span className="text-yellow-400 font-bold">{formatCurrency(results.selfEmploymentTax)}</span>
            </div>
          </div>
        </div>

        {/* State Tax */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <h4 className="text-gray-300 font-medium mb-2">State Tax</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">NY State Income Tax:</span>
              <span className="text-white">{formatCurrency(results.nyStateTax)}</span>
            </div>
          </div>
        </div>

        {/* Total Payment Due */}
        <div className="bg-yellow-900/30 border border-yellow-600 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-yellow-400 font-medium">Total Quarterly Payment:</span>
            <span className="text-yellow-400 text-2xl font-bold">{formatCurrency(results.totalQuarterlyPayment)}</span>
          </div>
          <p className="text-yellow-200 text-xs mt-1">
            SE Tax + State Tax = {formatCurrency(results.selfEmploymentTax)} + {formatCurrency(results.nyStateTax)}
          </p>
        </div>

        {/* Annual Projection */}
        <div className="bg-blue-900/30 border border-blue-600 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h4 className="text-blue-400 font-medium">Annual Projection</h4>
          </div>
          <div className="text-2xl font-bold text-blue-300">
            {formatCurrency(results.annualProjection)}
          </div>
          <p className="text-blue-200 text-sm">Estimated total annual tax liability</p>
        </div>

        {/* Safe Harbor Information */}
        {taxData.previousYearAGI > 0 && (
          <div className="bg-green-900/30 border border-green-600 p-3 rounded-lg">
            <h4 className="text-green-400 font-medium mb-2">Safe Harbor Rule</h4>
            <div className="text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Quarterly Safe Harbor:</span>
                <span className="text-green-400">{formatCurrency(safeHarborAmount)}</span>
              </div>
              <p className="text-green-200 text-xs mt-1">
                Pay this amount quarterly to avoid penalties (based on prior year tax)
              </p>
            </div>
          </div>
        )}

        {/* Warnings */}
        {results.netEarnings < 400 && (
          <div className="bg-yellow-900/30 border border-yellow-600 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm">
                Net earnings under $400 - Self-employment tax may not apply
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handlePrint}
            variant="outline"
            className="border-gray-500 text-gray-300 hover:bg-gray-600 flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Print Results
          </Button>
        </div>

        {/* Understanding Your Taxes */}
        <div className="bg-green-900/20 border border-green-600 p-3 rounded-lg">
          <h4 className="text-green-400 font-medium mb-2">Understanding Your Tax Breakdown</h4>
          <div className="space-y-2 text-xs text-green-200">
            <p>
              <strong>FICA (Federal Insurance Contributions Act):</strong> The 92.35% multiplier accounts for 
              the deductible portion of self-employment tax, which represents the employer's half of FICA taxes.
            </p>
            <p>
              <strong>Employee vs Employer Portion:</strong> As a self-employed individual, you pay both the 
              employee portion (7.65%) and employer portion (7.65%), totaling 15.3%.
            </p>
            <p>
              <strong>Safe Harbor Rule:</strong> Pay at least 100% of your prior year's tax (110% if AGI exceeds $150,000) 
              to avoid underpayment penalties, even if you owe more this year.
            </p>
            <p>
              <strong>Resources:</strong> Visit <a href="https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes" target="_blank" rel="noopener noreferrer" className="underline text-green-300">IRS.gov</a> for detailed self-employment tax information.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-red-900/20 border border-red-600 p-3 rounded-lg">
          <p className="text-red-300 text-xs">
            <strong>Disclaimer:</strong> These calculations are estimates only. Actual tax liability may vary. 
            Consult a qualified tax professional for personalized advice and accurate calculations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxResultsDisplay;
