import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface DownloadOpportunityCheckerProps {
  audioProductId: string;
  maxDownloads: number | null;
  downloadTable?: 'podcast_downloads' | 'asmr_downloads';
  children: (remainingDownloads: number | null, isExhausted: boolean) => React.ReactNode;
}

const DownloadOpportunityChecker = ({ 
  audioProductId, 
  maxDownloads, 
  downloadTable = 'podcast_downloads',
  children 
}: DownloadOpportunityCheckerProps) => {
  const [currentDownloads, setCurrentDownloads] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDownloadCount = async () => {
      if (!maxDownloads) {
        setLoading(false);
        return;
      }

      try {
        const { count, error } = await supabase
          .from(downloadTable)
          .select('*', { count: 'exact', head: true })
          .eq('audio_product_id', audioProductId);

        if (error) throw error;
        
        const downloadCount = count || 0;
        console.log(`Download count for ${audioProductId}:`, downloadCount, 'Max downloads:', maxDownloads, 'Table:', downloadTable);
        setCurrentDownloads(downloadCount);
      } catch (error) {
        console.error('Error fetching download count:', error);
        setCurrentDownloads(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDownloadCount();
    
    // Set up real-time subscription to update when downloads change
    const channel = supabase
      .channel(`${downloadTable}_changes`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: downloadTable,
        filter: `audio_product_id=eq.${audioProductId}`
      }, () => {
        fetchDownloadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioProductId, maxDownloads, downloadTable]);

  if (loading) {
    return <div className="text-xs text-gray-400">Checking availability...</div>;
  }

  const remainingDownloads = maxDownloads && currentDownloads !== null 
    ? Math.max(0, maxDownloads - currentDownloads) 
    : null;
  
  const isExhausted = maxDownloads && currentDownloads !== null 
    ? currentDownloads >= maxDownloads 
    : false;

  return (
    <div className="space-y-2">
      {maxDownloads && remainingDownloads !== null && (
        <Badge 
          variant={isExhausted ? "destructive" : remainingDownloads <= 2 ? "secondary" : "default"}
          className="text-xs"
        >
          {isExhausted ? (
            <>
              <AlertTriangle className="w-3 h-3 mr-1" />
              Opportunities Exhausted
            </>
          ) : (
            `${remainingDownloads} opportunities left`
          )}
        </Badge>
      )}
      {children(remainingDownloads, isExhausted)}
    </div>
  );
};

export default DownloadOpportunityChecker;