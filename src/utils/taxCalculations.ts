/**
 * Tax calculation utilities for self-employment and NY state taxes.
 * These calculations are for estimation purposes only.
 */

export interface TaxCalculationResult {
  netEarnings: number;
  selfEmploymentTax: number;
  nyStateTax: number;
  totalQuarterlyPayment: number;
  annualProjection: number;
}

/**
 * Calculate self-employment tax (15.3% of net earnings × 0.9235)
 */
export const calculateSelfEmploymentTax = (netEarnings: number): number => {
  return netEarnings * 0.153 * 0.9235;
};

/**
 * Calculate NY state tax using progressive tax brackets
 * Based on annualized income, returns quarterly amount
 */
export const calculateNYStateTax = (netEarnings: number): number => {
  const annualIncome = netEarnings * 4;
  let annualTax = 0;

  if (annualIncome > 8500) {
    if (annualIncome <= 11700) {
      annualTax = (annualIncome - 8500) * 0.04;
    } else if (annualIncome <= 13900) {
      annualTax = 128 + (annualIncome - 11700) * 0.045;
    } else if (annualIncome <= 80650) {
      annualTax = 227 + (annualIncome - 13900) * 0.0525;
    } else {
      annualTax = 3781 + (annualIncome - 80650) * 0.0585;
    }
  }

  // Return quarterly amount
  return annualTax / 4;
};

/**
 * Calculate complete quarterly tax liability
 * @param income - Net quarterly income (after platform fees)
 * @param businessExpenses - Business expenses to deduct
 * @param processingFees - Processing fees (added back to get gross, then deducted as expense)
 */
export const calculateQuarterlyTaxLiability = (
  income: number,
  businessExpenses: number = 0,
  processingFees: number = 0
): TaxCalculationResult => {
  // Gross revenue = net income + processing fees (fees were already deducted)
  const grossRevenue = income + processingFees;
  // Net earnings = gross - expenses (expenses can include processing fees)
  const netEarnings = Math.max(0, grossRevenue - businessExpenses);

  const selfEmploymentTax = calculateSelfEmploymentTax(netEarnings);
  const nyStateTax = calculateNYStateTax(netEarnings);
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

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Get the quarter number (1-4) for a given date
 */
export const getQuarter = (date: Date): number => {
  return Math.floor(date.getMonth() / 3) + 1;
};

/**
 * Get quarter date range
 */
export const getQuarterDateRange = (year: number, quarter: number): { start: Date; end: Date } => {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59);
  return { start, end };
};

/**
 * Generate quarterly due dates dynamically
 */
export const generateQuarterlyDueDates = (year: number) => {
  return [
    {
      quarter: 1,
      year,
      period: `Jan 1 - Mar 31, ${year}`,
      dueDate: `April 15, ${year}`,
      date: new Date(year, 3, 15), // April 15
    },
    {
      quarter: 2,
      year,
      period: `Apr 1 - Jun 30, ${year}`,
      dueDate: `June 17, ${year}`,
      date: new Date(year, 5, 17), // June 17 (accounting for weekends)
    },
    {
      quarter: 3,
      year,
      period: `Jul 1 - Sep 30, ${year}`,
      dueDate: `September 16, ${year}`,
      date: new Date(year, 8, 16), // September 16
    },
    {
      quarter: 4,
      year,
      period: `Oct 1 - Dec 31, ${year}`,
      dueDate: `January 15, ${year + 1}`,
      date: new Date(year + 1, 0, 15), // January 15 of next year
    },
  ];
};
