
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
          <div className="flex items-start gap-2 mb-3">
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

        {/* Detailed SE Tax Breakdown - ALWAYS SHOWN */}
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <h4 className="text-gray-300 font-medium mb-3">Self-Employment Tax Breakdown</h4>
          <div className="space-y-2 text-sm">
            {/* Step 1: Net Earnings */}
            <div className="flex justify-between">
              <span className="text-gray-400">1. Net Earnings (Gross - Expenses):</span>
              <span className="text-white">{formatCurrency(results.netEarnings)}</span>
            </div>
            
            {/* Step 2: FICA Taxable Amount (92.35%) */}
            <div className="bg-blue-900/20 p-2 rounded space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-300">2. FICA Taxable (92.35% of Net):</span>
                <span className="text-blue-200">{formatCurrency(results.netEarnings * 0.9235)}</span>
              </div>
              <p className="text-blue-200 text-xs italic pl-2">
                The 92.35% accounts for the employer-equivalent portion deduction
              </p>
            </div>

            {/* Step 3: SE Tax Calculation (15.3%) */}
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
                Self-employed pay both employee (7.65%) and employer (7.65%) portions
              </p>
            </div>

            {/* Step 4: Total SE Tax */}
            <div className="flex justify-between font-medium border-t border-gray-600 pt-2">
              <span className="text-yellow-400">4. Total SE Tax Calculated:</span>
              <span className="text-yellow-400 font-bold">{formatCurrency(results.selfEmploymentTax)}</span>
            </div>

            {/* Step 5: Employer Portion (50% deductible on Form 1040) */}
            <div className="bg-green-900/20 p-2 rounded space-y-1">
              <div className="flex justify-between">
                <span className="text-green-300">5. Employer Portion (50% deductible):</span>
                <span className="text-green-200 font-bold">{formatCurrency(results.selfEmploymentTax * 0.5)}</span>
              </div>
              <p className="text-green-200 text-xs italic pl-2">
                This amount is deductible as an adjustment to income on Form 1040
              </p>
            </div>

            {/* IRS $400 Threshold Message */}
            {results.netEarnings < 400 ? (
              <div className="bg-orange-900/30 border border-orange-600 p-3 rounded mt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-300 font-medium mb-1">IRS $400 Threshold Note</p>
                    <p className="text-orange-200 text-xs">
                      While the SE tax calculation is shown above ({formatCurrency(results.selfEmploymentTax)}), 
                      the IRS does not require SE tax payment when net earnings are below $400. 
                      <strong className="text-orange-100"> However, NY State tax is still calculated and owed.</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-900/30 border border-green-600 p-3 rounded mt-2">
                <p className="text-green-300 text-xs">
                  ✓ Net earnings exceed $400 - Full SE tax applies and must be paid quarterly
                </p>
              </div>
            )}
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

        {/* Total Payment Due - WITH TRANSPARENT BREAKDOWN */}
        <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded-lg">
          <h4 className="text-yellow-400 font-semibold mb-3 text-lg">Total Quarterly Payment Breakdown</h4>
          
          {/* Detailed Breakdown */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center bg-yellow-900/20 p-2 rounded">
              <span className="text-yellow-200">Federal SE Tax:</span>
              <span className="text-yellow-100 font-bold text-lg">{formatCurrency(results.selfEmploymentTax)}</span>
            </div>
            
            <div className="flex justify-between items-center bg-yellow-900/20 p-2 rounded">
              <span className="text-yellow-200">NY State Income Tax:</span>
              <span className="text-yellow-100 font-bold text-lg">{formatCurrency(results.nyStateTax)}</span>
            </div>
            
            <div className="border-t-2 border-yellow-500 pt-2 mt-2"></div>
            
            <div className="flex justify-between items-center">
              <span className="text-yellow-300 font-bold text-lg">Total Payment Due:</span>
              <span className="text-yellow-300 text-3xl font-bold">{formatCurrency(results.totalQuarterlyPayment)}</span>
            </div>
          </div>
          
          <p className="text-yellow-200 text-sm">
            {results.netEarnings < 400 
              ? "⚠️ Only NY State tax is due this quarter (SE tax below IRS $400 threshold). NY requires tax payment regardless of federal thresholds."
              : "Both federal self-employment tax and NY state tax are due this quarter."
            }
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
