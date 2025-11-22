
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign } from "lucide-react";
import TaxCalculationForm from "./TaxCalculationForm";
import TaxResultsDisplay from "./TaxResultsDisplay";
import QuarterlyDueDates from "./QuarterlyDueDates";
import { useAuth } from "@/hooks/useAuth";
import { useQuarterlyIncome } from "@/hooks/useQuarterlyIncome";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface TaxData {
  platformIncome: number;
  quarterlyIncome: number;
  businessExpenses: number;
  filingStatus: string;
  previousYearAGI: number;
}

interface TaxResults {
  netEarnings: number;
  selfEmploymentTax: number;
  nyStateTax: number;
  totalQuarterlyPayment: number;
  annualProjection: number;
}

interface SECalculatorModalProps {
  userId?: string;
  autoPopulateIncome?: number;
}

const SECalculatorModal = ({ userId, autoPopulateIncome = 0 }: SECalculatorModalProps) => {
  const { user } = useAuth();
  const { currentQuarterIncome, companyIncome, contractorIncome } = useQuarterlyIncome(user?.id);
  
  const [isOpen, setIsOpen] = useState(false);
  const [taxData, setTaxData] = useState<TaxData>({
    platformIncome: autoPopulateIncome,
    quarterlyIncome: autoPopulateIncome,
    businessExpenses: 0,
    filingStatus: "single",
    previousYearAGI: 0,
  });
  const [results, setResults] = useState<TaxResults | null>(null);

  // Update platform income when auto-populate changes
  useEffect(() => {
    setTaxData(prev => ({
      ...prev,
      platformIncome: autoPopulateIncome,
      quarterlyIncome: autoPopulateIncome
    }));
  }, [autoPopulateIncome]);

  const calculateTaxes = (data: TaxData): TaxResults => {
    // Note: quarterlyIncome is already the merchant's 90% share after PayPal fees and PIE's 10% platform fee
    const netEarnings = Math.max(0, data.quarterlyIncome - data.businessExpenses);
    
    // Self-employment tax calculation (15.3% of net earnings × 0.9235)
    // Calculate for all income levels for security and accuracy purposes
    const selfEmploymentTax = netEarnings * 0.153 * 0.9235;
    
    // Basic NY state tax estimation (simplified progressive calculation)
    let nyStateTax = 0;
    const annualIncome = netEarnings * 4;
    
    if (annualIncome > 8500) {
      if (annualIncome <= 11700) {
        nyStateTax = (annualIncome - 8500) * 0.04;
      } else if (annualIncome <= 13900) {
        nyStateTax = 128 + (annualIncome - 11700) * 0.045;
      } else if (annualIncome <= 80650) {
        nyStateTax = 227 + (annualIncome - 13900) * 0.0525;
      } else {
        nyStateTax = 3781 + (annualIncome - 80650) * 0.0585;
      }
    }
    
    // Quarterly NY tax
    nyStateTax = nyStateTax / 4;
    
    const totalQuarterlyPayment = selfEmploymentTax + nyStateTax;
    const annualProjection = totalQuarterlyPayment * 4;

    return {
      netEarnings,
      selfEmploymentTax,
      nyStateTax,
      totalQuarterlyPayment,
      annualProjection,
    };
  };

  const handleCalculate = (data: TaxData) => {
    setTaxData(data);
    const calculatedResults = calculateTaxes(data);
    setResults(calculatedResults);
  };

  const handleReset = () => {
    setTaxData({
      platformIncome: autoPopulateIncome,
      quarterlyIncome: autoPopulateIncome,
      businessExpenses: 0,
      filingStatus: "single",
      previousYearAGI: 0,
    });
    setResults(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
        >
          <Calculator className="w-4 h-4 mr-2" />
          View Tax Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-400" />
            Q4 2025 Self-Employment Tax Calculator
            <Badge className="bg-green-600 text-white text-xs ml-2">Real Revenue</Badge>
          </DialogTitle>
          <DialogDescription className="text-gray-400 space-y-2">
            <p>Calculate your estimated self-employment and New York state taxes based on your quarterly income.</p>
            {(companyIncome > 0 || contractorIncome > 0) && (
              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                <p className="text-green-300 font-medium mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Real Revenue Breakdown (Q4 2025):
                </p>
                {companyIncome > 0 && (
                  <p className="text-green-200 text-sm flex items-center justify-between">
                    <span>• PIE Company Revenue (Admin):</span>
                    <span className="font-bold">{formatCurrency(companyIncome)}</span>
                  </p>
                )}
                {contractorIncome > 0 && (
                  <p className="text-green-200 text-sm flex items-center justify-between">
                    <span>• Contractor Income (1099):</span>
                    <span className="font-bold">{formatCurrency(contractorIncome)}</span>
                  </p>
                )}
                <div className="border-t border-green-600/30 mt-2 pt-2">
                  <p className="text-green-100 font-bold text-sm flex items-center justify-between">
                    <span>Total Quarterly Income:</span>
                    <span>{formatCurrency(companyIncome + contractorIncome)}</span>
                  </p>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Advisory Notice */}
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">Important Information</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• This calculator provides estimates for tax planning purposes only</li>
              <li>• Calculations are based on New York tax requirements</li>
              <li>• Self-employment taxes are paid quarterly with specific due dates</li>
              <li>• Consult a tax professional for personalized advice</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <TaxCalculationForm
                initialData={taxData}
                onCalculate={handleCalculate}
                onReset={handleReset}
                platformIncome={autoPopulateIncome}
              />
            </div>
            
            <div className="space-y-4">
              {results && (
                <TaxResultsDisplay
                  results={results}
                  taxData={taxData}
                />
              )}
              <QuarterlyDueDates />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SECalculatorModal;
