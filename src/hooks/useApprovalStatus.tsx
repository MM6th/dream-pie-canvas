
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ApprovalStatus {
  isAdmin: boolean;
  isApproved: boolean;
  approvalStatus: string;
  loading: boolean;
}

export const useApprovalStatus = (): ApprovalStatus => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ApprovalStatus>({
    isAdmin: false,
    isApproved: false,
    approvalStatus: 'pending',
    loading: true
  });

  useEffect(() => {
    const fetchApprovalStatus = async () => {
      if (!user) {
        setStatus({
          isAdmin: false,
          isApproved: false,
          approvalStatus: 'pending',
          loading: false
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin, approval_status, user_type')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching approval status:', error);
          return;
        }

        if (data) {
          setStatus({
            isAdmin: data.is_admin || false,
            isApproved: data.approval_status === 'approved',
            approvalStatus: data.approval_status || 'pending',
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching approval status:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    fetchApprovalStatus();
  }, [user]);

  return status;
};
