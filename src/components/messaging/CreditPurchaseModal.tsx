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
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, CreditCard, Info } from 'lucide-react';

interface CreditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
  userType?: 'merchant' | 'supporter';
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
  userType = 'supporter',
}: CreditPurchaseModalProps) => {
  const [selectedPackage, setSelectedPackage] = useState(50);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    try {
      setLoading(true);

      // Get the current session to ensure we have a valid auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to purchase credits.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-credit-payment', {
        body: { creditAmount: selectedPackage },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buy Messaging Credits</DialogTitle>
          <DialogDescription>
            Purchase credits to send messages to merchants. 1 credit = 1 message = $0.10
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" thumbClassName="bg-primary/50">
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

          <Separator className="my-4" />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground text-center">How Messaging Works</h4>
            
            {/* Message Costs Card */}
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-sm font-medium">Message Costs</h5>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <li>• 10 credits per message sent</li>
                      <li>• Replies to merchants who message you are free</li>
                      <li>• Merchant-to-merchant messaging is free</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Credits Card */}
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-sm font-medium">About Credits</h5>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <li>• Buy in packages: 50, 100, or 200 credits</li>
                      <li>• Check balance via the credits icon in header</li>
                      <li>• Credits never expire</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User-Specific Rules Card */}
            <Card className="border-border/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-sm font-medium">
                      {userType === 'merchant' ? 'Merchant Messaging' : 'Supporter Messaging'}
                    </h5>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {userType === 'merchant' ? (
                        <>
                          <li>• Message other merchants for free</li>
                          <li>• Message supporters for free</li>
                          <li>• Receive messages from supporters</li>
                        </>
                      ) : (
                        <>
                          <li>• Use credits to message merchants</li>
                          <li>• Reply to merchant messages for free</li>
                          <li>• View transaction history in your dashboard</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};