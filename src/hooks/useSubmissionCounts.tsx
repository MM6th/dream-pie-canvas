
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubmissionCounts {
  coverSubmissions: number;
  modelingApplications: number;
}

export const useSubmissionCounts = () => {
  const [counts, setCounts] = useState<SubmissionCounts>({
    coverSubmissions: 0,
    modelingApplications: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      const [coverData, modelingData] = await Promise.all([
        supabase
          .from('song_cover_submissions')
          .select('id', { count: 'exact' })
          .eq('status', 'pending'),
        supabase
          .from('modeling_applications')
          .select('id', { count: 'exact' })
          .eq('status', 'pending')
      ]);

      setCounts({
        coverSubmissions: coverData.count || 0,
        modelingApplications: modelingData.count || 0
      });
    } catch (error) {
      console.error('Error fetching submission counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Set up realtime subscription for cover submissions
    const coverChannel = supabase
      .channel('cover-submissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'song_cover_submissions'
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    // Set up realtime subscription for modeling applications
    const modelingChannel = supabase
      .channel('modeling-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'modeling_applications'
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(coverChannel);
      supabase.removeChannel(modelingChannel);
    };
  }, []);

  return { counts, loading, refetch: fetchCounts };
};
