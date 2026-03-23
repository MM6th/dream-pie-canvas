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
import { Loader2, MessageCircle, CreditCard, Info, Settings, DollarSign, Video, Clock } from 'lucide-react';
import SixthPriceTag from '@/components/SixthPriceTag';
import { useSpotPrice } from '@/hooks/useSpotPrice';

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
  const { usdToSixth, spotPrice, isLoading: spotLoading } = useSpotPrice();

  // Message settings state (for all users)
  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [creditsPerMessage, setCreditsPerMessage] = useState<string>('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  // Livestream settings state
  const [isLiveStreamArtist, setIsLiveStreamArtist] = useState(false);
  const [livestreamEnabled, setLivestreamEnabled] = useState(true);
  const [creditsPerMinute, setCreditsPerMinute] = useState<string>('');
  const [sessionDuration] = useState(20);
  const [hasLivestreamSettings, setHasLivestreamSettings] = useState(false);
  const [livestreamSaving, setLivestreamSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch message settings
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
        setCreditsPerMessage(data.credits_per_message > 0 ? String(data.credits_per_message) : '');
        setHasSettings(true);
      }

      // Check if user is a live stream artist
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_live_stream_artist')
        .eq('id', user.id)
        .single();

      if (profile?.is_live_stream_artist) {
        setIsLiveStreamArtist(true);
        
        // Fetch livestream settings
        const { data: livestreamData } = await supabase
          .from('livestream_settings')
          .select('*')
          .eq('merchant_id', user.id)
          .single();

        if (livestreamData) {
          setLivestreamEnabled(livestreamData.enabled);
          setCreditsPerMinute(livestreamData.credits_per_minute > 0 ? String(livestreamData.credits_per_minute) : '');
          setHasLivestreamSettings(true);
        }
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

      const creditsNum = parseInt(creditsPerMessage) || 0;
      if (creditsNum < 1 || creditsNum > 100) {
        toast({
          title: 'Invalid amount',
          description: 'Credits per message must be between 1 and 100',
          variant: 'destructive',
        });
        setSettingsSaving(false);
        return;
      }

      if (hasSettings) {
        const { error } = await supabase
          .from('message_settings')
          .update({
            enabled: settingsEnabled,
            credits_per_message: creditsNum,
          })
          .eq('merchant_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('message_settings')
          .insert({
            merchant_id: user.id,
            enabled: settingsEnabled,
            credits_per_message: creditsNum,
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

  const handleSaveLivestreamSettings = async () => {
    setLivestreamSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const creditsMinNum = parseInt(creditsPerMinute) || 0;
      if (creditsMinNum < 1 || creditsMinNum > 50) {
        toast({
          title: 'Invalid amount',
          description: 'Credits per minute must be between 1 and 50',
          variant: 'destructive',
        });
        setLivestreamSaving(false);
        return;
      }

      if (hasLivestreamSettings) {
        const { error } = await supabase
          .from('livestream_settings')
          .update({
            enabled: livestreamEnabled,
            credits_per_minute: creditsMinNum,
            session_duration_minutes: sessionDuration,
          })
          .eq('merchant_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('livestream_settings')
          .insert({
            merchant_id: user.id,
            enabled: livestreamEnabled,
            credits_per_minute: creditsMinNum,
            session_duration_minutes: sessionDuration,
          });

        if (error) throw error;
        setHasLivestreamSettings(true);
      }

      toast({
        title: 'Settings saved',
        description: 'Your livestream settings have been updated',
      });
    } catch (error) {
      console.error('Error saving livestream settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save livestream settings',
        variant: 'destructive',
      });
    } finally {
      setLivestreamSaving(false);
    }
  };

  const handleResetMessageSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (hasSettings) {
        const { error } = await supabase
          .from('message_settings')
          .delete()
          .eq('merchant_id', user.id);

        if (error) throw error;
      }

      setCreditsPerMessage('');
      setSettingsEnabled(true);
      setHasSettings(false);

      toast({
        title: 'Settings reset',
        description: 'Your message settings have been cleared',
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset settings',
        variant: 'destructive',
      });
    }
  };

  const handleResetLivestreamSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (hasLivestreamSettings) {
        const { error } = await supabase
          .from('livestream_settings')
          .delete()
          .eq('merchant_id', user.id);

        if (error) throw error;
      }

      setCreditsPerMinute('');
      setLivestreamEnabled(true);
      setHasLivestreamSettings(false);

      toast({
        title: 'Settings reset',
        description: 'Your livestream settings have been cleared',
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset settings',
        variant: 'destructive',
      });
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

  const revenuePerMessage = ((parseInt(creditsPerMessage) || 0) * 0.10).toFixed(2);
  const totalLivestreamCredits = (parseInt(creditsPerMinute) || 0) * sessionDuration;
  const revenuePerEntry = (totalLivestreamCredits * 0.10).toFixed(2);

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
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${pkg.price.toFixed(2)}
                      </div>
                      <SixthPriceTag usdPrice={pkg.price} size="sm" showUsd={false} />
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

            {/* Message Pricing Settings - All Users */}
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-medium">Message Pricing Settings</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure how much credits others need to send you a message
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
                        Allow others to send you paid messages
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
                            type="text"
                            inputMode="numeric"
                            value={creditsPerMessage}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setCreditsPerMessage(val);
                            }}
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
                        <div className="text-xl font-bold text-primary flex items-center gap-2 flex-wrap">
                          ${revenuePerMessage}
                          <SixthPriceTag usdPrice={parseFloat(revenuePerMessage)} size="sm" showUsd={false} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You earn $0.10 per credit.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveSettings} 
                      disabled={settingsSaving}
                      variant="secondary"
                      className="flex-1"
                    >
                      {settingsSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                    {hasSettings && (
                      <Button 
                        onClick={handleResetMessageSettings} 
                        variant="outline"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Livestream Pricing Settings - Only for Live Stream Artists */}
            {isLiveStreamArtist && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">Livestream Pricing Settings</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure credit costs for users entering your paid livestream sessions
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="livestream-enabled" className="text-sm">Enable Paid Livestreams</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow users to pay credits to enter your livestreams
                      </p>
                    </div>
                    <Switch
                      id="livestream-enabled"
                      checked={livestreamEnabled}
                      onCheckedChange={setLivestreamEnabled}
                    />
                  </div>

                  {livestreamEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="credits-per-minute" className="text-sm">Credits Per Minute</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="credits-per-minute"
                            type="text"
                            inputMode="numeric"
                            value={creditsPerMinute}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setCreditsPerMinute(val);
                            }}
                            className="max-w-[120px]"
                          />
                          <span className="text-xs text-muted-foreground">
                            credits/min (1-50)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Session Duration</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{sessionDuration} minutes</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Standard session length is 20 minutes
                        </p>
                      </div>

                      <div className="rounded-lg bg-primary/10 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Entry Cost for Users:</span>
                          <span className="font-semibold">{totalLivestreamCredits} credits</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <DollarSign className="w-3 h-3" />
                          Your Revenue Per Entry
                        </div>
                        <div className="text-xl font-bold text-primary">
                          ${revenuePerEntry}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          You earn $0.10 per credit.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveLivestreamSettings} 
                      disabled={livestreamSaving}
                      variant="secondary"
                      className="flex-1"
                    >
                      {livestreamSaving ? 'Saving...' : 'Save Livestream Settings'}
                    </Button>
                    {hasLivestreamSettings && (
                      <Button 
                        onClick={handleResetLivestreamSettings} 
                        variant="outline"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
