import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface BirthInfoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
}

interface BirthData {
  birth_date: string;
  birth_time: string;
  birth_city: string;
  birth_state: string | null;
  birth_country: string;
  timezone: string;
  created_at: string;
  user?: {
    display_name: string | null;
    email: string;
  };
}

export const BirthInfoDetailModal = ({ 
  open, 
  onOpenChange, 
  deliveryId 
}: BirthInfoDetailModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [birthData, setBirthData] = useState<BirthData | null>(null);

  useEffect(() => {
    if (open && deliveryId) {
      fetchBirthData();
    }
  }, [open, deliveryId]);

  const fetchBirthData = async () => {
    setLoading(true);
    try {
      // Get the delivery to find buyer_id
      const { data: delivery, error: deliveryError } = await supabase
        .from('astrology_deliveries')
        .select('buyer_id')
        .eq('id', deliveryId)
        .single();

      if (deliveryError) throw deliveryError;

      // Get the birth data for this buyer
      const { data: birthInfo, error: birthError } = await supabase
        .from('user_birth_data')
        .select(`
          birth_date,
          birth_time,
          birth_city,
          birth_state,
          birth_country,
          timezone,
          created_at,
          user_id
        `)
        .eq('user_id', delivery.buyer_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (birthError) throw birthError;

      // Get user profile info
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', delivery.buyer_id)
        .single();

      if (profileError) throw profileError;

      setBirthData({
        ...birthInfo,
        user: profile
      });
    } catch (error) {
      console.error('Error fetching birth data:', error);
      toast({
        title: "Error",
        description: "Failed to load birth information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submitted Birth Information</DialogTitle>
          <DialogDescription>
            Birth details submitted by the customer
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : birthData ? (
          <div className="space-y-4">
            {birthData.user && (
              <div className="pb-4 border-b">
                <p className="text-sm font-medium">Customer</p>
                <p className="text-sm text-muted-foreground">
                  {birthData.user.display_name || birthData.user.email}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Birth Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(birthData.birth_date)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Birth Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(birthData.birth_time)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Birth Location</p>
                <p className="text-sm text-muted-foreground">
                  {birthData.birth_city}
                  {birthData.birth_state && `, ${birthData.birth_state}`}
                  {`, ${birthData.birth_country}`}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Timezone</p>
                <p className="text-sm text-muted-foreground">
                  {birthData.timezone}
                </p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Submitted on {new Date(birthData.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No birth information found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
