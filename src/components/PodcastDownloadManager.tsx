import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface PodcastDownloadManagerProps {
  audioProduct: {
    id: string;
    title: string;
    audio_file_url: string;
    access_level: string;
    audio_type: string;
    max_downloads?: number | null;
  };
}

const PodcastDownloadManager = ({ audioProduct }: PodcastDownloadManagerProps) => {
  const { user } = useAuth();

  const handlePodcastDownload = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to download this podcast",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user is a merchant
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, approval_status')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.user_type !== 'merchant' || profile.approval_status !== 'approved') {
        toast({
          title: "Access Denied",
          description: "Only approved merchants can download this content",
          variant: "destructive"
        });
        return;
      }

      // Check download limits
      if (audioProduct.max_downloads) {
        const { count: currentDownloads, error: countError } = await supabase
          .from('podcast_downloads')
          .select('*', { count: 'exact', head: true })
          .eq('audio_product_id', audioProduct.id);

        if (countError) throw countError;

        if (currentDownloads && currentDownloads >= audioProduct.max_downloads) {
          toast({
            title: "Download Limit Reached",
            description: "This podcast has reached its maximum download limit",
            variant: "destructive"
          });
          return;
        }
      }

      // Check if already downloaded
      const { data: existingDownload, error: downloadCheckError } = await supabase
        .from('podcast_downloads')
        .select('id')
        .eq('audio_product_id', audioProduct.id)
        .eq('merchant_id', user.id)
        .maybeSingle();

      if (downloadCheckError) throw downloadCheckError;

      if (existingDownload) {
        toast({
          title: "Already Downloaded",
          description: "You have already downloaded this podcast. Check your dashboard for contract details.",
          variant: "destructive"
        });
        return;
      }

      // Record the download
      const { error: insertError } = await supabase
        .from('podcast_downloads')
        .insert({
          audio_product_id: audioProduct.id,
          merchant_id: user.id
        });

      if (insertError) throw insertError;

      // Add to user purchases so it shows up in their audio player
      const { error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
          audio_product_id: audioProduct.id,
          user_id: user.id,
          is_free_download: true,
          amount_paid: 0
        });

      if (purchaseError) {
        console.error('Error adding to user purchases:', purchaseError);
        // Try to rollback the podcast_downloads insert
        await supabase
          .from('podcast_downloads')
          .delete()
          .eq('audio_product_id', audioProduct.id)
          .eq('merchant_id', user.id);
        throw purchaseError;
      }
      
      console.log('Successfully processed podcast download');

      toast({
        title: "Podcast Opportunity Downloaded",
        description: "Podcast opportunity downloaded successfully! Review the contract in your dashboard.",
        variant: "default"
      });

      // Refresh the page to update the UI
      window.location.reload();

    } catch (error: any) {
      console.error('Error downloading podcast:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download podcast",
        variant: "destructive"
      });
    }
  };

  // Only show for podcast type with merchant_only access
  if (audioProduct.audio_type !== 'podcast' || audioProduct.access_level !== 'merchant_only') {
    return null;
  }

  return (
    <Button
      onClick={handlePodcastDownload}
      className="bg-primary hover:bg-primary/90 text-white w-full"
      size="sm"
    >
      <Download className="w-4 h-4 mr-1" />
      Download
    </Button>
  );
};

export default PodcastDownloadManager;