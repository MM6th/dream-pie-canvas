import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, CreditCard, Info, Settings, DollarSign } from 'lucide-react';

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

  // Message settings state (for merchants)
  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [creditsPerMessage, setCreditsPerMessage] = useState(10);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    if (open && userType === 'merchant') {
      fetchSettings();
    }
  }, [open, userType]);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_settings')
        .select('*')
        .eq('merchant_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
      }

      if (data) {
        setSettingsEnabled(data.enabled);
        setCreditsPerMessage(data.credits_per_message);
        setHasSettings(true);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (creditsPerMessage < 1 || creditsPerMessage > 100) {
        toast({
          title: 'Invalid amount',
          description: 'Credits per message must be between 1 and 100',
          variant: 'destructive',
        });
        return;
      }

      if (hasSettings) {
        const { error } = await supabase
          .from('message_settings')
          .update({
            enabled: settingsEnabled,
            credits_per_message: creditsPerMessage,
          })
          .eq('merchant_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('message_settings')
          .insert({
            merchant_id: user.id,
            enabled: settingsEnabled,
            credits_per_message: creditsPerMessage,
          });

        if (error) throw error;
        setHasSettings(true);
      }

      toast({
        title: 'Settings saved',
        description: 'Your message settings have been updated',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSettingsSaving(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);

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

  const revenuePerMessage = (creditsPerMessage * 0.10).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Messaging Credits</DialogTitle>
          <DialogDescription>
            {userType === 'merchant' 
              ? 'Manage your message settings and purchase credits'
              : 'Purchase credits to send messages to merchants. 1 credit = 1 message = $0.10'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4 py-4">
            {/* Credit Packages */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Buy Credits</h4>
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

            {/* How Messaging Works */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground text-center">How Messaging Works</h4>
              
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium">Message Costs</h5>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <li>• Credits required to send messages</li>
                        <li>• Supporters reply free to merchant-initiated threads</li>
                        <li>• Supporter-to-supporter messaging is not available</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                        <li>• 1 credit = $0.10 value</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium">
                        {userType === 'merchant' ? 'Merchant Benefits' : 'Supporter Info'}
                      </h5>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {userType === 'merchant' ? (
                          <>
                            <li>• Set your incoming message price below</li>
                            <li>• Earn $0.10 per credit spent by users</li>
                            <li>• Purchase credits to message others</li>
                          </>
                        ) : (
                          <>
                            <li>• Use credits to message merchants</li>
                            <li>• Reply free when a merchant messages you first</li>
                            <li>• View transaction history in credits icon</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Message Pricing Settings - Merchants Only */}
            {userType === 'merchant' && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">Message Pricing Settings</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure how much credits users need to send you a paid message
                  </p>

                  {settingsLoading ? (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      Loading settings...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="enabled" className="text-sm">Enable Paid Messaging</Label>
                          <p className="text-xs text-muted-foreground">
                            Allow users to send you paid messages
                          </p>
                        </div>
                        <Switch
                          id="enabled"
                          checked={settingsEnabled}
                          onCheckedChange={setSettingsEnabled}
                        />
                      </div>

                      {settingsEnabled && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="credits" className="text-sm">Credits Per Message</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="credits"
                                type="number"
                                min={1}
                                max={100}
                                value={creditsPerMessage}
                                onChange={(e) => setCreditsPerMessage(Number(e.target.value))}
                                className="max-w-[120px]"
                              />
                              <span className="text-xs text-muted-foreground">
                                credits (1-100)
                              </span>
                            </div>
                          </div>

                          <div className="rounded-lg bg-primary/10 p-3 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <DollarSign className="w-3 h-3" />
                              Your Revenue Per Message
                            </div>
                            <div className="text-xl font-bold text-primary">
                              ${revenuePerMessage}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              You earn $0.10 per credit.
                            </p>
                          </div>
                        </>
                      )}

                      <Button 
                        onClick={handleSaveSettings} 
                        disabled={settingsSaving}
                        variant="secondary"
                        className="w-full"
                      >
                        {settingsSaving ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
