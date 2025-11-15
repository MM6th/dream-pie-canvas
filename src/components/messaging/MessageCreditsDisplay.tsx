import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageCreditsDisplayProps {
  onBuyCredits: () => void;
}

export const MessageCreditsDisplay = ({ onBuyCredits }: MessageCreditsDisplayProps) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messaging_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setBalance(data?.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit balance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CreditCard className="w-4 h-4" />
        Loading...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          {balance !== null ? `${balance} credits` : 'No credits'}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onBuyCredits}
        className="h-8"
      >
        Buy Credits
      </Button>
    </div>
  );
};