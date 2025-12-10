import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, DollarSign } from 'lucide-react';

export const MessageSettingsCard = () => {
  const [enabled, setEnabled] = useState(true);
  const [creditsPerMessage, setCreditsPerMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

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
        setEnabled(data.enabled);
        setCreditsPerMessage(data.credits_per_message > 0 ? String(data.credits_per_message) : '');
        setHasSettings(true);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
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
        setSaving(false);
        return;
      }

      if (hasSettings) {
        const { error } = await supabase
          .from('message_settings')
          .update({
            enabled,
            credits_per_message: creditsNum,
          })
          .eq('merchant_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('message_settings')
          .insert({
            merchant_id: user.id,
            enabled,
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
      setSaving(false);
    }
  };

  const handleReset = async () => {
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
      setEnabled(true);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  const revenuePerMessage = ((parseInt(creditsPerMessage) || 0) * 0.10).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <CardTitle>Message Pricing Settings</CardTitle>
        </div>
        <CardDescription>
          Configure how much credits users need to send you a paid message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enabled">Enable Paid Messaging</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to send you paid messages
            </p>
          </div>
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="credits">Credits Per Message</Label>
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
                  placeholder="10"
                />
                <span className="text-sm text-muted-foreground">
                  credits (1-100)
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Default is 10 credits per message
              </p>
            </div>

            <div className="rounded-lg bg-primary/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                Your Revenue Per Message
              </div>
              <div className="text-2xl font-bold text-primary">
                ${revenuePerMessage}
              </div>
              <p className="text-xs text-muted-foreground">
                You earn $0.10 per credit. This revenue is tracked quarterly for tax reporting.
              </p>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {hasSettings && (
            <Button 
              onClick={handleReset} 
              variant="outline"
            >
              Reset
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
