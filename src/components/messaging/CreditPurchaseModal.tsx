import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
}

const CREDIT_PACKAGES = [
  { credits: 50, price: 5.00, discount: null },
  { credits: 100, price: 9.00, discount: '10% OFF' },
  { credits: 200, price: 16.00, discount: '20% OFF' },
];

export const CreditPurchaseModal = ({ 
  open, 
  onOpenChange,
  onPurchaseComplete,
}: CreditPurchaseModalProps) => {
  const [selectedPackage, setSelectedPackage] = useState(50);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-credit-payment', {
        body: { creditAmount: selectedPackage },
      });

      if (error) throw error;

      if (data.approvalUrl) {
        // Redirect to PayPal (PaymentSuccess page will handle capture)
        window.location.href = data.approvalUrl;
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Payment Error',
        description: 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy Messaging Credits</DialogTitle>
          <DialogDescription>
            Purchase credits to send messages to merchants. 1 credit = 1 message = $0.10
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.credits}
              className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                selectedPackage === pkg.credits
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setSelectedPackage(pkg.credits)}
            >
              {pkg.discount && (
                <Badge className="absolute -top-2 -right-2 bg-primary">
                  {pkg.discount}
                </Badge>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">
                    {pkg.credits} Credits
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${(pkg.price / pkg.credits).toFixed(2)} per credit
                  </div>
                </div>
                <div className="text-2xl font-bold">
                  ${pkg.price.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Purchase ${selectedPackage} Credits with PayPal`
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You will be redirected to PayPal to complete your purchase
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};