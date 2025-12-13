import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, X, Check } from "lucide-react";

const PDF_URL = "/free-resources/Salt_Mineral_Deficiency_Chart.pdf";
const RESOURCE_KEY = "salt_mineral_chart";

interface FreeAstrologyResourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onAccepted: () => void;
}

export const FreeAstrologyResourceModal = ({ 
  open, 
  onOpenChange, 
  userId,
  onAccepted 
}: FreeAstrologyResourceModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = PDF_URL;
    link.download = "Salt_Mineral_Deficiency_Chart.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started!");
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      // Get admin ID for notification
      const ADMIN_ID = 'cedd3262-be80-4af4-9675-c081107cecb5';
      
      // Get user profile for notification message
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", userId)
        .single();

      const { error } = await supabase
        .from("user_free_resources")
        .upsert({
          user_id: userId,
          resource_key: RESOURCE_KEY,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,resource_key"
        });

      if (error) throw error;

      // Notify admin about the download
      const userName = userProfile?.display_name || userProfile?.email || 'A user';
      await supabase
        .from('notifications')
        .insert({
          user_id: ADMIN_ID,
          type: 'resource_download',
          title: 'Salt Mineral PDF Downloaded',
          message: `${userName} accepted and downloaded the Salt & Mineral Deficiency Chart.`
        });

      handleDownload();
      onAccepted();
      onOpenChange(false);
      toast.success("Resource added to your library!");
    } catch (error) {
      console.error("Error accepting resource:", error);
      toast.error("Failed to save preference");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_free_resources")
        .upsert({
          user_id: userId,
          resource_key: RESOURCE_KEY,
          status: "rejected",
          rejected_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,resource_key"
        });

      if (error) throw error;

      onOpenChange(false);
      toast.info("You can access this resource later from the Store page");
    } catch (error) {
      console.error("Error rejecting resource:", error);
      toast.error("Failed to save preference");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">🎁 Free Astrology Resource!</DialogTitle>
          <DialogDescription>
            We'd like to offer you a complimentary Salt & Mineral Deficiency Chart to help with your astrological journey.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh] border rounded-lg p-4 bg-muted/30 [&>[data-radix-scroll-area-viewport]]:pr-4" thumbClassName="bg-primary w-2.5 hover:bg-primary/80">
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold text-lg">Salt & Mineral Deficiency Chart</h3>
            
            <p>
              This comprehensive chart shows the relationship between zodiac signs and their associated cell salts (tissue salts). 
              Understanding these connections can help you identify potential mineral deficiencies based on your astrological profile.
            </p>

            <div className="bg-muted/50 p-3 rounded-lg">
              <h4 className="font-medium mb-2">What's Included:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>All 12 zodiac signs and their ruling cell salts</li>
                <li>Physical symptoms associated with each deficiency</li>
                <li>Emotional and mental indicators</li>
                <li>Natural food sources for each mineral</li>
                <li>Best times for supplementation based on astrological transits</li>
              </ul>
            </div>

            <p>
              Cell salts are vital minerals that exist in every cell of your body. When depleted, 
              they can manifest as physical ailments, emotional imbalances, and mental fog. 
              By understanding which salts correspond to your sun, moon, and rising signs, 
              you can take a more holistic approach to your wellbeing.
            </p>

            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <p className="font-medium text-primary">
                Accept this free resource to add it to your "My Astrology Readings" library 
                where you can download it anytime!
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            No Thanks
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Only
          </Button>
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Accept & Add to Library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
