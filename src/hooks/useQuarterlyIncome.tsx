import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuarterlyIncome {
  quarter: number;
  year: number;
  income_type: string;
  total_income: number;
  source_count: number;
  is_test_data?: boolean;
}

export const useQuarterlyIncome = (userId: string | undefined) => {
  const [income, setIncome] = useState<QuarterlyIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuarterIncome, setCurrentQuarterIncome] = useState(0);
  const [companyIncome, setCompanyIncome] = useState(0);
  const [contractorIncome, setContractorIncome] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchQuarterlyIncome = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

        const { data, error } = await supabase
          .from('quarterly_income')
          .select('*')
          .eq('user_id', userId)
          .eq('year', currentYear)
          .eq('quarter', currentQuarter)
          .or('is_test_data.is.null,is_test_data.eq.false'); // Exclude test data

        if (error) throw error;

        setIncome(data || []);
        
        // Calculate total current quarter income (excluding test data)
        const total = (data || []).reduce((sum, item) => sum + Number(item.total_income), 0);
        setCurrentQuarterIncome(total);

        // Calculate company income (PIE company revenue)
        const companyTotal = (data || [])
          .filter(i => i.income_type === 'company_revenue')
          .reduce((sum, item) => sum + Number(item.total_income), 0);
        setCompanyIncome(companyTotal);

        // Calculate contractor income (personal 1099 income)
        const contractorTotal = (data || [])
          .filter(i => ['featuring_revenue', 'referral_commission', 'asmr_royalty'].includes(i.income_type))
          .reduce((sum, item) => sum + Number(item.total_income), 0);
        setContractorIncome(contractorTotal);
      } catch (error) {
        console.error('Error fetching quarterly income:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuarterlyIncome();
  }, [userId]);

  return { 
    income, 
    loading, 
    currentQuarterIncome,
    companyIncome,
    contractorIncome 
  };
};
