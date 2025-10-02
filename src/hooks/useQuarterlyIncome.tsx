import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuarterlyIncome {
  quarter: number;
  year: number;
  income_type: string;
  total_income: number;
  source_count: number;
}

export const useQuarterlyIncome = (userId: string | undefined) => {
  const [income, setIncome] = useState<QuarterlyIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuarterIncome, setCurrentQuarterIncome] = useState(0);

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
          .eq('quarter', currentQuarter);

        if (error) throw error;

        setIncome(data || []);
        
        // Calculate total current quarter income
        const total = (data || []).reduce((sum, item) => sum + Number(item.total_income), 0);
        setCurrentQuarterIncome(total);
      } catch (error) {
        console.error('Error fetching quarterly income:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuarterlyIncome();
  }, [userId]);

  return { income, loading, currentQuarterIncome };
};
