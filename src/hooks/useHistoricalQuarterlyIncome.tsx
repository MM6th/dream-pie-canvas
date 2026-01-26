import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQuarterDateRange } from '@/utils/taxCalculations';

interface QuarterlyIncomeData {
  year: number;
  quarter: number;
  totalIncome: number;
  processingFees: number;
  incomeTypes: string[];
}

interface PlatformRevenueMetadata {
  paypal_fee?: number;
  price?: number;
}

export const useHistoricalQuarterlyIncome = (userId: string | undefined) => {
  const [quarters, setQuarters] = useState<QuarterlyIncomeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchHistoricalIncome = async () => {
      try {
        const currentYear = new Date().getFullYear();
        
        // Fetch all quarterly income for user (last 2 years)
        const { data: incomeData, error: incomeError } = await supabase
          .from('quarterly_income')
          .select('*')
          .eq('user_id', userId)
          .gte('year', currentYear - 1)
          .or('is_test_data.is.null,is_test_data.eq.false');

        if (incomeError) throw incomeError;

        // Group income by year and quarter
        const quarterMap = new Map<string, QuarterlyIncomeData>();

        (incomeData || []).forEach((record) => {
          const key = `${record.year}-${record.quarter}`;
          const existing = quarterMap.get(key);
          
          if (existing) {
            existing.totalIncome += Number(record.total_income);
            if (!existing.incomeTypes.includes(record.income_type)) {
              existing.incomeTypes.push(record.income_type);
            }
          } else {
            quarterMap.set(key, {
              year: record.year,
              quarter: record.quarter,
              totalIncome: Number(record.total_income),
              processingFees: 0,
              incomeTypes: [record.income_type],
            });
          }
        });

        // Fetch processing fees for each quarter
        for (const [key, quarterData] of quarterMap) {
          const { start, end } = getQuarterDateRange(quarterData.year, quarterData.quarter);
          
          const { data: revenueData, error: revenueError } = await supabase
            .from('platform_revenue')
            .select('metadata')
            .eq('source_user_id', userId)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

          if (!revenueError && revenueData) {
            let totalFees = 0;
            revenueData.forEach((record) => {
              const metadata = record.metadata as PlatformRevenueMetadata | null;
              if (metadata?.paypal_fee) {
                totalFees += Number(metadata.paypal_fee);
              }
            });
            quarterData.processingFees = totalFees;
          }
        }

        // Convert map to array and sort by year/quarter descending
        const sortedQuarters = Array.from(quarterMap.values()).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.quarter - a.quarter;
        });

        setQuarters(sortedQuarters);
      } catch (error) {
        console.error('Error fetching historical quarterly income:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalIncome();
  }, [userId]);

  return { quarters, loading };
};
