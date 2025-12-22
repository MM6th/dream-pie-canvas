
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, RotateCcw, DollarSign, Info, AlertTriangle } from "lucide-react";
import RevenueBreakdownModal from "./RevenueBreakdownModal";

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

interface TaxCalculationFormProps {
  initialData: TaxData;
  onCalculate: (data: TaxData) => void;
  onReset: () => void;
  platformIncome?: number;
  processingFees?: number;
}

const TaxCalculationForm = ({ initialData, onCalculate, onReset, platformIncome = 0, processingFees = 0 }: TaxCalculationFormProps) => {
  const [formData, setFormData] = useState<TaxData>(initialData);
  const [errors, setErrors] = useState<Partial<TaxData>>({});

  // Update platform income and quarterly income when it changes
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      platformIncome,
      quarterlyIncome: platformIncome
    }));
  }, [platformIncome]);

  const handleInputChange = (field: keyof TaxData, value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TaxData> = {};
    
    if (formData.quarterlyIncome <= 0) {
      newErrors.quarterlyIncome = 0;
    }
    
    if (formData.businessExpenses < 0) {
      newErrors.businessExpenses = 0;
    }
    
    if (formData.previousYearAGI < 0) {
      newErrors.previousYearAGI = 0;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onCalculate(formData);
    }
  };

  const handleReset = () => {
    setFormData({
      platformIncome: 0,
      quarterlyIncome: 0,
      businessExpenses: 0,
      filingStatus: "single",
      previousYearAGI: 0,
    });
    setErrors({});
    onReset();
  };

  return (
    <Card className="bg-gray-700/50 border-gray-600">
      <CardHeader>
        <CardTitle className="text-white">Income & Expense Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Income Breakdown Display */}
          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-blue-300 text-sm font-medium">
                PIE Company Gross Income (Admin)
              </Label>
              <span className="text-lg font-bold text-blue-400">
                {formatCurrency(platformIncome + processingFees)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <Label className="text-gray-400 text-sm">
                Total Processing Fees
              </Label>
              <span className="text-lg font-semibold text-orange-400">
                -{formatCurrency(processingFees)}
              </span>
            </div>
            <div className="border-t border-blue-600/50 pt-2 flex justify-between items-center">
              <Label className="text-blue-200 text-sm font-semibold">
                PIE Company Net Revenue
              </Label>
              <span className="text-xl font-bold text-blue-300">
                {formatCurrency(platformIncome)}
              </span>
            </div>
          </div>

          {/* Platform Income Info */}
          {platformIncome > 0 && (
            <>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 rounded-full p-2">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-blue-400 font-semibold mb-2">
                      Merchant Revenue (90% Share)
                    </h4>
                    <p className="text-sm text-gray-400 mb-3">
                      This income represents your <strong>90% merchant share</strong> after PayPal processing fees and PIE's 10% platform fee.
                      PIE handles distribution of this amount to your PayPal account when payment thresholds are met.
                    </p>
                    <RevenueBreakdownModal 
                      trigger={
                        <Button variant="outline" size="sm" className="text-xs">
                          <Info className="w-3 h-3 mr-1" />
                          View Revenue Split Details
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Payment Threshold Alert */}
              {platformIncome < 100 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-500 rounded-full p-2">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-yellow-400 font-semibold mb-2">
                        Payment Threshold Not Met
                      </h4>
                      <p className="text-sm text-gray-300 mb-2">
                        Revenue is being tracked but <strong>will not be paid out</strong> until you reach the <strong>$100 minimum threshold</strong>.
                      </p>
                      <div className="bg-yellow-500/10 rounded p-2 text-xs text-yellow-200">
                        <div className="flex justify-between mb-1">
                          <span>Current Quarter Revenue:</span>
                          <span className="font-semibold">{formatCurrency(platformIncome)}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>Minimum Threshold:</span>
                          <span className="font-semibold">$100.00</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-yellow-500/20">
                          <span>Still Needed:</span>
                          <span className="font-semibold">{formatCurrency(Math.max(0, 100 - platformIncome))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {platformIncome >= 100 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-500 rounded-full p-2">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-green-400 font-semibold mb-2">
                        Payment Threshold Met! 🎉
                      </h4>
                      <p className="text-sm text-gray-300">
                        You've reached the $100 minimum threshold. Your revenue will be distributed to your PayPal account according to the quarterly payout schedule.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Processing Fees Section */}
          {processingFees > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-orange-500 rounded-full p-2">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-orange-400 font-semibold mb-2">
                    PayPal Processing Fees Paid
                  </h4>
                  <div className="text-2xl font-bold text-orange-300 mb-2">
                    {formatCurrency(processingFees)}
                  </div>
                  <p className="text-sm text-gray-300 mb-3">
                    Processing fees are <strong>tax-deductible business expenses</strong>. These fees have been automatically tracked from your PayPal transactions.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-orange-500/50 text-orange-300 hover:bg-orange-500/20"
                    onClick={() => {
                      const newExpenses = formData.businessExpenses + processingFees;
                      handleInputChange('businessExpenses', newExpenses);
                    }}
                  >
                    <Info className="w-3 h-3 mr-1" />
                    Add to Business Expenses
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="business-expenses" className="text-gray-300">
              Business Expenses (Quarterly)
            </Label>
            <Input
              id="business-expenses"
              type="number"
              step="0.01"
              min="0"
              value={formData.businessExpenses || ''}
              onChange={(e) => handleInputChange('businessExpenses', e.target.value)}
              className="bg-gray-600 border-gray-500 text-white"
              placeholder="Enter deductible business expenses"
            />
            {errors.businessExpenses !== undefined && (
              <p className="text-red-400 text-sm mt-1">Expenses cannot be negative</p>
            )}
            {processingFees > 0 && (
              <p className="text-orange-300 text-xs mt-1">
                Tip: Don't forget to include your {formatCurrency(processingFees)} in processing fees above!
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="filing-status" className="text-gray-300">
              Filing Status
            </Label>
            <Select
              value={formData.filingStatus}
              onValueChange={(value) => handleInputChange('filingStatus', value)}
            >
              <SelectTrigger className="bg-gray-600 border-gray-500 text-white [&>span]:!text-white [&_[data-placeholder]]:!text-white">
                <SelectValue placeholder="Select filing status" className="!text-white" />
              </SelectTrigger>
              <SelectContent className="bg-gray-600 border-gray-500 text-white z-50">
                <SelectItem value="single" className="text-white hover:bg-gray-500 focus:bg-gray-500 focus:text-white">Single</SelectItem>
                <SelectItem value="married-filing-jointly" className="text-white hover:bg-gray-500 focus:bg-gray-500 focus:text-white">Married Filing Jointly</SelectItem>
                <SelectItem value="married-filing-separately" className="text-white hover:bg-gray-500 focus:bg-gray-500 focus:text-white">Married Filing Separately</SelectItem>
                <SelectItem value="head-of-household" className="text-white hover:bg-gray-500 focus:bg-gray-500 focus:text-white">Head of Household</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="previous-agi" className="text-gray-300">
              Previous Year's Adjusted Gross Income
            </Label>
            <Input
              id="previous-agi"
              type="number"
              step="0.01"
              min="0"
              value={formData.previousYearAGI === 0 ? '' : formData.previousYearAGI}
              onChange={(e) => handleInputChange('previousYearAGI', e.target.value)}
              className="bg-gray-600 border-gray-500 text-white"
              placeholder="0"
            />
            {errors.previousYearAGI !== undefined && (
              <p className="text-red-400 text-sm mt-1">AGI cannot be negative</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Leave on 0 if this is your first year working. Used for safe harbor calculations.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Taxes
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={handleReset}
              className="border-gray-500 text-gray-300 hover:bg-gray-600"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TaxCalculationForm;
