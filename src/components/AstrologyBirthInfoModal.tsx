import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AstrologyBirthInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  userId: string;
  productType?: string;
}

export const AstrologyBirthInfoModal = ({ 
  open, 
  onOpenChange, 
  deliveryId,
  userId,
  productType = 'other'
}: AstrologyBirthInfoModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    birthDate: "",
    birthTime: "",
    birthCity: "",
    birthState: "",
    birthCountry: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields based on product type
      const isHoroscope = productType === 'horoscope';
      if (!formData.birthDate) {
        toast({
          title: "Missing Information",
          description: "Please enter your birth date",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      if (!isHoroscope && (!formData.birthTime || !formData.birthCity || !formData.birthCountry)) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // For now, use placeholder coordinates - in production you'd geocode the city
      const latitude = 0;
      const longitude = 0;

      // Insert birth data
      const { error: birthDataError } = await supabase
        .from('user_birth_data')
        .insert({
          user_id: userId,
          birth_date: formData.birthDate,
          birth_time: isHoroscope ? '12:00' : formData.birthTime,
          birth_city: isHoroscope ? 'Not Required' : formData.birthCity,
          birth_state: isHoroscope ? null : (formData.birthState || null),
          birth_country: isHoroscope ? 'Not Required' : formData.birthCountry,
          latitude,
          longitude,
          timezone: isHoroscope ? 'UTC' : formData.timezone,
        });

      if (birthDataError) throw birthDataError;

      // Create notification for admin about submitted birth info
      const { data: delivery } = await supabase
        .from('astrology_deliveries')
        .select('admin_id')
        .eq('id', deliveryId)
        .single();

      if (delivery?.admin_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: delivery.admin_id,
            type: 'birth_info_submitted',
            title: 'Birth Information Submitted',
            message: 'A customer has submitted their birth information for an astrology reading.',
            related_delivery_id: deliveryId,
          });
      }

      toast({
        title: "Success!",
        description: "Your birth information has been submitted successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting birth info:', error);
      toast({
        title: "Error",
        description: "Failed to submit birth information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Birth Information</DialogTitle>
          <DialogDescription>
            {productType === 'horoscope' 
              ? 'Please provide your birth date for your horoscope reading.'
              : 'Please provide your birth information for your astrology reading. All fields marked with * are required.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Birth Date *</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              required
            />
          </div>

          {productType !== 'horoscope' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="birthTime">Birth Time *</Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={formData.birthTime}
                  onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthCity">Birth City *</Label>
                <Input
                  id="birthCity"
                  type="text"
                  placeholder="e.g., New York"
                  value={formData.birthCity}
                  onChange={(e) => setFormData({ ...formData, birthCity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthState">Birth State/Province</Label>
                <Input
                  id="birthState"
                  type="text"
                  placeholder="e.g., NY (optional)"
                  value={formData.birthState}
                  onChange={(e) => setFormData({ ...formData, birthState: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthCountry">Birth Country *</Label>
                <Input
                  id="birthCountry"
                  type="text"
                  placeholder="e.g., United States"
                  value={formData.birthCountry}
                  onChange={(e) => setFormData({ ...formData, birthCountry: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  type="text"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Auto-detected from your device</p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
