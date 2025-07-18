
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
import { Calculator, RotateCcw } from "lucide-react";

interface TaxData {
  quarterlyIncome: number;
  businessExpenses: number;
  filingStatus: string;
  previousYearAGI: number;
}

interface TaxCalculationFormProps {
  initialData: TaxData;
  onCalculate: (data: TaxData) => void;
  onReset: () => void;
}

const TaxCalculationForm = ({ initialData, onCalculate, onReset }: TaxCalculationFormProps) => {
  const [formData, setFormData] = useState<TaxData>(initialData);
  const [errors, setErrors] = useState<Partial<TaxData>>({});

  const handleInputChange = (field: keyof TaxData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
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
          <div>
            <Label htmlFor="quarterly-income" className="text-gray-300">
              Quarterly Gross Income *
            </Label>
            <Input
              id="quarterly-income"
              type="number"
              step="0.01"
              min="0"
              value={formData.quarterlyIncome || ''}
              onChange={(e) => handleInputChange('quarterlyIncome', e.target.value)}
              className="bg-gray-600 border-gray-500 text-white"
              placeholder="Enter your quarterly income"
            />
            {errors.quarterlyIncome !== undefined && (
              <p className="text-red-400 text-sm mt-1">Quarterly income is required</p>
            )}
          </div>

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
              value={formData.previousYearAGI || ''}
              onChange={(e) => handleInputChange('previousYearAGI', e.target.value)}
              className="bg-gray-600 border-gray-500 text-white"
              placeholder="For safe harbor calculations"
            />
            {errors.previousYearAGI !== undefined && (
              <p className="text-red-400 text-sm mt-1">AGI cannot be negative</p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Used for safe harbor rule calculations
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
