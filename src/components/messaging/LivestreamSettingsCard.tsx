import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Video, DollarSign, Clock } from 'lucide-react';

export const LivestreamSettingsCard = () => {
  const [enabled, setEnabled] = useState(true);
  const [creditsPerMinute, setCreditsPerMinute] = useState(5);
  const [sessionDuration, setSessionDuration] = useState(20);
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
        .from('livestream_settings')
        .select('*')
        .eq('merchant_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching livestream settings:', error);
      }

      if (data) {
        setEnabled(data.enabled);
        setCreditsPerMinute(data.credits_per_minute);
        setSessionDuration(data.session_duration_minutes);
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

      if (creditsPerMinute < 1 || creditsPerMinute > 50) {
        toast({
          title: 'Invalid amount',
          description: 'Credits per minute must be between 1 and 50',
          variant: 'destructive',
        });
        return;
      }

      if (hasSettings) {
        const { error } = await supabase
          .from('livestream_settings')
          .update({
            enabled,
            credits_per_minute: creditsPerMinute,
            session_duration_minutes: sessionDuration,
          })
          .eq('merchant_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('livestream_settings')
          .insert({
            merchant_id: user.id,
            enabled,
            credits_per_minute: creditsPerMinute,
            session_duration_minutes: sessionDuration,
          });

        if (error) throw error;
        setHasSettings(true);
      }

      toast({
        title: 'Settings saved',
        description: 'Your livestream settings have been updated',
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  const totalCredits = creditsPerMinute * sessionDuration;
  const revenuePerEntry = (totalCredits * 0.10).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          <CardTitle>Livestream Pricing Settings</CardTitle>
        </div>
        <CardDescription>
          Configure credit costs for users entering your paid livestream sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="livestream-enabled">Enable Paid Livestreams</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to pay credits to enter your livestreams
            </p>
          </div>
          <Switch
            id="livestream-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="credits-per-minute">Credits Per Minute</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="credits-per-minute"
                  type="number"
                  min={1}
                  max={50}
                  value={creditsPerMinute}
                  onChange={(e) => setCreditsPerMinute(Number(e.target.value))}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">
                  credits/min (1-50)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-duration">Session Duration</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{sessionDuration} minutes</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Standard session length is 20 minutes
              </p>
            </div>

            <div className="rounded-lg bg-primary/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Entry Cost for Users:</span>
                <span className="font-semibold">{totalCredits} credits</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4" />
                Your Revenue Per Entry
              </div>
              <div className="text-2xl font-bold text-primary">
                ${revenuePerEntry}
              </div>
              <p className="text-xs text-muted-foreground">
                You earn $0.10 per credit. Revenue is tracked quarterly for tax reporting.
              </p>
            </div>
          </>
        )}

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Livestream Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
