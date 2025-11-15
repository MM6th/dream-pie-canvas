import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Info, DollarSign, TrendingDown, Wallet } from 'lucide-react';

interface RevenueBreakdownModalProps {
  trigger?: React.ReactNode;
}

const RevenueBreakdownModal = ({ trigger }: RevenueBreakdownModalProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Example breakdown with $100 sale
  const exampleSale = 100.00;
  const paypalFee = exampleSale * 0.029 + 0.30; // 2.9% + $0.30
  const netRevenue = exampleSale - paypalFee;
  const piePlatformFee = netRevenue * 0.30; // 30%
  const merchantRevenue = netRevenue * 0.70; // 70%

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Info className="w-4 h-4 mr-2" />
            Revenue Breakdown
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revenue Split & Payment Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* How Revenue Split Works */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">How Revenue Split Works</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Customer Makes Purchase</p>
                    <p className="text-muted-foreground">A customer purchases your content, product, or portfolio</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">PayPal Processing Fee Deducted</p>
                    <p className="text-muted-foreground">PayPal takes 2.9% + $0.30 per transaction</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Revenue Split Applied</p>
                    <p className="text-muted-foreground">
                      After PayPal fees, the remaining amount is split:
                      <br />• 70% to Merchant (You)
                      <br />• 30% to PIE Platform
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-semibold">4</span>
                  </div>
                  <div>
                    <p className="font-medium">PIE Distributes Your Share</p>
                    <p className="text-muted-foreground">
                      PIE manages distribution of your 70% share to your PayPal account when payment thresholds are met
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Example Breakdown */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">Example: {formatCurrency(exampleSale)} Sale</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Gross Sale Amount</span>
                  <span className="font-semibold">{formatCurrency(exampleSale)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span className="text-muted-foreground">PayPal Processing Fee</span>
                  </div>
                  <span className="text-destructive">-{formatCurrency(paypalFee)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b font-medium">
                  <span>Net Revenue (After PayPal)</span>
                  <span>{formatCurrency(netRevenue)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <span className="text-muted-foreground">PIE Platform Fee (30%)</span>
                  </div>
                  <span className="text-destructive">-{formatCurrency(piePlatformFee)}</span>
                </div>

                <div className="flex justify-between items-center py-3 bg-green-500/10 rounded-lg px-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-600">Your Merchant Revenue (70%)</span>
                  </div>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(merchantRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Thresholds */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4">Payment Thresholds & Distribution</h3>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  PIE manages the distribution of your 70% merchant share to your registered PayPal account.
                  Payments are distributed when your accumulated earnings reach minimum payout thresholds.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="font-medium">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Your tax calculations are based on your 70% merchant share</li>
                    <li>PayPal processing fees are business expenses you can deduct</li>
                    <li>Quarterly income tracking reflects your 70% merchant revenue</li>
                    <li>Contact support for specific payout schedule details</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-blue-600">Tax & Accounting</p>
                  <p className="text-muted-foreground">
                    The amounts shown in your tax calculator and quarterly income reports represent your 70% merchant share.
                    This is the income you'll report for tax purposes. PayPal processing fees can be claimed as business expenses.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RevenueBreakdownModal;
