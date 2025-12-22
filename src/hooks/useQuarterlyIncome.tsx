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

interface PlatformRevenueMetadata {
  paypal_fee?: number;
  credits_purchased?: number;
  price?: number;
}

export const useQuarterlyIncome = (userId: string | undefined) => {
  const [income, setIncome] = useState<QuarterlyIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuarterIncome, setCurrentQuarterIncome] = useState(0);
  const [companyIncome, setCompanyIncome] = useState(0);
  const [contractorIncome, setContractorIncome] = useState(0);
  const [totalProcessingFees, setTotalProcessingFees] = useState(0);
  const [grossRevenue, setGrossRevenue] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchQuarterlyIncome = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
        
        // Calculate quarter date range
        const quarterStartMonth = (currentQuarter - 1) * 3;
        const quarterStart = new Date(currentYear, quarterStartMonth, 1);
        const quarterEnd = new Date(currentYear, quarterStartMonth + 3, 0, 23, 59, 59);

        // Fetch quarterly income data
        const { data, error } = await supabase
          .from('quarterly_income')
          .select('*')
          .eq('user_id', userId)
          .eq('year', currentYear)
          .eq('quarter', currentQuarter)
          .or('is_test_data.is.null,is_test_data.eq.false');

        if (error) throw error;

        // Fetch processing fees from platform_revenue for the current quarter
        const { data: revenueData, error: revenueError } = await supabase
          .from('platform_revenue')
          .select('amount, metadata')
          .eq('source_user_id', userId)
          .gte('created_at', quarterStart.toISOString())
          .lte('created_at', quarterEnd.toISOString());

        if (revenueError) {
          console.error('Error fetching platform revenue:', revenueError);
        }

        // Calculate total processing fees from metadata
        let totalFees = 0;
        let totalGross = 0;
        
        if (revenueData) {
          revenueData.forEach(record => {
            const metadata = record.metadata as PlatformRevenueMetadata | null;
            if (metadata?.paypal_fee) {
              totalFees += Number(metadata.paypal_fee);
            }
            if (metadata?.price) {
              totalGross += Number(metadata.price);
            }
          });
        }

        setTotalProcessingFees(totalFees);
        setGrossRevenue(totalGross);
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
    contractorIncome,
    totalProcessingFees,
    grossRevenue
  };
};
