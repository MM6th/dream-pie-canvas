
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import TaxCalculationForm from "./TaxCalculationForm";
import TaxResultsDisplay from "./TaxResultsDisplay";
import QuarterlyDueDates from "./QuarterlyDueDates";

interface TaxData {
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
  const [isOpen, setIsOpen] = useState(false);
  const [taxData, setTaxData] = useState<TaxData>({
    quarterlyIncome: autoPopulateIncome,
    businessExpenses: 0,
    filingStatus: "single",
    previousYearAGI: 0,
  });
  const [results, setResults] = useState<TaxResults | null>(null);

  // Update quarterly income when auto-populate changes
  useEffect(() => {
    if (autoPopulateIncome > 0) {
      setTaxData(prev => ({
        ...prev,
        quarterlyIncome: autoPopulateIncome
      }));
    }
  }, [autoPopulateIncome]);

  const calculateTaxes = (data: TaxData): TaxResults => {
    const netEarnings = Math.max(0, data.quarterlyIncome - data.businessExpenses);
    
    // Self-employment tax calculation (15.3% of net earnings × 0.9235)
    const selfEmploymentTax = netEarnings > 400 ? netEarnings * 0.153 * 0.9235 : 0;
    
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
      quarterlyIncome: 0,
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
          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
        >
          <Calculator className="w-4 h-4 mr-2" />
          SE Tax Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Self-Employment Tax Calculator
          </DialogTitle>
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
